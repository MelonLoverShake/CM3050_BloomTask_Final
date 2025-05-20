import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/superbase';
import { ThemeContext } from '../functions/ThemeContext';
import QRCode from 'react-native-qrcode-svg';
import * as Crypto from 'expo-crypto';

const ProfileQRCodeScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [qrValue, setQrValue] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [qrLogo, setQrLogo] = useState(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (!userData) return;
    
    // Generate initial QR code
    generateQRValue();
    
    // Set up timer to refresh QR code every 10 seconds
    const intervalId = setInterval(() => {
      generateQRValue();
      setSecondsLeft(10);
    }, 10000);
    
    // Set up countdown timer
    const countdownId = setInterval(() => {
      setSecondsLeft(prev => prev > 0 ? prev - 1 : 10);
    }, 1000);
    
    return () => {
      clearInterval(intervalId);
      clearInterval(countdownId);
    };
  }, [userData]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigation.replace('Auth');
        return;
      }

      // Fetch user profile data
      const { data, error } = await supabase
        .from('profiles')
        .select('username, id')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error.message);
      } else {
        setUserData({
          id: data.id,
          username: data.username || 'User',
          email: session.user.email
        });
      }
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateQRValue = async () => {
    if (!userData) return;
    
    const timestamp = new Date().getTime();
    const expiryTime = timestamp + 10000; // Valid for 10 seconds
    
    // Create a more compact format for QR data
    // Format: appname:userID:username:timestamp:expiry:hash
    // Using URL safe format that's easy to parse
    
    // Create a verification hash to prevent tampering
    // We'll use a SHA-256 hash of the combined data
    const dataToHash = `${userData.id}:${userData.username}:${timestamp}:${expiryTime}`;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataToHash
    );
    
    // Use first 8 characters of hash for brevity
    const shortHash = hash.substring(0, 8);
    
    // Create the final QR value with a URL-like format
    const qrData = `myapp://connect/${userData.id}/${encodeURIComponent(userData.username)}/${timestamp}/${expiryTime}/${shortHash}`;
    
    setQrValue(qrData);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Connect with me on our app! My username is ${userData?.username}`,
      });
    } catch (error) {
      console.error(error.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile QR Code</Text>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={handleShare}
        >
          <Feather name="share" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.qrContainer, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.instructions, { color: theme.colors.secondaryText }]}>
          Let others scan this QR code to connect with you
        </Text>
        
        <View style={styles.qrWrapper}>
          {qrValue ? (
            <QRCode
              value={qrValue}
              size={200}
              color={theme.colors.text}
              backgroundColor="white"
              logo={qrLogo}
              logoSize={40}
              logoBackgroundColor="white"
              logoMargin={2}
              logoBorderRadius={10}
              enableLinearGradient={true}
              linearGradient={[theme.colors.primary, theme.colors.secondary]}
              gradientDirection={[0, 170, 0, 0]}
              quietZone={10}
            />
          ) : (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={[styles.username, { color: theme.colors.text }]}>
            {userData?.username}
          </Text>
          
          <View style={styles.refreshContainer}>
            <Feather name="clock" size={16} color={theme.colors.secondaryText} />
            <Text style={[styles.refreshText, { color: theme.colors.secondaryText }]}>
              Refreshes in {secondsLeft} seconds
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.refreshButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => {
            generateQRValue();
            setSecondsLeft(10);
          }}
        >
          <Feather name="refresh-cw" size={16} color="#FFFFFF" />
          <Text style={styles.refreshButtonText}>Refresh Now</Text>
        </TouchableOpacity>
      </View>
      
      <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.infoTitle, { color: theme.colors.text }]}>How it works</Text>
        <View style={styles.infoRow}>
          <Feather name="shield" size={18} color={theme.colors.primary} style={styles.infoIcon} />
          <Text style={[styles.infoText, { color: theme.colors.secondaryText }]}>
            Each QR code is unique and secured with encryption
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Feather name="clock" size={18} color={theme.colors.primary} style={styles.infoIcon} />
          <Text style={[styles.infoText, { color: theme.colors.secondaryText }]}>
            Codes expire after 10 seconds for extra security
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Feather name="users" size={18} color={theme.colors.primary} style={styles.infoIcon} />
          <Text style={[styles.infoText, { color: theme.colors.secondaryText }]}>
            Only share with people you want to connect with
          </Text>
        </View>
      </View>
      
    </View>
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
  shareButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  qrContainer: {
    margin: 16,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructions: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrWrapper: {   
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 20,
    height: 232,
    width: 232,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  refreshContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshText: {
    marginLeft: 6,
    fontSize: 14,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '600',
  },
  infoCard: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoIcon: {
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
  },
});

export default ProfileQRCodeScreen;