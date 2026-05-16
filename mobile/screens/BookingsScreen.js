import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiquidGlass from '../components/LiquidGlass';
import { useTabBarVisibility } from '../components/TabBarVisibility';
import { COLORS } from '../theme';
import { subscribeSessionBookings } from '../sessionBookings';

function money(value) {
  return typeof value === 'number' ? `PKR ${Math.round(value).toLocaleString('en-PK')}` : 'Quote pending';
}

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const { registerScroll } = useTabBarVisibility();
  const [bookings, setBookings] = useState([]);

  useEffect(() => subscribeSessionBookings(setBookings), []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 118, paddingBottom: insets.bottom + 128 }]}
      onScroll={registerScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>Current session</Text>
      <Text style={styles.title}>Bookings</Text>
      <Text style={styles.subtitle}>Only bookings confirmed during this app session appear here.</Text>

      {bookings.length === 0 ? (
        <LiquidGlass style={styles.emptyCard} contentStyle={styles.emptyContent} strong>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-clear-outline" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No session bookings yet</Text>
          <Text style={styles.emptyText}>Confirmed bookings will show up here immediately after checkout.</Text>
        </LiquidGlass>
      ) : (
        bookings.map(booking => (
          <LiquidGlass key={booking.id} style={styles.bookingCard} contentStyle={styles.bookingContent}>
            <View style={styles.bookingTop}>
              <View style={styles.serviceIcon}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.bookingCopy}>
                <Text style={styles.bookingTitle}>{booking.service}</Text>
                <Text style={styles.bookingMeta}>{booking.provider}</Text>
              </View>
              <View style={styles.statusChip}>
                <Text style={styles.statusText}>LIVE</Text>
              </View>
            </View>
            <View style={styles.detailGrid}>
              <Detail icon="location-outline" label="Area" value={[booking.area, booking.city].filter(Boolean).join(', ')} />
              <Detail icon="time-outline" label="Slot" value={booking.slot} />
              <Detail icon="cash-outline" label="Quote" value={money(booking.quote_pkr)} />
            </View>
          </LiquidGlass>
        ))
      )}
    </ScrollView>
  );
}

function Detail({ icon, label, value }) {
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={15} color={COLORS.primary} />
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={2}>{value || 'N/A'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 18 },
  eyebrow: { color: COLORS.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: COLORS.textPrimary, fontSize: 30, lineHeight: 36, fontWeight: '900', marginTop: 8 },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 18, fontWeight: '600' },
  emptyCard: { marginTop: 6 },
  emptyContent: { padding: 22, alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft, marginBottom: 12 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900' },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  bookingCard: { marginBottom: 14 },
  bookingContent: { padding: 16, gap: 14 },
  bookingTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  serviceIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft },
  bookingCopy: { flex: 1 },
  bookingTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '900' },
  bookingMeta: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  statusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.primary },
  statusText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  detailGrid: { gap: 10 },
  detail: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.58)' },
  detailCopy: { flex: 1 },
  detailLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  detailValue: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800', marginTop: 2 },
});
