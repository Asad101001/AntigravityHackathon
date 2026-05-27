import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { GLASS, SHADOWS, RADII, COLORS, FONTS } from '../theme';

export default function LiquidGlass({ children, style, contentStyle, strong = false, radius = RADII.lg }) {
  // Animated shimmer sweep — gives the "liquid" movement feel
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-300, 300],
  });

  return (
    <View
      style={[
        styles.shell,
        { borderRadius: radius, backgroundColor: strong ? GLASS.strongFallback : GLASS.fallback },
        style,
      ]}
    >
      {/* Dynamic 3D glassy sheen highlights — multiple layers for depth */}
      <View style={[styles.highlight, { borderRadius: radius }]} pointerEvents="none" />
      <View style={[styles.innerBorder, { borderRadius: radius }]} pointerEvents="none" />
      <View style={[styles.sheen, { borderRadius: radius }]} pointerEvents="none" />
      <View style={[styles.glow, { borderRadius: radius }]} pointerEvents="none" />
      {/* Secondary emerald-tinted glow for depth */}
      <View style={[styles.emeraldGlow, { borderRadius: radius }]} pointerEvents="none" />
      {/* Animated shimmer sweep */}
      <Animated.View
        style={[
          styles.shimmer,
          { borderRadius: radius, transform: [{ translateX: shimmerTranslate }] },
        ]}
        pointerEvents="none"
      />
      {/* Top edge bright line */}
      <View style={[styles.topEdge, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]} pointerEvents="none" />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    overflow: 'hidden',
    ...SHADOWS.glass,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' } : null),
    position: 'relative',
  },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.72)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ rotate: '-35deg' }],
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 197, 94, 0.02)',
  },
  emeraldGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(14, 143, 70, 0.015)',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ skewX: '-20deg' }],
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
