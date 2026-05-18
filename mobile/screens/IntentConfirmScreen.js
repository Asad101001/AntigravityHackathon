/**
 * Screen 2: IntentConfirmScreen
 * Shows parsed intent: Service, Location, Time, Confidence %
 * Warning if confidence < 0.7. Confirm/Edit buttons.
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Platform
} from 'react-native';
import { COLORS } from '../config';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarVisibility } from '../components/TabBarVisibility';

export default function IntentConfirmScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const HEADER_PADDING = insets.top + (Platform.OS === 'ios' ? 74 : 64);
  const { registerScroll } = useTabBarVisibility();
  const { parsedIntent, fullResult } = route.params;

  const confidence = Math.round((parsedIntent.confidence || 0) * 100);
  const isLowConfidence = confidence < 70;

  const getConfidenceColor = () => {
    if (confidence >= 80) return COLORS.success;
    if (confidence >= 60) return COLORS.warning;
    return COLORS.danger;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: HEADER_PADDING, paddingBottom: insets.bottom + 24 }]}
        onScroll={registerScroll}
        scrollEventThrottle={16}
      >
        <Text style={styles.title}>Please confirm your details:</Text>

        {/* Parsed Fields */}
        <View style={styles.card}>
          <ParsedRow 
            label="Service" 
            value={parsedIntent.service_type || 'Not detected'}
            success={!!parsedIntent.service_type}
          />
          <View style={styles.separator} />
          <ParsedRow 
            label="Location" 
            value={parsedIntent.location || 'Not specified'}
            success={!!parsedIntent.location}
          />
          <View style={styles.separator} />
          <ParsedRow 
            label="Time" 
            value={parsedIntent.time_preference?.replace(/_/g, ' ') || 'Earliest available'} 
            success={!!parsedIntent.time_preference}
          />
          <View style={styles.separator} />
          <ParsedRow 
            label="Language" 
            value={parsedIntent.language || 'English'} 
            success={true}
          />
          {parsedIntent.urgency === 'high' && (
            <>
              <View style={styles.separator} />
              <ParsedRow label="Urgency" value="HIGH" success={true} />
            </>
          )}
        </View>

        {/* Low Confidence Warning */}
        {isLowConfidence && (
          <View style={styles.warningCard}>
            <Ionicons name="time-outline" size={24} color={COLORS.warning} style={styles.warningIcon} />
            <Text style={styles.warningText}>
              Some details may be missing or incorrect. Please review and edit if needed.
            </Text>
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => navigation.navigate('ProviderResults', { fullResult })}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmButtonText}>✓  Confirm & Find Providers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.editButtonText}>Edit Request</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ParsedRow({ label, value, success }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValueWrap}>
        <Text style={styles.rowCheck}>{success ? '✓' : '✗'}</Text>
        <Text style={[styles.rowValue, !success && styles.rowValueMissing]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 24 },

  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 20, textAlign: 'center' },

  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  rowValueWrap: { flexDirection: 'row', alignItems: 'center' },
  rowCheck: { fontSize: 14, marginRight: 6, color: COLORS.primary },
  rowValue: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  rowValueMissing: { color: COLORS.danger },
  separator: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },

  separator: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },

  // Warning
  warningCard: {
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.3)',
    marginBottom: 20,
  },
  warningIcon: { fontSize: 20, marginRight: 10 },
  warningText: { fontSize: 13, color: COLORS.warning, flex: 1, lineHeight: 20 },

  // Buttons
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButtonText: { fontSize: 16, fontWeight: '700', color: '#0A0E17' },
  editButton: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
});

