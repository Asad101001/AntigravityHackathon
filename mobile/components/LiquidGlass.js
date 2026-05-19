import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GLASS, SHADOWS, RADII, COLORS } from '../theme';

export default function LiquidGlass({ children, style, contentStyle, strong = false, radius = RADII.lg }) {
  return (
    <View
      style={[
        styles.shell,
        { borderRadius: radius, backgroundColor: strong ? GLASS.strongFallback : GLASS.fallback },
        style,
      ]}
    >
      {/* Dynamic 3D glassy sheen highlights */}
      <View style={[styles.highlight, { borderRadius: radius }]} pointerEvents="none" />
      <View style={[styles.innerBorder, { borderRadius: radius }]} pointerEvents="none" />
      <View style={[styles.sheen, { borderRadius: radius }]} pointerEvents="none" />
      <View style={[styles.glow, { borderRadius: radius }]} pointerEvents="none" />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    overflow: 'hidden',
    ...SHADOWS.glass,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' } : null),
    position: 'relative',
  },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.62)',
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(14, 143, 70, 0.04)',
  },
  sheen: {
    position: 'absolute',
    top: -120,
    left: -120,
    width: '250%',
    height: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ rotate: '-35deg' }],
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 197, 94, 0.01)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
