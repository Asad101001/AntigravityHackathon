import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import ScreenHeader from '../components/ScreenHeader';
import LiquidGlass from '../components/LiquidGlass';
import { COLORS, FONTS, SHADOWS } from '../theme';
import apiClient from '../lib/apiClient';

export default function ProviderDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingBookings: 0,
    activeBookings: 0,
    completedToday: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      // For now, mock data - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setStats({
        pendingBookings: 3,
        activeBookings: 1,
        completedToday: 2,
        totalEarnings: 5400,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [fetchStats]);

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
        title={`Welcome, ${user?.name?.split(' ')[0]}`}
        subtitle="Provider Dashboard"
      />

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
                label="Today's Earnings"
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

            {/* Recent Activity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <View style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: COLORS.success }]} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>Booking #12345 completed</Text>
                  <Text style={styles.activityTime}>2 hours ago</Text>
                </View>
              </View>
              <View style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: COLORS.warning }]} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>New booking request received</Text>
                  <Text style={styles.activityTime}>15 minutes ago</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
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
});
