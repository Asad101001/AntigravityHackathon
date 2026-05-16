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
import MapView, { Marker, Callout, Circle, PROVIDER_GOOGLE } from 'react-native-maps';

// Provider type → marker accent color
const TYPE_COLORS = {
  hospital:    '#EF4444',
  clinic:      '#F97316',
  pharmacy:    '#22C55E',
  ambulance:   '#3B82F6',
  blood_bank:  '#DC2626',
  default:     '#8B5CF6',
};

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
}) => {
  const mapRef              = useRef(null);
  const [selected, setSelected] = useState(null);

  const userLat = userCoordinates?.lat ?? 24.8607;
  const userLng = userCoordinates?.lng ?? 67.0011;

  const initialRegion = {
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
        customMapStyle={DARK_MAP_STYLE}
      >
        {/* ── User location ── */}
        <Marker
          coordinate={{ latitude: userLat, longitude: userLng }}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={999}
        >
          <PulsingDot size={14} color="#3B82F6" />
        </Marker>

        {/* ── 400m accuracy circle ── */}
        <Circle
          center={{ latitude: userLat, longitude: userLng }}
          radius={400}
          strokeColor="rgba(59,130,246,0.35)"
          fillColor="rgba(59,130,246,0.08)"
        />

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
                <View style={[styles.pin, { backgroundColor: color, borderColor: isActive ? '#fff' : color }]}>
                  <Text style={styles.pinIcon}>
                    {PROVIDER_ICONS[typeKey] || PROVIDER_ICONS.default}
                  </Text>
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

      {/* ── Legend overlay ── */}
      <View style={styles.legend} pointerEvents="none">
        <View style={styles.legendDot}>
          <View style={[styles.legendDotCore, { backgroundColor: '#3B82F6' }]} />
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
  container:        { flex: 1, borderRadius: 16, overflow: 'hidden' },
  map:              { flex: 1 },

  dotContainer:     { justifyContent: 'center', alignItems: 'center' },
  dotRing:          { position: 'absolute', borderWidth: 2 },
  dotCore:          {},

  pinWrapper:       { alignItems: 'center' },
  pinWrapperActive: { transform: [{ scale: 1.2 }] },
  pin:              { width: 36, height: 36, borderRadius: 18, borderWidth: 2, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  pinIcon:          { fontSize: 18 },
  pinTail:          { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },

  callout:          { backgroundColor: '#1e1e2e', borderRadius: 12, padding: 12, width: 200, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  calloutHeader:    { flexDirection: 'row', alignItems: 'flex-start', borderLeftWidth: 3, paddingLeft: 8, marginBottom: 6 },
  calloutIcon:      { fontSize: 18, marginRight: 6 },
  calloutName:      { flex: 1, color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  calloutMeta:      { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  calloutMetaText:  { color: '#94a3b8', fontSize: 11 },
  calloutCta:       { fontSize: 12, fontWeight: '700', textAlign: 'right' },

  legend:           { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(15,15,25,0.82)', borderRadius: 10, padding: 10, gap: 6 },
  legendDot:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDotCore:    { width: 10, height: 10, borderRadius: 5 },
  legendText:       { color: '#cbd5e1', fontSize: 11, textTransform: 'capitalize' },
});

// Minimal dark map style (subset of standard Snazzy Maps dark)
const DARK_MAP_STYLE = [
  { elementType: 'geometry',           stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: '#8b9fc1' }] },
  { featureType: 'road',               elementType: 'geometry',       stylers: [{ color: '#2c2c4a' }] },
  { featureType: 'road.arterial',      elementType: 'geometry',       stylers: [{ color: '#373760' }] },
  { featureType: 'water',              elementType: 'geometry',       stylers: [{ color: '#0e1628' }] },
  { featureType: 'poi',                elementType: 'labels',         stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',            elementType: 'labels',         stylers: [{ visibility: 'off' }] },
];

export default MapPanel;