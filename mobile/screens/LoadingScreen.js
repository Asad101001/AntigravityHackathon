/**
 * Screen 3: LoadingScreen — Agentic AI Narration Edition
 *
 * Each pipeline step now has a rotating queue of sub-messages that tick
 * independently of the API call, giving judges a live window into the
 * AI's reasoning process. Real API call still drives navigation.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Animated, Easing
} from 'react-native';
import { COLORS, API_URL } from '../config';
import apiClient from '../lib/apiClient';
import { sendLocalNotification } from '../notifications';

// ---------------------------------------------------------------------------
// Pipeline definition — each step has rotating narration lines that simulate
// the agent "thinking aloud". The ticker cycles through them while that step
// is active, so the screen never feels frozen.
// ---------------------------------------------------------------------------
const PIPELINE = [
  {
    id: 1,
    label: 'Parsing Intent',
    icon: '🧠',
    agentName: 'LLMIntentParserAgent',
    narration: [
      'Tokenising your request...',
      'Detecting language mix (Urdu/English)...',
      'Extracting service type & urgency...',
      'Resolving price_sensitivity signal...',
      'Intent vector locked ✓',
    ],
  },
  {
    id: 2,
    label: 'Resolving Location',
    icon: '📍',
    agentName: 'LocationResolverAgent',
    narration: [
      'Checking typed area against the request...',
      'Using picked/current coordinates only if text has no area...',
      'Validating service-area coverage map...',
      'Location context confirmed ✓',
    ],
  },
  {
    id: 3,
    label: 'Discovering Providers',
    icon: '🔍',
    agentName: 'ProviderDiscoveryAgent',
    narration: [
      'Querying verified provider network...',
      'Filtering by specialization match...',
      'Cross-referencing availability windows...',
      'Pulling cancellation_risk scores...',
      'Candidate pool assembled ✓',
    ],
  },
  {
    id: 4,
    label: 'Ranking & Reasoning',
    icon: '📊',
    agentName: 'LLMRankerAgent',
    narration: [
      'Sending candidate list to LLM...',
      'Weighing distance vs. rating trade-offs...',
      'Factoring urgency_level into score...',
      'Analysing recent_sentiment for each provider...',
      'Evaluating cancellation_risk outliers...',
      'Generating decision reasoning_log...',
      'Best match identified ✓',
    ],
  },
  {
    id: 5,
    label: 'Selecting Provider',
    icon: '🎯',
    agentName: 'DecisionMakerAgent',
    narration: [
      'Applying hard constraints...',
      'Checking verification and available slots...',
      'Selecting the safest recommendation...',
      'Decision explanation ready ✓',
    ],
  },
  {
    id: 6,
    label: 'Dynamic Pricing',
    icon: '💰',
    agentName: 'DynamicPricingAgent',
    narration: [
      'Loading provider base_rate_pkr...',
      'Calculating distance surcharge...',
      'Applying urgency multiplier...',
      'Assembling quote_breakdown...',
      'Quote finalised ✓',
    ],
  },
  {
    id: 7,
    label: 'Executing Booking',
    icon: '📋',
    agentName: 'BookingExecutorAgent',
    narration: [
      'Reserving provider time slot...',
      'Writing booking record...',
      'Issuing confirmation ID...',
      'Booking confirmed ✓',
    ],
  },
  {
    id: 8,
    label: 'Scheduling Follow-up',
    icon: '🔔',
    agentName: 'FollowUpManagerAgent',
    narration: [
      'Preparing reminder schedule...',
      'Queueing one-hour service reminder...',
      'Queueing feedback follow-up...',
      'Follow-up plan confirmed ✓',
    ],
  },
];

// How long each narration sub-message stays visible (ms)
const NARRATION_TICK_MS = 900;
// Minimum time we hold on each pipeline step so narration is readable
const MIN_STEP_MS = NARRATION_TICK_MS * 2;

// ---------------------------------------------------------------------------
export default function LoadingScreen({ route, navigation }) {
  const { userText, userLocation, locationSource, city } = route.params;

  const [currentStep, setCurrentStep] = useState(0);   // 0-based pipeline index
  const [narrationIdx, setNarrationIdx] = useState(0); // which sub-message
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(null);

  // Animations
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const fadeAnim   = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Refs so callbacks always see latest values
  const currentStepRef = useRef(0);
  const narrationIdxRef = useRef(0);
  const apiDoneRef = useRef(false);
  const apiResultRef = useRef(null);

  // ── Pulse animation on the active icon ──────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── Narration ticker ─────────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      const step = currentStepRef.current;
      if (step >= PIPELINE.length) return;

      const maxNarration = PIPELINE[step].narration.length;
      const nextIdx = narrationIdxRef.current + 1;

      if (nextIdx < maxNarration) {
        // Still more lines for this step
        narrationIdxRef.current = nextIdx;
        // Fade transition
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
        setNarrationIdx(nextIdx);
      } else if (apiDoneRef.current) {
        // API finished and we've shown all narration — advance step
        advanceStep();
      }
      // else: hold on last narration line until API resolves
    }, NARRATION_TICK_MS);

    return () => clearInterval(tick);
  }, []);

  const advanceStep = () => {
    const next = currentStepRef.current + 1;
    currentStepRef.current = next;
    narrationIdxRef.current = 0;
    setCurrentStep(next);
    setNarrationIdx(0);

    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: next / PIPELINE.length,
      duration: 400,
      useNativeDriver: false,
    }).start();

    if (next >= PIPELINE.length) {
      // All steps done — navigate
      setComplete(true);
      setTimeout(() => resolveNavigation(apiResultRef.current), 600);
    }
  };

  // ── API call ─────────────────────────────────────────────────────────────
  useEffect(() => {
    void callAPI();
  }, []);

  const callAPI = async () => {
    try {
      // Never mutate the typed request with device-derived city text here.
      // The backend parser should decide whether the user specified a location;
      // GPS/map coordinates are sent separately and only used when text has no location.
      const response = await apiClient.post(
        '/service-request',
        {
          user_text: userText,
          user_id: `user_${Date.now()}`,
          city,
          user_location: userLocation || null,
          location_source: userLocation ? (locationSource || 'map') : 'typed',
        },
        { timeout: 20000 }
      );

      apiResultRef.current = response.data;
      apiDoneRef.current   = true;
      if (response.data?.success) {
        void sendLocalNotification(
          'Provider match found',
          `${response.data.provider?.name || 'A provider'} is ready for your ${response.data.provider?.service || 'service'} request.`,
          { booking_id: response.data.booking_id || null, event: 'provider_match' }
        );
      }
      // The narration ticker will now advance steps as they finish

    } catch (err) {
      console.error('API Error:', err);
      const backendMessage = err.response?.data?.message || err.response?.data?.error;
      const errorMessage = backendMessage || (
        err.message === 'Network Error'
          ? `Cannot connect to server at ${API_URL}. Check that the backend is running and reachable.`
          : `Error: ${err.message}`
      );
      setError(errorMessage);
    }
  };

  const resolveNavigation = (data) => {
    if (!data) return;
    if (data.success === false && data.error_type === 'low_confidence') {
      navigation.replace('IntentConfirm', { parsedIntent: data.parsed || {}, fullResult: data });
    } else if (data.success === false) {
      setError(data.message || 'No providers found. Try a different area.');
    } else {
      navigation.replace('IntentConfirm', { parsedIntent: data.parsed_intent, fullResult: data });
    }
  };

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryButton} onPress={() => navigation.goBack()}>
            ← Go Back & Try Again
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived display values ───────────────────────────────────────────────
  const activeStep    = PIPELINE[Math.min(currentStep, PIPELINE.length - 1)];
  const narrationLine = complete
    ? 'All agents completed ✓'
    : activeStep.narration[Math.min(narrationIdx, activeStep.narration.length - 1)];

  const progressPercent = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* ── Active agent badge ─────────────────────────────────────────── */}
        <View style={styles.agentBadge}>
          <Text style={styles.agentBadgeLabel}>ACTIVE AGENT</Text>
          <Text style={styles.agentBadgeName}>
            {complete ? '✅  All Agents Done' : activeStep.agentName}
          </Text>
        </View>

        {/* ── Pulsing icon ───────────────────────────────────────────────── */}
        <Animated.View style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.activeIcon}>{complete ? '✅' : activeStep.icon}</Text>
        </Animated.View>

        <Text style={styles.title}>
          {complete ? 'Match Found!' : activeStep.label}
        </Text>

        {/* ── Narration line ─────────────────────────────────────────────── */}
        <Animated.View style={[styles.narrationBox, { opacity: fadeAnim }]}>
          <Text style={styles.narrationText}>{narrationLine}</Text>
        </Animated.View>

        {/* ── Pipeline steps list ────────────────────────────────────────── */}
        <View style={styles.stepsContainer}>
          {PIPELINE.map((step, index) => {
            const isDone    = index < currentStep;
            const isActive  = index === currentStep && !complete;
            const isPending = index > currentStep;

            return (
              <View
                key={step.id}
                style={[
                  styles.stepRow,
                  isActive  && styles.stepRowActive,
                  isDone    && styles.stepRowDone,
                  isPending && styles.stepRowPending,
                ]}
              >
                {/* Status dot */}
                <View style={[
                  styles.stepDot,
                  isDone   && styles.stepDotDone,
                  isActive && styles.stepDotActive,
                ]}>
                  <Text style={[styles.stepDotText, isDone && { color: '#fff' }]}>
                    {isDone ? '✓' : step.id}
                  </Text>
                </View>

                {/* Label */}
                <Text style={[
                  styles.stepLabel,
                  isDone    && styles.stepLabelDone,
                  isActive  && styles.stepLabelActive,
                  isPending && styles.stepLabelPending,
                ]}>
                  {step.icon}  {step.label}
                </Text>

                {/* Agent chip (only active) */}
                {isActive && (
                  <View style={styles.agentChip}>
                    <Text style={styles.agentChipText}>running</Text>
                  </View>
                )}
                {isDone && <Text style={styles.doneCheck}>✅</Text>}
              </View>
            );
          })}
        </View>

        {/* ── Progress bar ───────────────────────────────────────────────── */}
        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, { width: progressPercent }]} />
        </View>
        <Text style={styles.progressLabel}>
          {complete
            ? 'Pipeline complete'
            : `Agent ${currentStep + 1} of ${PIPELINE.length} · ${activeStep.agentName}`}
        </Text>

      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Agent badge
  agentBadge: {
    backgroundColor: COLORS.primaryGlow || COLORS.primary + '22',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    marginBottom: 24,
  },
  agentBadgeLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  agentBadgeName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },

  // Pulsing icon
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.bgCard || '#1a1f2e',
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeIcon: { fontSize: 34 },

  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },

  // Narration box
  narrationBox: {
    backgroundColor: COLORS.bgCard || '#1a1f2e',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: 28,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border || '#2a2f3e',
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  narrationText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent || COLORS.primary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Steps
  stepsContainer: { width: '100%', marginBottom: 24 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 3,
  },
  stepRowActive:  { backgroundColor: COLORS.primaryGlow || COLORS.primary + '18' },
  stepRowDone:    { opacity: 0.65 },
  stepRowPending: { opacity: 0.35 },

  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.bgCard || '#1a1f2e',
    borderWidth: 1.5,
    borderColor: COLORS.border || '#2a2f3e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepDotDone:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepDotActive: { borderColor: COLORS.primary, borderWidth: 2 },
  stepDotText:   { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary },

  stepLabel:        { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  stepLabelActive:  { color: COLORS.textPrimary, fontWeight: '700' },
  stepLabelDone:    { color: COLORS.textSecondary },
  stepLabelPending: { color: COLORS.textMuted || COLORS.textSecondary },

  agentChip: {
    backgroundColor: COLORS.primary + '33',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  agentChipText: { fontSize: 9, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase' },
  doneCheck: { fontSize: 13 },

  // Progress
  progressBg: {
    width: '100%',
    height: 5,
    backgroundColor: COLORS.border || '#2a2f3e',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },

  // Error
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorIcon:  { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: COLORS.danger, marginBottom: 12 },
  errorText:  { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  retryButton:{ fontSize: 16, fontWeight: '600', color: COLORS.primary, padding: 12 },
});
