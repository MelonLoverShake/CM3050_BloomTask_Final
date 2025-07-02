import React, { useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemeContext } from '../functions/ThemeContext';

const TemplateDetailScreen = ({ route, navigation }) => {
  const { template } = route.params;
  const { theme, isDarkMode } = useContext(ThemeContext);

  const handleUseTemplate = () => {
    // Navigate to CreateTask with template data
    navigation.navigate('CreateTask', { template });
  };

  const renderTaskItem = ({ item, index }) => (
    <View style={[
      styles.taskItem,
      {
        backgroundColor: isDarkMode ? '#2C2C2C' : '#FFFFFF',
        borderColor: isDarkMode ? '#444' : '#E5E5E5',
      }
    ]}>
      <View style={[styles.taskNumber, { backgroundColor: template.color }]}>
        <Text style={styles.taskNumberText}>{index + 1}</Text>
      </View>
      <Text style={[
        styles.taskText,
        { color: isDarkMode ? '#FFFFFF' : '#000000' }
      ]}>
        {item}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: isDarkMode ? '#1A1A1A' : '#F8F9FA' }
    ]}>
      <View style={styles.detailHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather 
            name="arrow-left" 
            size={24} 
            color={isDarkMode ? '#FFFFFF' : '#000000'} 
          />
        </TouchableOpacity>
        
        <View style={styles.templateDetailInfo}>
          <View style={[styles.colorIndicator, { backgroundColor: template.color }]} />
          <View>
            <Text style={[
              styles.detailTitle,
              { color: isDarkMode ? '#FFFFFF' : '#000000' }
            ]}>
              {template.title}
            </Text>
            <Text style={[
              styles.detailDescription,
              { color: isDarkMode ? '#CCCCCC' : '#666666' }
            ]}>
              {template.description}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={template.tasks}
        renderItem={renderTaskItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.tasksList}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.useTemplateButton,
            { backgroundColor: template.color }
          ]}
          onPress={handleUseTemplate}
        >
          <Feather name="plus-circle" size={20} color="#FFFFFF" />
          <Text style={styles.useTemplateText}>Use This Template</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.editButton,
            {
              backgroundColor: isDarkMode ? '#2C2C2C' : '#FFFFFF',
              borderColor: isDarkMode ? '#444' : '#E5E5E5',
            }
          ]}
          onPress={() => navigation.navigate('EditTemplate', { template })}
        >
          <Feather 
            name="edit-2" 
            size={20} 
            color={isDarkMode ? '#FFFFFF' : '#000000'} 
          />
          <Text style={[
            styles.editButtonText,
            { color: isDarkMode ? '#FFFFFF' : '#000000' }
          ]}>
            Edit
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    marginRight: 15,
  },
  templateDetailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailDescription: {
    fontSize: 14,
  },
  tasksList: {
    padding: 20,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  taskNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskText: {
    fontSize: 16,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  useTemplateButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  useTemplateText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TemplateDetailScreen;