import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { COLORS } from '../config';

export default function ReviewBookingScreen({ route, navigation }) {
  const { provider, fullResult } = route.params;
  const serviceFee = 85;
  const platformFee = 4.5;
  const tax = 7.25;
  const total = serviceFee + platformFee + tax;

  const confirm = () => {
    navigation.navigate('Confirmation', { fullResult: { ...fullResult, provider, booking_id: fullResult.booking_id, total } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.step}>Checkout</Text>
        <Text style={styles.title}>Review Booking</Text>
        <Text style={styles.subtitle}>Confirm the details before finalizing your appointment.</Text>
        <View style={styles.card}>
          <Row label="Service" value={provider.service_type || provider.service || 'Service'} />
          <Row label="Provider" value={provider.name} />
          <Row label="Appointment" value={provider.confirmed_slot || 'Today 4:00 PM'} />
          <Row label="Distance" value={`${provider.distance_km || '—'} km`} />
        </View>
        <View style={styles.card}>
          <Row label="Service fee" value={`$${serviceFee.toFixed(2)}`} />
          <Row label="Platform fee" value={`$${platformFee.toFixed(2)}`} />
          <Row label="Tax" value={`$${tax.toFixed(2)}`} />
          <View style={styles.divider} />
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.total}>${total.toFixed(2)}</Text></View>
        </View>
        <TouchableOpacity style={styles.button} onPress={confirm}><Text style={styles.buttonText}>Confirm Booking</Text></TouchableOpacity>
        <Text style={styles.terms}>By confirming, you agree to our Terms of Service.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }) {
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 36 },
  step: { color: COLORS.primary, fontSize: 11, fontWeight: '900', textAlign: 'right' },
  title: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '900', marginTop: 20 },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 6, marginBottom: 16 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { color: COLORS.textSecondary, fontWeight: '700' },
  rowValue: { color: COLORS.textPrimary, fontWeight: '900', maxWidth: '55%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 17 },
  total: { color: COLORS.primary, fontWeight: '900', fontSize: 30 },
  button: { backgroundColor: COLORS.primary, borderRadius: 22, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  terms: { color: COLORS.textSecondary, fontSize: 10, textAlign: 'center', marginTop: 12 }
});
