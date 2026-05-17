import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
import BookingsScreen from './screens/BookingsScreen';
import StatusScreen from './screens/StatusScreen';
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
  { name: 'Home',     label: 'Home',     icon: 'home-outline',                 activeIcon: 'home' },
  { name: 'Bookings', label: 'Bookings', icon: 'calendar-clear-outline',       activeIcon: 'calendar' },
  { name: 'Status',   label: 'Status',   icon: 'pulse-outline',                activeIcon: 'pulse' },
  { name: 'Chat',     label: 'Chat',     icon: 'chatbubble-ellipses-outline',  activeIcon: 'chatbubble-ellipses' },
];

const ROUTE_LABELS = {
  Home: 'Home', Bookings: 'Bookings', Status: 'Status', Chat: 'Chat',
  IntentConfirm: 'Confirm Request', ProviderResults: 'Providers',
  BookingConfirm: 'Confirm Booking', ReviewBooking: 'Review Booking',
  ProviderChat: 'Provider Chat', LocationPicker: 'Location',
  Confirmation: 'Confirmed', AgentTrace: 'Agent Trace', Loading: 'Matching',
};

function getCurrentRouteName(state) {
  if (!state?.routes?.length) return 'Home';
  const route = state.routes[state.index ?? 0];
  if (route.state) return getCurrentRouteName(route.state);
  return route.name;
}

// ── 14.1: Root-level SplashGate — always renders splash first ────────────────
function SplashGate({ children }) {
  const [isBooting, setIsBooting] = useState(true);
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(fadeOut, { toValue: 0, duration: 320, useNativeDriver: true }).start(() => {
        setIsBooting(false);
      });
    }, 2500);
    return () => clearTimeout(t);
  }, [fadeOut]);

  if (isBooting) {
    return (
      <Animated.View style={[StyleSheet.absoluteFill, styles.splashGate, { opacity: fadeOut }]}>
        <SplashScreen />
      </Animated.View>
    );
  }
  return children;
}

// ── Tab bar ────────────────────────────────────────────────────────────────────
function LiquidTabBar({ navigationRef, currentRouteName, visible, showTabBar }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;

  const activeTab = useMemo(() => {
    if (['Home', 'Bookings', 'Status', 'Chat'].includes(currentRouteName)) return currentRouteName;
    if (currentRouteName === 'ProviderChat') return 'Chat';
    if (['Confirmation', 'ReviewBooking', 'BookingConfirm'].includes(currentRouteName)) return 'Bookings';
    if (['Loading', 'IntentConfirm', 'ProviderResults', 'AgentTrace'].includes(currentRouteName)) return 'Status';
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

// ── Main navigator (only rendered when user is authenticated) ─────────────────
function AppNavigator() {
  const { user, logout } = useAuth();
  const navigationRef = useRef(null);
  const [currentRouteName, setCurrentRouteName] = useState('Home');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const idleTimer = useRef(null);
  const lastOffset = useRef(0);

  // 14.4: Header animated value (top bar)
  const headerY = useRef(new Animated.Value(0)).current;
  // 14.4: Tab bar visibility uses existing spring logic via tabVisible state

  useEffect(() => { void configureNotifications(); }, []);

  const hideTabBar = useCallback(() => {
    setTabVisible(false);
    // 14.4: Also slide header up
    Animated.timing(headerY, { toValue: -(Platform.OS === 'ios' ? 120 : 100), duration: 250, useNativeDriver: true }).start();
  }, [headerY]);

  const showTabBar = useCallback(() => {
    setTabVisible(true);
    // 14.4: Spring header back in
    Animated.spring(headerY, { toValue: 0, friction: 6, useNativeDriver: true }).start();
    if (idleTimer.current) clearTimeout(idleTimer.current);
    // 14.4: Three-second idle auto-hide
    idleTimer.current = setTimeout(() => {
      setTabVisible(false);
      Animated.timing(headerY, { toValue: -(Platform.OS === 'ios' ? 120 : 100), duration: 400, useNativeDriver: true }).start();
    }, 3200);
  }, [headerY]);

  const registerScroll = useCallback((event) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y > lastOffset.current + 8 && y > 24) hideTabBar();
    if (y < lastOffset.current - 8) showTabBar();
    lastOffset.current = y;
  }, [hideTabBar, showTabBar]);

  useEffect(() => {
    if (currentRouteName !== 'Splash') showTabBar();
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
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
                // 14.4: Wrap header in animated view so it slides up/down
                <Animated.View style={[styles.headerFrame, { transform: [{ translateY: headerY }] }]} pointerEvents="box-none">
                  <AppHeader
                    navigation={navigation}
                    routeName={ROUTE_LABELS[route.name] || route.name}
                    canGoBack={!!back && !['Home', 'Bookings', 'Status', 'Chat', 'Loading'].includes(route.name)}
                    onProfilePress={() => setSidebarVisible(true)}
                  />
                </Animated.View>
              ),
              contentStyle: { backgroundColor: COLORS.bg },
              animation: 'slide_from_right',
            })}
          >
            <Stack.Screen name="Home"           component={HomeScreen}           options={{ animation: 'fade' }} />
            <Stack.Screen name="Bookings"        component={BookingsScreen}       options={{ animation: 'fade' }} />
            <Stack.Screen name="Status"          component={StatusScreen}         options={{ animation: 'fade' }} />
            <Stack.Screen name="Chat"            component={ChatScreen}           options={{ animation: 'fade' }} />
            <Stack.Screen name="IntentConfirm"   component={IntentConfirmScreen} />
            <Stack.Screen name="Loading"         component={LoadingScreen}        options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="ProviderResults" component={ProviderResultsScreen} />
            <Stack.Screen name="BookingConfirm"  component={BookingConfirmScreen} />
            <Stack.Screen name="ReviewBooking"   component={ReviewBookingScreen} />
            <Stack.Screen name="ProviderChat"    component={ProviderChatScreen} />
            <Stack.Screen name="LocationPicker"  component={LocationPickerScreen} />
            <Stack.Screen name="Confirmation"    component={ConfirmationScreen}   options={{ gestureEnabled: false }} />
            <Stack.Screen name="AgentTrace"      component={AgentTraceScreen} />
          </Stack.Navigator>
        </NavigationContainer>

        <LiquidTabBar
          navigationRef={navigationRef}
          currentRouteName={currentRouteName}
          visible={tabVisible}
          showTabBar={showTabBar}
        />
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

// ── Auth gate (no splash logic here anymore — handled by SplashGate above) ────
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

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        {/* 14.1: SplashGate always renders for 2.5s before revealing AuthGate */}
        <SplashGate>
          <AuthGate />
        </SplashGate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // 14.1: Splash gate overlay fills the whole screen
  splashGate: { zIndex: 999, backgroundColor: COLORS.bg },

  appShell:    { flex: 1, backgroundColor: COLORS.bg },
  appShellDim: { backgroundColor: '#EAF8EF' },

  headerFrame: {
    height: Platform.OS === 'ios' ? 112 : 98,
    paddingTop: Platform.OS === 'ios' ? 48 : 34,
    backgroundColor: 'transparent',
  },

  tabBarWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14,
  },
  tabBar:      { height: 74 },
  tabBarInner: { flex: 1, padding: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tabButton:   { flex: 1, height: 56, borderRadius: 23, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabButtonActive: { backgroundColor: COLORS.primary },
  tabLabel:        { color: COLORS.textSecondary, fontSize: 10, fontWeight: '900' },
  tabLabelActive:  { color: '#FFFFFF' },

  authGate:         { flex: 1, backgroundColor: COLORS.bg, padding: 24 },
  authGateTitle:    { color: COLORS.primary, fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  authGateSubtitle: { marginTop: 8, color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
});