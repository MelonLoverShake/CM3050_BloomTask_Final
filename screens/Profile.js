import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../functions/ThemeContext'; 
import { supabase } from '../lib/superbase'; 
import { ThemeContext, themeColors, getTheme } from '../functions/ThemeContext';

const ProfileScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigation.replace('Auth');
        return;
      }

      const { user } = session;
      setEmail(user.email);

      // Fetch user profile data
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error.message);
      } else {
        setUsername(data.username || '');
        setNewUsername(data.username || '');
      }
    } catch (error) {
      console.error('Error:', error.message);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        Alert.alert('Error', 'You must be logged in to update your profile');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          username: newUsername,
          updated_at: new Date()
        })
        .eq('id', session.user.id);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setUsername(newUsername);
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              const { data: { session } } = await supabase.auth.getSession();
              
              if (!session) {
                Alert.alert('Error', 'You must be logged in to delete your account');
                return;
              }

              // First delete user data from profiles table
              const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', session.user.id);

              if (profileError) {
                throw new Error(profileError.message);
              }

              // Then delete the user account
              const { error: authError } = await supabase.auth.admin.deleteUser(
                session.user.id
              );

              if (authError) {
                // If admin deletion fails, try regular delete user
                const { error: userError } = await supabase.auth.deleteUser();
                if (userError) {
                  throw new Error(userError.message);
                }
              }

              Alert.alert(
                'Account Deleted',
                'Your account has been successfully deleted.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.replace('Auth')
                  }
                ]
              );
            } catch (error) {
              console.error('Error deleting account:', error.message);
              Alert.alert('Error', 'Failed to delete account. Please try again later.');
            } finally {
              setDeleting(false);
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={[styles.profileSection, { backgroundColor: theme.colors.card }]}>
        <View style={styles.profileImageContainer}>
          <View style={[styles.profileImage, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.profileInitial}>
              {username.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <TouchableOpacity style={styles.editImageButton}>
            <Feather name="camera" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.profileInfo}>
          {isEditing ? (
            <TextInput
              style={[styles.usernameInput, { 
                color: theme.colors.text, 
                borderColor: theme.colors.border 
              }]}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter username"
              placeholderTextColor={theme.colors.secondaryText}
            />
          ) : (
            <Text style={[styles.profileName, { color: theme.colors.text }]}>
              {username}
            </Text>
          )}
          <Text style={[styles.profileEmail, { color: theme.colors.secondaryText }]}>
            {email}
          </Text>
        </View>

        {isEditing ? (
          <View style={styles.editButtonsContainer}>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.colors.secondary }]}
              onPress={() => {
                setNewUsername(username);
                setIsEditing(false);
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.editButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setIsEditing(true)}
          >
            <Feather name="edit-2" size={16} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.settingsSection, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Settings</Text>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <View style={styles.settingIconContainer}>
            <Feather name="lock" size={20} color={theme.colors.primary} />
          </View>
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Change Password</Text>
          <Feather name="chevron-right" size={20} color={theme.colors.secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('SavedLocations')}
        >
          <View style={styles.settingIconContainer}>
            <Feather name="map-pin" size={20} color={theme.colors.primary} />
          </View>
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Saved Locations</Text>
          <Feather name="chevron-right" size={20} color={theme.colors.secondaryText} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('ProfileQRCode')}
        >
          <View style={styles.settingIconContainer}>
            <Feather name="share-2" size={20} color={theme.colors.primary} />
          </View>
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Profile QR Code</Text>
          <Feather name="chevron-right" size={20} color={theme.colors.secondaryText} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.deleteAccountButton, { backgroundColor: '#FF3B30' }]}
        onPress={handleDeleteAccount}
        disabled={deleting}
      >
        {deleting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Feather name="trash-2" size={20} color="#FFFFFF" />
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
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
  profileSection: {
    margin: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#555',
    borderRadius: 20,
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  usernameInput: {
    fontSize: 18,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    width: 200,
    textAlign: 'center',
    marginBottom: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontWeight: '600',
  },
  editButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 20,
    margin: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  settingsSection: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  deleteAccountText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
});

export default ProfileScreen;