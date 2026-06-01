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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import LiquidGlass from '../components/LiquidGlass';
import { COLORS, FONTS, SHADOWS } from '../theme';
import apiClient from '../lib/apiClient';
import { useTabBarVisibility } from '../components/TabBarVisibility';

const TABS = ['Active', 'Completed', 'Canceled'];

export default function ProviderBookingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { registerScroll } = useTabBarVisibility();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Active');
  const [actionInProgress, setActionInProgress] = useState(null); // tracks booking_id being actioned

  const fetchBookings = useCallback(async () => {
    try {
      const response = await apiClient.get('/provider/bookings');
      if (response.data.success) {
        // Transform backend booking data to UI format
        const transformedBookings = (response.data.bookings || []).map(booking => {
          let description = booking.description || booking.raw_data?.description;
          let intentLog = booking.raw_data?.execution_logs?.find(l => l.name === 'parse_intent');
          let urgency = 'normal';

          if (intentLog?.output) {
            const out = intentLog.output;
            if (out.urgency || out.urgency_level) urgency = String(out.urgency || out.urgency_level).toLowerCase();

            if (!description) {
              const details = [];
              if (out.service_type) details.push(`Intent: ${out.service_type}`);
              if (out.location_hint || out.location) details.push(`Loc: ${out.location_hint || out.location}`);
              if (out.time_hint || out.time_preference) details.push(`Time: ${out.time_hint || out.time_preference}`);
              if (out.urgency || out.urgency_level) details.push(`Urgency: ${out.urgency || out.urgency_level}`);
              description = details.join(' • ') || 'No additional details provided.';
            }
          }

          if (!description) {
            description = 'No additional details provided.';
          }

          let clientName = booking.client_name;
          if (!clientName || clientName === 'Customer') {
            clientName = booking.raw_data?.user_name || booking.raw_data?.customer_name || 'Guest User';
          }

          return {
            id: booking._id || booking.id,
            clientName: clientName,
            serviceType: booking.service_type || 'Service',
            location: booking.location || booking.area || 'Unknown Location',
            status: mapBackendStatus(booking.status),
            rawStatus: booking.status,
            quote: booking.quote ?? booking.quote_pkr ?? 0,
            date: getFriendlyTime(booking.booking_start_time),
            description: description,
            booking_id: booking._id || booking.id,
            clientPhone: booking.client_phone || booking.raw_data?.phone || '+92 3XX XXXXXXX',
            clientAvatar: booking.client_avatar || null,
            urgency: urgency,
            raw: booking,
          };
        });
        setBookings(transformedBookings);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error?.message || error);
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
    return statusMap[String(backendStatus || '').toLowerCase()] || 'pending';
  };

  // Premium relative time formatter
  const getFriendlyTime = (isoString) => {
    if (!isoString) return 'Date pending';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'Date pending';
      
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const isToday = date.toDateString() === now.toDateString();
      
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const isTomorrow = date.toDateString() === tomorrow.toDateString();

      const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      if (isToday) {
        if (diffMs > 0 && diffMs < 3600000) {
          const diffMins = Math.round(diffMs / 60000);
          return `Today in ${diffMins} min (${timeString})`;
        }
        if (diffMs < 0 && diffMs > -3600000) {
          const diffMins = Math.round(Math.abs(diffMs) / 60000);
          return `Started ${diffMins} min ago (${timeString})`;
        }
        return `Today at ${timeString}`;
      } else if (isTomorrow) {
        return `Tomorrow at ${timeString}`;
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric'
        }) + ` at ${timeString}`;
      }
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

  const filteredBookings = bookings
    .filter(b => {
      const tabLower = String(activeTab || '').toLowerCase();
      if (tabLower === 'active') {
        return b?.status === 'active' || b?.status === 'pending';
      }
      return b?.status === tabLower;
    })
    .sort((a, b) => {
      const timeA = new Date(a.raw?.booking_start_time || a.raw?.created_at || 0).getTime();
      const timeB = new Date(b.raw?.booking_start_time || b.raw?.created_at || 0).getTime();
      if (activeTab === 'Active') {
        return timeA - timeB; // Chronological (soonest first)
      } else {
        return timeB - timeA; // Most recent first
      }
    });

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

    const navigateToChat = () => {
      navigation.navigate('Messages', {
        booking_id: booking.booking_id,
        clientName: booking.clientName,
        serviceType: booking.serviceType,
        status: booking.status
      });
    };

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={navigateToChat}
        activeOpacity={0.8}
      >
        <LiquidGlass opacity={0.02} />
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            {booking.clientAvatar ? (
              <Image 
                source={{ uri: booking.clientAvatar }} 
                style={{ width: '100%', height: '100%', borderRadius: 22 }} 
              />
            ) : (
              <Text style={styles.avatarText}>
                {booking.clientName
                  ? booking.clientName
                      .split(' ')
                      .filter(Boolean)
                      .map(n => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()
                  : 'CU'}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <Text style={styles.clientName} numberOfLines={1}>{booking.clientName}</Text>
              {(booking.urgency === 'high' || booking.urgency === 'urgent') && (
                <View style={styles.urgencyBadge}>
                  <Ionicons name="alert-circle" size={10} color="#FFFFFF" />
                  <Text style={styles.urgencyText}>URGENT</Text>
                </View>
              )}
            </View>
            <Text style={styles.serviceType}>{booking.serviceType}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20', marginLeft: 8 }]}>
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
              {booking?.rawStatus?.toUpperCase() || String(booking?.status || '').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location" size={14} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{booking.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time" size={14} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{booking.date}</Text>
          </View>
          {booking.clientPhone && (
            <View style={styles.detailRow}>
              <Ionicons name="call" size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{booking.clientPhone}</Text>
            </View>
          )}
          {booking.description ? (
            <View style={styles.detailRow}>
              <Ionicons name="document-text" size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailText} numberOfLines={2}>{booking.description}</Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Ionicons name="cash" size={14} color={COLORS.textSecondary} />
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
                onPress={navigateToChat}
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
      <ScreenHeader navigation={navigation} title="Bookings" subtitle="Manage your service requests" />

      {/* Tab Navigation */}
      <View style={[styles.tabScroll, styles.tabContent, { flexDirection: 'row' }]}>
        {TABS.map((tab) => {
          const count = bookings.filter(b => {
            const tabLower = tab.toLowerCase();
            if (tabLower === 'active') {
              return b.status === 'active' || b.status === 'pending';
            }
            return b.status === tabLower;
          }).length;
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
      </View>

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
          scrollEventThrottle={16}
          onScroll={registerScroll}
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
    paddingBottom: 140,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  avatarText: {
    color: COLORS.primary,
    ...FONTS.subtitle2,
    fontWeight: '700',
  },
  urgencyBadge: {
    backgroundColor: '#E53E3E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  urgencyText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
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
    paddingVertical: 10,
    marginVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
    marginLeft: 6,
    flex: 1,
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
