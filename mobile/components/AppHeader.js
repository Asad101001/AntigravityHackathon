import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, FONTS } from '../theme';

export default function AppHeader({ navigation, routeName, canGoBack, onProfilePress }) {
  const resetToHome = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const handleBackPress = () => {
    if (routeName === 'Confirmed') {
      resetToHome();
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    resetToHome();
  };

  const displaySubtext = routeName === 'Home' ? 'HOME' : routeName.toUpperCase();

  return (
    <View style={styles.shell} pointerEvents="box-none">
      {/* Left side: Back Button or Profile Avatar trigger */}
      {canGoBack ? (
        <TouchableOpacity style={styles.circleButton} onPress={handleBackPress} activeOpacity={0.82}>
          <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      ) : routeName === 'Home' ? (
        <TouchableOpacity style={styles.avatarButton} onPress={onProfilePress} activeOpacity={0.84}>
          <Text style={styles.avatarLetter}>A</Text>
          <View style={styles.onlineDot} />
        </TouchableOpacity>
      ) : (
        <View style={styles.circleSpacer} />
      )}

      {/* Center: Simplified logo with subtext marker */}
      <TouchableOpacity onPress={resetToHome} activeOpacity={0.9} style={styles.logoContainer}>
        <Text style={styles.logoText}>Asaaniyat</Text>
        <Text style={styles.subtextMarker}>{displaySubtext}</Text>
      </TouchableOpacity>

      {/* Right side: Balanced clean Spacer */}
      <View style={styles.circleSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.94)',
    ...SHADOWS.card,
  },
  circleSpacer: {
    width: 38,
    height: 38,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: COLORS.primary,
    fontSize: 22,
    fontFamily: FONTS.heading.fontFamily,
    letterSpacing: -0.3,
  },
  subtextMarker: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontFamily: FONTS.subheading.fontFamily,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19, // Keep avatar fully circular
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    position: 'relative',
    ...SHADOWS.card,
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONTS.heading.fontFamily,
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
