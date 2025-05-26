import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const PomodoroTimer = ({ task, onPomodoroComplete, onUpdateTask, theme }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(task.pomodoros || 0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isActive, timeLeft]);

  const handleTimerComplete = () => {
    setIsActive(false);
    
    if (!isBreak) {
      // Work session completed
      const newPomodoroCount = completedPomodoros + 1;
      setCompletedPomodoros(newPomodoroCount);
      
      // Update task with new pomodoro count
      onUpdateTask(task.id, { pomodoros: newPomodoroCount });
      
      // Start break timer
      const breakTime = newPomodoroCount % 4 === 0 ? 15 * 60 : 5 * 60; // Long break every 4 pomodoros
      setTimeLeft(breakTime);
      setIsBreak(true);
      
      Alert.alert(
        "Work Session Complete! 🍅",
        `Great job! You've completed ${newPomodoroCount} pomodoro${newPomodoroCount > 1 ? 's' : ''} on "${task.title}". Time for a ${breakTime === 900 ? 'long' : 'short'} break!`,
        [
          { text: "Skip Break", onPress: () => resetToWork() },
          { text: "Start Break", onPress: () => setIsActive(true) }
        ]
      );
    } else {
      // Break completed
      Alert.alert(
        "Break Complete! ⏰",
        "Ready to get back to work?",
        [
          { text: "Extend Break", onPress: () => setTimeLeft(5 * 60) },
          { text: "Start Working", onPress: () => resetToWork() }
        ]
      );
    }
    
    if (onPomodoroComplete) {
      onPomodoroComplete(task.id, !isBreak);
    }
  };

  const resetToWork = () => {
    setTimeLeft(25 * 60);
    setIsBreak(false);
    setIsActive(false);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    if (isBreak) {
      resetToWork();
    } else {
      setTimeLeft(25 * 60);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (isBreak) return '#4CAF50'; // Green for break
    if (timeLeft < 5 * 60) return '#FF5722'; // Red when < 5 mins left
    return '#2196F3'; // Blue for normal work
  };

  return (
    <View style={styles.container}>
      <View style={styles.taskInfo}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.pomodoroCount}>
          🍅 {completedPomodoros} pomodoro{completedPomodoros !== 1 ? 's' : ''} completed
        </Text>
      </View>
      
      <View style={[styles.timerCircle, { borderColor: getTimerColor() }]}>
        <Text style={[styles.timerText, { color: getTimerColor() }]}>
          {formatTime(timeLeft)}
        </Text>
        <Text style={styles.sessionType}>
          {isBreak ? (timeLeft > 10 * 60 ? 'Long Break' : 'Short Break') : 'Focus Time'}
        </Text>
      </View>
      
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton, { backgroundColor: getTimerColor() }]}
          onPress={toggleTimer}
        >
          <Text style={styles.buttonText}>
            {isActive ? 'Pause' : 'Start'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={resetTimer}
        >
          <Text style={[styles.buttonText, { color: '#666' }]}>
            Reset
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Session Progress</Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${((isBreak ? (completedPomodoros % 4 === 0 ? 15 * 60 : 5 * 60) : 25 * 60) - timeLeft) / (isBreak ? (completedPomodoros % 4 === 0 ? 15 * 60 : 5 * 60) : 25 * 60) * 100}%`,
                backgroundColor: getTimerColor()
              }
            ]} 
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
    borderRadius: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  taskInfo: {
    marginBottom: 20,
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  pomodoroCount: {
    fontSize: 12,
  },
  timerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sessionType: {
    fontSize: 10,
    marginTop: 3,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default PomodoroTimer;