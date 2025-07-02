import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemeContext } from '../functions/ThemeContext';

const CreateTemplateScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useContext(ThemeContext);

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: isDarkMode ? '#1A1A1A' : '#F8F9FA' }
    ]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather 
            name="x" 
            size={24} 
            color={isDarkMode ? '#FFFFFF' : '#000000'} 
          />
        </TouchableOpacity>
        <Text style={[
          styles.headerTitle,
          { color: isDarkMode ? '#FFFFFF' : '#000000' }
        ]}>
          Create Template
        </Text>
        <TouchableOpacity style={styles.saveButton}>
          <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formContainer}>
        <Text style={[
          styles.comingSoonText,
          { color: isDarkMode ? '#CCCCCC' : '#666666' }
        ]}>
          Template creation form coming soon...
        </Text>
        <Text style={[
          styles.comingSoonSubtext,
          { color: isDarkMode ? '#999999' : '#999999' }
        ]}>
          This will include fields for template name, description, category, and task list.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  backButton: {
    marginRight: 15,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  comingSoonText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 12,
  },
  comingSoonSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CreateTemplateScreen;