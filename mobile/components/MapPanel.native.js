/**
 * MapPanel.js — React Native Maps component
 *
 * Renders:
 *   - User's resolved location (blue pulsing marker)
 *   - Nearby provider markers (color-coded by type)
 *   - Callout cards with name, distance, response time
 *   - Tap-to-select provider → fires onProviderSelect callback
 *
 * Props:
 *   userCoordinates   { lat, lng }
 *   providers         Array<{ id, name, type, lat, lng, distance_km, response_time_min, phone }>
 *   onProviderSelect  (provider) => void
 *   style             ViewStyle (optional)
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import MapView, { Marker, Callout, Circle, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { COLORS, SHADOWS } from '../theme';

// Provider type → marker accent color
const TYPE_COLORS = {
  hospital:    '#EF4444',
  clinic:      '#F97316',
  pharmacy:    '#22C55E',
  ambulance:   '#2F80ED',
  blood_bank:  '#DC2626',
  default:     '#0E8F46',
};

const IoniconsFallback = () => <Text style={styles.selectedPinIcon}>⌖</Text>;

const PROVIDER_ICONS = {
  hospital:    '🏥',
  clinic:      '🩺',
  pharmacy:    '💊',
  ambulance:   '🚑',
  blood_bank:  '🩸',
  default:     '📍',
};

// ── Sub-components ────────────────────────────────────────────────────────────

const PulsingDot = ({ size = 20, color = '#3B82F6' }) => {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.6, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  return (
    <View style={[styles.dotContainer, { width: size * 2, height: size * 2 }]}>
      <Animated.View
        style={[
          styles.dotRing,
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            borderColor: color,
            transform: [{ scale: anim }],
            opacity: anim.interpolate({ inputRange: [1, 1.6], outputRange: [0.6, 0] }),
          },
        ]}
      />
      <View style={[styles.dotCore, { width: size * 0.7, height: size * 0.7, borderRadius: size, backgroundColor: color }]} />
    </View>
  );
};

const ProviderCallout = ({ provider, onPress }) => {
  const typeKey = (provider.type || 'default').toLowerCase();
  const color   = TYPE_COLORS[typeKey] || TYPE_COLORS.default;

  return (
    <TouchableOpacity style={styles.callout} onPress={() => onPress(provider)} activeOpacity={0.85}>
      <View style={[styles.calloutHeader, { borderLeftColor: color }]}>
        <Text style={styles.calloutIcon}>{PROVIDER_ICONS[typeKey] || PROVIDER_ICONS.default}</Text>
        <Text style={styles.calloutName} numberOfLines={2}>{provider.name}</Text>
      </View>
      <View style={styles.calloutMeta}>
        {provider.distance_km != null && (
          <Text style={styles.calloutMetaText}>📏 {provider.distance_km} km</Text>
        )}
        {provider.response_time_min != null && (
          <Text style={styles.calloutMetaText}>⏱ {provider.response_time_min} min</Text>
        )}
        {provider.rating != null && (
          <Text style={styles.calloutMetaText}>⭐ {provider.rating}</Text>
        )}
      </View>
      <Text style={[styles.calloutCta, { color }]}>Tap for details →</Text>
    </TouchableOpacity>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const MapPanel = ({
  userCoordinates,
  providers = [],
  onProviderSelect,
  style,
  initialRegion: initialRegionOverride,
  onPress,
  markers = [],
}) => {
  const mapRef              = useRef(null);
  const [selected, setSelected] = useState(null);

  const userLat = userCoordinates?.lat ?? 24.8607;
  const userLng = userCoordinates?.lng ?? 67.0011;

  const initialRegion = initialRegionOverride || {
    latitude:       userLat,
    longitude:      userLng,
    latitudeDelta:  0.08,
    longitudeDelta: 0.08,
  };

  // Fit map to show user + all providers when list changes
  useEffect(() => {
    if (!mapRef.current || !providers.length) return;
    const coords = [
      { latitude: userLat, longitude: userLng },
      ...providers.map(p => ({ latitude: p.lat, longitude: p.lng })),
    ];
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 60, bottom: 200, left: 60 },
      animated: true,
    });
  }, [providers, userLat, userLng]);

  const handleProviderPress = useCallback((provider) => {
    setSelected(provider.id);
    onProviderSelect?.(provider);
  }, [onProviderSelect]);

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsCompass
        showsScale
        mapType="standard"
        customMapStyle={LIGHT_MAP_STYLE}
        onPress={onPress}
      >
        {/* ── User location ── */}
        <Marker
          coordinate={{ latitude: userLat, longitude: userLng }}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={999}
        >
          <View style={styles.userMarker}><PulsingDot size={14} color={COLORS.primary} /><Text style={styles.userMarkerLabel}>You</Text></View>
        </Marker>

        {/* ── 400m accuracy circle ── */}
        <Circle
          center={{ latitude: userLat, longitude: userLng }}
          radius={400}
          strokeColor="rgba(14,143,70,0.28)"
          fillColor="rgba(34,197,94,0.08)"
        />


        {providers.slice(0, 5).map(provider => (
          <Polyline
            key={`line-${provider.id}`}
            coordinates={[{ latitude: userLat, longitude: userLng }, { latitude: provider.lat, longitude: provider.lng }]}
            strokeColor="rgba(14,143,70,0.22)"
            strokeWidth={2}
            lineDashPattern={[6, 8]}
          />
        ))}

        {markers.map(marker => (
          <Marker key={marker.id || marker.title} coordinate={marker.coordinate} title={marker.title}>
            <View style={styles.selectedPin}><IoniconsFallback /></View>
          </Marker>
        ))}

        {/* ── Provider markers ── */}
        {providers.map(provider => {
          const typeKey = (provider.type || 'default').toLowerCase();
          const color   = TYPE_COLORS[typeKey] || TYPE_COLORS.default;
          const isActive = selected === provider.id;

          return (
            <Marker
              key={provider.id}
              coordinate={{ latitude: provider.lat, longitude: provider.lng }}
              onPress={() => handleProviderPress(provider)}
              zIndex={isActive ? 100 : 1}
            >
              <View style={[styles.pinWrapper, isActive && styles.pinWrapperActive]}>
                <View style={[styles.distanceBadge, { borderColor: color }]}><Text style={[styles.distanceText, { color }]}>{provider.distance_km != null ? `${provider.distance_km} km` : 'near'}</Text></View>
                <View style={[styles.pin, { borderColor: isActive ? color : 'rgba(255,255,255,0.96)' }]}>
                  <View style={[styles.pinCore, { backgroundColor: color }]}><Text style={styles.pinIcon}>{PROVIDER_ICONS[typeKey] || PROVIDER_ICONS.default}</Text></View>
                </View>
                <View style={[styles.pinTail, { borderTopColor: '#FFFFFF' }]} />
              </View>
              <Callout tooltip onPress={() => handleProviderPress(provider)}>
                <ProviderCallout provider={provider} onPress={handleProviderPress} />
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* ── Legend overlay ── */}
      <View style={styles.legend} pointerEvents="none">
        <View style={styles.legendDot}>
          <View style={[styles.legendDotCore, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legendText}>You</Text>
        </View>
        {['hospital', 'clinic', 'pharmacy'].map(type => (
          <View key={type} style={styles.legendDot}>
            <View style={[styles.legendDotCore, { backgroundColor: TYPE_COLORS[type] }]} />
            <Text style={styles.legendText}>{type}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.96)', backgroundColor: COLORS.bgCardSolid },
  map:              { flex: 1 },

  dotContainer:     { justifyContent: 'center', alignItems: 'center' },
  dotRing:          { position: 'absolute', borderWidth: 2 },
  dotCore:          { borderWidth: 3, borderColor: '#FFFFFF' },
  userMarker:       { alignItems: 'center', gap: 2 },
  userMarkerLabel:  { color: COLORS.primary, fontSize: 10, fontWeight: '900', backgroundColor: 'rgba(255,255,255,0.86)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },

  selectedPin:      { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderWidth: 4, borderColor: '#FFFFFF', ...SHADOWS.card },
  selectedPinIcon:  { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  pinWrapper:       { alignItems: 'center' },
  pinWrapperActive: { transform: [{ scale: 1.2 }] },
  distanceBadge:    { marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.90)', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  distanceText:     { fontSize: 10, fontWeight: '900' },
  pin:              { width: 44, height: 44, borderRadius: 22, borderWidth: 3, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', elevation: 6, shadowColor: '#0E8F46', shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  pinCore:          { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pinIcon:          { fontSize: 16 },
  pinTail:          { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },

  callout:          { backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 18, padding: 14, width: 220, borderWidth: 1, borderColor: 'rgba(255,255,255,0.98)', ...SHADOWS.card },
  calloutHeader:    { flexDirection: 'row', alignItems: 'flex-start', borderLeftWidth: 3, paddingLeft: 8, marginBottom: 6 },
  calloutIcon:      { fontSize: 18, marginRight: 6 },
  calloutName:      { flex: 1, color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  calloutMeta:      { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  calloutMetaText:  { color: COLORS.textSecondary, fontSize: 11 },
  calloutCta:       { fontSize: 12, fontWeight: '700', textAlign: 'right' },

  legend:           { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.96)', borderRadius: 10, padding: 10, gap: 6 },
  legendDot:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDotCore:    { width: 10, height: 10, borderRadius: 5 },
  legendText:       { color: COLORS.textSecondary, fontSize: 11, textTransform: 'capitalize' },
});

// Light Asaaniyat map style with muted POI density.
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

export default MapPanel;