import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

/**
 * A component to indicate that a task is near the user's current location
 * @param {Object} props - Component properties
 * @param {Object} props.theme - The current theme object containing colors
 * @returns {React.Component} The nearby task indicator component
 */
const NearbyTaskIndicator = ({ theme }) => {
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary + '20' }]}>
      <Feather name="map-pin" size={12} color={theme.colors.primary} />
      <Text style={[styles.text, { color: theme.colors.primary }]}>Nearby</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
});

export default NearbyTaskIndicator;