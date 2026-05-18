import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config';
import { addSessionBooking } from '../sessionBookings';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../lib/apiClient';

function normalizeBookingStartTime(value) {
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
}

function formatAppointmentLabel(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString('en-PK', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ConfirmationScreen({ route, navigation }) {
  const { fullResult } = route.params;
  const scale = useRef(new Animated.Value(0.7)).current;
  const insets = useSafeAreaInsets();
  const { setActiveJob } = useAppContext();
  const { user } = useAuth();
  const provider = fullResult.provider || {};
  const appointmentLabel = formatAppointmentLabel(
    fullResult.scheduled_time || fullResult.booking_start_time || provider.scheduled_time,
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
        fullResult.booking_start_time ||
        fullResult.scheduled_time ||
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
        }
      };

      const response = await apiClient.post('/bookings', bookingData);

      if (response.data.success) {
        console.log('Booking saved to database:', response.data.booking._id);
      } else {
        console.warn('Booking save returned non-success payload:', response.data);
      }
    } catch (error) {
      console.error('Failed to save booking to database:', error);
      // Don't alert user - the booking was confirmed, just couldn't save to DB
      // In production, implement retry logic or local queuing
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.successCircle, { transform: [{ scale }] }]}>
          <Ionicons name="checkmark-circle-outline" size={58} color={COLORS.primary} />
        </Animated.View>
        <Text style={styles.title}>Booking{`\n`}Confirmed</Text>
        <Text style={styles.copy}>Your service has been successfully scheduled. Our professional is already preparing for your visit.</Text>

        <View style={styles.card}>
          <Detail label="Technician" value={provider.name || 'TBD'} />
          <Detail label="Service details" value={provider.service_type || provider.service || 'Service'} />
          <Detail label="Appointment time" value={appointmentLabel} />
          <Detail label="Booking ID" value={fullResult.booking_id || 'N/A'} />
        </View>

        <TouchableOpacity style={styles.chatButton} onPress={() => navigation.navigate('ProviderChat', { fullResult })}>
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text style={styles.chatText}>Go to Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.popToTop()}><Text style={styles.link}>View Schedule</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function Detail({ label, value }) {
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  successCircle: { width: 112, height: 112, borderRadius: 56, backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: COLORS.primary, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 },
  title: { textAlign: 'center', fontSize: 32, fontWeight: '900', color: COLORS.textPrimary, lineHeight: 38 },
  copy: { color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, fontSize: 13, marginTop: 14, marginBottom: 24 },
  card: { width: '100%', backgroundColor: COLORS.bgCard, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24 },
  detail: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  detailLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  detailValue: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '900', marginTop: 4 },
  chatButton: { width: '100%', backgroundColor: COLORS.accent, borderRadius: 22, flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 16, marginBottom: 16 },
  chatText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  link: { color: COLORS.primary, fontWeight: '800' }
});
