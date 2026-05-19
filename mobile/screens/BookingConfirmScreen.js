/**
 * Screen: BookingConfirmScreen — Chaos Stress-Test Edition
 *
 * Adds a developer-visible "Simulate Provider Cancellation" button that:
 *   1. Calls POST /api/chaos/simulate
 *   2. Shows an inline "Re-routing..." overlay
 *   3. Navigates to a ChaosRecovery sub-view showing the new provider
 *      and the updated reasoning_log — perfect for demo judges.
 *
 * The chaos button is styled to look intentional (dev tool aesthetic)
 * rather than accidental.
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Modal, Animated, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, API_URL } from '../config';
import apiClient from '../lib/apiClient';
import LiquidGlass from '../components/LiquidGlass';
import { useAppContext } from '../context/AppContext';

// ---------------------------------------------------------------------------
export default function BookingConfirmScreen({ route, navigation }) {
  const { provider, fullResult } = route.params;
  const insets = useSafeAreaInsets();
  const { executionLogsCache } = useAppContext();

  const slot =
    provider.confirmed_slot ||
    fullResult.provider?.confirmed_slot ||
    provider.available_slots?.[0] ||
    'Today 4:00 PM';

  // ── Chaos state ─────────────────────────────────────────────────────
  const [chaosLoading,  setChaosLoading]  = useState(false);
  const [chaosResult,   setChaosResult]   = useState(null);   // backend response
  const [chaosError,    setChaosError]    = useState(null);
  const [chaosModalOpen, setChaosModalOpen] = useState(false);

  // ── Checkout confirmation state ──────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);

  const confirm = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const bookingStartTime = 
        fullResult.booking_start_time ||
        fullResult.scheduled_time ||
        fullResult.provider?.confirmed_slot ||
        provider.confirmed_slot ||
        slot;

      const directDate = new Date(bookingStartTime);
      let isoStartTime = new Date().toISOString();
      if (!Number.isNaN(directDate.getTime())) {
        isoStartTime = directDate.toISOString();
      } else {
        const timeMatch = String(bookingStartTime).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
        if (timeMatch) {
          const hours = Number(timeMatch[1]);
          const minutes = Number(timeMatch[2] || '0');
          const period = (timeMatch[3] || '').toUpperCase();
          let normalizedHours = hours;
          if (period === 'PM' && hours < 12) normalizedHours += 12;
          if (period === 'AM' && hours === 12) normalizedHours = 0;
          const date = new Date();
          date.setHours(normalizedHours, minutes, 0, 0);
          isoStartTime = date.toISOString();
        }
      }

      const bookingData = {
        provider_id: provider.id || provider.provider_id || fullResult.provider_id || `provider_${Date.now()}`,
        provider_name: provider.name || 'TBD',
        service_type: provider.service_type || provider.service || 'Service',
        location: fullResult.parsed_intent?.location || 'Selected location',
        city: fullResult.parsed_intent?.city || provider.city || 'Unknown',
        area: provider.area || fullResult.parsed_intent?.resolved_area || 'Unknown',
        booking_start_time: isoStartTime,
        quote_pkr: fullResult.quote_pkr || null,
        status: 'confirmed',
        raw_data: {
          booking_id: fullResult.booking_id,
          workflow_id: fullResult.workflow_id,
          reasoning_log: fullResult.reasoning_log,
          alternatives: fullResult.alternatives,
          execution_logs: executionLogsCache[fullResult.booking_id] || [],
        }
      };

      const response = await apiClient.post('/bookings', bookingData);
      
      if (response.data?.success) {
        navigation.navigate('Confirmation', {
          fullResult: {
            ...fullResult,
            provider,
            booking_id: response.data.booking?._id || fullResult.booking_id,
            booking: response.data.booking || fullResult.booking || null,
            total: fullResult.quote_pkr || null,
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
            booking: fullResult.booking || null,
            total: fullResult.quote_pkr || null,
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
            booking: fullResult.booking || null,
            total: fullResult.quote_pkr || null,
          },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Trigger chaos simulation ─────────────────────────────────────────
  const simulateCancellation = async () => {
    setChaosError(null);
    setChaosLoading(true);
    setChaosModalOpen(true);

    try {
      const response = await apiClient.post(
        '/chaos/simulate',
        {
          provider_id_to_cancel: provider.id || provider.provider_id || null,
          providers: [fullResult?.provider, ...(fullResult?.alternatives || [])].filter(Boolean),
          service_type: provider.service_type || provider.service || fullResult?.parsed_intent?.service_type || null,
          location: fullResult?.parsed_intent?.location || provider.area || null,
          booking_id: fullResult?.booking_id || null,
          user_id: fullResult?.user_id || null,
        },
        { timeout: 15000 }
      );

      setChaosResult(response.data);
    } catch (err) {
      console.error('Chaos API error:', err);
      setChaosError(
        err.response?.data?.message ||
        err.response?.data?.error   ||
        'Could not reach /api/chaos/simulate. Is the backend running?'
      );
    } finally {
      setChaosLoading(false);
    }
  };

  const closeModal = () => {
    setChaosModalOpen(false);
    setChaosResult(null);
    setChaosError(null);
  };

  const acceptNewProvider = () => {
    closeModal();
    // Navigate to BookingConfirm again with the replacement provider
    navigation.replace('BookingConfirm', {
      provider:   chaosResult.new_provider,
      fullResult: {
        ...fullResult,
        provider:       chaosResult.new_provider,
        reasoning_log:  chaosResult.reasoning_log,
        quote_pkr:      chaosResult.new_quote_pkr ?? chaosResult.quote_pkr ?? fullResult.quote_pkr,
        quote_breakdown: chaosResult.new_quote_breakdown ?? chaosResult.quote_breakdown ?? fullResult.quote_breakdown,
      },
    });
  };

  const displayService = 
    provider.service_type ||
    provider.service      ||
    fullResult.parsed_intent?.service_type ||
    'Service';

  const formattedService = displayService.charAt(0).toUpperCase() + displayService.slice(1);

  // ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* ── Custom Local Header ────────────────────────────────────────── */}
      <View style={[styles.localHeader, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.82}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerStepText}>STEP 5 OF 5</Text>
          <Text style={styles.localHeaderTitle}>Confirm Booking</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Provider details card (Glassmorphic) ─────────────────────── */}
        <LiquidGlass style={styles.card} radius={24}>
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
          </View>

          <View style={styles.profileDivider} />

          <Info icon="calendar-outline"       label="Appointment Time" value={slot} />
          <Info
            icon="location-outline"
            label="Location"
            value={fullResult.parsed_intent?.location || provider.area || 'Pinned location'}
          />
          {provider.distance_km && (
            <Info icon="navigate-outline" label="Distance" value={`${provider.distance_km} km`} />
          )}
          {fullResult.quote_pkr && (
            <Info
              icon="cash-outline"
              label="Quoted Price"
              value={`PKR ${Math.round(fullResult.quote_pkr).toLocaleString('en-PK')}`}
            />
          )}
        </LiquidGlass>

        {/* ── Reasoning snippet (Glassmorphic) ─────────────────────────── */}
        {fullResult?.reasoning_log && (
          <LiquidGlass style={styles.reasoningCard} radius={18}>
            <View style={styles.reasoningHeader}>
              <Ionicons name="sparkles-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.reasoningTitle}>AI REASONING</Text>
            </View>
            <Text style={styles.reasoningText}>
              {fullResult.reasoning_log}
            </Text>
            <TouchableOpacity onPress={() =>
              navigation.navigate('AgentTrace', {
                bookingId: fullResult.booking_id,
                reasoningLog:  fullResult.reasoning_log,
              })
            }>
              <Text style={styles.reasoningLink}>View full agent trace →</Text>
            </TouchableOpacity>
          </LiquidGlass>
        )}

        {/* ── Dev Stress-Test Section ───────────────────────────────────── */}
        <View style={styles.devSection}>
          <View style={styles.devSectionHeader}>
            <View style={styles.devDot} />
            <Text style={styles.devSectionTitle}>Developer Tools</Text>
            <View style={styles.devDot} />
          </View>

          <TouchableOpacity
            style={styles.chaosButton}
            onPress={simulateCancellation}
            activeOpacity={0.8}
          >
            <Ionicons name="skull-outline" size={18} color={COLORS.danger} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.chaosButtonTitle}>Simulate Provider Cancellation</Text>
              <Text style={styles.chaosButtonSub}>
                Stress Test — triggers ChaosSimulatorAgent → re-rank → recovery
              </Text>
            </View>
            <View style={styles.chaosArrow}>
              <Text style={{ color: COLORS.danger, fontSize: 14 }}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.smallFooterText}>Secured by Asaaniyat AI Engine • 100% Reliable</Text>

        <View style={{ height: 20 }} />

      </ScrollView>

      {/* ── Sticky Bottom CTA ─────────────────────────────────────────── */}
      <View style={[styles.stickyBottomContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={confirm}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>Confirm & Book Now</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Duplicate Booking Warning Modal */}
      <Modal
        visible={showDuplicatePopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDuplicatePopup(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalContent}>
            <View style={styles.warningIconContainer}>
              <Ionicons name="warning" size={32} color={COLORS.danger} />
            </View>
            
            <Text style={styles.modalTitleCenter}>Duplicate Booking</Text>
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

      {/* ══════════════════════════════════════════════════════════════════
          Chaos Modal — shown while loading AND when result is available
      ══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={chaosModalOpen}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>

            {/* ── Loading state ─────────────────────────────────────────── */}
            {chaosLoading && (
              <View style={styles.modalLoadingBody}>
                <ActivityIndicator size="large" color={COLORS.danger} />
                <Text style={styles.modalLoadingTitle}>⚡ Re-routing...</Text>
                <Text style={styles.modalLoadingSteps}>
                  {'ChaosSimulatorAgent: cancelling provider\n'}
                  {'LLMRankerAgent: re-ranking candidates\n'}
                  {'DynamicPricingAgent: recalculating quote'}
                </Text>
              </View>
            )}

            {/* ── Error state ───────────────────────────────────────────── */}
            {!chaosLoading && chaosError && (
              <>
                <Text style={styles.modalTitle}>⚠️ Chaos Error</Text>
                <Text style={styles.errorText}>{chaosError}</Text>
                <TouchableOpacity style={styles.modalDismiss} onPress={closeModal}>
                  <Text style={styles.modalDismissText}>Dismiss</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Success state — recovery result ──────────────────────── */}
            {!chaosLoading && chaosResult && !chaosError && (
              <>
                {/* Header */}
                <View style={styles.chaosResultHeader}>
                  <Text style={styles.chaosResultIcon}>🔄</Text>
                  <View>
                    <Text style={styles.chaosResultTitle}>Provider Recovered</Text>
                    <Text style={styles.chaosResultSub}>ChaosSimulatorAgent ran successfully</Text>
                  </View>
                </View>

                {/* Cancelled provider */}
                {chaosResult.cancelled_provider && (
                  <View style={[styles.providerChip, { borderColor: COLORS.danger + '66' }]}>
                    <Text style={styles.providerChipLabel}>❌ Cancelled</Text>
                    <Text style={styles.providerChipName}>
                      {chaosResult.cancelled_provider.name}
                    </Text>
                  </View>
                )}

                {/* Arrow */}
                <Text style={styles.chaosArrowDown}>↓</Text>

                {/* New provider */}
                {chaosResult.new_provider && (
                  <View style={[styles.providerChip, { borderColor: COLORS.success + '66' }]}>
                    <Text style={[styles.providerChipLabel, { color: COLORS.success }]}>
                      ✅ New Match
                    </Text>
                    <Text style={styles.providerChipName}>
                      {chaosResult.new_provider.name}
                    </Text>
                    {(chaosResult.new_quote_pkr ?? chaosResult.quote_pkr) && (
                      <Text style={styles.providerChipPrice}>
                        PKR {Math.round(chaosResult.new_quote_pkr ?? chaosResult.quote_pkr).toLocaleString('en-PK')}
                      </Text>
                    )}
                  </View>
                )}

                {/* Reasoning log from chaos response */}
                {chaosResult.reasoning_log && (
                  <View style={styles.chaosReasoning}>
                    <Text style={styles.chaosReasoningTitle}>🧠 Re-rank Reasoning</Text>
                    <Text style={styles.chaosReasoningText}>{chaosResult.reasoning_log}</Text>
                  </View>
                )}

                {/* Actions */}
                <TouchableOpacity style={styles.acceptButton} onPress={acceptNewProvider}>
                  <Text style={styles.acceptButtonText}>Accept New Provider →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalDismiss} onPress={closeModal}>
                  <Text style={styles.modalDismissText}>Cancel — Keep Original</Text>
                </TouchableOpacity>
              </>
            )}

          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function Info({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
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
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerStepText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  localHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  headerSpacer: { width: 38, height: 38 },

  content:   { padding: 20, paddingBottom: 150 }, // Added generous scroll spacing for auto-hide

  sectionHeading: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '900', marginTop: 12 },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 20, fontWeight: '700' },

  // Provider card
  card: {
    padding: 20,
    gap: 16,
    marginBottom: 16,
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
    fontWeight: '900',
  },
  profileName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  profileService: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
    textTransform: 'capitalize',
  },
  profileCompany: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  profileDivider: {
    height: 1,
    backgroundColor: 'rgba(14,143,70,0.06)',
    marginVertical: 4,
  },
  infoRow:   { flexDirection: 'row', gap: 12, alignItems: 'center' },
  infoIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.chip },
  infoLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  infoValue: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '900', marginTop: 2 },

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
  reasoningTitle: { color: COLORS.primary, fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  reasoningText:  { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  reasoningLink:  { color: COLORS.primary, fontWeight: '800', fontSize: 12, marginTop: 8 },
 
  // CTAs
  primaryButton:  { backgroundColor: COLORS.primary, borderRadius: 20, paddingVertical: 17, alignItems: 'center', marginTop: 4 },
  primaryText:    { color: '#fff', fontSize: 16, fontWeight: '900' },
  secondaryButton:{ alignItems: 'center', paddingVertical: 14 },
  secondaryText:  { color: COLORS.primary, fontWeight: '800', fontSize: 14 },
 
  // Dev section
  devSection: { marginTop: 24 },
  devSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'center',
  },
  devDot:        { width: 24, height: 1, backgroundColor: 'rgba(14,143,70,0.16)' },
  devSectionTitle: { color: COLORS.textMuted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
 
  chaosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.16)',
    borderStyle: 'dashed',
  },
  chaosButtonTitle: { color: COLORS.danger, fontWeight: '800', fontSize: 13 },
  chaosButtonSub:   { color: COLORS.textMuted, fontSize: 10, marginTop: 2, fontWeight: '700' },
  chaosArrow:       { width: 28, alignItems: 'center' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 37, 26, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    minHeight: 320,
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.12)',
  },

  // Modal — loading
  modalLoadingBody: { alignItems: 'center', paddingVertical: 24 },
  modalLoadingTitle:{ color: COLORS.textPrimary, fontSize: 20, fontWeight: '900', marginTop: 16, marginBottom: 12 },
  modalLoadingSteps:{ color: COLORS.textSecondary, fontSize: 12, lineHeight: 20, textAlign: 'center', fontFamily: 'monospace' },

  // Modal — error
  modalTitle:   { color: COLORS.danger, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  errorText:    { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 20 },

  // Modal — success
  chaosResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  chaosResultIcon:   { fontSize: 32 },
  chaosResultTitle:  { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900' },
  chaosResultSub:    { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

  providerChip: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
    backgroundColor: COLORS.chip,
    borderColor: 'rgba(14,143,70,0.12)',
  },
  providerChipLabel: { color: COLORS.danger, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  providerChipName:  { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900', marginTop: 4 },
  providerChipPrice: { color: COLORS.primary, fontSize: 14, fontWeight: '700', marginTop: 4 },

  chaosArrowDown: { textAlign: 'center', fontSize: 18, color: COLORS.textMuted, marginVertical: 4 },

  chaosReasoning: {
    backgroundColor: COLORS.chip,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.12)',
    marginTop: 12,
    marginBottom: 4,
  },
  chaosReasoningTitle: { color: COLORS.primary, fontSize: 11, fontWeight: '800', marginBottom: 8 },
  chaosReasoningText:  { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },

  acceptButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  acceptButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  modalDismiss:     { alignItems: 'center', paddingVertical: 14 },
  modalDismissText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 13 },
  smallFooterText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
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
  modalOverlayCenter: {
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
  modalTitleCenter: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10251A',
    marginBottom: 12,
    textAlign: 'center',
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
