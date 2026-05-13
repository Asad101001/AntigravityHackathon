/**
 * Screen 1: HomeScreen
 * Large text input + service quick-select buttons
 * The entry point of the app
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
  Animated, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SERVICES } from '../config';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [text, setText] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    // Pulse animation for send button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleSend = () => {
    if (!text.trim()) return;
    navigation.navigate('Loading', { userText: text.trim() });
  };

  const handleQuickSelect = (service) => {
    const quickText = `${service.label} chahiye`;
    setText(quickText);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Ionicons name="flash" size={48} color={COLORS.primary} style={{marginBottom: 8}} />
            <Text style={styles.logo}>آسانیات</Text>
            <Text style={styles.logoSub}>Asaaniyat</Text>
            <Text style={styles.tagline}>Find verified professionals instantly</Text>
            <View style={styles.divider} />
            <Text style={styles.subtitle}>
              Describe what you need in Urdu or English
            </Text>
          </Animated.View>

          {/* Text Input */}
          <Animated.View style={[styles.inputContainer, { opacity: fadeAnim }]}>
            <TextInput
              style={styles.textInput}
              placeholder={'E.g. "Electrician chahiye G-11 mein kal subah"'}
              placeholderTextColor={COLORS.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{text.length}/500</Text>
          </Animated.View>

          {/* Send Button */}
          <Animated.View style={{ transform: [{ scale: text.trim() ? pulseAnim : 1 }] }}>
            <TouchableOpacity
              style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!text.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.sendButtonText}>Find Professionals</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Quick Select */}
          <View style={styles.quickSection}>
            <Text style={styles.quickLabel}>Quick Select</Text>
            <View style={styles.quickGrid}>
              {SERVICES.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={styles.quickButton}
                  onPress={() => handleQuickSelect(service)}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconWrapper}>
                    <Ionicons name={service.icon} size={28} color={COLORS.primary} />
                  </View>
                  <Text style={styles.quickText}>{service.label}</Text>
                  <Text style={styles.quickUrdu}>{service.urdu}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Example phrases */}
          <View style={styles.examplesSection}>
            <Text style={styles.examplesTitle}>Popular requests</Text>
            {[
              '"Electrician chahiye G-11 mein kal subah"',
              '"Plumber chahiye DHA Lahore mein abhi"',
              '"AC repair needed in Clifton Karachi"',
              '"Carpenter chahiye F-8 mein kal"',
            ].map((example, i) => (
              <TouchableOpacity
                key={i}
                style={styles.exampleChip}
                onPress={() => setText(example.replace(/"/g, ''))}
                activeOpacity={0.7}
              >
                <Text style={styles.exampleText}>{example}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 60 },
  
  // Header
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 42, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  logoSub: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 },
  tagline: { fontSize: 14, color: COLORS.accent, marginTop: 4, fontWeight: '500' },
  divider: { width: 60, height: 3, backgroundColor: COLORS.primary, borderRadius: 2, marginVertical: 16 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },

  // Input
  inputContainer: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  textInput: {
    fontSize: 16,
    color: COLORS.textPrimary,
    minHeight: 80,
    lineHeight: 24,
  },
  charCount: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginTop: 8 },

  // Send
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 28,
  },
  sendButtonDisabled: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  sendButtonText: { fontSize: 17, fontWeight: '700', color: '#0A0E17' },

  // Quick Select
  quickSection: { marginBottom: 28 },
  quickLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickButton: {
    width: (width - 68) / 3,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickIcon: { fontSize: 26, marginBottom: 6 },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  quickUrdu: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // Examples
  examplesSection: { marginBottom: 40 },
  examplesTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  exampleChip: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exampleText: { fontSize: 13, color: COLORS.accent, fontStyle: 'italic' },
});

