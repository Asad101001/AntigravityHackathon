import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Alert, RefreshControl, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import LiquidGlass from '../components/LiquidGlass';
import { useTabBarVisibility } from '../components/TabBarVisibility';
import { COLORS, FONTS } from '../theme';
import apiClient from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { subscribeBookingRealtime } from '../lib/bookingRealtime';

function money(value) {
  return typeof value === 'number' ? `PKR ${Math.round(value).toLocaleString('en-PK')}` : 'Quote pending';
}

function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'pending_provider_acceptance':
    case 'pending':
    case 'confirmed':
    case 'operating':
      return 'rgba(217,119,6,1)'; // accentGold
    case 'completed':
      return '#0D9488'; // accentTeal
    case 'canceled':
      return '#F44336';
    default:
      return COLORS.primary;
  }
}

function getStatusIcon(status) {
  switch (status?.toLowerCase()) {
    case 'pending_provider_acceptance':
    case 'pending':
      return 'hourglass-outline';
    case 'confirmed':
      return 'checkmark-circle';
    case 'operating':
      return 'hourglass-outline';
    case 'completed':
      return 'checkmark-done';
    case 'canceled':
      return 'close-circle';
    default:
      return 'help-circle';
  }
}

export default function BookingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { registerScroll } = useTabBarVisibility();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await apiClient.get('/bookings');
      if (response.data.success) {
        setBookings(response.data.bookings || []);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  useEffect(() => {
    const unsubscribe = subscribeBookingRealtime((event) => {
      if (event?.type !== 'booking.updated') return;
      fetchBookings();
    });

    return unsubscribe;
  }, [fetchBookings]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  const handleCancelBooking = (bookingId, bookingStatus) => {
    if (bookingStatus?.toLowerCase() === 'canceled') {
      if (Platform.OS === 'web') window.alert('This booking is already cancelled');
      else Alert.alert('Info', 'This booking is already cancelled');
      return;
    }

    const performCancel = async () => {
      try {
        const response = await apiClient.delete(`/bookings/${bookingId}`);
        if (response.data.success) {
          if (Platform.OS === 'web') window.alert('Booking cancelled');
          else Alert.alert('Success', 'Booking cancelled');
          fetchBookings();
        }
      } catch (error) {
        const msg = error.response?.data?.error || 'Failed to cancel booking';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Error', msg);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to cancel this booking?');
      if (confirmed) performCancel();
    } else {
      Alert.alert(
        'Cancel Booking',
        'Are you sure you want to cancel this booking?',
        [
          { text: 'No', onPress: () => {} },
          { text: 'Yes', onPress: performCancel },
        ]
      );
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 118, paddingBottom: insets.bottom + 140 }]}
      onScroll={registerScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
    >
      <Text style={styles.eyebrow}>Your Bookings</Text>
      <Text style={styles.title}>Bookings</Text>
      <Text style={styles.subtitle}>
        All your bookings from the database, with real-time status updates.
      </Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : bookings.length === 0 ? (
        <LiquidGlass style={styles.emptyCard} contentStyle={styles.emptyContent} strong>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-clear-outline" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptyText}>Bookings will appear here once you create them.</Text>
        </LiquidGlass>
      ) : (
        bookings.map(booking => {
          const statusColor = getStatusColor(booking.status);
          const statusIcon = getStatusIcon(booking.status);
          const createdAt = new Date(booking.created_at);
          let dateStr = 'N/A';
          let timeStr = 'N/A';
          try {
            dateStr = createdAt.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' });
            timeStr = createdAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
          } catch (_) {
            dateStr = createdAt.toDateString();
            timeStr = `${createdAt.getHours()}:${String(createdAt.getMinutes()).padStart(2, '0')}`;
          }

          return (
            <LiquidGlass key={booking._id} style={styles.bookingCard} contentStyle={styles.bookingContent}>
              {/* Header Row */}
              <View style={styles.bookingTop}>
                {booking.provider_avatar ? (
                  <Image 
                    source={{ uri: booking.provider_avatar }} 
                    style={styles.providerAvatarImage} 
                  />
                ) : (
                  <View style={[styles.serviceIcon, { backgroundColor: statusColor + '20' }]}>
                    <Ionicons name={statusIcon} size={20} color={statusColor} />
                  </View>
                )}
                <View style={styles.bookingCopy}>
                  <Text style={styles.bookingTitle}>{booking.service_type}</Text>
                  <Text style={styles.bookingMeta}>{booking.provider_name}</Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusText}>{booking.status?.toUpperCase()}</Text>
                </View>
              </View>

              {/* Details Grid */}
              <View style={styles.detailGrid}>
                <Detail
                  icon="location-outline"
                  label="Location"
                  value={[booking.area, booking.city].filter(Boolean).join(', ')}
                />
                <Detail
                  icon="cash-outline"
                  label="Quote"
                  value={money(booking.quote_pkr)}
                />
                <Detail
                  icon="calendar-outline"
                  label="Booked"
                  value={`${dateStr} at ${timeStr}`}
                />
                {booking.booking_start_time && (
                  <Detail
                    icon="time-outline"
                    label="Service Time"
                    value={new Date(booking.booking_start_time).toLocaleString('en-PK')}
                  />
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.viewStatusButton}
                  onPress={() => navigation.navigate('OrderStatus', { booking })}
                >
                  <Ionicons name="pulse-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.viewStatusButtonText}>View Status</Text>
                </TouchableOpacity>
                {['confirmed', 'operating', 'active', 'in_progress'].includes(String(booking.status || '').toLowerCase()) && (
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => navigation.navigate('ProviderChat', { booking })}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.chatButtonText}>Chat</Text>
                  </TouchableOpacity>
                )}
                {booking.status?.toLowerCase() !== 'canceled' && booking.status?.toLowerCase() !== 'completed' && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelBooking(booking._id, booking.status)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#F44336" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </LiquidGlass>
          );
        })
      )}
    </ScrollView>
  );
}

function Detail({ icon, label, value }) {
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={15} color={COLORS.primary} />
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={2}>{value || 'N/A'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 18 },
  eyebrow: { color: COLORS.primary, fontSize: 12, fontFamily: FONTS.heading.fontFamily, letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: COLORS.textPrimary, fontSize: 32, lineHeight: 38, fontFamily: FONTS.heading.fontFamily, marginTop: 8, letterSpacing: -0.3 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 20, fontFamily: FONTS.bold.fontFamily },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 13, fontFamily: FONTS.bold.fontFamily },
  emptyCard: { marginTop: 6 },
  emptyContent: { padding: 22, alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft, marginBottom: 12 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontFamily: FONTS.heading.fontFamily },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  bookingCard: { marginBottom: 14 },
  bookingContent: { padding: 16, gap: 14 },
  bookingTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  serviceIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  providerAvatarImage: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(14,143,70,0.1)' },
  bookingCopy: { flex: 1 },
  bookingTitle: { color: COLORS.textPrimary, fontSize: 19, fontFamily: FONTS.heading.fontFamily, letterSpacing: -0.2 },
  bookingMeta: { color: COLORS.textSecondary, fontSize: 13, fontFamily: FONTS.bold.fontFamily, marginTop: 3 },
  statusChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  statusText: { color: '#FFFFFF', fontSize: 11, fontFamily: FONTS.heading.fontFamily },
  detailGrid: { gap: 10 },
  detail: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  detailCopy: { flex: 1 },
  detailLabel: { color: COLORS.textSecondary, fontSize: 12, fontFamily: FONTS.bold.fontFamily, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { color: COLORS.textPrimary, fontSize: 15, fontFamily: FONTS.bold.fontFamily, marginTop: 3, lineHeight: 21 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  viewStatusButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: `${COLORS.primary}20` },
  viewStatusButtonText: { color: COLORS.primary, fontSize: 14, fontFamily: FONTS.subheading.fontFamily },
  chatButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: COLORS.primary },
  chatButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: FONTS.subheading.fontFamily },
  cancelButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#F4433620' },
  cancelButtonText: { color: '#F44336', fontSize: 14, fontFamily: FONTS.subheading.fontFamily },
});
