import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config';

export default function BookingConfirmScreen({ route, navigation }) {
  const { provider, fullResult } = route.params;
  const slot = provider.confirmed_slot || fullResult.provider?.confirmed_slot || provider.available_slots?.[0] || 'Today 4:00 PM';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.step}>STEP 5 OF 5</Text>
        <Text style={styles.title}>Review Booking</Text>
        <Text style={styles.subtitle}>Please confirm your service details and payment summary below.</Text>

        <View style={styles.card}>
          <Info icon="construct-outline" label="Service Type" value={provider.service_type || provider.service || fullResult.parsed_intent?.service_type || 'Service'} />
          <Info icon="person-circle-outline" label="Provider" value={provider.name || 'TBD'} />
          <Info icon="calendar-outline" label="Appointment Time" value={slot} />
          <Info icon="location-outline" label="Location" value={fullResult.parsed_intent?.location || provider.area || 'Pinned location'} />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('ReviewBooking', { provider: { ...provider, confirmed_slot: slot }, fullResult })}>
          <Text style={styles.primaryText}>Continue to Checkout</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryText}>Choose another provider</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ icon, label, value }) {
  return <View style={styles.infoRow}><View style={styles.icon}><Ionicons name={icon} size={18} color={COLORS.primary} /></View><View><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 32 },
  step: { color: COLORS.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { color: COLORS.textPrimary, fontSize: 27, fontWeight: '900', marginTop: 24 },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 6, marginBottom: 20 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: COLORS.border, gap: 14 },
  infoRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.chip },
  label: { color: COLORS.textMuted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  value: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '900', marginTop: 2 },
  primaryButton: { backgroundColor: COLORS.primary, borderRadius: 20, paddingVertical: 17, alignItems: 'center', marginTop: 24 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  secondaryButton: { alignItems: 'center', paddingVertical: 16 },
  secondaryText: { color: COLORS.primary, fontWeight: '800' }
});
