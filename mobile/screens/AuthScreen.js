/**
 * AuthScreen.js — Premium Login & Registration
 * Glassmorphic design using actual app assets (icon.png)
 * Consistent with Asaaniyat LiquidGlass design language.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, SHADOWS, FONTS } from '../theme';
import { useAuth } from '../context/AuthContext';

const ICON = require('../assets/icon.png');

export default function AuthScreen() {
  const { login, register } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cardAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;
  const modeAnim = useRef(new Animated.Value(0)).current;

  const isRegister = mode === 'register';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, damping: 16, stiffness: 160, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    setError(null);
    Animated.spring(modeAnim, { toValue: isRegister ? 1 : 0, damping: 18, stiffness: 200, useNativeDriver: false }).start();
  }, [mode]);

  const submit = async () => {
    setError(null);

    if (!email.trim()) { setError('Email address is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email address.'); return; }
    if (!password.trim()) { setError('Password is required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    if (isRegister) {
      if (!city.trim()) { setError('Please enter your city.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register({ email: email.trim(), password, displayName: displayName.trim(), city: city.trim() });
      } else {
        await login({ email: email.trim(), password });
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Authentication failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.shell, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Ambient gradient layers */}
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />
      <View style={styles.ambientCircle} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Animated.View style={[
            styles.card,
            { opacity: cardAnim, transform: [{ scale: cardScale }] }
          ]}>
            {/* ── Logo & Branding ─────────────────────────────────────── */}
            <View style={styles.brandRow}>
              <View style={styles.logoWrap}>
                <Image source={ICON} style={styles.logoImage} resizeMode="contain" />
              </View>
              <View style={styles.brandText}>
                <Text style={styles.brand}>Asaaniyat</Text>
                <Text style={styles.brandUrdu}>آسانیات</Text>
              </View>
            </View>

            <Text style={styles.tagline}>Premium Home Services, at Your Command.</Text>

            {/* ── Mode Switcher ────────────────────────────────────────── */}
            <View style={styles.segmentRow}>
              <Pressable
                onPress={() => setMode('login')}
                style={[styles.segment, !isRegister && styles.segmentActive]}
                android_ripple={{ color: 'rgba(14,143,70,0.1)', borderless: false }}
              >
                <Ionicons
                  name={isRegister ? 'log-in-outline' : 'log-in'}
                  size={14}
                  color={!isRegister ? '#FFFFFF' : COLORS.textSecondary}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.segmentText, !isRegister && styles.segmentTextActive]}>Log In</Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('register')}
                style={[styles.segment, isRegister && styles.segmentActive]}
                android_ripple={{ color: 'rgba(14,143,70,0.1)', borderless: false }}
              >
                <Ionicons
                  name={isRegister ? 'person-add' : 'person-add-outline'}
                  size={14}
                  color={isRegister ? '#FFFFFF' : COLORS.textSecondary}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.segmentText, isRegister && styles.segmentTextActive]}>Register</Text>
              </Pressable>
            </View>

            {/* ── Form Fields ──────────────────────────────────────────── */}
            {isRegister && (
              <InputField
                label="Display Name"
                icon="person-outline"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your full name"
                autoCapitalize="words"
              />
            )}

            {isRegister && (
              <InputField
                label="City"
                icon="location-outline"
                value={city}
                onChangeText={setCity}
                placeholder="Karachi, Lahore, Islamabad..."
                autoCapitalize="words"
              />
            )}

            <InputField
              label="Email Address"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <InputField
              label="Password"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder={isRegister ? 'Minimum 8 characters' : 'Your password'}
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(v => !v)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />

            {isRegister && (
              <InputField
                label="Confirm Password"
                icon="shield-checkmark-outline"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat your password"
                secureTextEntry={!showPassword}
              />
            )}

            {/* ── Error Banner ─────────────────────────────────────────── */}
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="warning-outline" size={16} color="#DC2626" style={{ marginRight: 8, flexShrink: 0 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ── Submit Button ────────────────────────────────────────── */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={submit}
              disabled={loading}
              activeOpacity={0.84}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={isRegister ? 'person-add' : 'log-in'}
                    size={18}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.submitBtnText}>
                    {isRegister ? 'Create Account' : 'Log In'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* ── Footer note ─────────────────────────────────────────── */}
            <View style={styles.footerRow}>
              <Ionicons name="shield-checkmark-outline" size={12} color={COLORS.textMuted} style={{ marginRight: 5 }} />
              <Text style={styles.footerNote}>
                Your session is encrypted and remembered securely on this device.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function InputField({
  label, icon, value, onChangeText, placeholder,
  secureTextEntry, keyboardType, autoCapitalize, autoComplete,
  rightIcon, onRightIconPress,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={inputStyles.wrap}>
      <Text style={inputStyles.label}>{label}</Text>
      <View style={[inputStyles.inputRow, focused && inputStyles.inputRowFocused]}>
        <Ionicons name={icon} size={17} color={focused ? COLORS.primary : COLORS.textMuted} style={inputStyles.icon} />
        <TextInput
          style={inputStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={inputStyles.rightBtn} activeOpacity={0.7}>
            <Ionicons name={rightIcon} size={17} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontFamily: FONTS.heading.fontFamily,
    color: COLORS.textPrimary,
    marginBottom: 7,
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.12)',
    borderRadius: RADII.md,
    paddingHorizontal: 12,
    paddingVertical: 2,
    gap: 8,
  },
  inputRowFocused: {
    borderColor: COLORS.primary,
    backgroundColor: '#F5FBF7',
  },
  icon: { flexShrink: 0 },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    paddingVertical: 14,
  },
  rightBtn: {
    padding: 4,
    flexShrink: 0,
  },
});

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#F5FBF7',
  },

  // Ambient layers
  ambientTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '50%',
    backgroundColor: '#EFF6FF',
    opacity: 0.7,
  },
  ambientBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '50%',
    backgroundColor: '#EAF8EF',
    opacity: 0.65,
  },
  ambientCircle: {
    position: 'absolute',
    top: -120, right: -80,
    width: 320, height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(14,143,70,0.06)',
  },

  kav: { flex: 1 },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.1)',
    ...SHADOWS.glass,
  },

  // Brand
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 14,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EAF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.14)',
    overflow: 'hidden',
  },
  logoImage: {
    width: 40,
    height: 40,
  },
  brandText: { flex: 1 },
  brand: {
    color: COLORS.primary,
    fontSize: 26,
    fontFamily: FONTS.heading.fontFamily,
    letterSpacing: -0.5,
  },
  brandUrdu: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontFamily: FONTS.bold.fontFamily,
    marginTop: 2,
    writingDirection: 'rtl',
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FONTS.bold.fontFamily,
    marginBottom: 20,
  },

  // Segment
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: '#ECF8F1',
    borderRadius: RADII.md,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: RADII.sm,
  },
  segmentActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },
  segmentText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.subheading.fontFamily,
    fontSize: 13,
  },
  segmentTextActive: { color: '#FFFFFF' },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220,38,38,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.14)',
    borderRadius: RADII.md,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 13,
    fontFamily: FONTS.bold.fontFamily,
    lineHeight: 18,
  },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADII.lg,
    paddingVertical: 17,
    marginTop: 8,
    ...SHADOWS.card,
  },
  submitBtnDisabled: { opacity: 0.72 },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FONTS.heading.fontFamily,
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(14,143,70,0.06)',
  },
  footerNote: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: FONTS.bold.fontFamily,
  },
});
