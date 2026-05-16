import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
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
import Sidebar from './components/Sidebar';
import LiquidGlass from './components/LiquidGlass';
import { COLORS, RADII, SHADOWS } from './theme';
import { TabBarVisibilityContext, useTabBarVisibility } from './components/TabBarVisibility';

const Stack = createNativeStackNavigator();

const TAB_CONFIG = [
  { name: 'Home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'Bookings', label: 'Bookings', icon: 'calendar-clear-outline', activeIcon: 'calendar' },
  { name: 'Status', label: 'Status', icon: 'pulse-outline', activeIcon: 'pulse' },
  { name: 'Chat', label: 'Chat', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
];

const ROUTE_LABELS = {
  Home: 'Home', Bookings: 'Bookings', Status: 'Status', Chat: 'Chat', IntentConfirm: 'Confirm Request',
  ProviderResults: 'Providers', BookingConfirm: 'Confirm Booking', ReviewBooking: 'Review Booking', ProviderChat: 'Provider Chat',
  LocationPicker: 'Location', Confirmation: 'Confirmed', AgentTrace: 'Agent Trace', Loading: 'Matching',
};

const ACTIVE_BOOKING = {
  id: 'ASN-2407',
  service: 'AC repair',
  provider: 'GreenCool Services',
  eta: '12 min',
  stageIndex: 2,
  stages: ['Booked', 'Provider assigned', 'On the way', 'Work started', 'Completed'],
  address: 'DHA Phase 5, Karachi',
};

const COMPLETED_BOOKINGS = [
  { id: 'ASN-2320', service: 'Emergency plumbing', provider: 'AquaFix Pro', date: 'Yesterday', amount: 'Rs. 2,800', rating: '4.9' },
  { id: 'ASN-2291', service: 'Electrician', provider: 'BrightWire', date: 'Apr 28', amount: 'Rs. 1,600', rating: '5.0' },
  { id: 'ASN-2184', service: 'Carpenter', provider: 'CraftLine', date: 'Apr 12', amount: 'Rs. 3,200', rating: '4.8' },
];

function getCurrentRouteName(state) {
  if (!state?.routes?.length) return 'Splash';
  const route = state.routes[state.index ?? 0];
  if (route.state) return getCurrentRouteName(route.state);
  return route.name;
}

function ProgressRail({ booking }) {
  const progress = booking.stageIndex / (booking.stages.length - 1);
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
      <View style={styles.stageRow}>
        {booking.stages.map((stage, index) => {
          const done = index <= booking.stageIndex;
          return (
            <View key={stage} style={styles.stageItem}>
              <View style={[styles.stageDot, done && styles.stageDotDone]}><Ionicons name={done ? 'checkmark' : 'ellipse'} size={done ? 10 : 6} color={done ? '#FFFFFF' : COLORS.textMuted} /></View>
              <Text style={[styles.stageText, done && styles.stageTextDone]} numberOfLines={2}>{stage}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function BookingsScreen() {
  const { registerScroll } = useTabBarVisibility();
  return (
    <ScrollView style={styles.tabScreen} contentContainerStyle={styles.tabContent} onScroll={registerScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
      <Text style={styles.tabEyebrow}>Current booking</Text>
      <LiquidGlass style={styles.activeBookingCard} contentStyle={styles.cardPad} strong>
        <View style={styles.cardHeaderRow}>
          <View><Text style={styles.cardTitle}>{ACTIVE_BOOKING.service}</Text><Text style={styles.cardSub}>{ACTIVE_BOOKING.provider} · ETA {ACTIVE_BOOKING.eta}</Text></View>
          <View style={styles.liveChip}><Text style={styles.liveChipText}>LIVE</Text></View>
        </View>
        <ProgressRail booking={ACTIVE_BOOKING} />
      </LiquidGlass>

      <Text style={[styles.tabEyebrow, { marginTop: 24 }]}>Completed history</Text>
      {COMPLETED_BOOKINGS.map(item => (
        <LiquidGlass key={item.id} style={styles.historyCard} contentStyle={styles.historyContent}>
          <View style={styles.historyIcon}><Ionicons name="checkmark-done" size={18} color={COLORS.primary} /></View>
          <View style={styles.historyCopy}><Text style={styles.historyTitle}>{item.service}</Text><Text style={styles.historyMeta}>{item.provider} · {item.date}</Text></View>
          <View style={styles.historyRight}><Text style={styles.historyAmount}>{item.amount}</Text><Text style={styles.historyRating}>★ {item.rating}</Text></View>
        </LiquidGlass>
      ))}
    </ScrollView>
  );
}

function StatusScreen() {
  const { registerScroll } = useTabBarVisibility();
  return (
    <ScrollView style={styles.tabScreen} contentContainerStyle={styles.tabContent} onScroll={registerScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
      <LiquidGlass style={styles.statusHero} contentStyle={styles.cardPad} strong>
        <Text style={styles.tabEyebrow}>Active booking only</Text>
        <Text style={styles.statusTitle}>{ACTIVE_BOOKING.service} with {ACTIVE_BOOKING.provider}</Text>
        <Text style={styles.statusMeta}>{ACTIVE_BOOKING.id} · {ACTIVE_BOOKING.address}</Text>
        <ProgressRail booking={ACTIVE_BOOKING} />
      </LiquidGlass>
      <View style={styles.actionGrid}>
        {[['call-outline', 'Call provider'], ['close-circle-outline', 'Cancel booking'], ['navigate-outline', 'Share location'], ['receipt-outline', 'View summary']].map(([icon, label]) => (
          <TouchableOpacity key={label} style={styles.actionButton} activeOpacity={0.84}>
            <Ionicons name={icon} size={21} color={COLORS.primary} />
            <Text style={styles.actionText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function ChatScreen() {
  const { registerScroll } = useTabBarVisibility();
  const messages = [
    { role: 'assistant', text: 'Your provider is reviewing the job notes.', time: '10:41' },
    { role: 'user', text: 'Please ask them to bring a gas refill kit.', time: '10:42' },
    { role: 'assistant', text: 'Done — I added that to the active booking.', time: '10:42' },
  ];
  return (
    <View style={styles.chatTabScreen}>
      <ScrollView contentContainerStyle={styles.chatContent} onScroll={registerScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
        {messages.map((message, index) => <ChatBubble key={index} message={message} />)}
        <View style={styles.typingBubble}><View style={styles.typingDot} /><View style={styles.typingDot} /><View style={styles.typingDot} /></View>
      </ScrollView>
      <LiquidGlass style={styles.chatComposer} contentStyle={styles.chatComposerInner} strong radius={RADII.xl}>
        <Text style={styles.composerPlaceholder}>Message Asaaniyat agent...</Text>
        <View style={styles.composerSend}><Ionicons name="arrow-up" size={17} color="#FFFFFF" /></View>
      </LiquidGlass>
    </View>
  );
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <Animated.View style={[styles.chatBubble, isUser ? styles.userChatBubble : styles.agentChatBubble]}>
      <Text style={[styles.chatText, isUser && styles.userChatText]}>{message.text}</Text>
      <Text style={[styles.chatTime, isUser && styles.userChatTime]}>{message.time}</Text>
    </Animated.View>
  );
}

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
    Animated.spring(translateY, { toValue: visible ? 0 : 112, useNativeDriver: true, damping: 18, stiffness: 180 }).start();
  }, [translateY, visible]);

  if (currentRouteName === 'Splash') return null;

  return (
    <Animated.View style={[styles.tabBarWrap, { paddingBottom: Math.max(insets.bottom, 10), transform: [{ translateY }] }]} pointerEvents="box-none">
      <Pressable onPress={showTabBar}>
        <LiquidGlass style={styles.tabBar} contentStyle={styles.tabBarInner} strong radius={30}>
          {TAB_CONFIG.map(tab => {
            const active = activeTab === tab.name;
            return (
              <TouchableOpacity key={tab.name} style={[styles.tabButton, active && styles.tabButtonActive]} onPress={() => navigationRef.current?.navigate(tab.name)} activeOpacity={0.84}>
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
  const navigationRef = useRef(null);
  const [currentRouteName, setCurrentRouteName] = useState('Splash');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const idleTimer = useRef(null);
  const lastOffset = useRef(0);

  const hideTabBar = useCallback(() => setTabVisible(false), []);
  const showTabBar = useCallback(() => {
    setTabVisible(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setTabVisible(false), 3200);
  }, []);
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
                    onProfilePress={() => setSidebarVisible(true)}
                  />
                </View>
              ),
              contentStyle: { backgroundColor: COLORS.bg },
              animation: 'slide_from_right',
            })}
          >
            <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Bookings" component={BookingsScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Status" component={StatusScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ animation: 'fade' }} />
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
        <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} darkMode={darkMode} onToggleTheme={setDarkMode} onNavigateTrace={() => navigationRef.current?.navigate('AgentTrace')} />
      </Pressable>
    </TabBarVisibilityContext.Provider>
  );
}

export default function App() {
  return <SafeAreaProvider><AppNavigator /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  appShell: { flex: 1, backgroundColor: COLORS.bg },
  appShellDim: { backgroundColor: '#EAF8EF' },
  headerFrame: { height: Platform.OS === 'ios' ? 112 : 98, paddingTop: Platform.OS === 'ios' ? 48 : 34, backgroundColor: 'transparent' },
  tabScreen: { flex: 1, backgroundColor: COLORS.bg },
  tabContent: { paddingTop: 132, paddingHorizontal: 18, paddingBottom: 128 },
  tabEyebrow: { color: COLORS.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  activeBookingCard: { marginBottom: 4 },
  cardPad: { padding: 18 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '900' },
  cardSub: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700', marginTop: 4 },
  liveChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.borderStrong },
  liveChipText: { color: COLORS.primary, fontSize: 10, fontWeight: '900' },
  progressWrap: { marginTop: 18 },
  progressTrack: { height: 8, borderRadius: 6, backgroundColor: 'rgba(14,143,70,0.12)', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 6, backgroundColor: COLORS.accent },
  stageRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 5 },
  stageItem: { flex: 1, alignItems: 'center' },
  stageDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border },
  stageDotDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stageText: { color: COLORS.textMuted, textAlign: 'center', fontSize: 9, fontWeight: '800', marginTop: 5, lineHeight: 12 },
  stageTextDone: { color: COLORS.textPrimary },
  historyCard: { marginBottom: 12 },
  historyContent: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft },
  historyCopy: { flex: 1 },
  historyTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '900' },
  historyMeta: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  historyRight: { alignItems: 'flex-end' },
  historyAmount: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '900' },
  historyRating: { color: COLORS.warning, fontSize: 11, fontWeight: '900', marginTop: 3 },
  statusHero: { marginBottom: 16 },
  statusTitle: { color: COLORS.textPrimary, fontSize: 25, lineHeight: 31, fontWeight: '900' },
  statusMeta: { color: COLORS.textSecondary, marginTop: 8, fontSize: 13, fontWeight: '700' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionButton: { width: '48%', minHeight: 96, borderRadius: 24, padding: 15, justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.92)', ...SHADOWS.card },
  actionText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '900' },
  chatTabScreen: { flex: 1, backgroundColor: COLORS.bg },
  chatContent: { paddingTop: 132, paddingHorizontal: 16, paddingBottom: 132, gap: 10 },
  chatBubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22 },
  agentChatBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.86)', borderTopLeftRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)' },
  userChatBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderTopRightRadius: 8 },
  chatText: { color: COLORS.textPrimary, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  userChatText: { color: '#FFFFFF' },
  chatTime: { alignSelf: 'flex-end', marginTop: 4, color: COLORS.textMuted, fontSize: 10, fontWeight: '800' },
  userChatTime: { color: 'rgba(255,255,255,0.72)' },
  typingBubble: { alignSelf: 'flex-start', flexDirection: 'row', gap: 5, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20, borderTopLeftRadius: 8, backgroundColor: 'rgba(255,255,255,0.86)' },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textMuted },
  chatComposer: { position: 'absolute', left: 16, right: 16, bottom: 98 },
  chatComposerInner: { minHeight: 56, paddingLeft: 18, paddingRight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  composerPlaceholder: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  composerSend: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  tabBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  tabBar: { height: 74 },
  tabBarInner: { flex: 1, padding: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tabButton: { flex: 1, height: 56, borderRadius: 23, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabButtonActive: { backgroundColor: COLORS.primary, ...SHADOWS.card },
  tabLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '900' },
  tabLabelActive: { color: '#FFFFFF' },
});
