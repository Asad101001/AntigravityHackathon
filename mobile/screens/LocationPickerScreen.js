import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import MapPanel from '../components/MapPanel';
import LiquidGlass from '../components/LiquidGlass';
import { COLORS, RADII, SHADOWS, FONTS } from '../theme';

const TAB_BAR_HEIGHT = 74;
const SHEET_EXTRA_PAD = 16;

const DEFAULT_REGION = {
  latitude:      24.926,
  longitude:     67.092,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export default function LocationPickerScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const geocodeTimeout = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [pin, setPin] = useState(
    route.params?.pickedLocation || {
      lat:   DEFAULT_REGION.latitude,
      lng:   DEFAULT_REGION.longitude,
      label: 'Gulshan-e-Iqbal Karachi',
    }
  );

  const [isMoving, setIsMoving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Crosshair bounce animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, easing: Easing.in(Easing.ease),  useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const sheetBottom = Math.max(insets.bottom, 10) + TAB_BAR_HEIGHT + SHEET_EXTRA_PAD;

  useEffect(() => {
    (async () => {
      try {
        if (route.params?.pickedLocation) return;
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
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

  // When user pans the map, track the center coordinate
  const onRegionChange = () => {
    setIsMoving(true);
  };

  const onRegionChangeComplete = (region) => {
    setIsMoving(false);
    const { latitude, longitude } = region;

    // Update pin coordinates immediately
    setPin(prev => ({ ...prev, lat: latitude, lng: longitude }));

    // Debounced reverse geocode
    if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
    geocodeTimeout.current = setTimeout(async () => {
      setGeocoding(true);
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        const first = geo?.[0];
        if (first) {
          const label = [first.district, first.subregion, first.city].filter(Boolean).slice(0, 2).join(', ') || 'Pinned location';
          setPin(prev => ({ ...prev, label }));
        } else {
          setPin(prev => ({ ...prev, label: 'Selected location' }));
        }
      } catch (_) {
        setPin(prev => ({ ...prev, label: 'Selected location' }));
      } finally {
        setGeocoding(false);
      }
    }, 600);
  };

  // Also support direct tap on map
  const onMapPress = async (event) => {
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

  const SHEET_APPROX_HEIGHT = 230;
  const mapBottomMargin = sheetBottom + SHEET_APPROX_HEIGHT;

  return (
    <View style={styles.container}>
      <View style={styles.orb} />

      <MapPanel
        style={[styles.map, { marginBottom: mapBottomMargin }]}
        userCoordinates={{ lat: pin.lat, lng: pin.lng }}
        initialRegion={{
          latitude:      pin.lat,
          longitude:     pin.lng,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        onPress={onMapPress}
        onRegionChange={onRegionChange}
        onRegionChangeComplete={onRegionChangeComplete}
        markers={[]}
      />

      {/* ── CENTER CROSSHAIR — always visible on the map center ──── */}
      <View style={styles.crosshairWrap} pointerEvents="none">
        <Animated.View style={[styles.crosshairShadow, { transform: [{ scale: pulseAnim }] }]} />
        
        <View style={styles.pinAssembly}>
          <LiquidGlass style={styles.crosshairPinGlass} contentStyle={styles.crosshairPinContent} intensity={40} strong radius={24}>
            <Ionicons name="location" size={26} color={COLORS.primary} />
          </LiquidGlass>
          <View style={styles.crosshairStem} />
        </View>

        <View style={styles.crosshairDot} />
        {isMoving && (
          <View style={styles.crosshairLabel}>
            <Text style={styles.crosshairLabelText}>Release to select</Text>
          </View>
        )}
      </View>

      <LiquidGlass
        style={[styles.sheet, { bottom: sheetBottom }]}
        contentStyle={styles.sheetInner}
        strong
        radius={RADII.xl}
      >
        <View style={styles.handle} />
        <Text style={styles.kicker}>LOCATION</Text>
        <Text style={styles.title}>Drag the map to select</Text>
        <Text style={styles.subtitle}>Move the map so the pin sits on your desired location, then confirm below.</Text>

        <View style={styles.locationRow}>
          <View style={styles.locationIcon}>
            <Ionicons name="location" size={18} color={COLORS.primary} />
          </View>
          <View style={styles.locationTextWrap}>
            <Text style={styles.locationText} numberOfLines={2}>
              {geocoding ? 'Finding address...' : pin.label}
            </Text>
            <Text style={styles.locationCoords}>
              {pin.lat.toFixed(4)}°N, {pin.lng.toFixed(4)}°E
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={confirm} activeOpacity={0.84}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Use this location</Text>
        </TouchableOpacity>
      </LiquidGlass>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 112,
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

  // ── Crosshair overlay ──
  crosshairWrap: {
    position: 'absolute',
    top: 112,
    left: 16,
    right: 16,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairShadow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(14,143,70,0.12)',
  },
  pinAssembly: {
    alignItems: 'center',
    marginBottom: 44, // So the dot is exactly at the center
  },
  crosshairPinGlass: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    ...SHADOWS.floating,
  },
  crosshairPinContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairStem: {
    width: 3,
    height: 14,
    backgroundColor: COLORS.primary,
    marginTop: -2,
    borderBottomLeftRadius: 1.5,
    borderBottomRightRadius: 1.5,
    ...SHADOWS.pressed,
  },
  crosshairDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accentGold || '#F59E0B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...SHADOWS.pressed,
  },
  crosshairLabel: {
    position: 'absolute',
    bottom: '52%',
    backgroundColor: 'rgba(14,143,70,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  crosshairLabelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONTS.subheading.fontFamily,
    letterSpacing: 0.3,
  },

  // ── Sheet ──
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
    fontFamily: FONTS.heading.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontFamily: FONTS.heading.fontFamily,
    marginTop: 4,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.bold.fontFamily,
    marginTop: 4,
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.68)',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  locationIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  locationTextWrap: { flex: 1 },
  locationText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.subheading.fontFamily,
    fontSize: 14,
  },
  locationCoords: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: FONTS.bold.fontFamily,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    flexDirection: 'row',
    gap: 8,
    ...SHADOWS.card,
  },
  buttonText: { color: '#fff', fontFamily: FONTS.heading.fontFamily, fontSize: 16 },
});