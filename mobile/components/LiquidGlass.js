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
      <View style={[styles.highlight, { borderRadius: radius }]} pointerEvents="none" />
      <View style={[styles.sheen, { borderRadius: radius }]} pointerEvents="none" />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderWidth: 1,
    borderColor: GLASS.border,
    overflow: 'hidden',
    ...SHADOWS.glass,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)' } : null),
  },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  sheen: {
    position: 'absolute',
    top: -42,
    left: -30,
    width: 150,
    height: 90,
    backgroundColor: COLORS.glassSheen,
    transform: [{ rotate: '-18deg' }],
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
