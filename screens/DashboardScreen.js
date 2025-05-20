// screens/DashboardScreen.js
import React, { useState, useContext, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity, 
  FlatList, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { ThemeContext } from '../functions/ThemeContext';
import { supabase } from '../lib/superbase';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location'; 
import { checkLocationProximity, saveTaskLocation } from '../functions/locationUtils';
import NearbyTaskIndicator from '../screens/NearbyTaskIndicator';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Task category icons for fallback
const CATEGORY_ICONS = {
  work: "briefcase",
  personal: "user",
  health: "heartbeat",
  shopping: "shopping-cart",
  bills: "file-invoice-dollar",
  home: "home",
  default: "tasks"
};
// Define default colors in case we can't fetch them from the database
const DEFAULT_CATEGORY_COLORS = {
  work: "#4285F4",
  personal: "#EA4335",
  health: "#34A853",
  shopping: "#FBBC05",
  bills: "#8F44FF",
  home: "#FF8800",
  default: "#FF87B2"
};

export default function DashboardScreen({ navigation }) {
  const { theme, isDarkMode } = useContext(ThemeContext);

  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingTaskIds, setUpdatingTaskIds] = useState([]);
  const menuAnim = useState(new Animated.Value(-SCREEN_WIDTH * 0.7))[0];
  const [locationPermission, setLocationPermission] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyTaskIds, setNearbyTaskIds] = useState([]);
  const [categoryColors, setCategoryColors] = useState(DEFAULT_CATEGORY_COLORS);

  // Request location permissions on mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Fetch tasks and categories on mount
  useEffect(() => {
    fetchTasks();
    fetchCategories();
  }, []);

  // Check for nearby tasks when location or tasks change
  useEffect(() => {
    if (userLocation && tasks.length > 0) {
      checkNearbyTasks();
    }
  }, [userLocation, tasks]);

  // Fetch categories including colors from Supabase
const fetchCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('category')
      .select('cat_name, color');

    if (error) {
      console.error('Error fetching categories:', error);
      // If there's an error, we'll use the default colors
    } else if (data && data.length > 0) {
      // Transform the data into a format we can use
      const colorsFromDB = {};
      data.forEach(category => {
        // Use cat_name instead of name to match your database schema
        colorsFromDB[category.cat_name] = category.color;
      });
      
      // Make sure we have a 'default' category
      if (!colorsFromDB.default) {
        colorsFromDB.default = DEFAULT_CATEGORY_COLORS.default;
      }
      
      // Update state with colors from database
      setCategoryColors(prevColors => ({
        ...prevColors,  // Keep default colors as fallback
        ...colorsFromDB  // Override with colors from DB
      }));
      
      console.log('Categories fetched:', colorsFromDB);
    }
  } catch (err) {
    console.error('Unexpected error fetching categories:', err);
    // We'll use the default colors if there's an error
  }
};

  // Check for nearby tasks
  const checkNearbyTasks = async () => {
    if (!userLocation || !userLocation.coords) return;
    
    try {
      // Use the checkLocationProximity function to get nearby task IDs
      const nearby = await checkLocationProximity(userLocation, 50); // 50 meters proximity threshold
      setNearbyTaskIds(nearby);
      console.log('Nearby tasks:', nearby);
    } catch (err) {
      console.error('Error checking nearby tasks:', err);
    }
  };

  // Request location permissions
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation(location);
        console.log('Location obtained:', location);
      } else {
        Alert.alert(
          'Location Permission',
          'Location permission is needed to associate tasks with locations. You can enable it in your device settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.error('Error requesting location permission:', err);
      Alert.alert('Error', 'Failed to request location permission.');
    }
  };

  const fetchTasks = async () => {
    try {
      setIsRefreshing(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*');

      if (error) {
        console.error('Error fetching tasks:', error);
        Alert.alert('Error', 'Failed to load tasks. Please try again.');
      } else {
        const formattedTasks = data.map(task => ({
          id: task.id,
          text: task.title,
          completed: task.is_completed,
          image: task.image_url || null,
          category: task.category || 'default',
          location: task.location || null
        }));
        setTasks(formattedTasks);
        
        // After fetching tasks, check which ones are nearby
        if (userLocation) {
          checkNearbyTasks();
        }
      }
    } catch (err) {
      console.error('Unexpected error while fetching tasks:', err);
      Alert.alert('Error', 'Something went wrong while loading tasks.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchTasks();
    fetchCategories(); // Also refresh categories when pulling to refresh
  };

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuAnim, {
      toValue: -SCREEN_WIDTH * 0.7,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setMenuVisible(false);
    });
  };

  const navigateToCreateTask = () => {
    // Pass the current location to the CreateTask screen if available
    navigation.navigate('CreateTask', { userLocation: userLocation });
  };
  
  const navigateToTaskDetail = (taskId) => {
    navigation.navigate('TaskDetail', { taskId, userLocation: userLocation });
  };

  const addTask = async () => {
    if (newTask.trim() === '') return;

    const taskData = { 
      title: newTask, 
      is_completed: false, 
      category: 'default' 
    };

    // Add location data if permission is granted and location is available
    if (locationPermission === 'granted' && userLocation) {
      taskData.location = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude
      };
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select();

    if (error) {
      console.error('Error adding task:', error);
      Alert.alert('Error', 'Failed to add task. Please try again.');
    } else if (data && data.length > 0) {
      const newTaskFromDB = {
        id: data[0].id,
        text: data[0].title,
        completed: data[0].is_completed,
        image: null,
        category: 'default',
        location: data[0].location
      };
      setTasks(prev => [...prev, newTaskFromDB]);
      setNewTask('');
      Keyboard.dismiss();
      
      // If the task has location data, save it to the user_location table
      if (taskData.location) {
        await saveTaskLocation(data[0].id, taskData.location);
      }
    }
  };

  const deleteTask = async (id) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting task:', error);
        Alert.alert('Error', 'Failed to delete task. Please try again.');
      } else {
        setTasks(prev => prev.filter(task => task.id !== id));
        // Also remove from nearby tasks if it was there
        setNearbyTaskIds(prev => prev.filter(taskId => taskId !== id));
      }
    } catch (err) {
      console.error('Unexpected error deleting task:', err);
      Alert.alert('Error', 'Something went wrong while deleting the task.');
    }
  };

  const toggleComplete = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task || updatingTaskIds.includes(id)) return;
    
    // Add this task ID to the updating list
    setUpdatingTaskIds(prev => [...prev, id]);
    
    // Optimistic UI update - update the UI immediately before the server responds
    setTasks(prev => 
      prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_completed: !task.completed })
        .eq('id', id);

      if (error) {
        console.error('Error updating task:', error);
        // Revert the optimistic update if there was an error
        setTasks(prev => 
          prev.map(t => t.id === id ? { ...t, completed: task.completed } : t)
        );
        
        // Show error to user
        Alert.alert('Error', 'Failed to update task status. Please try again.');
      }
    } catch (err) {
      console.error('Unexpected error updating task:', err);
      // Revert the optimistic update
      setTasks(prev => 
        prev.map(t => t.id === id ? { ...t, completed: task.completed } : t)
      );
      
      // Show error to user
      Alert.alert('Error', 'Something went wrong while updating the task.');
    } finally {
      // Remove this task ID from the updating list
      setUpdatingTaskIds(prev => prev.filter(itemId => itemId !== id));
    }
  };

  const startEditing = (id, text) => {
    setEditingTaskId(id);
    setEditingText(text);
  };

  const finishEditing = async () => {
    if (!editingTaskId) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ title: editingText })
        .eq('id', editingTaskId);

      if (error) {
        console.error('Error editing task:', error);
        Alert.alert('Error', 'Failed to update task. Please try again.');
      } else {
        setTasks(prev => 
          prev.map(task => 
            task.id === editingTaskId ? { ...task, text: editingText } : task
          )
        );
      }
    } catch (err) {
      console.error('Unexpected error editing task:', err);
      Alert.alert('Error', 'Something went wrong while updating the task.');
    } finally {
      setEditingTaskId(null);
    }
  };

  const pickImage = async (taskId) => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to add images!');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const { error } = await supabase
          .from('tasks')
          .update({ image_url: imageUri })
          .eq('id', taskId);

        if (error) {
          console.error('Error updating task image:', error);
          Alert.alert('Error', 'Failed to update task image. Please try again.');
        } else {
          setTasks(prev => 
            prev.map(task => 
              task.id === taskId ? { ...task, image: imageUri } : task
            )
          );
        }
      }
    } catch (err) {
      console.error('Unexpected error picking image:', err);
      Alert.alert('Error', 'Something went wrong while selecting the image.');
    }
  };

  const changeTaskCategory = async (taskId, category) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ category })
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task category:', error);
        Alert.alert('Error', 'Failed to update task category. Please try again.');
      } else {
        setTasks(prev => 
          prev.map(task => 
            task.id === taskId ? { ...task, category } : task
          )
        );
      }
    } catch (err) {
      console.error('Unexpected error updating category:', err);
      Alert.alert('Error', 'Something went wrong while updating the category.');
    }
  };

  const addLocationToTask = async (taskId) => {
    if (locationPermission !== 'granted') {
      await requestLocationPermission();
      if (locationPermission !== 'granted') {
        return; // Permission still not granted
      }
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp
      };

      const { error } = await supabase
        .from('tasks')
        .update({ location: locationData })
        .eq('id', taskId);

      if (error) {
        console.error('Error adding location to task:', error);
        Alert.alert('Error', 'Failed to add location to task. Please try again.');
      } else {
        setTasks(prev => 
          prev.map(task => 
            task.id === taskId ? { ...task, location: locationData } : task
          )
        );
        
        // Also save to user_location table for proximity checks
        const saveResult = await saveTaskLocation(taskId, locationData);
        if (saveResult.success) {
          Alert.alert('Success', 'Location added to task');
          // Check if this task is now nearby
          checkNearbyTasks();
        }
      }
    } catch (err) {
      console.error('Error getting or setting location:', err);
      Alert.alert('Error', 'Could not get current location. Please check your settings.');
    }
  };

  const getPendingTaskCount = () => {
    return tasks.filter(task => !task.completed).length;
  };

  const getTasksWithLocation = () => {
    return tasks.filter(task => task.location).length;
  };

  const getNearbyTaskCount = () => {
    return nearbyTaskIds.length;
  };

  const renderTaskThumbnail = (task) => {
    if (task.image) {
      // If the task has an image, display it
      return (
        <Image 
          source={{ uri: task.image }} 
          style={styles.taskImage} 
          accessibilityLabel="Task image"
        />
      );
    } else {
      // If no image, show a category icon with background color
      const iconName = CATEGORY_ICONS[task.category] || CATEGORY_ICONS.default;
      
      // Use color from our dynamically loaded categoryColors state
      const backgroundColor = categoryColors[task.category] || categoryColors.default;
      
      return (
        <TouchableOpacity 
          style={[styles.taskIconContainer, { backgroundColor }]}
          onPress={() => pickImage(task.id)}
          accessibilityLabel={`Add image to task: ${task.text}`}
        >
          <FontAwesome5 name={iconName} size={16} color="white" />
        </TouchableOpacity>
      );
    }
  };

  const renderItem = ({ item }) => {
    const taskStatus = item.completed ? 'completed' : 'not completed';
    const isUpdating = updatingTaskIds.includes(item.id);
    const hasLocation = item.location ? true : false;
    const isNearby = nearbyTaskIds.includes(item.id);

    return (
      <TouchableOpacity 
        style={[
          styles.taskContainer, 
          { backgroundColor: theme.colors.card },
          isNearby && styles.nearbyTaskContainer
        ]}
        accessible={true}
        accessibilityLabel={`Task: ${item.text}, ${taskStatus}${isNearby ? ', nearby' : ''}`}
        accessibilityRole="button"
        onPress={() => navigateToTaskDetail(item.id)}
        disabled={isUpdating}
      >
        <TouchableOpacity 
          style={styles.taskThumbnailContainer}
          onPress={() => pickImage(item.id)}
          accessibilityLabel="Tap to add or change task image"
          disabled={isUpdating}
        >
          {renderTaskThumbnail(item)}
        </TouchableOpacity>

        <View style={styles.taskContentContainer}>
          <TouchableOpacity 
            style={styles.taskCheckbox}
            onPress={(e) => {
              e.stopPropagation(); // Prevent triggering the parent's onPress
              toggleComplete(item.id);
            }}
            disabled={isUpdating}
            accessibilityLabel={item.completed ? "Mark as not completed" : "Mark as completed"}
            accessibilityRole="checkbox"
            accessibilityState={{ 
              checked: item.completed,
              busy: isUpdating
            }}
          >
            {isUpdating ? (
              // Show a different icon or opacity when updating
              <MaterialIcons 
                name={item.completed ? "check-circle" : "radio-button-unchecked"} 
                size={24} 
                color={theme.colors.primary}
                style={{ opacity: 0.5 }}
              />
            ) : item.completed ? (
              <MaterialIcons name="check-circle" size={24} color={theme.colors.primary} />
            ) : (
              <MaterialIcons name="radio-button-unchecked" size={24} color={theme.colors.primary} />
            )}
          </TouchableOpacity>

          {editingTaskId === item.id ? (
            <TextInput
              style={[styles.editInput, { 
                color: theme.colors.text,
                borderBottomColor: theme.colors.primary 
              }]}
              value={editingText}
              onChangeText={setEditingText}
              onBlur={finishEditing}
              onSubmitEditing={finishEditing}
              autoFocus
              accessibilityLabel="Edit task text"
              accessibilityHint="Edit the task and press return to save"
            />
          ) : (
            <View style={styles.taskTextRow}>
              <TouchableOpacity 
                style={styles.taskTextContainer}
                onPress={(e) => {
                  e.stopPropagation(); // Prevent triggering the parent's onPress
                  startEditing(item.id, item.text);
                }}
                disabled={isUpdating}
                accessibilityLabel="Double tap to edit task"
                accessibilityHint="Double tap to edit this task's text"
              >
                <Text 
                  style={[
                    styles.taskText, 
                    { color: theme.colors.text },
                    item.completed && styles.completedTaskText,
                    isUpdating && { opacity: 0.7 }
                  ]}
                >
                  {item.text}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.taskIndicators}>
                {isNearby && (
                  <NearbyTaskIndicator theme={theme} />
                )}
                
                {hasLocation && !isNearby && (
                  <Feather 
                    name="map-pin" 
                    size={14} 
                    color={theme.colors.primary} 
                    style={styles.locationIcon}
                  />
                )}
              </View>
            </View>
          )}
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation(); // Prevent triggering the parent's onPress
                addLocationToTask(item.id);
              }}
              disabled={isUpdating}
              accessibilityLabel={hasLocation ? "Update task location" : "Add location to task"}
            >
              <Feather 
                name="map-pin" 
                size={18} 
                color={theme.colors.primary} 
                style={isUpdating ? { opacity: 0.5 } : null}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation(); 
                deleteTask(item.id);
              }}
              disabled={isUpdating}
              accessibilityLabel="Delete task"
              accessibilityHint="Removes this task from your list"
              accessibilityRole="button"
            >
              <Feather 
                name="trash-2" 
                size={18} 
                color={theme.colors.primary} 
                style={isUpdating ? { opacity: 0.5 } : null}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.primary }]}>Your task list is empty</Text>
      <Text style={[styles.emptySubText, { color: theme.colors.secondaryText }]}>Add a new task to get started!</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]} accessibilityRole="header">
        <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
          <Feather name="menu" size={28} color={theme.colors.primary} />
        </TouchableOpacity>

        <View>
          <Text style={[styles.appTitle, { color: theme.colors.primary }]}>BloomTask</Text>
          <Text style={[styles.appSubtitle, { color: theme.colors.secondaryText }]}>
            Bloom with every completed task
          </Text>
        </View>

        <View style={styles.headerRightContainer}>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={onRefresh}
            disabled={isRefreshing}
            accessibilityLabel="Refresh tasks"
            accessibilityHint="Tap to refresh your task list"
          >
            <Feather 
              name="refresh-cw" 
              size={22} 
              color={theme.colors.primary} 
              style={isRefreshing ? styles.refreshingIcon : null}
            />
          </TouchableOpacity>
          
          <View style={[styles.summaryContainer, { 
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 135, 178, 0.1)' 
          }]}>
            <Text style={[styles.summaryText, { color: theme.colors.primary }]}>
              {getPendingTaskCount()} tasks pending
            </Text>
          </View>
        </View>
      </View>

      {/* Location Status */}
      <View 
        style={[
          styles.locationStatusContainer, 
          { 
            backgroundColor: locationPermission === 'granted' 
              ? 'rgba(52, 168, 83, 0.1)' 
              : 'rgba(234, 67, 53, 0.1)' 
          }
        ]}
      >
        <Feather 
          name={locationPermission === 'granted' ? "check" : "alert-circle"} 
          size={18} 
          color={locationPermission === 'granted' ? '#34A853' : '#EA4335'} 
          style={{ marginRight: 8 }}
        />
        <Text style={[
          styles.locationStatusText, 
          { 
            color: locationPermission === 'granted' ? '#34A853' : '#EA4335'
          }
        ]}>
          {locationPermission === 'granted' 
            ? `Location enabled (${getTasksWithLocation()} tasks, ${getNearbyTaskCount()} nearby)` 
            : 'Location permission not granted'}
        </Text>
        {locationPermission !== 'granted' && (
          <TouchableOpacity 
            style={styles.locationRequestButton} 
            onPress={requestLocationPermission}
          >
            <Text style={{ color: '#EA4335' }}>Enable</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Task List */}
      <FlatList
        data={tasks}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />

      {/* Add New Task */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.inputContainer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}
      >
        <TouchableOpacity 
          style={[styles.input, { backgroundColor: theme.colors.inputBackground }]}
          onPress={navigateToCreateTask}
        >
          <Text style={{ color: theme.colors.secondaryText, fontSize: 16 }}>
            Add a new task...
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={navigateToCreateTask}
          accessibilityLabel="Add task"
        >
          <Feather name="plus" size={24} color="white" />
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* Side Menu */}
      {menuVisible && (
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.overlay}>
            <Animated.View style={[styles.sideMenu, { backgroundColor: theme.colors.card, left: menuAnim }]}>
              <Text style={[styles.menuTitle, { color: theme.colors.primary }]}>Filters</Text>
              <TouchableOpacity style={styles.menuItem}>
                <Text style={{ color: theme.colors.text }}>By Due Date</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem}>
                <Text style={{ color: theme.colors.text }}>By Location</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem}>
                <Text style={{ color: theme.colors.text }}>Priority</Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <Text style={[styles.menuTitle, { color: theme.colors.primary }]}>Categories</Text>
              {Object.keys(categoryColors).map(category => (
                <TouchableOpacity 
                  key={category} 
                  style={styles.categoryItem}
                  onPress={() => {
                  }}
                >
                  <View style={[styles.categoryColor, { backgroundColor: categoryColors[category] }]} />
                  <Text style={{ color: theme.colors.text, textTransform: 'capitalize' }}>{category}</Text>
                </TouchableOpacity>
              ))}
              
              <View style={styles.menuDivider} />
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      )}
    </SafeAreaView>
  );
}

// ----- Styles -----
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  appSubtitle: {
    fontSize: 12,
    marginTop: -2,
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
  },
  refreshingIcon: {
    opacity: 0.6,
  },
  locationStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
  },
  locationStatusText: {
    fontSize: 12,
    flex: 1,
  },
  locationRequestButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EA4335',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  taskContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
    elevation: 1,
  },
  taskThumbnailContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  taskImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  taskIconContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContentContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  taskCheckbox: {
    marginRight: 12,
    justifyContent: 'center',
  },
  taskTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  taskTextRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskText: {
    fontSize: 16,
    flexShrink: 1,
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  locationIcon: {
    marginLeft: 6,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginLeft: 'auto',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    padding: 4,
    borderBottomWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    justifyContent: 'center',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '70%',
    paddingTop: 50,
    paddingHorizontal: 16,
    zIndex: 11,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  menuItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  categoryColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  
  nearbyIndicatorContainer: {
    marginTop: 4,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskInfoContainer: {
    flex: 1,
  },
  taskMetadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metadataText: {
    fontSize: 11,
    color: '#757575',
    marginRight: 8,
  },
  distanceText: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '500',
  },
  indicatorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  }
});