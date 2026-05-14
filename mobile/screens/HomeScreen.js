import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SERVICES } from '../config';

export default function HomeScreen({ route, navigation }) {
  const [text, setText] = useState('');
  const [pickedLocation, setPickedLocation] = useState(null);

  useEffect(() => {
    if (route.params?.pickedLocation) setPickedLocation(route.params.pickedLocation);
  }, [route.params?.pickedLocation]);

  const handleSend = () => {
    if (!text.trim()) return;
    navigation.navigate('Loading', {
      userText: text.trim(),
      userLocation: pickedLocation,
      locationSource: pickedLocation ? 'map' : 'typed'
    });
  };

  const locationLabel = pickedLocation?.label || 'Pick location';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.explorePill} onPress={() => navigation.navigate('LocationPicker', { pickedLocation })}>
              <Ionicons name="menu-outline" size={18} color={COLORS.primaryDim} />
              <Text style={styles.exploreText}>Explore</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.locationPill} onPress={() => navigation.navigate('LocationPicker', { pickedLocation })}>
              <Ionicons name="location-outline" size={14} color={COLORS.primary} />
              <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
            </TouchableOpacity>
            <View style={styles.avatar}><Text style={styles.avatarText}>👷</Text></View>
          </View>

          <Text style={styles.hero}>What can we help{`\n`}with today?</Text>
          <Text style={styles.subhero}>Tell us what you need in plain English, Urdu, or Roman Urdu.</Text>

          <View style={styles.searchCard}>
            <Ionicons name="sparkles-outline" size={18} color={COLORS.primary} />
            <TextInput
              style={styles.input}
              placeholder={'e.g., "Fix the sink today"'}
              placeholderTextColor={COLORS.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={[styles.sendButton, !text.trim() && styles.disabled]} onPress={handleSend} disabled={!text.trim()}>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.quickRow}>
            {SERVICES.slice(0, 3).map(service => (
              <TouchableOpacity key={service.id} style={styles.quickChip} onPress={() => setText(`${service.label} chahiye ${pickedLocation?.label || ''}`.trim())}>
                <Ionicons name={service.icon} size={14} color={COLORS.primary} />
                <Text style={styles.quickText}>{service.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.featureCard}>
            <View style={styles.badge}><Text style={styles.badgeText}>Popular Near You</Text></View>
            <Text style={styles.featureTitle}>Emergency Plumbing</Text>
            <Text style={styles.featureCopy}>Verified experts available within 30 minutes in your current area.</Text>
            <TouchableOpacity onPress={() => setText(`Plumber needed ${pickedLocation?.label || 'near me'} today`)}>
              <Text style={styles.bookNow}>Book Now →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.expressCard}>
            <Ionicons name="flash-outline" size={22} color={COLORS.primary} />
            <Text style={styles.expressTitle}>Express</Text>
            <Text style={styles.expressText}>Instant booking for small, quick tasks</Text>
          </View>

          <View style={styles.bottomTabs}>
            <Tab icon="home" label="Home" active />
            <Tab icon="calendar-outline" label="Bookings" />
            <Tab icon="chatbubble-outline" label="Messages" />
            <Tab icon="person-outline" label="Profile" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Tab({ icon, label, active }) {
  return <View style={[styles.tab, active && styles.tabActive]}><Ionicons name={icon} size={16} color={active ? '#fff' : COLORS.textSecondary} /><Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 14, paddingBottom: 36 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  explorePill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exploreText: { fontWeight: '800', color: COLORS.primaryDim, fontSize: 13 },
  locationPill: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 140, backgroundColor: COLORS.bgCard, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border },
  locationText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primaryGlow, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16 },
  hero: { fontSize: 30, lineHeight: 36, fontWeight: '900', color: COLORS.textPrimary, textAlign: 'center', marginTop: 8 },
  subhero: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 12, marginBottom: 24 },
  searchCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#DDF7E8', borderRadius: 28, padding: 14, shadowColor: COLORS.primary, shadowOpacity: 0.18, shadowRadius: 18, elevation: 4 },
  input: { flex: 1, minHeight: 42, maxHeight: 84, color: COLORS.textPrimary, fontWeight: '600' },
  sendButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginVertical: 22 },
  quickChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.bgCard, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  quickText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '800' },
  featureCard: { minHeight: 154, backgroundColor: '#BFEBD1', borderRadius: 24, padding: 18, marginBottom: 18, overflow: 'hidden' },
  badge: { alignSelf: 'flex-start', backgroundColor: '#79E5A0', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 12 },
  badgeText: { fontSize: 10, fontWeight: '900', color: COLORS.primaryDim },
  featureTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary },
  featureCopy: { color: COLORS.textSecondary, fontSize: 12, width: '72%', lineHeight: 18, marginTop: 4, marginBottom: 18 },
  bookNow: { fontSize: 13, fontWeight: '900', color: COLORS.primaryDim },
  expressCard: { backgroundColor: COLORS.bgCard, borderRadius: 22, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, marginBottom: 22 },
  expressTitle: { fontWeight: '900', color: COLORS.textPrimary, marginTop: 8 },
  expressText: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },
  bottomTabs: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.bgCard, borderRadius: 24, padding: 8, borderWidth: 1, borderColor: COLORS.border },
  tab: { alignItems: 'center', gap: 2, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 18 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700' },
  tabTextActive: { color: '#fff' }
});
