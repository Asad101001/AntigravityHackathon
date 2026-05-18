import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Platform } from 'react-native';
import MapPanel from '../components/MapPanel';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarVisibility } from '../components/TabBarVisibility';

export default function ProviderResultsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const HEADER_PADDING = insets.top + (Platform.OS === 'ios' ? 74 : 64);
  const { registerScroll } = useTabBarVisibility();
  const { fullResult } = route.params;
  const providers = [fullResult.provider, ...(fullResult.alternatives || [])].filter(Boolean).map((p, i) => ({ ...p, rank: i + 1, isRecommended: i === 0 }));
  const userCoords = fullResult.parsed_intent?.coordinates;
  const firstCoordinate = providers.find(p => p.lat && p.lng);
  const fallbackLat = Number(process.env.EXPO_PUBLIC_DEFAULT_MAP_LAT || 24.8607);
  const fallbackLng = Number(process.env.EXPO_PUBLIC_DEFAULT_MAP_LNG || 67.0104);
  const initialRegion = {
    latitude: userCoords?.lat || firstCoordinate?.lat || fallbackLat,
    longitude: userCoords?.lng || firstCoordinate?.lng || fallbackLng,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: HEADER_PADDING, paddingBottom: insets.bottom + 32 }]}
        onScroll={registerScroll}
        scrollEventThrottle={16}
      >
        <Text style={styles.step}>STEP 4 OF 5</Text>
        <Text style={styles.title}>Available Professionals</Text>
        <Text style={styles.subtitle}>Choose the best match for your requested service.</Text>

        <View style={styles.mapOuter}>
          <View style={styles.mapWrap}>
            <MapPanel
              style={styles.map}
              userCoordinates={userCoords}
              providers={providers}
              initialRegion={initialRegion}
              markers={[
                ...(userCoords ? [{ id: 'user-location', coordinate: { latitude: userCoords.lat, longitude: userCoords.lng }, title: 'Service location', pinColor: COLORS.primaryDim }] : [])
              ]}
            />
          </View>
        </View>

        {providers.map(provider => (
          <TouchableOpacity key={provider.id || provider.rank} style={[styles.card, provider.isRecommended && styles.recommended]} onPress={() => navigation.navigate('BookingConfirm', { provider, fullResult })} activeOpacity={0.82}>
            {provider.isRecommended && <View style={styles.recommendedBadge}><Text style={styles.recommendedText}>RECOMMENDED MATCH</Text></View>}
            <View style={styles.row}>
              <View style={styles.photo}><Text style={styles.photoText}>{provider.name?.charAt(0) || 'P'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{provider.name}</Text>
                <Text style={styles.company}>{provider.city || provider.area || 'Verified Provider'}</Text>
                <View style={styles.metrics}>
                  <Metric icon="star" value={`${provider.rating || '—'}`} />
                  <Metric icon="location" value={`${provider.distance_km || '—'} km`} />
                  <Metric icon="time" value={`${provider.response_time_min || 20} min`} />
                </View>
              </View>
              <View style={styles.priceBlock}>
                <Text style={styles.price}>${(35 + (provider.rank * 3.5)).toFixed(2)}</Text>
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
  return <View style={styles.metric}><Ionicons name={icon} size={12} color={COLORS.primary} /><Text style={styles.metricText}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 18 },
  step: { color: COLORS.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  title: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '900', marginTop: 18 },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 16 },
  mapOuter: { height: 280, borderRadius: 26, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(14, 143, 70, 0.2)', shadowColor: '#0E8F46', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10, backgroundColor: 'rgba(255,255,255,0.25)' },
  mapWrap: { flex: 1, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.85)' },
  map: { flex: 1 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 24, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.primary, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
  recommended: { borderColor: COLORS.primary, backgroundColor: '#F2FFF6' },
  recommendedBadge: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 8 },
  recommendedText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photo: { width: 58, height: 58, borderRadius: 29, backgroundColor: COLORS.chip, alignItems: 'center', justifyContent: 'center' },
  photoText: { color: COLORS.primary, fontSize: 24, fontWeight: '900' },
  name: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '900' },
  company: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  metric: { flexDirection: 'row', gap: 3, alignItems: 'center', backgroundColor: COLORS.chip, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  metricText: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary },
  priceBlock: { alignItems: 'flex-end' },
  price: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 15 },
  per: { color: COLORS.textMuted, fontSize: 9, fontWeight: '700' }
});
