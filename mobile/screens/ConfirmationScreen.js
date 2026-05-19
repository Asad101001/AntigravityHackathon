import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config';
import { addSessionBooking } from '../sessionBookings';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../lib/apiClient';
import LiquidGlass from '../components/LiquidGlass';

function normalizeBookingStartTime(value) {
  try {
    if (!value) return new Date().toISOString();

    const directDate = new Date(value);
    if (!Number.isNaN(directDate.getTime())) {
      return directDate.toISOString();
    }

    const timeMatch = String(value).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (timeMatch) {
      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2] || '0');
      const period = (timeMatch[3] || '').toUpperCase();

      let normalizedHours = hours;
      if (period === 'PM' && hours < 12) normalizedHours += 12;
      if (period === 'AM' && hours === 12) normalizedHours = 0;

      const date = new Date();
      date.setHours(normalizedHours, minutes, 0, 0);
      return date.toISOString();
    }

    return new Date().toISOString();
  } catch (err) {
    return new Date().toISOString();
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
  carpenter: 'hammer-outline',
  painter: 'color-palette-outline',
  cleaning: 'leaf-outline',
  handyman: 'construct-outline',
};

export default function ConfirmationScreen({ route, navigation }) {
  const { fullResult } = route.params;
  const scale = useRef(new Animated.Value(0.7)).current;
  const insets = useSafeAreaInsets();
  const { setActiveJob } = useAppContext();
  const { user } = useAuth();
  const provider = fullResult.provider || {};
  const [savedBooking, setSavedBooking] = useState(fullResult.booking || null);

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
        status: 'confirmed',
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
        console.log('Booking saved to database:', response.data.booking._id);
      } else {
        console.warn('Booking save returned non-success payload:', response.data);
      }
    } catch (error) {
      console.error('Failed to save booking to database:', error);
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
      {/* ── Local Menu Header ────────────────────────────────────────── */}
      <View style={[styles.localHeader, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.menuButton} activeOpacity={0.8}>
          <Ionicons name="menu-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.localHeaderTitle}>Booking Confirmed</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Circle */}
        <Animated.View style={[styles.successCircle, { transform: [{ scale }] }]}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.primary} />
        </Animated.View>

        <Text style={styles.copy}>
          Your request has been successfully scheduled. A professional will be assigned shortly.
        </Text>

        {/* ── Booking Summary Card (Glassmorphic) ────────────────────── */}
        <LiquidGlass style={styles.summaryCard} radius={24}>
          <View style={styles.summaryCardHeader}>
            <View>
              <Text style={styles.bookingIdLabel}>BOOKING ID</Text>
              <Text style={styles.bookingIdValue}>#{displayBookingId}</Text>
            </View>
            <View style={styles.scheduledBadge}>
              <Text style={styles.scheduledBadgeText}>SCHEDULED</Text>
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
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.popToTop()} activeOpacity={0.84}>
          <Text style={styles.primaryButtonText}>View Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('ProviderChat', { fullResult, booking: savedBooking || fullResult.booking || null })}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Go to Chat</Text>
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
    fontWeight: '900',
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
    borderColor: 'rgba(14,143,70,0.12)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.textPrimary, textAlign: 'center', letterSpacing: -0.6 },
  copy: { color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, fontSize: 13, marginTop: 10, marginBottom: 24, fontWeight: '700', paddingHorizontal: 12 },

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
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bookingIdValue: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  scheduledBadge: {
    backgroundColor: 'rgba(47,128,237,0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(47,128,237,0.14)',
  },
  scheduledBadgeText: {
    color: '#2F80ED',
    fontSize: 10,
    fontWeight: '900',
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
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  summaryRowValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 1,
  },
  summaryRowSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 15,
    fontWeight: '900',
  },
  proSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
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
    fontSize: 16,
    fontWeight: '900',
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
    fontSize: 15,
    fontWeight: '900',
  },
});
