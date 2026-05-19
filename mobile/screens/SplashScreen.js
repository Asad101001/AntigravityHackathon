import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const logoSpin = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(15)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations on mount
    Animated.parallel([
      // Soft card fade & scale in
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      // Gentle logo rotation
      Animated.timing(logoSpin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // Typography slide-in
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 750,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to Home screen after 2.6 seconds
    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const spin = logoSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['-45deg', '0deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Cohesive Background Overlays */}
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />

      <View style={styles.content}>
        {/* Floating Brand Glass Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          {/* Pulsating lightning icon square */}
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ rotate: spin }] },
            ]}
          >
            <Ionicons name="flash" size={44} color={COLORS.primary} />
          </Animated.View>

          {/* Calligraphic Urdu Typography */}
          <Animated.Text
            style={[
              styles.urduTitle,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            آسانیات
          </Animated.Text>

          {/* Premium English Title */}
          <Animated.Text
            style={[
              styles.englishTitle,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            Asaaniyat
          </Animated.Text>

          {/* Soft divider */}
          <View style={styles.divider} />

          {/* Styled Subtitle */}
          <Animated.Text
            style={[
              styles.subtitle,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            Premium Home Services
          </Animated.Text>

          {/* Active online loading dots */}
          <View style={styles.loadingIndicator}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FCFA', // Soft off-white mint
  },
  // Ambient gradients matching Home
  ambientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: '#EFF6FF', // Soft ice blue
    opacity: 0.8,
  },
  ambientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#EAF8EF', // Soft mint tint
    opacity: 0.7,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  // Premium Brand Card
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.1)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },

  // Top Icon Container
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 18,
    backgroundColor: '#EAF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.14)',
  },

  // Calligraphy
  urduTitle: {
    fontSize: 38,
    fontWeight: '700',
    color: '#0B2A18',
    textAlign: 'center',
    marginBottom: 4,
  },

  // English
  englishTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Divider line
  divider: {
    width: 60,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 1.5,
    marginVertical: 18,
    opacity: 0.8,
  },

  // Subtitle
  subtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 24,
  },

  // Visual active dots
  loadingIndicator: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    opacity: 0.35,
  },
  dot1: {
    opacity: 0.9,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.35,
  },
});
