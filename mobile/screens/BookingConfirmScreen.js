/**
 * Screen 5: BookingConfirmScreen
 * Selected provider details, time slot, confirm/cancel
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView
} from 'react-native';
import { COLORS } from '../config';

export default function BookingConfirmScreen({ route, navigation }) {
  const { provider, fullResult } = route.params;

  const handleConfirm = () => {
    navigation.navigate('Confirmation', { fullResult });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Confirm Your Booking</Text>

        {/* Provider Details Card */}
        <View style={styles.card}>
          <View style={styles.providerHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {provider.name?.charAt(0) || '?'}
              </Text>
            </View>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{provider.name}</Text>
              <Text style={styles.providerService}>
                {fullResult.parsed_intent?.service_type || 'Service Provider'}
              </Text>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <DetailRow icon="📞" label="Contact" value={provider.phone} />
            <DetailRow icon="📍" label="Distance" value={`${provider.distance_km} km away`} />
            <DetailRow icon="⭐" label="Rating" value={`${provider.rating}/5 (${provider.reviews_count} reviews)`} />
            <DetailRow icon="🕐" label="Time Slot" value={fullResult.provider?.confirmed_slot || 'First available'} />
            <DetailRow icon="📅" label="When" value={
              fullResult.parsed_intent?.time_preference?.replace(/_/g, ' ') || 'Today'
            } />
            <DetailRow icon="📍" label="Location" value={
              fullResult.parsed_intent?.location || 'Your area'
            } />
          </View>
        </View>

        {/* Score Summary */}
        {provider.scores && (
          <View style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>Top Match</Text>
            <View style={styles.scoreRow}>
              <View style={styles.scoreMeter}>
                <Text style={styles.scoreNum}>{(provider.scores.total * 100).toFixed(0)}</Text>
                <Text style={styles.scorePercent}>%</Text>
              </View>
              <Text style={styles.scoreDesc}>
                We selected this provider for you based on their proximity, high ratings, and availability.
              </Text>
            </View>
          </View>
        )}

        {/* Reminders Info */}
        <View style={styles.reminderCard}>
          <Text style={styles.reminderTitle}>📬 After booking, you'll receive:</Text>
          <Text style={styles.reminderItem}>🔔 Push notification 1 hour before</Text>
          <Text style={styles.reminderItem}>📱 SMS reminder 30 minutes before</Text>
          <Text style={styles.reminderItem}>⭐ Feedback request next day</Text>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmButtonText}>✓  Confirm Booking</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>← Back to Results</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 24 },

  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 24 },

  // Provider Card
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
    marginBottom: 16,
  },
  providerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary + '22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  providerService: { fontSize: 13, color: COLORS.accent, marginTop: 2 },

  detailsGrid: {},
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailIcon: { fontSize: 16, marginRight: 10, width: 24 },
  detailLabel: { fontSize: 13, color: COLORS.textSecondary, width: 75 },
  detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },

  // Score
  scoreCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  scoreTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  scoreMeter: { flexDirection: 'row', alignItems: 'baseline', marginRight: 14 },
  scoreNum: { fontSize: 36, fontWeight: '800', color: COLORS.primary },
  scorePercent: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  scoreDesc: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  // Reminders
  reminderCard: {
    backgroundColor: COLORS.accent + '11',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.accent + '33',
    marginBottom: 24,
  },
  reminderTitle: { fontSize: 13, fontWeight: '600', color: COLORS.accent, marginBottom: 10 },
  reminderItem: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, paddingLeft: 4 },

  // Buttons
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButtonText: { fontSize: 17, fontWeight: '700', color: '#0A0E17' },
  cancelButton: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 30,
  },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
});

