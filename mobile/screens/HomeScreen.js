import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
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
import { COLORS, RADII, SHADOWS, FONTS } from '../theme';
import LiquidGlass from '../components/LiquidGlass';
import { useTabBarVisibility } from '../components/TabBarVisibility';
import VoiceModal from '../components/VoiceModal';
import useVoiceInput from '../lib/useVoiceInput';

const SUPPORTED_CITIES = ['Karachi', 'Islamabad', 'Lahore'];

const SERVICES_PAGES = [
  [
    { id: 'ac', label: 'AC Repair', icon: 'snow-outline', urdu: 'اے سی مرمت' },
    { id: 'electrician', label: 'Electrician', icon: 'flash-outline', urdu: 'بجلی کا کام' },
    { id: 'plumber', label: 'Plumber', icon: 'water-outline', urdu: 'پلمبر' },
    { id: 'carpenter', label: 'Carpenter', icon: 'hammer-outline', urdu: 'بڑھئی' },
  ],
  [
    { id: 'painter', label: 'Painter', icon: 'brush-outline', urdu: 'پینٹر' },
    { id: 'cleaning', label: 'Cleaning', icon: 'sparkles-outline', urdu: 'گھر کی صفائی' },
    { id: 'handyman', label: 'Handyman', icon: 'construct-outline', urdu: 'عام مرمت' },
    { id: 'mechanic', label: 'Mechanic', icon: 'car-outline', urdu: 'گاڑی کی سروس' },
  ],
  [
    { id: 'pest', label: 'Pest Control', icon: 'bug-outline', urdu: 'پیسٹ کنٹرول' },
    { id: 'appliance', label: 'Appliance Repair', icon: 'tv-outline', urdu: 'آلات کی مرمت' },
    { id: 'sanitization', label: 'Sanitization', icon: 'shield-checkmark-outline', urdu: 'سینیٹائزیشن' },
    { id: 'gardening', label: 'Gardening', icon: 'leaf-outline', urdu: 'باغبانی' },
  ]
];


export default function HomeScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { registerScroll } = useTabBarVisibility();
  const [text, setText] = useState('');
  const [pickedLocation, setPickedLocation] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Karachi');
  const [cityOpen, setCityOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const carouselOpacity = useRef(new Animated.Value(1)).current;
  const {
    voiceVisible,
    voiceStatus,
    voiceTranscript,
    voiceError,
    startVoiceInput,
    stopVoiceInput,
    cancelVoiceInput,
  } = useVoiceInput({
    onTranscript: (spokenText) => {
      setText(spokenText);
      // Auto-advance: immediately navigate to Loading screen after transcript is received
      if (spokenText.trim()) {
        setTimeout(() => {
          navigation.navigate('Loading', {
            userText: spokenText.trim(),
            userLocation: pickedLocation,
            locationSource: pickedLocation ? 'gps' : 'typed',
            city: selectedCity,
          });
        }, 300); // Small delay so the user sees their transcript briefly
      }
    },
  });

  const switchPage = useCallback((nextPage) => {
    Animated.timing(carouselOpacity, {
      toValue: 0,
      duration: 90,
      useNativeDriver: true,
    }).start(() => {
      setCurrentPage(nextPage);
      Animated.timing(carouselOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  }, [carouselOpacity]);

  // Autoplay popular services carousel every 3.5 seconds
  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => {
      setCurrentPage(prev => {
        const next = (prev + 1) % SERVICES_PAGES.length;
        // Trigger the crossfade; state update happens via setCurrentPage inside switchPage
        Animated.timing(carouselOpacity, { toValue: 0, duration: 90, useNativeDriver: true }).start(() => {
          setCurrentPage(next);
          Animated.timing(carouselOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
        });
        return prev;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, [autoplay, carouselOpacity]);

  const handleDotPress = useCallback((index) => {
    setAutoplay(false);
    switchPage(index);
  }, [switchPage]);

  // GPS on mount
  useEffect(() => {
    (async () => {
      if (route.params?.pickedLocation) {
        setPickedLocation(route.params.pickedLocation);
        return;
      }

      setGpsLoading(true);
      setGpsError(false);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setGpsError(true);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        });

        let label = `${selectedCity}, Pakistan`;
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
        setGpsError(true);
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
    : gpsError
    ? `${selectedCity} (GPS unavailable)`
    : pickedLocation?.label || `${selectedCity}, Pakistan`;

  const handleSend = useCallback(() => {
    const userText = text.trim();
    if (!userText) return;
    navigation.navigate('Loading', {
      userText,
      userLocation:   pickedLocation,
      locationSource: pickedLocation ? 'gps' : 'typed',
      city: selectedCity,
    });
  }, [text, pickedLocation, selectedCity, navigation]);

  const prefill = useCallback((label) => {
    setText(`${label} needed`);
  }, []);

  const quickBook = useCallback((label) => {
    navigation.navigate('Loading', {
      userText: `${label} needed`,
      userLocation: pickedLocation,
      locationSource: pickedLocation ? 'gps' : 'typed',
      city: selectedCity,
    });
  }, [pickedLocation, selectedCity, navigation]);

  return (
    <View style={styles.background}>
      <VoiceModal
        visible={voiceVisible}
        status={voiceStatus}
        transcript={voiceTranscript}
        error={voiceError}
        onAction={
          voiceStatus === 'recording'
            ? stopVoiceInput
            : voiceStatus === 'error'
            ? startVoiceInput
            : cancelVoiceInput
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 98, paddingBottom: insets.bottom + 140 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={Platform.OS === 'ios'}
          overScrollMode="never"
          decelerationRate="fast"
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
            <Ionicons name="search" size={22} color={COLORS.primary} style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder="What service do you need today?"
              placeholderTextColor={COLORS.textMuted}
              value={text}
              onChangeText={setText}
              maxLength={200}
            />
            {text.trim() ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSend}
                activeOpacity={0.82}
              >
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.sendButton, styles.micButton]}
                onPress={startVoiceInput}
                activeOpacity={0.82}
              >
                <Ionicons name="mic" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Popular Services Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Services</Text>
            <Text style={styles.sectionUrdu}>مشہور خدمات</Text>
          </View>

          {/* Service Carousel Component */}
          <View style={styles.carouselContainer}>
            <Animated.View style={[styles.grid2x2, { opacity: carouselOpacity }]}>
              {SERVICES_PAGES[currentPage].map(service => {
                const scaleAnim = new Animated.Value(1);
                return (
                  <Animated.View key={service.id} style={{ width: '48%', transform: [{ scale: scaleAnim }] }}>
                    <TouchableOpacity
                      style={styles.serviceCard}
                      onPress={() => prefill(service.label)}
                      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
                      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start()}
                      activeOpacity={1}
                    >
                      <View style={styles.serviceIconContainer}>
                        <Ionicons name={service.icon} size={28} color={COLORS.primary} />
                      </View>
                      <Text style={styles.serviceLabel}>{service.label}</Text>
                      <Text style={styles.serviceUrdu}>{service.urdu}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </Animated.View>

            {/* Dynamic Pagination Dots with Generous Click Target Size */}
            <View style={styles.paginationContainer}>
              {SERVICES_PAGES.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.paginationDotTouchable}
                  onPress={() => handleDotPress(index)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <View
                    style={[
                      styles.paginationDot,
                      currentPage === index && styles.paginationDotActive
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Exclusive Offers ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exclusive Offers</Text>
            <Text style={styles.sectionUrdu}>خصوصی پیشکش</Text>
          </View>

          {/* Promo Card 1: Summer Cooling Promo */}
          <LiquidGlass style={styles.promoPanel} contentStyle={styles.promoContent} strong radius={RADII.md}>
            <View style={styles.promoLeft}>
              <Text style={styles.promoKicker}>Summer Cooling Promo</Text>
              <Text style={styles.promoText}>
                Get 20% off all AC maintenance services this month. Stay cool and beat the heat with our expert services.
              </Text>
              <TouchableOpacity style={styles.promoButton} activeOpacity={0.84} onPress={() => quickBook('AC Repair')}>
                <Text style={styles.promoButtonText}>Book Now</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.promoRight} pointerEvents="none">
              <Ionicons name="snow-outline" size={88} color="rgba(14,143,70,0.08)" style={styles.snowflakeWatermark} />
            </View>
          </LiquidGlass>

          {/* Promo Card 2: Home Makeover Promo */}
          <LiquidGlass style={styles.promoPanel} contentStyle={[styles.promoContent, styles.promoDarkBackground]} strong radius={RADII.md}>
            <View style={styles.promoLeft}>
              <Text style={[styles.promoKicker, styles.promoDarkKicker]}>Home Makeover Deal</Text>
              <Text style={[styles.promoText, styles.promoDarkText]}>
                Save 15% on professional painting & carpentry. Refresh your space and transform your home today.
              </Text>
              <TouchableOpacity style={[styles.promoButton, styles.promoDarkButton]} activeOpacity={0.84} onPress={() => quickBook('Painter')}>
                <Text style={styles.promoDarkButtonText}>Explore Deal</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.promoRight} pointerEvents="none">
              <Ionicons name="brush-outline" size={88} color="rgba(255,255,255,0.05)" style={styles.snowflakeWatermark} />
            </View>
          </LiquidGlass>

          {/* Promo Card 3: Quick Fix Friday */}
          <LiquidGlass style={styles.promoPanel} contentStyle={[styles.promoContent, styles.promoGoldBackground]} strong radius={RADII.md}>
            <View style={styles.promoLeft}>
              <Text style={[styles.promoKicker, styles.promoGoldKicker]}>Deep Home Spa Cleaning</Text>
              <Text style={styles.promoText}>
                Get a deep home cleaning & sanitization with a complimentary disinfection upgrade. Limited availability!
              </Text>
              <TouchableOpacity style={styles.promoButton} activeOpacity={0.84} onPress={() => quickBook('Cleaning')}>
                <Text style={styles.promoButtonText}>Claim Now</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.promoRight} pointerEvents="none">
              <Ionicons name="sparkles-outline" size={88} color="rgba(14,143,70,0.06)" style={styles.snowflakeWatermark} />
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

  // Location selector styles
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
    borderRadius: RADII.sm,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.06)',
    marginTop: 18,
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
    fontFamily: FONTS.heading.fontFamily,
  },
  cityOverlayMenu: {
    position: 'absolute',
    top: 30,
    left: -6,
    width: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: RADII.xs,
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
    fontFamily: FONTS.bold.fontFamily,
  },
  cityOverlayTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.heading.fontFamily,
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
    backgroundColor: 'rgba(13,148,136,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fetchedLocationText: {
    color: COLORS.accentTeal || '#0D9488',
    fontSize: 12,
    fontFamily: FONTS.subheading.fontFamily,
  },

  // Focus centerpiece search input box
  requestBoxFocus: {
    minHeight: 64,
    borderRadius: RADII.md,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.26)',
    marginBottom: 26,
    shadowColor: COLORS.primary,
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
    height: 54,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.bold.fontFamily,
    lineHeight: 22,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    backgroundColor: 'rgba(14,143,70,0.1)',
  },
  disabled: {
    opacity: 0.42,
  },

  // Section Header styles
  sectionHeader: {
    marginTop: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: FONTS.heading.fontFamily,
    letterSpacing: -0.3,
  },
  sectionUrdu: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: FONTS.urduCaption.fontFamily,
    writingDirection: 'rtl',
    marginTop: -2,
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
    width: '100%',
    aspectRatio: 1.22,
    borderRadius: RADII.md,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.05)',
    ...SHADOWS.card,
  },
  serviceIconContainer: {
    width: 52,
    height: 52,
    borderRadius: RADII.sm,
    backgroundColor: 'rgba(245,158,11,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.12)',
  },
  serviceLabel: {
    color: COLORS.primary,
    fontSize: 15,
    fontFamily: FONTS.heading.fontFamily,
    textAlign: 'center',
    lineHeight: 20,
  },
  serviceUrdu: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: FONTS.urduCaption.fontFamily,
    marginTop: 2,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  // Dots Pagination styles
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    gap: 2,
  },
  paginationDotTouchable: {
    padding: 12, // Generous padding click target!
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(14,143,70,0.18)',
  },
  paginationDotActive: {
    width: 16,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },

  // Promo Card styles
  promoPanel: {
    marginTop: 6,
    marginBottom: 14,
  },
  promoContent: {
    padding: 16,
    flexDirection: 'row',
    backgroundColor: '#EAF8EF',
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.14)',
    borderRadius: RADII.md,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  promoDarkBackground: {
    backgroundColor: '#0B2A18', // Deep forest/black tone for elegant visual contrast
    borderColor: 'rgba(14,143,70,0.36)',
  },
  promoGoldBackground: {
    backgroundColor: '#F5FBF7',
    borderWidth: 1.5,
    borderColor: 'rgba(217,119,6,0.22)', // subtle warm gold accent
  },
  promoLeft: {
    flex: 2,
    justifyContent: 'center',
  },
  promoKicker: {
    color: COLORS.primary,
    fontSize: 17,
    fontFamily: FONTS.heading.fontFamily,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  promoDarkKicker: {
    color: '#34D399', // Mint green highlight
  },
  promoGoldKicker: {
    color: '#D97706', // warm amber highlight
  },
  promoText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.bold.fontFamily,
    marginBottom: 12,
  },
  promoDarkText: {
    color: '#A7F3D0',
  },
  promoButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.xs,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  promoDarkButton: {
    backgroundColor: '#34D399',
  },
  promoDarkButtonText: {
    color: '#0B2A18',
    fontSize: 11,
    fontFamily: FONTS.heading.fontFamily,
  },
  promoButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONTS.heading.fontFamily,
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