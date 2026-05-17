import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Circle, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme';

const DEFAULT_LAT = Number(process.env.EXPO_PUBLIC_DEFAULT_MAP_LAT || 24.8607);
const DEFAULT_LNG = Number(process.env.EXPO_PUBLIC_DEFAULT_MAP_LNG || 67.0104);

// ── Multi-factor badge palette ───────────────────────────────────────────────
// overall_best  → primary green   (the AI's top weighted pick)
// most_affordable → amber         (cheapest qualified provider)
// closest_fastest → blue          (nearest / fastest ETA)
// default         → service-type colour
const BADGE_COLORS = {
  overall_best:    COLORS.primary,      // '#0E8F46'
  most_affordable: '#D97706',           // amber
  closest_fastest: '#2F80ED',           // blue
};

const BADGE_ICONS = {
  overall_best:    'trophy',
  most_affordable: 'pricetag',
  closest_fastest: 'flash',
};

const BADGE_LABELS = {
  overall_best:    'Best Match',
  most_affordable: 'Most Affordable',
  closest_fastest: 'Closest & Fastest',
};

// ── Per-service fallback palette (used when no badge) ───────────────────────
const SERVICE_COLORS = {
  Electrician:     '#F59E0B',
  Plumber:         '#2F80ED',
  'AC Technician': '#06B6D4',
  Carpenter:       '#A16207',
  Painter:         '#8B5CF6',
  Handyman:        '#0E8F46',
  Maid:            '#DB2777',
  'Cleaning Lady': '#16A34A',
  'Car Mechanic':  '#DC2626',
  Hairdresser:     '#EC4899',
  Salon:           '#7C3AED',
  default:         COLORS.primary,
};

const SERVICE_ICONS = {
  Electrician:     'flash',
  Plumber:         'water',
  'AC Technician': 'snow',
  Carpenter:       'hammer',
  Painter:         'color-palette',
  Handyman:        'construct',
  Maid:            'home',
  'Cleaning Lady': 'sparkles',
  'Car Mechanic':  'car-sport',
  Hairdresser:     'cut',
  Salon:           'color-wand',
  default:         'location',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function toCoordinate(input) {
  const lat = Number(input?.lat ?? input?.latitude);
  const lng = Number(input?.lng ?? input?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
}

function resolveServiceKey(provider) {
  return provider.service_type || provider.service || provider.type || 'default';
}

function colorFor(provider) {
  // Badge colour takes priority
  if (provider.multi_factor_badge && BADGE_COLORS[provider.multi_factor_badge]) {
    return BADGE_COLORS[provider.multi_factor_badge];
  }
  return SERVICE_COLORS[resolveServiceKey(provider)] ?? SERVICE_COLORS.default;
}

function iconFor(provider) {
  if (provider.multi_factor_badge && BADGE_ICONS[provider.multi_factor_badge]) {
    return BADGE_ICONS[provider.multi_factor_badge];
  }
  return SERVICE_ICONS[resolveServiceKey(provider)] ?? SERVICE_ICONS.default;
}

// ── Callout component ────────────────────────────────────────────────────────
function ProviderCallout({ provider, onPress }) {
  const badge = provider.multi_factor_badge;
  const badgeColor = badge ? BADGE_COLORS[badge] : null;

  return (
    <TouchableOpacity style={styles.callout} onPress={() => onPress(provider)} activeOpacity={0.85}>
      {badge && (
        <View style={[styles.calloutBadge, { backgroundColor: badgeColor + '22', borderColor: badgeColor + '55' }]}>
          <Ionicons name={BADGE_ICONS[badge]} size={10} color={badgeColor} />
          <Text style={[styles.calloutBadgeText, { color: badgeColor }]}>{BADGE_LABELS[badge]}</Text>
        </View>
      )}
      <Text style={styles.calloutName} numberOfLines={2}>{provider.name || 'Provider'}</Text>
      <Text style={styles.calloutMeta}>
        {provider.area || provider.city || 'Nearby'} · {provider.distance_km ?? '?'} km
      </Text>
      <Text style={styles.calloutMeta}>
        ⏱ {provider.response_time_min || 20} min · ⭐ {provider.rating || 'N/A'}
      </Text>
      {provider.base_rate_pkr && (
        <Text style={styles.calloutPrice}>
          From PKR {Math.round(provider.base_rate_pkr).toLocaleString('en-PK')}
        </Text>
      )}
      <Text style={styles.calloutCta}>Tap for details →</Text>
    </TouchableOpacity>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function MapPanel({
  userCoordinates,
  providers = [],
  markers = [],
  onProviderSelect,
  style,
  initialRegion: initialRegionOverride,
  onPress,
}) {
  const mapRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  const userCoord = useMemo(() => toCoordinate(userCoordinates), [userCoordinates]);

  const providerMarkers = useMemo(
    () =>
      providers
        .map(p => ({ provider: p, coordinate: toCoordinate(p) }))
        .filter(item => item.coordinate),
    [providers]
  );

  const extraMarkers = useMemo(
    () =>
      markers
        .map(m => ({ ...m, coordinate: toCoordinate(m.coordinate) }))
        .filter(m => m.coordinate),
    [markers]
  );

  const initialRegion = useMemo(() => {
    const first =
      userCoord ||
      providerMarkers[0]?.coordinate ||
      extraMarkers[0]?.coordinate || { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };
    return initialRegionOverride || {
      latitude:       first.latitude,
      longitude:      first.longitude,
      latitudeDelta:  0.07,
      longitudeDelta: 0.07,
    };
  }, [extraMarkers, initialRegionOverride, providerMarkers, userCoord]);

  const fitMap = useCallback(() => {
    if (!mapRef.current || !mapReady) return;
    const coords = [
      userCoord,
      ...providerMarkers.map(i => i.coordinate),
      ...extraMarkers.map(m => m.coordinate),
    ].filter(Boolean);
    if (coords.length < 2) return;
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 70, right: 50, bottom: 70, left: 50 },
      animated: true,
    });
  }, [extraMarkers, mapReady, providerMarkers, userCoord]);

  useEffect(() => {
    const t = setTimeout(fitMap, 180);
    return () => clearTimeout(t);
  }, [fitMap]);

  const handleProviderPress = useCallback(
    (provider) => {
      setSelectedId(provider.id);
      onProviderSelect?.(provider);
    },
    [onProviderSelect]
  );

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        onMapReady={() => setMapReady(true)}
        onLayout={fitMap}
        showsUserLocation={false}
        showsCompass
        showsScale
        mapType="standard"
        customMapStyle={LIGHT_MAP_STYLE}
        onPress={onPress}
      >
        {/* ── User location ─────────────────────────────────────────────── */}
        {userCoord && (
          <>
            <Marker coordinate={userCoord} anchor={{ x: 0.5, y: 0.5 }} zIndex={999}>
              <View style={styles.userMarker}>
                <View style={styles.userPulse} />
                <View style={styles.userCore}>
                  <Ionicons name="home" size={15} color="#FFFFFF" />
                </View>
                <Text style={styles.userLabel}>You</Text>
              </View>
            </Marker>
            {/* Soft coverage radius */}
            <Circle
              center={userCoord}
              radius={380}
              strokeColor="rgba(14,143,70,0.28)"
              fillColor="rgba(34,197,94,0.07)"
            />
          </>
        )}

        {/* ── Dashed route lines from user to providers ─────────────────── */}
        {userCoord &&
          providerMarkers.slice(0, 6).map(({ provider, coordinate }) => (
            <Polyline
              key={`line-${provider.id}`}
              coordinates={[userCoord, coordinate]}
              strokeColor={colorFor(provider) + '44'}
              strokeWidth={2}
              lineDashPattern={[6, 8]}
            />
          ))}

        {/* ── Extra markers (e.g. pinned address) ───────────────────────── */}
        {extraMarkers.map(marker => (
          <Marker key={marker.id || marker.title} coordinate={marker.coordinate} title={marker.title}>
            <View style={styles.extraMarker}>
              <Ionicons name="location" size={18} color="#FFFFFF" />
            </View>
          </Marker>
        ))}

        {/* ── Provider markers ──────────────────────────────────────────── */}
        {providerMarkers.map(({ provider, coordinate }) => {
          const active = selectedId === provider.id;
          const color  = colorFor(provider);
          const icon   = iconFor(provider);
          const badge  = provider.multi_factor_badge;

          return (
            <Marker
              key={provider.id || provider.name}
              coordinate={coordinate}
              onPress={() => handleProviderPress(provider)}
              zIndex={active ? 100 : badge === 'overall_best' ? 50 : 2}
            >
              <View style={[styles.pinWrap, active && styles.pinWrapActive]}>
                {/* Distance badge above pin */}
                <View style={[styles.distanceBadge, { borderColor: color + '66' }]}>
                  {badge ? (
                    <View style={styles.distanceBadgeInner}>
                      <Ionicons name={BADGE_ICONS[badge]} size={8} color={color} />
                      <Text style={[styles.distanceText, { color }]}>
                        {provider.distance_km != null ? `${provider.distance_km} km` : 'near'}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.distanceText, { color }]}>
                      {provider.distance_km != null ? `${provider.distance_km} km` : 'near'}
                    </Text>
                  )}
                </View>

                {/* Pin shell */}
                <View style={[
                  styles.pinShell,
                  { borderColor: color },
                  active && styles.pinShellActive,
                  badge === 'overall_best' && styles.pinShellBest,
                ]}>
                  <View style={[styles.pinCore, { backgroundColor: color }]}>
                    <Ionicons name={icon} size={16} color="#FFFFFF" />
                  </View>
                </View>

                {/* Pin tail */}
                <View style={[styles.pinTail, { borderTopColor: color }]} />
              </View>

              <Callout tooltip onPress={() => handleProviderPress(provider)}>
                <ProviderCallout provider={provider} onPress={handleProviderPress} />
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* ── Badge legend ──────────────────────────────────────────────────── */}
      <View style={styles.legend} pointerEvents="none">
        {Object.entries(BADGE_LABELS).map(([key, label]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: BADGE_COLORS[key] }]}>
              <Ionicons name={BADGE_ICONS[key]} size={7} color="#FFFFFF" />
            </View>
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#888' }]} />
          <Text style={styles.legendText}>Other providers</Text>
        </View>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.bgCardSolid,
  },
  map: { flex: 1 },

  // User marker
  userMarker: { alignItems: 'center', gap: 3 },
  userPulse: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(14,143,70,0.18)',
    top: -9,
    left: -9,
  },
  userCore: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...SHADOWS.card,
  },
  userLabel: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: 'rgba(255,255,255,0.90)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },

  // Extra markers
  extraMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...SHADOWS.card,
  },

  // Provider pin
  pinWrap:       { alignItems: 'center' },
  pinWrapActive: { transform: [{ scale: 1.18 }] },

  distanceBadge: {
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
  },
  distanceBadgeInner: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  distanceText: { fontSize: 10, fontWeight: '900' },

  pinShell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    ...SHADOWS.card,
  },
  pinShellActive: { transform: [{ scale: 1.08 }] },
  pinShellBest:   { borderWidth: 3 },

  pinCore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },

  // Callout
  callout: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 18,
    padding: 14,
    width: 240,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
    gap: 4,
  },
  calloutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  calloutBadgeText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  calloutName:      { color: COLORS.textPrimary, fontSize: 14, fontWeight: '900' },
  calloutMeta:      { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  calloutPrice:     { color: COLORS.primary, fontSize: 12, fontWeight: '900', marginTop: 2 },
  calloutCta:       { color: COLORS.primary, fontSize: 12, fontWeight: '900', textAlign: 'right', marginTop: 4 },

  // Legend
  legend: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 14,
    padding: 10,
    gap: 6,
    maxWidth: 160,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700', flex: 1 },
});

// ── Green-tinted map style ────────────────────────────────────────────────────
const LIGHT_MAP_STYLE = [
  { elementType: 'geometry',              stylers: [{ color: '#EEF8F2' }] },
  { elementType: 'labels.text.fill',      stylers: [{ color: '#51645A' }] },
  { elementType: 'labels.text.stroke',    stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road',     elementType: 'geometry',   stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#D8F0E1' }] },
  { featureType: 'water',    elementType: 'geometry',   stylers: [{ color: '#CDEFE0' }] },
  { featureType: 'poi',      elementType: 'labels',     stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',  elementType: 'labels',     stylers: [{ visibility: 'off' }] },
];