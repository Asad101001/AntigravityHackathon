import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADII } from '../theme';
import apiClient from '../lib/apiClient';
import { sendLocalNotification } from '../notifications';
import LiquidGlass from '../components/LiquidGlass';
import { useAppContext } from '../context/AppContext';

// Pipeline definition — each step has rotating narration lines that simulate the agent "thinking aloud"
const PIPELINE = [
  {
    id: 1,
    label: 'Parsing Intent',
    icon: 'brain',
    agentName: 'LLMIntentParserAgent',
    narration: [
      'Tokenising request...',
      'Detecting language mix...',
      'Extracting service & urgency...',
      'Intent vector locked ✓',
    ],
  },
  {
    id: 2,
    label: 'Resolving Location',
    icon: 'location',
    agentName: 'LocationResolverAgent',
    narration: [
      'Checking area tags...',
      'Matching service-area map...',
      'Location context confirmed ✓',
    ],
  },
  {
    id: 3,
    label: 'Discovering Providers',
    icon: 'search',
    agentName: 'ProviderDiscoveryAgent',
    narration: [
      'Querying verified network...',
      'Filtering availability slots...',
      'Candidate pool assembled ✓',
    ],
  },
  {
    id: 4,
    label: 'Ranking & Reasoning',
    icon: 'bar-chart',
    agentName: 'LLMRankerAgent',
    narration: [
      'Weighing distance & ratings...',
      'Factoring urgency scoring...',
      'Best match identified ✓',
    ],
  },
  {
    id: 5,
    label: 'Selecting Provider',
    icon: 'checkmark-done-circle',
    agentName: 'DecisionMakerAgent',
    narration: [
      'Applying hard constraints...',
      'Selecting top recommendation...',
      'Decision ready ✓',
    ],
  },
  {
    id: 6,
    label: 'Dynamic Pricing',
    icon: 'cash',
    agentName: 'DynamicPricingAgent',
    narration: [
      'Calculating surcharges...',
      'Assembling quote breakdown...',
      'Quote finalised ✓',
    ],
  },
  {
    id: 7,
    label: 'Executing Booking',
    icon: 'document-text',
    agentName: 'BookingExecutorAgent',
    narration: [
      'Reserving provider slot...',
      'Writing booking ledger...',
      'Booking confirmed ✓',
    ],
  },
  {
    id: 8,
    label: 'Scheduling Follow-up',
    icon: 'notifications',
    agentName: 'FollowUpManagerAgent',
    narration: [
      'Preparing reminders...',
      'Queueing alerts...',
      'Follow-up active ✓',
    ],
  },
];

// Speed Up Simulation: Narrations update very rapidly (200ms per tick) to feel blazing fast
const NARRATION_TICK_MS = 200;

export default function LoadingScreen({ route, navigation }) {
  const { userText, userLocation, locationSource, city } = route.params;
  const { cacheExecutionLogs } = useAppContext();

  const [currentStep, setCurrentStep] = useState(0);   // 0-based pipeline index
  const [narrationIdx, setNarrationIdx] = useState(0); // which sub-message
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(null);

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Refs so callbacks always see latest values
  const currentStepRef = useRef(0);
  const narrationIdxRef = useRef(0);
  const apiDoneRef = useRef(false);
  const apiResultRef = useRef(null);

  // Bouncing dots animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Pulse active icon scale
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Narration ticker - super fast cycles for blazing-fast feedback feel
  useEffect(() => {
    const tick = setInterval(() => {
      const step = currentStepRef.current;
      if (step >= PIPELINE.length) return;

      const maxNarration = PIPELINE[step].narration.length;
      const nextIdx = narrationIdxRef.current + 1;

      if (nextIdx < maxNarration) {
        narrationIdxRef.current = nextIdx;
        setNarrationIdx(nextIdx);
      } else if (apiDoneRef.current) {
        // If API is already finished, advance to the next step immediately
        advanceStep();
      } else {
        // If API is not done, keep looping the narration so it remains alive
        narrationIdxRef.current = 0;
        setNarrationIdx(0);
      }
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
      duration: 150,
      useNativeDriver: false,
    }).start();

    if (next >= PIPELINE.length) {
      setComplete(true);
      setTimeout(() => resolveNavigation(apiResultRef.current), 300);
    }
  };

  // Trigger rapid updates once API resolves
  useEffect(() => {
    void callAPI();
  }, []);

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
        { timeout: 25000 }
      );

      apiResultRef.current = response.data;
      apiDoneRef.current   = true;

      if (response.data?.success) {
        // Cache execution_logs by booking_id so navigation params stay lean
        if (response.data?.booking_id && response.data?.execution_logs) {
          cacheExecutionLogs(response.data.booking_id, response.data.execution_logs);
        }

        void sendLocalNotification(
          'Provider match found',
          `${response.data.provider?.name || 'A provider'} is ready for your ${response.data.provider?.service || 'service'} request.`,
          { booking_id: response.data.booking_id || null, event: 'provider_match' }
        );
      }

      // Fast-forward simulated steps since backend result is immediately ready
      const fastInterval = setInterval(() => {
        if (currentStepRef.current >= PIPELINE.length) {
          clearInterval(fastInterval);
        } else {
          advanceStep();
        }
      }, 180); // zip through rapidly

    } catch (err) {
      console.error('API Error:', err);
      const backendMessage = err.response?.data?.message || err.response?.data?.error;
      const errorMessage = backendMessage || (
        err.message === 'Network Error'
          ? `Cannot connect to server at ${API_URL}. Check that the backend is running.`
          : `Error: ${err.message}`
      );
      setError(errorMessage);
    }
  };

  const resolveNavigation = (data) => {
    if (!data) return;

    // Strip execution_logs from params — they are cached in AppContext
    const sanitizedResult = { ...data };
    delete sanitizedResult.execution_logs;

    if (sanitizedResult.success === false && sanitizedResult.error_type === 'low_confidence') {
      navigation.replace('IntentConfirm', { parsedIntent: sanitizedResult.parsed || {}, fullResult: sanitizedResult });
    } else if (sanitizedResult.success === false) {
      setError(sanitizedResult.message || 'No providers found. Try a different area.');
    } else {
      navigation.replace('IntentConfirm', { parsedIntent: sanitizedResult.parsed_intent, fullResult: sanitizedResult });
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <View style={styles.errorBox}>
          <Ionicons name="warning" size={48} color={COLORS.danger} style={{ marginBottom: 16 }} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              apiDoneRef.current = false;
              apiResultRef.current = null;
              currentStepRef.current = 0;
              narrationIdxRef.current = 0;
              setCurrentStep(0);
              setNarrationIdx(0);
              setComplete(false);
              void callAPI();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>↺ Retry Matching Request</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: 'transparent', marginTop: 8 }]} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={[styles.retryButtonText, { color: COLORS.textSecondary }]}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeStep = PIPELINE[Math.min(currentStep, PIPELINE.length - 1)];
  const currentNarration = complete
    ? 'All agents completed ✓'
    : activeStep.narration[Math.min(narrationIdx, activeStep.narration.length - 1)];

  const progressPercent = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Animate dots bouncing scale
  const dotScale1 = bounceAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });
  const dotScale2 = bounceAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.4, 1] });
  const dotScale3 = bounceAnim.interpolate({ inputRange: [0, 1], outputRange: [1.4, 1] });

  return (
    <SafeAreaView style={styles.container}>
      {/* Soft Premium Background Tones */}
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />

      <View style={styles.content}>
        {/* Floating AI Agent Execution Card */}
        <View style={styles.card}>
          
          {/* Top Brain/Gear Square Container */}
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
            <MaterialCommunityIcons name="brain" size={32} color={COLORS.primary} />
          </Animated.View>

          {/* Heading */}
          <Text style={styles.cardHeading}>Understanding your request...</Text>

          {/* Animating Bouncing Dots */}
          <View style={styles.dotsContainer}>
            <Animated.View style={[styles.dot, { transform: [{ scale: dotScale1 }] }]} />
            <Animated.View style={[styles.dot, { transform: [{ scale: dotScale2 }] }]} />
            <Animated.View style={[styles.dot, { transform: [{ scale: dotScale3 }] }]} />
          </View>

          {/* Sleek Horizontal Progress Bar */}
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressPercent }]} />
            </View>
          </View>

          {/* Rotational Narration subtext */}
          <View style={styles.narrationBox}>
            <Text style={styles.narrationText}>{currentNarration}</Text>
          </View>

          {/* Checklist of Pipeline Steps */}
          <View style={styles.checklistContainer}>
            {PIPELINE.map((step, index) => {
              const isDone = index < currentStep;
              const isActive = index === currentStep && !complete;
              const isPending = index > currentStep;

              return (
                <View
                  key={step.id}
                  style={[
                    styles.checkRow,
                    isActive && styles.checkRowActive,
                    isDone && styles.checkRowDone,
                  ]}
                >
                  <Ionicons
                    name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={
                      isDone
                        ? COLORS.primary
                        : isActive
                        ? 'rgba(14,143,70,0.6)'
                        : 'rgba(14,143,70,0.18)'
                    }
                    style={styles.checkIcon}
                  />
                  <Text
                    style={[
                      styles.checkLabel,
                      isDone && styles.checkLabelDone,
                      isActive && styles.checkLabelActive,
                      isPending && styles.checkLabelPending,
                    ]}
                  >
                    {step.label}
                  </Text>

                  {isActive && (
                    <View style={styles.runningBadge}>
                      <Text style={styles.runningBadgeText}>active</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Card Footer Info */}
          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterText}>
              {complete
                ? 'Request verified successfully ✓'
                : `Agent ${Math.min(currentStep + 1, PIPELINE.length)} of ${PIPELINE.length} · ${activeStep.agentName}`}
            </Text>
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FCFA', // Soft off-white mint
  },
  // Ambient gradients
  ambientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: '#EFF6FF', // Soft ice blue
    opacity: 0.7,
  },
  ambientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '35%',
    backgroundColor: '#EAF8EF', // Soft mint tint
    opacity: 0.6,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Premium floating card
  card: {
    width: '100%',
    maxHeight: '84%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // Matches modern styling guidelines
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.1)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 8,
  },

  // Icon container at the top
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#EAF8EF', // soft green backdrop
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.12)',
  },

  // Typography
  cardHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0B2A18', // forest black/dark green contrast color
    textAlign: 'center',
    letterSpacing: -0.2,
  },

  // Dots
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },

  // Horizontal progress bar
  progressBarWrapper: {
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(14,143,70,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },

  // Rotating Narration Text box
  narrationBox: {
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  narrationText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Checklist
  checklistContainer: {
    width: '100%',
    marginBottom: 10,
    gap: 2,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
    backgroundColor: 'transparent',
  },
  checkRowActive: {
    backgroundColor: '#EAF8EF', // active row highlight
  },
  checkRowDone: {
    opacity: 0.9,
  },
  checkIcon: {
    marginRight: 12,
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  checkLabelActive: {
    color: '#0B2A18',
    fontWeight: '900',
  },
  checkLabelDone: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  checkLabelPending: {
    color: 'rgba(81,100,90,0.46)',
  },
  runningBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  runningBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  // Footer
  cardFooter: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(14,143,70,0.06)',
    paddingTop: 12,
    alignItems: 'center',
  },
  cardFooterText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
  },

  // Error States
  errorContainer: {
    flex: 1,
    backgroundColor: '#F9FCFA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(220,38,38,0.12)',
    ...SHADOWS.card,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.danger,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
