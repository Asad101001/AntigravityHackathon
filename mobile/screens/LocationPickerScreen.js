import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import MapPanel from '../components/MapPanel';
import LiquidGlass from '../components/LiquidGlass';
import { COLORS, RADII } from '../theme';

// Tab bar is 74px tall + safe-area bottom inset; add breathing room
const TAB_BAR_HEIGHT = 74;
const SHEET_EXTRA_PAD = 16;

const DEFAULT_REGION = {
  latitude:      24.926,
  longitude:     67.092,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function LocationPickerScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const HEADER_PADDING = insets.top + (Platform.OS === 'ios' ? 74 : 64);

  const [pin, setPin] = useState(
    route.params?.pickedLocation || {
      lat:   DEFAULT_REGION.latitude,
      lng:   DEFAULT_REGION.longitude,
      label: 'Gulshan-e-Iqbal Karachi',
    }
  );

  // The bottom of the sheet must clear: safe-area bottom + tab bar + extra breathing room
  const sheetBottom = Math.max(insets.bottom, 10) + TAB_BAR_HEIGHT + SHEET_EXTRA_PAD;

  useEffect(() => {
    (async () => {
      try {
        // Only auto-locate if the user hasn't already pinned something
        if (route.params?.pickedLocation) return;

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setPin({
            lat:   loc.coords.latitude,
            lng:   loc.coords.longitude,
            label: 'Current location',
          });
        }
      } catch (error) {
        console.warn('[LocationPicker] GPS skipped:', error.message);
      }
    })();
  }, [route.params?.pickedLocation]);

  const onPick = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    let label = 'Pinned location';
    try {
      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      const first = geo?.[0];
      if (first) {
        label = [first.district, first.city, first.region].filter(Boolean).slice(0, 2).join(', ') || label;
      }
    } catch (_) {}
    setPin({ lat: latitude, lng: longitude, label });
  };

  const confirm = () => navigation.navigate('Home', { pickedLocation: pin });

  // Sheet height is fixed so map fills the remaining space above it
  const SHEET_APPROX_HEIGHT = 220;
  const mapBottomMargin = sheetBottom + SHEET_APPROX_HEIGHT;

  return (
    <View style={[styles.container, { paddingTop: HEADER_PADDING }]}>
      <View style={styles.orb} />

      <MapPanel
        style={[styles.map, { marginBottom: mapBottomMargin }]}
        userCoordinates={{ lat: pin.lat, lng: pin.lng }}
        initialRegion={{
          latitude:      pin.lat,
          longitude:     pin.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={onPick}
        markers={[
          {
            id:         'selected-pin',
            coordinate: { latitude: pin.lat, longitude: pin.lng },
            title:       pin.label,
            pinColor:    COLORS.primary,
          },
        ]}
      />

      <LiquidGlass
        style={[styles.sheet, { bottom: sheetBottom }]}
        contentStyle={styles.sheetInner}
        strong
        radius={RADII.xl}
      >
        <View style={styles.handle} />
        <Text style={styles.kicker}>Map location</Text>
        <Text style={styles.title}>Pick where the service is needed</Text>

        <View style={styles.locationRow}>
          <View style={styles.locationIcon}>
            <Ionicons name="location" size={18} color={COLORS.primary} />
          </View>
          <Text style={styles.locationText} numberOfLines={2}>{pin.label}</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={confirm} activeOpacity={0.84}>
          <Text style={styles.buttonText}>Use this location</Text>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </LiquidGlass>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  orb: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(34,197,94,0.14)',
    top: 70,
    right: -88,
  },
  map: {
    flex: 1,
    marginHorizontal: 16,
  },
  sheet: {
    position: 'absolute',
    left: 14,
    right: 14,
  },
  sheetInner: { padding: 20 },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(14,143,70,0.22)',
    marginBottom: 14,
  },
  kicker: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 4 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.68)',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  locationIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  locationText: { color: COLORS.textSecondary, fontWeight: '800', flex: 1 },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: { color: '#fff', fontWeight: '900' },
});