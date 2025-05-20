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

  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'User is not authenticated');
      return;
    }

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
        s = 1;
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
      
      // For development/debugging purposes, just return the local URI
      // This bypasses the actual upload to Supabase
      console.log('Skipping actual upload in development, using local URI for testing');
      return photoUri;
      
      /* Uncomment this code for production use:
      
      // Create a unique file path for the image
      const fileExt = photoUri.split('.').pop();
      const fileName = `${uuid.v4()}.${fileExt}`;
      const fullPath = `task_photos/${fileName}`;
      
      // Use the Supabase SDK's upload method
      const { data, error } = await supabase.storage
        .from('task_attachments')
        .upload(fullPath, {
          uri: photoUri,
          type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          name: fileName,
        }, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        throw error;
      }
      
      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('task_attachments')
        .getPublicUrl(fullPath);
        
      return urlData?.publicUrl || null;
      */
      
    } catch (error) {
      console.error('Error in photo upload:', error);
      Alert.alert('Error', 'Photo upload skipped in development mode');
      return photoUri; // Still return the URI for testing purposes
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
                const isSelected = dueDate && 
                  dueDate.getDate() === day && 
                  dueDate.getMonth() === selectedMonth &&
                  dueDate.getFullYear() === selectedYear;
                
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayCell,
                      isSelected && styles.selectedDayCell,
                      isSelected && { backgroundColor: theme.colors.primary }
                    ]}
                    onPress={() => handleDateSelect(day)}
                  >
                    <Text style={[
                      styles.dayText,
                      { color: theme.colors.text },
                      isSelected && styles.selectedDayText
                    ]}>
                      {day}
                    </Text>
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
    padding: 8,
    marginLeft: 16,
  },
  photoActionText: {
    marginLeft: 4,
    fontSize: 14,
  },
  
  // Date picker styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    width: '90%',
    maxWidth: 350,
    borderRadius: 12,
    padding: 16,
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
    marginBottom: 16,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  weekdaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayLabel: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
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
    marginVertical: 4,
  },
  selectedDayCell: {
    borderRadius: 20,
  },
  dayText: {
    fontSize: 14,
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  todayButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
});

export default CreateTaskScreen;