/**
 * Screen 7: AgentTraceScreen — Reasoning-First Edition
 *
 * Layout priority (top → bottom):
 *   1. Global reasoning_log hero card  ← judges read THIS first
 *   2. Per-agent expandable trace cards
 *   3. Execution timeline bar
 *   4. Export JSON button
 *
 * reasoning_log is passed via route.params.reasoningLog OR extracted
 * from the first rank_providers log that contains one.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Share, ActivityIndicator, Animated, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarVisibility } from '../components/TabBarVisibility';
import { COLORS, API_URL } from '../config';
import apiClient from '../lib/apiClient';

// ---------------------------------------------------------------------------
// Agent metadata map
// ---------------------------------------------------------------------------
const AGENT_META = {
  parse_intent:       { label: 'Intent Parser',       iconName: 'bulb-outline', color: '#7C3AED' },
  resolve_location:   { label: 'Location Resolver',   iconName: 'location-outline', color: '#0EA5E9' },
  discover_providers: { label: 'Provider Discoverer', iconName: 'search-outline', color: '#10B981' },
  rank_providers:     { label: 'Provider Ranker',     iconName: 'stats-chart-outline', color: '#F59E0B' },
  make_decision:      { label: 'Decision Maker',      iconName: 'aperture-outline', color: '#EF4444' },
  dynamic_pricing:    { label: 'Dynamic Pricing',     iconName: 'cash-outline', color: '#14B8A6' },
  execute_booking:    { label: 'Booking Executor',    iconName: 'clipboard-outline', color: '#6366F1' },
  schedule_followup:  { label: 'Follow-Up Manager',   iconName: 'notifications-outline', color: '#EC4899' },
};

// ---------------------------------------------------------------------------
export default function AgentTraceScreen({ route }) {
  const insets = useSafeAreaInsets();
  const HEADER_PADDING = insets.top + (Platform.OS === 'ios' ? 74 : 64);
  const { registerScroll } = useTabBarVisibility();
  const [logs, setLogs]           = useState(route?.params?.executionLogs || []);
  const [loading, setLoading]     = useState(!route?.params?.executionLogs);
  const [expandedId, setExpandedId] = useState(null);

  // reasoning_log passed directly, or we'll extract it from logs
  const passedReasoning = route?.params?.reasoningLog || null;
  const [reasoningLog, setReasoningLog] = useState(passedReasoning);

  // Fade-in for the hero card
  const heroFade  = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    if (!route?.params?.executionLogs) {
      fetchLogs();
    } else {
      extractReasoning(route.params.executionLogs);
      animateHero();
    }
  }, []);

  const animateHero = () => {
    Animated.parallel([
      Animated.timing(heroFade,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const extractReasoning = (logList) => {
    if (passedReasoning) return;
    // Pull reasoning_log from the ranker step if available
    const rankerLog = logList?.find(l =>
      l.name === 'rank_providers' || l.name === 'make_decision'
    );
    const extracted =
      rankerLog?.reasoning ||
      rankerLog?.output?.reasoning_log ||
      logList?.find(l => l.reasoning)?.reasoning ||
      null;
    setReasoningLog(extracted);
  };

  const fetchLogs = async () => {
    try {
      const response = await apiClient.get('/logs');
      const traces   = Array.isArray(response.data) ? response.data : [];
      const latestWorkflow = traces.find(t => Array.isArray(t.execution_logs));

      if (latestWorkflow?.execution_logs) {
        setLogs(latestWorkflow.execution_logs);
        extractReasoning(latestWorkflow.execution_logs);
        // Also check top-level reasoning_log on the workflow object
        if (!passedReasoning && latestWorkflow.reasoning_log) {
          setReasoningLog(latestWorkflow.reasoning_log);
        }
      } else {
        const mappedLogs = traces.map((l, i) => ({
          id: i + 1,
          name:        l.agent || l.action || `agent_${i + 1}`,
          status:      l.error ? 'error' : 'success',
          duration_ms: l.durationMs || l.duration_ms || 0,
          input:       l.input,
          output:      l.output,
          reasoning:   l.reasoning,
          error:       l.error,
          timestamp:   l.timestamp,
        }));
        setLogs(mappedLogs);
        extractReasoning(mappedLogs);
      }
    } catch (e) {
      console.warn('Failed to fetch logs', e);
    } finally {
      setLoading(false);
      animateHero();
    }
  };

  const handleExport = async () => {
    try {
      const payload = JSON.stringify({
        workflow_id:   `WF_${Date.now()}`,
        status:        'completed',
        reasoning_log: reasoningLog,
        tasks:         logs,
      }, null, 2);
      await Share.share({ message: payload, title: 'Antigravity Agent Trace Logs' });
    } catch (_) {}
  };

  // ── Status helpers ────────────────────────────────────────────────────
  const statusColor = (s) => ({
    success: COLORS.success || '#10B981',
    error:   COLORS.danger  || '#EF4444',
    timeout: COLORS.warning || '#F59E0B',
  }[s] || COLORS.textMuted);

  const statusIcon = (s) => ({
    success: { name: 'checkmark-circle', color: '#16A34A' },
    error: { name: 'close-circle', color: '#DC2626' },
    timeout: { name: 'time-outline', color: '#D97706' },
  }[s] || { name: 'hourglass-outline', color: '#8EA095' });

  const totalDuration = logs.reduce((sum, l) => sum + (l.duration_ms || 0), 0);

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingLabel}>Loading agent traces…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: HEADER_PADDING, paddingBottom: insets.bottom + 40 }]}
        onScroll={registerScroll}
        scrollEventThrottle={16}
      >

        {/* ════════════════════════════════════════════════════════════════
            HERO: reasoning_log — this is what judges care about most
        ════════════════════════════════════════════════════════════════ */}
        {reasoningLog ? (
          <Animated.View style={[
            styles.reasoningHero,
            { opacity: heroFade, transform: [{ translateY: heroSlide }] }
          ]}>
            {/* Badge */}
            <View style={styles.reasoningBadgeRow}>
              <View style={styles.reasoningBadge}>
                <View style={styles.reasoningBadgeContent}><Ionicons name="bulb-outline" size={13} color={COLORS.primary} /><Text style={styles.reasoningBadgeText}>AI DECISION REASONING</Text></View>
              </View>
              <View style={styles.llmChip}>
                <Text style={styles.llmChipText}>LLMRankerAgent</Text>
              </View>
            </View>

            {/* Headline */}
            <Text style={styles.reasoningHeadline}>
              Why this provider was selected
            </Text>

            {/* The actual reasoning text */}
            <View style={styles.reasoningBody}>
              <Text style={styles.reasoningText}>{reasoningLog}</Text>
            </View>

            {/* Footer note */}
            <Text style={styles.reasoningFooter}>
              ↳ Generated by LLM after evaluating all candidate providers
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.reasoningEmpty}>
            <Text style={styles.reasoningEmptyText}>
              No reasoning_log in this trace. Ensure your backend's
              LLMRankerAgent returns a `reasoning_log` field.
            </Text>
          </View>
        )}

        {/* ── Summary stats ─────────────────────────────────────────────── */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Antigravity Execution Trace</Text>
          <View style={styles.summaryRow}>
            <SummaryStat value={logs.length} label="Agents" />
            <View style={styles.summaryDivider} />
            <SummaryStat value={`${totalDuration}ms`} label="Total Time" />
            <View style={styles.summaryDivider} />
            <SummaryStat
              value={`${logs.filter(l => l.status === 'success').length}/${logs.length}`}
              label="Success"
              valueColor={COLORS.success}
            />
          </View>
        </View>

        {/* ── Per-agent cards ───────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>AGENT PIPELINE</Text>
        {logs.map((log, index) => {
          const meta       = AGENT_META[log.name] || { label: log.name, iconName: 'cog-outline', color: COLORS.primary };
          const isExpanded = expandedId === (log.id ?? index);
          const hasReason  = !!log.reasoning;

          return (
            <TouchableOpacity
              key={log.id ?? index}
              style={[styles.logCard, isExpanded && { borderColor: meta.color + '88' }]}
              onPress={() => setExpandedId(isExpanded ? null : (log.id ?? index))}
              activeOpacity={0.8}
            >
              {/* ── Card header ─────────────────────────────────────── */}
              <View style={styles.logHeader}>
                {/* Numbered circle with agent colour */}
                <View style={[styles.stepCircle, { backgroundColor: meta.color + '22' }]}>
                  <Text style={[styles.stepCircleText, { color: meta.color }]}>
                    {log.id ?? index + 1}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.logNameRow}>
                    <Ionicons name={meta.iconName} size={20} color={meta.color} />
                    <Text style={styles.logName}>{meta.label}</Text>
                  </View>
                  <View style={styles.logTimingRow}>
                    <Ionicons name={statusIcon(log.status).name} size={14} color={statusIcon(log.status).color} />
                    <Text style={styles.logTiming}>{log.status} · {log.duration_ms}ms{hasReason ? ' · has reasoning' : ''}</Text>
                  </View>
                </View>

                <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
              </View>

              {/* ── Expanded details ─────────────────────────────────── */}
              {isExpanded && (
                <View style={styles.logDetails}>

                  {/* Per-agent reasoning (distinct from global reasoning_log) */}
                  {log.reasoning && (
                    <DetailBlock
                      iconName="chatbubble-ellipses-outline"
                      title="Agent Reasoning"
                      color={meta.color}
                      highlight
                    >
                      <Text style={styles.detailText}>{log.reasoning}</Text>
                    </DetailBlock>
                  )}

                  {/* Input */}
                  {log.input && (
                    <DetailBlock iconName="download-outline" title="Input" color={meta.color}>
                      <CodeBlock value={log.input} />
                    </DetailBlock>
                  )}

                  {/* Output */}
                  {log.output && (
                    <DetailBlock iconName="cloud-upload-outline" title="Output" color={meta.color}>
                      <CodeBlock value={log.output} maxLen={900} />
                    </DetailBlock>
                  )}

                  {/* Error */}
                  {log.error && (
                    <DetailBlock iconName="close-circle" title="Error" color={COLORS.danger}>
                      <Text style={[styles.detailText, { color: COLORS.danger }]}>
                        {log.error}
                      </Text>
                    </DetailBlock>
                  )}

                  {/* Timestamp */}
                  {log.timestamp && (
                    <Text style={styles.timestamp}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* ── Execution timeline ────────────────────────────────────────── */}
        <View style={styles.timelineCard}>
          <Text style={styles.sectionLabel}>EXECUTION TIMELINE</Text>
          {logs.map((log, i) => {
            const meta         = AGENT_META[log.name] || { color: COLORS.primary };
            const widthPercent = totalDuration > 0
              ? Math.max((log.duration_ms / totalDuration) * 100, 5)
              : 100 / logs.length;
            return (
              <View key={log.id ?? i} style={styles.timelineRow}>
                <Text style={styles.timelineIdx}>{log.id ?? i + 1}</Text>
                <View style={styles.timelineBarBg}>
                  <View style={[
                    styles.timelineBarFill,
                    { width: `${widthPercent}%`, backgroundColor: meta.color || statusColor(log.status) }
                  ]} />
                </View>
                <Text style={styles.timelineMs}>{log.duration_ms}ms</Text>
              </View>
            );
          })}
        </View>

        {/* ── Export ───────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.exportButton} onPress={handleExport} activeOpacity={0.8}>
          <View style={styles.exportButtonContent}><Ionicons name="clipboard-outline" size={18} color="#0A0E17" /><Text style={styles.exportButtonText}>Export Full Trace as JSON</Text></View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SummaryStat({ value, label, valueColor }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, valueColor && { color: valueColor }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function DetailBlock({ iconName, title, color, highlight, children }) {
  return (
    <View style={[styles.detailSection, highlight && {
      backgroundColor: color + '11',
      borderRadius: 10,
      borderLeftWidth: 3,
      borderLeftColor: color,
      padding: 10,
    }]}>
      <View style={styles.detailTitleRow}>
        <Ionicons name={iconName} size={14} color={color || COLORS.accent} />
        <Text style={[styles.detailTitle, { color: color || COLORS.accent }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function CodeBlock({ value, maxLen = 800 }) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  const truncated = raw.length > maxLen ? raw.slice(0, maxLen) + '\n…' : raw;
  return (
    <View style={styles.codeBlock}>
      <Text style={styles.codeText}>{truncated}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },
  centered:     { justifyContent: 'center', alignItems: 'center' },
  content:      { paddingHorizontal: 16 },
  loadingLabel: { color: COLORS.textSecondary, marginTop: 12, fontSize: 13 },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },

  // ── Reasoning hero ─────────────────────────────────────────────────────
  reasoningHero: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '88',
  },
  reasoningBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  reasoningBadgeContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reasoningBadge: {
    backgroundColor: COLORS.primary + '22',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reasoningBadgeText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  llmChip: {
    backgroundColor: COLORS.accent ? COLORS.accent + '22' : COLORS.primary + '11',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  llmChipText: {
    color: COLORS.accent || COLORS.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  reasoningHeadline: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  reasoningBody: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reasoningText: {
    fontSize: 13,
    lineHeight: 21,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  reasoningFooter: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 10,
    fontStyle: 'italic',
  },
  reasoningEmpty: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reasoningEmptyText: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },

  // ── Summary card ───────────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 14,
  },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem:    { alignItems: 'center' },
  summaryValue:   { fontSize: 22, fontWeight: '800', color: COLORS.accent || COLORS.primary },
  summaryLabel:   { fontSize: 10, color: COLORS.textMuted, marginTop: 4, textTransform: 'uppercase' },
  summaryDivider: { width: 1, height: 30, backgroundColor: COLORS.border },

  // ── Log cards ─────────────────────────────────────────────────────────
  logCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logHeader:     { flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepCircleText: { fontSize: 14, fontWeight: '800' },
  logNameRow:     { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logName:        { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  logTimingRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  logTiming:      { fontSize: 11, color: COLORS.textSecondary },
  expandIcon:     { fontSize: 12, color: COLORS.textMuted, marginLeft: 8 },

  // ── Expanded details ──────────────────────────────────────────────────
  logDetails: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  detailSection: { marginBottom: 12 },
  detailTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  detailTitle:   { fontSize: 11, fontWeight: '700' },
  detailText:    { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  codeBlock: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  codeText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: COLORS.textSecondary,
    lineHeight: 15,
  },
  timestamp: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },

  // ── Timeline ──────────────────────────────────────────────────────────
  timelineCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    marginBottom: 14,
  },
  timelineRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  timelineIdx:     { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, width: 22, textAlign: 'center' },
  timelineBarBg:   { flex: 1, height: 9, backgroundColor: COLORS.border, borderRadius: 5, overflow: 'hidden', marginHorizontal: 8 },
  timelineBarFill: { height: '100%', borderRadius: 5 },
  timelineMs:      { fontSize: 10, color: COLORS.textMuted, width: 44, textAlign: 'right' },

  // ── Export ────────────────────────────────────────────────────────────
  exportButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  exportButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  exportButtonText: { fontSize: 14, fontWeight: '700', color: '#0A0E17' },
});
