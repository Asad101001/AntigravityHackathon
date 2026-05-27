/**
 * MapPanel.native.js — Premium Google Maps component for Asaaniyat
 *
 * Complete overhaul:
 * - Larger, fully visible markers with proper shadowing
 * - Legend repositioned to top-left with increased width, no truncation
 * - Bigger callouts with clear text
 * - Enhanced polylines and user marker
 * - Better map label visibility via customMapStyle
 * - Larger re-center button
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Circle, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme';

const DEFAULT_LAT = Number(process.env.EXPO_PUBLIC_DEFAULT_MAP_LAT || 24.8607);
const DEFAULT_LNG = Number(process.env.EXPO_PUBLIC_DEFAULT_MAP_LNG || 67.0104);
const MIN_ZOOM_DELTA = 0.02; // Prevents overzoom on single provider

// ── Badge palette ─────────────────────────────────────────────────────────────
const BADGE_COLORS = {
  overall_best:    COLORS.primary,
  most_affordable: '#D97706',
  closest_fastest: '#2F80ED',
};

const BADGE_ICONS = {
  overall_best:    'trophy',
  most_affordable: 'pricetag',
  closest_fastest: 'flash',
};

const BADGE_LABELS = {
  overall_best:    'Best Choice',
  most_affordable: 'Most Affordable',
  closest_fastest: 'Closest',
};

// ── Per-service palette ───────────────────────────────────────────────────────
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
  Electrician:     'flash-outline',
  Plumber:         'water-outline',
  'AC Technician': 'snow-outline',
  Carpenter:       'hammer-outline',
  Painter:         'color-palette-outline',
  Handyman:        'construct-outline',
  Maid:            'home-outline',
  'Cleaning Lady': 'sparkles-outline',
  'Car Mechanic':  'car-outline',
  Hairdresser:     'cut-outline',
  Salon:           'color-wand-outline',
  default:         'location-outline',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
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

/**
 * De-duplicate very close coordinates to prevent marker stacking.
 * Adds a tiny lat/lng offset to markers within ~20m of each other.
 */
function deduplicateCoordinates(markers) {
  const EPSILON = 0.0002; // ~20 metres
  const seen = [];
  return markers.map(item => {
    let { latitude, longitude } = item.coordinate;
    let attempts = 0;
    while (
      seen.some(c => Math.abs(c.latitude - latitude) < EPSILON && Math.abs(c.longitude - longitude) < EPSILON) &&
      attempts < 8
    ) {
      // Nudge by random direction
      const angle = (attempts * 45 * Math.PI) / 180;
      latitude  += EPSILON * Math.cos(angle);
      longitude += EPSILON * Math.sin(angle);
      attempts++;
    }
    seen.push({ latitude, longitude });
    return { ...item, coordinate: { latitude, longitude } };
  });
}

// ── Callout ───────────────────────────────────────────────────────────────────
function ProviderCallout({ provider, onPress }) {
  const badge = provider.multi_factor_badge;
  const badgeColor = badge ? BADGE_COLORS[badge] : null;

  return (
    <TouchableOpacity style={styles.callout} onPress={() => onPress(provider)} activeOpacity={0.85}>
      {badge && (
        <View style={[styles.calloutBadge, { backgroundColor: badgeColor + '22', borderColor: badgeColor + '55' }]}>
          <Ionicons name={BADGE_ICONS[badge]} size={13} color={badgeColor} />
          <Text style={[styles.calloutBadgeText, { color: badgeColor }]}>{BADGE_LABELS[badge]}</Text>
        </View>
      )}
      <Text style={styles.calloutName} numberOfLines={2}>{provider.name || 'Provider'}</Text>
      <Text style={styles.calloutMeta}>
        {provider.area || provider.city || 'Nearby'} · {provider.distance_km ?? '?'} km away
      </Text>
      <View style={styles.calloutMetaRow}>
        <Text style={styles.calloutMeta}>⏱ {provider.response_time_min || 20} min</Text>
        <Text style={styles.calloutMetaDot}>·</Text>
        <Text style={styles.calloutMeta}>⭐ {provider.rating || 'N/A'}</Text>
      </View>
      {provider.base_rate_pkr != null && (
        <Text style={styles.calloutPrice}>
          From PKR {Math.round(provider.base_rate_pkr).toLocaleString('en-PK')}
        </Text>
      )}
      <Text style={styles.calloutCta}>Tap for details →</Text>
    </TouchableOpacity>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MapPanel({
  userCoordinates,
  providers = [],
  markers = [],
  onProviderSelect,
  style,
  initialRegion: initialRegionOverride,
  onPress,
  onRegionChange,
  onRegionChangeComplete,
}) {
  const mapRef  = useRef(null);
  const fitDone = useRef(false);  // guard: only fit once after map is ready
  const [selectedId, setSelectedId] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapTimedOut, setMapTimedOut] = useState(false);

  // Map load timeout — if map never becomes ready after 8s, show fallback
  useEffect(() => {
    const t = setTimeout(() => {
      if (!mapReady) setMapTimedOut(true);
    }, 8000);
    return () => clearTimeout(t);
  }, [mapReady]);

  // Pulse animation for user marker
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 900,  easing: Easing.in(Easing.ease),  useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const userCoord = useMemo(() => toCoordinate(userCoordinates), [userCoordinates]);

  const rawProviderMarkers = useMemo(
    () => providers
      .map(p => ({ provider: p, coordinate: toCoordinate(p) }))
      .filter(item => item.coordinate),
    [providers]
  );

  // Deduplicate very close markers
  const providerMarkers = useMemo(
    () => deduplicateCoordinates(rawProviderMarkers),
    [rawProviderMarkers]
  );

  const extraMarkers = useMemo(
    () => markers
      .map(m => ({ ...m, coordinate: toCoordinate(m.coordinate) }))
      .filter(m => m.coordinate),
    [markers]
  );

  const initialRegion = useMemo(() => {
    const first =
      userCoord ||
      providerMarkers[0]?.coordinate ||
      extraMarkers[0]?.coordinate ||
      { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };
    return initialRegionOverride || {
      latitude:       first.latitude,
      longitude:      first.longitude,
      latitudeDelta:  0.07,
      longitudeDelta: 0.07,
    };
  }, [extraMarkers, initialRegionOverride, providerMarkers, userCoord]);

  const fitMap = useCallback((animated = true) => {
    if (!mapRef.current || !mapReady) return;
    const coords = [
      userCoord,
      ...providerMarkers.map(i => i.coordinate),
      ...extraMarkers.map(m => m.coordinate),
    ].filter(Boolean);

    if (coords.length < 2) {
      // Single point: just animate to it with safe zoom
      if (coords.length === 1) {
        mapRef.current.animateToRegion({
          ...coords[0],
          latitudeDelta:  MIN_ZOOM_DELTA,
          longitudeDelta: MIN_ZOOM_DELTA,
        }, 300);
      }
      return;
    }

    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 100, right: 80, bottom: 100, left: 80 },
      animated,
    });
  }, [extraMarkers, mapReady, providerMarkers, userCoord]);

  // Fit only once, 300ms after map is ready
  useEffect(() => {
    if (!mapReady || fitDone.current) return;
    fitDone.current = true;
    const t = setTimeout(() => fitMap(true), 300);
    return () => clearTimeout(t);
  }, [mapReady, fitMap]);

  const handleProviderPress = useCallback((provider) => {
    setSelectedId(provider.id);
    onProviderSelect?.(provider);
  }, [onProviderSelect]);

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        onMapReady={() => setMapReady(true)}
        showsUserLocation={false}
        showsCompass={false}      // Prevent compass overlapping legend
        showsScale={false}
        showsMyLocationButton={false}
        mapType="standard"
        customMapStyle={LIGHT_MAP_STYLE}
        onPress={onPress}
        onRegionChange={onRegionChange}
        onRegionChangeComplete={onRegionChangeComplete}
        moveOnMarkerPress={false} // Prevent map repositioning on tap
        rotateEnabled={false}     // Keeps orientation consistent
      >
        {/* ── User location ──────────────────────────────────────── */}
        {userCoord && (
          <>
            <Marker coordinate={userCoord} anchor={{ x: 0.5, y: 0.5 }} zIndex={999} tracksViewChanges={false}>
              <View style={styles.userMarker}>
                <Animated.View style={[styles.userPulse, { transform: [{ scale: pulseAnim }] }]} />
                <View style={styles.userCore}>
                  <Ionicons name="home" size={16} color="#FFFFFF" />
                </View>
                <Text style={styles.userLabel}>You</Text>
              </View>
            </Marker>
            <Circle
              center={userCoord}
              radius={320}
              strokeColor="rgba(14,143,70,0.22)"
              fillColor="rgba(34,197,94,0.05)"
            />
          </>
        )}

        {/* ── Polylines from user to providers ───────────────────── */}
        {userCoord &&
          providerMarkers.slice(0, 5).map(({ provider, coordinate }) => (
            <Polyline
              key={`line-${provider.id}`}
              coordinates={[userCoord, coordinate]}
              strokeColor={colorFor(provider) + '70'}
              strokeWidth={3.5}
              lineDashPattern={[6, 8]}
            />
          ))}

        {/* ── Extra markers ──────────────────────────────────────── */}
        {extraMarkers.map(marker => (
          <Marker
            key={marker.id || marker.title}
            coordinate={marker.coordinate}
            title={marker.title}
            tracksViewChanges={false}
            draggable={marker.draggable}
            onDragEnd={marker.onDragEnd}
          >
            <View style={styles.extraMarker}>
              <Ionicons name="location" size={18} color="#FFFFFF" />
            </View>
          </Marker>
        ))}

        {/* ── Provider markers ───────────────────────────────────── */}
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
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 1.0 }}
            >
              <View style={[styles.pinWrap, active && styles.pinWrapActive]}>
                {/* Distance / badge label above pin */}
                <View style={[styles.distanceBadge, { borderColor: color + '60' }]}>
                  {badge ? (
                    <View style={styles.distanceBadgeInner}>
                      <Ionicons name={BADGE_ICONS[badge]} size={12} color={color} />
                      <Text style={[styles.distanceText, { color }]}>
                        {BADGE_LABELS[badge]}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.distanceText, { color }]}>
                      {provider.distance_km != null ? `${provider.distance_km} km` : 'nearby'}
                    </Text>
                  )}
                </View>

                {/* Pin shell — LARGER for visibility */}
                <View style={[
                  styles.pinShell,
                  { borderColor: color },
                  active && styles.pinShellActive,
                  badge === 'overall_best' && styles.pinShellBest,
                ]}>
                  <View style={[styles.pinCore, { backgroundColor: color }]}>
                    <Ionicons name={icon} size={22} color="#FFFFFF" />
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

      {/* ── Loading skeleton — shown until map is ready ───────────── */}
      {!mapReady && !mapTimedOut && (
        <View style={styles.mapSkeleton} pointerEvents="none">
          <View style={styles.mapSkeletonPulse} />
        </View>
      )}

      {/* ── Map unavailable fallback ────────────────────────────── */}
      {mapTimedOut && !mapReady && (
        <View style={styles.mapFallback} pointerEvents="none">
          <Ionicons name="map-outline" size={32} color={COLORS.textMuted} />
          <Text style={styles.mapFallbackText}>Map unavailable</Text>
        </View>
      )}

      {/* ── Legend — TOP-LEFT, fully visible, wider ────────────── */}
      {providerMarkers.length > 0 && (
        <View style={styles.legend} pointerEvents="none">
          <Text style={styles.legendTitle}>MAP LEGEND</Text>
          {Object.entries(BADGE_LABELS)
            .filter(([key]) => providerMarkers.some(({ provider: p }) => p.multi_factor_badge === key))
            .map(([key, label]) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: BADGE_COLORS[key] }]}>
                  <Ionicons name={BADGE_ICONS[key]} size={10} color="#FFFFFF" />
                </View>
                <Text style={styles.legendText}>{label}</Text>
              </View>
            ))}
          {providerMarkers.some(({ provider: p }) => !p.multi_factor_badge) && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.textMuted }]} />
              <Text style={styles.legendText}>Other Providers</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Re-center button — LARGER with label ─────────────────── */}
      <TouchableOpacity
        style={styles.recenterBtn}
        onPress={() => { fitDone.current = false; fitMap(true); fitDone.current = true; }}
        activeOpacity={0.8}
      >
        <Ionicons name="locate-outline" size={20} color={COLORS.primary} />
        <Text style={styles.recenterText}>Re-center</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.1)',
    backgroundColor: '#EEF8F2',
  },
  map: { flex: 1 },

  // User marker — LARGER
  userMarker: { alignItems: 'center' },
  userPulse: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(14,143,70,0.14)',
    top: -6, left: -6,
  },
  userCore: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...SHADOWS.card,
  },
  userLabel: {
    marginTop: 4,
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    letterSpacing: 0.3,
  },

  // Extra markers — LARGER
  extraMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...SHADOWS.card,
  },

  // Provider pins — LARGER for full visibility
  pinWrap:       { alignItems: 'center' },
  pinWrapActive: { transform: [{ scale: 1.14 }] },

  distanceBadge: {
    marginBottom: 5,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    ...SHADOWS.pressed,
  },
  distanceBadgeInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  distanceText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.3 },

  pinShell: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    ...SHADOWS.card,
  },
  pinShellActive: { borderWidth: 3.5, transform: [{ scale: 1.08 }] },
  pinShellBest:   { borderWidth: 3.5 },
  pinCore: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },

  // Callout — WIDER with clearer text
  callout: {
    backgroundColor: 'rgba(255,255,255,0.99)',
    borderRadius: 20,
    padding: 18,
    width: 290,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.1)',
    ...SHADOWS.floating,
    gap: 5,
  },
  calloutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  calloutBadgeText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  calloutName:      { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900', lineHeight: 22 },
  calloutMetaRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calloutMeta:      { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  calloutMetaDot:   { color: COLORS.textMuted },
  calloutPrice:     { color: COLORS.primary, fontSize: 16, fontWeight: '900', marginTop: 4 },
  calloutCta:       { color: COLORS.primary, fontSize: 13, fontWeight: '900', textAlign: 'right', marginTop: 5 },

  // Legend — TOP-LEFT corner, fully visible, wider
  legend: {
    position: 'absolute',
    top: 14,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.14)',
    borderRadius: 16,
    padding: 12,
    paddingTop: 10,
    gap: 6,
    maxWidth: 220,
    minWidth: 170,
    ...SHADOWS.card,
  },
  legendTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800', flex: 1 },

  // Re-center button — LARGER with label
  recenterBtn: {
    position: 'absolute',
    bottom: 14,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.12)',
    ...SHADOWS.card,
  },
  recenterText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  // Map loading skeleton & fallback
  mapSkeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EEF8F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapSkeletonPulse: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(14,143,70,0.12)',
  },
  mapFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EEF8F2',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  mapFallbackText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
});

// ── Rich custom map style — informative, beautiful, premium ───────────────────
const LIGHT_MAP_STYLE = [
  // Base geometry — warm light green-grey
  { elementType: 'geometry',              stylers: [{ color: '#F0F5F1' }] },
  { elementType: 'labels.text.fill',      stylers: [{ color: '#2D4A3A' }] },
  { elementType: 'labels.text.stroke',    stylers: [{ color: '#FFFFFF' }, { weight: 3.5 }] },
  // Roads — clear hierarchy
  { featureType: 'road.highway',  elementType: 'geometry.fill',   stylers: [{ color: '#D4E8DA' }] },
  { featureType: 'road.highway',  elementType: 'geometry.stroke', stylers: [{ color: '#B8D9C2' }] },
  { featureType: 'road.highway',  elementType: 'labels.text.fill', stylers: [{ color: '#2A5A3F' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill',   stylers: [{ color: '#E2EFE6' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#3D6B50' }] },
  { featureType: 'road.local',    elementType: 'geometry.fill',   stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.local',    elementType: 'labels.text.fill', stylers: [{ color: '#5A7D66' }] },
  // Water — ACTUALLY blue, not green
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#B8D4E8' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4A7FA5' }] },
  // Parks & green spaces
  { featureType: 'poi.park',             elementType: 'geometry.fill', stylers: [{ color: '#D5ECD8' }] },
  { featureType: 'poi.park',             elementType: 'labels.text.fill', stylers: [{ color: '#3D7A4E' }] },
  // Show useful POIs — hospitals, schools, government
  { featureType: 'poi.medical',          elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.school',           elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.government',       elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.place_of_worship', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  // Hide noisy commercial POIs
  { featureType: 'poi.business',         elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction',       elementType: 'labels', stylers: [{ visibility: 'off' }] },
  // POI icon styling
  { featureType: 'poi', elementType: 'labels.text.fill',  stylers: [{ color: '#5A8267' }] },
  { featureType: 'poi', elementType: 'geometry.fill',     stylers: [{ color: '#E0EDE3' }] },
  // Transit — show major stations
  { featureType: 'transit.station',      elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'transit.line',         elementType: 'labels', stylers: [{ visibility: 'off' }] },
  // Neighborhoods and localities — PROMINENT
  { featureType: 'administrative.neighborhood', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#2D5A3E' }, { weight: 1 }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#1A4028' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
  // Landscape
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#EDF3EE' }] },
  { featureType: 'landscape.natural',  elementType: 'geometry.fill', stylers: [{ color: '#E5F0E7' }] },
];