/**
 * Screen: ReviewBookingScreen — Dynamic PKR Quote Edition
 *
 * Reads quote_pkr and quote_breakdown from the backend API response
 * (via route.params.fullResult) and renders an itemised cost card.
 * Falls back gracefully to hardcoded USD values if PKR data is absent
 * so the screen never crashes on older API responses.
 */

import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Animated, Platform
} from 'react-native';
import { COLORS } from '../config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarVisibility } from '../components/TabBarVisibility';

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

// ---------------------------------------------------------------------------
export default function ReviewBookingScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const HEADER_PADDING = insets.top + (Platform.OS === 'ios' ? 74 : 64);
  const { registerScroll } = useTabBarVisibility();
  const { provider, fullResult } = route.params;

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

  const confirm = () => {
    navigation.navigate('Confirmation', {
      fullResult: {
        ...fullResult,
        provider,
        booking_id: fullResult.booking_id,
        total: hasPKR ? quote_pkr : legacyTotal,
      },
    });
  };

  // ── Urgency badge colour ──────────────────────────────────────────────
  const urgencyMultiplier = breakdown?.urgency_multiplier ?? 1;
  const urgencyColor =
    urgencyMultiplier >= 1.3 ? COLORS.danger  :
    urgencyMultiplier >= 1.1 ? COLORS.warning :
    COLORS.success;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: HEADER_PADDING, paddingBottom: insets.bottom + 24 }]}
        onScroll={registerScroll}
        scrollEventThrottle={16}
      >

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
        <TouchableOpacity style={styles.button} onPress={confirm} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Confirm Booking</Text>
        </TouchableOpacity>
        <Text style={styles.terms}>
          By confirming, you agree to our Terms of Service.
        </Text>

      </ScrollView>
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
});
