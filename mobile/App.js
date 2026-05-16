import React, { useMemo, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
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
import AppHeader from './components/AppHeader';
import { COLORS } from './config';

const Stack = createNativeStackNavigator();

const TAB_CONFIG = [
  { name: 'Home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'Bookings', label: 'Bookings', icon: 'calendar-clear-outline', activeIcon: 'calendar' },
  { name: 'Status', label: 'Status', icon: 'pulse-outline', activeIcon: 'pulse' },
  { name: 'Chat', label: 'Chat', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
];

const ROUTE_LABELS = {
  Home: 'Home',
  Bookings: 'Bookings',
  Status: 'Status',
  Chat: 'Chat',
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

function PlaceholderTabScreen({ kind }) {
  const copy = {
    Bookings: {
      icon: 'calendar-clear-outline',
      title: 'Bookings command center',
      body: 'Your confirmed and upcoming Asaaniyat jobs will live here once bookings are created.',
    },
    Status: {
      icon: 'radio-outline',
      title: 'Live status timeline',
      body: 'Track provider matching, ETA, verification, and follow-up signals from one liquid-glass dashboard.',
    },
    Chat: {
      icon: 'chatbubble-ellipses-outline',
      title: 'Service chat hub',
      body: 'Provider conversations and assistant summaries will appear here after a booking is confirmed.',
    },
  }[kind];

  return (
    <View style={styles.placeholderScreen}>
      <View style={styles.placeholderCard}>
        <Ionicons name={copy.icon} size={34} color="#9EF7C2" />
        <Text style={styles.placeholderTitle}>{copy.title}</Text>
        <Text style={styles.placeholderBody}>{copy.body}</Text>
      </View>
    </View>
  );
}

function LiquidTabBar({ navigationRef, currentRouteName }) {
  const insets = useSafeAreaInsets();
  const activeTab = useMemo(() => {
    if (['Home', 'Bookings', 'Status', 'Chat'].includes(currentRouteName)) return currentRouteName;
    if (['ProviderChat'].includes(currentRouteName)) return 'Chat';
    if (['Confirmation', 'ReviewBooking', 'BookingConfirm'].includes(currentRouteName)) return 'Bookings';
    if (['Loading', 'IntentConfirm', 'ProviderResults', 'AgentTrace'].includes(currentRouteName)) return 'Status';
    return 'Home';
  }, [currentRouteName]);

  if (currentRouteName === 'Splash') return null;

  return (
    <View style={[styles.tabBarWrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={styles.tabBar}>
        {TAB_CONFIG.map(tab => {
          const active = activeTab === tab.name;
          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.tabButton, active && styles.tabButtonActive]}
              onPress={() => navigationRef.current?.navigate(tab.name)}
              activeOpacity={0.82}
            >
              <Ionicons name={active ? tab.activeIcon : tab.icon} size={20} color={active ? '#05140C' : 'rgba(248,250,252,0.72)'} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function AppNavigator() {
  const navigationRef = useRef(null);
  const [currentRouteName, setCurrentRouteName] = useState('Splash');

  return (
    <View style={styles.appShell}>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => setCurrentRouteName(getCurrentRouteName(navigationRef.current?.getRootState()))}
        onStateChange={state => setCurrentRouteName(getCurrentRouteName(state))}
      >
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={({ navigation, route }) => ({
            headerTransparent: true,
            headerShadowVisible: false,
            headerBackVisible: false,
            header: ({ back }) => (
              <View style={styles.headerFrame} pointerEvents="box-none">
                <AppHeader
                  navigation={navigation}
                  routeName={ROUTE_LABELS[route.name] || route.name}
                  canGoBack={!!back && !['Home', 'Bookings', 'Status', 'Chat', 'Loading'].includes(route.name)}
                />
              </View>
            ),
            contentStyle: { backgroundColor: COLORS.bg },
            animation: 'slide_from_right',
          })}
        >
          <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Bookings" options={{ animation: 'fade' }}>{props => <PlaceholderTabScreen {...props} kind="Bookings" />}</Stack.Screen>
          <Stack.Screen name="Status" options={{ animation: 'fade' }}>{props => <PlaceholderTabScreen {...props} kind="Status" />}</Stack.Screen>
          <Stack.Screen name="Chat" options={{ animation: 'fade' }}>{props => <PlaceholderTabScreen {...props} kind="Chat" />}</Stack.Screen>
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
      <LiquidTabBar navigationRef={navigationRef} currentRouteName={currentRouteName} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: '#07111F',
  },
  headerFrame: {
    height: Platform.OS === 'ios' ? 112 : 98,
    paddingTop: Platform.OS === 'ios' ? 48 : 34,
    backgroundColor: 'transparent',
  },
  placeholderScreen: {
    flex: 1,
    paddingTop: 132,
    paddingHorizontal: 20,
    paddingBottom: 116,
    backgroundColor: '#07111F',
    justifyContent: 'center',
  },
  placeholderCard: {
    borderRadius: 28,
    padding: 24,
    minHeight: 230,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 8,
  },
  placeholderTitle: {
    marginTop: 16,
    color: '#F8FAFC',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  placeholderBody: {
    marginTop: 10,
    color: 'rgba(226,232,240,0.74)',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
  },
  tabBar: {
    height: 72,
    borderRadius: 30,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(9, 22, 35, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.34,
    shadowRadius: 26,
    elevation: 14,
  },
  tabButton: {
    flex: 1,
    height: 56,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(158, 247, 194, 0.92)',
  },
  tabLabel: {
    color: 'rgba(248,250,252,0.68)',
    fontSize: 10,
    fontWeight: '800',
  },
  tabLabelActive: {
    color: '#05140C',
  },
});
