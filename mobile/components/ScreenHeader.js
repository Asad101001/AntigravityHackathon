/**
 * ScreenHeader.js — Unified sub-screen header component
 * Used by all sub-screens for consistent back button, title, step indicator.
 * Replaces the ad-hoc header patterns scattered across screens.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, SHADOWS } from '../theme';

/**
 * @param {object} props
 * @param {object} props.navigation   - React Navigation prop
 * @param {string} props.title        - Header title text
 * @param {string} [props.stepLabel]  - e.g. "STEP 2 OF 5"
 * @param {React.ReactNode} [props.right]  - Optional right-side element
 * @param {function} [props.onBack]   - Custom back handler (default: navigation.goBack())
 * @param {boolean} [props.noBorder]  - Hide bottom border
 * @param {boolean} [props.light]     - Use light (transparent) background
 */
export default function ScreenHeader({
  navigation,
  title,
  stepLabel,
  right,
  onBack,
  noBorder = false,
  light = false,
}) {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  };

  return (
    <View
      style={[
        styles.header,
        { paddingTop: Math.max(insets.top + 4, 16) },
        !noBorder && styles.headerBorder,
        light && styles.headerLight,
      ]}
    >
      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={handleBack}
        activeOpacity={0.78}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Center: step label + title */}
      <View style={styles.center}>
        {stepLabel ? (
          <Text style={styles.stepLabel} numberOfLines={1}>{stepLabel}</Text>
        ) : null}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      {/* Right slot — equal width to back btn for centering */}
      <View style={styles.right}>
        {right ?? null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(245,251,247,0.96)',
    zIndex: 20,
  },
  headerBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(14,143,70,0.06)',
  },
  headerLight: {
    backgroundColor: 'transparent',
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: RADII.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    ...SHADOWS.card,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  stepLabel: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },

  title: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    textAlign: 'center',
  },

  right: {
    width: 36,
    alignItems: 'flex-end',
  },
});
