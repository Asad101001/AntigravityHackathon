/**
 * ProviderResultsScreen.js — Task 14.5: Enlarged map (150 → 280px)
 * with floating glass border and glowing green shadow.
 * Task 14.3: Standardized HEADER_PADDING.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapPanel from '../components/MapPanel';
import { COLORS } from '../config';

export default function ProviderResultsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { fullResult } = route.params;

  // 14.3: Standard header padding
  const HEADER_PADDING = insets.top + (Platform.OS === 'ios' ? 74 : 64);

  const providers = [fullResult.provider, ...(fullResult.alternatives || [])]
    .filter(Boolean)
    .map((p, i) => ({ ...p, rank: i + 1, isRecommended: i === 0 }));

  const userCoords = fullResult.parsed_intent?.coordinates;
  const firstCoordinate = providers.find(p => p.lat && p.lng);
  const fallbackLat = Number(process.env.EXPO_PUBLIC_DEFAULT_MAP_LAT || 24.8607);
  const fallbackLng = Number(process.env.EXPO_PUBLIC_DEFAULT_MAP_LNG || 67.0104);

  const initialRegion = {
    latitude:  userCoords?.lat || firstCoordinate?.lat || fallbackLat,
    longitude: userCoords?.lng || firstCoordinate?.lng || fallbackLng,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: HEADER_PADDING }]}>
        <Text style={styles.step}>STEP 4 OF 5</Text>
        <Text style={styles.title}>Available Professionals</Text>
        <Text style={styles.subtitle}>Choose the best match for your requested service.</Text>

        {/* 14.5: Map enlarged from 150 → 280px with premium glass border & green glow */}
        <View style={styles.mapWrap}>
          <MapPanel
            style={styles.map}
            userCoordinates={userCoords}
            providers={providers}
            initialRegion={initialRegion}
            markers={[
              ...(userCoords ? [{
                id: 'user-location',
                coordinate: { latitude: userCoords.lat, longitude: userCoords.lng },
                title: 'Service location',
                pinColor: COLORS.primaryDim,
              }] : [])
            ]}
          />
        </View>

        {/* Provider cards */}
        {providers.map(provider => (
          <TouchableOpacity
            key={provider.id || provider.rank}
            style={[styles.card, provider.isRecommended && styles.recommended]}
            onPress={() => navigation.navigate('BookingConfirm', { provider, fullResult })}
            activeOpacity={0.82}
          >
            {provider.isRecommended && (
              <View style={styles.recommendedBadge}>
                <Ionicons name="trophy-outline" size={11} color="#FFFFFF" />
                <Text style={styles.recommendedText}>  RECOMMENDED MATCH</Text>
              </View>
            )}
            <View style={styles.row}>
              <View style={styles.photo}>
                <Text style={styles.photoText}>{provider.name?.charAt(0) || 'P'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{provider.name}</Text>
                <Text style={styles.company}>{provider.city || provider.area || 'Verified Provider'}</Text>
                <View style={styles.metrics}>
                  <Metric icon="star"     value={`${provider.rating || '—'}`} />
                  <Metric icon="location" value={`${provider.distance_km || '—'} km`} />
                  <Metric icon="time"     value={`${provider.response_time_min || 20} min`} />
                </View>
              </View>
              <View style={styles.priceBlock}>
                <Text style={styles.price}>PKR {provider.base_rate_pkr ? Math.round(provider.base_rate_pkr).toLocaleString('en-PK') : '—'}</Text>
                <Text style={styles.per}>est.</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ icon, value }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={12} color={COLORS.primary} />
      <Text style={styles.metricText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content:   { padding: 18, paddingBottom: 32 },

  step:     { color: COLORS.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  title:    { color: COLORS.textPrimary, fontSize: 26, fontWeight: '900', marginTop: 18 },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 16 },

  // 14.5: Enlarged map container — 280px, floating glass styling
  mapWrap: {
    height: 280,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(14, 143, 70, 0.20)',
    // Glowing green drop-shadow
    shadowColor: '#0E8F46',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  map: { flex: 1 },

  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  recommended: { borderColor: COLORS.primary, backgroundColor: '#F2FFF6' },
  recommendedBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  recommendedText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },

  row:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photo:     { width: 58, height: 58, borderRadius: 29, backgroundColor: COLORS.chip, alignItems: 'center', justifyContent: 'center' },
  photoText: { color: COLORS.primary, fontSize: 24, fontWeight: '900' },
  name:      { color: COLORS.textPrimary, fontSize: 17, fontWeight: '900' },
  company:   { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  metrics:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  metric:    { flexDirection: 'row', gap: 3, alignItems: 'center', backgroundColor: COLORS.chip, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  metricText:{ fontSize: 10, fontWeight: '800', color: COLORS.textSecondary },

  priceBlock: { alignItems: 'flex-end' },
  price:      { color: COLORS.primary, fontWeight: '900', fontSize: 13 },
  per:        { color: COLORS.textMuted, fontSize: 9, fontWeight: '700' },
});