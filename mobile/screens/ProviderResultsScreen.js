/**
 * ProviderResultsScreen.js — Available Providers List
 * Uses ScreenHeader for consistent navigation, improved map height,
 * smooth scroll, better touch animations on provider cards.
 */

import React, { useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapPanel from '../components/MapPanel';
import ScreenHeader from '../components/ScreenHeader';
import LiquidGlass from '../components/LiquidGlass';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, SHADOWS, FONTS } from '../theme';

export default function ProviderResultsScreen({ route, navigation }) {
  const fullResult = route.params?.fullResult;
  const insets = useSafeAreaInsets();

  // Null guard — if navigation params are missing, show safe empty state
  if (!fullResult) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontFamily: FONTS.heading.fontFamily, marginBottom: 8 }}>No Results</Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
          Something went wrong retrieving providers. Please go back and try again.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ color: '#fff', fontFamily: FONTS.heading.fontFamily, fontSize: 14 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

  // Expandable map height - expanded by default
  const [mapExpanded, setMapExpanded] = useState(true);
  const mapHeight = useRef(new Animated.Value(420)).current;
  const toggleMapExpand = () => {
    const toValue = mapExpanded ? 320 : 420;
    Animated.spring(mapHeight, { toValue, useNativeDriver: false, bounciness: 4, speed: 14 }).start();
    setMapExpanded(v => !v);
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
        bounces={Platform.OS === 'ios'}
        overScrollMode="never"
        decelerationRate="fast"
        scrollEventThrottle={16}
      >
        {/* Map — expandable */}
        <Animated.View style={[styles.mapWrap, { height: mapHeight }]}>
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
          {/* Expand toggle */}
          <TouchableOpacity
            style={styles.mapExpandBtn}
            onPress={toggleMapExpand}
            activeOpacity={0.82}
          >
            <Ionicons
              name={mapExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={14}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Section header */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {providers.length} Provider{providers.length !== 1 ? 's' : ''} Found
          </Text>
          <Text style={styles.sectionSub}>AI-ranked · tap to review</Text>
        </View>

        {/* Empty state */}
        {providers.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={36} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No providers found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your location or service type.</Text>
          </View>
        )}

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

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.972, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();

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
              <Ionicons name="sparkles" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.recommendedText}>AI CHOICE · BEST MATCH</Text>
            </View>
          )}

          <View style={styles.cardRow}>
            {/* Avatar */}
            {provider.avatar ? (
              <Image 
                source={{ uri: provider.avatar }} 
                style={[styles.avatar, provider.isRecommended && styles.avatarRecommended]} 
              />
            ) : (
              <View style={[styles.avatar, provider.isRecommended && styles.avatarRecommended]}>
                <Text style={styles.avatarText}>{provider.name?.charAt(0)?.toUpperCase() || 'P'}</Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.providerName} numberOfLines={1}>{provider.name}</Text>
              <Text style={styles.companyLabel} numberOfLines={1}>
                {provider.company || provider.agency || 'Independent Expert'}
              </Text>
              <Text style={styles.serviceLabel} numberOfLines={1}>
                {provider.area || provider.city || 'Local Area'}
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
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.07)',
    ...SHADOWS.card,
  },
  map: { flex: 1 },
  mapExpandBtn: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    ...SHADOWS.card,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.heading.fontFamily,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.bold.fontFamily,
    textAlign: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: FONTS.heading.fontFamily,
    fontSize: 20,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontFamily: FONTS.bold.fontFamily,
    fontSize: 12,
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
    backgroundColor: COLORS.accentGold || '#F59E0B',
    borderRadius: RADII.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
    ...SHADOWS.iconGlow,
  },
  recommendedText: {
    fontFamily: FONTS.bold.fontFamily,
    color: '#FFFFFF',
    fontSize: 10,
    letterSpacing: 0.8,
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
  avatarText: { fontFamily: FONTS.heading.fontFamily, color: COLORS.primary, fontSize: 20 },

  providerName: { fontFamily: FONTS.heading.fontFamily, color: COLORS.textPrimary, fontSize: 20, letterSpacing: -0.2 },
  companyLabel:  { fontFamily: FONTS.bold.fontFamily, color: COLORS.primary, fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  serviceLabel:  { fontFamily: FONTS.regular.fontFamily, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },

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
  chipText: { fontSize: 11, fontFamily: FONTS.subheading.fontFamily, color: COLORS.textSecondary },

  priceBlock: { alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0, marginLeft: 4 },
  priceLabel: { color: COLORS.textMuted, fontSize: 10, fontFamily: FONTS.heading.fontFamily, letterSpacing: 0.4 },
  priceValue: { color: COLORS.primary, fontFamily: FONTS.heading.fontFamily, fontSize: 18, marginTop: 1 },
  priceEst:   { color: COLORS.textMuted, fontSize: 10, fontFamily: FONTS.bold.fontFamily },

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
  arrowText: { color: COLORS.primary, fontSize: 13, fontFamily: FONTS.subheading.fontFamily },
});
