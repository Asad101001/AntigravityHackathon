/**
 * Screen 7: AgentTraceScreen
 * Scrollable list of all 7 agents with timing, input, output, and reasoning
 * Export as JSON
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Share, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { COLORS, API_URL } from '../config';

export default function AgentTraceScreen({ route }) {
  const [logs, setLogs] = useState(route?.params?.executionLogs || []);
  const [loading, setLoading] = useState(!route?.params?.executionLogs);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!route?.params?.executionLogs) {
      fetchLogs();
    }
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/logs`);
      const traces = Array.isArray(response.data) ? response.data : [];
      const latestWorkflow = traces.find(t => Array.isArray(t.execution_logs));

      if (latestWorkflow?.execution_logs) {
        setLogs(latestWorkflow.execution_logs);
        return;
      }

      // Maps per-agent trace files to a format readable here.
      const mappedLogs = traces.map((l, i) => ({
        id: i + 1,
        name: l.agent || l.action || `agent_${i + 1}`,
        status: l.error ? 'error' : 'success',
        duration_ms: l.durationMs || l.duration_ms || 0,
        input: l.input,
        output: l.output,
        reasoning: l.reasoning,
        error: l.error,
        timestamp: l.timestamp
      }));
      setLogs(mappedLogs);
    } catch (e) {
      console.warn('Failed to fetch logs', e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const traceJson = JSON.stringify({
        workflow_id: `WF_${Date.now()}`,
        status: 'completed',
        tasks: logs
      }, null, 2);

      await Share.share({
        message: traceJson,
        title: 'Antigravity Agent Trace Logs'
      });
    } catch (e) {}
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return COLORS.success;
      case 'error': return COLORS.danger;
      case 'timeout': return COLORS.warning;
      default: return COLORS.textMuted;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'timeout': return '⏰';
      default: return '⏳';
    }
  };

  const AGENT_NAMES = {
    parse_intent: { label: 'Intent Parser', icon: '🧠' },
    resolve_location: { label: 'Location Resolver', icon: '📍' },
    discover_providers: { label: 'Provider Discoverer', icon: '🔍' },
    rank_providers: { label: 'Provider Ranker', icon: '📊' },
    make_decision: { label: 'Decision Maker', icon: '🎯' },
    execute_booking: { label: 'Booking Executor', icon: '📋' },
    schedule_followup: { label: 'Follow-Up Manager', icon: '🔔' },
  };

  const totalDuration = logs.reduce((sum, l) => sum + (l.duration_ms || 0), 0);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Summary Header */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Antigravity Execution Trace</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{logs.length}</Text>
              <Text style={styles.summaryLabel}>Agents</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalDuration}ms</Text>
              <Text style={styles.summaryLabel}>Total Time</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                {logs.filter(l => l.status === 'success').length}/{logs.length}
              </Text>
              <Text style={styles.summaryLabel}>Success</Text>
            </View>
          </View>
        </View>

        {/* Agent Logs */}
        {logs.map((log, index) => {
          const agentInfo = AGENT_NAMES[log.name] || { label: log.name, icon: '⚙️' };
          const isExpanded = expandedId === log.id;

          return (
            <TouchableOpacity
              key={log.id || index}
              style={[styles.logCard, isExpanded && styles.logCardExpanded]}
              onPress={() => setExpandedId(isExpanded ? null : log.id)}
              activeOpacity={0.8}
            >
              {/* Header */}
              <View style={styles.logHeader}>
                <View style={styles.logLeft}>
                  <View style={[styles.stepNumber, { backgroundColor: getStatusColor(log.status) + '22' }]}>
                    <Text style={[styles.stepNumberText, { color: getStatusColor(log.status) }]}>
                      {log.id}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.logName}>{agentInfo.icon}  {agentInfo.label}</Text>
                    <Text style={styles.logTiming}>
                      {getStatusIcon(log.status)} {log.status} · {log.duration_ms}ms
                    </Text>
                  </View>
                </View>
                <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
              </View>

              {/* Expanded Details */}
              {isExpanded && (
                <View style={styles.logDetails}>
                  {/* Reasoning */}
                  {log.reasoning && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailTitle}>💭 Reasoning</Text>
                      <Text style={styles.detailText}>{log.reasoning}</Text>
                    </View>
                  )}

                  {/* Input */}
                  {log.input && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailTitle}>📥 Input</Text>
                      <View style={styles.codeBlock}>
                        <Text style={styles.codeText}>
                          {typeof log.input === 'string' ? log.input : JSON.stringify(log.input, null, 2)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Output */}
                  {log.output && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailTitle}>📤 Output</Text>
                      <View style={styles.codeBlock}>
                        <Text style={styles.codeText}>
                          {JSON.stringify(log.output, null, 2).slice(0, 800)}
                          {JSON.stringify(log.output, null, 2).length > 800 ? '\n...' : ''}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Error */}
                  {log.error && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailTitle}>❌ Error</Text>
                      <Text style={[styles.detailText, { color: COLORS.danger }]}>{log.error}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Timeline Bar */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Execution Timeline</Text>
          {logs.map((log) => {
            const agentInfo = AGENT_NAMES[log.name] || { label: log.name };
            const widthPercent = totalDuration > 0 ? Math.max((log.duration_ms / totalDuration) * 100, 5) : 14;
            return (
              <View key={log.id} style={styles.timelineRow}>
                <Text style={styles.timelineLabel}>{log.id}</Text>
                <View style={styles.timelineBarBg}>
                  <View style={[styles.timelineBarFill, {
                    width: `${widthPercent}%`,
                    backgroundColor: getStatusColor(log.status)
                  }]} />
                </View>
                <Text style={styles.timelineMs}>{log.duration_ms}ms</Text>
              </View>
            );
          })}
        </View>

        {/* Export */}
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExport}
          activeOpacity={0.8}
        >
          <Text style={styles.exportButtonText}>📋  Export as JSON</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20 },

  // Summary
  summaryCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '800', color: COLORS.accent },
  summaryLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, textTransform: 'uppercase' },
  summaryDivider: { width: 1, height: 30, backgroundColor: COLORS.border },

  // Log Cards
  logCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logCardExpanded: { borderColor: COLORS.accent + '66' },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: { fontSize: 14, fontWeight: '800' },
  logName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  logTiming: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  expandIcon: { fontSize: 12, color: COLORS.textMuted },

  // Details
  logDetails: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  detailSection: { marginBottom: 14 },
  detailTitle: { fontSize: 12, fontWeight: '600', color: COLORS.accent, marginBottom: 6 },
  detailText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  codeBlock: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  codeText: { fontSize: 10, fontFamily: 'monospace', color: COLORS.textSecondary, lineHeight: 16 },

  // Timeline
  timelineCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
    marginBottom: 16,
  },
  timelineTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  timelineLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, width: 20, textAlign: 'center' },
  timelineBarBg: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden', marginHorizontal: 8 },
  timelineBarFill: { height: '100%', borderRadius: 4 },
  timelineMs: { fontSize: 10, color: COLORS.textMuted, width: 40, textAlign: 'right' },

  // Export
  exportButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 30,
  },
  exportButtonText: { fontSize: 15, fontWeight: '700', color: '#0A0E17' },
});

