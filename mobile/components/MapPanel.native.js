import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Circle, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme';

const DEFAULT_LAT = Number(process.env.EXPO_PUBLIC_DEFAULT_MAP_LAT || 24.8607);
const DEFAULT_LNG = Number(process.env.EXPO_PUBLIC_DEFAULT_MAP_LNG || 67.0104);

const SERVICE_COLORS = {
  Electrician: '#F59E0B',
  Plumber: '#2F80ED',
  'AC Technician': '#06B6D4',
  Carpenter: '#A16207',
  Painter: '#8B5CF6',
  Handyman: '#0E8F46',
  Maid: '#DB2777',
  'Cleaning Lady': '#16A34A',
  'Car Mechanic': '#DC2626',
  Hairdresser: '#EC4899',
  Salon: '#7C3AED',
  default: COLORS.primary,
};

const SERVICE_ICONS = {
  Electrician: 'flash',
  Plumber: 'water',
  'AC Technician': 'snow',
  Carpenter: 'hammer',
  Painter: 'color-palette',
  Handyman: 'construct',
  Maid: 'home',
  'Cleaning Lady': 'sparkles',
  'Car Mechanic': 'car-sport',
  Hairdresser: 'cut',
  Salon: 'color-wand',
  default: 'location',
};

function toCoordinate(input) {
  const lat = Number(input?.lat ?? input?.latitude);
  const lng = Number(input?.lng ?? input?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
}

function providerCoordinate(provider) {
  return toCoordinate(provider);
}

function colorFor(provider) {
  return SERVICE_COLORS[provider.service_type || provider.service || provider.type] || SERVICE_COLORS.default;
}

function iconFor(provider) {
  return SERVICE_ICONS[provider.service_type || provider.service || provider.type] || SERVICE_ICONS.default;
}

function ProviderCallout({ provider, onPress }) {
  return (
    <TouchableOpacity style={styles.callout} onPress={() => onPress(provider)} activeOpacity={0.85}>
      <Text style={styles.calloutName} numberOfLines={2}>{provider.name || 'Provider'}</Text>
      <Text style={styles.calloutMeta}>{provider.area || provider.city || 'Nearby'} - {provider.distance_km ?? 'near'} km</Text>
      <Text style={styles.calloutMeta}>{provider.response_time_min || 20} min response - Rating {provider.rating || 'N/A'}</Text>
      <Text style={styles.calloutCta}>Tap for details</Text>
    </TouchableOpacity>
  );
}

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
  const providerMarkers = useMemo(() => providers.map(provider => ({
    provider,
    coordinate: providerCoordinate(provider),
  })).filter(item => item.coordinate), [providers]);
  const extraMarkers = useMemo(() => markers.map(marker => ({
    ...marker,
    coordinate: toCoordinate(marker.coordinate),
  })).filter(marker => marker.coordinate), [markers]);

  const initialRegion = useMemo(() => {
    const first = userCoord || providerMarkers[0]?.coordinate || extraMarkers[0]?.coordinate || { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };
    return initialRegionOverride || {
      latitude: first.latitude,
      longitude: first.longitude,
      latitudeDelta: 0.07,
      longitudeDelta: 0.07,
    };
  }, [extraMarkers, initialRegionOverride, providerMarkers, userCoord]);

  const fitMap = useCallback(() => {
    if (!mapRef.current || !mapReady) return;
    const coords = [
      userCoord,
      ...providerMarkers.map(item => item.coordinate),
      ...extraMarkers.map(marker => marker.coordinate),
    ].filter(Boolean);

    if (coords.length < 2) return;
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 70, right: 50, bottom: 70, left: 50 },
      animated: true,
    });
  }, [extraMarkers, mapReady, providerMarkers, userCoord]);

  useEffect(() => {
    const timer = setTimeout(fitMap, 180);
    return () => clearTimeout(timer);
  }, [fitMap]);

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
        onLayout={fitMap}
        showsUserLocation={false}
        showsCompass
        showsScale
        mapType="standard"
        customMapStyle={LIGHT_MAP_STYLE}
        onPress={onPress}
      >
        {userCoord ? (
          <>
            <Marker coordinate={userCoord} anchor={{ x: 0.5, y: 0.5 }} zIndex={999}>
              <View style={styles.userMarker}>
                <View style={styles.userCore}><Ionicons name="home" size={15} color="#FFFFFF" /></View>
                <Text style={styles.userLabel}>You</Text>
              </View>
            </Marker>
            <Circle center={userCoord} radius={350} strokeColor="rgba(14,143,70,0.28)" fillColor="rgba(34,197,94,0.08)" />
          </>
        ) : null}

        {userCoord ? providerMarkers.slice(0, 6).map(({ provider, coordinate }) => (
          <Polyline
            key={`line-${provider.id}`}
            coordinates={[userCoord, coordinate]}
            strokeColor="rgba(14,143,70,0.22)"
            strokeWidth={2}
            lineDashPattern={[6, 8]}
          />
        )) : null}

        {extraMarkers.map(marker => (
          <Marker key={marker.id || marker.title} coordinate={marker.coordinate} title={marker.title}>
            <View style={styles.extraMarker}>
              <Ionicons name="location" size={18} color="#FFFFFF" />
            </View>
          </Marker>
        ))}

        {providerMarkers.map(({ provider, coordinate }) => {
          const active = selectedId === provider.id;
          const color = colorFor(provider);
          return (
            <Marker
              key={provider.id || provider.name}
              coordinate={coordinate}
              onPress={() => handleProviderPress(provider)}
              zIndex={active ? 100 : 2}
            >
              <View style={[styles.pinWrap, active && styles.pinWrapActive]}>
                <View style={styles.distanceBadge}>
                  <Text style={[styles.distanceText, { color }]}>{provider.distance_km != null ? `${provider.distance_km} km` : 'near'}</Text>
                </View>
                <View style={[styles.pinShell, { borderColor: color }]}>
                  <View style={[styles.pinCore, { backgroundColor: color }]}>
                    <Ionicons name={iconFor(provider)} size={16} color="#FFFFFF" />
                  </View>
                </View>
                <View style={[styles.pinTail, { borderTopColor: color }]} />
              </View>
              <Callout tooltip onPress={() => handleProviderPress(provider)}>
                <ProviderCallout provider={provider} onPress={handleProviderPress} />
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      <View style={styles.legend} pointerEvents="none">
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} /><Text style={styles.legendText}>Service point</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.info }]} /><Text style={styles.legendText}>Provider</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderLight, backgroundColor: COLORS.bgCardSolid },
  map: { flex: 1 },
  userMarker: { alignItems: 'center', gap: 3 },
  userCore: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderWidth: 3, borderColor: '#FFFFFF', ...SHADOWS.card },
  userLabel: { color: COLORS.primary, fontSize: 10, fontWeight: '900', backgroundColor: 'rgba(255,255,255,0.90)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  extraMarker: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderWidth: 3, borderColor: '#FFFFFF', ...SHADOWS.card },
  pinWrap: { alignItems: 'center' },
  pinWrapActive: { transform: [{ scale: 1.16 }] },
  distanceBadge: { marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.borderLight },
  distanceText: { fontSize: 10, fontWeight: '900' },
  pinShell: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', ...SHADOWS.card },
  pinCore: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pinTail: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },
  callout: { backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 16, padding: 14, width: 230, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.card },
  calloutName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '900' },
  calloutMeta: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4, fontWeight: '700' },
  calloutCta: { color: COLORS.primary, fontSize: 12, fontWeight: '900', textAlign: 'right', marginTop: 8 },
  legend: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.86)', borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 12, padding: 10, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
});

const LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#EEF8F2' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#51645A' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#D8F0E1' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#CDEFE0' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];
