import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import LiquidGlass from '../components/LiquidGlass';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SHADOWS } from '../theme';
import apiClient from '../lib/apiClient';
import { useTabBarVisibility } from '../components/TabBarVisibility';

export default function ProviderProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { registerScroll } = useTabBarVisibility();
  const { logout, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await apiClient.get('/provider/profile');
      if (response.data.success) {
        setProfile(response.data.provider);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const handleLogout = () => {
    const doLogout = async () => {
      await logout();
    };

    if (Platform.OS === 'web') {
      // Alert.alert is not supported on web — use native browser confirm
      if (window.confirm('Are you sure you want to logout?')) {
        doLogout();
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: doLogout },
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Profile" subtitle="Your account information" onBack={() => navigation.canGoBack() ? navigation.goBack() : null} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Profile" subtitle="Your account information" onBack={() => navigation.canGoBack() ? navigation.goBack() : null} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        scrollEventThrottle={16}
        onScroll={registerScroll}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <LiquidGlass opacity={0.02} />
          <View style={styles.avatarContainer}>
            {profile?.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person-circle" size={80} color={COLORS.primary} />
            )}
          </View>
          <Text style={styles.profileName}>{profile?.name || 'Provider'}</Text>
          <Text style={styles.profileEmail}>{profile?.email || 'email@example.com'}</Text>
        </View>

        {/* Info Cards */}
        <View style={styles.infoSection}>
          <InfoCard
            icon="mail-outline"
            label="Email"
            value={profile?.email || 'Not set'}
          />
          <InfoCard
            icon="location-outline"
            label="City"
            value={profile?.city || 'Not set'}
          />
          <InfoCard
            icon="id-card-outline"
            label="Provider ID"
            value={profile?.provider_id || 'Not set'}
          />
        </View>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <SettingItem icon="notifications-outline" label="Notifications" />
          <SettingItem icon="lock-closed-outline" label="Change Password" />
          <SettingItem icon="document-text-outline" label="Terms & Conditions" />
          <SettingItem icon="shield-outline" label="Privacy Policy" />
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const InfoCard = ({ icon, label, value }) => (
  <View style={styles.infoCard}>
    <LiquidGlass opacity={0.02} />
    <View style={styles.infoIconContainer}>
      <Ionicons name={icon} size={24} color={COLORS.primary} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const SettingItem = ({ icon, label }) => (
  <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
    <View style={styles.settingLeft}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
      <Text style={styles.settingLabel}>{label}</Text>
    </View>
    <Ionicons name="chevron-forward-outline" size={20} color={COLORS.textSecondary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    backgroundColor: COLORS.card,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileName: {
    ...FONTS.headline,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  profileEmail: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
  },
  infoSection: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  infoIconContainer: {
    marginRight: 16,
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    ...FONTS.body2,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  settingsSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    ...FONTS.subtitle1,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    ...FONTS.body2,
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 32,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FF6B6B' + '20',
    gap: 8,
  },
  logoutText: {
    ...FONTS.subtitle2,
    color: '#FF6B6B',
    fontWeight: '600',
  },
});
