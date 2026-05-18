/**
 * Screen: ReviewBookingScreen — Dynamic PKR Quote Edition
 *
 * Reads quote_pkr and quote_breakdown from the backend API response
 * (via route.params.fullResult) and renders an itemised cost card.
 * Falls back gracefully to hardcoded USD values if PKR data is absent
 * so the screen never crashes on older API responses.
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Animated, Modal, ActivityIndicator
} from 'react-native';
import { COLORS } from '../config';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../lib/apiClient';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmt = (n) =>
  typeof n === 'number'
    ? `PKR ${Math.round(n).toLocaleString('en-PK')}`
    : '—';

const multiplierLabel = (m) => {
  if (!m || m === 1) return 'Standard (1.0×)';
  if (m <= 1.1)  return `Low urgency (${m}×)`;
  if (m <= 1.25) return `Medium urgency (${m}×)`;
  return `High urgency (${m}×)`;
};

const normalizeBookingStartTime = (value) => {
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
};

// ---------------------------------------------------------------------------
export default function ReviewBookingScreen({ route, navigation }) {
  const { provider, fullResult } = route.params;

  const [loading, setLoading] = useState(false);
  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);

  // ── Quote data — prefer backend PKR breakdown, fall back to USD stub ──
  const breakdown  = fullResult?.quote_breakdown || null;
  const quote_pkr  = fullResult?.quote_pkr       || null;
  const hasPKR     = breakdown && quote_pkr;

  // Fallback legacy values (USD) kept so screen never crashes
  const legacyServiceFee  = 85;
  const legacyPlatformFee = 4.5;
  const legacyTax         = 7.25;
  const legacyTotal       = legacyServiceFee + legacyPlatformFee + legacyTax;

  // ── Fade-in animation for the quote card ─────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  const confirm = async () => {
    if (loading) return;
    setLoading(true);

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
        quote_pkr: fullResult.quote_pkr || legacyTotal || null,
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
      
      if (response.data?.success) {
        navigation.navigate('Confirmation', {
          fullResult: {
            ...fullResult,
            provider,
            booking_id: response.data.booking?._id || fullResult.booking_id,
            total: hasPKR ? quote_pkr : legacyTotal,
            booking_saved: true,
          },
        });
      } else {
        // Fallback for mock environment
        navigation.navigate('Confirmation', {
          fullResult: {
            ...fullResult,
            provider,
            booking_id: fullResult.booking_id,
            total: hasPKR ? quote_pkr : legacyTotal,
          },
        });
      }
    } catch (err) {
      console.log('Booking creation failed:', err.response?.status, err.response?.data);
      if (err.response?.status === 409 || err.response?.data?.error === 'duplicate_booking') {
        setShowDuplicatePopup(true);
      } else {
        // Fallback for general network errors - let user complete gracefully
        navigation.navigate('Confirmation', {
          fullResult: {
            ...fullResult,
            provider,
            booking_id: fullResult.booking_id,
            total: hasPKR ? quote_pkr : legacyTotal,
          },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Urgency badge colour ──────────────────────────────────────────────
  const urgencyMultiplier = breakdown?.urgency_multiplier ?? 1;
  const urgencyColor =
    urgencyMultiplier >= 1.3 ? COLORS.danger  :
    urgencyMultiplier >= 1.1 ? COLORS.warning :
    COLORS.success;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <Text style={styles.step}>Checkout</Text>
        <Text style={styles.title}>Review Booking</Text>
        <Text style={styles.subtitle}>
          Confirm the details before finalising your appointment.
        </Text>

        {/* ── Booking details card ──────────────────────────────────────── */}
        <View style={styles.card}>
          <Row label="Service"     value={provider.service_type || provider.service || 'Service'} />
          <Row label="Provider"    value={provider.name} />
          <Row label="Appointment" value={provider.confirmed_slot || 'Today 4:00 PM'} />
          <Row label="Distance"    value={`${provider.distance_km || '—'} km`} />
        </View>

        {/* ── AI-generated quote card ───────────────────────────────────── */}
        <Animated.View style={[
          styles.quoteCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}>
          {/* Header row */}
          <View style={styles.quoteHeader}>
            <Text style={styles.quoteHeaderIcon}>💰</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.quoteHeaderTitle}>
                {hasPKR ? 'AI-Generated Quote' : 'Price Estimate'}
              </Text>
              {hasPKR && (
                <Text style={styles.quoteHeaderSub}>
                  Computed by DynamicPricingAgent
                </Text>
              )}
            </View>
            {hasPKR && (
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>⚡ LIVE</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {hasPKR ? (
            <>
              {/* Base rate */}
              <QuoteRow
                label="Base Rate"
                sublabel={`Provider minimum call-out fee`}
                value={fmt(breakdown.base_rate)}
              />

              {/* Distance surcharge */}
              <QuoteRow
                label="Distance Surcharge"
                sublabel={`${provider.distance_km || '?'} km × distance rate`}
                value={fmt(breakdown.distance_surcharge)}
              />

              {/* Urgency multiplier */}
              <QuoteRow
                label="Urgency Multiplier"
                sublabel={multiplierLabel(urgencyMultiplier)}
                value={`${urgencyMultiplier}×`}
                valueStyle={{ color: urgencyColor }}
              />

              <View style={styles.divider} />

              {/* Total */}
              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalSub}>incl. all fees</Text>
                </View>
                <Text style={styles.totalValue}>{fmt(quote_pkr)}</Text>
              </View>

              {/* Urgency explanation pill */}
              {urgencyMultiplier > 1 && (
                <View style={[styles.urgencyPill, { borderColor: urgencyColor + '55' }]}>
                  <Text style={[styles.urgencyPillText, { color: urgencyColor }]}>
                    ⚡ Urgency surcharge applied — your request was flagged as{' '}
                    {urgencyMultiplier >= 1.3 ? 'HIGH' : 'MEDIUM'} priority
                  </Text>
                </View>
              )}
            </>
          ) : (
            // Legacy USD fallback
            <>
              <Row label="Service fee"   value={`$${legacyServiceFee.toFixed(2)}`} />
              <Row label="Platform fee"  value={`$${legacyPlatformFee.toFixed(2)}`} />
              <Row label="Tax"           value={`$${legacyTax.toFixed(2)}`} />
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${legacyTotal.toFixed(2)}</Text>
              </View>
            </>
          )}
        </Animated.View>

        {/* ── Reasoning snippet ─────────────────────────────────────────── */}
        {fullResult?.reasoning_log && (
          <View style={styles.reasoningCard}>
            <Text style={styles.reasoningTitle}>🧠 Why this provider?</Text>
            <Text style={styles.reasoningText} numberOfLines={4}>
              {fullResult.reasoning_log}
            </Text>
            <TouchableOpacity onPress={() =>
              navigation.navigate('AgentTrace', { executionLogs: fullResult.execution_logs })
            }>
              <Text style={styles.reasoningLink}>View full agent trace →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.button} onPress={confirm} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.terms}>
          By confirming, you agree to our Terms of Service.
        </Text>

      </ScrollView>

      {/* Duplicate Booking Warning Modal */}
      <Modal
        visible={showDuplicatePopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDuplicatePopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.warningIconContainer}>
              <Ionicons name="warning" size={32} color={COLORS.danger} />
            </View>
            
            <Text style={styles.modalTitle}>Duplicate Booking</Text>
            <Text style={styles.modalDescription}>
              You already have a confirmed booking scheduled with <Text style={{ fontWeight: '900', color: COLORS.textPrimary }}>{provider.name}</Text> around this time slot.
              {"\n\n"}
              To avoid double scheduling, this duplicate reservation has been blocked.
            </Text>

            <TouchableOpacity 
              style={styles.viewScheduleButton} 
              onPress={() => {
                setShowDuplicatePopup(false);
                navigation.navigate('Bookings');
              }}
              activeOpacity={0.84}
            >
              <Text style={styles.viewScheduleButtonText}>View Existing Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelModalButton} 
              onPress={() => setShowDuplicatePopup(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelModalButtonText}>Choose Another Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function QuoteRow({ label, sublabel, value, valueStyle }) {
  return (
    <View style={styles.quoteRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.quoteRowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.quoteRowSub}>{sublabel}</Text> : null}
      </View>
      <Text style={[styles.quoteRowValue, valueStyle]}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content:   { padding: 20, paddingBottom: 36 },

  step:     { color: COLORS.primary, fontSize: 11, fontWeight: '900', textAlign: 'right' },
  title:    { fontSize: 26, color: COLORS.textPrimary, fontWeight: '900', marginTop: 20 },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 6, marginBottom: 16 },

  // Booking details card
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  row:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { color: COLORS.textSecondary, fontWeight: '700' },
  rowValue: { color: COLORS.textPrimary, fontWeight: '900', maxWidth: '55%', textAlign: 'right' },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },

  // AI quote card
  quoteCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '55',
    marginBottom: 14,
  },
  quoteHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  quoteHeaderIcon: { fontSize: 24 },
  quoteHeaderTitle:{ color: COLORS.textPrimary, fontWeight: '900', fontSize: 15 },
  quoteHeaderSub:  { color: COLORS.textMuted, fontSize: 10, marginTop: 1 },

  aiBadge:     { backgroundColor: COLORS.primary + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  aiBadgeText: { color: COLORS.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  quoteRow:      { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 7 },
  quoteRowLabel: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 13 },
  quoteRowSub:   { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  quoteRowValue: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 14, minWidth: 80, textAlign: 'right' },

  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 17 },
  totalSub:   { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  totalValue: { color: COLORS.primary, fontWeight: '900', fontSize: 32 },

  urgencyPill: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'transparent',
  },
  urgencyPillText: { fontSize: 11, fontWeight: '600', lineHeight: 16 },

  // Reasoning snippet
  reasoningCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.accent + '44',
    marginBottom: 14,
  },
  reasoningTitle: { color: COLORS.accent, fontWeight: '800', fontSize: 12, marginBottom: 8 },
  reasoningText:  { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  reasoningLink:  { color: COLORS.primary, fontWeight: '700', fontSize: 12, marginTop: 8 },

  // CTA
  button:     { backgroundColor: COLORS.primary, borderRadius: 22, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  terms:      { color: COLORS.textSecondary, fontSize: 10, textAlign: 'center', marginTop: 12 },

  // Duplicate Warning Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 37, 26, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.15)',
    shadowColor: '#10251A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10251A',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  viewScheduleButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  viewScheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  cancelModalButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
});
