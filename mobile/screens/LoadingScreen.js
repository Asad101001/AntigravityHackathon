/**
 * Screen 3: LoadingScreen
 * Animated pipeline steps: Parsing → Locating → Searching → Ranking → Deciding → Booking → Done
 * Makes the actual API call and shows real progress
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Animated
} from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import { COLORS, API_URL } from '../config';

const STEPS = [
  { id: 1, label: 'Analyzing request', icon: '📝', desc: 'Understanding your needs...' },
  { id: 2, label: 'Checking location', icon: '📍', desc: 'Verifying service area...' },
  { id: 3, label: 'Searching network', icon: '🔍', desc: 'Looking for verified professionals...' },
  { id: 4, label: 'Comparing options', icon: '📊', desc: 'Evaluating distance and ratings...' },
  { id: 5, label: 'Finalizing match', icon: '🎯', desc: 'Selecting the best available provider...' },
  { id: 6, label: 'Preparing booking', icon: '📋', desc: 'Setting up your reservation...' },
];

export default function LoadingScreen({ route, navigation }) {
  const { userText, userLocation, locationSource } = route.params;
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Spinner animation
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();

    // Call API
    callAPI();
  }, []);

  const callAPI = async () => {
    let stepInterval;

    try {
      let finalUserText = userText;
      
      // Try to get location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const geocode = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          });
          if (geocode && geocode.length > 0) {
            const city = geocode[0].city || geocode[0].region || 'Islamabad';
            // Only append if the user didn't mention 'mein' or 'in' or typical location
            if (!finalUserText.toLowerCase().includes(' in ') && !finalUserText.toLowerCase().includes(' mein ')) {
              finalUserText += ` in ${city}`;
            }
          }
        }
      } catch (locErr) {
        console.warn('Location error:', locErr);
      }

      // Simulate step progression while API runs
      stepInterval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < STEPS.length - 1) return prev + 1;
          return prev;
        });
      }, 300);

      const response = await axios.post(`${API_URL}/service-request`, {
        user_text: finalUserText,
        user_id: `user_${Date.now()}`,
        user_location: userLocation || null,
        location_source: userLocation ? (locationSource || 'map') : 'typed'
      }, { timeout: 15000 });

      clearInterval(stepInterval);
      setCurrentStep(STEPS.length);

      // Animate to complete
      Animated.timing(progressAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();

      // Short delay for completion feel
      setTimeout(() => {
        const data = response.data;

        if (data.success === false && data.error_type === 'low_confidence') {
          // Needs clarification
          navigation.replace('IntentConfirm', {
            parsedIntent: data.parsed || {},
            fullResult: data
          });
        } else if (data.success === false) {
          setError(data.message || 'No providers found. Try a different area.');
        } else {
          // Success — go to intent confirm first
          navigation.replace('IntentConfirm', {
            parsedIntent: data.parsed_intent,
            fullResult: data
          });
        }
      }, 800);

    } catch (err) {
      if (stepInterval) clearInterval(stepInterval);

      console.error('API Error:', err);
      const backendMessage = err.response?.data?.message || err.response?.data?.error;
      const errorMessage = backendMessage || (
        err.message === 'Network Error'
          ? `Cannot connect to server at ${API_URL}. Make sure the backend is running, the phone is on the same WiFi, and EXPO_PUBLIC_API_BASE_URL points to the backend LAN URL if this is a standalone build.`
          : `Error: ${err.message}`
      );
      setError(errorMessage);
    }
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            ← Go Back & Try Again
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Spinner */}
        <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
          <Text style={styles.spinnerText}>⚡</Text>
        </Animated.View>

        <Text style={styles.title}>Finding a Professional</Text>
        <Text style={styles.subtitle}>Please wait while we find the best match...</Text>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          {STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isDone = index < currentStep;
            const isPending = index > currentStep;

            return (
              <View key={step.id} style={[
                styles.stepRow,
                isActive && styles.stepRowActive,
                isDone && styles.stepRowDone
              ]}>
                <View style={[
                  styles.stepDot,
                  isDone && styles.stepDotDone,
                  isActive && styles.stepDotActive
                ]}>
                  <Text style={styles.stepDotText}>
                    {isDone ? '✓' : step.id}
                  </Text>
                </View>
                <View style={styles.stepInfo}>
                  <Text style={[
                    styles.stepLabel,
                    isDone && styles.stepLabelDone,
                    isPending && styles.stepLabelPending
                  ]}>
                    {step.icon}  {step.label}
                  </Text>
                  {isActive && (
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  )}
                </View>
                {isDone && <Text style={styles.stepCheck}>✅</Text>}
              </View>
            );
          })}
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { 
            width: `${(currentStep / STEPS.length) * 100}%` 
          }]} />
        </View>
        <Text style={styles.progressText}>
          {currentStep >= STEPS.length ? 'Complete!' : `Step ${currentStep + 1} of ${STEPS.length}`}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },

  // Spinner
  spinner: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  spinnerText: { fontSize: 36 },

  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 30 },

  // Steps
  stepsContainer: { width: '100%', marginBottom: 30 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  stepRowActive: { backgroundColor: COLORS.primaryGlow },
  stepRowDone: { opacity: 0.7 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepDotDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepDotActive: { borderColor: COLORS.primary, borderWidth: 2 },
  stepDotText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  stepInfo: { flex: 1 },
  stepLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  stepLabelDone: { color: COLORS.textSecondary },
  stepLabelPending: { color: COLORS.textMuted },
  stepDesc: { fontSize: 12, color: COLORS.accent, marginTop: 2 },
  stepCheck: { fontSize: 14 },

  // Progress
  progressBarBg: { width: '100%', height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  progressText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },

  // Error
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: COLORS.danger, marginBottom: 12 },
  errorText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  retryButton: { fontSize: 16, fontWeight: '600', color: COLORS.primary, padding: 12 },
});

