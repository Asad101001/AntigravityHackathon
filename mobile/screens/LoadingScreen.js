/**
 * LoadingScreen.js — Tasks 14.7 & 14.8
 * 14.7: All pipeline emojis replaced with Ionicons vector icons.
 * 14.8: Warp-speed mode — once API resolves, remaining steps complete
 *       at 120ms/step instead of 900ms, compressing 35s → ~2.5s.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, API_URL } from '../config';
import apiClient from '../lib/apiClient';
import { sendLocalNotification } from '../notifications';

// ── 14.7: Pipeline with Ionicons — no emojis ─────────────────────────────────
const PIPELINE = [
  {
    id: 1, label: 'Parsing Intent',
    icon: 'bulb-outline', iconColor: '#7C3AED', agentName: 'LLMIntentParserAgent',
    narration: [
      'Tokenising your request...',
      'Detecting language mix (Urdu/English)...',
      'Extracting service type & urgency...',
      'Resolving price_sensitivity signal...',
      'Intent vector locked',
    ],
  },
  {
    id: 2, label: 'Resolving Location',
    icon: 'location-outline', iconColor: '#0EA5E9', agentName: 'LocationResolverAgent',
    narration: [
      'Checking typed area against the request...',
      'Using picked/current coordinates...',
      'Validating service-area coverage map...',
      'Location context confirmed',
    ],
  },
  {
    id: 3, label: 'Discovering Providers',
    icon: 'search-outline', iconColor: '#10B981', agentName: 'ProviderDiscoveryAgent',
    narration: [
      'Querying verified provider network...',
      'Filtering by specialization match...',
      'Cross-referencing availability windows...',
      'Pulling cancellation_risk scores...',
      'Candidate pool assembled',
    ],
  },
  {
    id: 4, label: 'Ranking & Reasoning',
    icon: 'stats-chart-outline', iconColor: '#F59E0B', agentName: 'LLMRankerAgent',
    narration: [
      'Sending candidate list to LLM...',
      'Weighing distance vs. rating trade-offs...',
      'Factoring urgency_level into score...',
      'Analysing recent_sentiment for each provider...',
      'Evaluating cancellation_risk outliers...',
      'Generating decision reasoning_log...',
      'Best match identified',
    ],
  },
  {
    id: 5, label: 'Selecting Provider',
    icon: 'aperture-outline', iconColor: '#EF4444', agentName: 'DecisionMakerAgent',
    narration: [
      'Applying hard constraints...',
      'Checking verification and available slots...',
      'Selecting the safest recommendation...',
      'Decision explanation ready',
    ],
  },
  {
    id: 6, label: 'Dynamic Pricing',
    icon: 'cash-outline', iconColor: '#14B8A6', agentName: 'DynamicPricingAgent',
    narration: [
      'Loading provider base_rate_pkr...',
      'Calculating distance surcharge...',
      'Applying urgency multiplier...',
      'Assembling quote_breakdown...',
      'Quote finalised',
    ],
  },
  {
    id: 7, label: 'Executing Booking',
    icon: 'clipboard-outline', iconColor: '#6366F1', agentName: 'BookingExecutorAgent',
    narration: [
      'Reserving provider time slot...',
      'Writing booking record...',
      'Issuing confirmation ID...',
      'Booking confirmed',
    ],
  },
  {
    id: 8, label: 'Scheduling Follow-up',
    icon: 'notifications-outline', iconColor: '#EC4899', agentName: 'FollowUpManagerAgent',
    narration: [
      'Preparing reminder schedule...',
      'Queueing one-hour service reminder...',
      'Queueing feedback follow-up...',
      'Follow-up plan confirmed',
    ],
  },
];

// 14.8: Tick rates
const NARRATION_TICK_MS  = 900;   // normal pace while API is fetching
const WARP_STEP_MS       = 120;   // warp-speed once API resolves

export default function LoadingScreen({ route, navigation }) {
  const { userText, userLocation, locationSource, city } = route.params;

  const [currentStep, setCurrentStep] = useState(0);
  const [narrationIdx, setNarrationIdx] = useState(0);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(null);

  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const fadeAnim     = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const currentStepRef   = useRef(0);
  const narrationIdxRef  = useRef(0);
  const apiDoneRef       = useRef(false);
  const apiResultRef     = useRef(null);
  const warpModeRef      = useRef(false);  // 14.8: flag for warp mode
  const tickIntervalRef  = useRef(null);

  // ── Pulse animation ──────────────────────────────────────────────────────
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
    startTicker(NARRATION_TICK_MS);
    return () => { if (tickIntervalRef.current) clearInterval(tickIntervalRef.current); };
  }, []);

  const startTicker = (ms) => {
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    tickIntervalRef.current = setInterval(() => {
      const step = currentStepRef.current;
      if (step >= PIPELINE.length) return;

      const maxNarration = PIPELINE[step].narration.length;
      const nextIdx = narrationIdxRef.current + 1;

      if (nextIdx < maxNarration && !warpModeRef.current) {
        // Still narrating this step (only in normal mode)
        narrationIdxRef.current = nextIdx;
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
        setNarrationIdx(nextIdx);
      } else if (apiDoneRef.current || warpModeRef.current) {
        // 14.8: API is done — advance step immediately
        advanceStep();
      }
      // else: hold on last narration line until API resolves
    }, ms);
  };

  // 14.8: Activate warp-speed mode when API resolves
  const activateWarpSpeed = () => {
    if (warpModeRef.current) return;
    warpModeRef.current = true;
    // Restart ticker at 120ms for rapid completion
    startTicker(WARP_STEP_MS);
  };

  const advanceStep = () => {
    const next = currentStepRef.current + 1;
    currentStepRef.current = next;
    narrationIdxRef.current = 0;
    setCurrentStep(next);
    setNarrationIdx(0);

    Animated.timing(progressAnim, {
      toValue: next / PIPELINE.length,
      duration: warpModeRef.current ? 80 : 400,
      useNativeDriver: false,
    }).start();

    if (next >= PIPELINE.length) {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      setComplete(true);
      setTimeout(() => resolveNavigation(apiResultRef.current), 600);
    }
  };

  // ── API call ─────────────────────────────────────────────────────────────
  useEffect(() => { void callAPI(); }, []);

  const callAPI = async () => {
    try {
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

      // 14.8: Immediately enter warp-speed mode — burns through remaining steps in ~120ms each
      activateWarpSpeed();
    } catch (err) {
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

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} style={{ marginBottom: 16 }} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryButton} onPress={() => navigation.goBack()}>← Go Back & Try Again</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeStep    = PIPELINE[Math.min(currentStep, PIPELINE.length - 1)];
  const narrationLine = complete ? 'All agents completed' : activeStep.narration[Math.min(narrationIdx, activeStep.narration.length - 1)];
  const progressPercent = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Active agent badge */}
        <View style={styles.agentBadge}>
          <Text style={styles.agentBadgeLabel}>ACTIVE AGENT</Text>
          <Text style={styles.agentBadgeName}>
            {complete ? 'All Agents Done' : activeStep.agentName}
          </Text>
          {/* 14.8: Warp indicator */}
          {warpModeRef.current && !complete && (
            <View style={styles.warpChip}>
              <Ionicons name="flash" size={10} color="#FFFFFF" />
              <Text style={styles.warpChipText}>WARP</Text>
            </View>
          )}
        </View>

        {/* Pulsing icon — 14.7: Ionicons */}
        <Animated.View style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }], borderColor: complete ? '#16A34A' : (activeStep.iconColor || COLORS.primary) }]}>
          {complete
            ? <Ionicons name="checkmark-circle" size={40} color="#16A34A" />
            : <Ionicons name={activeStep.icon} size={36} color={activeStep.iconColor || COLORS.primary} />
          }
        </Animated.View>

        <Text style={styles.title}>{complete ? 'Match Found!' : activeStep.label}</Text>

        {/* Narration */}
        <Animated.View style={[styles.narrationBox, { opacity: fadeAnim }]}>
          <Text style={styles.narrationText}>{narrationLine}</Text>
        </Animated.View>

        {/* Pipeline steps — 14.7: Ionicons in each row */}
        <View style={styles.stepsContainer}>
          {PIPELINE.map((step, index) => {
            const isDone    = index < currentStep;
            const isActive  = index === currentStep && !complete;
            const isPending = index > currentStep;

            return (
              <View
                key={step.id}
                style={[styles.stepRow, isActive && styles.stepRowActive, isDone && styles.stepRowDone, isPending && styles.stepRowPending]}
              >
                {/* 14.7: Step icon circle with Ionicons */}
                <View style={[styles.stepDot, isDone && styles.stepDotDone, isActive && { borderColor: step.iconColor, borderWidth: 2 }]}>
                  {isDone
                    ? <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                    : <Ionicons name={step.icon} size={12} color={isActive ? step.iconColor : COLORS.textMuted} />
                  }
                </View>

                <Text style={[styles.stepLabel, isDone && styles.stepLabelDone, isActive && styles.stepLabelActive, isPending && styles.stepLabelPending]}>
                  {step.label}
                </Text>

                {isActive && (
                  <View style={[styles.agentChip, { backgroundColor: step.iconColor + '33' }]}>
                    <Text style={[styles.agentChipText, { color: step.iconColor }]}>running</Text>
                  </View>
                )}
                {isDone && <Ionicons name="checkmark-circle" size={16} color="#16A34A" />}
              </View>
            );
          })}
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, { width: progressPercent }]} />
        </View>
        <Text style={styles.progressLabel}>
          {complete
            ? 'Pipeline complete'
            : `Agent ${currentStep + 1} of ${PIPELINE.length} · ${activeStep.agentName}${warpModeRef.current ? ' · warp-speed' : ''}`}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, alignItems: 'center', justifyContent: 'center' },

  agentBadge: { backgroundColor: COLORS.primaryGlow || COLORS.primary + '22', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center', marginBottom: 24, gap: 4 },
  agentBadgeLabel: { fontSize: 9, fontWeight: '900', color: COLORS.primary, letterSpacing: 2, textTransform: 'uppercase' },
  agentBadgeName:  { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },

  // 14.8: Warp chip indicator
  warpChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.primary, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  warpChipText: { fontSize: 9, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },

  iconWrapper: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.bgCard || '#FFFFFF', borderWidth: 2, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },

  title: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 12 },

  narrationBox: { backgroundColor: COLORS.bgCard, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, marginBottom: 28, width: '100%', borderWidth: 1, borderColor: COLORS.border, minHeight: 40, justifyContent: 'center', alignItems: 'center' },
  narrationText: { fontSize: 13, fontWeight: '600', color: COLORS.accent || COLORS.primary, textAlign: 'center', fontStyle: 'italic' },

  stepsContainer: { width: '100%', marginBottom: 24 },
  stepRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, marginBottom: 3 },
  stepRowActive:  { backgroundColor: COLORS.primaryGlow || COLORS.primary + '18' },
  stepRowDone:    { opacity: 0.65 },
  stepRowPending: { opacity: 0.35 },

  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.bgCard || '#FFFFFF', borderWidth: 1.5, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  stepDotDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  stepLabel:        { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  stepLabelActive:  { color: COLORS.textPrimary, fontWeight: '700' },
  stepLabelDone:    { color: COLORS.textSecondary },
  stepLabelPending: { color: COLORS.textMuted },

  agentChip:     { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  agentChipText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

  progressBg:   { width: '100%', height: 5, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressLabel:{ fontSize: 11, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },

  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: COLORS.danger, marginBottom: 12 },
  errorText:  { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  retryButton:{ fontSize: 16, fontWeight: '600', color: COLORS.primary, padding: 12 },
});