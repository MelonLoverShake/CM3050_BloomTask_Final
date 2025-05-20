import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/superbase';
import { ThemeContext } from '../functions/ThemeContext';
import * as Location from 'expo-location';  

// Weather API key - replace with your actual API key
const WEATHER_API_KEY = 'a91204e24d44482d8b1123154251805';
const WEATHER_API_URL = 'https://api.weatherapi.com/v1/current.json';

const SavedLocationsScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Add listener for when we return to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      fetchSavedLocations();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchSavedLocations = async () => {
    try {
      setLoading(true);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigation.replace('Login');
        return;
      }

      const { data, error } = await supabase
        .from('user_locations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching locations:', error.message);
        Alert.alert('Error', 'Failed to load saved locations');
        setLocations([]);
      } else {
        // First set locations without weather data
        setLocations(data || []);
        
        // Then fetch weather data in background
        try {
          const locationsWithWeather = await Promise.all(
            (data || []).map(async (location) => {
              const weatherData = await fetchWeatherForLocation(location);
              return { ...location, weather: weatherData };
            })
          );
          setLocations(locationsWithWeather);
        } catch (weatherError) {
          console.error('Error fetching weather data:', weatherError.message);
          // Locations already set, so user can still see their locations even if weather fails
        }
      }
    } catch (error) {
      console.error('Error:', error.message);
      Alert.alert('Error', 'Failed to load saved locations');
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherForLocation = async (location) => {
    try {
      // Add a short timeout to prevent long waits
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const url = `${WEATHER_API_URL}?key=${WEATHER_API_KEY}&q=${location.latitude},${location.longitude}`;
      console.log('Fetching weather from URL:', url);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Weather API error (${response.status}):`, errorText);
        
        // Special handling for 403 errors
        if (response.status === 403) {
          console.error('API key authentication failed. Please check your WeatherAPI.com account.');
          
          // Try using a different API as fallback (OpenWeatherMap has more generous free tier)
          return await fetchOpenWeatherMapFallback(location);
        }
        
        return null;
      }
      
      const data = await response.json();
      console.log('Weather API response:', JSON.stringify(data).substring(0, 200) + '...');
      
      if (data.current) {
        return {
          temp: Math.round(data.current.temp_c),
          condition: data.current.condition.text,
          icon: data.current.condition.icon,
          iconUrl: `https:${data.current.condition.icon}`,
          feelsLike: Math.round(data.current.feelslike_c),
          humidity: data.current.humidity,
          windSpeed: data.current.wind_kph
        };
      }
      
      console.error('Unexpected weather data format:', data);
      return null;
    } catch (error) {
      console.error('Error fetching weather:', error.message);
      return null;
    }
  };
  
  // Fallback to OpenWeatherMap API if WeatherAPI fails
  const fetchOpenWeatherMapFallback = async (location) => {
    try {
      const OWM_API_KEY = '889e409b32069339792e57c7e471db36'; // Free test key
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}&lon=${location.longitude}&units=metric&appid=${OWM_API_KEY}`;
      
      console.log('Trying fallback OpenWeatherMap API');
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Fallback API also failed with status:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      if (data.main && data.weather && data.weather.length > 0) {
        return {
          temp: Math.round(data.main.temp),
          condition: data.weather[0].main,
          icon: data.weather[0].icon,
          iconUrl: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
          feelsLike: Math.round(data.main.feels_like),
          humidity: data.main.humidity,
          windSpeed: data.wind ? (data.wind.speed * 3.6) : null // Convert m/s to km/h
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching fallback weather:', error.message);
      return null;
    }
  };

  const handleDeleteLocation = async (locationId) => {
    Alert.alert(
      "Delete Location",
      "Are you sure you want to delete this saved location?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_locations')  
                .delete()
                .eq('id', locationId);

              if (error) {
                throw new Error(error.message);
              }

              // Remove location from state
              setLocations(locations.filter(location => location.id !== locationId));
              Alert.alert('Success', 'Location deleted successfully');
            } catch (error) {
              console.error('Error deleting location:', error.message);
              Alert.alert('Error', 'Failed to delete location');
            }
          }
        }
      ]
    );
  };

  const handleAddLocation = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        // If permission is not granted, alert the user
        Alert.alert(
          "Location Permission",
          "Please enable location services to add a new location.",
          [
            { text: "OK" }
          ]
        );
        return; // Stop here if permission is denied
      }

      // Navigate to the add location screen
      navigation.navigate('AddLocation');

    } catch (error) {
      console.error("Error requesting location permission:", error.message);
      Alert.alert(
        "Error",
        "There was an issue requesting location permission."
      );
    }
  };

  const handleViewLocation = (item) => {
    // Navigate to a map view or details screen with this location
    // For now, show an alert with the location details
    Alert.alert(
      item.label || 'Unnamed Location',
      `Coordinates: ${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}`
    );
  };

  const renderWeatherInfo = (weather) => {
    if (!weather) {
      return (
        <View style={styles.weatherLoading}>
          <Text style={{ color: theme.colors.secondaryText }}>
            <Feather name="cloud-off" size={14} style={{ marginRight: 4 }} /> No weather data
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.weatherContainer}>
        <Image
          source={{ uri: weather.iconUrl }}
          style={styles.weatherIcon}
          defaultSource={require('../assets/icon.png')}  
        />
        <Text style={[styles.weatherTemp, { color: theme.colors.text }]}>
          {weather.temp}°C
        </Text>
        <Text style={[styles.weatherCondition, { color: theme.colors.secondaryText }]}>
          {weather.condition}
        </Text>
      </View>
    );
  };

  const renderLocationItem = ({ item }) => (
    <View style={[styles.locationItem, { backgroundColor: theme.colors.card }]} >
      <View style={styles.locationInfo}>
        <Text style={[styles.locationName, { color: theme.colors.text }]}>
          {item.label || 'Unnamed Location'}
        </Text>
        <Text style={[styles.locationAddress, { color: theme.colors.secondaryText }]}>
          {`${item.latitude?.toFixed(6)}, ${item.longitude?.toFixed(6)}`}
        </Text>
        {renderWeatherInfo(item.weather)}
      </View>
      
      <View style={styles.locationActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleViewLocation(item)}
        >
          <Feather name="map" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDeleteLocation(item.id)}
        >
          <Feather name="trash-2" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Feather name="map-pin" size={50} color={theme.colors.secondaryText} />
      <Text style={[styles.emptyText, { color: theme.colors.secondaryText }]}>
        No saved locations yet
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.colors.secondaryText }]}>
        Save your favorite places for quick access
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Saved Locations</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddLocation}
        >
          <Feather name="plus" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={locations}
          renderItem={renderLocationItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    marginBottom: 8,
  },
  weatherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  weatherIcon: {
    width: 30,
    height: 30,
  },
  weatherTemp: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  weatherCondition: {
    fontSize: 12,
    marginLeft: 6,
    maxWidth: 100,
  },
  weatherLoading: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default SavedLocationsScreen;