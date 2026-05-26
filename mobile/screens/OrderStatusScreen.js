/**
 * OrderStatusScreen.js — Service Status with Simulated Map Tracker
 * Shows booking progress stages + animated provider location tracker.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import LiquidGlass from '../components/LiquidGlass';
import { COLORS, SHADOWS } from '../theme';

const STAGES = [
  { key: 'confirmed', label: 'Confirmed',  icon: 'checkmark-circle-outline' },
  { key: 'dispatched', label: 'Dispatched', icon: 'navigate-outline' },
  { key: 'arriving',   label: 'Arriving',   icon: 'car-outline' },
  { key: 'working',    label: 'In Progress', icon: 'construct-outline' },
  { key: 'completed',  label: 'Completed',  icon: 'trophy-outline' },
];

function getStageIndex(status) {
  const map = { confirmed: 0, dispatched: 1, arriving: 2, en_route: 2, working: 3, in_progress: 3, completed: 4, done: 4 };
  return map[status?.toLowerCase()] ?? 0;
}

// ── Simulated Map Tracker ──────────────────────────────────────────────────
function SimulatedMapTracker({ stageIndex }) {
  const dotAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate the dot position based on the stage
    Animated.timing(dotAnim, {
      toValue: stageIndex / (STAGES.length - 1),
      duration: 1200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    // Pulse animation for the moving dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [stageIndex]);

  const dotLeft = dotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['5%', '85%'],
  });

  return (
    <View style={trackerStyles.container}>
      {/* Mini map background with grid */}
      <View style={trackerStyles.mapBg}>
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map(i => (
          <View key={`h-${i}`} style={[trackerStyles.gridLine, { top: `${i * 25}%` }]} />
        ))}
        {[0, 1, 2, 3].map(i => (
          <View key={`v-${i}`} style={[trackerStyles.gridLineV, { left: `${(i + 1) * 25}%` }]} />
        ))}

        {/* Route path */}
        <View style={trackerStyles.routePath} />

        {/* Start point (Home) */}
        <View style={trackerStyles.startPoint}>
          <Ionicons name="home" size={12} color="#FFFFFF" />
        </View>

        {/* End point (Destination) */}
        <View style={trackerStyles.endPoint}>
          <Ionicons name="location" size={12} color="#FFFFFF" />
        </View>

        {/* Animated moving dot */}
        <Animated.View style={[trackerStyles.movingDotWrap, { left: dotLeft }]}>
          <Animated.View style={[trackerStyles.movingDotPulse, { transform: [{ scale: pulseAnim }] }]} />
          <View style={trackerStyles.movingDot}>
            <Ionicons name="car" size={14} color="#FFFFFF" />
          </View>
        </Animated.View>

        {/* Status label */}
        <View style={trackerStyles.statusLabel}>
          <Ionicons name="navigate" size={10} color={COLORS.primary} />
          <Text style={trackerStyles.statusLabelText}>
            {stageIndex <= 1 ? 'Dispatching...' : stageIndex === 2 ? 'On the way!' : stageIndex === 3 ? 'Arrived — Working' : 'Service Complete ✓'}
          </Text>
        </View>
      </View>

      {/* ETA bar */}
      <View style={trackerStyles.etaRow}>
        <Ionicons name="time-outline" size={14} color={COLORS.primary} />
        <Text style={trackerStyles.etaText}>
          {stageIndex <= 1 ? 'ETA: ~25 min' : stageIndex === 2 ? 'ETA: ~10 min' : stageIndex === 3 ? 'Provider on-site' : 'Completed'}
        </Text>
      </View>
    </View>
  );
}

const trackerStyles = StyleSheet.create({
  container: {
    marginBottom: 18,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.1)',
    backgroundColor: '#EEF8F2',
    ...SHADOWS.card,
  },
  mapBg: {
    height: 160,
    backgroundColor: '#E8F4ED',
    position: 'relative',
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(14,143,70,0.06)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(14,143,70,0.06)',
  },
  routePath: {
    position: 'absolute',
    top: '50%',
    left: '5%',
    right: '5%',
    height: 4,
    backgroundColor: 'rgba(14,143,70,0.15)',
    borderRadius: 2,
    marginTop: -2,
  },
  startPoint: {
    position: 'absolute',
    left: '3%',
    top: '42%',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...SHADOWS.pressed,
  },
  endPoint: {
    position: 'absolute',
    right: '3%',
    top: '42%',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...SHADOWS.pressed,
  },
  movingDotWrap: {
    position: 'absolute',
    top: '38%',
    alignItems: 'center',
  },
  movingDotPulse: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(14,143,70,0.12)',
    top: -8,
    left: -8,
  },
  movingDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2F80ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...SHADOWS.card,
  },
  statusLabel: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.1)',
  },
  statusLabelText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  etaText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
});

// ── Main Screen ────────────────────────────────────────────────────────────
export default function OrderStatusScreen({ route, navigation }) {
  const booking = route.params?.booking;
  const insets  = useSafeAreaInsets();

  const currentStage = getStageIndex(booking?.status);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stageAnims = useRef(STAGES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStage / (STAGES.length - 1),
      duration: 1000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    stageAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i <= currentStage ? 1 : 0,
        delay: i * 120,
        useNativeDriver: true,
        damping: 14,
        stiffness: 120,
      }).start();
    });
  }, [currentStage]);

  const info = useMemo(() => [
    { label: 'SERVICE', value: booking?.service || 'Home Service', icon: 'briefcase-outline' },
    { label: 'PROVIDER', value: booking?.provider || 'Asaaniyat Pro', icon: 'person-outline' },
    { label: 'BOOKING ID', value: booking?.id?.slice(0, 12) || 'ASN-001', icon: 'document-text-outline' },
    { label: 'CREATED', value: booking?.created_at ? new Date(booking.created_at).toLocaleString('en-PK') : 'Recently', icon: 'time-outline' },
  ], [booking]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.shell}>
      <View style={styles.ambientTop} />
      <ScreenHeader navigation={navigation} title="Service Status" stepLabel="LIVE TRACKER" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Simulated Map Tracker ──────────────────────── */}
        <SimulatedMapTracker stageIndex={currentStage} />

        {/* ── Title ──────────────────────────────────────── */}
        <Text style={styles.heading}>
          {booking?.service || 'Service'} Status
        </Text>
        <Text style={styles.sub}>Real-time tracking for your booking</Text>

        {/* ── Progress Bar ───────────────────────────────── */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
            <View style={styles.progressGlow} />
          </Animated.View>
        </View>

        {/* ── Stages ─────────────────────────────────────── */}
        <View style={styles.stagesRow}>
          {STAGES.map((stage, i) => {
            const done = i <= currentStage;
            const active = i === currentStage;
            return (
              <Animated.View
                key={stage.key}
                style={[
                  styles.stageItem,
                  { opacity: stageAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                  { transform: [{ scale: stageAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] },
                ]}
              >
                <View style={[
                  styles.stageDot,
                  done && styles.stageDotDone,
                  active && styles.stageDotActive,
                ]}>
                  <Ionicons
                    name={done ? 'checkmark' : stage.icon}
                    size={active ? 14 : 12}
                    color={done ? '#FFFFFF' : COLORS.textMuted}
                  />
                </View>
                <Text style={[styles.stageLabel, done && styles.stageLabelDone]} numberOfLines={1}>
                  {stage.label}
                </Text>
              </Animated.View>
            );
          })}
        </View>

        {/* ── Info Card ──────────────────────────────────── */}
        <LiquidGlass style={styles.infoCard} radius={18}>
          {info.map((item, i) => (
            <View key={item.label} style={[styles.infoRow, i < info.length - 1 && styles.infoRowBorder]}>
              <Ionicons name={item.icon} size={16} color={COLORS.primary} style={{ flexShrink: 0 }} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </LiquidGlass>

        {/* ── Update Status Button ───────────────────────── */}
        <TouchableOpacity
          style={styles.updateBtn}
          activeOpacity={0.84}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.updateBtnText}>Back to Bookings</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: COLORS.bg },
  ambientTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '35%',
    backgroundColor: '#EFF6FF',
    opacity: 0.45,
  },
  content: { padding: 18, paddingTop: 14 },

  heading: { fontSize: 28, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -0.3, lineHeight: 34 },
  sub: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700', marginTop: 4, marginBottom: 18, lineHeight: 20 },

  // Progress bar — taller with glow
  progressTrack: {
    height: 10,
    backgroundColor: 'rgba(14,143,70,0.08)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 22,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 5,
    position: 'relative',
  },
  progressGlow: {
    position: 'absolute',
    right: 0,
    top: -2,
    bottom: -2,
    width: 20,
    backgroundColor: 'rgba(34,197,94,0.3)',
    borderRadius: 10,
  },

  // Stages
  stagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 4,
  },
  stageItem: { alignItems: 'center', flex: 1 },
  stageDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EAF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.12)',
    marginBottom: 6,
  },
  stageDotDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stageDotActive: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...SHADOWS.iconGlow,
  },
  stageLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  stageLabelDone: { color: COLORS.primary },

  // Info card
  infoCard: { padding: 16, marginBottom: 20, gap: 0 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(14,143,70,0.06)',
  },
  infoContent: { flex: 1 },
  infoLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  infoValue: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 2, lineHeight: 21 },

  // Update button
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    ...SHADOWS.card,
  },
  updateBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});
