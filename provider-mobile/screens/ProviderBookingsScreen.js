import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import LiquidGlass from '../components/LiquidGlass';
import { COLORS, FONTS, SHADOWS } from '../theme';
import apiClient from '../lib/apiClient';

const TABS = ['Pending', 'Active', 'Completed', 'Canceled'];

export default function ProviderBookingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Pending');
  const [actionInProgress, setActionInProgress] = useState(null); // tracks booking_id being actioned

  const fetchBookings = useCallback(async () => {
    try {
      const response = await apiClient.get('/provider/bookings');
      if (response.data.success) {
        // Transform backend booking data to UI format
        const transformedBookings = (response.data.bookings || []).map(booking => ({
          id: booking._id || booking.id,
          clientName: booking.client_name || 'Customer',
          serviceType: booking.service_type || 'Service',
          location: booking.location || booking.area || 'Unknown Location',
          status: mapBackendStatus(booking.status),
          rawStatus: booking.status, // keep original for transition logic
          quote: booking.quote ?? booking.quote_pkr ?? 0,
          date: formatDate(booking.booking_start_time),
          description: booking.description || '',
          booking_id: booking._id || booking.id,
          clientPhone: booking.client_phone || null,
          raw: booking, // Keep original for actions
        }));
        setBookings(transformedBookings);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error?.message || error);
      // Don't show alert on polling errors — only on manual refresh
      if (refreshing) {
        showError('Failed to load bookings');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  // Helper to map backend status to UI tab status
  const mapBackendStatus = (backendStatus) => {
    const statusMap = {
      'pending': 'pending',
      'confirmed': 'active',
      'active': 'active',
      'completed': 'completed',
      'canceled': 'canceled',
      'rejected': 'canceled',
    };
    return statusMap[backendStatus?.toLowerCase()] || 'pending';
  };

  // Helper to format booking date
  const formatDate = (isoString) => {
    if (!isoString) return 'Date pending';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'Date pending';
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date pending';
    }
  };

  const showError = (msg) => {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Error', msg);
  };

  const showSuccess = (msg) => {
    if (Platform.OS !== 'web') Alert.alert('Success', msg);
  };

  // Poll every 5 seconds for live updates
  useFocusEffect(
    useCallback(() => {
      fetchBookings();
      const intervalId = setInterval(fetchBookings, 5000);
      return () => clearInterval(intervalId);
    }, [fetchBookings])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  // ── Centralized action handler with guards ────────────────────────────────
  const executeAction = async (booking, action, endpoint, successMsg) => {
    // Prevent double-tap
    if (actionInProgress) return;

    // Web confirmation dialog
    if (Platform.OS === 'web') {
      const confirmMsg = {
        accept: 'Accept this booking?',
        reject: 'Reject this booking?',
        complete: 'Mark this booking as completed?',
        cancel: 'Cancel this booking?',
      };
      if (!window.confirm(confirmMsg[action] || 'Are you sure?')) return;
    }

    setActionInProgress(booking.booking_id);
    try {
      const response = await apiClient[endpoint.method](endpoint.url);
      if (response.data.success) {
        showSuccess(successMsg);
        fetchBookings();
      }
    } catch (error) {
      const errMsg = error.response?.data?.error || `Failed to ${action} booking`;
      showError(errMsg);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAccept = (booking) => {
    executeAction(booking, 'accept',
      { method: 'post', url: `/provider/bookings/${booking.booking_id}/accept` },
      'Booking accepted!'
    );
  };

  const handleReject = (booking) => {
    executeAction(booking, 'reject',
      { method: 'post', url: `/provider/bookings/${booking.booking_id}/reject` },
      'Booking rejected'
    );
  };

  const handleComplete = (booking) => {
    executeAction(booking, 'complete',
      { method: 'post', url: `/provider/bookings/${booking.booking_id}/complete` },
      'Booking completed!'
    );
  };

  const handleCancel = (booking) => {
    executeAction(booking, 'cancel',
      { method: 'delete', url: `/provider/bookings/${booking.booking_id}` },
      'Booking canceled'
    );
  };

  const filteredBookings = bookings.filter(b => b.status === activeTab.toLowerCase());

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'active': return COLORS.accentBlue;
      case 'completed': return COLORS.success;
      case 'canceled': return COLORS.error;
      default: return COLORS.textSecondary;
    }
  };

  const BookingCard = ({ booking, onPress }) => {
    const isActioning = actionInProgress === booking.booking_id;

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <LiquidGlass opacity={0.02} />
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.clientName}>{booking.clientName}</Text>
            <Text style={styles.serviceType}>{booking.serviceType}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
              {booking.rawStatus?.toUpperCase() || booking.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{booking.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time" size={16} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{booking.date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash" size={16} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>
              {typeof booking.quote === 'number' && booking.quote > 0
                ? `PKR ${Math.round(booking.quote).toLocaleString()}`
                : 'Quote pending'}
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          {isActioning ? (
            <View style={[styles.actionBtn, { backgroundColor: COLORS.border }]}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : (
            <>
              {booking.status === 'pending' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleAccept(booking)}
                  >
                    <Ionicons name="checkmark" size={16} color="white" />
                    <Text style={styles.actionBtnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleReject(booking)}
                  >
                    <Ionicons name="close" size={16} color="white" />
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </>
              )}

              {booking.status === 'active' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.completeBtn]}
                    onPress={() => handleComplete(booking)}
                  >
                    <Ionicons name="checkmark-done" size={16} color="white" />
                    <Text style={styles.actionBtnText}>Complete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.cancelBtn]}
                    onPress={() => handleCancel(booking)}
                  >
                    <Ionicons name="close" size={16} color="white" />
                    <Text style={styles.actionBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={[styles.actionBtn, styles.chatBtn]}
                onPress={() => navigation.navigate('Messages')}
              >
                <Ionicons name="chatbubble" size={16} color="white" />
                <Text style={styles.actionBtnText}>Chat</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Bookings" subtitle="Manage your service requests" />

      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.map((tab) => {
          const count = bookings.filter(b => b.status === tab.toLowerCase()).length;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab} {count > 0 ? `(${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="calendar-clear-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No {activeTab.toLowerCase()} bookings</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
        >
          <View style={styles.bookingsList}>
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onPress={() => navigation.navigate('BookingDetail', { booking })}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabScroll: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    ...FONTS.subtitle2,
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  scroll: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...FONTS.body1,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  bookingsList: {
    padding: 16,
    paddingBottom: 100,
  },
  bookingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientName: {
    ...FONTS.subtitle1,
    color: COLORS.textPrimary,
  },
  serviceType: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    ...FONTS.caption,
    fontWeight: '600',
  },
  cardDetails: {
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  acceptBtn: {
    backgroundColor: COLORS.success,
  },
  rejectBtn: {
    backgroundColor: COLORS.error,
  },
  completeBtn: {
    backgroundColor: COLORS.success,
  },
  cancelBtn: {
    backgroundColor: COLORS.error,
  },
  chatBtn: {
    backgroundColor: COLORS.primary,
  },
  actionBtnText: {
    ...FONTS.caption,
    color: 'white',
    fontWeight: '600',
  },
});
