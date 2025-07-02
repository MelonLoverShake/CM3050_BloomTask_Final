// TemplateListScreen.js
import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemeContext } from '../functions/ThemeContext';
import { supabase } from '../lib/superbase';

// Category colors mapping
const CATEGORY_COLORS = {
  bills: '#FF6B6B',
  shopping: '#4ECDC4',
  personal: '#45B7D1',
  home: '#96CEB4',
  work: '#FFEAA7',
  health: '#DDA0DD',
};

const TemplateListScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useContext(ThemeContext);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('template_name', { ascending: true });

      if (error) {
        console.error('Error fetching templates:', error);
        Alert.alert('Error', 'Failed to load templates');
        return;
      }

      setTemplates(data || []);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to load templates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTemplates();
  };

  const renderTemplateItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.templateCard,
        {
          backgroundColor: isDarkMode ? '#2C2C2C' : '#FFFFFF',
          borderColor: isDarkMode ? '#444' : '#E5E5E5',
        }
      ]}
      onPress={() => navigation.navigate('TemplateDetail', { template: item })}
    >
      <View style={styles.templateHeader}>
        <View style={[
          styles.colorIndicator, 
          { backgroundColor: CATEGORY_COLORS[item.category] || '#999' }
        ]} />
        <View style={styles.templateInfo}>
          <Text style={[
            styles.templateTitle,
            { color: isDarkMode ? '#FFFFFF' : '#000000' }
          ]}>
            {item.template_name}
          </Text>
          <Text style={[
            styles.templateDescription,
            { color: isDarkMode ? '#CCCCCC' : '#666666' }
          ]}>
            {item.template_description || 'No description'}
          </Text>
        </View>
        <Feather 
          name="chevron-right" 
          size={20} 
          color={isDarkMode ? '#CCCCCC' : '#666666'} 
        />
      </View>
      
      <View style={styles.templateFooter}>
        <View style={styles.categoryContainer}>
          <Text style={[
            styles.categoryText,
            { color: CATEGORY_COLORS[item.category] || '#999' }
          ]}>
            {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
          </Text>
        </View>
        <Text style={[
          styles.estimatedTime,
          { color: isDarkMode ? '#CCCCCC' : '#666666' }
        ]}>
          {item.estimated_duration_minutes ? `${item.estimated_duration_minutes} min` : 'No time set'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[
        styles.container,
        styles.centered,
        { backgroundColor: isDarkMode ? '#1A1A1A' : '#F8F9FA' }
      ]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[
          styles.loadingText,
          { color: isDarkMode ? '#FFFFFF' : '#000000' }
        ]}>
          Loading templates...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: isDarkMode ? '#1A1A1A' : '#F8F9FA' }
    ]}>
      <View style={styles.header}>
        <Text style={[
          styles.headerTitle,
          { color: isDarkMode ? '#FFFFFF' : '#000000' }
        ]}>
          Task Templates
        </Text>
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: theme.colors.primary }
          ]}
          onPress={() => navigation.navigate('CreateTemplate')}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={templates}
        renderItem={renderTemplateItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather 
              name="clipboard" 
              size={48} 
              color={isDarkMode ? '#666' : '#CCC'} 
            />
            <Text style={[
              styles.emptyText,
              { color: isDarkMode ? '#CCCCCC' : '#666666' }
            ]}>
              No templates found
            </Text>
            <Text style={[
              styles.emptySubtext,
              { color: isDarkMode ? '#999999' : '#999999' }
            ]}>
              Create your first template to get started
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

// TemplateDetailScreen.js
const TemplateDetailScreen = ({ route, navigation }) => {
  const { template } = route.params;
  const { theme, isDarkMode } = useContext(ThemeContext);

  const handleUseTemplate = () => {
    // Create a task object from template data
    const taskFromTemplate = {
      title: template.title,
      description: template.description,
      location_label: template.location_label,
      location_id: template.location_id,
      is_completed: template.default_is_completed || false,
      due_status: template.default_due_status || false,
      photo_url: template.default_photo_url,
    };

    // Calculate due date if default_due_offset_days is set
    if (template.default_due_offset_days && template.default_due_offset_days > 0) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + template.default_due_offset_days);
      taskFromTemplate.due_date = dueDate.toISOString().split('T')[0];
    }

    // Navigate to CreateTask with template data
    navigation.navigate('CreateTask', { 
      template: taskFromTemplate,
      isFromTemplate: true 
    });
  };

  const handleDeleteTemplate = async () => {
    Alert.alert(
      'Delete Template',
      'Are you sure you want to delete this template?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('task_templates')
                .update({ is_active: false })
                .eq('id', template.id);

              if (error) {
                Alert.alert('Error', 'Failed to delete template');
                return;
              }

              Alert.alert('Success', 'Template deleted successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting template:', error);
              Alert.alert('Error', 'Failed to delete template');
            }
          },
        },
      ]
    );
  };

  const templateColor = CATEGORY_COLORS[template.category] || '#999';

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
          <View style={[styles.colorIndicator, { backgroundColor: templateColor }]} />
          <View style={styles.templateTextInfo}>
            <Text style={[
              styles.detailTitle,
              { color: isDarkMode ? '#FFFFFF' : '#000000' }
            ]}>
              {template.template_name}
            </Text>
            <Text style={[
              styles.detailDescription,
              { color: isDarkMode ? '#CCCCCC' : '#666666' }
            ]}>
              {template.template_description || 'No description'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleDeleteTemplate}
          style={styles.deleteButton}
        >
          <Feather 
            name="trash-2" 
            size={20} 
            color="#FF6B6B" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.templateDetailsContainer}>
        <View style={styles.detailRow}>
          <Text style={[
            styles.detailLabel,
            { color: isDarkMode ? '#CCCCCC' : '#666666' }
          ]}>
            Category:
          </Text>
          <Text style={[
            styles.detailValue,
            { color: isDarkMode ? '#FFFFFF' : '#000000' }
          ]}>
            {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
          </Text>
        </View>

        {template.estimated_duration_minutes && (
          <View style={styles.detailRow}>
            <Text style={[
              styles.detailLabel,
              { color: isDarkMode ? '#CCCCCC' : '#666666' }
            ]}>
              Estimated Time:
            </Text>
            <Text style={[
              styles.detailValue,
              { color: isDarkMode ? '#FFFFFF' : '#000000' }
            ]}>
              {template.estimated_duration_minutes} minutes
            </Text>
          </View>
        )}

        {template.default_due_offset_days && (
          <View style={styles.detailRow}>
            <Text style={[
              styles.detailLabel,
              { color: isDarkMode ? '#CCCCCC' : '#666666' }
            ]}>
              Default Due Date:
            </Text>
            <Text style={[
              styles.detailValue,
              { color: isDarkMode ? '#FFFFFF' : '#000000' }
            ]}>
              {template.default_due_offset_days} days from creation
            </Text>
          </View>
        )}

        <View style={styles.taskPreview}>
          <Text style={[
            styles.taskPreviewTitle,
            { color: isDarkMode ? '#FFFFFF' : '#000000' }
          ]}>
            Task Preview:
          </Text>
          
          <View style={[
            styles.taskPreviewCard,
            {
              backgroundColor: isDarkMode ? '#2C2C2C' : '#FFFFFF',
              borderColor: isDarkMode ? '#444' : '#E5E5E5',
            }
          ]}>
            <Text style={[
              styles.taskTitle,
              { color: isDarkMode ? '#FFFFFF' : '#000000' }
            ]}>
              {template.title}
            </Text>
            {template.description && (
              <Text style={[
                styles.taskDescription,
                { color: isDarkMode ? '#CCCCCC' : '#666666' }
              ]}>
                {template.description}
              </Text>
            )}
            {template.location_label && (
              <View style={styles.locationContainer}>
                <Feather name="map-pin" size={14} color={templateColor} />
                <Text style={[
                  styles.locationText,
                  { color: isDarkMode ? '#CCCCCC' : '#666666' }
                ]}>
                  {template.location_label}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.useTemplateButton,
            { backgroundColor: templateColor }
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

// CreateTemplateScreen.js
const CreateTemplateScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useContext(ThemeContext);
  const [templateData, setTemplateData] = useState({
    template_name: '',
    template_description: '',
    category: 'personal',
    title: '',
    description: '',
    location_label: '',
    estimated_duration_minutes: null,
    default_due_offset_days: null,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!templateData.template_name.trim() || !templateData.title.trim()) {
      Alert.alert('Error', 'Please fill in the template name and task title');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('task_templates')
        .insert([{
          ...templateData,
          is_active: true,
          is_public: false,
          usage_count: 0,
        }]);

      if (error) {
        console.error('Error creating template:', error);
        Alert.alert('Error', 'Failed to create template');
        return;
      }

      Alert.alert('Success', 'Template created successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

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
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>
              Save
            </Text>
          )}
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
          This will include fields for template name, description, category, estimated time, and default settings.
        </Text>
      </View>
    </SafeAreaView>
  );
};

// EditTemplateScreen.js
const EditTemplateScreen = ({ route, navigation }) => {
  const { template } = route.params;
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
          Edit Template
        </Text>
        <TouchableOpacity style={styles.saveButton}>
          <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formContainer}>
        <Text style={[
          styles.templateTitle,
          { color: isDarkMode ? '#FFFFFF' : '#000000' }
        ]}>
          Editing: {template.template_name}
        </Text>
        <Text style={[
          styles.comingSoonText,
          { color: isDarkMode ? '#CCCCCC' : '#666666' }
        ]}>
          Template editing form coming soon...
        </Text>
        <Text style={[
          styles.comingSoonSubtext,
          { color: isDarkMode ? '#999999' : '#999999' }
        ]}>
          This will allow you to modify all template fields including name, description, category, and default settings.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 20,
  },
  templateCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  templateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  estimatedTime: {
    fontSize: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Detail Screen Styles
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
  templateTextInfo: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailDescription: {
    fontSize: 14,
  },
  deleteButton: {
    padding: 8,
  },
  templateDetailsContainer: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskPreview: {
    marginTop: 20,
  },
  taskPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  taskPreviewCard: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    marginLeft: 4,
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
  // Create/Edit Screen Styles
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

export default TemplateListScreen;