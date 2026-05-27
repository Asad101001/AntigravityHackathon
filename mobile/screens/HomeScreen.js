import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { COLORS, RADII, SHADOWS } from '../theme';
import LiquidGlass from '../components/LiquidGlass';
import { useTabBarVisibility } from '../components/TabBarVisibility';
import {
  requestMicPermission,
  startRecording,
  stopRecording,
  cancelRecording,
  getMeteringLevel,
} from '../lib/voiceRecorder';
import { transcribeAudio } from '../lib/speechToText';

const SUPPORTED_CITIES = ['Karachi', 'Islamabad', 'Lahore'];

const SERVICES_PAGES = [
  [
    { id: 'ac', label: 'AC Repair', icon: 'snow-outline', urdu: 'اے سی مرمت' },
    { id: 'electrician', label: 'Electrician', icon: 'flash-outline', urdu: 'بجلی کا کام' },
    { id: 'plumber', label: 'Plumber', icon: 'water-outline', urdu: 'پلمبر' },
    { id: 'carpenter', label: 'Carpenter', icon: 'hammer-outline', urdu: 'بڑھئی' },
  ],
  [
    { id: 'painter', label: 'Painter', icon: 'brush-outline', urdu: 'پینٹر' },
    { id: 'cleaning', label: 'Cleaning', icon: 'sparkles-outline', urdu: 'گھر کی صفائی' },
    { id: 'handyman', label: 'Handyman', icon: 'construct-outline', urdu: 'عام مرمت' },
    { id: 'mechanic', label: 'Mechanic', icon: 'car-outline', urdu: 'گاڑی کی سروس' },
  ],
  [
    { id: 'pest', label: 'Pest Control', icon: 'bug-outline', urdu: 'پیسٹ کنٹرول' },
    { id: 'appliance', label: 'Appliance Repair', icon: 'tv-outline', urdu: 'آلات کی مرمت' },
    { id: 'sanitization', label: 'Sanitization', icon: 'shield-checkmark-outline', urdu: 'سینیٹائزیشن' },
    { id: 'gardening', label: 'Gardening', icon: 'leaf-outline', urdu: 'باغبانی' },
  ]
];

const MAX_RECORD_SECONDS = 30;
const WAVE_BAR_COUNT = 14;

// ── Voice Recording Modal (Fully Functional) ──────────────────────────────
function VoiceModal({ visible, onClose, onResult }) {
  // States: 'idle' | 'recording' | 'processing' | 'success' | 'error'
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [recordDuration, setRecordDuration] = useState(0);
  const [waveLevels, setWaveLevels] = useState(new Array(WAVE_BAR_COUNT).fill(0.15));
  const [detectedLang, setDetectedLang] = useState('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0.4)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const durationTimerRef = useRef(null);
  const meteringTimerRef = useRef(null);
  const autoStopTimerRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setPhase('idle');
      setError('');
      setTranscribedText('');
      setRecordDuration(0);
      setDetectedLang('');
      setWaveLevels(new Array(WAVE_BAR_COUNT).fill(0.15));
      successScale.setValue(0);
    } else {
      // Cleanup timers when modal closes
      clearInterval(durationTimerRef.current);
      clearInterval(meteringTimerRef.current);
      clearTimeout(autoStopTimerRef.current);
    }
  }, [visible]);

  // Pulse animation — runs during recording and processing
  useEffect(() => {
    if (phase === 'recording' || phase === 'processing') {
      const speed = phase === 'recording' ? 600 : 400;
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: speed, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: speed, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, { toValue: 1, duration: speed + 200, useNativeDriver: true }),
          Animated.timing(ringAnim, { toValue: 0.3, duration: speed + 200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      ringAnim.stopAnimation();
      pulseAnim.setValue(1);
      ringAnim.setValue(0.4);
    }
  }, [phase]);

  // Success animation
  useEffect(() => {
    if (phase === 'success') {
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
    }
  }, [phase]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Start recording ──────────────────────────────────────────────────────
  const handleStartRecording = useCallback(async () => {
    try {
      const hasPermission = await requestMicPermission();
      if (!hasPermission) {
        setError('Microphone permission is required for voice input');
        setPhase('error');
        return;
      }

      await startRecording();
      setPhase('recording');
      setRecordDuration(0);
      setError('');

      // Duration counter
      durationTimerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);

      // Audio metering for waveform visualization
      meteringTimerRef.current = setInterval(async () => {
        const level = await getMeteringLevel();
        setWaveLevels(prev => {
          const next = [...prev.slice(1)];
          // Normalize metering (dB: typically -160 to 0) to 0.05–1.0 range
          const normalized = level != null ? Math.max(0.05, Math.min(1, (level + 60) / 60)) : 0.1;
          next.push(normalized);
          return next;
        });
      }, 120);

      // Auto-stop after MAX_RECORD_SECONDS
      autoStopTimerRef.current = setTimeout(() => {
        handleStopRecording();
      }, MAX_RECORD_SECONDS * 1000);

    } catch (err) {
      console.error('[VoiceModal] Start recording error:', err);
      setError('Could not start recording. Please try again.');
      setPhase('error');
    }
  }, []);

  // ── Stop recording and transcribe ────────────────────────────────────────
  const handleStopRecording = useCallback(async () => {
    clearInterval(durationTimerRef.current);
    clearInterval(meteringTimerRef.current);
    clearTimeout(autoStopTimerRef.current);

    if (phase !== 'recording') return;
    setPhase('processing');

    try {
      const result = await stopRecording();
      if (!result || !result.base64) {
        throw new Error('Recording failed. Please try again.');
      }
      const { base64, durationMs } = result;

      // Reject very short recordings (< 0.5 seconds)
      if (durationMs < 500) {
        setError('Recording too short. Please hold the button and speak.');
        setPhase('error');
        return;
      }

      // Send to backend for transcription
      const result = await transcribeAudio({
        base64,
        mimeType: 'audio/m4a',
        languageHint: 'auto',
      });

      setTranscribedText(result.text);
      setDetectedLang(result.language === 'ur' ? 'اردو' : result.language === 'ur-roman' ? 'Roman Urdu' : 'English');
      setPhase('success');

    } catch (err) {
      console.error('[VoiceModal] Transcription error:', err);
      setError(err.message || 'Could not transcribe audio. Please try again.');
      setPhase('error');
    }
  }, [phase]);

  // ── Use the transcribed text ─────────────────────────────────────────────
  const handleUseText = useCallback(() => {
    if (transcribedText && onResult) {
      onResult(transcribedText);
    }
    onClose();
  }, [transcribedText, onResult, onClose]);

  // ── Close handler — cancel any in-progress recording ─────────────────────
  const handleClose = useCallback(async () => {
    clearInterval(durationTimerRef.current);
    clearInterval(meteringTimerRef.current);
    clearTimeout(autoStopTimerRef.current);
    if (phase === 'recording') {
      await cancelRecording();
    }
    onClose();
  }, [phase, onClose]);

  // ── Determine icon, color, and labels per phase ──────────────────────────
  const micColor = phase === 'recording' ? '#DC2626' : phase === 'processing' ? '#D97706' : phase === 'success' ? '#16A34A' : COLORS.primary;
  const micIcon = phase === 'recording' ? 'stop' : phase === 'processing' ? 'hourglass-outline' : phase === 'success' ? 'checkmark' : 'mic';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose}>
      <View style={voiceStyles.overlay}>
        <View style={voiceStyles.card}>
          <TouchableOpacity style={voiceStyles.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Ring animation */}
          {(phase === 'recording' || phase === 'processing') && (
            <Animated.View style={[voiceStyles.ring, { borderColor: micColor, opacity: ringAnim, transform: [{ scale: pulseAnim }] }]} />
          )}

          {/* Mic button / indicator */}
          {phase === 'idle' ? (
            <TouchableOpacity
              style={[voiceStyles.micCircle, { backgroundColor: micColor }]}
              onPress={handleStartRecording}
              activeOpacity={0.8}
            >
              <Ionicons name="mic" size={36} color="#FFFFFF" />
            </TouchableOpacity>
          ) : phase === 'recording' ? (
            <TouchableOpacity
              style={[voiceStyles.micCircle, { backgroundColor: micColor }]}
              onPress={handleStopRecording}
              activeOpacity={0.8}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Ionicons name="stop" size={32} color="#FFFFFF" />
              </Animated.View>
            </TouchableOpacity>
          ) : phase === 'processing' ? (
            <Animated.View style={[voiceStyles.micCircle, { backgroundColor: micColor, transform: [{ scale: pulseAnim }] }]}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </Animated.View>
          ) : phase === 'success' ? (
            <Animated.View style={[voiceStyles.micCircle, { backgroundColor: micColor, transform: [{ scale: successScale }] }]}>
              <Ionicons name="checkmark" size={38} color="#FFFFFF" />
            </Animated.View>
          ) : (
            <View style={[voiceStyles.micCircle, { backgroundColor: '#DC2626' }]}>
              <Ionicons name="alert" size={34} color="#FFFFFF" />
            </View>
          )}

          {/* Phase-specific content */}
          {phase === 'idle' && (
            <>
              <Text style={voiceStyles.title}>Tap to Speak</Text>
              <Text style={voiceStyles.subtitle}>
                Say your request in English, Urdu, or Roman Urdu{'\n'}
                e.g. "Mujhe Gulshan mein plumber chahiye"
              </Text>
              <View style={voiceStyles.langRow}>
                <View style={voiceStyles.langChip}><Text style={voiceStyles.langChipText}>English</Text></View>
                <View style={voiceStyles.langChip}><Text style={voiceStyles.langChipText}>اردو</Text></View>
                <View style={voiceStyles.langChip}><Text style={voiceStyles.langChipText}>Roman Urdu</Text></View>
              </View>
            </>
          )}

          {phase === 'recording' && (
            <>
              <Text style={[voiceStyles.title, { color: '#DC2626' }]}>Listening...</Text>
              <Text style={voiceStyles.duration}>{formatDuration(recordDuration)}</Text>

              {/* Live waveform visualization */}
              <View style={voiceStyles.waveRow}>
                {waveLevels.map((h, i) => (
                  <View key={i} style={[voiceStyles.waveBar, { height: Math.max(4, 36 * h), backgroundColor: micColor, opacity: 0.4 + h * 0.6 }]} />
                ))}
              </View>

              <Text style={voiceStyles.hint}>Tap the red button to stop recording</Text>
            </>
          )}

          {phase === 'processing' && (
            <>
              <Text style={[voiceStyles.title, { color: '#D97706' }]}>Processing...</Text>
              <Text style={voiceStyles.subtitle}>
                Transcribing your voice with Gemini AI{'\n'}
                This takes just a moment
              </Text>
            </>
          )}

          {phase === 'success' && (
            <>
              <Text style={[voiceStyles.title, { color: '#16A34A' }]}>Got it!</Text>
              {detectedLang ? (
                <View style={[voiceStyles.langChip, { alignSelf: 'center', marginBottom: 8, backgroundColor: 'rgba(22,163,74,0.1)', borderColor: 'rgba(22,163,74,0.2)' }]}>
                  <Text style={[voiceStyles.langChipText, { color: '#16A34A' }]}>
                    <Ionicons name="language-outline" size={12} color="#16A34A" /> {detectedLang}
                  </Text>
                </View>
              ) : null}
              <View style={voiceStyles.transcriptBox}>
                <Text style={voiceStyles.transcriptText}>"{transcribedText}"</Text>
              </View>
              <TouchableOpacity style={voiceStyles.useBtn} onPress={handleUseText} activeOpacity={0.82}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={voiceStyles.useBtnText}>Use This Text</Text>
              </TouchableOpacity>
              <TouchableOpacity style={voiceStyles.retryBtn} onPress={() => setPhase('idle')} activeOpacity={0.82}>
                <Ionicons name="refresh" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={voiceStyles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </>
          )}

          {phase === 'error' && (
            <>
              <Text style={[voiceStyles.title, { color: '#DC2626' }]}>Oops!</Text>
              <Text style={[voiceStyles.subtitle, { color: '#DC2626' }]}>{error}</Text>
              <TouchableOpacity style={voiceStyles.retryBtn} onPress={() => setPhase('idle')} activeOpacity={0.82}>
                <Ionicons name="refresh" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={voiceStyles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const voiceStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(9,38,22,0.55)', justifyContent: 'center', alignItems: 'center' },
  card: { width: '86%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, alignItems: 'center', ...SHADOWS.elevated },
  closeBtn: { position: 'absolute', top: 14, right: 14, padding: 6, zIndex: 10 },
  ring: { position: 'absolute', top: 30, width: 110, height: 110, borderRadius: 55, borderWidth: 3 },
  micCircle: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18, ...SHADOWS.card,
  },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 6, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, fontWeight: '600', marginBottom: 8 },
  duration: { fontSize: 32, fontWeight: '900', color: '#DC2626', fontVariant: ['tabular-nums'], marginBottom: 8, letterSpacing: 1 },
  waveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, marginVertical: 14, height: 40 },
  waveBar: { width: 4, borderRadius: 2, minHeight: 4 },
  hint: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontWeight: '700', marginTop: 4, marginBottom: 8 },
  langRow: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 4 },
  langChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(14,143,70,0.08)', borderWidth: 1, borderColor: 'rgba(14,143,70,0.12)',
  },
  langChipText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  transcriptBox: {
    width: '100%', backgroundColor: '#F5FBF7', borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(22,163,74,0.2)',
    padding: 16, marginBottom: 16, marginTop: 4,
  },
  transcriptText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 24, textAlign: 'center' },
  useBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 13,
    borderRadius: 999, marginBottom: 10, ...SHADOWS.card,
  },
  useBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(14,143,70,0.08)', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 999,
  },
  retryBtnText: { color: COLORS.primary, fontWeight: '900', fontSize: 13 },
});

export default function HomeScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { registerScroll } = useTabBarVisibility();
  const [text, setText] = useState('');
  const [pickedLocation, setPickedLocation] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Karachi');
  const [cityOpen, setCityOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const carouselOpacity = useRef(new Animated.Value(1)).current;

  const switchPage = useCallback((nextPage) => {
    Animated.timing(carouselOpacity, {
      toValue: 0,
      duration: 90,
      useNativeDriver: true,
    }).start(() => {
      setCurrentPage(nextPage);
      Animated.timing(carouselOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  }, [carouselOpacity]);

  // Autoplay popular services carousel every 3.5 seconds
  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => {
      setCurrentPage(prev => {
        const next = (prev + 1) % SERVICES_PAGES.length;
        // Trigger the crossfade; state update happens via setCurrentPage inside switchPage
        Animated.timing(carouselOpacity, { toValue: 0, duration: 90, useNativeDriver: true }).start(() => {
          setCurrentPage(next);
          Animated.timing(carouselOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
        });
        return prev;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, [autoplay, carouselOpacity]);

  const handleDotPress = useCallback((index) => {
    setAutoplay(false);
    switchPage(index);
  }, [switchPage]);

  // GPS on mount
  useEffect(() => {
    (async () => {
      if (route.params?.pickedLocation) {
        setPickedLocation(route.params.pickedLocation);
        return;
      }

      setGpsLoading(true);
      setGpsError(false);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setGpsError(true);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        });

        let label = `${selectedCity}, Pakistan`;
        try {
          const geo = await Location.reverseGeocodeAsync({
            latitude:  loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          const first = geo?.[0];
          if (first) {
            const parts = [first.district, first.subregion, first.city].filter(Boolean);
            if (parts.length) label = parts.slice(0, 2).join(', ');
          }
        } catch (_) {}

        setPickedLocation({
          lat:   loc.coords.latitude,
          lng:   loc.coords.longitude,
          label,
        });
      } catch (err) {
        console.warn('[HomeScreen] GPS error:', err.message);
        setGpsError(true);
      } finally {
        setGpsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (route.params?.pickedLocation) {
      setPickedLocation(route.params.pickedLocation);
    }
  }, [route.params?.pickedLocation]);

  const locationLabel = gpsLoading
    ? 'Detecting location…'
    : gpsError
    ? `${selectedCity} (GPS unavailable)`
    : pickedLocation?.label || `${selectedCity}, Pakistan`;

  const handleSend = useCallback(() => {
    const userText = text.trim();
    if (!userText) return;
    navigation.navigate('Loading', {
      userText,
      userLocation:   pickedLocation,
      locationSource: pickedLocation ? 'gps' : 'typed',
      city: selectedCity,
    });
  }, [text, pickedLocation, selectedCity, navigation]);

  const prefill = useCallback((label) => {
    setText(`${label} needed`);
  }, []);

  return (
    <View style={styles.background}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 98, paddingBottom: insets.bottom + 140 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={Platform.OS === 'ios'}
          overScrollMode="never"
          decelerationRate="fast"
          onScroll={registerScroll}
          scrollEventThrottle={16}
        >
          {/* Location Pillar Row */}
          <View style={styles.locationContainer}>
            <View style={styles.cityDropdownWrapper}>
              <TouchableOpacity
                style={styles.cityDropdownTrigger}
                onPress={() => setCityOpen(v => !v)}
                activeOpacity={0.84}
              >
                <Text style={styles.selectedCityText}>{selectedCity}</Text>
                <Ionicons name="chevron-down" size={13} color={COLORS.primary} style={{ marginLeft: 3 }} />
              </TouchableOpacity>
              
              {cityOpen && (
                <View style={styles.cityOverlayMenu}>
                  {SUPPORTED_CITIES.map(city => (
                    <TouchableOpacity
                      key={city}
                      style={[styles.cityOverlayOption, city === selectedCity && styles.cityOverlayOptionActive]}
                      onPress={() => { setSelectedCity(city); setCityOpen(false); }}
                      activeOpacity={0.82}
                    >
                      <Text style={[styles.cityOverlayText, city === selectedCity && styles.cityOverlayTextActive]}>
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.pillarLine} />

            <TouchableOpacity
              style={styles.fetchedLocationCol}
              onPress={() => navigation.navigate('LocationPicker', { pickedLocation })}
              activeOpacity={0.84}
            >
              <Ionicons name="location" size={14} color={COLORS.primary} style={{ marginRight: 5 }} />
              <Text style={styles.fetchedLocationText} numberOfLines={1}>
                {locationLabel}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Centerpiece text input field - Primary Visual Focus */}
          <View style={styles.requestBoxFocus}>
            <Ionicons name="search" size={22} color={COLORS.primary} style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder="What service do you need today?"
              placeholderTextColor={COLORS.textMuted}
              value={text}
              onChangeText={setText}
              maxLength={200}
            />
            {text.trim() ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSend}
                activeOpacity={0.82}
              >
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: 'rgba(14,143,70,0.1)' }]}
                onPress={() => setVoiceOpen(true)}
                activeOpacity={0.82}
              >
                <Ionicons name="mic" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Popular Services Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Services</Text>
          </View>

          {/* Service Carousel Component */}
          <View style={styles.carouselContainer}>
            <Animated.View style={[styles.grid2x2, { opacity: carouselOpacity }]}>
              {SERVICES_PAGES[currentPage].map(service => {
                const scaleAnim = new Animated.Value(1);
                return (
                  <Animated.View key={service.id} style={{ width: '48%', transform: [{ scale: scaleAnim }] }}>
                    <TouchableOpacity
                      style={styles.serviceCard}
                      onPress={() => prefill(service.label)}
                      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
                      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start()}
                      activeOpacity={1}
                    >
                      <View style={styles.serviceIconContainer}>
                        <Ionicons name={service.icon} size={28} color={COLORS.primary} />
                      </View>
                      <Text style={styles.serviceLabel}>{service.label}</Text>
                      <Text style={styles.serviceUrdu}>{service.urdu}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </Animated.View>

            {/* Dynamic Pagination Dots with Generous Click Target Size */}
            <View style={styles.paginationContainer}>
              {SERVICES_PAGES.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.paginationDotTouchable}
                  onPress={() => handleDotPress(index)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <View
                    style={[
                      styles.paginationDot,
                      currentPage === index && styles.paginationDotActive
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Exclusive Offers ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exclusive Offers</Text>
          </View>

          {/* Promo Card 1: Summer Cooling Promo */}
          <LiquidGlass style={styles.promoPanel} contentStyle={styles.promoContent} strong radius={RADII.md}>
            <View style={styles.promoLeft}>
              <Text style={styles.promoKicker}>Summer Cooling Promo</Text>
              <Text style={styles.promoText}>
                Get 20% off all AC maintenance services this month. Stay cool and beat the heat with our expert services.
              </Text>
              <TouchableOpacity style={styles.promoButton} activeOpacity={0.84} onPress={() => prefill('AC Repair')}>
                <Text style={styles.promoButtonText}>Book Now</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.promoRight} pointerEvents="none">
              <Ionicons name="snow-outline" size={88} color="rgba(14,143,70,0.08)" style={styles.snowflakeWatermark} />
            </View>
          </LiquidGlass>

          {/* Promo Card 2: Home Makeover Promo */}
          <LiquidGlass style={styles.promoPanel} contentStyle={[styles.promoContent, styles.promoDarkBackground]} strong radius={RADII.md}>
            <View style={styles.promoLeft}>
              <Text style={[styles.promoKicker, styles.promoDarkKicker]}>Home Makeover Deal</Text>
              <Text style={[styles.promoText, styles.promoDarkText]}>
                Save 15% on professional painting & carpentry. Refresh your space and transform your home today.
              </Text>
              <TouchableOpacity style={[styles.promoButton, styles.promoDarkButton]} activeOpacity={0.84} onPress={() => prefill('Painter')}>
                <Text style={styles.promoDarkButtonText}>Explore Deal</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.promoRight} pointerEvents="none">
              <Ionicons name="brush-outline" size={88} color="rgba(255,255,255,0.05)" style={styles.snowflakeWatermark} />
            </View>
          </LiquidGlass>

          {/* Promo Card 3: Quick Fix Friday */}
          <LiquidGlass style={styles.promoPanel} contentStyle={[styles.promoContent, styles.promoGoldBackground]} strong radius={RADII.md}>
            <View style={styles.promoLeft}>
              <Text style={[styles.promoKicker, styles.promoGoldKicker]}>Deep Home Spa Cleaning</Text>
              <Text style={styles.promoText}>
                Get a deep home cleaning & sanitization with a complimentary disinfection upgrade. Limited availability!
              </Text>
              <TouchableOpacity style={styles.promoButton} activeOpacity={0.84} onPress={() => prefill('Cleaning')}>
                <Text style={styles.promoButtonText}>Claim Now</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.promoRight} pointerEvents="none">
              <Ionicons name="sparkles-outline" size={88} color="rgba(14,143,70,0.06)" style={styles.snowflakeWatermark} />
            </View>
          </LiquidGlass>

        </ScrollView>
      </KeyboardAvoidingView>
      <VoiceModal visible={voiceOpen} onClose={() => setVoiceOpen(false)} onResult={(transcribed) => setText(transcribed)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1 },
  background: { flex: 1, backgroundColor: COLORS.bg },
  content:    { paddingHorizontal: 18 },

  // Location selector styles
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
    borderRadius: RADII.sm,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.06)',
    marginTop: 18,
    marginBottom: 18,
    zIndex: 10,
    ...SHADOWS.card,
  },
  cityDropdownWrapper: {
    position: 'relative',
    minWidth: 80,
  },
  cityDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  selectedCityText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  cityOverlayMenu: {
    position: 'absolute',
    top: 30,
    left: -6,
    width: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: RADII.xs,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.1)',
    zIndex: 99,
    shadowColor: '#0E8F46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cityOverlayOption: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: RADII.xs,
  },
  cityOverlayOptionActive: {
    backgroundColor: '#EAF8EF',
  },
  cityOverlayText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  cityOverlayTextActive: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  pillarLine: {
    width: 1.5,
    height: 16,
    backgroundColor: 'rgba(14,143,70,0.12)',
    marginHorizontal: 8,
  },
  fetchedLocationCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fetchedLocationText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },

  // Focus centerpiece search input box
  requestBoxFocus: {
    minHeight: 64,
    borderRadius: RADII.md,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.26)',
    marginBottom: 26,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 54,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.42,
  },

  // Section Header styles
  sectionHeader: {
    marginTop: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  // Carousel & Grid styles
  carouselContainer: {
    marginBottom: 16,
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  serviceCard: {
    width: '100%',
    aspectRatio: 1.22,
    borderRadius: RADII.md,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.05)',
    ...SHADOWS.card,
  },
  serviceIconContainer: {
    width: 52,
    height: 52,
    borderRadius: RADII.sm,
    backgroundColor: '#EAF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceLabel: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 20,
  },
  serviceUrdu: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  // Dots Pagination styles
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    gap: 2,
  },
  paginationDotTouchable: {
    padding: 12, // Generous padding click target!
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(14,143,70,0.18)',
  },
  paginationDotActive: {
    width: 16,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },

  // Promo Card styles
  promoPanel: {
    marginTop: 6,
    marginBottom: 14,
  },
  promoContent: {
    padding: 16,
    flexDirection: 'row',
    backgroundColor: '#EAF8EF',
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.14)',
    borderRadius: RADII.md,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  promoDarkBackground: {
    backgroundColor: '#0B2A18', // Deep forest/black tone for elegant visual contrast
    borderColor: 'rgba(14,143,70,0.36)',
  },
  promoGoldBackground: {
    backgroundColor: '#F5FBF7',
    borderWidth: 1.5,
    borderColor: 'rgba(217,119,6,0.22)', // subtle warm gold accent
  },
  promoLeft: {
    flex: 2,
    justifyContent: 'center',
  },
  promoKicker: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  promoDarkKicker: {
    color: '#34D399', // Mint green highlight
  },
  promoGoldKicker: {
    color: '#D97706', // warm amber highlight
  },
  promoText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    marginBottom: 12,
  },
  promoDarkText: {
    color: '#A7F3D0',
  },
  promoButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.xs,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  promoDarkButton: {
    backgroundColor: '#34D399',
  },
  promoDarkButtonText: {
    color: '#0B2A18',
    fontSize: 11,
    fontWeight: '900',
  },
  promoButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  promoRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    position: 'relative',
  },
  snowflakeWatermark: {
    position: 'absolute',
    right: -10,
    bottom: -16,
    opacity: 0.8,
  },
});