import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { configureNotifications } from './notifications';

// Screens
import SplashScreen from './screens/SplashScreen';
import AuthScreen from './screens/AuthScreen';
import ProviderDashboardScreen from './screens/ProviderDashboardScreen';
import ProviderBookingsScreen from './screens/ProviderBookingsScreen';
import ProviderChatScreen from './screens/ProviderChatScreen';
import ProviderProfileScreen from './screens/ProviderProfileScreen';

// Context & Theme
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppContext from './context/AppContext';
import { COLORS, SHADOWS } from './theme';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import LiquidGlass from './components/LiquidGlass';
import { TabBarVisibilityContext } from './components/TabBarVisibility';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator();

const TAB_CONFIG = [
  { name: 'Dashboard', label: 'Dashboard', icon: 'speedometer-outline', activeIcon: 'speedometer' },
  { name: 'Bookings', label: 'Bookings', icon: 'calendar-clear-outline', activeIcon: 'calendar' },
  { name: 'Messages', label: 'Messages', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
  { name: 'Profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

function getCurrentRouteName(state) {
  if (!state?.routes?.length) return 'Splash';
  const route = state.routes[state.index ?? 0];
  if (route.state) return getCurrentRouteName(route.state);
  return route.name;
}

function AnimatedTabButton({ tab, active, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.88, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
  };

  return (
    <Animated.View style={[styles.tabButton, active && styles.tabButtonActive, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.tabButtonInner}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Ionicons name={active ? tab.activeIcon : tab.icon} size={22} color={active ? '#FFFFFF' : COLORS.textSecondary} />
        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function LiquidTabBar({ navigationRef, currentRouteName }) {
  const insets = useSafeAreaInsets();
  const activeTab = useMemo(() => {
    if (['Dashboard', 'Bookings', 'Messages', 'Profile'].includes(currentRouteName)) return currentRouteName;
    return 'Dashboard';
  }, [currentRouteName]);

  const MAIN_TABS = ['Dashboard', 'Bookings', 'Messages', 'Profile'];

  return (
    <View
      style={[styles.tabBarWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}
      pointerEvents="box-none"
    >
      <LiquidGlass style={styles.tabBar} contentStyle={styles.tabBarInner} strong radius={18}>
        {TAB_CONFIG.map(tab => {
          const active = activeTab === tab.name;
          return (
            <AnimatedTabButton
              key={tab.name}
              tab={tab}
              active={active}
              onPress={() => navigationRef.current?.navigate(tab.name)}
            />
          );
        })}
      </LiquidGlass>
    </View>
  );
}

function ProviderNavigator() {
  const navigationRef = useRef(null);
  const [currentRouteName, setCurrentRouteName] = useState('Dashboard');

  const hideTabBar = useCallback(() => {}, []);
  const showTabBar = useCallback(() => {}, []);
  const registerScroll = useCallback((event) => {}, []);

  const contextValue = useMemo(() => ({ showTabBar, hideTabBar, registerScroll }), []);

  return (
    <TabBarVisibilityContext.Provider value={contextValue}>
      <View style={styles.appShell}>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => setCurrentRouteName(getCurrentRouteName(navigationRef.current?.getRootState()))}
          onStateChange={state => setCurrentRouteName(getCurrentRouteName(state))}
        >
          <Stack.Navigator
            initialRouteName="Dashboard"
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: COLORS.bg },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="Dashboard" component={ProviderDashboardScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Bookings" component={ProviderBookingsScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Messages" component={ProviderChatScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Profile" component={ProviderProfileScreen} options={{ animation: 'fade' }} />
          </Stack.Navigator>
        </NavigationContainer>
        <LiquidTabBar navigationRef={navigationRef} currentRouteName={currentRouteName} />
      </View>
    </TabBarVisibilityContext.Provider>
  );
}

function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="Splash" component={SplashScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <LiquidGlass opacity={0.1} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return user ? (
    <ProviderNavigator />
  ) : (
    <NavigationContainer>
      <AuthNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    configureNotifications();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppContext>
              <ToastProvider>
                <RootNavigator />
                <StatusBar barStyle="dark-content" />
              </ToastProvider>
            </AppContext>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  appShell: { flex: 1, backgroundColor: COLORS.bg },
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    zIndex: 9999,
    elevation: 20,
  },
  tabBar: { height: 78 },
  tabBarInner: {
    flex: 1,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    height: 60,
    borderRadius: 14,
    overflow: 'hidden',
  },
  tabButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabButtonActive: { backgroundColor: COLORS.primary },
  tabLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
  tabLabelActive: { color: '#FFFFFF' },
});
