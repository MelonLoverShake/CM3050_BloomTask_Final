import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Calendar, CalendarList, Agenda } from 'react-native-calendars';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/superbase';
import { ThemeContext } from '../functions/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const CalendarScreen = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState({});
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'agenda'
  const { isDarkMode, themeColor, theme, themeColors } = useContext(ThemeContext);
  const navigation = useNavigation();

  // Fetch tasks from Supabase
  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching tasks:', error);
        Alert.alert('Error', 'Failed to fetch tasks');
        return;
      }

      setTasks(data || []);
      processTasksForCalendar(data || []);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Process tasks to create marked dates for calendar
  const processTasksForCalendar = (tasksData) => {
    const marked = {};
    const today = new Date().toISOString().split('T')[0];

    tasksData.forEach(task => {
      if (task.due_date) {
        const dateString = task.due_date;
        
        if (!marked[dateString]) {
          marked[dateString] = {
            dots: [],
            marked: true,
          };
        }

        // Add dot based on priority
        const priorityColor = getPriorityColor(task.priority);
        marked[dateString].dots.push({
          key: task.id,
          color: priorityColor,
          selectedDotColor: priorityColor,
        });
      }
    });

    // Mark today
    if (!marked[today]) {
      marked[today] = {};
    }
    marked[today].selected = true;
    marked[today].selectedColor = themeColors[themeColor];

    setMarkedDates(marked);
  };

  // Get tasks for a specific date
  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      return task.due_date === date;
    });
  };

  // Get task priority color
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return '#FF6B6B';
      case 'medium':
        return '#FFD93D';
      case 'low':
        return '#6BCF7F';
      default:
        return themeColors[themeColor];
    }
  };

  // Get task status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#4CAF50';
      case 'in_progress':
        return '#2196F3';
      case 'pending':
        return '#FF9800';
      default:
        return theme.colors.text;
    }
  };

  // Handle date selection
  const handleDateSelect = (day) => {
    const selectedDay = day.dateString;
    setSelectedDate(selectedDay);
    
    // Update marked dates to show selection
    const newMarkedDates = { ...markedDates };
    
    // Remove previous selection
    Object.keys(newMarkedDates).forEach(date => {
      if (newMarkedDates[date].selected && !newMarkedDates[date].selectedColor) {
        delete newMarkedDates[date].selected;
      }
    });
    
    // Add new selection
    if (!newMarkedDates[selectedDay]) {
      newMarkedDates[selectedDay] = {};
    }
    newMarkedDates[selectedDay].selected = true;
    newMarkedDates[selectedDay].selectedColor = themeColors[themeColor];
    
    setMarkedDates(newMarkedDates);
  };

  // Navigate to task detail
  const navigateToTaskDetail = (task) => {
    navigation.navigate('TaskDetail', { task });
  };

  // Calendar theme configuration
  const calendarTheme = {
    backgroundColor: theme.colors.background,
    calendarBackground: theme.colors.background,
    textSectionTitleColor: theme.colors.text,
    selectedDayBackgroundColor: themeColors[themeColor],
    selectedDayTextColor: '#ffffff',
    todayTextColor: themeColors[themeColor],
    dayTextColor: theme.colors.text,
    textDisabledColor: theme.colors.text + '40',
    dotColor: themeColors[themeColor],
    selectedDotColor: '#ffffff',
    arrowColor: themeColors[themeColor],
    monthTextColor: theme.colors.text,
    indicatorColor: themeColors[themeColor],
    textDayFontFamily: 'System',
    textMonthFontFamily: 'System',
    textDayHeaderFontFamily: 'System',
    textDayFontSize: 16,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 14,
    agendaDayTextColor: theme.colors.text,
    agendaDayNumColor: theme.colors.text,
    agendaTodayColor: themeColors[themeColor],
    agendaKnobColor: themeColors[themeColor],
  };

  // Prepare agenda items for Agenda view
  const prepareAgendaItems = () => {
    const items = {};
    
    // Add tasks to agenda
    tasks.forEach(task => {
      if (task.due_date) {
        const dateString = task.due_date;
        if (!items[dateString]) {
          items[dateString] = [];
        }
        items[dateString].push(task);
      }
    });

    // Sort tasks by time if available
    Object.keys(items).forEach(date => {
      items[date].sort((a, b) => {
        if (a.due_time && b.due_time) {
          return a.due_time.localeCompare(b.due_time);
        }
        return 0;
      });
    });

    return items;
  };

  const renderTaskItem = ({ item: task }) => (
    <TouchableOpacity
      style={[
        styles.taskItem,
        { backgroundColor: isDarkMode ? '#2A2A2A' : 'white' },
      ]}
      onPress={() => navigateToTaskDetail(task)}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleContainer}>
          <Text style={[styles.taskTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {task.title}
          </Text>
          {task.due_time && (
            <Text style={[styles.taskTime, { color: theme.colors.text + '80' }]}>
              {new Date(`2000-01-01T${task.due_time}`).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
        </View>
        <View style={styles.taskBadges}>
          {task.priority && (
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
              <Text style={styles.badgeText}>{task.priority}</Text>
            </View>
          )}
          {task.status && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
              <Text style={styles.badgeText}>{task.status}</Text>
            </View>
          )}
        </View>
      </View>
      {task.description && (
        <Text style={[styles.taskDescription, { color: theme.colors.text + '80' }]} numberOfLines={2}>
          {task.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  // Render agenda item for react-native-calendars
  const renderAgendaItem = (item) => (
    <TouchableOpacity
      style={[
        styles.agendaItem,
        { backgroundColor: isDarkMode ? '#2A2A2A' : 'white' },
      ]}
      onPress={() => navigateToTaskDetail(item)}
    >
      <View style={styles.agendaItemContent}>
        <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(item.priority) }]} />
        <View style={styles.agendaItemText}>
          <Text style={[styles.agendaItemTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.due_time && (
            <Text style={[styles.agendaItemTime, { color: theme.colors.text + '80' }]}>
              {new Date(`2000-01-01T${item.due_time}`).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
        </View>
        <View style={styles.agendaBadges}>
          {item.status && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render empty date for agenda
  const renderEmptyDate = () => (
    <View style={styles.emptyDate}>
      <Text style={[styles.emptyDateText, { color: theme.colors.text + '60' }]}>
        No tasks for this day
      </Text>
    </View>
  );

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    // Set initial selected date to today
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors[themeColor]} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading calendar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedDateTasks = getTasksForDate(selectedDate);
  const agendaItems = prepareAgendaItems();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with view toggle */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Calendar</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'calendar' && { backgroundColor: themeColors[themeColor] },
              { borderColor: themeColors[themeColor] }
            ]}
            onPress={() => setViewMode('calendar')}
          >
            <Feather 
              name="calendar" 
              size={20} 
              color={viewMode === 'calendar' ? 'white' : themeColors[themeColor]} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'agenda' && { backgroundColor: themeColors[themeColor] },
              { borderColor: themeColors[themeColor] }
            ]}
            onPress={() => setViewMode('agenda')}
          >
            <Feather 
              name="list" 
              size={20} 
              color={viewMode === 'agenda' ? 'white' : themeColors[themeColor]} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'calendar' ? (
        <View style={styles.calendarContainer}>
          <Calendar
            markingType="multi-dot"
            markedDates={markedDates}
            onDayPress={handleDateSelect}
            theme={calendarTheme}
            style={styles.calendar}
            enableSwipeMonths={true}
            hideExtraDays={true}
            firstDay={0}
            showWeekNumbers={false}
          />
          
          {/* Selected Date Tasks */}
          {selectedDate && (
            <View style={styles.selectedDateSection}>
              <Text style={[styles.selectedDateTitle, { color: theme.colors.text }]}>
                Tasks for {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              {selectedDateTasks.length > 0 ? (
                <FlatList
                  data={selectedDateTasks}
                  renderItem={renderTaskItem}
                  keyExtractor={(item) => item.id.toString()}
                  style={styles.tasksList}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <Text style={[styles.noTasksText, { color: theme.colors.text + '60' }]}>
                  No tasks scheduled for this date
                </Text>
              )}
            </View>
          )}
        </View>
      ) : (
        <Agenda
          items={agendaItems}
          renderItem={renderAgendaItem}
          renderEmptyDate={renderEmptyDate}
          rowHasChanged={(r1, r2) => r1.id !== r2.id}
          theme={calendarTheme}
          style={styles.agenda}
          pastScrollRange={2}
          futureScrollRange={6}
          selected={selectedDate}
          onDayPress={handleDateSelect}
          markingType="multi-dot"
          markedDates={markedDates}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
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
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 20,
    overflow: 'hidden',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginHorizontal: 2,
    borderRadius: 20,
  },
  calendarContainer: {
    flex: 1,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  agenda: {
    flex: 1,
  },
  selectedDateSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  tasksList: {
    flex: 1,
  },
  taskItem: {
    padding: 15,
    marginVertical: 5,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskTime: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  taskBadges: {
    flexDirection: 'row',
    gap: 5,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  agendaItem: {
    marginRight: 10,
    marginTop: 10,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  agendaItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  priorityIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  agendaItemText: {
    flex: 1,
  },
  agendaItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  agendaItemTime: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  agendaBadges: {
    alignItems: 'flex-end',
  },
  emptyDate: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  emptyDateText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  noTasksText: {
    textAlign: 'center',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 20,
  },
});

export default CalendarScreen;