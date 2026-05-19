import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapPanel from '../components/MapPanel';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config';
import LiquidGlass from '../components/LiquidGlass';

export default function ProviderResultsScreen({ route, navigation }) {
  const { fullResult } = route.params;
  const insets = useSafeAreaInsets();

  const providers = [fullResult.provider, ...(fullResult.alternatives || [])]
    .filter(Boolean)
    .map((p, i) => ({ ...p, rank: i + 1, isRecommended: i === 0 }));

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

  // Resolve dynamic PKR estimate based on real backend quote_pkr
  const basePricePkr = fullResult.quote_pkr || 1800;
  const getProviderPrice = (provider) => {
    if (provider.isRecommended && fullResult.quote_pkr) {
      return fullResult.quote_pkr;
    }
    // Alternatives have slightly different rates scaled realistically
    return basePricePkr * (1 + (provider.rank - 1) * 0.08);
  };

  return (
    <View style={styles.container}>
      {/* ── Custom Local Header ────────────────────────────────────────── */}
      <View style={[styles.localHeader, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.82}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerStepText}>STEP 4 OF 5</Text>
          <Text style={styles.localHeaderTitle}>Available Providers</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Map Wrap (Left styling untouched) ────────────────────────── */}
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

        {/* ── Providers List (Premium Glassmorphic Overhaul) ──────────── */}
        {providers.map(provider => {
          const estimatedPkr = getProviderPrice(provider);
          return (
            <TouchableOpacity
              key={provider.id || provider.rank}
              style={styles.cardOuter}
              onPress={() => navigation.navigate('ReviewBooking', { provider, fullResult })}
              activeOpacity={0.85}
            >
              <LiquidGlass
                style={[
                  styles.card,
                  provider.isRecommended && styles.recommendedCard
                ]}
                radius={24}
              >
                {provider.isRecommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>RECOMMENDED MATCH</Text>
                  </View>
                )}

                <View style={styles.row}>
                  {/* Circular letter avatar */}
                  <View style={styles.photo}>
                    <Text style={styles.photoText}>
                      {provider.name?.charAt(0) || 'P'}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{provider.name}</Text>
                    <Text style={styles.serviceSubLabel}>
                      {provider.service || provider.service_type || 'Electrician'}
                    </Text>
                    <Text style={styles.company}>
                      {provider.company || provider.agency || provider.agency_name || `${provider.name?.split(' ')[0] || 'Expert'}${String(provider.service || provider.service_type || 'Services').toLowerCase().includes('plumb') ? ' Plumbing Services' : ' Electrics'}`} • {provider.area || provider.city || 'Verified Expert'}
                    </Text>

                    {/* Metrics row */}
                    <View style={styles.metrics}>
                      <Metric icon="star" value={`${provider.rating || '4.8'}`} />
                      <Metric icon="location-outline" value={`${provider.distance_km || '4.2'} km`} />
                      <Metric icon="time-outline" value={`${provider.response_time_min || 15} min`} />
                    </View>
                  </View>

                  {/* Pricing details */}
                  <View style={styles.priceBlock}>
                    <Text style={styles.price}>
                      PKR {Math.round(estimatedPkr).toLocaleString('en-PK')}
                    </Text>
                    <Text style={styles.per}>est.</Text>
                  </View>
                </View>
              </LiquidGlass>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Metric({ icon, value }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={11} color={COLORS.primary} />
      <Text style={styles.metricText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  localHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.94)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerStepText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  localHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  headerSpacer: { width: 38, height: 38 },

  content: { padding: 20, paddingBottom: 150 }, // Added padding bottom to auto-hide tabbar on scroll

  sectionHeading: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '900', marginTop: 12 },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 20, fontWeight: '700' },

  mapWrap: {
    height: 200,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.06)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  map: { flex: 1 },

  cardOuter: {
    marginBottom: 16,
  },
  card: {
    padding: 16,
  },
  recommendedCard: {
    borderColor: 'rgba(14,143,70,0.18)',
    borderWidth: 1,
    backgroundColor: 'rgba(234,248,239,0.85)',
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0E8F46',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 12,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.chip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.08)',
  },
  photoText: { color: COLORS.primary, fontSize: 22, fontWeight: '900' },
  name: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900' },
  serviceSubLabel: { color: COLORS.primary, fontSize: 12, fontWeight: '800', marginTop: 1, textTransform: 'capitalize' },
  company: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2, fontWeight: '700' },

  metrics: { flexDirection: 'row', gap: 6, marginTop: 8 },
  metric: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    backgroundColor: COLORS.chip,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metricText: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary },

  priceBlock: { alignItems: 'flex-end', justifyContent: 'center' },
  price: { color: COLORS.primary, fontWeight: '900', fontSize: 15 },
  per: { color: COLORS.textMuted, fontSize: 9, fontWeight: '700', marginTop: 2 }
});
