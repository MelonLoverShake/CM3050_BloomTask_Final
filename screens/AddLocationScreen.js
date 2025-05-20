import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/superbase';
import { ThemeContext } from '../functions/ThemeContext';
import * as Location from 'expo-location';

const AddLocationScreen = ({ navigation, route }) => {
  const { theme } = useContext(ThemeContext);
  const [label, setLabel] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [latitudeInput, setLatitudeInput] = useState('');
  const [longitudeInput, setLongitudeInput] = useState('');

  useEffect(() => {
    // Check if we were passed coordinates from the previous screen
    if (route.params?.latitude && route.params?.longitude) {
      setLatitude(route.params.latitude);
      setLongitude(route.params.longitude);
    }
  }, [route.params]);

  const getCurrentLocation = async () => {
    try {
      setFetchingLocation(true);
      setManualEntry(false);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          "Permission Denied",
          "Please enable location services to use this feature."
        );
        return;
      }
      
      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
      
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Failed to get your current location");
    } finally {
      setFetchingLocation(false);
    }
  };

  const toggleManualEntry = () => {
    setManualEntry(!manualEntry);
    if (!manualEntry) {
      // Initialize input fields with current values if available
      if (latitude !== null) setLatitudeInput(latitude.toString());
      if (longitude !== null) setLongitudeInput(longitude.toString());
    }
  };

  const handleManualCoordinatesSubmit = () => {
    // Validate inputs
    const lat = parseFloat(latitudeInput);
    const lng = parseFloat(longitudeInput);
    
    if (isNaN(lat) || lat < -90 || lat > 90) {
      Alert.alert("Invalid Input", "Latitude must be between -90 and 90");
      return;
    }
    
    if (isNaN(lng) || lng < -180 || lng > 180) {
      Alert.alert("Invalid Input", "Longitude must be between -180 and 180");
      return;
    }
    
    setLatitude(lat);
    setLongitude(lng);
    setManualEntry(false);
  };

  const viewOnExternalMap = () => {
    if (latitude === null || longitude === null) {
      Alert.alert("Error", "No coordinates available to view");
      return;
    }

    // Open in Google Maps
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open maps application");
    });
  };

  const saveLocation = async () => {
    if (!label.trim()) {
      Alert.alert("Error", "Please enter a label for this location");
      return;
    }
    
    if (latitude === null || longitude === null) {
      Alert.alert("Error", "Location coordinates are required");
      return;
    }
    
    try {
      setLoading(true);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigation.replace('Login');
        return;
      }
      
      // Save to database
      const { data, error } = await supabase
        .from('user_locations')
        .insert([
          { 
            user_id: session.user.id,
            label: label.trim(),
            latitude: latitude,
            longitude: longitude
          }
        ]);
      
      if (error) {
        throw new Error(error.message);
      }
      
      Alert.alert(
        "Success", 
        "Location saved successfully",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
      
    } catch (error) {
      console.error("Error saving location:", error);
      Alert.alert("Error", "Failed to save location");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Add Location</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Location Name</Text>
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border
                }
              ]}
              placeholder="Enter a name for this location"
              placeholderTextColor={theme.colors.secondaryText}
              value={label}
              onChangeText={setLabel}
            />
            
            <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>
              Coordinates
            </Text>
            
            {!manualEntry ? (
              <View style={styles.coordinatesContainer}>
                {latitude !== null && longitude !== null ? (
                  <View style={[styles.coordinatesBox, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.coordinatesText, { color: theme.colors.text }]}>
                      {`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
                    </Text>
                    
                    <TouchableOpacity
                      style={[styles.viewMapButton, { backgroundColor: theme.colors.secondary }]}
                      onPress={viewOnExternalMap}
                    >
                      <Feather name="external-link" size={16} color="#fff" />
                      <Text style={styles.viewMapButtonText}>View</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.coordinatesBox, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.placeholderText, { color: theme.colors.secondaryText }]}>
                      No coordinates selected
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.manualInputContainer}>
                <View style={styles.coordinateInputRow}>
                  <Text style={[styles.coordinateLabel, { color: theme.colors.text }]}>Latitude:</Text>
                  <TextInput
                    style={[
                      styles.coordinateInput, 
                      { 
                        backgroundColor: theme.colors.card,
                        color: theme.colors.text,
                        borderColor: theme.colors.border
                      }
                    ]}
                    placeholder="e.g. 37.7749"
                    placeholderTextColor={theme.colors.secondaryText}
                    value={latitudeInput}
                    onChangeText={setLatitudeInput}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.coordinateInputRow}>
                  <Text style={[styles.coordinateLabel, { color: theme.colors.text }]}>Longitude:</Text>
                  <TextInput
                    style={[
                      styles.coordinateInput, 
                      { 
                        backgroundColor: theme.colors.card,
                        color: theme.colors.text,
                        borderColor: theme.colors.border
                      }
                    ]}
                    placeholder="e.g. -122.4194"
                    placeholderTextColor={theme.colors.secondaryText}
                    value={longitudeInput}
                    onChangeText={setLongitudeInput}
                    keyboardType="numeric"
                  />
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.applyCoordinatesButton,
                    { backgroundColor: theme.colors.primary }
                  ]}
                  onPress={handleManualCoordinatesSubmit}
                >
                  <Text style={styles.applyCoordinatesButtonText}>Apply Coordinates</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  { backgroundColor: theme.colors.primary }
                ]}
                onPress={getCurrentLocation}
                disabled={fetchingLocation}
              >
                {fetchingLocation ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="crosshair" size={18} color="#fff" style={styles.optionIcon} />
                    <Text style={styles.optionText}>Use Current Location</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  { 
                    backgroundColor: manualEntry ? theme.colors.primary : theme.colors.secondary 
                  }
                ]}
                onPress={toggleManualEntry}
              >
                <Feather name="edit-2" size={18} color="#fff" style={styles.optionIcon} />
                <Text style={styles.optionText}>
                  {manualEntry ? 'Hide Manual Entry' : 'Enter Coordinates'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[
                styles.saveButton,
                { 
                  backgroundColor: 
                    label.trim() && latitude !== null && longitude !== null
                      ? theme.colors.primary
                      : theme.colors.border
                }
              ]}
              onPress={saveLocation}
              disabled={!label.trim() || latitude === null || longitude === null || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Location</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerRight: {
    width: 40,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  formContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  coordinatesContainer: {
    marginTop: 8,
  },
  coordinatesBox: {
    height: 50,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  coordinatesText: {
    fontSize: 16,
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  viewMapButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '500',
  },
  manualInputContainer: {
    marginTop: 8,
  },
  coordinateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  coordinateLabel: {
    width: 80,
    fontSize: 16,
  },
  coordinateInput: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  applyCoordinatesButton: {
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  applyCoordinatesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 8,
    flex: 0.48,
  },
  optionIcon: {
    marginRight: 8,
  },
  optionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    height: 55,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddLocationScreen;