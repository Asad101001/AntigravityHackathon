import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { SERVICES } from '../config';
import { COLORS, RADII } from '../theme';
import LiquidGlass from '../components/LiquidGlass';
import { useTabBarVisibility } from '../components/TabBarVisibility';

const SUPPORTED_CITIES = (process.env.EXPO_PUBLIC_SUPPORTED_CITIES || 'Karachi,Lahore,Islamabad')
  .split(',')
  .map(city => city.trim())
  .filter(Boolean);

const SERVICE_MEDIA = {
  electrician: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=320&q=55',
  plumber:     'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=320&q=55',
  ac:          'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=320&q=55',
  carpenter:   'https://images.unsplash.com/photo-1601058268499-e52658b8bb88?auto=format&fit=crop&w=320&q=55',
};

export default function HomeScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { registerScroll } = useTabBarVisibility();
  const [text, setText] = useState('');
  const [pickedLocation, setPickedLocation] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState(SUPPORTED_CITIES[0] || 'Karachi');
  const [cityOpen, setCityOpen] = useState(false);

  // ── True GPS on mount ───────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // If the user already came back from LocationPicker with a pick, skip GPS
      if (route.params?.pickedLocation) {
        setPickedLocation(route.params.pickedLocation);
        return;
      }

      setGpsLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('[HomeScreen] Location permission denied — skipping GPS pre-fill');
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        });

        // Reverse-geocode so we show a human-readable label
        let label = 'Current location';
        try {
          const geo = await Location.reverseGeocodeAsync({
            latitude:  loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          const first = geo?.[0];
          if (first) {
            const parts = [first.district, first.subregion, first.city].filter(Boolean);
            if (parts.length) label = parts.slice(0, 2).join(', ');
          }
        } catch (_) {
          // Reverse geocode is best-effort; ignore errors
        }

        setPickedLocation({
          lat:   loc.coords.latitude,
          lng:   loc.coords.longitude,
          label,
        });
      } catch (err) {
        console.warn('[HomeScreen] GPS error:', err.message);
      } finally {
        setGpsLoading(false);
      }
    })();
  }, []);

  // Handle manual picker returning a location
  useEffect(() => {
    if (route.params?.pickedLocation) {
      setPickedLocation(route.params.pickedLocation);
    }
  }, [route.params?.pickedLocation]);

  const featuredServices = useMemo(() => SERVICES.slice(0, 4), []);
  const locationLabel = gpsLoading
    ? 'Detecting location…'
    : pickedLocation?.label || 'Pick exact location';

  const handleSend = () => {
    const userText = text.trim();
    if (!userText) return;
    navigation.navigate('Loading', {
      userText,
      userLocation:   pickedLocation,
      locationSource: pickedLocation ? (pickedLocation.label === 'Current location' ? 'gps' : 'map') : 'typed',
      city: selectedCity,
    });
  };

  const prefill = (label) => {
    setText(`${label} needed in ${selectedCity}`);
  };

  return (
    <View style={styles.background}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 118, paddingBottom: insets.bottom + 124 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={registerScroll}
          scrollEventThrottle={16}
        >
          <LiquidGlass style={styles.heroGlass} contentStyle={styles.heroContent} strong radius={RADII.lg}>
            {/* ── City selector + Location row ────────────────────── */}
            <View style={styles.topControls}>
              <View style={styles.cityWrap}>
                <TouchableOpacity
                  style={styles.cityButton}
                  onPress={() => setCityOpen(v => !v)}
                  activeOpacity={0.84}
                >
                  <Ionicons name="business-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.cityText}>{selectedCity}</Text>
                  <Ionicons
                    name={cityOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>

                {cityOpen ? (
                  <LiquidGlass style={styles.cityMenu} contentStyle={styles.cityMenuInner} radius={18}>
                    {SUPPORTED_CITIES.map(city => (
                      <TouchableOpacity
                        key={city}
                        style={[styles.cityOption, city === selectedCity && styles.cityOptionActive]}
                        onPress={() => { setSelectedCity(city); setCityOpen(false); }}
                        activeOpacity={0.82}
                      >
                        <Text style={[styles.cityOptionText, city === selectedCity && styles.cityOptionTextActive]}>
                          {city}
                        </Text>
                        {city === selectedCity ? (
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </LiquidGlass>
                ) : null}
              </View>

              <TouchableOpacity
                style={[styles.locationButton, gpsLoading && styles.locationButtonLoading]}
                onPress={() => navigation.navigate('LocationPicker', { pickedLocation })}
                activeOpacity={0.84}
              >
                <Ionicons
                  name={gpsLoading ? 'locate-outline' : pickedLocation ? 'location' : 'location-outline'}
                  size={16}
                  color={pickedLocation ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
              </TouchableOpacity>
            </View>

            {/* ── Hero copy ────────────────────────────────────────── */}
            <Text style={styles.kicker}>Natural-language service booking</Text>
            <Text style={styles.hero}>How can Asaaniyat help today?</Text>
            <Text style={styles.subhero}>
              Describe the job in English, Urdu, or Roman Urdu. City selection keeps ambiguous areas precise.
            </Text>

            {/* ── Request box ──────────────────────────────────────── */}
            <View style={styles.requestBox}>
              <Ionicons name="sparkles" size={19} color={COLORS.primary} />
              <TextInput
                style={styles.input}
                placeholder="e.g., AC repair needed in DHA tonight"
                placeholderTextColor={COLORS.textMuted}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendButton, !text.trim() && styles.disabled]}
                onPress={handleSend}
                disabled={!text.trim()}
                activeOpacity={0.82}
              >
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LiquidGlass>

          {/* ── Service fast-start grid ──────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fast-start services</Text>
            <Text style={styles.sectionHint}>Tap to prefill</Text>
          </View>

          <View style={styles.serviceGrid}>
            {featuredServices.map(service => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => prefill(service.label)}
                activeOpacity={0.86}
              >
                <Image
                  source={{ uri: SERVICE_MEDIA[service.id] || SERVICE_MEDIA.plumber }}
                  style={styles.serviceImage}
                />
                <View style={styles.serviceTone} />
                <View style={styles.serviceIcon}>
                  <Ionicons name={service.icon} size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.serviceLabel}>{service.label}</Text>
                <Text style={styles.serviceUrdu}>{service.urdu}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Info panel ───────────────────────────────────────── */}
          <LiquidGlass style={styles.infoPanel} contentStyle={styles.infoContent}>
            <View style={styles.infoIcon}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>Verified and informal help in one flow</Text>
              <Text style={styles.infoText}>
                Book electricians, plumbers, masi, cleaning, salon, or car mechanic services with the same AI request box.
              </Text>
            </View>
          </LiquidGlass>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1 },
  background: { flex: 1, backgroundColor: COLORS.bg },
  content:    { paddingHorizontal: 18 },

  heroGlass:   { marginBottom: 24 },
  heroContent: { padding: 18 },
  topControls: { gap: 10, marginBottom: 22 },

  cityWrap: { gap: 8 },
  cityButton: {
    minHeight: 46,
    borderRadius: 23,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.66)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cityText: { flex: 1, color: COLORS.textPrimary, fontSize: 14, fontWeight: '900' },

  cityMenu:      { marginBottom: 2 },
  cityMenuInner: { padding: 6, gap: 6 },
  cityOption: {
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityOptionActive:     { backgroundColor: COLORS.primary },
  cityOptionText:       { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  cityOptionTextActive: { color: '#FFFFFF' },

  locationButton: {
    minHeight: 46,
    borderRadius: 23,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.66)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  locationButtonLoading: { opacity: 0.7 },
  locationText: { flex: 1, color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },

  kicker:  { color: COLORS.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  hero:    { marginTop: 8, color: COLORS.textPrimary, fontSize: 34, lineHeight: 40, fontWeight: '900' },
  subhero: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14, lineHeight: 21, fontWeight: '600' },

  requestBox: {
    marginTop: 22,
    minHeight: 82,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  input:      { flex: 1, minHeight: 52, maxHeight: 110, color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  sendButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  disabled:   { opacity: 0.42 },

  sectionHeader: { marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionTitle:  { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900' },
  sectionHint:   { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },

  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  serviceCard: {
    width: '48%',
    aspectRatio: 1.05,
    borderRadius: 20,
    padding: 14,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  serviceImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.38 },
  serviceTone:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(245,251,247,0.42)' },
  serviceIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 28,
  },
  serviceLabel: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900' },
  serviceUrdu:  { marginTop: 2, color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },

  infoPanel:   { marginTop: 18 },
  infoContent: { padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  infoCopy:  { flex: 1 },
  infoTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '900' },
  infoText:  { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4, fontWeight: '600' },
});