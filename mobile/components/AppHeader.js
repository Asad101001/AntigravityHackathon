import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config';

const GLASS_BG = 'rgba(9, 22, 35, 0.62)';
const GLASS_BORDER = 'rgba(255, 255, 255, 0.20)';

export default function AppHeader({ navigation, routeName, canGoBack }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const resetToStartup = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
  };

  return (
    <View style={styles.shell} pointerEvents="box-none">
      {canGoBack ? (
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
      ) : (
        <View style={styles.backSpacer} />
      )}

      <TouchableOpacity style={styles.brandGlass} onPress={resetToStartup} activeOpacity={0.88}>
        <View style={styles.monogramWrap}>
          <Text style={[styles.monogramLetter, styles.letterM]}>M</Text>
          <Text style={[styles.monogramLetter, styles.letterA]}>A</Text>
          <Text style={[styles.monogramLetter, styles.letterK]}>K</Text>
          <Animated.View style={[styles.monogramGlow, { opacity: shimmer }]} />
        </View>
        <View>
          <Text style={styles.appName}>Asaaniyat</Text>
          <Text style={styles.routeLabel}>{routeName || 'Home'}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.rightSpacer} />
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
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  backSpacer: { width: 42, height: 42 },
  rightSpacer: { width: 42, height: 42 },
  brandGlass: {
    minWidth: 218,
    height: 58,
    borderRadius: 29,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    elevation: 8,
    overflow: 'hidden',
  },
  monogramWrap: {
    width: 66,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  monogramLetter: {
    color: '#F8FAFC',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: -1,
    textShadowColor: 'rgba(34,197,94,0.75)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  letterM: { marginRight: -1 },
  letterA: { color: '#9EF7C2', transform: [{ translateY: -1 }] },
  letterK: { marginLeft: -1 },
  monogramGlow: {
    position: 'absolute',
    width: 28,
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    transform: [{ rotate: '28deg' }, { translateX: 8 }],
  },
  appName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  routeLabel: {
    marginTop: 1,
    color: 'rgba(226, 232, 240, 0.72)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});
