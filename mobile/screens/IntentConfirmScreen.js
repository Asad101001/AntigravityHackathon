/**
 * Screen 2: IntentConfirmScreen
 * Shows parsed intent: Service, Location, Time, Confidence %
 * Premium glassmorphic design matching the rest of Asaaniyat.
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, SHADOWS } from '../theme';
import LiquidGlass from '../components/LiquidGlass';

const SERVICE_ICON_MAP = {
  electrician: 'flash',
  plumber: 'water',
  'ac repair': 'snow',
  ac: 'snow',
  carpenter: 'hammer',
  painter: 'brush',
  cleaning: 'sparkles',
  handyman: 'construct',
  mechanic: 'car',
  pest: 'bug',
  gardening: 'leaf',
  maid: 'home',
  default: 'build',
};

function getServiceIcon(serviceType = '') {
  const key = serviceType.toLowerCase();
  return Object.entries(SERVICE_ICON_MAP).find(([k]) => key.includes(k))?.[1] || SERVICE_ICON_MAP.default;
}

function formatTimePreference(tp) {
  if (!tp) return 'Earliest available';
  return tp
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/(\d{3,4})$/, match => {
      const h = match.length === 3 ? `0${match[0]}:${match.slice(1)}` : `${match.slice(0, 2)}:${match.slice(2)}`;
      const [hh, mm] = h.split(':').map(Number);
      const period = hh >= 12 ? 'PM' : 'AM';
      const h12 = hh % 12 || 12;
      return `${h12}:${String(mm).padStart(2, '0')} ${period}`;
    });
}

export default function IntentConfirmScreen({ route, navigation }) {
  const { parsedIntent, fullResult } = route.params;
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  const confidence = Math.round((parsedIntent.confidence || 0) * 100);
  const isLowConfidence = confidence < 70;
  const isHighConfidence = confidence >= 85;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 18, stiffness: 160, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, damping: 16, stiffness: 140, useNativeDriver: true }),
    ]).start();
  }, []);

  const confidenceColor = isHighConfidence ? COLORS.primary : isLowConfidence ? COLORS.danger : COLORS.warning;

  const rows = [
    {
      icon: getServiceIcon(parsedIntent.service_type),
      label: 'SERVICE REQUESTED',
      value: parsedIntent.service_type || null,
      missing: 'Could not detect service',
      success: !!parsedIntent.service_type,
    },
    {
      icon: 'location',
      label: 'LOCATION',
      value: parsedIntent.location || null,
      missing: 'Using GPS / city selection',
      success: true, // GPS fallback is fine
      soft: !parsedIntent.location, // soft means it's using fallback
    },
    {
      icon: 'time',
      label: 'PREFERRED TIME',
      value: parsedIntent.time_preference ? formatTimePreference(parsedIntent.time_preference) : null,
      missing: 'Earliest available',
      success: true,
      soft: !parsedIntent.time_preference,
    },
    {
      icon: 'language',
      label: 'LANGUAGE DETECTED',
      value: (parsedIntent.language || 'English').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      success: true,
    },
  ];

  if (parsedIntent.urgency === 'high') {
    rows.push({ icon: 'warning', label: 'URGENCY', value: 'High Priority', success: true, urgent: true });
  }

  return (
    <View style={styles.container}>
      {/* Ambient Background */}
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.82}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.stepLabel}>STEP 2 OF 5</Text>
          <Text style={styles.headerTitle}>Confirm Intent</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="never"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
          
          {/* AI Parsed Badge */}
          <View style={styles.aiBadgeRow}>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={12} color={COLORS.primary} style={{ marginRight: 5 }} />
              <Text style={styles.aiBadgeText}>AI Parsed Your Request</Text>
            </View>
          </View>

          {/* Main Intent Card */}
          <LiquidGlass style={styles.intentCard} radius={20} strong>
            {rows.map((row, index) => (
              <View key={index}>
                {index > 0 && <View style={styles.rowDivider} />}
                <View style={styles.intentRow}>
                  <View style={[
                    styles.iconCircle,
                    row.urgent && styles.iconCircleUrgent,
                    !row.success && styles.iconCircleMissing,
                  ]}>
                    <Ionicons
                      name={row.icon}
                      size={18}
                      color={row.urgent ? COLORS.danger : row.soft ? COLORS.textMuted : COLORS.primary}
                    />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                    <Text style={[
                      styles.rowValue,
                      row.soft && styles.rowValueSoft,
                      row.urgent && styles.rowValueUrgent,
                      !row.success && !row.soft && styles.rowValueMissing,
                    ]}>
                      {row.value || row.missing}
                    </Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: row.success ? COLORS.primary : COLORS.danger }]} />
                </View>
              </View>
            ))}
          </LiquidGlass>

          {/* Confidence Panel */}
          <LiquidGlass style={styles.confidenceCard} radius={16}>
            <View style={styles.confidenceRow}>
              <View>
                <Text style={styles.confidenceLabel}>AI CONFIDENCE</Text>
                <Text style={[styles.confidenceValue, { color: confidenceColor }]}>{confidence}%</Text>
              </View>
              <View style={styles.confidenceBarTrack}>
                <View style={[styles.confidenceBarFill, { width: `${confidence}%`, backgroundColor: confidenceColor }]} />
              </View>
            </View>
            {isLowConfidence && (
              <View style={styles.warningRow}>
                <Ionicons name="warning-outline" size={14} color={COLORS.warning} style={{ marginRight: 6 }} />
                <Text style={styles.warningText}>
                  Some details may be incomplete. Review above before continuing.
                </Text>
              </View>
            )}
          </LiquidGlass>

        </Animated.View>
      </ScrollView>

      {/* Sticky Actions */}
      <View style={[styles.stickyActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => navigation.navigate('ProviderResults', { fullResult })}
          activeOpacity={0.84}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.confirmButtonText}>Confirm & Find Providers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.editButtonText}>Edit Request</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  ambientTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '40%',
    backgroundColor: '#EFF6FF',
    opacity: 0.55,
  },
  ambientBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '30%',
    backgroundColor: '#EAF8EF',
    opacity: 0.5,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: RADII.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.94)',
    ...SHADOWS.card,
  },
  headerCenter: { alignItems: 'center' },
  stepLabel: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  headerSpacer: { width: 38, height: 38 },

  content: { paddingHorizontal: 18, paddingTop: 12 },

  aiBadgeRow: { alignItems: 'center', marginBottom: 14 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14,143,70,0.08)',
    borderRadius: RADII.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.12)',
  },
  aiBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  intentCard: {
    marginBottom: 14,
    padding: 6,
  },
  intentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(14,143,70,0.06)',
    marginHorizontal: 14,
  },
  iconCircle: {
    width: 42, height: 42,
    borderRadius: RADII.sm,
    backgroundColor: '#EAF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCircleUrgent: { backgroundColor: 'rgba(220,38,38,0.08)' },
  iconCircleMissing: { backgroundColor: 'rgba(220,38,38,0.06)' },
  rowContent: { flex: 1 },
  rowLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rowValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 3,
    lineHeight: 22,
  },
  rowValueSoft: { color: COLORS.textSecondary, fontWeight: '700', fontStyle: 'italic' },
  rowValueUrgent: { color: COLORS.danger },
  rowValueMissing: { color: COLORS.danger },
  statusDot: {
    width: 8, height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },

  confidenceCard: {
    marginBottom: 18,
    padding: 16,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  confidenceLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  confidenceValue: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
  },
  confidenceBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(14,143,70,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(217,119,6,0.12)',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warning,
    lineHeight: 19,
    fontWeight: '700',
  },

  // Sticky bottom actions
  stickyActions: {
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(14,143,70,0.06)',
    gap: 10,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...SHADOWS.card,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: RADII.lg,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.12)',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
});
