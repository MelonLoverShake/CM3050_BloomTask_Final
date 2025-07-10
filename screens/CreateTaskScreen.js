import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Image, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemeContext } from '../functions/ThemeContext';
import { supabase } from '../lib/superbase';
import * as ImagePicker from 'expo-image-picker';
import SpotifyDeepLinkService from '../functions/SpotifyDeepLinkService';

const CreateTaskScreen = ({ navigation, route }) => {

  // Function to get country code from coordinates
const getCountryCodeFromCoordinates = async (latitude, longitude) => {
  try {
    // Using a free geocoding service to get country code
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    const data = await response.json();
    return data.countryCode || 'SG'; // Default to SG if unable to determine
  } catch (error) {
    console.error('Error getting country code:', error);
    return 'SG'; // Default fallback
  }
};

  const { theme } = useContext(ThemeContext);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dueDate, setDueDate] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState(null);

  // Location state - Get from navigation params
  const [userLocation, setUserLocation] = useState(route.params?.userLocation || null);
  const [locationPermission, setLocationPermission] = useState(route.params?.locationPermission || null);
  
  // Spotify-related state
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [suggestedPlaylist, setSuggestedPlaylist] = useState(null);
  const [allPlaylists, setAllPlaylists] = useState([]);
  
  // Holiday-related state
  const [holidays, setHolidays] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [holidayWarning, setHolidayWarning] = useState(null);

  // Date picker state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // Calendarific API configuration
  const CALENDARIFIC_API_KEY = 'GOu3avWFmorc8Q7u3KIbRyvARxDspidN';
  const [countryCode, setCountryCode] = useState('SG'); // Dynamic country code

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Load all playlists on mount
  useEffect(() => {
    const playlists = SpotifyDeepLinkService.getAllPlaylists();
    setAllPlaylists(playlists);
  }, []);

  // Update suggested playlist when location changes
  useEffect(() => {
    if (selectedLocation) {
      const suggested = SpotifyDeepLinkService.getPlaylistForLocation(selectedLocation);
      setSuggestedPlaylist(suggested);
      
      // Auto-select the suggested playlist if none is selected
      if (!selectedPlaylist) {
        setSelectedPlaylist(suggested);
      }
    } else {
      setSuggestedPlaylist(null);
    }
  }, [selectedLocation]);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting current user:', error);
        Alert.alert('Error', 'Failed to get current user');
        return;
      }
      
      if (user) {
        setUserId(user.id);
      } else {
        Alert.alert('Error', 'User not authenticated');
        navigation.navigate('Login');
      }
    };

    getCurrentUser();
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase
        .from('user_locations')
        .select('id, label')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching locations:', error);
      } else {
        setLocations(data);
      }
    };

    fetchLocations();
  }, []);

  useEffect(() => {
    (async () => {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraPermission.status !== 'granted' || mediaLibraryPermission.status !== 'granted') {
        Alert.alert('Permission Required', 'Camera and media library access is needed to attach photos to tasks.');
      }
    })();
  }, []);

  // Fetch holidays when year or country changes
useEffect(() => {
  if (selectedYear && countryCode) {
    fetchHolidays(selectedYear).then(holidayData => {
      setHolidays(holidayData);
    });
  }
}, [selectedYear, countryCode]);

  // Update holiday warning when due date changes
  useEffect(() => {
    if (dueDate) {
      const warning = generateHolidayWarning(dueDate);
      setHolidayWarning(warning);
    } else {
      setHolidayWarning(null);
    }
  }, [dueDate, holidays]);

  // Determine country code from user location
useEffect(() => {
  const determineCountryCode = async () => {
    if (userLocation?.coords && locationPermission === 'granted') {
      const code = await getCountryCodeFromCoordinates(
        userLocation.coords.latitude,
        userLocation.coords.longitude
      );
      setCountryCode(code);
      console.log('Country code determined:', code);
    } else {
      // Fallback to SG if no location access
      setCountryCode('SG');
    }
  };

  determineCountryCode();
}, [userLocation, locationPermission]);

 // Fetch holidays from Calendarific API
const fetchHolidays = async (year) => {
  if (!CALENDARIFIC_API_KEY) {
    console.warn('Calendarific API key not configured');
    return [];
  }

  try {
    setLoadingHolidays(true);
    const response = await fetch(
      `https://calendarific.com/api/v2/holidays?api_key=${CALENDARIFIC_API_KEY}&country=${countryCode}&year=${year}&type=national,local`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.meta.code === 200) {
      return data.response.holidays.map(holiday => ({
        name: holiday.name,
        description: holiday.description,
        date: new Date(holiday.date.iso),
        type: holiday.type,
        primary_type: holiday.primary_type,
        country: holiday.country,
        locations: holiday.locations
      }));
    } else {
      console.error('Calendarific API error:', data.meta.error_detail);
      return [];
    }
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return [];
  } finally {
    setLoadingHolidays(false);
  }
};

  // Check if a date is a holiday
  const isHoliday = (date) => {
    if (!date || holidays.length === 0) return null;
    
    return holidays.find(holiday => {
      const holidayDate = holiday.date;
      return (
        holidayDate.getDate() === date.getDate() &&
        holidayDate.getMonth() === date.getMonth() &&
        holidayDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Check if a date is close to a holiday (within 1 day)
  const isNearHoliday = (date) => {
    if (!date || holidays.length === 0) return null;
    
    const dayBefore = new Date(date);
    dayBefore.setDate(dayBefore.getDate() - 1);
    
    const dayAfter = new Date(date);
    dayAfter.setDate(dayAfter.getDate() + 1);
    
    return holidays.find(holiday => {
      const holidayDate = holiday.date;
      return (
        (holidayDate.getDate() === dayBefore.getDate() && 
         holidayDate.getMonth() === dayBefore.getMonth() &&
         holidayDate.getFullYear() === dayBefore.getFullYear()) ||
        (holidayDate.getDate() === dayAfter.getDate() && 
         holidayDate.getMonth() === dayAfter.getMonth() &&
         holidayDate.getFullYear() === dayAfter.getFullYear())
      );
    });
  };

  // Generate holiday warning message
  const generateHolidayWarning = (selectedDate) => {
    if (!selectedDate) return null;

    const holiday = isHoliday(selectedDate);
    const nearHoliday = isNearHoliday(selectedDate);

    if (holiday) {
      return {
        type: 'holiday',
        message: `${formatDate(selectedDate)} is ${holiday.name}. Consider setting a lighter task or adjusting the deadline.`,
        icon: 'calendar',
        color: '#FF6B6B'
      };
    }

    if (nearHoliday) {
      return {
        type: 'near-holiday',
        message: `This date is close to ${nearHoliday.name} (${formatDate(nearHoliday.date)}). You might want to consider the holiday schedule.`,
        icon: 'info',
        color: '#FFA726'
      };
    }

    // Check if it's a weekend
    const dayOfWeek = selectedDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        type: 'weekend',
        message: 'This falls on a weekend. Consider if this affects your task completion.',
        icon: 'calendar',
        color: '#42A5F5'
      };
    }

    return null;
  };

  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'User is not authenticated');
      return;
    }

    // Show holiday confirmation if applicable
    if (holidayWarning && holidayWarning.type === 'holiday') {
      Alert.alert(
        'Holiday Notice',
        `${holidayWarning.message}\n\nDo you want to proceed with this date?`,
        [
          { text: 'Change Date', style: 'cancel' },
          { text: 'Proceed', onPress: () => createTask() }
        ]
      );
      return;
    }

    createTask();
  };

  const createTask = async () => {
    try {
      // Find location data
      const matchingLocation = locations.find(loc => loc.label === selectedLocation);
      
      // Start with basic task data
      const taskData = {
        title,
        description,
        location_label: selectedLocation,
        location_id: matchingLocation?.id || null,
        is_completed: false,
        due_date: dueDate,
        due_status: dueDate ? dueDate < new Date() : false,
        user_id: userId,
      };

      // Add playlist info if selected
      if (selectedPlaylist) {
        taskData.playlist_info = JSON.stringify({
          playlist_id: selectedPlaylist.id,
          playlist_name: selectedPlaylist.name,
          playlist_description: selectedPlaylist.description,
          deep_link: selectedPlaylist.deep_link,
          spotify_url: selectedPlaylist.spotify_url,
          playlist_image: selectedPlaylist.image,
          location_suggested: selectedPlaylist.id === suggestedPlaylist?.id
        });
      }

      // Add holiday metadata if applicable
      if (dueDate) {
        const holiday = isHoliday(dueDate);
        if (holiday) {
          taskData.holiday_info = JSON.stringify({
            holiday_name: holiday.name,
            holiday_type: holiday.type,
            is_holiday: true
          });
        }
      }

      // If there's a photo, upload it first
      if (photo) {
        const photoUrl = await uploadPhoto(photo);
        if (photoUrl) {
          taskData.photo_url = photoUrl;
        }
      }

      // Insert the task data
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select();

      if (error) {
        console.error('Error creating task:', error);
        Alert.alert('Error', 'Failed to create task: ' + error.message);
      } else {
        Alert.alert('Success', 'Task created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Task creation failed:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handlePlaylistSelect = (playlist) => {
    setSelectedPlaylist(playlist);
    setShowPlaylistSelector(false);
  };

  const openPlaylistInSpotify = async (playlist) => {
    if (playlist) {
      await SpotifyDeepLinkService.openPlaylist(playlist);
    }
  };

  const uploadPhoto = async (photoUri) => {
    if (!photoUri) return null;
    
    try {
      setUploading(true);
      console.log('Skipping actual upload in development, using local URI for testing');
      return photoUri;
    } catch (error) {
      console.error('Error in photo upload:', error);
      Alert.alert('Error', 'Photo upload skipped in development mode');
      return photoUri; 
    } finally {
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const removePhoto = () => {
    setPhoto(null);
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };
  
  const handleDateSelect = (day) => {
    const newDate = new Date(selectedYear, selectedMonth, day);
    setDueDate(newDate);
    setShowDatePicker(false);
  };
  
  const formatDate = (date) => {
    if (!date) return '';
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
    // Initialize with current date if none selected
    if (!dueDate) {
      const today = new Date();
      setSelectedYear(today.getFullYear());
      setSelectedMonth(today.getMonth());
    } else {
      setSelectedYear(dueDate.getFullYear());
      setSelectedMonth(dueDate.getMonth());
    }
  };
  
  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };
  
  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Attach Photo', 
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Create Task</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleCreateTask} disabled={uploading}>
          <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>
            {uploading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.formSection, { backgroundColor: theme.colors.card }]}>
        {/* Task Title */}
        <View style={styles.inputContainer}>
          <Feather name="file-text" size={20} color={theme.colors.primary} style={styles.inputIcon} />
          <TextInput 
            style={[styles.input, { color: theme.colors.text }]}
            placeholder="Task title"
            placeholderTextColor={theme.colors.secondaryText}
            autoFocus={true}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.inputContainer}>
          <Feather name="align-left" size={20} color={theme.colors.primary} style={styles.inputIcon} />
          <TextInput 
            style={[styles.input, styles.descriptionInput, { color: theme.colors.text }]}
            placeholder="Description"
            placeholderTextColor={theme.colors.secondaryText}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Due Date */}
        <TouchableOpacity style={styles.selectorContainer} onPress={openDatePicker}>
          <Feather name="calendar" size={20} color={theme.colors.primary} style={styles.inputIcon} />
          <Text style={[styles.selectorText, { color: dueDate ? theme.colors.text : theme.colors.secondaryText }]}>
            {dueDate ? formatDate(dueDate) : 'Add due date'}
          </Text>
          <Feather name="chevron-right" size={20} color={theme.colors.secondaryText} />
        </TouchableOpacity>

        {/* Holiday Warning */}
        {holidayWarning && (
          <View style={[styles.warningContainer, { backgroundColor: `${holidayWarning.color}15` }]}>
            <Feather name={holidayWarning.icon} size={16} color={holidayWarning.color} />
            <Text style={[styles.warningText, { color: holidayWarning.color }]}>
              {holidayWarning.message}
            </Text>
          </View>
        )}

        {/* Location */}
        <TouchableOpacity style={styles.selectorContainer}>
          <Feather name="map-pin" size={20} color={theme.colors.primary} style={styles.inputIcon} />
          <Text style={[styles.selectorText, { color: selectedLocation ? theme.colors.text : theme.colors.secondaryText }]}>
            {selectedLocation || 'Add location'}
          </Text>
          <Feather name="chevron-right" size={20} color={theme.colors.secondaryText} />
        </TouchableOpacity>

        {/* Playlist Selection */}
        <TouchableOpacity 
          style={styles.selectorContainer} 
          onPress={() => setShowPlaylistSelector(true)}
        >
          <Feather name="music" size={20} color={theme.colors.primary} style={styles.inputIcon} />
          <View style={styles.playlistSelectorContent}>
            <Text style={[styles.selectorText, { color: selectedPlaylist ? theme.colors.text : theme.colors.secondaryText }]}>
              {selectedPlaylist ? selectedPlaylist.name : 'Add playlist'}
            </Text>
            {selectedPlaylist && (
              <Text style={[styles.playlistSubtext, { color: theme.colors.secondaryText }]}>
                {selectedPlaylist.description}
              </Text>
            )}
          </View>
          <TouchableOpacity 
            onPress={() => openPlaylistInSpotify(selectedPlaylist)}
            style={styles.spotifyButton}
          >
            <Feather name="external-link" size={16} color="#1DB954" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Suggested Playlist Banner */}
        {suggestedPlaylist && selectedPlaylist?.id !== suggestedPlaylist?.id && (
          <View style={[styles.suggestionBanner, { backgroundColor: theme.colors.primary + '15' }]}>
            <Feather name="lightbulb" size={16} color={theme.colors.primary} />
            <Text style={[styles.suggestionText, { color: theme.colors.primary }]}>
              Try "{suggestedPlaylist.name}" for {selectedLocation}
            </Text>
            <TouchableOpacity 
              onPress={() => setSelectedPlaylist(suggestedPlaylist)}
              style={styles.useSuggestionButton}
            >
              <Text style={[styles.useSuggestionText, { color: theme.colors.primary }]}>Use</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Photo Attachment */}
        <TouchableOpacity 
          style={styles.selectorContainer} 
          onPress={photo ? removePhoto : showImageOptions}
        >
          <Feather 
            name={photo ? "image" : "camera"} 
            size={20} 
            color={theme.colors.primary} 
            style={styles.inputIcon} 
          />
          <Text style={[styles.selectorText, { color: photo ? theme.colors.text : theme.colors.secondaryText }]}>
            {photo ? 'Photo attached' : 'Attach photo'}
          </Text>
          {photo ? (
            <TouchableOpacity onPress={removePhoto}>
              <Feather name="x" size={20} color={theme.colors.secondaryText} />
            </TouchableOpacity>
          ) : (
            <Feather name="chevron-right" size={20} color={theme.colors.secondaryText} />
          )}
        </TouchableOpacity>

        {/* Photo Preview */}
        {photo && (
          <View style={styles.photoPreviewContainer}>
            <Image 
              source={{ uri: photo }} 
              style={styles.photoPreview} 
              resizeMode="cover"
            />
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoActionButton} onPress={showImageOptions}>
                <Feather name="edit-2" size={16} color={theme.colors.primary} />
                <Text style={[styles.photoActionText, { color: theme.colors.primary }]}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoActionButton} onPress={removePhoto}>
                <Feather name="trash-2" size={16} color="#FF3B30" />
                <Text style={[styles.photoActionText, { color: "#FF3B30" }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Saved Locations */}
        <View style={styles.suggestionsContainer}>
          <Text style={[styles.suggestionsTitle, { color: theme.colors.text }]}>Saved Locations</Text>

          {locations.length > 0 ? (
            locations.map((loc) => (
              <TouchableOpacity 
                key={loc.id} 
                style={styles.suggestionItem}
                onPress={() => setSelectedLocation(loc.label)}
              >
                <Feather name="map-pin" size={16} color={theme.colors.primary} />
                <Text style={[styles.suggestionText, { color: theme.colors.text }]}>
                  {loc.label}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noLocationsContainer}>
              <Feather name="map-pin" size={16} color={theme.colors.secondaryText} />
              <Text style={[styles.noLocationsText, { color: theme.colors.secondaryText }]}>
                No saved locations yet
              </Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity 
        style={[
          styles.createButton, 
          { backgroundColor: theme.colors.primary },
          uploading && { opacity: 0.7 }
        ]}
        onPress={handleCreateTask}
        disabled={uploading}
      >
        <Text style={styles.createButtonText}>
          {uploading ? 'Creating...' : 'Create Task'}
        </Text>
      </TouchableOpacity>

      {/* Playlist Selector Modal */}
      <Modal
        visible={showPlaylistSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPlaylistSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.playlistSelectorContainer, { backgroundColor: theme.colors.card }]}>
            <View style={styles.playlistSelectorHeader}>
              <Text style={[styles.playlistSelectorTitle, { color: theme.colors.text }]}>
                Select Playlist
              </Text>
              <TouchableOpacity onPress={() => setShowPlaylistSelector(false)}>
                <Feather name="x" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.playlistList}>
              {suggestedPlaylist && (
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                    Suggested for {selectedLocation}
                  </Text>
                  <PlaylistItem
                    playlist={suggestedPlaylist}
                    onSelect={handlePlaylistSelect}
                    theme={theme}
                    isSelected={selectedPlaylist?.id === suggestedPlaylist.id}
                  />
                </View>
              )}
              
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                All Playlists
              </Text>
              {allPlaylists.map((playlist) => (
                <PlaylistItem
                  key={playlist.id}
                  playlist={playlist}
                  onSelect={handlePlaylistSelect}
                  theme={theme}
                  isSelected={selectedPlaylist?.id === playlist.id}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowDatePicker(false)}
        >
          <View 
            style={[styles.datePickerContainer, { backgroundColor: theme.colors.card }]}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(evt) => evt.stopPropagation()}
          >
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={goToPreviousMonth}>
                <Feather name="chevron-left" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.datePickerTitle, { color: theme.colors.text }]}>
                {months[selectedMonth]} {selectedYear}
              </Text>
              <TouchableOpacity onPress={goToNextMonth}>
                <Feather name="chevron-right" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            
            {loadingHolidays && (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { color: theme.colors.secondaryText }]}>
                  Loading holidays...
                </Text>
              </View>
            )}
            
            <View style={styles.weekdaysContainer}>
              {daysOfWeek.map(day => (
                <Text key={day} style={[styles.weekdayLabel, { color: theme.colors.secondaryText }]}>
                  {day}
                </Text>
              ))}
            </View>
            
            <View style={styles.daysGrid}>
              {/* Empty cells for days before the first day of month */}
              {Array.from({ length: getFirstDayOfMonth(selectedMonth, selectedYear) }).map((_, index) => (
                <View key={`empty-${index}`} style={styles.dayCell} />
              ))}
              
              {/* Days of the month */}
              {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }).map((_, index) => {
                const day = index + 1;
                const currentDate = new Date(selectedYear, selectedMonth, day);
                const isSelected = dueDate && 
                  dueDate.getDate() === day && 
                  dueDate.getMonth() === selectedMonth &&
                  dueDate.getFullYear() === selectedYear;
                
                const holiday = isHoliday(currentDate);
                const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
                
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayCell,
                      isSelected && styles.selectedDayCell,
                      isSelected && { backgroundColor: theme.colors.primary },
                      holiday && styles.holidayDayCell,
                      isWeekend && !holiday && styles.weekendDayCell
                    ]}
                    onPress={() => handleDateSelect(day)}
                  >
                    <Text style={[
                      styles.dayText,
                      { color: theme.colors.text },
                      isSelected && styles.selectedDayText,
                      holiday && styles.holidayDayText,
                      isWeekend && !holiday && styles.weekendDayText
                    ]}>
                      {day}
                    </Text>
                    {holiday && (
                      <View style={styles.holidayIndicator} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <TouchableOpacity 
              style={[styles.clearDateButton, { borderColor: theme.colors.primary }]}
              onPress={() => {
                setDueDate(null);
                setShowDatePicker(false);
              }}
            >
              <Text style={[styles.clearDateText, { color: theme.colors.primary }]}>
                Clear Date
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

// Playlist Item Component
const PlaylistItem = ({ playlist, onSelect, theme, isSelected }) => (
  <TouchableOpacity
    style={[
      styles.playlistItem,
      { borderColor: theme.colors.border },
      isSelected && { backgroundColor: theme.colors.primary + '15' }
    ]}
    onPress={() => onSelect(playlist)}
  >
    <View style={styles.playlistItemContent}>
      {playlist.image && (
        <Image
          source={{ uri: playlist.image }}
          style={styles.playlistImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.playlistInfo}>
        <Text style={[styles.playlistName, { color: theme.colors.text }]}>
          {playlist.name}
        </Text>
        <Text style={[styles.playlistDescription, { color: theme.colors.secondaryText }]}>
          {playlist.description}
        </Text>
      </View>
    </View>
    {isSelected && (
      <Feather name="check" size={20} color={theme.colors.primary} />
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  formSection: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: 16,
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  playlistSelectorContent: {
    flex: 1,
    marginLeft: 12,
  },
  playlistSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
  spotifyButton: {
    padding: 8,
    marginLeft: 8,
  },
  suggestionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  useSuggestionButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'currentColor',
  },
  useSuggestionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  photoPreviewContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  photoActionText: {
    marginLeft: 8,
    fontSize: 14,
  },
  suggestionsContainer: {
    marginTop: 24,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  noLocationsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  noLocationsText: {
    marginLeft: 8,
    fontSize: 14,
  },
  createButton: {
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistSelectorContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 16,
  },
  playlistSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  playlistSelectorTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  playlistList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
    borderRadius: 8,
  },
  playlistItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  playlistDescription: {
    fontSize: 14,
  },
  datePickerContainer: {
    width: '90%',
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  weekdaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderRadius: 8,
    position: 'relative',
  },
  selectedDayCell: {
    backgroundColor: '#007AFF',
  },
  holidayDayCell: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  weekendDayCell: {
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  holidayDayText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  weekendDayText: {
    color: '#42A5F5',
  },
  holidayIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF6B6B',
  },
  clearDateButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    alignSelf: 'center',
  },
  clearDateText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CreateTaskScreen;