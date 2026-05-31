import React, { useEffect, useState, useCallback } from 'react';
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

  const fetchBookings = useCallback(async () => {
    try {
      // Mock data - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setBookings([
        {
          id: '1',
          clientName: 'Ahmed Hassan',
          serviceType: 'AC Repair',
          location: 'Defence, Lahore',
          status: 'pending',
          quote: 3500,
          date: 'Today, 2:00 PM',
          description: 'AC not cooling properly',
        },
        {
          id: '2',
          clientName: 'Fatima Khan',
          serviceType: 'Plumbing',
          location: 'DHA Phase 5, Lahore',
          status: 'active',
          quote: 2500,
          date: 'Today, 3:30 PM',
          description: 'Leaking tap in kitchen',
        },
        {
          id: '3',
          clientName: 'Ali Raza',
          serviceType: 'Electrical',
          location: 'Gulberg, Lahore',
          status: 'completed',
          quote: 1800,
          date: 'Yesterday, 5:00 PM',
          description: 'Installed new light fixture',
        },
      ]);
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

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  const handleAccept = (bookingId) => {
    Alert.alert(
      'Accept Booking',
      'Are you sure you want to accept this booking?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              // API call would go here
              Alert.alert('Success', 'Booking accepted!');
              fetchBookings();
            } catch (error) {
              Alert.alert('Error', 'Failed to accept booking');
            }
          },
        },
      ]
    );
  };

  const handleReject = (bookingId) => {
    Alert.alert(
      'Reject Booking',
      'Are you sure you want to reject this booking?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Reject',
          onPress: async () => {
            try {
              // API call would go here
              Alert.alert('Success', 'Booking rejected');
              fetchBookings();
            } catch (error) {
              Alert.alert('Error', 'Failed to reject booking');
            }
          },
        },
      ]
    );
  };

  const handleCancel = (bookingId) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', onPress: () => {} },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              // API call would go here
              Alert.alert('Success', 'Booking canceled');
              fetchBookings();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel booking');
            }
          },
        },
      ]
    );
  };

  const filteredBookings = bookings.filter(b => b.status === activeTab.toLowerCase());

  const BookingCard = ({ booking, onPress }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LiquidGlass opacity={0.02} />
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.clientName}>{booking.clientName}</Text>
          <Text style={styles.serviceType}>{booking.serviceType}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
            {booking.status.toUpperCase()}
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
          <Text style={styles.detailText}>PKR {booking.quote.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        {booking.status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => handleAccept(booking.id)}
            >
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.actionBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleReject(booking.id)}
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
              onPress={() => handleCancel(booking.id)}
            >
              <Ionicons name="checkmark-done" size={16} color="white" />
              <Text style={styles.actionBtnText}>Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={() => handleCancel(booking.id)}
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
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'active': return COLORS.accentBlue;
      case 'completed': return COLORS.success;
      case 'canceled': return COLORS.error;
      default: return COLORS.textSecondary;
    }
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
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
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
