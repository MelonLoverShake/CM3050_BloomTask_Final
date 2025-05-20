import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing
} from 'react-native';

export default function CuteCatLoadingScreen() {
  const [dots, setDots] = useState('');
  const bounce = new Animated.Value(0);
  const sparkleOpacity = new Animated.Value(0);
  const heartScale = new Animated.Value(1);

  useEffect(() => {
    // Bounce loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -10,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad)
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad)
        })
      ])
    ).start();

    // Sparkle blink loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true
        }),
        Animated.timing(sparkleOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true
        })
      ])
    ).start();

    // Heart pop loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.4,
          duration: 600,
          useNativeDriver: true
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true
        })
      ])
    ).start();

    // Dots animation
    const dotInterval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(dotInterval);
  }, []);

  return (
    <View style={styles.container}>
      {/* Cat Face */}
      <Animated.View style={[styles.catFace, { transform: [{ translateY: bounce }] }]}>
        <Text style={styles.ears}>ᓚᘏᗢ</Text>
        <View style={styles.eyesContainer}>
          <Text style={styles.eye}>✨</Text>
          <Text style={styles.eye}>✨</Text>
        </View>
        <Text style={styles.mouth}>ω</Text>
      </Animated.View>

      {/* Hearts */}
      <View style={styles.heartsWrapper}>
        <Animated.Text style={[styles.heart, { transform: [{ scale: heartScale }] }]}>💖</Animated.Text>
        <Animated.Text style={[styles.heart, { transform: [{ scale: heartScale }], left: -50 }]}>💖</Animated.Text>
        <Animated.Text style={[styles.heart, { transform: [{ scale: heartScale }], left: 50 }]}>💖</Animated.Text>
      </View>

      {/* Sparkle */}
      <Animated.Text style={[styles.sparkle, { opacity: sparkleOpacity }]}>✨</Animated.Text>

      {/* Loading Dots */}
      <Text style={styles.loadingText}>Loading{dots}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff0f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catFace: {
    backgroundColor: '#ffc0cb',
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#ff69b4',
    borderWidth: 3,
    marginBottom: 40
  },
  ears: {
    position: 'absolute',
    top: -30,
    fontSize: 24,
    color: '#ff69b4',
  },
  eyesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 70,
    marginTop: 10,
  },
  eye: {
    fontSize: 24,
  },
  mouth: {
    fontSize: 20,
    marginTop: 8,
    color: '#333',
  },
  heartsWrapper: {
    flexDirection: 'row',
    position: 'absolute',
    top: 120,
  },
  heart: {
    fontSize: 30,
    position: 'absolute',
  },
  sparkle: {
    fontSize: 30,
    marginTop: 20,
    color: '#f0f',
  },
  loadingText: {
    fontSize: 18,
    marginTop: 40,
    color: '#d63384',
  },
});
