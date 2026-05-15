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
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Modal, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { COLORS, API_URL } from '../config';

// ---------------------------------------------------------------------------
export default function BookingConfirmScreen({ route, navigation }) {
  const { provider, fullResult } = route.params;
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

  // ── Trigger chaos simulation ─────────────────────────────────────────
  const simulateCancellation = async () => {
    setChaosError(null);
    setChaosLoading(true);
    setChaosModalOpen(true);

    try {
      const response = await axios.post(
        `${API_URL}/chaos/simulate`,
        {
          provider_id:  provider.id || provider.provider_id || null,
          booking_id:   fullResult?.booking_id || null,
          user_id:      fullResult?.user_id    || null,
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
        quote_pkr:      chaosResult.quote_pkr  ?? fullResult.quote_pkr,
        quote_breakdown: chaosResult.quote_breakdown ?? fullResult.quote_breakdown,
      },
    });
  };

  // ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <Text style={styles.step}>STEP 5 OF 5</Text>
        <Text style={styles.title}>Review Booking</Text>
        <Text style={styles.subtitle}>
          Please confirm your service details below.
        </Text>

        {/* ── Provider details card ─────────────────────────────────────── */}
        <View style={styles.card}>
          <Info
            icon="construct-outline"
            label="Service Type"
            value={
              provider.service_type ||
              provider.service      ||
              fullResult.parsed_intent?.service_type ||
              'Service'
            }
          />
          <Info icon="person-circle-outline" label="Provider"         value={provider.name || 'TBD'} />
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
        </View>

        {/* ── Reasoning snippet ─────────────────────────────────────────── */}
        {fullResult?.reasoning_log && (
          <View style={styles.reasoningCard}>
            <Text style={styles.reasoningTitle}>🧠 AI Reasoning</Text>
            <Text style={styles.reasoningText} numberOfLines={3}>
              {fullResult.reasoning_log}
            </Text>
            <TouchableOpacity onPress={() =>
              navigation.navigate('AgentTrace', {
                executionLogs: fullResult.execution_logs,
                reasoningLog:  fullResult.reasoning_log,
              })
            }>
              <Text style={styles.reasoningLink}>View full agent trace →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Primary CTA ───────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            navigation.navigate('ReviewBooking', {
              provider:   { ...provider, confirmed_slot: slot },
              fullResult,
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.primaryText}>Continue to Checkout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryText}>Choose another provider</Text>
        </TouchableOpacity>

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

      </ScrollView>

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
                    {chaosResult.quote_pkr && (
                      <Text style={styles.providerChipPrice}>
                        PKR {Math.round(chaosResult.quote_pkr).toLocaleString('en-PK')}
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
    </SafeAreaView>
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
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content:   { padding: 20, paddingBottom: 40 },

  step:     { color: COLORS.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title:    { color: COLORS.textPrimary, fontSize: 27, fontWeight: '900', marginTop: 24 },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 6, marginBottom: 20 },

  // Provider card
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
    marginBottom: 14,
  },
  infoRow:   { flexDirection: 'row', gap: 12, alignItems: 'center' },
  infoIcon:  { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.chip || COLORS.bgCard },
  infoLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  infoValue: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '900', marginTop: 2 },

  // Reasoning snippet
  reasoningCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
    marginBottom: 14,
  },
  reasoningTitle: { color: COLORS.primary, fontWeight: '800', fontSize: 12, marginBottom: 8 },
  reasoningText:  { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  reasoningLink:  { color: COLORS.primary, fontWeight: '700', fontSize: 12, marginTop: 8 },

  // CTAs
  primaryButton:  { backgroundColor: COLORS.primary, borderRadius: 20, paddingVertical: 17, alignItems: 'center', marginTop: 4 },
  primaryText:    { color: '#fff', fontSize: 16, fontWeight: '900' },
  secondaryButton:{ alignItems: 'center', paddingVertical: 14 },
  secondaryText:  { color: COLORS.primary, fontWeight: '800' },

  // Dev section
  devSection: { marginTop: 24 },
  devSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'center',
  },
  devDot:        { width: 24, height: 1, backgroundColor: COLORS.border },
  devSectionTitle: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },

  chaosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.danger + '55',
    borderStyle: 'dashed',
  },
  chaosButtonTitle: { color: COLORS.danger, fontWeight: '800', fontSize: 13 },
  chaosButtonSub:   { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  chaosArrow:       { width: 28, alignItems: 'center' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.bgCard || '#141922',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    minHeight: 320,
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
    backgroundColor: COLORS.bg,
  },
  providerChipLabel: { color: COLORS.danger, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  providerChipName:  { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900', marginTop: 4 },
  providerChipPrice: { color: COLORS.primary, fontSize: 14, fontWeight: '700', marginTop: 4 },

  chaosArrowDown: { textAlign: 'center', fontSize: 18, color: COLORS.textMuted, marginVertical: 4 },

  chaosReasoning: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
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
});
