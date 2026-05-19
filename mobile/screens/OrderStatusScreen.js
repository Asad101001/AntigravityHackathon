import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiquidGlass from '../components/LiquidGlass';
import { useTabBarVisibility } from '../components/TabBarVisibility';
import { COLORS } from '../theme';
import { sendLocalNotification } from '../notifications';

const STAGES = ['Confirmed', 'Assigned', 'On the way', 'Started', 'Completed'];

export default function OrderStatusScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { registerScroll } = useTabBarVisibility();
  const { booking } = route.params;
  const [stageIndex, setStageIndex] = useState(booking?.stageIndex || 0);
  const [loading, setLoading] = useState(false);

  const progress = useMemo(() => stageIndex / (STAGES.length - 1), [stageIndex]);

  const advanceStage = async () => {
    if (!booking) return;
    setLoading(true);
    const next = Math.min(stageIndex + 1, STAGES.length - 1);
    setStageIndex(next);
    await sendLocalNotification(
      'Asaaniyat status update',
      `${booking.provider_name}: ${STAGES[next]}`,
      { booking_id: booking._id, stage: STAGES[next] }
    );
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return '#4CAF50';
      case 'operating':
        return '#2196F3';
      case 'completed':
        return '#9C27B0';
      case 'canceled':
        return '#F44336';
      default:
        return COLORS.primary;
    }
  };

  if (!booking) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 118, paddingBottom: insets.bottom + 128 }]}
      >
        <LiquidGlass style={styles.card} contentStyle={styles.emptyContent} strong>
          <View style={styles.emptyIcon}>
            <Ionicons name="pulse-outline" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Booking not found</Text>
          <Text style={styles.emptyText}>Unable to load order status.</Text>
        </LiquidGlass>
      </ScrollView>
    );
  }

  const statusColor = getStatusColor(booking.status);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 118, paddingBottom: insets.bottom + 128 }]}
      onScroll={registerScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>Order Status</Text>
      <Text style={styles.title}>{booking.service_type}</Text>
      <Text style={styles.subtitle}>{booking.provider_name}</Text>

      {/* Booking Info Card */}
      <LiquidGlass style={styles.infoCard} contentStyle={styles.infoContent} strong>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={18} color={COLORS.primary} />
          <View style={styles.infoCopy}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{[booking.area, booking.city].filter(Boolean).join(', ')}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
          <View style={styles.infoCopy}>
            <Text style={styles.infoLabel}>Appointment</Text>
            <Text style={styles.infoValue}>
              {(() => {
                try {
                  return new Date(booking.booking_start_time).toLocaleString('en-PK');
                } catch (_) {
                  return new Date(booking.booking_start_time).toString();
                }
              })()}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={18} color={COLORS.primary} />
          <View style={styles.infoCopy}>
            <Text style={styles.infoLabel}>Quote</Text>
            <Text style={styles.infoValue}>
              {booking.quote_pkr ? `PKR ${Math.round(booking.quote_pkr).toLocaleString('en-PK')}` : 'Pending'}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={18} color={statusColor} />
          <View style={styles.infoCopy}>
            <Text style={styles.infoLabel}>Current Status</Text>
            <Text style={[styles.infoValue, { color: statusColor }]}>
              {booking.status?.toUpperCase()}
            </Text>
          </View>
        </View>
      </LiquidGlass>

      {/* Progress Track */}
      {booking.status?.toLowerCase() !== 'canceled' && (
        <LiquidGlass style={styles.card} contentStyle={styles.cardContent} strong>
          <Text style={styles.progressTitle}>Service Progress</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { flex: progress }]} />
            <View style={{ flex: 1 - progress }} />
          </View>

          <View style={styles.stageRow}>
            {STAGES.map((stage, index) => {
              const done = index <= stageIndex;
              return (
                <View key={stage} style={styles.stageItem}>
                  <View style={[styles.stageDot, done && styles.stageDotDone]}>
                    <Ionicons
                      name={done ? 'checkmark' : 'ellipse'}
                      size={done ? 10 : 6}
                      color={done ? '#FFFFFF' : COLORS.textMuted}
                    />
                  </View>
                  <Text style={[styles.stageText, done && styles.stageTextDone]} numberOfLines={2}>
                    {stage}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.advanceButton, loading && styles.advanceButtonDisabled]}
            onPress={advanceStage}
            disabled={loading}
            activeOpacity={0.84}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.advanceButtonText}>
              {loading ? 'Updating...' : 'Update Status'}
            </Text>
          </TouchableOpacity>
        </LiquidGlass>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 18 },
  eyebrow: { color: COLORS.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: COLORS.textPrimary, fontSize: 28, lineHeight: 34, fontWeight: '900', marginTop: 8 },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 2, marginBottom: 18, fontWeight: '600' },

  // Info Card
  infoCard: { marginBottom: 16 },
  infoContent: { padding: 16, gap: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  infoCopy: { flex: 1 },
  infoLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600', marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },

  // Progress Card
  card: { marginBottom: 16 },
  cardContent: { padding: 18, gap: 18 },
  progressTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900' },
  progressTrack: { height: 8, borderRadius: 6, backgroundColor: 'rgba(14,143,70,0.12)', overflow: 'hidden', flexDirection: 'row' },
  progressFill: { height: 8, borderRadius: 6, backgroundColor: COLORS.accent },
  stageRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  stageItem: { flex: 1, alignItems: 'center' },
  stageDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border },
  stageDotDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stageText: { color: COLORS.textMuted, textAlign: 'center', fontSize: 9, fontWeight: '800', marginTop: 5, lineHeight: 12 },
  stageTextDone: { color: COLORS.textPrimary },

  // Advance Button
  advanceButton: { backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  advanceButtonDisabled: { opacity: 0.6 },
  advanceButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },

  // Empty state
  emptyContent: { padding: 22, alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft, marginBottom: 12 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900' },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
});
