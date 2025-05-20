import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { supabase } from './lib/superbase';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';
import Auth from './screens/Auth';
import { ThemeContext, themeColors, getTheme } from './functions/ThemeContext';
import ProfileScreen from './screens/Profile';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import SavedLocationsScreen from './screens/SaveLocationScreen';
import AddLocationScreen from './screens/AddLocationScreen';
import ProfileQRCodeScreen from './screens/ProfileQRCodeScreen';
import CreateTask from './screens/CreateTaskScreen';
import TaskDetailScreen from './screens/TaskDetailScreen';
import WeeklyDigestScreen from './screens/WeeklyDigestScreen';
import NetworkChecker from './functions//NetworkChecker';
import LoadingScreen from './screens/ChangePasswordScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs({ isDarkMode, themeColor }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Tasks') {
            iconName = 'check-square';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          } else if (route.name === 'Digest') {
            iconName = 'bar-chart-2';
          }
          return <Feather name={iconName} size={size} color={color} accessibilityLabel={route.name} />;
        },
        tabBarActiveTintColor: themeColors[themeColor],
        tabBarInactiveTintColor: isDarkMode ? '#999' : '#B5B5B5',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#333' : 'white',
          borderTopColor: isDarkMode ? '#444' : '#FFE0EB',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Tasks" 
        component={DashboardScreen} 
        options={{ tabBarAccessibilityLabel: "View your tasks" }}
      />
      <Tab.Screen 
        name="Digest" 
        component={WeeklyDigestScreen} 
        options={{ tabBarAccessibilityLabel: "View your weekly task digest" }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ tabBarAccessibilityLabel: "View and modify app settings" }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeColor, setThemeColor] = useState('pink');

  const theme = getTheme(isDarkMode, themeColor);

  const themeContextValue = {
    isDarkMode,
    setIsDarkMode,
    themeColor,
    setThemeColor,
    themeColors,
    theme,
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <LoadingScreen />; 
  }

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <NetworkChecker /> 
      <NavigationContainer theme={theme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? (
            <Stack.Screen name="Auth" component={Auth} />
          ) : (
            <>
              <Stack.Screen name="Main">
                {() => <MainTabs isDarkMode={isDarkMode} themeColor={themeColor} />}
              </Stack.Screen>
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
              <Stack.Screen name="SavedLocations" component={SavedLocationsScreen} />
              <Stack.Screen name="AddLocation" component={AddLocationScreen} />
              <Stack.Screen name="ProfileQRCode" component={ProfileQRCodeScreen} />
              <Stack.Screen name="CreateTask" component={CreateTask} />
              <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeContext.Provider>
  );
}