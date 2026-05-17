/**
 * AgentTraceScreen.js — Task 14.6: Emoji → Ionicons Replacement
 * All agent step emojis and status icons now use premium Ionicons vectors.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Share, ActivityIndicator, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, API_URL } from '../config';
import apiClient from '../lib/apiClient';

// ── 14.6: Agent metadata — Ionicons replace emojis ───────────────────────────
const AGENT_META = {
  parse_intent:       { label: 'Intent Parser',       icon: 'bulb-outline',           color: '#7C3AED' },
  resolve_location:   { label: 'Location Resolver',   icon: 'location-outline',       color: '#0EA5E9' },
  discover_providers: { label: 'Provider Discoverer', icon: 'search-outline',          color: '#10B981' },
  rank_providers:     { label: 'Provider Ranker',     icon: 'stats-chart-outline',    color: '#F59E0B' },
  make_decision:      { label: 'Decision Maker',      icon: 'aperture-outline',       color: '#EF4444' },
  dynamic_pricing:    { label: 'Dynamic Pricing',     icon: 'cash-outline',           color: '#14B8A6' },
  execute_booking:    { label: 'Booking Executor',    icon: 'clipboard-outline',      color: '#6366F1' },
  schedule_followup:  { label: 'Follow-Up Manager',   icon: 'notifications-outline',  color: '#EC4899' },
};

// 14.6: Status icon helper — Ionicons only, no emoji
function StatusIcon({ status, size = 16 }) {
  switch (status) {
    case 'success': return <Ionicons name="checkmark-circle"  size={size} color="#16A34A" />;
    case 'error':   return <Ionicons name="close-circle"       size={size} color="#DC2626" />;
    case 'timeout': return <Ionicons name="time-outline"       size={size} color="#D97706" />;
    default:        return <Ionicons name="hourglass-outline"  size={size} color="#8EA095" />;
  }
}

function statusColor(s) {
  return { success: '#16A34A', error: '#DC2626', timeout: '#D97706' }[s] || COLORS.textMuted;
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function AgentTraceScreen({ route }) {
  const insets = useSafeAreaInsets();
  const [logs, setLogs]             = useState(route?.params?.executionLogs || []);
  const [loading, setLoading]       = useState(!route?.params?.executionLogs);
  const [expandedId, setExpandedId] = useState(null);
  const passedReasoning             = route?.params?.reasoningLog || null;
  const [reasoningLog, setReasoningLog] = useState(passedReasoning);

  const heroFade  = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(-12)).current;

  // 14.3: Standard header padding
  const HEADER_PADDING = insets.top + (Platform.OS === 'ios' ? 74 : 64);

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
    const rankerLog = logList?.find(l => l.name === 'rank_providers' || l.name === 'make_decision');
    const extracted = rankerLog?.reasoning || rankerLog?.output?.reasoning_log || logList?.find(l => l.reasoning)?.reasoning || null;
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
        if (!passedReasoning && latestWorkflow.reasoning_log) setReasoningLog(latestWorkflow.reasoning_log);
      } else {
        const mappedLogs = traces.map((l, i) => ({
          id: i + 1,
          name: l.agent || l.action || `agent_${i + 1}`,
          status: l.error ? 'error' : 'success',
          duration_ms: l.durationMs || l.duration_ms || 0,
          input: l.input, output: l.output, reasoning: l.reasoning,
          error: l.error, timestamp: l.timestamp,
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
      const payload = JSON.stringify({ workflow_id: `WF_${Date.now()}`, status: 'completed', reasoning_log: reasoningLog, tasks: logs }, null, 2);
      await Share.share({ message: payload, title: 'Antigravity Agent Trace Logs' });
    } catch (_) {}
  };

  const totalDuration = logs.reduce((sum, l) => sum + (l.duration_ms || 0), 0);

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
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: HEADER_PADDING }]}>

        {/* Reasoning hero */}
        {reasoningLog ? (
          <Animated.View style={[styles.reasoningHero, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
            <View style={styles.reasoningBadgeRow}>
              <View style={styles.reasoningBadge}>
                {/* 14.6: Ionicons instead of emoji */}
                <Ionicons name="bulb-outline" size={12} color={COLORS.primary} />
                <Text style={styles.reasoningBadgeText}>  AI DECISION REASONING</Text>
              </View>
              <View style={styles.llmChip}>
                <Text style={styles.llmChipText}>LLMRankerAgent</Text>
              </View>
            </View>
            <Text style={styles.reasoningHeadline}>Why this provider was selected</Text>
            <View style={styles.reasoningBody}>
              <Text style={styles.reasoningText}>{reasoningLog}</Text>
            </View>
            <Text style={styles.reasoningFooter}>↳ Generated by LLM after evaluating all candidate providers</Text>
          </Animated.View>
        ) : (
          <View style={styles.reasoningEmpty}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.textMuted} style={{ marginBottom: 6 }} />
            <Text style={styles.reasoningEmptyText}>No reasoning_log in this trace. Ensure the backend's LLMRankerAgent returns a reasoning_log field.</Text>
          </View>
        )}

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Antigravity Execution Trace</Text>
          <View style={styles.summaryRow}>
            <SummaryStat value={logs.length} label="Agents" />
            <View style={styles.summaryDivider} />
            <SummaryStat value={`${totalDuration}ms`} label="Total Time" />
            <View style={styles.summaryDivider} />
            <SummaryStat value={`${logs.filter(l => l.status === 'success').length}/${logs.length}`} label="Success" valueColor={COLORS.success} />
          </View>
        </View>

        <Text style={styles.sectionLabel}>AGENT PIPELINE</Text>
        {logs.map((log, index) => {
          const meta       = AGENT_META[log.name] || { label: log.name, icon: 'settings-outline', color: COLORS.primary };
          const isExpanded = expandedId === (log.id ?? index);
          const hasReason  = !!log.reasoning;

          return (
            <TouchableOpacity
              key={log.id ?? index}
              style={[styles.logCard, isExpanded && { borderColor: meta.color + '88' }]}
              onPress={() => setExpandedId(isExpanded ? null : (log.id ?? index))}
              activeOpacity={0.8}
            >
              <View style={styles.logHeader}>
                {/* 14.6: Ionicons agent icon in the step circle */}
                <View style={[styles.stepCircle, { backgroundColor: meta.color + '22' }]}>
                  <Ionicons name={meta.icon} size={16} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logName}>{meta.label}</Text>
                  <View style={styles.logTimingRow}>
                    <StatusIcon status={log.status} size={13} />
                    <Text style={styles.logTiming}>
                      {log.status} · {log.duration_ms}ms
                      {hasReason ? '  ·  has reasoning' : ''}
                    </Text>
                  </View>
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
              </View>

              {isExpanded && (
                <View style={styles.logDetails}>
                  {log.reasoning && (
                    <DetailBlock icon="chatbubble-outline" title="Agent Reasoning" color={meta.color} highlight>
                      <Text style={styles.detailText}>{log.reasoning}</Text>
                    </DetailBlock>
                  )}
                  {log.input && (
                    <DetailBlock icon="arrow-down-circle-outline" title="Input" color={meta.color}>
                      <CodeBlock value={log.input} />
                    </DetailBlock>
                  )}
                  {log.output && (
                    <DetailBlock icon="arrow-up-circle-outline" title="Output" color={meta.color}>
                      <CodeBlock value={log.output} maxLen={900} />
                    </DetailBlock>
                  )}
                  {log.error && (
                    <DetailBlock icon="close-circle-outline" title="Error" color={COLORS.danger}>
                      <Text style={[styles.detailText, { color: COLORS.danger }]}>{log.error}</Text>
                    </DetailBlock>
                  )}
                  {log.timestamp && (
                    <View style={styles.timestampRow}>
                      <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                      <Text style={styles.timestamp}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.sectionLabel}>EXECUTION TIMELINE</Text>
          {logs.map((log, i) => {
            const meta         = AGENT_META[log.name] || { color: COLORS.primary };
            const widthPercent = totalDuration > 0 ? Math.max((log.duration_ms / totalDuration) * 100, 5) : 100 / logs.length;
            return (
              <View key={log.id ?? i} style={styles.timelineRow}>
                <Text style={styles.timelineIdx}>{log.id ?? i + 1}</Text>
                <View style={styles.timelineBarBg}>
                  <View style={[styles.timelineBarFill, { width: `${widthPercent}%`, backgroundColor: meta.color || statusColor(log.status) }]} />
                </View>
                <Text style={styles.timelineMs}>{log.duration_ms}ms</Text>
              </View>
            );
          })}
        </View>

        {/* Export */}
        <TouchableOpacity style={styles.exportButton} onPress={handleExport} activeOpacity={0.8}>
          <Ionicons name="clipboard-outline" size={18} color="#FFFFFF" />
          <Text style={styles.exportButtonText}>  Export Full Trace as JSON</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-components
function SummaryStat({ value, label, valueColor }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, valueColor && { color: valueColor }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function DetailBlock({ icon, title, color, highlight, children }) {
  return (
    <View style={[styles.detailSection, highlight && { backgroundColor: color + '11', borderRadius: 10, borderLeftWidth: 3, borderLeftColor: color, padding: 10 }]}>
      <View style={styles.detailTitleRow}>
        <Ionicons name={icon} size={13} color={color || COLORS.accent} />
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

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },
  centered:     { justifyContent: 'center', alignItems: 'center' },
  content:      { padding: 16, paddingBottom: 40 },
  loadingLabel: { color: COLORS.textSecondary, marginTop: 12, fontSize: 13 },

  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },

  reasoningHero: { backgroundColor: COLORS.bgCard, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1.5, borderColor: COLORS.primary + '88' },
  reasoningBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  reasoningBadge: { backgroundColor: COLORS.primary + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' },
  reasoningBadgeText: { color: COLORS.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  llmChip: { backgroundColor: COLORS.accent + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  llmChipText: { color: COLORS.accent, fontSize: 9, fontWeight: '700' },
  reasoningHeadline: { fontSize: 17, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 12 },
  reasoningBody: { backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  reasoningText: { fontSize: 13, lineHeight: 21, color: COLORS.textPrimary, fontWeight: '500' },
  reasoningFooter: { fontSize: 10, color: COLORS.textMuted, marginTop: 10, fontStyle: 'italic' },
  reasoningEmpty: { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  reasoningEmptyText: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },

  summaryCard: { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '800', color: COLORS.accent },
  summaryLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, textTransform: 'uppercase' },
  summaryDivider: { width: 1, height: 30, backgroundColor: COLORS.border },

  logCard: { backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  logHeader: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  logTimingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  logTiming: { fontSize: 11, color: COLORS.textSecondary },

  logDetails: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  detailSection: { marginBottom: 12 },
  detailTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  detailTitle: { fontSize: 11, fontWeight: '700' },
  detailText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  codeBlock: { backgroundColor: COLORS.bg, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: COLORS.border },
  codeText: { fontSize: 10, fontFamily: 'monospace', color: COLORS.textSecondary, lineHeight: 15 },
  timestampRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  timestamp: { fontSize: 10, color: COLORS.textMuted },

  timelineCard: { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginTop: 4, marginBottom: 14 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  timelineIdx: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, width: 22, textAlign: 'center' },
  timelineBarBg: { flex: 1, height: 9, backgroundColor: COLORS.border, borderRadius: 5, overflow: 'hidden', marginHorizontal: 8 },
  timelineBarFill: { height: '100%', borderRadius: 5 },
  timelineMs: { fontSize: 10, color: COLORS.textMuted, width: 44, textAlign: 'right' },

  exportButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10, flexDirection: 'row', justifyContent: 'center' },
  exportButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});