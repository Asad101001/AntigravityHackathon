import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import apiClient from '../lib/apiClient';

let MapView = () => null;
let Marker = () => null;
let Polyline = () => null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
  } catch (e) {
    console.warn('Failed to load react-native-maps', e);
  }
}
import LiquidGlass from '../components/LiquidGlass';
import { COLORS, SHADOWS, FONTS } from '../theme';
import { sendLocalNotification } from '../notifications';

const STAGES = [
  { key: 'pending',    label: 'Assigning',  icon: 'hourglass-outline' },
  { key: 'confirmed',  label: 'Confirmed',  icon: 'checkmark-circle-outline' },
  { key: 'dispatched', label: 'Dispatched', icon: 'navigate-outline' },
  { key: 'arriving',   label: 'Arriving',   icon: 'car-outline' },
  { key: 'working',    label: 'In Progress', icon: 'construct-outline' },
  { key: 'completed',  label: 'Completed',  icon: 'trophy-outline' },
];

function getInitialStageIndex(status) {
  const map = { pending: 0, confirmed: 1, dispatched: 2, arriving: 3, en_route: 3, working: 4, in_progress: 4, completed: 5, done: 5 };
  return map[status?.toLowerCase()] ?? 0;
}

// ── Offline City Block Path Generator ─────────────────────────────────────
function generateCityBlockPath(start, end) {
  const segments = 5;
  const path = [start];
  const latStep = (end.latitude - start.latitude) / segments;
  const lngStep = (end.longitude - start.longitude) / segments;
  
  let curLat = start.latitude;
  let curLng = start.longitude;

  for (let i = 0; i < segments; i++) {
    curLat += latStep;
    path.push({ latitude: curLat, longitude: curLng });
    curLng += lngStep;
    path.push({ latitude: curLat, longitude: curLng });
  }
  return path;
}

// Map Configuration
const KARACHI_COORD = { latitude: 24.8607, longitude: 67.0011 };
const DEFAULT_PROVIDER_START = { latitude: 24.8700, longitude: 67.0200 }; // Fake start
const DEFAULT_USER_DEST = { latitude: 24.8500, longitude: 66.9900 };      // Fake dest

export default function OrderStatusScreen({ route, navigation }) {
  const booking = route.params?.booking;
  const insets  = useSafeAreaInsets();
  const mapRef = useRef(null);

  const [currentStage, setCurrentStage] = useState(getInitialStageIndex(booking?.status));
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stageAnims = useRef(STAGES.map(() => new Animated.Value(0))).current;

  // Locations
  const userLoc = useMemo(() => {
    // If the booking has coordinates, use them, otherwise mock it near Karachi
    if (booking?.latitude && booking?.longitude) {
      return { latitude: booking.latitude, longitude: booking.longitude };
    }
    return DEFAULT_USER_DEST;
  }, [booking]);

  const providerStartLoc = useMemo(() => {
    return DEFAULT_PROVIDER_START;
  }, []);

  const [currentProviderLoc, setCurrentProviderLoc] = useState(providerStartLoc);
  const routePath = useMemo(() => generateCityBlockPath(providerStartLoc, userLoc), [providerStartLoc, userLoc]);
  const pathProgressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = pathProgressAnim.addListener(({ value }) => {
      const totalSegments = routePath.length - 1;
      const exactIndex = value * totalSegments;
      const lowerIndex = Math.floor(exactIndex);
      const upperIndex = Math.min(lowerIndex + 1, totalSegments);
      const fraction = exactIndex - lowerIndex;

      if (lowerIndex === upperIndex) {
        setCurrentProviderLoc(routePath[totalSegments]);
      } else {
        const p1 = routePath[lowerIndex];
        const p2 = routePath[upperIndex];
        setCurrentProviderLoc({
          latitude: p1.latitude + (p2.latitude - p1.latitude) * fraction,
          longitude: p1.longitude + (p2.longitude - p1.longitude) * fraction,
        });
      }
    });
    return () => pathProgressAnim.removeListener(id);
  }, [pathProgressAnim, routePath]);

  // ── Live Polling for Backend Status ───────────────────────────────────────
  useEffect(() => {
    // Use _id (MongoDB doc ID) which is the canonical booking identifier
    const bookingId = booking?._id || booking?.id;
    if (!bookingId) return;

    const pollStatus = async () => {
      try {
        const res = await apiClient.get(`/bookings/${bookingId}`);
        if (res.data?.success && res.data.booking) {
          const serverStatus = res.data.booking.status;
          const serverStage = getInitialStageIndex(serverStatus);
          
          if (serverStage !== currentStage) {
            setCurrentStage(serverStage);
            // Notify user of meaningful status changes
            if (serverStatus === 'confirmed') {
              sendLocalNotification('Provider Accepted!', 'Your provider has confirmed the booking.');
            } else if (serverStatus === 'completed') {
              sendLocalNotification('Service Completed', 'Your provider marked the job as done.');
            } else if (serverStatus === 'rejected' || serverStatus === 'canceled') {
              sendLocalNotification('Booking Update', 'Your booking status has changed. Please check the app.');
            }
          }
        }
      } catch (err) {
        // Ignore silent network errors on polling — don't disrupt the UI
        console.debug('[OrderStatus] Poll error (silent):', err?.message);
      }
    };

    // Initial poll immediately, then every 5s
    pollStatus();
    const intervalId = setInterval(pollStatus, 5000);
    return () => clearInterval(intervalId);
  }, [booking?._id, booking?.id, currentStage]);

  useEffect(() => {
    // UI Progress Bar goes 0 -> 1 based on 5 stages (0/4, 1/4, 2/4, 3/4, 4/4)
    Animated.timing(progressAnim, {
      toValue: currentStage / (STAGES.length - 1),
      duration: 1000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    // Map Movement Logic: Moves between Stage 2 (Dispatched) and Stage 3 (Arriving). Locked at destination if >= 3.
    let targetMapProgress = 0;
    if (currentStage === 2) targetMapProgress = 0.5;
    if (currentStage >= 3) targetMapProgress = 1;

    Animated.timing(pathProgressAnim, {
      toValue: targetMapProgress,
      duration: 1500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();

    stageAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i <= currentStage ? 1 : 0,
        delay: i * 120,
        useNativeDriver: true,
        damping: 14,
        stiffness: 120,
      }).start();
    });

    if (mapRef.current && Platform.OS !== 'web') {
      mapRef.current.fitToCoordinates(routePath, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [currentStage, userLoc, providerStartLoc, stageAnims, progressAnim, pathProgressAnim, routePath]);

  const formatQuote = (b) => {
    const q = b?.quote_pkr ?? b?.quote;
    if (typeof q === 'number' && q > 0) return `PKR ${Math.round(q).toLocaleString('en-PK')}`;
    return 'Quote pending';
  };

  const info = useMemo(() => [
    { label: 'SERVICE', value: booking?.service_type || booking?.service || 'Home Service', icon: 'briefcase-outline' },
    { label: 'PROVIDER', value: booking?.provider_name || booking?.provider || 'Asaaniyat Pro', icon: 'person-outline' },
    { label: 'QUOTE', value: formatQuote(booking), icon: 'cash-outline' },
    { label: 'BOOKING ID', value: (booking?._id || booking?.id || 'N/A').slice(0, 16), icon: 'document-text-outline' },
  ], [booking]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const getStatusLabel = () => {
    if (currentStage >= STAGES.length - 1) return 'Service Complete ✓';
    return `Status: ${STAGES[currentStage].label}`;
  };

  return (
    <View style={styles.shell}>
      {/* Map View taking top 55% */}
      <View style={styles.mapContainer}>
        {Platform.OS !== 'web' ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              ...KARACHI_COORD,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation={false}
          >
            {/* Path line - Using offline City Block coordinates */}
            <Polyline
              coordinates={routePath}
              strokeColor={COLORS.primary}
              strokeWidth={4}
              lineDashPattern={[10, 10]}
            />

            {/* User Destination Marker */}
            <Marker coordinate={userLoc} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.userMarker}>
                <Ionicons name="home" size={14} color="#FFFFFF" />
              </View>
            </Marker>

            {/* Provider Marker (Animated) */}
            <Marker coordinate={currentProviderLoc} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.providerMarker}>
                <Ionicons name="storefront" size={14} color="#FFFFFF" />
              </View>
            </Marker>
          </MapView>
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#EAF8EF', alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="map-outline" size={48} color={COLORS.primary} style={{ opacity: 0.5, marginBottom: 12 }} />
            <Text style={{ fontFamily: FONTS.bold.fontFamily, color: COLORS.primary, opacity: 0.7 }}>Live Tracking Not Available on Web</Text>
          </View>
        )}
        <View style={styles.mapOverlayTop}>
          <ScreenHeader navigation={navigation} title="" stepLabel="LIVE TRACKER" noBorder />
        </View>
      </View>

      {/* Bottom Sheet overlay */}
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 20 }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
          
          <Text style={styles.heading}>
            {booking?.service || 'Service'} Status
          </Text>
          <Text style={styles.sub}>Real-time tracking for your booking</Text>

          {/* ── Progress Bar ───────────────────────────────── */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
              <View style={styles.progressGlow} />
            </Animated.View>
          </View>

          {/* ── Stages ─────────────────────────────────────── */}
          <View style={styles.stagesRow}>
            {STAGES.map((stage, i) => {
              const done = i <= currentStage;
              const active = i === currentStage;
              return (
                <Animated.View
                  key={stage.key}
                  style={[
                    styles.stageItem,
                    { opacity: stageAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                    { transform: [{ scale: stageAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] },
                  ]}
                >
                  <View style={[
                    styles.stageDot,
                    done && styles.stageDotDone,
                    active && styles.stageDotActive,
                  ]}>
                    <Ionicons
                      name={done ? 'checkmark' : stage.icon}
                      size={active ? 14 : 12}
                      color={done ? '#FFFFFF' : COLORS.textMuted}
                    />
                  </View>
                  <Text style={[styles.stageLabel, done && styles.stageLabelDone]} numberOfLines={1}>
                    {stage.label}
                  </Text>
                </Animated.View>
              );
            })}
          </View>

          {/* ── Info Card ──────────────────────────────────── */}
          <LiquidGlass style={styles.infoCard} radius={18}>
            {info.map((item, i) => (
              <View key={item.label} style={[styles.infoRow, i < info.length - 1 && styles.infoRowBorder]}>
                <Ionicons name={item.icon} size={16} color={COLORS.primary} style={{ flexShrink: 0 }} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </LiquidGlass>

          {/* ── Status Indicator ───────────────────────── */}
          <View
            style={[styles.updateBtn, currentStage >= STAGES.length - 1 ? styles.updateBtnComplete : styles.updateBtnLive]}
          >
            <Ionicons
              name={currentStage >= STAGES.length - 1 ? 'checkmark-circle' : 'pulse'}
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.updateBtnText}>{getStatusLabel()}</Text>
          </View>

        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: COLORS.bg },
  mapContainer: {
    height: '55%',
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  mapOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  userMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...SHADOWS.card,
  },
  providerMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2F80ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...SHADOWS.card,
  },
  
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    ...SHADOWS.card,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  sheetContent: {
    padding: 24,
    paddingTop: 32,
  },

  heading: { fontSize: 26, fontFamily: FONTS.heading.fontFamily, color: COLORS.textPrimary, letterSpacing: -0.3, lineHeight: 32 },
  sub: { color: COLORS.textSecondary, fontSize: 13, fontFamily: FONTS.bold.fontFamily, marginTop: 4, marginBottom: 18, lineHeight: 20 },

  // Progress bar — taller with glow
  progressTrack: {
    height: 10,
    backgroundColor: 'rgba(14,143,70,0.08)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 22,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 5,
    position: 'relative',
  },
  progressGlow: {
    position: 'absolute',
    right: 0,
    top: -2,
    bottom: -2,
    width: 20,
    backgroundColor: 'rgba(34,197,94,0.3)',
    borderRadius: 10,
  },

  // Stages
  stagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 4,
  },
  stageItem: { alignItems: 'center', flex: 1 },
  stageDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EAF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.12)',
    marginBottom: 6,
  },
  stageDotDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stageDotActive: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(217,119,6,1)', // accentGold solid for glow
    ...SHADOWS.iconGlow,
  },
  stageLabel: { color: COLORS.textMuted, fontSize: 10, fontFamily: FONTS.subheading.fontFamily, textAlign: 'center' },
  stageLabelDone: { color: COLORS.primary },

  // Info card
  infoCard: { padding: 16, marginBottom: 20, gap: 0 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(14,143,70,0.06)',
  },
  infoContent: { flex: 1 },
  infoLabel: { color: COLORS.textMuted, fontSize: 10, fontFamily: FONTS.heading.fontFamily, letterSpacing: 0.5 },
  infoValue: { color: COLORS.textPrimary, fontSize: 15, fontFamily: FONTS.bold.fontFamily, marginTop: 2, lineHeight: 21 },

  // Update button
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    ...SHADOWS.card,
  },
  updateBtnDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  updateBtnLive: {
    backgroundColor: COLORS.primary,
  },
  updateBtnComplete: {
    backgroundColor: COLORS.textMuted,
  },
  updateBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: FONTS.heading.fontFamily },
});
