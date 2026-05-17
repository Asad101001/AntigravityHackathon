/**
 * HomeScreen.js — Task 14.9: 3×3 Premium Service Grid
 * Removes background images entirely. Each card is a translucent
 * glass rectangle with left-aligned text and a right-side icon circle.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
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
  .split(',').map(c => c.trim()).filter(Boolean);

export default function HomeScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { registerScroll } = useTabBarVisibility();
  const [text, setText] = useState('');
  const [pickedLocation, setPickedLocation] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState(SUPPORTED_CITIES[0] || 'Karachi');
  const [cityOpen, setCityOpen] = useState(false);

  // 14.3: Standardized HEADER_PADDING
  const HEADER_PADDING = insets.top + (Platform.OS === 'ios' ? 74 : 64);

  useEffect(() => {
    (async () => {
      if (route.params?.pickedLocation) {
        setPickedLocation(route.params.pickedLocation);
        return;
      }
      setGpsLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        let label = 'Current location';
        try {
          const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          const first = geo?.[0];
          if (first) {
            const parts = [first.district, first.subregion, first.city].filter(Boolean);
            if (parts.length) label = parts.slice(0, 2).join(', ');
          }
        } catch (_) {}
        setPickedLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude, label });
      } catch (err) {
        console.warn('[HomeScreen] GPS error:', err.message);
      } finally {
        setGpsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (route.params?.pickedLocation) setPickedLocation(route.params.pickedLocation);
  }, [route.params?.pickedLocation]);

  const locationLabel = gpsLoading ? 'Detecting location…' : pickedLocation?.label || 'Pick exact location';

  const handleSend = () => {
    const userText = text.trim();
    if (!userText) return;
    navigation.navigate('Loading', {
      userText, userLocation: pickedLocation,
      locationSource: pickedLocation ? (pickedLocation.label === 'Current location' ? 'gps' : 'map') : 'typed',
      city: selectedCity,
    });
  };

  const prefill = (label) => setText(`${label} needed in ${selectedCity}`);

  return (
    <View style={styles.background}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: HEADER_PADDING, paddingBottom: insets.bottom + 124 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={registerScroll}
          scrollEventThrottle={16}
        >
          {/* ── Hero glass card ──────────────────────────────────────── */}
          <LiquidGlass style={styles.heroGlass} contentStyle={styles.heroContent} strong radius={RADII.lg}>
            <View style={styles.topControls}>
              {/* City selector */}
              <View style={styles.cityWrap}>
                <TouchableOpacity style={styles.cityButton} onPress={() => setCityOpen(v => !v)} activeOpacity={0.84}>
                  <Ionicons name="business-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.cityText}>{selectedCity}</Text>
                  <Ionicons name={cityOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
                {cityOpen && (
                  <LiquidGlass style={styles.cityMenu} contentStyle={styles.cityMenuInner} radius={18}>
                    {SUPPORTED_CITIES.map(city => (
                      <TouchableOpacity
                        key={city}
                        style={[styles.cityOption, city === selectedCity && styles.cityOptionActive]}
                        onPress={() => { setSelectedCity(city); setCityOpen(false); }}
                        activeOpacity={0.82}
                      >
                        <Text style={[styles.cityOptionText, city === selectedCity && styles.cityOptionTextActive]}>{city}</Text>
                        {city === selectedCity && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                      </TouchableOpacity>
                    ))}
                  </LiquidGlass>
                )}
              </View>

              {/* Location button */}
              <TouchableOpacity
                style={[styles.locationButton, gpsLoading && styles.locationButtonLoading]}
                onPress={() => navigation.navigate('LocationPicker', { pickedLocation })}
                activeOpacity={0.84}
              >
                <Ionicons name={gpsLoading ? 'locate-outline' : pickedLocation ? 'location' : 'location-outline'} size={16} color={pickedLocation ? COLORS.primary : COLORS.textMuted} />
                <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.kicker}>Natural-language service booking</Text>
            <Text style={styles.hero}>How can Asaaniyat help today?</Text>
            <Text style={styles.subhero}>Describe the job in English, Urdu, or Roman Urdu.</Text>

            {/* Request box */}
            <View style={styles.requestBox}>
              <Ionicons name="sparkles" size={19} color={COLORS.primary} />
              <TextInput
                style={styles.requestInput}
                placeholder="e.g., AC repair needed in DHA tonight"
                placeholderTextColor={COLORS.textMuted}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity style={[styles.sendButton, !text.trim() && styles.disabled]} onPress={handleSend} disabled={!text.trim()} activeOpacity={0.82}>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LiquidGlass>

          {/* ── 14.9: 3×3 Service Grid ───────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Services</Text>
            <Text style={styles.sectionHint}>Tap to prefill</Text>
          </View>

          <View style={styles.serviceGrid}>
            {SERVICES.map(service => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => prefill(service.label)}
                activeOpacity={0.82}
              >
                {/* Left text block */}
                <View style={styles.serviceTextBlock}>
                  <Text style={styles.serviceLabel} numberOfLines={1}>{service.label}</Text>
                  <Text style={styles.serviceUrdu} numberOfLines={1}>{service.urdu}</Text>
                </View>

                {/* Right icon circle */}
                <View style={[styles.serviceCircle, { backgroundColor: service.circleColor }]}>
                  <Ionicons name={service.icon} size={16} color={service.iconColor} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Info panel ───────────────────────────────────────────── */}
          <LiquidGlass style={styles.infoPanel} contentStyle={styles.infoContent}>
            <View style={styles.infoIcon}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>Verified & informal help in one flow</Text>
              <Text style={styles.infoText}>Book electricians, plumbers, masi, cleaning, salon, or car mechanic services with the same AI request box.</Text>
            </View>
          </LiquidGlass>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const CARD_GAP = 10;

const styles = StyleSheet.create({
  flex:       { flex: 1 },
  background: { flex: 1, backgroundColor: COLORS.bg },
  content:    { paddingHorizontal: 18 },

  // Hero
  heroGlass:   { marginBottom: 24 },
  heroContent: { padding: 18 },
  topControls: { gap: 10, marginBottom: 22 },

  cityWrap:          { gap: 8 },
  cityButton:        { minHeight: 46, borderRadius: 23, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.66)', borderWidth: 1, borderColor: COLORS.borderLight },
  cityText:          { flex: 1, color: COLORS.textPrimary, fontSize: 14, fontWeight: '900' },
  cityMenu:          { marginBottom: 2 },
  cityMenuInner:     { padding: 6, gap: 6 },
  cityOption:        { minHeight: 40, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cityOptionActive:  { backgroundColor: COLORS.primary },
  cityOptionText:    { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  cityOptionTextActive: { color: '#FFFFFF' },
  locationButton:    { minHeight: 46, borderRadius: 23, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.66)', borderWidth: 1, borderColor: COLORS.borderLight },
  locationButtonLoading: { opacity: 0.7 },
  locationText:      { flex: 1, color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },

  kicker:  { color: COLORS.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  hero:    { marginTop: 8, color: COLORS.textPrimary, fontSize: 34, lineHeight: 40, fontWeight: '900' },
  subhero: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14, lineHeight: 21, fontWeight: '600' },

  requestBox: { marginTop: 22, minHeight: 82, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: COLORS.borderStrong },
  requestInput: { flex: 1, minHeight: 52, maxHeight: 110, color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  sendButton:   { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  disabled:     { opacity: 0.42 },

  sectionHeader: { marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionTitle:  { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900' },
  sectionHint:   { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },

  // 14.9: 3-column grid — no background images
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    marginBottom: 24,
  },
  serviceCard: {
    // Each card is (screen - 2 * padding - 2 * gap) / 3 wide
    width: '31.5%',
    aspectRatio: 0.95,
    borderRadius: 18,
    padding: 10,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.90)',
    // Subtle glass shadow
    shadowColor: '#0E8F46',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  // Text block (top-left)
  serviceTextBlock: { flex: 1, justifyContent: 'center' },
  serviceLabel: {
    color: '#10251A',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  serviceUrdu: {
    marginTop: 3,
    color: '#51645A',
    fontSize: 10,
    fontWeight: '700',
  },

  // Right-side icon circle
  serviceCircle: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  // Info panel
  infoPanel:   { marginTop: 0 },
  infoContent: { padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  infoIcon:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft },
  infoCopy:    { flex: 1 },
  infoTitle:   { color: COLORS.textPrimary, fontSize: 15, fontWeight: '900' },
  infoText:    { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4, fontWeight: '600' },
});