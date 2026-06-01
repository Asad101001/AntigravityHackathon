import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView, Platform, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, SHADOWS, FONTS } from '../theme';
import { addSessionBooking } from '../sessionBookings';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../lib/apiClient';
import LiquidGlass from '../components/LiquidGlass';
import ScreenHeader from '../components/ScreenHeader';
import { useToast } from '../components/Toast';

function getPKTNow() {
  const now = new Date();
  const pktOffset = 5 * 60 * 60 * 1000; // UTC+5
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return new Date(utc + pktOffset);
}

function normalizeBookingStartTime(value) {
  try {
    if (!value) return getPKTNow().toISOString();

    const directDate = new Date(value);
    if (!Number.isNaN(directDate.getTime())) {
      return directDate.toISOString();
    }

    // Handle time-only strings like '10 AM', '10:30 PM', 'Today 4:00 PM'
    const timeMatch = String(value).trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (timeMatch) {
      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2] || '0');
      const period = (timeMatch[3] || '').toUpperCase();

      let normalizedHours = hours;
      if (period === 'PM' && hours < 12) normalizedHours += 12;
      if (period === 'AM' && hours === 12) normalizedHours = 0;

      // Use PKT-aware "today" so date is correct for Pakistan timezone
      const pktNow = getPKTNow();
      pktNow.setHours(normalizedHours, minutes, 0, 0);
      return pktNow.toISOString();
    }

    return getPKTNow().toISOString();
  } catch (err) {
    return getPKTNow().toISOString();
  }
}


function formatAppointmentLabel(value, fallback) {
  try {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    try {
      return date.toLocaleString('en-PK', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (localeError) {
      // Fallback if locale is unsupported by JavaScriptCore/Hermes
      return date.toString();
    }
  } catch (err) {
    return fallback;
  }
}

const SERVICE_ICONS = {
  plumber: 'water-outline',
  plumbing: 'water-outline',
  electrician: 'flash-outline',
  ac: 'snow-outline',
  'ac repair': 'snow-outline',
  'ac technician': 'snow-outline',
  carpenter: 'hammer-outline',
  painter: 'color-palette-outline',
  cleaning: 'sparkles-outline',
  handyman: 'construct-outline',
  mechanic: 'car-outline',
  'car mechanic': 'car-outline',
  hairdresser: 'cut-outline',
  'appliance repair': 'tv-outline',
  pest: 'bug-outline',
  'pest control': 'bug-outline',
  salon: 'color-wand-outline',
  sanitization: 'shield-checkmark-outline',
  gardening: 'leaf-outline',
};

export default function ConfirmationScreen({ route, navigation }) {
  const { fullResult } = route.params;
  const scale = useRef(new Animated.Value(0.7)).current;
  const insets = useSafeAreaInsets();
  const { setActiveJob } = useAppContext();
  const { user } = useAuth();
  const toast = useToast();
  const provider = fullResult.provider || {};
  const [savedBooking, setSavedBooking] = useState(fullResult.booking || null);
  const [existingBooking, setExistingBooking] = useState(null);

  const currentStatus = String(fullResult.booking?.status || fullResult.status || 'pending_provider_acceptance').toLowerCase();
  const isPendingProvider = currentStatus === 'pending_provider_acceptance' || currentStatus === 'pending';

  const appointmentLabel = formatAppointmentLabel(
    fullResult.scheduled_time || fullResult.output?.scheduled_time || fullResult.booking?.scheduled_time || fullResult.booking_start_time || provider.scheduled_time,
    provider.confirmed_slot || 'Appointment scheduled'
  );

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    const booking = addSessionBooking(fullResult);
    setActiveJob(booking);

    // Save booking to MongoDB
    void saveBookingToDatabase();
  }, [fullResult, scale, setActiveJob]);

  const saveBookingToDatabase = async () => {
    if (fullResult?.booking_saved) {
      console.log('[ConfirmationScreen] Booking already saved to database by review checkout step.');
      return;
    }
    try {
      const bookingStartTime = normalizeBookingStartTime(
        fullResult.scheduled_time ||
        fullResult.output?.scheduled_time ||
        fullResult.booking?.scheduled_time ||
        fullResult.booking_start_time ||
        fullResult.provider?.confirmed_slot ||
        provider.confirmed_slot
      );

      const bookingData = {
        provider_id: provider.id || provider.provider_id || fullResult.provider_id || `provider_${Date.now()}`,
        provider_name: provider.name || 'TBD',
        service_type: provider.service_type || provider.service || 'Service',
        location: fullResult.parsed_intent?.location || 'Selected location',
        city: fullResult.parsed_intent?.city || provider.city || 'Unknown',
        area: provider.area || fullResult.parsed_intent?.resolved_area || 'Unknown',
        booking_start_time: bookingStartTime,
        quote_pkr: fullResult.quote_pkr || fullResult.total || null,
        status: 'pending_provider_acceptance',
        raw_data: {
          booking_id: fullResult.booking_id,
          workflow_id: fullResult.workflow_id,
          reasoning_log: fullResult.reasoning_log,
          alternatives: fullResult.alternatives,
          execution_logs: fullResult.execution_logs,
          scheduled_time: fullResult.scheduled_time || fullResult.booking?.scheduled_time || null,
          output_scheduled_time: fullResult.output?.scheduled_time || null,
          booking_start_time: fullResult.booking_start_time || null,
        }
      };

      const response = await apiClient.post('/bookings', bookingData);

      if (response.data.success) {
        setSavedBooking(response.data.booking || null);
      } else {
        console.warn('[Confirmation] Booking save non-success:', response.data);
      }
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      if (status === 409 && data?.error === 'duplicate_booking') {
        // Duplicate booking — show friendly banner with action
        const existing = data.existing_booking;
        setExistingBooking(existing);
        toast.showWarning(
          'You already have a booking with this provider at this time.',
          {
            duration: 8000,
            action: {
              label: 'View',
              onPress: () => {
                // Navigate to Bookings tab to see existing booking
                navigation.navigate('Bookings');
              },
            },
          }
        );
      } else if (status === 401) {
        toast.showError('Session expired. Please log in again.');
      } else if (status >= 500) {
        toast.showWarning('Could not save booking to cloud. Your session booking is still active.');
      } else {
        console.warn('[Confirmation] Booking save failed:', error.message);
      }
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Hey! I just booked ${displayServiceTitle} via Asaaniyat! Tracking ID: #${displayBookingId}`,
      });
    } catch (error) {
      console.warn('Error sharing booking', error);
    }
  };

  const rawService = provider.service_type || provider.service || 'plumbing';
  const serviceKey = String(rawService).toLowerCase();
  const serviceIconName = SERVICE_ICONS[serviceKey] || 'construct-outline';
  const displayServiceTitle = rawService.charAt(0).toUpperCase() + rawService.slice(1);

  // Hex or short hash for unique Booking ID
  const displayBookingId = fullResult.booking_id 
    ? String(fullResult.booking_id).slice(-6).toUpperCase() 
    : 'AS-' + Math.floor(1000 + Math.random() * 9000);

  return (
    <View style={styles.container}>
      {/* Ambient backgrounds */}
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />

      <ScreenHeader
        navigation={navigation}
        title={isPendingProvider ? "Request Sent" : "Booking Confirmed"}
        noBorder
        right={
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            style={styles.homeBtn}
            activeOpacity={0.78}
          >
            <Ionicons name="home-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Circle */}
        <Animated.View style={[styles.successCircle, { transform: [{ scale }] }]}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.primary} />
        </Animated.View>

        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text style={styles.copy}>
            {isPendingProvider ? 'Your request has been sent to the provider. It will be confirmed after they accept.' : 'Your booking has been confirmed by the provider.'}
          </Text>
          <Text style={styles.urduCopy}>{isPendingProvider ? 'درخواست بھیج دی گئی' : 'بکنگ کامیاب'}</Text>
        </View>

        {/* ── Booking Summary Card (Glassmorphic) ────────────────────── */}
        <LiquidGlass style={styles.summaryCard} radius={24}>
          <View style={styles.summaryCardHeader}>
            <View>
              <Text style={styles.bookingIdLabel}>BOOKING ID</Text>
              <Text style={styles.bookingIdValue}>#{displayBookingId}</Text>
            </View>
            <View style={styles.scheduledBadge}>
              <Text style={styles.scheduledBadgeText}>{isPendingProvider ? 'PENDING' : 'SCHEDULED'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Service Row */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconCircle}>
              <Ionicons name={serviceIconName} size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryRowLabel}>SERVICE</Text>
              <Text style={styles.summaryRowValue}>{displayServiceTitle}</Text>
              <Text style={styles.summaryRowSub}>Pipe repair and general maintenance</Text>
            </View>
          </View>

          {/* Date & Time Row */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconCircle}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryRowLabel}>DATE & TIME</Text>
              <Text style={styles.summaryRowValue}>
                {appointmentLabel.includes(',') ? appointmentLabel.split(',')[0] : appointmentLabel}
              </Text>
              {appointmentLabel.includes(',') && (
                <Text style={styles.summaryRowSub}>
                  {appointmentLabel.split(',')[1]?.trim()}
                </Text>
              )}
            </View>
          </View>
        </LiquidGlass>

        {/* ── Professional Details Status Card (Glassmorphic) ───────── */}
        <LiquidGlass style={styles.proCard} radius={20}>
          <View style={styles.proRow}>
            <View style={styles.proAvatar}>
              <Ionicons name="person-outline" size={22} color={COLORS.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.proTitle}>Assigning...</Text>
              <Text style={styles.proSubtitle}>
                We are matching you with a top-rated expert.
              </Text>
            </View>
          </View>
        </LiquidGlass>

        {/* ── Primary Action CTAs ─────────────────────────────────────── */}
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Bookings')} activeOpacity={0.84}>
          <Text style={styles.primaryButtonText}>View Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('ProviderChat', { fullResult, booking: savedBooking || fullResult.booking || null })}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Go to Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.secondaryButton, { marginTop: 12, backgroundColor: 'rgba(14,143,70,0.06)', borderWidth: 0 }]}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="share-social-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.secondaryButtonText, { color: COLORS.primary }]}>Share Booking</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  localHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.94)',
  },
  localHeaderTitle: {
    fontSize: 20,
    fontFamily: FONTS.heading.fontFamily,
    color: COLORS.primary,
    letterSpacing: -0.4,
  },
  headerSpacer: { width: 38, height: 38 },

  content: { paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center', paddingBottom: 150 },

  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(14,143,70,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(217,119,6,0.3)', // accentGold
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  title: { fontSize: 30, fontFamily: FONTS.heading.fontFamily, color: COLORS.textPrimary, textAlign: 'center', letterSpacing: -0.6 },
  copy: { color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, fontSize: 14, marginTop: 10, fontFamily: FONTS.bold.fontFamily, paddingHorizontal: 12 },
  urduCopy: { color: COLORS.textPrimary, textAlign: 'center', fontSize: 18, fontFamily: FONTS.urdu.fontFamily, writingDirection: 'rtl', marginTop: 4 },

  // Summary Card
  summaryCard: {
    width: '100%',
    padding: 18,
    marginBottom: 16,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingIdLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: FONTS.heading.fontFamily,
    letterSpacing: 1,
  },
  bookingIdValue: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontFamily: FONTS.heading.fontFamily,
    marginTop: 2,
  },
  scheduledBadge: {
    backgroundColor: 'rgba(13,148,136,0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(13,148,136,0.2)', // accentTeal
  },
  scheduledBadgeText: {
    color: '#0D9488', // accentTeal
    fontSize: 10,
    fontFamily: FONTS.heading.fontFamily,
    letterSpacing: 0.5,
  },
  divider: { height: 1, backgroundColor: 'rgba(14,143,70,0.08)', marginVertical: 14 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  summaryIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRowLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: FONTS.heading.fontFamily,
    letterSpacing: 1,
  },
  summaryRowValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.heading.fontFamily,
    marginTop: 1,
  },
  summaryRowSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONTS.bold.fontFamily,
    marginTop: 1,
  },

  // Pro Card
  proCard: {
    width: '100%',
    padding: 14,
    marginBottom: 24,
  },
  proRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.chip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.08)',
  },
  proTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.heading.fontFamily,
  },
  proSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.bold.fontFamily,
    marginTop: 2,
  },

  // Buttons
  primaryButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FONTS.heading.fontFamily,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.12)',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontFamily: FONTS.heading.fontFamily,
  },

  // Ambient backgrounds
  ambientTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '40%',
    backgroundColor: '#EFF6FF',
    opacity: 0.5,
  },
  ambientBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '30%',
    backgroundColor: '#EAF8EF',
    opacity: 0.45,
  },

  // Home button in header right slot
  homeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.1)',
  },
});

