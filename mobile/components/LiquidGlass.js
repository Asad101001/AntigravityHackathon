import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { GLASS, SHADOWS, RADII, COLORS } from '../theme';

let BlurView = null;
try {
  BlurView = require('expo-blur').BlurView;
} catch (e) {
  // expo-blur not available — fallback to View
}

export default function LiquidGlass({ children, style, contentStyle, strong = false, radius = RADII.lg }) {
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-300, 300],
  });

  const useBlur = Platform.OS !== 'web' && BlurView;

  return (
    <View
      style={[
        styles.shell,
        { borderRadius: radius, backgroundColor: strong ? GLASS.strongFallback : GLASS.fallback },
        style,
      ]}
    >
      {/* Real native blur layer */}
      {useBlur && (
        <BlurView
          intensity={strong ? 60 : 42}
          tint="light"
          experimentalBlurMethod="dimezisBlurView"
          style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
        />
      )}

      {/* Top highlight — bright edge light refraction */}
      <View style={[styles.highlight, { borderRadius: radius }]} pointerEvents="none" />

      {/* Inner subtle border */}
      <View style={[styles.innerBorder, { borderRadius: radius }]} pointerEvents="none" />

      {/* Soft angled sheen — simulates reflected light source */}
      <View style={[styles.sheen, { borderRadius: radius }]} pointerEvents="none" />

      {/* Emerald tinted depth glow */}
      <View style={[styles.glow, { borderRadius: radius }]} pointerEvents="none" />
      <View style={[styles.emeraldGlow, { borderRadius: radius }]} pointerEvents="none" />

      {/* Animated shimmer sweep — gives liquid movement */}
      <Animated.View
        style={[
          styles.shimmer,
          { borderRadius: radius, transform: [{ translateX: shimmerTranslate }] },
        ]}
        pointerEvents="none"
      />

      {/* Top edge bright line — refraction highlight */}
      <View style={[styles.topEdge, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]} pointerEvents="none" />

      {/* Content */}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.88)',
    overflow: 'hidden',
    ...SHADOWS.glass,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)' } : null),
    position: 'relative',
  },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.78)',
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(14, 143, 70, 0.06)',
  },
  sheen: {
    position: 'absolute',
    top: -120,
    left: -120,
    width: '250%',
    height: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    transform: [{ rotate: '-35deg' }],
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 197, 94, 0.025)',
  },
  emeraldGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(14, 143, 70, 0.018)',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    transform: [{ skewX: '-20deg' }],
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
