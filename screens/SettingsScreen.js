// screens/SettingsScreen.js
import React, { useState, useContext, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Image,
  Modal,
  Dimensions,
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { ThemeContext } from '../functions/ThemeContext';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from '../lib/superbase'; 
import { useNavigation } from '@react-navigation/native';

// Get device dimensions for responsive layout
const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

// Configure notifications default behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function SettingsScreen() {
  const { 
    isDarkMode, 
    setIsDarkMode, 
    themeColor, 
    setThemeColor, 
    themeColors,
    theme 
  } = useContext(ThemeContext);
  
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [profilePicture, setProfilePicture] = useState(null);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    taskReminders: true,
    dailySummary: true,
    weeklyDigest: false,
    inactivityReminder: true,
  });
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [pushToken, setPushToken] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [previousNotificationState, setPreviousNotificationState] = useState(true);

  // Load notification settings on mount
  useEffect(() => {
    loadNotificationSettings();
    registerForPushNotifications();
  }, []);

const [userName, setUserName] = useState('Your Name');
const [userEmail, setUserEmail] = useState('example@email.com');

useEffect(() => {
  const fetchUserData = async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        console.log('No user session found');
        return;
      }

      const { user } = session;
      
      // Set email from session immediately
      setUserEmail(user.email || 'example@email.com');

      // Try to fetch the profile
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (error) {
        console.log('Profile not found, creating new profile');
        
        // Create default username from email
        const defaultUsername = user.email.split('@')[0];
        setUserName(defaultUsername);
        
        // Insert new profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              username: defaultUsername,
              updated_at: new Date()
            }
          ]);

        if (insertError) {
          console.error('Error creating profile:', insertError.message);
          setUserName('Your Name');
        }
      } else {
        // Profile exists, use the username from it
        setUserName(data.username || 'Your Name');
      }
    } catch (err) {
      console.error('Error fetching user data:', err.message);
      setUserName('Your Name');
      setUserEmail('example@email.com');
    }
  };
  fetchUserData();
}, []);

  // Save notification settings to AsyncStorage
  const saveNotificationSettings = async (settings) => {
    try {
      await AsyncStorage.setItem('@notification_settings', JSON.stringify(settings));
    } catch (error) {
      console.log('Error saving notification settings:', error);
    }
  };

  // Load notification settings from AsyncStorage
  const loadNotificationSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('@notification_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setNotificationSettings(parsedSettings);
        // Update main notifications toggle based on if any notification type is enabled
        const notificationsEnabled = Object.values(parsedSettings).some(value => value === true);
        setNotifications(notificationsEnabled);
        setPreviousNotificationState(notificationsEnabled);
      }
    } catch (error) {
      console.log('Error loading notification settings:', error);
    }
  };

  // Register for push notifications
  const registerForPushNotifications = async () => {
    try {
      // Check if the platform is web
      if (Platform.OS === 'web') {
        setPermissionStatus('web');
        console.log('Notifications are not supported on web platforms');
        return;
      }
      
      // For Android/iOS, check if we're running on a physical device
      // Safely check for Constants.isDevice with fallback
      const isPhysicalDevice = Platform.OS === 'ios' || Platform.OS === 'android';
      
      if (!isPhysicalDevice) {
        setPermissionStatus('simulator');
        console.log('Running in simulator/emulator environment');
        return;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      setPermissionStatus(existingStatus);
      
      let finalStatus = existingStatus;
      
      // If no existing permission, ask user
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        setPermissionStatus(status);
      }
      
      // If still not granted, we can't proceed
      if (finalStatus !== 'granted') {
        return;
      }
      
      try {
        // Try to get the token, but handle potential failures gracefully
        const tokenResponse = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId || "your-expo-project-id-here"
        });
        
        if (tokenResponse?.data) {
          setPushToken(tokenResponse.data);
          console.log('Push token:', tokenResponse.data);
        }
      } catch (tokenError) {
        console.log('Error getting push token:', tokenError);
      }
      
      // Set up notification handling if permissions are granted
      if (finalStatus === 'granted') {
        setupNotificationHandlers();
      }
    } catch (error) {
      console.log('Error in notification registration:', error);
    }
  };

  // Setup notification handling for received and responded notifications
  const setupNotificationHandlers = () => {
    // Handle incoming notifications
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      // You can handle incoming notifications here
      console.log('Notification received:', notification);
    });

    // Handle notification responses (when user taps notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      // You can handle notification responses here (e.g., navigate to a specific screen)
      console.log('Notification response:', response);
    });

    // Clean up the listeners on unmount
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  };

  // Schedule a welcome notification
  const scheduleWelcomeNotification = async () => {
    if (permissionStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive task reminders.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Welcome to BloomTask!",
          body: "Notifications are now enabled. You'll never miss an important task again!",
          data: { screen: 'Tasks' },
        },
        trigger: { seconds: 2 },
      });
      console.log('Welcome notification scheduled');
    } catch (error) {
      console.log('Error scheduling welcome notification:', error);
    }
  };

  // Schedule a sample notification
  const scheduleNotification = async () => {
    if (permissionStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive task reminders.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "BloomTask Reminder",
          body: "Sample notification - This is how task reminders will look!",
          data: { screen: 'Tasks' },
        },
        trigger: { seconds: 5 },
      });

      Alert.alert(
        'Notification Scheduled',
        'You will receive a sample notification in 5 seconds!',
        [{ text: 'OK' }]
      );
      console.log('Sample notification scheduled');
    } catch (error) {
      console.log('Error scheduling notification:', error);
    }
  };

  // Toggle all notifications
  const toggleNotifications = async () => {
    const newNotificationsState = !notifications;
    setPreviousNotificationState(notifications);
    setNotifications(newNotificationsState);
    
    // If turning off, disable all notification types
    if (!newNotificationsState) {
      const updatedSettings = {
        taskReminders: false,
        dailySummary: false,
        weeklyDigest: false,
      };
      setNotificationSettings(updatedSettings);
      saveNotificationSettings(updatedSettings);
    } 
    // If turning on, and all were off, enable defaults
    else if (!Object.values(notificationSettings).some(value => value === true)) {
      const updatedSettings = {
        taskReminders: true,
        dailySummary: true,
        weeklyDigest: false,
      };
      setNotificationSettings(updatedSettings);
      saveNotificationSettings(updatedSettings);
    }

    // If turning on and permissions aren't granted, prompt for permissions
    if (newNotificationsState && permissionStatus !== 'granted') {
      await registerForPushNotifications();
    }
    
    // Send a welcome notification when user enables notifications
    if (newNotificationsState && !previousNotificationState && permissionStatus === 'granted') {
      scheduleWelcomeNotification();
    }
  };

  // Toggle individual notification types
  const toggleNotificationType = (type) => {
    const updatedSettings = { 
      ...notificationSettings,
      [type]: !notificationSettings[type] 
    };
    
    setNotificationSettings(updatedSettings);
    saveNotificationSettings(updatedSettings);
    
    // Update main notifications toggle based on if any notification type is enabled
    setNotifications(Object.values(updatedSettings).some(value => value === true));
  };

  const toggleSoundEffects = () => setSoundEffects(previousState => !previousState);
  const toggleDarkMode = () => setIsDarkMode(previousState => !previousState);

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Log Out", 
          style: "destructive",
          onPress: async () => {
            try {
              // Sign out from Supabase
              const { error } = await supabase.auth.signOut();
              
              if (error) {
                console.error('Error signing out:', error.message);
                // Optionally show an error message to the user
              } else {
                console.log("User successfully logged out");
              }
            } catch (error) {
              console.error('Unexpected error during logout:', error);
            }
          }
        }
      ]
    );
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const handleSupportPress = () => {
    Alert.alert(
      "Support",
      "Contact us at support@bloomtask.com",
      [{ text: "OK" }]
    );
  };

  const handleAboutPress = () => {
    Alert.alert(
      "About BloomTask",
      "BloomTask v1.0.0\nA beautiful way to organize your tasks.",
      [{ text: "OK" }]
    );
  };

  const openColorPicker = () => {
    setColorPickerVisible(true);
  };

  const openNotificationSettings = () => {
    setNotificationModalVisible(true);
  };

  const selectThemeColor = (color) => {
    setThemeColor(color);
    setColorPickerVisible(false);
  };

  const getColorName = (colorKey) => {
    const colorNames = {
      pink: 'Pink',
      purple: 'Purple',
      blue: 'Blue',
      green: 'Green',
      orange: 'Orange'
    };
    return colorNames[colorKey] || colorKey;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>
          Settings
        </Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}>
        
        <TouchableOpacity 
          style={[styles.profileContainer, { backgroundColor: theme.colors.card }]} 
          onPress={handleProfilePress}
          activeOpacity={0.7}>
          <View style={styles.profileImageContainer}>
            {profilePicture ? (
              <Image 
                source={{ uri: profilePicture }} 
                style={styles.profileImage} 
              />
            ) : (
              <View 
                style={[styles.profilePlaceholder, { backgroundColor: isDarkMode ? '#444' : '#FFF5F7' }]}>
                <Feather name="user" size={isSmallDevice ? 30 : 40} color={theme.colors.primary} />
              </View>
            )}
          </View>
          <View style={styles.profileTextContainer}>
            <Text style={[styles.profileName, { color: theme.colors.text }]}>
              {userName}
            </Text>
            <Text style={[styles.profileEmail, { color: theme.colors.secondaryText }]}>
              {userEmail}
            </Text>
          </View>
          <Feather name="chevron-right" size={24} color={theme.colors.secondaryText} />
        </TouchableOpacity>
        
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Theme
          </Text>
        </View>
        
        <View style={[styles.settingsSection, { 
          backgroundColor: theme.colors.card,
          shadowColor: isDarkMode ? "#000" : "#FFE0EB",
        }]}>
          <View style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Dark Mode</Text>
              <Text style={[styles.settingDescription, { color: theme.colors.secondaryText }]}>
                Switch to dark theme
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#E0E0E0", true: theme.colors.primary + "80" }}
              thumbColor={isDarkMode ? theme.colors.primary : "#f4f3f4"}
              onValueChange={toggleDarkMode}
              value={isDarkMode}
            />
          </View>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={openColorPicker}
            activeOpacity={0.7}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>App Color</Text>
              <Text style={[styles.settingDescription, { color: theme.colors.secondaryText }]}>
                {getColorName(themeColor)}
              </Text>
            </View>
            <View style={[styles.colorSample, { backgroundColor: themeColors[themeColor] }]} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Preferences
          </Text>
        </View>
        
        <View style={[styles.settingsSection, { 
          backgroundColor: theme.colors.card,
          shadowColor: isDarkMode ? "#000" : "#FFE0EB"
        }]}>
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}
            onPress={() => permissionStatus === 'granted' ? openNotificationSettings() : registerForPushNotifications()}
            activeOpacity={0.7}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Notifications</Text>
              <Text style={[styles.settingDescription, { color: theme.colors.secondaryText }]}>
                {permissionStatus === 'granted' 
                  ? 'Customize your notifications' 
                  : 'Enable push notifications'}
              </Text>
            </View>
            <View style={styles.settingRightContainer}>
              <Switch
                trackColor={{ false: "#E0E0E0", true: theme.colors.primary + "80" }}
                thumbColor={notifications ? theme.colors.primary : "#f4f3f4"}
                onValueChange={toggleNotifications}
                value={notifications}
              />
              {permissionStatus === 'granted' && notifications && (
                <TouchableOpacity 
                  style={[styles.customizeButton, { backgroundColor: theme.colors.primary + '20' }]}
                  onPress={openNotificationSettings}>
                  <Text style={[styles.customizeButtonText, { color: theme.colors.primary }]}>
                    Customize
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Sound Effects</Text>
              <Text style={[styles.settingDescription, { color: theme.colors.secondaryText }]}>
                Enable sound effects
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#E0E0E0", true: theme.colors.primary + "80" }}
              thumbColor={soundEffects ? theme.colors.primary : "#f4f3f4"}
              onValueChange={toggleSoundEffects}
              value={soundEffects}
            />
          </View>
        </View>
        
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            Help & Support
          </Text>
        </View>
        
        <View style={[styles.settingsSection, { 
          backgroundColor: theme.colors.card,
          shadowColor: isDarkMode ? "#000" : "#FFE0EB" 
        }]}>
          <TouchableOpacity 
            style={[styles.linkItem, { borderBottomColor: theme.colors.border }]} 
            onPress={handleSupportPress}
            activeOpacity={0.7}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Contact Support</Text>
              <Text style={[styles.settingDescription, { color: theme.colors.secondaryText }]}>
                Get help with BloomTask
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color={theme.colors.secondaryText} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.linkItem} 
            onPress={handleAboutPress}
            activeOpacity={0.7}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>About BloomTask</Text>
              <Text style={[styles.settingDescription, { color: theme.colors.secondaryText }]}>
                Version and legal information
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color={theme.colors.secondaryText} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.logoutButton, { 
            backgroundColor: theme.colors.card,
            shadowColor: isDarkMode ? "#000" : "#FFE0EB"
          }]}
          onPress={handleLogout}
          activeOpacity={0.7}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Color Theme Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={colorPickerVisible}
        onRequestClose={() => setColorPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.colorPickerContainer, { 
            backgroundColor: theme.colors.card,
            shadowColor: isDarkMode ? "#000" : "#FFE0EB"
          }]}>
            <View style={styles.colorPickerHeader}>
              <Text style={[styles.colorPickerTitle, { color: theme.colors.text }]}>
                Choose Theme Color
              </Text>
              <TouchableOpacity 
                onPress={() => setColorPickerVisible(false)} 
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={24} color={theme.colors.secondaryText} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.colorOptions}>
              {Object.keys(themeColors).map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: themeColors[color] },
                    themeColor === color && styles.selectedColorOption
                  ]}
                  onPress={() => selectThemeColor(color)}
                  accessibilityLabel={`${getColorName(color)} color${themeColor === color ? ", currently selected" : ""}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: themeColor === color }}
                >
                  {themeColor === color && (
                    <Feather name="check" size={20} color="white" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={notificationModalVisible}
        onRequestClose={() => setNotificationModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.notificationModalContainer, { 
            backgroundColor: theme.colors.card,
            shadowColor: isDarkMode ? "#000" : "#FFE0EB"
          }]}>
            <View style={styles.colorPickerHeader}>
              <Text style={[styles.colorPickerTitle, { color: theme.colors.text }]}>
                Notification Settings
              </Text>
              <TouchableOpacity 
                onPress={() => setNotificationModalVisible(false)} 
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={24} color={theme.colors.secondaryText} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.notificationOptionsContainer}>
              <View style={[styles.notificationOption, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Task Reminders</Text>
                  <Text style={[styles.settingDescription, { color: theme.colors.secondaryText }]}>
                    Notify when tasks are due
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: "#E0E0E0", true: theme.colors.primary + "80" }}
                  thumbColor={notificationSettings.taskReminders ? theme.colors.primary : "#f4f3f4"}
                  onValueChange={() => toggleNotificationType('taskReminders')}
                  value={notificationSettings.taskReminders}
                />
              </View>
              
              <View style={[styles.notificationOption, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Daily Summary</Text>
                  <Text style={[styles.settingDescription, { color: theme.colors.secondaryText }]}>
                    Receive daily task summary
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: "#E0E0E0", true: theme.colors.primary + "80" }}
                  thumbColor={notificationSettings.dailySummary ? theme.colors.primary : "#f4f3f4"}
                  onValueChange={() => toggleNotificationType('dailySummary')}
                  value={notificationSettings.dailySummary}
                />
              </View>
              
              <View style={styles.notificationOption}>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Weekly Digest</Text>
                  <Text style={[styles.settingDescription, { color: theme.colors.secondaryText }]}>
                    Receive weekly productivity report
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: "#E0E0E0", true: theme.colors.primary + "80" }}
                  thumbColor={notificationSettings.weeklyDigest ? theme.colors.primary : "#f4f3f4"}
                  onValueChange={() => toggleNotificationType('weeklyDigest')}
                  value={notificationSettings.weeklyDigest}
                />
              </View>
            </View>
            <View style={styles.notificationOption}>
  <View style={styles.settingTextContainer}>
    <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Inactivity Reminder</Text>
    <Text style={[styles.settingDescription, { color: theme.colors.secondaryText }]}>
      Notify when you haven't opened the app for a day
    </Text>
  </View>
  <Switch
    trackColor={{ false: "#E0E0E0", true: theme.colors.primary + "80" }}
    thumbColor={notificationSettings.inactivityReminder ? theme.colors.primary : "#f4f3f4"}
    onValueChange={() => toggleNotificationType('inactivityReminder')}
    value={notificationSettings.inactivityReminder}
  />
</View>
            <TouchableOpacity 
              style={[styles.testNotificationButton, { backgroundColor: theme.colors.primary }]}
              onPress={scheduleNotification}>
              <Text style={styles.testNotificationText}>Test Notification</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  header: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 30,
  },
  profileContainer: {
    flexDirection: 'row',
    padding: 15,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  profileImageContainer: {
    width: isSmallDevice ? 45 : 50,
    height: isSmallDevice ? 45 : 50,
    borderRadius: isSmallDevice ? 22.5 : 25,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: isSmallDevice ? 22.5 : 25,
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: isSmallDevice ? 22.5 : 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileTextContainer: {
    flex: 1,
  },
  profileName: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: isSmallDevice ? 13 : 14,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '600',
  },
  settingsSection: {
    marginHorizontal: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  settingTitle: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: isSmallDevice ? 13 : 14,
  },
  settingRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customizeButton: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  customizeButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  colorSample: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  linkItem: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoutButton: {
    paddingVertical: 15,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#f44336',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  colorPickerContainer: {
    width: width * 0.85,
    maxWidth: 340,
    padding: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  colorPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  colorPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    margin: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: 'white',
  },
  notificationModalContainer: {
    width: width * 0.85,
    maxWidth: 340,
    padding: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  notificationOptionsContainer: {
    marginTop: 10,
  },
  notificationOption: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  testNotificationButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  testNotificationText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
});