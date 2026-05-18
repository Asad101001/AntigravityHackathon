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
            { paddingTop: insets.top + 78, paddingBottom: insets.bottom + 112 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
                <Ionicons name="chevron-down" size={14} color={COLORS.primary} style={{ marginLeft: 4 }} />
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
              <Ionicons name="location" size={15} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.fetchedLocationText} numberOfLines={1}>
                {locationLabel}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search centerpiece request field */}
          <View style={styles.requestBox}>
            <Ionicons name="search" size={20} color={COLORS.primary} style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder="Describe your service need."
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
                    <Ionicons name={service.icon} size={28} color={COLORS.primary} />
                  </View>
                  <Text style={styles.serviceLabel}>{service.label}</Text>
                  <Text style={styles.serviceUrdu}>{service.urdu}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pagination Dots */}
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
          <LiquidGlass style={styles.promoPanel} contentStyle={styles.promoContent} strong radius={22}>
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
    minHeight: 46,
    borderRadius: 23,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.06)',
    marginBottom: 20,
    zIndex: 10,
    ...SHADOWS.card,
  },
  cityDropdownWrapper: {
    position: 'relative',
    minWidth: 84,
  },
  cityDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 6,
  },
  selectedCityText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  cityOverlayMenu: {
    position: 'absolute',
    top: 32,
    left: -8,
    width: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.1)',
    zIndex: 99,
    shadowColor: '#0E8F46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cityOverlayOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  cityOverlayOptionActive: {
    backgroundColor: '#EAF8EF',
  },
  cityOverlayText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  cityOverlayTextActive: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  pillarLine: {
    width: 1.5,
    height: 18,
    backgroundColor: 'rgba(14,143,70,0.14)',
    marginHorizontal: 8,
  },
  fetchedLocationCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fetchedLocationText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },

  // Input Box styles
  requestBox: {
    minHeight: 56,
    borderRadius: 28,
    paddingLeft: 16,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.06)',
    marginBottom: 26,
    ...SHADOWS.card,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.42,
  },

  // Section Header styles
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.2,
  },

  // Carousel & Grid styles
  carouselContainer: {
    marginBottom: 20,
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  serviceCard: {
    width: '48%',
    aspectRatio: 1.15,
    borderRadius: 22,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.05)',
    ...SHADOWS.card,
  },
  serviceIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EAF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceLabel: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  serviceUrdu: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },

  // Dots Pagination styles
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  paginationDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(14,143,70,0.18)',
  },
  paginationDotActive: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
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
    borderColor: 'rgba(14,143,70,0.18)',
    borderRadius: 22,
    overflow: 'hidden',
  },
  promoLeft: {
    flex: 2,
    justifyContent: 'center',
  },
  promoKicker: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  promoText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  promoButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  promoButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
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
    bottom: -18,
    opacity: 0.8,
  },
});