import React, { useEffect, useState } from 'react';
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
import { COLORS, RADII, SHADOWS } from '../theme';
import LiquidGlass from '../components/LiquidGlass';
import { useTabBarVisibility } from '../components/TabBarVisibility';

const SUPPORTED_CITIES = ['Karachi', 'Islamabad', 'Lahore'];

const SERVICES_PAGES = [
  [
    { id: 'ac', label: 'AC Repair', icon: 'snow', urdu: 'اے سی مرمت' },
    { id: 'electrician', label: 'Electrician', icon: 'flash', urdu: 'بجلی کا کام' },
    { id: 'plumber', label: 'Plumber', icon: 'build', urdu: 'پلمبر' },
    { id: 'carpenter', label: 'Carpenter', icon: 'hammer', urdu: 'بڑھئی' },
  ],
  [
    { id: 'painter', label: 'Painter', icon: 'brush', urdu: 'پینٹر' },
    { id: 'cleaning', label: 'Cleaning', icon: 'sparkles', urdu: 'گھر کی صفائی' },
    { id: 'handyman', label: 'Handyman', icon: 'construct', urdu: 'عام مرمت' },
    { id: 'mechanic', label: 'Mechanic', icon: 'car', urdu: 'گاڑی کی سروس' },
  ],
  [
    { id: 'pest', label: 'Pest Control', icon: 'bug', urdu: 'پیسٹ کنٹرول' },
    { id: 'appliance', label: 'Appliance Repair', icon: 'tv', urdu: 'آلات کی مرمت' },
    { id: 'sanitization', label: 'Home Sanitization', icon: 'shield-checkmark', urdu: 'سینیٹائزیشن' },
    { id: 'gardening', label: 'Gardening', icon: 'leaf', urdu: 'باغبانی' },
  ]
];

export default function HomeScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { registerScroll } = useTabBarVisibility();
  const [text, setText] = useState('');
  const [pickedLocation, setPickedLocation] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Karachi');
  const [cityOpen, setCityOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // GPS on mount
  useEffect(() => {
    (async () => {
      if (route.params?.pickedLocation) {
        setPickedLocation(route.params.pickedLocation);
        return;
      }

      setGpsLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        });

        let label = 'DHA Phase 6, Karachi';
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
        } catch (_) {}

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

  useEffect(() => {
    if (route.params?.pickedLocation) {
      setPickedLocation(route.params.pickedLocation);
    }
  }, [route.params?.pickedLocation]);

  const locationLabel = gpsLoading
    ? 'Detecting location…'
    : pickedLocation?.label || 'DHA Phase 6, Karachi';

  const handleSend = () => {
    const userText = text.trim();
    if (!userText) return;
    navigation.navigate('Loading', {
      userText,
      userLocation:   pickedLocation,
      locationSource: pickedLocation ? 'gps' : 'typed',
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
            { paddingTop: insets.top + 98, paddingBottom: insets.bottom + 140 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="never"
          onScroll={registerScroll}
          scrollEventThrottle={16}
        >
          {/* Location Pillar Row */}
          <View style={styles.locationContainer}>
            <View style={styles.cityDropdownWrapper}>
              <TouchableOpacity
                style={styles.cityDropdownTrigger}
                onPress={() => setCityOpen(v => !v)}
                activeOpacity={0.84}
              >
                <Text style={styles.selectedCityText}>{selectedCity}</Text>
                <Ionicons name="chevron-down" size={13} color={COLORS.primary} style={{ marginLeft: 3 }} />
              </TouchableOpacity>
              
              {cityOpen && (
                <View style={styles.cityOverlayMenu}>
                  {SUPPORTED_CITIES.map(city => (
                    <TouchableOpacity
                      key={city}
                      style={[styles.cityOverlayOption, city === selectedCity && styles.cityOverlayOptionActive]}
                      onPress={() => { setSelectedCity(city); setCityOpen(false); }}
                      activeOpacity={0.82}
                    >
                      <Text style={[styles.cityOverlayText, city === selectedCity && styles.cityOverlayTextActive]}>
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.pillarLine} />

            <TouchableOpacity
              style={styles.fetchedLocationCol}
              onPress={() => navigation.navigate('LocationPicker', { pickedLocation })}
              activeOpacity={0.84}
            >
              <Ionicons name="location" size={14} color={COLORS.primary} style={{ marginRight: 5 }} />
              <Text style={styles.fetchedLocationText} numberOfLines={1}>
                {locationLabel}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Centerpiece text input field - Primary Visual Focus */}
          <View style={styles.requestBoxFocus}>
            <Ionicons name="search" size={21} color={COLORS.primary} style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder="What service do you need today?"
              placeholderTextColor={COLORS.textMuted}
              value={text}
              onChangeText={setText}
              maxLength={200}
            />
            <TouchableOpacity
              style={[styles.sendButton, !text.trim() && styles.disabled]}
              onPress={handleSend}
              disabled={!text.trim()}
              activeOpacity={0.82}
            >
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Popular Services Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Services</Text>
          </View>

          {/* Service Carousel Component */}
          <View style={styles.carouselContainer}>
            <View style={styles.grid2x2}>
              {SERVICES_PAGES[currentPage].map(service => (
                <TouchableOpacity
                  key={service.id}
                  style={styles.serviceCard}
                  onPress={() => prefill(service.label)}
                  activeOpacity={0.86}
                >
                  <View style={styles.serviceIconContainer}>
                    <Ionicons name={service.icon} size={24} color={COLORS.primary} />
                  </View>
                  <Text style={styles.serviceLabel}>{service.label}</Text>
                  <Text style={styles.serviceUrdu}>{service.urdu}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dynamic Pagination Dots (now supporting 3 pages!) */}
            <View style={styles.paginationContainer}>
              {SERVICES_PAGES.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.paginationDot,
                    currentPage === index && styles.paginationDotActive
                  ]}
                  onPress={() => setCurrentPage(index)}
                  activeOpacity={0.8}
                />
              ))}
            </View>
          </View>

          {/* Summer Cooling Promo card */}
          <LiquidGlass style={styles.promoPanel} contentStyle={styles.promoContent} strong radius={RADII.md}>
            <View style={styles.promoLeft}>
              <Text style={styles.promoKicker}>Summer Cooling Promo</Text>
              <Text style={styles.promoText}>
                Get 20% off all AC maintenance services this month. Stay cool and save.
              </Text>
              <TouchableOpacity style={styles.promoButton} activeOpacity={0.84} onPress={() => prefill('AC Repair')}>
                <Text style={styles.promoButtonText}>Book Now</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.promoRight} pointerEvents="none">
              <Ionicons name="snow" size={88} color="rgba(14,143,70,0.08)" style={styles.snowflakeWatermark} />
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
  content:    { paddingHorizontal: 16 },

  // Location selector styles
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
    borderRadius: RADII.sm, // reduced roundedness
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.06)',
    marginTop: 18, // Shifted down for beautiful vertical spacing
    marginBottom: 18,
    zIndex: 10,
    ...SHADOWS.card,
  },
  cityDropdownWrapper: {
    position: 'relative',
    minWidth: 80,
  },
  cityDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  selectedCityText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  cityOverlayMenu: {
    position: 'absolute',
    top: 30,
    left: -6,
    width: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: RADII.xs, // reduced roundedness
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.1)',
    zIndex: 99,
    shadowColor: '#0E8F46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cityOverlayOption: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: RADII.xs,
  },
  cityOverlayOptionActive: {
    backgroundColor: '#EAF8EF',
  },
  cityOverlayText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  cityOverlayTextActive: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  pillarLine: {
    width: 1.5,
    height: 16,
    backgroundColor: 'rgba(14,143,70,0.12)',
    marginHorizontal: 8,
  },
  fetchedLocationCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fetchedLocationText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },

  // Focus centerpiece search input box
  requestBoxFocus: {
    minHeight: 64, // Increased height to make it the clear focal centerpiece
    borderRadius: RADII.md, // reduced roundedness
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, // Thicker premium highlight border
    borderColor: 'rgba(14,143,70,0.26)',
    marginBottom: 26,
    shadowColor: COLORS.primary, // Soft primary green glow shadow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 52,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: RADII.sm, // matching sharp/modern visual design
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.42,
  },

  // Section Header styles
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
  },

  // Carousel & Grid styles
  carouselContainer: {
    marginBottom: 16,
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  serviceCard: {
    width: '48%',
    aspectRatio: 1.22,
    borderRadius: RADII.md, // reduced roundedness
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.05)',
    ...SHADOWS.card,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADII.sm, // Soft square container instead of circular bubble
    backgroundColor: '#EAF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  serviceLabel: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  serviceUrdu: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
    textAlign: 'center',
  },

  // Dots Pagination styles
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(14,143,70,0.18)',
  },
  paginationDotActive: {
    width: 14, // Pill dot active indicator
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },

  // Promo Card styles
  promoPanel: {
    marginTop: 6,
  },
  promoContent: {
    padding: 16,
    flexDirection: 'row',
    backgroundColor: '#EAF8EF',
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.14)',
    borderRadius: RADII.md, // reduced roundedness
    overflow: 'hidden',
  },
  promoLeft: {
    flex: 2,
    justifyContent: 'center',
  },
  promoKicker: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  promoText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  promoButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.xs, // matching sharp/modern roundedness
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  promoButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  promoRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    position: 'relative',
  },
  snowflakeWatermark: {
    position: 'absolute',
    right: -10,
    bottom: -16,
    opacity: 0.8,
  },
});