import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config';
import { addSessionBooking } from '../sessionBookings';
import { useAppContext } from '../context/AppContext';

export default function ConfirmationScreen({ route, navigation }) {
  const { fullResult } = route.params;
  const scale = useRef(new Animated.Value(0.7)).current;
  const insets = useSafeAreaInsets();
  const { setActiveJob } = useAppContext();
  const provider = fullResult.provider || {};

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    const booking = addSessionBooking(fullResult);
    setActiveJob(booking);
  }, [fullResult, scale, setActiveJob]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.successCircle, { transform: [{ scale }] }]}>
          <Ionicons name="checkmark-circle-outline" size={58} color={COLORS.primary} />
        </Animated.View>
        <Text style={styles.title}>Booking{`\n`}Confirmed</Text>
        <Text style={styles.copy}>Your service has been successfully scheduled. Our professional is already preparing for your visit.</Text>

        <View style={styles.card}>
          <Detail label="Technician" value={provider.name || 'TBD'} />
          <Detail label="Service details" value={provider.service_type || provider.service || 'Service'} />
          <Detail label="Appointment time" value={provider.confirmed_slot || 'Today 4:00 PM'} />
          <Detail label="Booking ID" value={fullResult.booking_id || 'N/A'} />
        </View>

        <TouchableOpacity style={styles.chatButton} onPress={() => navigation.navigate('ProviderChat', { fullResult })}>
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text style={styles.chatText}>Go to Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.popToTop()}><Text style={styles.link}>View Schedule</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function Detail({ label, value }) {
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  successCircle: { width: 112, height: 112, borderRadius: 56, backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: COLORS.primary, shadowOpacity: 0.14, shadowRadius: 24, elevation: 4 },
  title: { textAlign: 'center', fontSize: 32, fontWeight: '900', color: COLORS.textPrimary, lineHeight: 38 },
  copy: { color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, fontSize: 13, marginTop: 14, marginBottom: 24 },
  card: { width: '100%', backgroundColor: COLORS.bgCard, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24 },
  detail: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  detailLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  detailValue: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '900', marginTop: 4 },
  chatButton: { width: '100%', backgroundColor: COLORS.accent, borderRadius: 22, flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 16, marginBottom: 16 },
  chatText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  link: { color: COLORS.primary, fontWeight: '800' }
});
