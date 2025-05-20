import React, { useState } from 'react'
import { Alert, StyleSheet, View, AppState, Text, Image, Pressable } from 'react-native'
import { supabase } from '../lib/superbase'
import { Button, Input } from '@rneui/themed'
import { Ionicons } from '@expo/vector-icons'

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
    setLoading(false)
  }

  async function signUpWithEmail() {
    setLoading(true)
    const {
      data: { session, user },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    })
  
    if (error) {
      Alert.alert(error.message)
    } else if (user) {
      // Create a new profile entry when user signs up
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          { 
            id: user.id,
            username: email.split('@')[0], // Default username from email
            updated_at: new Date() 
          }
        ])
      
      if (profileError) console.error('Error creating profile:', profileError.message)
    }
    
    if (!session) Alert.alert('Please check your inbox for email verification!')
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Bloom<Text style={styles.logoAccent}>Task</Text></Text>
          <Image 
            source={require('../assets/App_main_Logo.jpeg')} 
            style={styles.logoIcon} 
          />
        </View>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign In/Sign Up</Text>
        
        <View style={styles.inputContainer}>
          <Input
            containerStyle={styles.input}
            inputStyle={styles.inputText}
            leftIcon={{ type: 'font-awesome', name: 'envelope', color: '#FF8A9B', size: 18 }}
            onChangeText={(text) => setEmail(text)}
            value={email}
            placeholder="email@address.com"
            autoCapitalize={'none'}
            placeholderTextColor="#BBBBBB"
          />
          
          <View style={styles.passwordContainer}>
            <Input
              containerStyle={styles.passwordInput}
              inputStyle={styles.inputText}
              leftIcon={{ type: 'font-awesome', name: 'lock', color: '#FF8A9B', size: 22 }}
              onChangeText={(text) => setPassword(text)}
              value={password}
              secureTextEntry={!showPassword}
              placeholder="Password"
              autoCapitalize={'none'}
              placeholderTextColor="#BBBBBB"
              rightIcon={
                <Pressable 
                  onPressIn={() => setShowPassword(true)}
                  onPressOut={() => setShowPassword(false)}
                  style={styles.eyeIconContainer}
                >
                  <Ionicons 
                    name={showPassword ? "eye" : "eye-off"} 
                    size={22} 
                    color="#FF8A9B" 
                  />
                </Pressable>
              }
            />
            <Text style={styles.passwordHint}>Hold eye icon to show password</Text>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Sign In"
            loading={loading}
            onPress={() => signInWithEmail()}
            buttonStyle={styles.signInButton}
            titleStyle={styles.buttonText}
          />
          
          <Button
            title="Sign Up"
            loading={loading}
            onPress={() => signUpWithEmail()}
            buttonStyle={styles.signUpButton}
            titleStyle={styles.signUpButtonText}
            type="outline"
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FCFCFC',
  },
  headerContainer: {
    marginTop: 40,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  name: {
    fontSize: 36,
    fontWeight: '700',
    color: '#333333',
    marginTop: -5,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    marginBottom: 10,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    marginBottom: 2,
  },
  inputText: {
    fontSize: 16,
    color: '#333333',
  },
  eyeIconContainer: {
    padding: 8,
  },
  passwordHint: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
    marginRight: 10,
    marginBottom: 10,
  },
  buttonContainer: {
    marginTop: 10,
  },
  signInButton: {
    backgroundColor: '#FF8A9B',
    height: 50,
    borderRadius: 8,
    marginBottom: 12,
  },
  signUpButton: {
    borderColor: '#FF8A9B',
    height: 50,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF8A9B',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4CD790', // Mint color
  },
  logoAccent: {
    color: '#FF8A9B', // Pink color from your theme
  },
  logoIcon: {
    width: 32, 
    height: 32,
    marginLeft: 8,
  },
});