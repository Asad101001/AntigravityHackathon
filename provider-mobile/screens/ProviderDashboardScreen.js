import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import ScreenHeader from '../components/ScreenHeader';
import LiquidGlass from '../components/LiquidGlass';
import { COLORS, FONTS, SHADOWS } from '../theme';
import apiClient from '../lib/apiClient';
import { sendLocalNotification } from '../notifications';
import { useTabBarVisibility } from '../components/TabBarVisibility';

export default function ProviderDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { registerScroll } = useTabBarVisibility();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingBookings: 0,
    activeBookings: 0,
    completedToday: 0,
    totalEarnings: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/provider/bookings');
      if (response.data.success) {
        const bookings = response.data.bookings || [];
        const today = new Date().toDateString();

        const pending = bookings.filter(b => ['pending', 'pending_provider_acceptance'].includes(String(b.status).toLowerCase()));
        const active = bookings.filter(b => ['confirmed', 'active'].includes(b.status)).length;
        const completedToday = bookings.filter(b => {
          if (b.status !== 'completed') return false;
          const d = b.booking_start_time ? new Date(b.booking_start_time).toDateString() : null;
          return d === today;
        }).length;
        // Safely sum earnings — backend sends both quote and quote_pkr
        const earnings = bookings
          .filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + (b.quote ?? b.quote_pkr ?? 0), 0);

        setStats({ pendingBookings: pending.length, activeBookings: active, completedToday, totalEarnings: earnings });

        // Show modal for the first pending booking that hasn't been dismissed
        if (pending.length > 0 && !pendingBooking) {
          setPendingBooking(pending[0]);
          sendLocalNotification(
            'New Booking Request!',
            `${pending[0].client_name || 'A customer'} needs ${pending[0].service_type || 'a service'} in ${pending[0].area || 'your area'}`,
            { bookingId: pending[0]._id || pending[0].id }
          );
        } else if (pending.length === 0) {
          setPendingBooking(null);
        }

        // Last 3 bookings for recent activity
        setRecentBookings(bookings.slice(0, 3));
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error?.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pendingBooking]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
      const intervalId = setInterval(fetchStats, 5000);
      return () => clearInterval(intervalId);
    }, [fetchStats])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [fetchStats]);

  const showError = (msg) => {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Error', msg);
  };

  const handleAccept = async () => {
    if (!pendingBooking || actionLoading) return;
    setActionLoading(true);
    try {
      // Use _id which is the actual MongoDB document ID
      const bookingId = pendingBooking._id || pendingBooking.id;
      const response = await apiClient.post(`/provider/bookings/${bookingId}/accept`);
      if (response.data.success) {
        if (Platform.OS !== 'web') Alert.alert('Success', 'Request accepted!');
        setPendingBooking(null);
        fetchStats();
        navigation.navigate('Bookings');
      }
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Failed to accept request';
      showError(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!pendingBooking || actionLoading) return;
    setActionLoading(true);
    try {
      const bookingId = pendingBooking._id || pendingBooking.id;
      const response = await apiClient.post(`/provider/bookings/${bookingId}/reject`);
      if (response.data.success) {
        setPendingBooking(null);
        fetchStats();
      }
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Failed to reject request';
      showError(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const getActivityIcon = (status) => {
    switch (status) {
      case 'completed': return { name: 'checkmark-circle', color: COLORS.success };
      case 'confirmed': return { name: 'calendar', color: COLORS.accentBlue };
      case 'pending': return { name: 'time', color: COLORS.warning };
      case 'canceled':
      case 'rejected': return { name: 'close-circle', color: COLORS.error };
      default: return { name: 'ellipse', color: COLORS.textSecondary };
    }
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return '';
    try {
      const diff = Date.now() - new Date(isoString).getTime();
      if (diff < 0) return 'upcoming';
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch {
      return '';
    }
  };

  const formatQuote = (booking) => {
    const q = booking?.quote ?? booking?.quote_pkr;
    if (typeof q === 'number' && q > 0) return `PKR ${Math.round(q).toLocaleString()}`;
    return 'Quote pending';
  };

  const StatCard = ({ icon, label, value, color, onPress }) => (
    <TouchableOpacity
      style={[styles.statCard, { borderTopColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LiquidGlass opacity={0.03} />
      <View style={styles.statContent}>
        <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={28} color={color} />
        </View>
        <View style={styles.statText}>
          <Text style={styles.statLabel}>{label}</Text>
          <Text style={styles.statValue}>{value}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Welcome, ${user?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Provider'}`}
        subtitle="Provider Dashboard"
        avatar={user?.avatar}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={registerScroll}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
        ) : (
          <View style={styles.content}>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <StatCard
                icon="time-outline"
                label="Pending Requests"
                value={stats.pendingBookings}
                color={COLORS.warning}
                onPress={() => navigation.navigate('Bookings')}
              />
              <StatCard
                icon="checkmark-circle-outline"
                label="Active Bookings"
                value={stats.activeBookings}
                color={COLORS.accentBlue}
                onPress={() => navigation.navigate('Bookings')}
              />
              <StatCard
                icon="checkmark-done-outline"
                label="Completed Today"
                value={stats.completedToday}
                color={COLORS.success}
                onPress={() => navigation.navigate('Bookings')}
              />
              <StatCard
                icon="cash-outline"
                label="Total Earnings"
                value={`PKR ${stats.totalEarnings.toLocaleString()}`}
                color={COLORS.accentGold}
                onPress={() => navigation.navigate('Bookings')}
              />
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Bookings')}
                activeOpacity={0.8}
              >
                <LiquidGlass opacity={0.03} />
                <Ionicons name="calendar" size={24} color={COLORS.primary} />
                <Text style={styles.actionLabel}>View All Bookings</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Messages')}
                activeOpacity={0.8}
              >
                <LiquidGlass opacity={0.03} />
                <Ionicons name="chatbubbles" size={24} color={COLORS.primary} />
                <Text style={styles.actionLabel}>Check Messages</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Profile')}
                activeOpacity={0.8}
              >
                <LiquidGlass opacity={0.03} />
                <Ionicons name="person" size={24} color={COLORS.primary} />
                <Text style={styles.actionLabel}>Update Profile</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Recent Activity — real data from bookings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {recentBookings.length === 0 ? (
                <Text style={[styles.activityTime, { marginTop: 8 }]}>No recent bookings yet.</Text>
              ) : (
                recentBookings.map((b) => {
                  const { name: dotIcon, color: dotColor } = getActivityIcon(b.status);
                  return (
                    <View key={b._id || b.id} style={styles.activityItem}>
                      <View style={[styles.activityDot, { backgroundColor: dotColor }]} />
                      <View style={styles.activityContent}>
                        <Text style={styles.activityText}>
                          {b.client_name || 'Customer'} — {b.service_type || 'Service'} ({b.status})
                        </Text>
                        <Text style={styles.activityTime}>
                          {formatRelativeTime(b.created_at || b.booking_start_time)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Full-Screen Incoming Booking Popup */}
      <Modal
        visible={!!pendingBooking}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderGlow}>
              <Ionicons name="notifications-circle" size={80} color={COLORS.primary} />
            </View>
            <Text style={styles.modalTitle}>New Booking Request!</Text>
            <Text style={styles.modalSub}>
              {pendingBooking?.client_name || 'A customer'} needs{' '}
              {pendingBooking?.service_type || 'a service'}
            </Text>
            <View style={styles.modalDetailsBox}>
              <View style={styles.modalDetailRow}>
                <Ionicons name="person" size={20} color={COLORS.textSecondary} />
                <Text style={styles.modalDetailText}>
                  {pendingBooking?.client_name || 'Customer'}
                </Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Ionicons name="construct" size={20} color={COLORS.textSecondary} />
                <Text style={styles.modalDetailText}>
                  {pendingBooking?.service_type || 'Service'}
                </Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Ionicons name="location" size={20} color={COLORS.textSecondary} />
                <Text style={styles.modalDetailText}>
                  {pendingBooking?.location || pendingBooking?.area || 'Location pending'}
                </Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Ionicons name="cash" size={20} color={COLORS.textSecondary} />
                <Text style={styles.modalDetailText}>
                  {formatQuote(pendingBooking)}
                </Text>
              </View>
              {pendingBooking?.booking_start_time && (
                <View style={[styles.modalDetailRow, { marginBottom: 0 }]}>
                  <Ionicons name="time" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.modalDetailText}>
                    {new Date(pendingBooking.booking_start_time).toLocaleString('en-PK')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalRejectBtn}
                onPress={handleReject}
                activeOpacity={0.8}
                disabled={actionLoading}
              >
                <Text style={styles.modalRejectBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalAcceptBtn, actionLoading && { opacity: 0.6 }]}
                onPress={handleAccept}
                activeOpacity={0.8}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.modalAcceptBtnText}>Accept Job</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statsGrid: {
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderTopWidth: 3,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    flex: 1,
  },
  statLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    ...FONTS.h4,
    color: COLORS.textPrimary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...FONTS.subtitle1,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  actionLabel: {
    ...FONTS.body1,
    color: COLORS.textPrimary,
    flex: 1,
    marginLeft: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    ...FONTS.body2,
    color: COLORS.textPrimary,
  },
  activityTime: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 30,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  modalHeaderGlow: {
    marginBottom: 16,
    borderRadius: 50,
    backgroundColor: 'rgba(14, 143, 70, 0.1)',
    padding: 10,
  },
  modalTitle: {
    fontSize: 26,
    fontFamily: FONTS.h1.fontFamily,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body1.fontFamily,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalDetailsBox: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    ...SHADOWS.sm,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalDetailText: {
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: FONTS.body1.fontFamily,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
  },
  modalRejectBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRejectBtnText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontFamily: FONTS.button.fontFamily,
  },
  modalAcceptBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  modalAcceptBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: FONTS.button.fontFamily,
  },
});
