import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import * as Network from 'expo-network';
import { MaterialIcons } from '@expo/vector-icons';

const NetworkChecker = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const slideAnimation = useRef(new Animated.Value(-100)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  const checkNetwork = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      const hasConnection = networkState.isConnected && networkState.isInternetReachable;
      
      if (isConnected !== hasConnection) {
        setIsConnected(hasConnection);
        
        if (!hasConnection) {
          // Show the banner when connection is lost
          showBanner();
        } else {
          // Auto-hide after 2 seconds when connection is restored
          showBanner();
          setTimeout(() => {
            hideBanner();
          }, 2000);
        }
      }
    } catch (error) {
      console.log("Network check error:", error);
    }
  };

  const showBanner = () => {
    setIsVisible(true);
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const hideBanner = () => {
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
      Animated.timing(fadeAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => setIsVisible(false));
  };

  useEffect(() => {
    checkNetwork();
    const interval = setInterval(checkNetwork, 5000);
    return () => clearInterval(interval);
  }, [isConnected]);

  if (!isVisible) return null;

  return (
    <Animated.View 
      style={[
        styles.bannerContainer,
        { 
          transform: [{ translateY: slideAnimation }],
          opacity: fadeAnimation
        }
      ]}
    >
      <View style={[
        styles.contentContainer,
        { backgroundColor: isConnected ? '#B5EAD7' : '#FFB5E8' }
      ]}>
        <View style={styles.iconContainer}>
          <MaterialIcons 
            name={isConnected ? "wifi" : "wifi-off"} 
            size={24} 
            color="#555555" 
          />
        </View>
        <Text style={styles.bannerText}>
          {isConnected 
            ? "Connection restored" 
            : "No internet connection"}
        </Text>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={hideBanner}
        >
          <MaterialIcons name="close" size={20} color="#555555" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingTop: 40,
    paddingHorizontal: 16,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  bannerText: {
    color: '#555555',
    fontWeight: '600',
    flex: 1,
    fontSize: 15,
  },
  closeButton: {
    padding: 4,
  }
});

export default NetworkChecker;