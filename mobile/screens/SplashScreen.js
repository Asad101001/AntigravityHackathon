import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { COLORS } from '../config';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const logoAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const lineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(lineAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(textAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to Home after 3 seconds
    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const logoScale = logoAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 1.2, 1]
  });

  const textTranslateY = textAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0]
  });

  const lineWidth = lineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '40%']
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconContainer, { opacity: logoAnim, transform: [{ scale: logoScale }] }]}>
        <Ionicons name="flash" size={80} color={COLORS.primary} />
      </Animated.View>
      
      <Animated.Text style={[styles.title, { opacity: textAnim, transform: [{ translateY: textTranslateY }] }]}>
        آسانیات
      </Animated.Text>
      
      <Animated.View style={[styles.line, { width: lineWidth }]} />
      
      <Animated.Text style={[styles.subtitle, { opacity: textAnim, transform: [{ translateY: textTranslateY }] }]}>
        Premium Service Booking
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 30,
  },
  title: {
    fontSize: 54,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  line: {
    height: 3,
    backgroundColor: COLORS.primary,
    marginVertical: 16,
    borderRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  }
});

