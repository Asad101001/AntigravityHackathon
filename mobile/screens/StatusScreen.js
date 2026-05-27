import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiquidGlass from '../components/LiquidGlass';
import { useTabBarVisibility } from '../components/TabBarVisibility';
import { COLORS, FONTS } from '../theme';
import { getActiveBooking, subscribeSessionBookings } from '../sessionBookings';
import { sendLocalNotification } from '../notifications';

const STAGES = ['Confirmed', 'Assigned', 'On the way', 'Started', 'Completed'];

export default function StatusScreen() {
  const insets = useSafeAreaInsets();
  const { registerScroll } = useTabBarVisibility();
  const [booking, setBooking] = useState(getActiveBooking());
  const [stageIndex, setStageIndex] = useState(booking?.stageIndex || 0);

  useEffect(() => subscribeSessionBookings(list => {
    const next = list[0] || null;
    setBooking(next);
    setStageIndex(next?.stageIndex || 0);
  }), []);

  const progress = useMemo(() => stageIndex / (STAGES.length - 1), [stageIndex]);

  const advanceStage = async () => {
    if (!booking) return;
    const next = Math.min(stageIndex + 1, STAGES.length - 1);
    setStageIndex(next);
    await sendLocalNotification('Asaaniyat status update', `${booking.provider}: ${STAGES[next]}`, { booking_id: booking.id, stage: STAGES[next] });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 118, paddingBottom: insets.bottom + 128 }]}
      onScroll={registerScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>Live status</Text>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Service progress</Text>
        <Text style={styles.urduTitle}>سروس کی پیشرفت</Text>
      </View>

      {!booking ? (
        <LiquidGlass style={styles.card} contentStyle={styles.emptyContent} strong>
          <View style={styles.emptyIcon}>
            <Ionicons name="pulse-outline" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No active booking</Text>
          <Text style={styles.emptyText}>Confirm a booking to track provider assignment and arrival updates here.</Text>
        </LiquidGlass>
      ) : (
        <>
          <LiquidGlass style={styles.card} contentStyle={styles.cardContent} strong>
            <View style={styles.headerRow}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.service}>{booking.service}</Text>
                <Text style={styles.meta}>{booking.provider} - {booking.area}</Text>
              </View>
            </View>

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
                      <Ionicons name={done ? 'checkmark' : 'ellipse'} size={done ? 10 : 6} color={done ? '#FFFFFF' : COLORS.textMuted} />
                    </View>
                    <Text style={[styles.stageText, done && styles.stageTextDone]} numberOfLines={2}>{stage}</Text>
                  </View>
                );
              })}
            </View>
          </LiquidGlass>

          <View style={styles.actionGrid}>
            <Action icon="call-outline" label="Call provider" />
            <Action icon="navigate-outline" label="Share location" />
            <Action icon="receipt-outline" label="View summary" />
            <TouchableOpacity style={styles.actionButton} onPress={advanceStage} activeOpacity={0.84}>
              <Ionicons name="notifications-outline" size={21} color={COLORS.primary} />
              <Text style={styles.actionText}>Trigger update</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Action({ icon, label }) {
  return (
    <TouchableOpacity style={styles.actionButton} activeOpacity={0.84}>
      <Ionicons name={icon} size={21} color={COLORS.primary} />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 18 },
  eyebrow: { color: COLORS.primary, fontSize: 11, fontFamily: FONTS.heading.fontFamily, letterSpacing: 1, textTransform: 'uppercase' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 18 },
  title: { color: COLORS.textPrimary, fontSize: 26, lineHeight: 32, fontFamily: FONTS.heading.fontFamily },
  urduTitle: { color: COLORS.textSecondary, fontSize: 14, fontFamily: FONTS.urdu.fontFamily, writingDirection: 'rtl' },
  card: { marginBottom: 16 },
  cardContent: { padding: 18, gap: 18 },
  emptyContent: { padding: 22, alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft, marginBottom: 12 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontFamily: FONTS.heading.fontFamily },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  headerCopy: { flex: 1 },
  service: { color: COLORS.textPrimary, fontSize: 20, fontFamily: FONTS.heading.fontFamily },
  meta: { color: COLORS.textSecondary, fontSize: 12, fontFamily: FONTS.bold.fontFamily, marginTop: 3 },
  progressTrack: { height: 8, borderRadius: 6, backgroundColor: 'rgba(14,143,70,0.12)', overflow: 'hidden', flexDirection: 'row' },
  progressFill: { height: 8, borderRadius: 6, backgroundColor: COLORS.accent },
  stageRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  stageItem: { flex: 1, alignItems: 'center' },
  stageDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border },
  stageDotDone: { backgroundColor: 'rgba(217,119,6,1)', borderColor: 'rgba(217,119,6,1)' }, // accentGold

  stageText: { color: COLORS.textMuted, textAlign: 'center', fontSize: 9, fontFamily: FONTS.subheading.fontFamily, marginTop: 5, lineHeight: 12 },
  stageTextDone: { color: COLORS.textPrimary },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionButton: { width: '48%', minHeight: 94, borderRadius: 20, padding: 15, justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: COLORS.borderLight },
  actionText: { color: COLORS.textPrimary, fontSize: 13, fontFamily: FONTS.heading.fontFamily },
});
