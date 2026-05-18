import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { COLORS } from './theme';
import { TabBarVisibilityContext } from './components/TabBarVisibility';
import { configureNotifications } from './notifications';
import { AppContextProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';

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

function LiquidTabBar({ navigationRef, currentRouteName, translateY, showTabBar }) {
  const insets = useSafeAreaInsets();
  const activeTab = useMemo(() => {
    if (['Home', 'Bookings', 'Chat'].includes(currentRouteName)) return currentRouteName;
    if (currentRouteName === 'ProviderChat') return 'Chat';
    if (['Confirmation', 'ReviewBooking', 'BookingConfirm', 'OrderStatus'].includes(currentRouteName)) return 'Bookings';
    if (['Loading', 'IntentConfirm', 'ProviderResults', 'AgentTrace'].includes(currentRouteName)) return 'Home';
    return 'Home';
  }, [currentRouteName]);


  if (currentRouteName === 'Splash') return null;

  return (
    <Animated.View
      style={[styles.tabBarWrap, { paddingBottom: Math.max(insets.bottom, 10), transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      <Pressable onPress={showTabBar}>
        <LiquidGlass style={styles.tabBar} contentStyle={styles.tabBarInner} strong radius={30}>
          {TAB_CONFIG.map(tab => {
            const active = activeTab === tab.name;
            return (
              <TouchableOpacity
                key={tab.name}
                style={[styles.tabButton, active && styles.tabButtonActive]}
                onPress={() => navigationRef.current?.navigate(tab.name)}
                activeOpacity={0.84}
              >
                <Ionicons name={active ? tab.activeIcon : tab.icon} size={20} color={active ? '#FFFFFF' : COLORS.textSecondary} />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </LiquidGlass>
      </Pressable>
    </Animated.View>
  );
}

function AppNavigator() {
  const { user, logout } = useAuth();
  const navigationRef = useRef(null);
  const [currentRouteName, setCurrentRouteName] = useState('Home');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const headerY = useRef(new Animated.Value(0)).current;
  const tabBarY = useRef(new Animated.Value(0)).current;
  const idleTimer = useRef(null);
  const lastOffset = useRef(0);

  useEffect(() => {
    void configureNotifications();
  }, []);

  const animateChrome = useCallback((visible) => {
    Animated.parallel([
      Animated.spring(headerY, {
        toValue: visible ? 0 : -100,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
      }),
      Animated.spring(tabBarY, {
        toValue: visible ? 0 : 120,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
      }),
    ]).start();
  }, [headerY, tabBarY]);

  const hideTabBar = useCallback(() => {
    animateChrome(false);
  }, [animateChrome]);

  const showTabBar = useCallback(() => {
    animateChrome(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => animateChrome(false), 3000);
  }, [animateChrome]);

  const registerScroll = useCallback((event) => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    const y = event.nativeEvent.contentOffset.y;
    if (y > lastOffset.current + 8 && y > 24) {
      animateChrome(false);
    }
    if (y < lastOffset.current - 8) {
      showTabBar();
    }
    lastOffset.current = y;
  }, [animateChrome, showTabBar]);

  useEffect(() => {
    if (currentRouteName !== 'Splash') showTabBar();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [currentRouteName, showTabBar]);

  const contextValue = useMemo(() => ({ showTabBar, hideTabBar, registerScroll }), [showTabBar, hideTabBar, registerScroll]);

  return (
    <TabBarVisibilityContext.Provider value={contextValue}>
      <Pressable style={[styles.appShell, darkMode && styles.appShellDim]} onPress={showTabBar}>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => setCurrentRouteName(getCurrentRouteName(navigationRef.current?.getRootState()))}
          onStateChange={state => setCurrentRouteName(getCurrentRouteName(state))}
        >
          <StatusBar style="dark" />
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={({ navigation, route }) => ({
              headerTransparent: true,
              headerShadowVisible: false,
              headerBackVisible: false,
              header: ({ back }) => (
                <Animated.View style={[styles.headerFrame, { transform: [{ translateY: headerY }] }]} pointerEvents="box-none">
                  <AppHeader
                    navigation={navigation}
                    routeName={ROUTE_LABELS[route.name] || route.name}
                    canGoBack={!!back && !['Home', 'Bookings', 'Chat', 'Loading'].includes(route.name)}
                    onProfilePress={() => setSidebarVisible(true)}
                  />
                </Animated.View>
              ),
              contentStyle: { backgroundColor: COLORS.bg },
              animation: 'slide_from_right',
            })}
          >
            <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'fade' }} />
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
        <LiquidTabBar navigationRef={navigationRef} currentRouteName={currentRouteName} translateY={tabBarY} showTabBar={showTabBar} />
        <Sidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          darkMode={darkMode}
          onToggleTheme={setDarkMode}
          onNavigateTrace={() => navigationRef.current?.navigate('AgentTrace')}
          currentUser={user}
          onLogout={logout}
        />
      </Pressable>
    </TabBarVisibilityContext.Provider>
  );
}

function SplashGate() {
  return (
    <View style={styles.splashGate} pointerEvents="auto">
      <View style={styles.splashOrbLarge} />
      <View style={styles.splashOrbSmall} />
      <View style={styles.splashLogoBackdrop}>
        <View style={styles.splashLogo}>
          <Ionicons name="flash" size={42} color="#FFFFFF" />
        </View>
        <Text style={styles.splashBrand}>Asaaniyat</Text>
        <Text style={styles.splashSubtitle}>Home help, beautifully simple</Text>
      </View>
    </View>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start(() => setShowSplash(false));
    }, 2500);
    return () => clearTimeout(timer);
  }, [splashOpacity]);

  function AuthGate() {
    const { isLoading, user } = useAuth();

    if (isLoading) {
      return (
        <View style={[styles.authGate, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={styles.authGateTitle}>Asaaniyat</Text>
          <Text style={styles.authGateSubtitle}>Checking secure session…</Text>
        </View>
      );
    }

    if (!user) return <AuthScreen />;
    return (
      <AppContextProvider>
        <AppNavigator />
      </AppContextProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
        {showSplash ? (
          <Animated.View style={[StyleSheet.absoluteFill, styles.splashOverlay, { opacity: splashOpacity }]}>
            <SplashGate />
          </Animated.View>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
    paddingHorizontal: 14,
  },
  tabBar: { height: 74 },
  tabBarInner: {
    flex: 1,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    height: 56,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabButtonActive: { backgroundColor: COLORS.primary },
  tabLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '900' },
  tabLabelActive: { color: '#FFFFFF' },
  authGate: { flex: 1, backgroundColor: COLORS.bg, padding: 24 },
  authGateTitle: { color: COLORS.primary, fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  authGateSubtitle: { marginTop: 8, color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  splashOverlay: { zIndex: 9999, elevation: 9999 },
  splashGate: {
    flex: 1,
    backgroundColor: 'rgba(238, 245, 241, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  splashOrbLarge: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(14, 143, 70, 0.12)',
    top: '18%',
    right: -70,
  },
  splashOrbSmall: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    bottom: '16%',
    left: -42,
  },
  splashLogoBackdrop: {
    minWidth: 210,
    borderRadius: 34,
    paddingVertical: 28,
    paddingHorizontal: 30,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#0E8F46',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  splashLogo: {
    width: 86,
    height: 86,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  splashBrand: { color: '#10251A', fontSize: 28, fontWeight: '900', letterSpacing: 1.5 },
  splashSubtitle: { marginTop: 6, color: '#51645A', fontSize: 12, fontWeight: '800' },
});
