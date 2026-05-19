/**
 * ProviderResultsScreen.js — Available Providers List
 * Uses ScreenHeader for consistent navigation, improved map height,
 * smooth scroll, better touch animations on provider cards.
 */

import React, { useRef } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapPanel from '../components/MapPanel';
import ScreenHeader from '../components/ScreenHeader';
import LiquidGlass from '../components/LiquidGlass';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, SHADOWS } from '../theme';

export default function ProviderResultsScreen({ route, navigation }) {
  const { fullResult } = route.params;
  const insets = useSafeAreaInsets();

  const providers = [fullResult.provider, ...(fullResult.alternatives || [])]
    .filter(Boolean)
    .map((p, i) => ({ ...p, rank: i + 1, isRecommended: i === 0 }));

  const userCoords = fullResult.parsed_intent?.coordinates;
  const fallbackLat = Number(process.env.EXPO_PUBLIC_DEFAULT_MAP_LAT || 24.8607);
  const fallbackLng = Number(process.env.EXPO_PUBLIC_DEFAULT_MAP_LNG || 67.0104);

  const firstCoordinate = providers.find(p => p.lat && p.lng);
  const initialRegion = {
    latitude:       userCoords?.lat || firstCoordinate?.lat || fallbackLat,
    longitude:      userCoords?.lng || firstCoordinate?.lng || fallbackLng,
    latitudeDelta:  0.06,
    longitudeDelta: 0.06,
  };

  const basePricePkr = fullResult.quote_pkr || 1800;
  const getProviderPrice = (provider) => {
    if (provider.isRecommended && fullResult.quote_pkr) return fullResult.quote_pkr;
    return basePricePkr * (1 + (provider.rank - 1) * 0.08);
  };

  return (
    <View style={styles.container}>
      {/* Ambient */}
      <View style={styles.ambientTop} />

      <ScreenHeader
        navigation={navigation}
        title="Available Providers"
        stepLabel="STEP 4 OF 5"
        noBorder
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="never"
        scrollEventThrottle={16}
      >
        {/* Map */}
        <View style={styles.mapWrap}>
          <MapPanel
            style={styles.map}
            userCoordinates={userCoords}
            providers={providers}
            initialRegion={initialRegion}
            onProviderSelect={(provider) => {
              navigation.navigate('ReviewBooking', { provider, fullResult });
            }}
            markers={userCoords ? [{
              id: 'user-location',
              coordinate: { latitude: userCoords.lat, longitude: userCoords.lng },
              title: 'Service location',
            }] : []}
          />
        </View>

        {/* Section header */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {providers.length} Provider{providers.length !== 1 ? 's' : ''} Found
          </Text>
          <Text style={styles.sectionSub}>AI-ranked · tap to review</Text>
        </View>

        {providers.map(provider => (
          <ProviderCard
            key={provider.id || provider.rank}
            provider={provider}
            estimatedPkr={getProviderPrice(provider)}
            onPress={() => navigation.navigate('ReviewBooking', { provider, fullResult })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ProviderCard({ provider, estimatedPkr, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], marginBottom: 14 }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LiquidGlass
          style={[styles.card, provider.isRecommended && styles.recommendedCard]}
          radius={22}
        >
          {provider.isRecommended && (
            <View style={styles.recommendedBadge}>
              <Ionicons name="trophy" size={10} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.recommendedText}>AI RECOMMENDED MATCH</Text>
            </View>
          )}

          <View style={styles.cardRow}>
            {/* Avatar */}
            <View style={[styles.avatar, provider.isRecommended && styles.avatarRecommended]}>
              <Text style={styles.avatarText}>{provider.name?.charAt(0)?.toUpperCase() || 'P'}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.providerName} numberOfLines={1}>{provider.name}</Text>
              <Text style={styles.serviceLabel}>
                {provider.service || provider.service_type || 'Service Provider'}
              </Text>
              <Text style={styles.companyLabel} numberOfLines={1}>
                {provider.company || provider.agency || provider.area || 'Verified Expert'}
              </Text>

              {/* Metrics */}
              <View style={styles.metricsRow}>
                <MetricChip icon="star" value={String(provider.rating || '4.8')} />
                <MetricChip icon="location-outline" value={`${provider.distance_km || '?'} km`} />
                <MetricChip icon="time-outline" value={`${provider.response_time_min || 15}m`} />
              </View>
            </View>

            {/* Price */}
            <View style={styles.priceBlock}>
              <Text style={styles.priceLabel}>PKR</Text>
              <Text style={styles.priceValue}>{Math.round(estimatedPkr).toLocaleString('en-PK')}</Text>
              <Text style={styles.priceEst}>est.</Text>
            </View>
          </View>

          {/* Arrow indicator */}
          <View style={styles.arrowRow}>
            <Text style={styles.arrowText}>Tap to review & book</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
          </View>
        </LiquidGlass>
      </TouchableOpacity>
    </Animated.View>
  );
}

function MetricChip({ icon, value }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={10} color={COLORS.primary} />
      <Text style={styles.chipText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  ambientTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '35%',
    backgroundColor: '#EFF6FF',
    opacity: 0.45,
  },

  content: { padding: 16, paddingTop: 12 },

  mapWrap: {
    height: 250,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.07)',
    ...SHADOWS.card,
  },
  map: { flex: 1 },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  sectionSub: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },

  card: { padding: 14 },
  recommendedCard: {
    borderColor: 'rgba(14,143,70,0.18)',
    borderWidth: 1.5,
    backgroundColor: 'rgba(234,248,239,0.88)',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: RADII.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.chip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.1)',
    flexShrink: 0,
  },
  avatarRecommended: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#D8F5E8',
  },
  avatarText: { color: COLORS.primary, fontSize: 20, fontWeight: '900' },

  providerName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '900' },
  serviceLabel:  { color: COLORS.primary, fontSize: 11, fontWeight: '800', marginTop: 1, textTransform: 'capitalize' },
  companyLabel:  { color: COLORS.textSecondary, fontSize: 11, marginTop: 2, fontWeight: '700' },

  metricsRow: { flexDirection: 'row', gap: 5, marginTop: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
    backgroundColor: COLORS.chip,
    borderRadius: RADII.xs,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  chipText: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary },

  priceBlock: { alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0, marginLeft: 4 },
  priceLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  priceValue: { color: COLORS.primary, fontWeight: '900', fontSize: 16, marginTop: 1 },
  priceEst:   { color: COLORS.textMuted, fontSize: 9, fontWeight: '700' },

  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(14,143,70,0.06)',
    gap: 4,
  },
  arrowText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
});
