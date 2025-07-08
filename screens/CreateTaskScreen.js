import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Image, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemeContext } from '../functions/ThemeContext';
import { supabase } from '../lib/superbase';
import * as ImagePicker from 'expo-image-picker';
import uuid from 'react-native-uuid';

const CreateTaskScreen = ({ navigation, route }) => {
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
  
  // Holiday-related state
  const [holidays, setHolidays] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [holidayWarning, setHolidayWarning] = useState(null);

  // Calendarific API configuration
  const CALENDARIFIC_API_KEY = 'GOu3avWFmorc8Q7u3KIbRyvARxDspidN'; // Replace with your actual API key
  const COUNTRY_CODE = 'SG'; // Singapore - change based on user location

  useEffect(() => {
    // Get the current user ID
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
      // Request camera permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraPermission.status !== 'granted' || mediaLibraryPermission.status !== 'granted') {
        Alert.alert('Permission Required', 'Camera and media library access is needed to attach photos to tasks.');
      }
    })();
  }, []);

  // Fetch holidays from Calendarific API
  const fetchHolidays = async (year) => {
    if (!CALENDARIFIC_API_KEY) {
      console.warn('Calendarific API key not configured');
      return [];
    }

    try {
      setLoadingHolidays(true);
      const response = await fetch(
        `https://calendarific.com/api/v2/holidays?api_key=${CALENDARIFIC_API_KEY}&country=${COUNTRY_CODE}&year=${year}&type=national,local`
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

  // Update holiday warning when due date changes
  useEffect(() => {
    if (dueDate) {
      const warning = generateHolidayWarning(dueDate);
      setHolidayWarning(warning);
    } else {
      setHolidayWarning(null);
    }
  }, [dueDate, holidays]);

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
      // Start with basic task data
      const taskData = {
        title,
        description,
        location_label: selectedLocation,
        location_id: null, 
        is_completed: false,
        due_date: dueDate,
        due_status: dueDate ? dueDate < new Date() : false,
        user_id: userId,
      };

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

      // Find location_id if a location is selected
      if (selectedLocation) {
        const matchingLocation = locations.find(loc => loc.label === selectedLocation);
        if (matchingLocation) {
          taskData.location_id = matchingLocation.id;
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

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  useEffect(() => {
    // Fetch holidays when year changes
    if (selectedYear) {
      fetchHolidays(selectedYear).then(holidayData => {
        setHolidays(holidayData);
      });
    }
  }, [selectedYear]);
  
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

        {/* Suggested Locations */}
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
            
            <View style={styles.datePickerActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={{ color: theme.colors.secondaryText }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.todayButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  const today = new Date();
                  setDueDate(today);
                  setShowDatePicker(false);
                }}
              >
                <Text style={{ color: '#FFFFFF' }}>Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 20 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  saveButton: { padding: 8 },
  saveButtonText: { fontWeight: '600' },
  formSection: { margin: 16, borderRadius: 12, padding: 16, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', paddingVertical: 12 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, padding: 0 },
  descriptionInput: { height: 100, paddingTop: 8 },
  selectorContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  selectorText: { flex: 1, fontSize: 16, marginLeft: 12 },
  
  // Holiday warning styles
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    lineHeight: 20,
  },
  
  suggestionsContainer: { marginTop: 8 },
  suggestionsTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  suggestionText: { marginLeft: 8, fontSize: 16 },
  noLocationsContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  noLocationsText: { marginLeft: 8, fontSize: 16 },
  createButton: { margin: 16, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  createButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  
  photoPreviewContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    marginTop: 8,
  },
photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    paddingVertical: 4,
  },
  photoActionText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },

  // Modal and Date Picker Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    width: '90%',
    maxWidth: 350,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  weekdaysContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 5,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  selectedDayCell: {
    borderRadius: 20,
  },
  holidayDayCell: {
    backgroundColor: '#FFE5E5',
    borderRadius: 20,
  },
  weekendDayCell: {
    backgroundColor: '#F0F8FF',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  holidayDayText: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  weekendDayText: {
    color: '#007AFF',
  },
  holidayIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF3B30',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  todayButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});

export default CreateTaskScreen;