// Mock Expo Vector Icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  
  const mockIcon = (props) => React.createElement(Text, props, props.name || 'Icon');
  
  return {
    AntDesign: mockIcon,
    Entypo: mockIcon,
    EvilIcons: mockIcon,
    Feather: mockIcon,
    FontAwesome: mockIcon,
    FontAwesome5: mockIcon,
    Fontisto: mockIcon,
    Foundation: mockIcon,
    Ionicons: mockIcon,
    MaterialCommunityIcons: mockIcon,
    MaterialIcons: mockIcon,
    Octicons: mockIcon,
    SimpleLineIcons: mockIcon,
    Zocial: mockIcon,
  };
});

// Mock Expo Font
jest.mock('expo-font', () => ({
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(() => Promise.resolve()),
  processFontFamily: jest.fn((font) => font),
}));

// Mock Expo Constants
jest.mock('expo-constants', () => ({
  default: {
    statusBarHeight: 20,
    deviceName: 'Test Device',
    platform: {
      ios: {
        platform: 'ios',
      },
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import App from './App';
import { ThemeContext } from './functions/ThemeContext';

// Mock supabase auth methods
jest.mock('./lib/superbase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

const mockThemeValue = {
  theme: {
    colors: {
      primary: '#000',
      background: '#fff',
      text: '#333',
    },
  },
  setTheme: jest.fn(),
  colorScheme: 'light',
};

const renderWithTheme = (ui) =>
  render(<ThemeContext.Provider value={mockThemeValue}>{ui}</ThemeContext.Provider>);

describe('App Component', () => {
  it('renders without crashing', async () => {
    const component = renderWithTheme(<App />);
    await waitFor(() => {
      expect(component).toBeTruthy();
    });
  });

  it('calls supabase auth methods', () => {
    const { supabase } = require('./lib/superbase');
    renderWithTheme(<App />);
    expect(supabase.auth.getSession).toHaveBeenCalled();
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
  });
});
