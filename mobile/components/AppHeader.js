import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LiquidGlass from './LiquidGlass';
import { COLORS, RADII, SHADOWS } from '../theme';

export default function AppHeader({ navigation, routeName, canGoBack, onProfilePress }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const resetToHome = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const glowTranslate = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-42, 44] });

  return (
    <View style={styles.shell} pointerEvents="box-none">
      {canGoBack ? (
        <TouchableOpacity style={styles.circleButton} onPress={() => navigation.goBack()} activeOpacity={0.82}>
          <Ionicons name="chevron-back" size={21} color={COLORS.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.circleSpacer} />
      )}

      <TouchableOpacity onPress={resetToHome} activeOpacity={0.9} style={styles.brandTapTarget}>
        <LiquidGlass style={styles.brandGlass} contentStyle={styles.brandContent} strong radius={RADII.pill}>
          <View style={styles.monogramWrap}>
            <Text style={styles.monogramLetter}>A</Text>
            <View style={styles.monogramDivider} />
            <Text style={styles.monogramLeaf}>آ</Text>
            <Animated.View style={[styles.monogramGlow, { transform: [{ translateX: glowTranslate }, { rotate: '22deg' }] }]} />
          </View>
          <View style={styles.brandTextWrap}>
            <Text style={styles.appName}>Asaaniyat</Text>
            <Text style={styles.routeLabel}>{routeName || 'Home'}</Text>
          </View>
        </LiquidGlass>
      </TouchableOpacity>

      <TouchableOpacity style={styles.avatarButton} onPress={onProfilePress} activeOpacity={0.84}>
        <View style={styles.avatarInner}>
          <Text style={styles.avatarText}>A</Text>
        </View>
        <View style={styles.statusDot} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.94)',
    ...SHADOWS.card,
  },
  circleSpacer: { width: 44, height: 44 },
  brandTapTarget: { flexShrink: 1 },
  brandGlass: {
    minWidth: 224,
    maxWidth: 258,
  },
  brandContent: {
    height: 60,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  monogramWrap: {
    width: 70,
    height: 32,
    borderRadius: 18,
    backgroundColor: 'rgba(234,248,239,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  monogramLetter: {
    color: COLORS.primary,
    fontWeight: '900',
    fontSize: 17,
    letterSpacing: -0.4,
  },
  monogramDivider: {
    width: 1,
    height: 16,
    marginHorizontal: 7,
    backgroundColor: 'rgba(14,143,70,0.22)',
  },
  monogramLeaf: {
    color: COLORS.accent,
    fontWeight: '900',
    fontSize: 15,
  },
  monogramGlow: {
    position: 'absolute',
    width: 26,
    height: 58,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.64)',
  },
  brandTextWrap: { minWidth: 116 },
  appName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  routeLabel: {
    marginTop: 1,
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.35,
    textTransform: 'uppercase',
  },
  avatarButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    ...SHADOWS.card,
  },
  avatarInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  statusDot: {
    position: 'absolute',
    right: 6,
    bottom: 5,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
