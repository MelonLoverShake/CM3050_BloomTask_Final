import React, { useState, useContext, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity, 
  Image,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { ThemeContext } from '../functions/ThemeContext';
import { supabase } from '../lib/superbase';
import * as ImagePicker from 'expo-image-picker';
import PomodoroTimer from '../screens/PomodoroTimer'; 

export default function TaskDetailScreen({ route, navigation }) {
  const { taskId } = route.params;
  const { theme, isDarkMode } = useContext(ThemeContext);

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [updatedTask, setUpdatedTask] = useState({
    title: '',
    description: '',
    cat_id: '', // Changed from 'category' to 'cat_id'
    is_completed: false,
    photo_url: null,
    completed_time: null
  });
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);

  useEffect(() => {
    fetchTaskDetails();
    fetchCategories();
  }, [taskId]);

  // Reset image error state when image URL changes
  useEffect(() => {
    setImageError(false);
  }, [updatedTask.photo_url]);

  const handlePomodoroComplete = (taskId, wasWorkSession) =>{
    if (wasWorkSession){
      console.log('Pomodoro completed for task:', taskId)



    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('category')
        .select('id, cat_name, color');

      if (error) {
        console.error('Error fetching categories:', error);
        Alert.alert('Error', 'Failed to load categories');
      } else if (data) {
        setCategories(data);
      }
    } catch (error) {
      console.error('Unexpected error fetching categories:', error);
    }
  };

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) {
        console.error('Error fetching task details:', error);
        Alert.alert('Error', 'Failed to load task details');
      } else if (data) {
        setTask(data);
        setUpdatedTask({
          title: data.title || '',
          description: data.description || '',
          cat_id: data.cat_id || '', // Changed from 'category' to 'cat_id'
          is_completed: data.is_completed || false,
          photo_url: data.photo_url || null,
          completed_time: data.completed_time || null
        });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: updatedTask.title,
          description: updatedTask.description,
          cat_id: updatedTask.cat_id, // Changed from 'category' to 'cat_id'
          is_completed: updatedTask.is_completed,
          photo_url: updatedTask.photo_url,
          completed_time: updatedTask.completed_time
        })
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task:', error);
        Alert.alert('Error', 'Failed to update task');
      } else {
        setTask({
          ...task,
          title: updatedTask.title,
          description: updatedTask.description,
          cat_id: updatedTask.cat_id, // Changed from 'category' to 'cat_id'
          is_completed: updatedTask.is_completed,
          photo_url: updatedTask.photo_url,
          completed_time: updatedTask.completed_time
        });
        setIsEditing(false);
        Alert.alert('Success', 'Task updated successfully');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const toggleComplete = async () => {
    try {
      const newStatus = !updatedTask.is_completed;
      
      // Format the time correctly for 'time with time zone' data type
      let completedTime = null;
      if (newStatus) {
        const now = new Date();
        // Format as HH:MM:SS±TZ which is valid for 'time with time zone'
        completedTime = now.toTimeString().split(' ')[0] + now.toTimeString().match(/GMT[+-]\d{4}/)[0].replace('GMT', '');
      }
      
      const { error } = await supabase
        .from('tasks')
        .update({ 
          is_completed: newStatus,
          completed_time: completedTime 
        })
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task status:', error);
        Alert.alert('Error', 'Failed to update task status');
      } else {
        setTask({ ...task, is_completed: newStatus, completed_time: completedTime });
        setUpdatedTask({ ...updatedTask, is_completed: newStatus, completed_time: completedTime });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const deleteTask = async () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);

              if (error) {
                console.error('Error deleting task:', error);
                Alert.alert('Error', 'Failed to delete task');
              } else {
                Alert.alert('Success', 'Task deleted successfully');
                navigation.goBack();
              }
            } catch (error) {
              console.error('Unexpected error:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            }
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to add images!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      
      // Reset error state when selecting a new image
      setImageError(false);
      setUpdatedTask({ ...updatedTask, photo_url: imageUri });
      
      if (!isEditing) {
        // If not in edit mode, update immediately
        try {
          const { error } = await supabase
            .from('tasks')
            .update({ photo_url: imageUri })
            .eq('id', taskId);

          if (error) {
            console.error('Error updating task image:', error);
            Alert.alert('Error', 'Failed to update task image');
          } else {
            setTask({ ...task, photo_url: imageUri });
          }
        } catch (error) {
          console.error('Unexpected error:', error);
          Alert.alert('Error', 'An unexpected error occurred');
        }
      }
    }
  };

  const removeImage = () => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            setUpdatedTask({ ...updatedTask, photo_url: null });
            
            if (!isEditing) {
              try {
                const { error } = await supabase
                  .from('tasks')
                  .update({ photo_url: null })
                  .eq('id', taskId);

                if (error) {
                  console.error('Error removing task image:', error);
                  Alert.alert('Error', 'Failed to remove task image');
                } else {
                  setTask({ ...task, photo_url: null });
                }
              } catch (error) {
                console.error('Unexpected error:', error);
                Alert.alert('Error', 'An unexpected error occurred');
              }
            }
          }
        }
      ]
    );
  };

  const changeCategory = () => {
    // Show better UI for category selection based on platform
    if (categories.length === 0) {
      Alert.alert('Error', 'No categories available. Please try again later.');
      return;
    }

    if (Platform.OS === 'ios') {
      // Use ActionSheetIOS for a native iOS experience
      const categoryNames = categories.map(category => category.cat_name);
      categoryNames.push('Cancel');
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: categoryNames,
          cancelButtonIndex: categoryNames.length - 1,
          title: 'Select Category',
          message: 'Choose a category for this task',
          userInterfaceStyle: isDarkMode ? 'dark' : 'light',
        },
        (buttonIndex) => {
          // Handle category selection
          if (buttonIndex !== categoryNames.length - 1) { // Not cancel
            const selectedCategory = categories[buttonIndex];
            setUpdatedTask({ ...updatedTask, cat_id: selectedCategory.id });
            
            if (!isEditing) {
              // If not in edit mode, update immediately
              supabase
                .from('tasks')
                .update({ cat_id: selectedCategory.id })
                .eq('id', taskId)
                .then(({ error }) => {
                  if (error) {
                    console.error('Error updating category:', error);
                    Alert.alert('Error', 'Failed to update category');
                  } else {
                    setTask({ ...task, cat_id: selectedCategory.id });
                  }
                });
            }
          }
        }
      );
    } else {
      // For Android, use an enhanced Alert dialog with better styling
      // Create buttons from categories with maximum 6 options per screen to avoid overcrowding
      const MAX_OPTIONS_PER_SCREEN = 6;
      const totalCategories = categories.length;
      let currentIndex = 0;
      
      const showCategoryPage = (startIndex) => {
        const endIndex = Math.min(startIndex + MAX_OPTIONS_PER_SCREEN, totalCategories);
        const currentCategories = categories.slice(startIndex, endIndex);
        
        // Create buttons for current page of categories
        const buttons = currentCategories.map(category => ({
          text: category.cat_name,
          // Add color indicator for better visual differentiation
          style: { color: category.color, fontWeight: 'bold' },
          onPress: () => {
            setUpdatedTask({ ...updatedTask, cat_id: category.id });
            
            if (!isEditing) {
              // If not in edit mode, update immediately
              supabase
                .from('tasks')
                .update({ cat_id: category.id })
                .eq('id', taskId)
                .then(({ error }) => {
                  if (error) {
                    console.error('Error updating category:', error);
                    Alert.alert('Error', 'Failed to update category');
                  } else {
                    setTask({ ...task, cat_id: category.id });
                  }
                });
            }
          }
        }));
        
        // Add navigation buttons if needed
        if (startIndex > 0) {
          buttons.push({
            text: '« Previous Categories',
            onPress: () => showCategoryPage(startIndex - MAX_OPTIONS_PER_SCREEN)
          });
        }
        
        if (endIndex < totalCategories) {
          buttons.push({
            text: 'More Categories »',
            onPress: () => showCategoryPage(endIndex)
          });
        }
        
        // Add cancel button
        buttons.push({ text: 'Cancel', style: 'cancel' });
        
        // Show the alert
        Alert.alert(
          'Select Category',
          'Choose a category for this task:',
          buttons
        );
      };
      
      // Start with the first page of categories
      showCategoryPage(0);
    }
  };

  // Helper function to format date for display
  const formatDateTime = (isoString) => {
    if (!isoString) return 'Not completed yet';
    
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Add this function to handle task updates from pomodoro
const handleTaskUpdate = (taskId, updates) => {
  setTask(prevTask => ({
    ...prevTask,
    ...updates
  }));
  setUpdatedTask(prevTask => ({
    ...prevTask,
    ...updates
  }));
};

  // Get category details by ID
  const getCategoryById = (categoryId) => {
    if (!categoryId) return { cat_name: 'Uncategorized', color: '#808080', icon: 'tasks' };
    
    const category = categories.find(cat => cat.id === categoryId);
    return category || { cat_name: 'Uncategorized', color: '#808080', icon: 'tasks' };
  };

  // Render category selection button with nicer styling
  const renderCategoryButton = () => {
    const currentCategory = getCategoryById(updatedTask.cat_id);
    
    return (
      <TouchableOpacity 
        style={styles.categoryButtonContainer}
        onPress={changeCategory}
        activeOpacity={0.7}
      >
        <View style={styles.categoryButtonContent}>
          <View style={[styles.categoryBadge, { 
            backgroundColor: currentCategory.color || '#808080' 
          }]}>
            <FontAwesome5 
              name={currentCategory.icon || 'tasks'} 
              size={16} 
              color="white" 
            />
            <Text style={styles.categoryText}>
              {currentCategory.cat_name || 'Uncategorized'}
            </Text>
          </View>
          
          <View style={styles.categoryChangeContainer}>
            <Text style={[styles.changeCategoryText, { color: theme.colors.primary }]}>
              Change
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTaskImage = () => {
    if (updatedTask.photo_url) {
      return (
        <View style={styles.taskImageContainer}>
          <TouchableOpacity 
            onPress={pickImage}
            activeOpacity={0.8}
            accessibilityLabel="Task image, tap to change"
          >
            <Image 
              source={{ uri: updatedTask.photo_url }} 
              style={styles.taskImage}
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
                console.error('Error loading image:', updatedTask.photo_url);
              }}
            />
          </TouchableOpacity>
          
          {/* Show loading indicator while image loads */}
          {imageLoading && (
            <View style={styles.imageLoadingOverlay}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          )}
          
          {/* Show error indicator if image fails to load */}
          {imageError && (
            <View style={styles.imageErrorOverlay}>
              <MaterialIcons name="broken-image" size={40} color={theme.colors.error} />
              <Text style={[styles.imageErrorText, { color: theme.colors.error }]}>
                Failed to load image
              </Text>
            </View>
          )}
          
          {/* Image controls */}
          <View style={styles.imageControls}>
            <TouchableOpacity 
              style={[styles.imageControlButton, { backgroundColor: theme.colors.primary }]}
              onPress={pickImage}
              accessibilityLabel="Change image"
            >
              <Feather name="edit-2" size={16} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.imageControlButton, { backgroundColor: theme.colors.error }]}
              onPress={removeImage}
              accessibilityLabel="Remove image"
            >
              <Feather name="trash-2" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      );
    } else {
      // Render category icon as fallback
      const categoryDetails = getCategoryById(updatedTask.cat_id); // Changed from 'category' to 'cat_id'
      const iconName = categoryDetails.icon || 'tasks';
      const backgroundColor = categoryDetails.color || '#808080';
      
      return (
        <TouchableOpacity 
          style={[styles.taskIconContainer, { backgroundColor }]}
          onPress={pickImage}
          accessibilityLabel={`Add image to task: ${updatedTask.title}`}
        >
          <FontAwesome5 name={iconName} size={36} color="white" />
          <Text style={styles.addImageText}>Add Image</Text>
        </TouchableOpacity>
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>Task not found</Text>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Get current category details
  const currentCategory = getCategoryById(updatedTask.cat_id); // Changed from 'category' to 'cat_id'

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={24} color={theme.colors.primary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Task Details
        </Text>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => isEditing ? handleSave() : setIsEditing(true)}
          accessibilityLabel={isEditing ? "Save changes" : "Edit task"}
        >
          <Feather 
            name={isEditing ? "check" : "edit-2"} 
            size={20} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Task Image or Icon */}
          <View style={styles.imageContainer}>
            {renderTaskImage()}
          </View>

          {/* Task Title */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>
              Title
            </Text>
            {isEditing ? (
              <TextInput
                style={[styles.editableText, { 
                  color: theme.colors.text,
                  borderBottomColor: theme.colors.primary 
                }]}
                value={updatedTask.title}
                onChangeText={(text) => setUpdatedTask({ ...updatedTask, title: text })}
                placeholder="Task title"
                placeholderTextColor={theme.colors.placeholderText}
              />
            ) : (
              <Text style={[styles.taskTitle, { color: theme.colors.text }]}>
                {task.title}
              </Text>
            )}
          </View>

          {/* Task Status */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>
              Status
            </Text>
            <TouchableOpacity 
              style={styles.statusContainer}
              onPress={toggleComplete}
            >
              <MaterialIcons 
                name={updatedTask.is_completed ? "check-circle" : "radio-button-unchecked"} 
                size={24} 
                color={updatedTask.is_completed ? theme.colors.success : theme.colors.primary} 
              />
              <Text style={[styles.statusText, { 
                color: updatedTask.is_completed ? theme.colors.success : theme.colors.primary,
                marginLeft: 10
              }]}>
                {updatedTask.is_completed ? "Completed" : "Not Completed"}
              </Text>
            </TouchableOpacity>
            
            {/* Completion Time - show only if task is completed */}
            {updatedTask.is_completed && updatedTask.completed_time && (
              <View style={styles.completionTimeContainer}>
                <Text style={[styles.completionTimeLabel, { color: theme.colors.secondaryText }]}>
                  Completed on:
                </Text>
                <Text style={[styles.completionTimeValue, { color: theme.colors.text }]}>
                  {formatDateTime(updatedTask.completed_time)}
                </Text>
              </View>
            )}
          </View>

          {/* Task Category */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>
              Category
            </Text>
            {renderCategoryButton()}
          </View>

          {/* Task Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>
              Description
            </Text>
            {isEditing ? (
              <TextInput
                style={[styles.editableText, styles.description, { 
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.inputBackground
                }]}
                value={updatedTask.description}
                onChangeText={(text) => setUpdatedTask({ ...updatedTask, description: text })}
                placeholder="Add task description..."
                placeholderTextColor={theme.colors.placeholderText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            ) : (
              <Text style={[styles.descriptionText, { color: theme.colors.text }]}>
                {task.description || "No description provided"}
              </Text>
            )}
          </View>

          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: theme.colors.error }]}
            onPress={deleteTask}
          >
            <Feather name="trash-2" size={20} color="white" />
            <Text style={styles.deleteButtonText}>Delete Task</Text>
          </TouchableOpacity>
          {/* Pomodoro Timer Section */}
<View style={styles.section}>
  <TouchableOpacity 
    style={styles.pomodoroHeader}
    onPress={() => setShowPomodoro(!showPomodoro)}
    activeOpacity={0.7}
  >
    <View style={styles.pomodoroHeaderLeft}>
      <MaterialIcons 
        name="timer" 
        size={20} 
        color={theme.colors.primary} 
      />
      <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText, marginBottom: 0, marginLeft: 8 }]}>
        Focus Timer
      </Text>
    </View>
    
    <View style={styles.pomodoroHeaderRight}>
      {task.pomodoros > 0 && (
        <Text style={[styles.pomodoroSummary, { color: theme.colors.primary }]}>
          🍅 {task.pomodoros} completed
        </Text>
      )}
      <MaterialIcons 
        name={showPomodoro ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
        size={24} 
        color={theme.colors.primary} 
      />
    </View>
  </TouchableOpacity>
  
  {showPomodoro && (
    <View style={[styles.pomodoroContainer, { 
      backgroundColor: theme.colors.inputBackground,
      borderColor: theme.colors.border 
    }]}>
      <PomodoroTimer
        task={{
          id: task.id,
          title: task.title,
          pomodoros: task.pomodoros || 0
        }}
        onPomodoroComplete={handlePomodoroComplete}
        onUpdateTask={handleTaskUpdate}
        theme={theme}
      />
    </View>
  )}
</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  actionButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  button: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  taskImageContainer: {
    position: 'relative',
    width: 150,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
  },
  taskImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageErrorText: {
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
    fontSize: 12,
  },
  imageControls: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    padding: 4,
  },
  imageControlButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  taskIconContainer: {
    width: 150,
    height: 150,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    color: 'white',
    marginTop: 8,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  editableText: {
    fontSize: 18,
    padding: 10,
    borderBottomWidth: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  completionTimeContainer: {
    marginTop: 10,
    paddingLeft: 34,
  },
  completionTimeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  completionTimeValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: 'white',
    marginLeft: 6,
    fontWeight: '500',
  },
  changeCategoryText: {
    fontSize: 14,
  },
  description: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },

  pomodoroHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 4,
},
pomodoroHeaderLeft: {
  flexDirection: 'row',
  alignItems: 'center',
},
pomodoroHeaderRight: {
  flexDirection: 'row',
  alignItems: 'center',
},
pomodoroSummary: {
  fontSize: 12,
  fontWeight: '500',
  marginRight: 8,
},
pomodoroContainer: {
  marginTop: 12,
  padding: 16,
  borderRadius: 12,
  borderWidth: 1,
}
});