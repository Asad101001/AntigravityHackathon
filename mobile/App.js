import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
import BookingsScreen from './screens/BookingsScreen';
import OrderStatusScreen from './screens/OrderStatusScreen';
import ChatScreen from './screens/ChatScreen';
import IntentConfirmScreen from './screens/IntentConfirmScreen';
import LoadingScreen from './screens/LoadingScreen';
import ProviderResultsScreen from './screens/ProviderResultsScreen';
import BookingConfirmScreen from './screens/BookingConfirmScreen';
import ConfirmationScreen from './screens/ConfirmationScreen';
import AgentTraceScreen from './screens/AgentTraceScreen';
import ReviewBookingScreen from './screens/ReviewBookingScreen';
import ProviderChatScreen from './screens/ProviderChatScreen';
import LocationPickerScreen from './screens/LocationPickerScreen';
import SplashScreen from './screens/SplashScreen';
import AuthScreen from './screens/AuthScreen';
import AppHeader from './components/AppHeader';
import Sidebar from './components/Sidebar';
import LiquidGlass from './components/LiquidGlass';
import { ToastProvider } from './components/Toast';
import { COLORS, SHADOWS, darkTheme } from './theme';
import { TabBarVisibilityContext } from './components/TabBarVisibility';
import { initNotificationHandler, configureNotifications } from './notifications';
import { AppContextProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

// Initialize notification handler as early as possible
// This must run before any notification is scheduled
void initNotificationHandler();

const Stack = createNativeStackNavigator();

const TAB_CONFIG = [
  { name: 'Home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'Bookings', label: 'Bookings', icon: 'calendar-clear-outline', activeIcon: 'calendar' },
  { name: 'Chat', label: 'Chat', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
];

const ROUTE_LABELS = {
  Home: 'Home',
  Bookings: 'Bookings',
  Chat: 'Chat',
  OrderStatus: 'Order Status',
  IntentConfirm: 'Confirm Request',
  ProviderResults: 'Providers',
  BookingConfirm: 'Confirm Booking',
  ReviewBooking: 'Review Booking',
  ProviderChat: 'Provider Chat',
  LocationPicker: 'Location',
  Confirmation: 'Confirmed',
  AgentTrace: 'Agent Trace',
  Loading: 'Matching',
};

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

function LiquidTabBar({ navigationRef, currentRouteName, visible, showTabBar }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;
  const activeTab = useMemo(() => {
    if (['Home', 'Bookings', 'Chat'].includes(currentRouteName)) return currentRouteName;
    if (currentRouteName === 'ProviderChat') return 'Chat';
    if (['Confirmation', 'ReviewBooking', 'BookingConfirm', 'OrderStatus'].includes(currentRouteName)) return 'Bookings';
    if (['Loading', 'IntentConfirm', 'ProviderResults', 'AgentTrace'].includes(currentRouteName)) return 'Home';
    return 'Home';
  }, [currentRouteName]);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 112,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
    }).start();
  }, [translateY, visible]);

  const MAIN_TABS = ['Home', 'Bookings', 'Chat'];
  if (!MAIN_TABS.includes(currentRouteName)) return null;

  return (
    <Animated.View
      style={[styles.tabBarWrap, { paddingBottom: Math.max(insets.bottom, 12), transform: [{ translateY }] }]}
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
    </Animated.View>
  );
}

function AppNavigator() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const navigationRef = useRef(null);
  const [currentRouteName, setCurrentRouteName] = useState('Splash');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const idleTimer = useRef(null);
  const lastOffset = useRef(0);

  useEffect(() => {
    void configureNotifications();
  }, []);

  const hideTabBar = useCallback(() => {
    setTabVisible(prev => {
      if (prev === false) return prev;
      return false;
    });
  }, []);

  const showTabBar = useCallback(() => {
    setTabVisible(prev => {
      if (prev === true) return prev;
      return true;
    });
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setTabVisible(prev => {
        if (prev === false) return prev;
        return false;
      });
    }, 3200);
  }, []);

  const registerScroll = useCallback((event) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y > lastOffset.current + 8 && y > 24) hideTabBar();
    if (y < lastOffset.current - 8) showTabBar();
    lastOffset.current = y;
  }, [hideTabBar, showTabBar]);

  useEffect(() => {
    if (currentRouteName !== 'Splash') showTabBar();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [currentRouteName, showTabBar]);

  const contextValue = useMemo(() => ({ showTabBar, hideTabBar, registerScroll }), [showTabBar, hideTabBar, registerScroll]);

  return (
    <TabBarVisibilityContext.Provider value={contextValue}>
      <View style={[styles.appShell, isDark && { backgroundColor: theme.colors.bg }]}>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => setCurrentRouteName(getCurrentRouteName(navigationRef.current?.getRootState()))}
          onStateChange={state => setCurrentRouteName(getCurrentRouteName(state))}
        >
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: COLORS.bg },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={({ navigation, route }) => ({
                headerShown: true,
                headerTransparent: true,
                headerShadowVisible: false,
                headerBackVisible: false,
                header: () => (
                  <View style={styles.headerFrame} pointerEvents="box-none">
                    <AppHeader
                      navigation={navigation}
                      routeName="Home"
                      canGoBack={false}
                      onProfilePress={() => setSidebarVisible(true)}
                    />
                  </View>
                ),
                animation: 'fade',
              })}
            />
            <Stack.Screen name="Bookings" component={BookingsScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="OrderStatus" component={OrderStatusScreen} />
            <Stack.Screen name="IntentConfirm" component={IntentConfirmScreen} />
            <Stack.Screen name="Loading" component={LoadingScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="ProviderResults" component={ProviderResultsScreen} />
            <Stack.Screen name="BookingConfirm" component={BookingConfirmScreen} />
            <Stack.Screen name="ReviewBooking" component={ReviewBookingScreen} />
            <Stack.Screen name="ProviderChat" component={ProviderChatScreen} />
            <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
            <Stack.Screen name="Confirmation" component={ConfirmationScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="AgentTrace" component={AgentTraceScreen} />
          </Stack.Navigator>
        </NavigationContainer>
        <LiquidTabBar navigationRef={navigationRef} currentRouteName={currentRouteName} visible={tabVisible} showTabBar={showTabBar} />
        <Sidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          darkMode={isDark}
          onToggleTheme={toggleTheme}
          onNavigateTrace={() => navigationRef.current?.navigate('AgentTrace')}
          currentUser={user}
          onLogout={logout}
        />
      </View>
    </TabBarVisibilityContext.Provider>
  );
}

export default function App() {
  function AuthGate() {
    const { isLoading, user } = useAuth();

    if (isLoading) {
      return (
        <View style={{ flex: 1, backgroundColor: '#F5FBF7' }}>
          {/* Ambient tonal layers */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', backgroundColor: '#E8F4FD', opacity: 0.85 }} />
          <View style={{ position: 'absolute', top: '30%', left: 0, right: 0, height: '30%', backgroundColor: '#EDF9F0', opacity: 0.6 }} />
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', backgroundColor: '#E0F5E8', opacity: 0.75 }} />

          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
            {/* Premium card */}
            <View style={{
              width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF',
              borderRadius: 28, paddingVertical: 44, paddingHorizontal: 28,
              alignItems: 'center', borderWidth: 1, borderColor: 'rgba(14,143,70,0.1)',
              shadowColor: '#087238', shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.18, shadowRadius: 32, elevation: 12,
            }}>
              {/* Icon container */}
              <View style={{
                width: 78, height: 78, borderRadius: 20,
                backgroundColor: '#EAF8EF', alignItems: 'center', justifyContent: 'center',
                marginBottom: 24, borderWidth: 1.5, borderColor: 'rgba(14,143,70,0.14)',
                ...SHADOWS.iconGlow,
              }}>
                <Ionicons name="shield-checkmark" size={36} color={COLORS.primary} />
              </View>

              {/* Urdu */}
              <Text style={{
                fontSize: 38, fontWeight: '700', color: '#0B2A18',
                textAlign: 'center', marginBottom: 4, writingDirection: 'rtl', lineHeight: 50,
              }}>
                آسانیات
              </Text>

              {/* English */}
              <Text style={{
                fontSize: 24, fontWeight: '900', color: COLORS.primary,
                textAlign: 'center', letterSpacing: 0.5, lineHeight: 30,
              }}>
                Asaaniyat
              </Text>

              {/* Divider */}
              <View style={{
                width: 50, height: 3, backgroundColor: COLORS.primary,
                borderRadius: 1.5, marginVertical: 20, opacity: 0.8,
              }} />

              {/* Status text */}
              <Text style={{
                fontSize: 11, fontWeight: '900', color: COLORS.primary,
                letterSpacing: 1.8, textTransform: 'uppercase', textAlign: 'center',
                marginBottom: 22, lineHeight: 16,
              }}>
                Securing your session
              </Text>

              {/* Loading indicator */}
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          </View>
        </View>
      );
    }

    if (!user) return <AuthScreen />;
    return (
      <ErrorBoundary>
        <AppContextProvider>
          <AppNavigator />
        </AppContextProvider>
      </ErrorBoundary>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AuthGate />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appShell: { flex: 1, backgroundColor: COLORS.bg },
  appShellDim: { backgroundColor: '#EAF8EF' },
  headerFrame: {
    height: Platform.OS === 'ios' ? 112 : 98,
    paddingTop: Platform.OS === 'ios' ? 48 : 34,
    backgroundColor: 'transparent',
  },
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
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
  authGate: { flex: 1, backgroundColor: COLORS.bg, padding: 24 },
  authGateTitle: { color: COLORS.primary, fontSize: 32, fontWeight: '900', letterSpacing: 1 },
  authGateSubtitle: { marginTop: 8, color: COLORS.textSecondary, fontSize: 15, fontWeight: '700' },
});
