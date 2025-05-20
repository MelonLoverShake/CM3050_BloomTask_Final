// ThemeContext.js
import { createContext } from 'react';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';

// Define custom themes
const customLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#FF87B2',      
    background: '#FFF5F7',
    card: 'white',
    text: '#333333',
    border: '#FFE0EB',
    notification: '#FF87B2',
    secondaryText: '#B5B5B5',
    inputBackground: '#FFF5F7',
  },
};

const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#FF87B2',     
    background: '#222',
    card: '#333',
    text: '#F5F5F5',
    border: '#444',
    notification: '#FF87B2',
    secondaryText: '#999',
    inputBackground: '#333',
  },
};

// Available theme colors
export const themeColors = {
  pink: '#FF87B2',   // Default
  purple: '#A56BEE',
  blue: '#5FB5EB',
  green: '#68D391',
  orange: '#F6AD55'
};

// Create theme context to be used across the app
export const ThemeContext = createContext({
  isDarkMode: false,
  setIsDarkMode: () => {},
  themeColor: 'pink',
  setThemeColor: () => {},
  themeColors,
  theme: customLightTheme,
});

// Export the functions to get themes based on current settings
export const getTheme = (isDarkMode, themeColor) => {
  const lightTheme = {
    ...customLightTheme,
    colors: {
      ...customLightTheme.colors,
      primary: themeColors[themeColor],
      notification: themeColors[themeColor],
    }
  };
  
  const darkTheme = {
    ...customDarkTheme,
    colors: {
      ...customDarkTheme.colors,
      primary: themeColors[themeColor],
      notification: themeColors[themeColor],
    }
  };
  
  return isDarkMode ? darkTheme : lightTheme;
};