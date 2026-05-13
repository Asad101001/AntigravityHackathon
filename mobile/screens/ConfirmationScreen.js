/**
 * Screen 6: ConfirmationScreen
 * Success screen: booking ID, provider contact, arrival time
 * Shows reminders scheduled. "View Agent Trace" button.
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Animated, Share
} from 'react-native';
import { COLORS } from '../config';

export default function ConfirmationScreen({ route, navigation }) {
  const { fullResult } = route.params;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const provider = fullResult.provider || {};
  const bookingId = fullResult.booking_id || 'N/A';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `✅ Booking Confirmed!\n\nProvider: ${provider.name}\nContact: ${provider.phone}\nSlot: ${provider.confirmed_slot || 'TBD'}\nBooking ID: ${bookingId}\n\nBooked via Asaaniyat 🚀`,
      });
    } catch (e) {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Success Animation */}
        <Animated.View style={[styles.successCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.successIcon}>✅</Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successMessage}>
            {fullResult.confirmation_message || `${provider.name} has been booked successfully.`}
          </Text>

          {/* Booking Details */}
          <View style={styles.detailCard}>
            <View style={styles.idRow}>
              <Text style={styles.idLabel}>Booking ID</Text>
              <Text style={styles.idValue}>{bookingId}</Text>
            </View>
            <View style={styles.separator} />
            
            <DetailItem icon="👤" label="Provider" value={provider.name} />
            <DetailItem icon="📞" label="Contact" value={provider.phone} />
            <DetailItem icon="🕐" label="Time Slot" value={provider.confirmed_slot || 'First available'} />
            <DetailItem icon="📍" label="Distance" value={`${provider.distance_km} km`} />
            <DetailItem icon="⭐" label="Rating" value={`${provider.rating}/5`} />
            <DetailItem icon="🔔" label="Reminders" value={`${fullResult.reminders_scheduled || 3} scheduled`} />
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Text style={styles.shareButtonText}>📤  Share Booking Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.popToTop()}
            activeOpacity={0.7}
          >
            <Text style={styles.homeButtonText}>🏠  Back to Home</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '—'}</Text>
    </View>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 24, alignItems: 'center', paddingTop: 60 },

  // Success
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '22',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: { fontSize: 40 },
  successTitle: { fontSize: 26, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 10 },
  successMessage: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 10 },

  // Details
  detailCard: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
    marginBottom: 16,
  },
  idRow: { alignItems: 'center', paddingVertical: 8 },
  idLabel: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  idValue: { fontSize: 16, fontWeight: '800', color: COLORS.accent, fontFamily: 'monospace', marginTop: 4 },
  separator: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },

  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  detailIcon: { fontSize: 14, marginRight: 10, width: 22 },
  detailLabel: { fontSize: 13, color: COLORS.textSecondary, width: 80 },
  detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },

  // Stats
  statsCard: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  statsTitle: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBadge: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 80,
  },
  statBadgeValue: { fontSize: 20, fontWeight: '800' },
  statBadgeLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, textTransform: 'uppercase' },

  // Buttons
  shareButton: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  shareButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  homeButton: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 30,
  },
  homeButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
});

