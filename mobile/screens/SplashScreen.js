import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SHADOWS, FONTS } from '../theme';

const SPLASH_ICON = require('../assets/splash-icon.png');
const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const cardScale = useRef(new Animated.Value(0.88)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const logoSpin = useRef(new Animated.Value(0)).current;
  const urduTranslateY = useRef(new Animated.Value(30)).current;
  const urduOpacity = useRef(new Animated.Value(0)).current;
  const englishTranslateY = useRef(new Animated.Value(25)).current;
  const englishOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;

  // Loading dots animation
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Staggered entrance animations

    // 1. Card appears with scale + fade
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        damping: 14,
        stiffness: 120,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Logo spins in (200ms delay)
    Animated.timing(logoSpin, {
      toValue: 1,
      duration: 1000,
      delay: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // 3. Urdu text slides up (400ms delay)
    Animated.parallel([
      Animated.timing(urduTranslateY, {
        toValue: 0,
        duration: 500,
        delay: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(urduOpacity, {
        toValue: 1,
        duration: 500,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // 4. English title slides up (600ms delay)
    Animated.parallel([
      Animated.timing(englishTranslateY, {
        toValue: 0,
        duration: 500,
        delay: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(englishOpacity, {
        toValue: 1,
        duration: 500,
        delay: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // 5. Subtitle fades in (800ms delay)
    Animated.parallel([
      Animated.timing(subtitleTranslateY, {
        toValue: 0,
        duration: 500,
        delay: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 500,
        delay: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Gentle breathe animation on card
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.012,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animated pulsating loading dots
    const animateDot = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, { toValue: 1, duration: 400, delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
    animateDot(dot1Anim, 0).start();
    animateDot(dot2Anim, 150).start();
    animateDot(dot3Anim, 300).start();

    // Navigate to Home screen after 2.8 seconds
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
      <View style={styles.ambientMid} />
      <View style={styles.ambientBottom} />

      <View style={styles.content}>
        {/* Floating Brand Glass Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [{ scale: Animated.multiply(cardScale, breatheAnim) }],
            },
          ]}
        >
          {/* Pulsating icon container */}
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ rotate: spin }] },
            ]}
          >
            <Image source={SPLASH_ICON} style={styles.splashImage} resizeMode="contain" />
          </Animated.View>

          {/* Calligraphic Urdu Typography — larger and more prominent */}
          <Animated.Text
            style={[
              styles.urduTitle,
              {
                opacity: urduOpacity,
                transform: [{ translateY: urduTranslateY }],
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
                opacity: englishOpacity,
                transform: [{ translateY: englishTranslateY }],
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
                opacity: subtitleOpacity,
                transform: [{ translateY: subtitleTranslateY }],
              },
            ]}
          >
            Premium Home Services
          </Animated.Text>

          {/* Animated pulsating loading dots */}
          <View style={styles.loadingIndicator}>
            <Animated.View style={[styles.dot, { opacity: dot1Anim, transform: [{ scale: dot1Anim }] }]} />
            <Animated.View style={[styles.dot, { opacity: dot2Anim, transform: [{ scale: dot2Anim }] }]} />
            <Animated.View style={[styles.dot, { opacity: dot3Anim, transform: [{ scale: dot3Anim }] }]} />
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FBF7',
  },
  // Ambient gradients — richer tonal range
  ambientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#E8F4FD',
    opacity: 0.85,
  },
  ambientMid: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    height: '30%',
    backgroundColor: '#EDF9F0',
    opacity: 0.6,
  },
  ambientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: '#E0F5E8',
    opacity: 0.75,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  // Premium Brand Card — deeper shadows
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 44,
    paddingHorizontal: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.1)',
    shadowColor: '#087238',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
  },

  // Top Icon Container — slightly larger
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: '#EAF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.14)',
    overflow: 'hidden',
    ...SHADOWS.iconGlow,
  },
  splashImage: {
    width: 62,
    height: 62,
  },

  // Calligraphy — larger, bolder Urdu
  urduTitle: {
    fontSize: 46,
    fontWeight: '700',
    color: '#0B2A18',
    textAlign: 'center',
    marginBottom: 6,
    writingDirection: 'rtl',
    lineHeight: 58,
  },

  // English — bigger
  englishTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 34,
  },

  // Divider line
  divider: {
    width: 60,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 1.5,
    marginVertical: 20,
    opacity: 0.8,
  },

  // Subtitle — slightly bigger
  subtitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 16,
  },

  // Animated dots
  loadingIndicator: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
});
