import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/superbase';
import { ThemeContext } from '../functions/ThemeContext';

const ChangePasswordScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return '';
  };

  const validateForm = () => {
    const newErrors = {
      currentPassword: currentPassword ? '' : 'Current password is required',
      newPassword: validatePassword(newPassword),
      confirmPassword: newPassword !== confirmPassword ? 'Passwords do not match' : '',
    };

    setErrors(newErrors);

    return !Object.values(newErrors).some(error => error);
  };

  const handleChangePassword = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        Alert.alert('Error', 'You must be logged in to change your password');
        navigation.navigate('Login');
        return;
      }
      
      // First validate current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });
      
      if (signInError) {
        setErrors({
          ...errors,
          currentPassword: 'Current password is incorrect',
        });
        return;
      }
      
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (updateError) {
        Alert.alert('Error', updateError.message || 'Failed to update password');
        return;
      }
      
      Alert.alert(
        'Success',
        'Your password has been updated successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          }
        ]
      );
    } catch (error) {
      console.error('Error changing password:', error.message);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Change Password</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={[styles.formContainer, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.formTitle, { color: theme.colors.text }]}>Update Your Password</Text>
        <Text style={[styles.formSubtitle, { color: theme.colors.secondaryText }]}>
          Create a strong password that you don't use elsewhere
        </Text>

        {/* Current Password Field */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Current Password</Text>
          <View style={[styles.inputWrapper, { 
            borderColor: errors.currentPassword ? theme.colors.error : theme.colors.border,
            backgroundColor: theme.colors.inputBackground
          }]}>
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              secureTextEntry={!showCurrentPassword}
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                if (errors.currentPassword) {
                  setErrors({...errors, currentPassword: ''});
                }
              }}
              placeholder="Enter your current password"
              placeholderTextColor={theme.colors.secondaryText}
            />
            <TouchableOpacity
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              style={styles.visibilityToggle}
            >
              <Feather
                name={showCurrentPassword ? 'eye-off' : 'eye'}
                size={20}
                color={theme.colors.secondaryText}
              />
            </TouchableOpacity>
          </View>
          {errors.currentPassword ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {errors.currentPassword}
            </Text>
          ) : null}
        </View>

        {/* New Password Field */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>New Password</Text>
          <View style={[styles.inputWrapper, { 
            borderColor: errors.newPassword ? theme.colors.error : theme.colors.border,
            backgroundColor: theme.colors.inputBackground
          }]}>
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (errors.newPassword) {
                  setErrors({...errors, newPassword: ''});
                }
              }}
              placeholder="Enter your new password"
              placeholderTextColor={theme.colors.secondaryText}
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword(!showNewPassword)}
              style={styles.visibilityToggle}
            >
              <Feather
                name={showNewPassword ? 'eye-off' : 'eye'}
                size={20}
                color={theme.colors.secondaryText}
              />
            </TouchableOpacity>
          </View>
          {errors.newPassword ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {errors.newPassword}
            </Text>
          ) : null}
        </View>

        {/* Confirm New Password Field */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Confirm New Password</Text>
          <View style={[styles.inputWrapper, { 
            borderColor: errors.confirmPassword ? theme.colors.error : theme.colors.border,
            backgroundColor: theme.colors.inputBackground
          }]}>
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) {
                  setErrors({...errors, confirmPassword: ''});
                }
              }}
              placeholder="Confirm your new password"
              placeholderTextColor={theme.colors.secondaryText}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.visibilityToggle}
            >
              <Feather
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={20}
                color={theme.colors.secondaryText}
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {errors.confirmPassword}
            </Text>
          ) : null}
        </View>

        <View style={styles.passwordRequirements}>
          <Text style={[styles.requirementsTitle, { color: theme.colors.text }]}>
            Password Requirements:
          </Text>
          <View style={styles.requirementItem}>
            <Feather 
              name={newPassword.length >= 8 ? 'check-circle' : 'circle'} 
              size={16} 
              color={newPassword.length >= 8 ? theme.colors.success : theme.colors.secondaryText} 
            />
            <Text style={[styles.requirementText, { 
              color: newPassword.length >= 8 ? theme.colors.success : theme.colors.secondaryText 
            }]}>
              At least 8 characters
            </Text>
          </View>
          <View style={styles.requirementItem}>
            <Feather 
              name={/[A-Z]/.test(newPassword) ? 'check-circle' : 'circle'} 
              size={16} 
              color={/[A-Z]/.test(newPassword) ? theme.colors.success : theme.colors.secondaryText} 
            />
            <Text style={[styles.requirementText, { 
              color: /[A-Z]/.test(newPassword) ? theme.colors.success : theme.colors.secondaryText 
            }]}>
              At least one uppercase letter
            </Text>
          </View>
          <View style={styles.requirementItem}>
            <Feather 
              name={/[a-z]/.test(newPassword) ? 'check-circle' : 'circle'} 
              size={16} 
              color={/[a-z]/.test(newPassword) ? theme.colors.success : theme.colors.secondaryText} 
            />
            <Text style={[styles.requirementText, { 
              color: /[a-z]/.test(newPassword) ? theme.colors.success : theme.colors.secondaryText 
            }]}>
              At least one lowercase letter
            </Text>
          </View>
          <View style={styles.requirementItem}>
            <Feather 
              name={/[0-9]/.test(newPassword) ? 'check-circle' : 'circle'} 
              size={16} 
              color={/[0-9]/.test(newPassword) ? theme.colors.success : theme.colors.secondaryText} 
            />
            <Text style={[styles.requirementText, { 
              color: /[0-9]/.test(newPassword) ? theme.colors.success : theme.colors.secondaryText 
            }]}>
              At least one number
            </Text>
          </View>
          <View style={styles.requirementItem}>
            <Feather 
              name={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'check-circle' : 'circle'} 
              size={16} 
              color={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? theme.colors.success : theme.colors.secondaryText} 
            />
            <Text style={[styles.requirementText, { 
              color: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? theme.colors.success : theme.colors.secondaryText 
            }]}>
              At least one special character
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.updateButton, { 
            backgroundColor: theme.colors.primary,
            opacity: loading ? 0.7 : 1
          }]}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.updateButtonText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  formContainer: {
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 12,
  },
  visibilityToggle: {
    padding: 12,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  passwordRequirements: {
    marginVertical: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 14,
    marginLeft: 8,
  },
  updateButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChangePasswordScreen;