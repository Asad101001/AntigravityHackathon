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
  ScrollView, Animated, Modal, ActivityIndicator, Image, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS, RADII, FONTS } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../lib/apiClient';
import LiquidGlass from '../components/LiquidGlass';
import ScreenHeader from '../components/ScreenHeader';
import { useAppContext } from '../context/AppContext';

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

const URDU_MAPPINGS = {
  plumber: 'پلمبر',
  plumbing: 'پلمبر',
  electrician: 'بجلی کا کام',
  ac: 'اے سی مرمت',
  'ac repair': 'اے سی مرمت',
  'ac technician': 'اے سی ٹیکنیشن',
  carpenter: 'بڑھئی',
  painter: 'پینٹر',
  cleaning: 'گھر کی صفائی',
  handyman: 'عام مرمت',
  mechanic: 'گاڑی کی سروس',
  'car mechanic': 'گاڑی کی سروس',
  hairdresser: 'ہیئر ڈریسر',
  'appliance repair': 'آلات کی مرمت',
  pest: 'پیسٹ کنٹرول',
  'pest control': 'پیسٹ کنٹرول',
  salon: 'سیلون',
  sanitization: 'سینیٹائزیشن',
  gardening: 'باغبانی',
};

const SERVICE_ICONS = {
  plumber: 'water',
  plumbing: 'water',
  electrician: 'flash',
  ac: 'snow',
  'ac repair': 'snow',
  'ac technician': 'snow',
  carpenter: 'hammer',
  painter: 'color-palette',
  cleaning: 'sparkles',
  handyman: 'construct',
  mechanic: 'car',
  'car mechanic': 'car',
  hairdresser: 'cut',
  'appliance repair': 'tv',
  pest: 'bug',
  'pest control': 'bug',
  salon: 'color-wand',
  sanitization: 'shield-checkmark',
  gardening: 'leaf',
};

const SERVICE_IMAGES = {
  plumbing: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80',
  plumber: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80',
  electrician: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
  ac: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=600&q=80',
  'ac repair': 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=600&q=80',
  'ac technician': 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=600&q=80',
  carpenter: 'https://images.unsplash.com/photo-1534224039826-c7a0eda0e6b3?auto=format&fit=crop&w=600&q=80',
  painter: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
  cleaning: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
  mechanic: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80',
  'car mechanic': 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80',
  hairdresser: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80',
  'appliance repair': 'https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?auto=format&fit=crop&w=600&q=80',
  'pest control': 'https://images.unsplash.com/photo-1635398219460-25bc9a0ba601?auto=format&fit=crop&w=600&q=80',
  salon: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80',
  sanitization: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=600&q=80',
  gardening: 'https://images.unsplash.com/photo-1416879598555-220b8f32bea6?auto=format&fit=crop&w=600&q=80',
};

const normalizeBookingStartTime = (value) => {
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
};

// ---------------------------------------------------------------------------
export default function ReviewBookingScreen({ route, navigation }) {
  const { provider, fullResult } = route.params;
  const insets = useSafeAreaInsets();
  const { executionLogsCache } = useAppContext();

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

  // ── Urgency badge colour ──────────────────────────────────────────────
  const urgencyMultiplier = breakdown?.urgency_multiplier ?? 1;
  const urgencyColor =
    urgencyMultiplier >= 1.3 ? COLORS.danger  :
    urgencyMultiplier >= 1.1 ? COLORS.warning :
    COLORS.success;

  const rawService = provider.service_type || provider.service || 'plumbing';
  const serviceKey = String(rawService).toLowerCase();
  const urduTranslation = URDU_MAPPINGS[serviceKey] || 'سباكة';
  const serviceIconName = SERVICE_ICONS[serviceKey] || 'construct';

  // Title formatting matching Mockup 1
  const displayServiceTitle = rawService.charAt(0).toUpperCase() + rawService.slice(1);

  return (
    <View style={styles.container}>
      <ScreenHeader
        navigation={navigation}
        title="Review Booking"
        stepLabel="STEP 4 OF 5"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces overScrollMode="never" keyboardShouldPersistTaps="handled">


        {/* ── Booking details card (Glassmorphic) ──────────────────────── */}
        <LiquidGlass style={styles.card} radius={22}>
          {/* ── Dynamic Profile Header (Name -> Service -> Company) ── */}
          <View style={styles.profileHeaderBlock}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{provider.name?.charAt(0) || 'P'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{provider.name}</Text>
              <Text style={styles.profileService}>
                {provider.service || provider.service_type || 'Electrician'}
              </Text>
              <Text style={styles.profileCompany}>
                {provider.company || provider.agency || provider.agency_name || `${provider.name?.split(' ')[0] || 'Expert'}${String(provider.service || provider.service_type || 'Services').toLowerCase().includes('plumb') ? ' Plumbing Services' : ' Electrics'}`}
              </Text>
            </View>
            <Text style={styles.urduText}>{urduTranslation}</Text>
          </View>

          <View style={styles.profileDivider} />

          <View style={styles.detailsList}>
            <View style={styles.detailRowItem}>
              <View style={styles.detailIconCircle}>
                <Ionicons name="location-outline" size={16} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailRowText}>
                  {fullResult.parsed_intent?.location || provider.area || 'Selected Area'}
                </Text>
              </View>
            </View>

            <View style={styles.detailRowItem}>
              <View style={styles.detailIconCircle}>
                <Ionicons name="time-outline" size={16} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailRowText}>
                  {provider.confirmed_slot || 'Today, 14:00 - 15:00 (Estimated 1h)'}
                </Text>
              </View>
            </View>
          </View>

          {/* Premium illustration with verified banner */}
          <View style={styles.expertImageContainer}>
            <Image
              source={{ uri: SERVICE_IMAGES[serviceKey] || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80' }}
              style={styles.expertImage}
              resizeMode="cover"
            />
            <View style={styles.verifiedBanner}>
              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
              <Text style={styles.verifiedBannerText}>Verified Expert</Text>
            </View>
          </View>
        </LiquidGlass>

        {/* ── AI-generated quote card (Glassmorphic) ───────────────────── */}
        <Animated.View style={[
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}>
          <LiquidGlass style={styles.quoteCard} radius={22}>
            {/* Header row */}
            <View style={styles.quoteHeader}>
              <View style={styles.quoteHeaderIconCircle}>
                <Ionicons name="receipt-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quoteHeaderTitle}>
                  {hasPKR ? 'Dynamic Quote' : 'Price Estimate'}
                </Text>
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
                <QuoteRow
                  label="Base Callout Fee"
                  value={fmt(breakdown.base_rate)}
                />

                <QuoteRow
                  label="Estimated Labor (1 hr)"
                  value={fmt(breakdown.distance_surcharge)}
                />

                <QuoteRow
                  label="Parts (Estimated)"
                  value={`${fmt(breakdown.base_rate * 0.3)} - ${fmt(breakdown.base_rate * 0.8)}`}
                />

                <View style={styles.divider} />

                {/* Total */}
                <View style={styles.totalRow}>
                  <View>
                    <Text style={styles.totalLabel}>Estimated Total</Text>
                  </View>
                  <Text style={styles.totalValue}>{fmt(quote_pkr)}</Text>
                </View>

                <Text style={styles.priceDisclaimer}>
                  ℹ️ Final price may vary based on actual parts required.
                </Text>
              </>
            ) : (
              // Legacy USD fallback
              <>
                <QuoteRow label="Service fee" value={`$${legacyServiceFee.toFixed(2)}`} />
                <QuoteRow label="Platform fee" value={`$${legacyPlatformFee.toFixed(2)}`} />
                <QuoteRow label="Tax" value={`$${legacyTax.toFixed(2)}`} />
                <View style={styles.divider} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>${legacyTotal.toFixed(2)}</Text>
                </View>
              </>
            )}
          </LiquidGlass>
        </Animated.View>

        {/* ── AI Reasoning snippet ─────────────────────────────────────── */}
        {fullResult?.reasoning_log && (
          <LiquidGlass style={styles.reasoningCard} radius={16}>
            <View style={styles.reasoningHeader}>
              <Ionicons name="sparkles-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.reasoningTitle}>AI ASSISTANT REASONING</Text>
            </View>
            <Text style={styles.reasoningText}>
              {fullResult.reasoning_log}
            </Text>
            <TouchableOpacity onPress={() =>
              navigation.navigate('AgentTrace', {
                bookingId: fullResult.booking_id,
                reasoningLog: fullResult.reasoning_log,
              })
            }>
              <Text style={styles.reasoningLink}>View full agent trace →</Text>
            </TouchableOpacity>
          </LiquidGlass>
        )}

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service.
        </Text>

        <Text style={styles.smallFooterText}>Secured by Asaaniyat AI Engine • 100% Reliable</Text>

        <View style={{ height: 20 }} />

      </ScrollView>

      {/* ── Sticky Bottom CTA ─────────────────────────────────────────── */}
      <View style={[styles.stickyBottomContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('BookingConfirm', { provider, fullResult })}
          activeOpacity={0.85}
        >
          <View style={styles.buttonInner}>
            <Text style={styles.buttonText}>Continue to Checkout</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </View>
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function QuoteRow({ label, value }) {
  return (
    <View style={styles.quoteRow}>
      <Text style={styles.quoteRowLabel}>{label}</Text>
      <Text style={styles.quoteRowValue}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
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
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.94)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  localHeaderTitle: {
    fontSize: 20,
    fontFamily: FONTS.heading.fontFamily,
    color: COLORS.primary,
    letterSpacing: -0.4,
  },
  headerSpacer: { width: 38, height: 38 },

  content: { padding: 20, paddingBottom: 220 }, // Added generous padding to allow navbar auto-hide

  title: { fontSize: 28, color: COLORS.primary, fontFamily: FONTS.heading.fontFamily, marginTop: 12, marginBottom: 20 },

  // Booking details card
  card: {
    padding: 20,
    marginBottom: 16,
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  profileHeaderBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 4,
  },
  profileAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.chip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.1)',
  },
  profileAvatarText: {
    color: COLORS.primary,
    fontSize: 24,
    fontFamily: FONTS.heading.fontFamily,
  },
  profileName: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: FONTS.heading.fontFamily,
    letterSpacing: -0.2,
  },
  profileService: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: FONTS.subheading.fontFamily,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  profileCompany: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.bold.fontFamily,
    marginTop: 2,
  },
  profileDivider: {
    height: 1,
    backgroundColor: 'rgba(14,143,70,0.06)',
    marginVertical: 4,
  },
  urduText: {
    color: COLORS.primary,
    fontSize: 20,
    fontFamily: FONTS.heading.fontFamily,
  },
  detailsList: {
    gap: 12,
    marginBottom: 20,
  },
  detailRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRowText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: FONTS.bold.fontFamily,
  },
  expertImageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 8,
  },
  expertImage: {
    width: '100%',
    height: '100%',
  },
  verifiedBanner: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#0E8F46',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedBannerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FONTS.subheading.fontFamily,
  },

  divider: { height: 1, backgroundColor: 'rgba(14,143,70,0.08)', marginVertical: 14 },

  // AI quote card
  quoteCard: {
    padding: 20,
    marginBottom: 16,
  },
  quoteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  quoteHeaderIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteHeaderTitle: { color: COLORS.textPrimary, fontFamily: FONTS.heading.fontFamily, fontSize: 18, letterSpacing: -0.3 },

  aiBadge: { backgroundColor: 'rgba(14,143,70,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  aiBadgeText: { color: COLORS.primary, fontSize: 9, fontFamily: FONTS.heading.fontFamily, letterSpacing: 1 },

  quoteRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  quoteRowLabel: { color: COLORS.textSecondary, fontFamily: FONTS.bold.fontFamily, fontSize: 15 },
  quoteRowValue: { color: COLORS.textPrimary, fontFamily: FONTS.heading.fontFamily, fontSize: 15 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel: { color: COLORS.primary, fontFamily: FONTS.heading.fontFamily, fontSize: 20 },
  totalValue: { color: COLORS.primary, fontFamily: FONTS.heading.fontFamily, fontSize: 28 },

  priceDisclaimer: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: FONTS.bold.fontFamily,
    marginTop: 12,
    lineHeight: 16,
  },

  // Reasoning snippet
  reasoningCard: {
    padding: 16,
    marginBottom: 20,
  },
  reasoningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reasoningTitle: { color: COLORS.primary, fontFamily: FONTS.heading.fontFamily, fontSize: 12, letterSpacing: 0.5 },
  reasoningText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, fontFamily: FONTS.bold.fontFamily },
  reasoningLink: { color: COLORS.primary, fontFamily: FONTS.subheading.fontFamily, fontSize: 13, marginTop: 8 },

  // CTA
  button: { backgroundColor: COLORS.primary, borderRadius: 20, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 17, fontFamily: FONTS.heading.fontFamily },
  terms: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12, fontFamily: FONTS.bold.fontFamily },

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
    fontFamily: FONTS.heading.fontFamily,
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
    fontFamily: FONTS.heading.fontFamily,
  },
  cancelModalButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.bold.fontFamily,
  },
  smallFooterText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 9,
    fontFamily: FONTS.subheading.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 12,
  },
  stickyBottomContainer: {
    paddingHorizontal: 20,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderColor: 'rgba(14,143,70,0.06)',
    paddingTop: 12,
  },
});
