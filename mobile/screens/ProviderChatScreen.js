import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { COLORS, RADII } from '../theme';
import LiquidGlass from '../components/LiquidGlass';
import { useTabBarVisibility } from '../components/TabBarVisibility';
import apiClient from '../lib/apiClient';

function stamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ message }) {
  const anim = useRef(new Animated.Value(0)).current;
  const isUser = message.role === 'user';

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 180 }).start();
  }, [anim]);

  return (
    <Animated.View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      <Text style={[styles.message, isUser && styles.userText]}>{message.content}</Text>
      <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>{message.created_at || message.time || stamp()}</Text>
    </Animated.View>
  );
}

function TypingIndicator() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 520, useNativeDriver: true }),
    ])).start();
  }, [pulse]);
  return (
    <View style={styles.typingBubble}>
      {[0, 1, 2].map(i => <Animated.View key={i} style={[styles.typingDot, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35 + i * 0.1, 1 - i * 0.12] }) }]} />)}
    </View>
  );
}

export default function ProviderChatScreen({ route }) {
  const { fullResult = {} } = route.params || {};
  const provider = fullResult.provider || {};
  const bookingId = fullResult.booking_id || 'general';
  const scrollRef = useRef(null);
  const { registerScroll } = useTabBarVisibility();
  const [bookingStatus, setBookingStatus] = useState(null);
  const [bookingStateLoading, setBookingStateLoading] = useState(true);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hello! I can coordinate with ${provider.name || 'your provider'} and summarize what needs to happen next.`, time: stamp() },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const cancelledMessage = 'The order is cancelled by you so I cant help further more! Sorry';

  useEffect(() => {
    let mounted = true;
    async function loadBookingState() {
      try {
        const res = await apiClient.get(`/bookings/${bookingId}`);
        const status = String(res.data?.booking?.status || '').toLowerCase();
        if (!mounted) return;
        setBookingStatus(status || null);
        if (status === 'canceled') {
          setMessages([
            { role: 'assistant', content: cancelledMessage, time: stamp() },
          ]);
        }
      } catch (error) {
        // Keep chat usable if booking state cannot be fetched
      } finally {
        if (mounted) setBookingStateLoading(false);
      }
    }

    loadBookingState();
    return () => { mounted = false; };
  }, [bookingId]);

  useEffect(() => {
    apiClient.get(`/chat/${bookingId}`).then(res => {
      if (res.data?.messages?.length) setMessages(res.data.messages.map(m => ({ ...m, time: m.created_at || stamp() })));
    }).catch(() => {});
  }, [bookingId]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }, [messages, sending]);

  const send = async () => {
    if (!input.trim() || sending) return;
    if (bookingStatus === 'canceled') {
      setMessages(prev => [...prev, { role: 'assistant', content: cancelledMessage, time: stamp() }]);
      return;
    }
    const content = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content, time: stamp() }]);
    setSending(true);
    try {
      const res = await apiClient.post('/chat/message', { booking_id: bookingId, message: content, provider }, { timeout: 20000 });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply || 'I will coordinate this for you.', time: stamp() }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I could not reach the chat agent right now, but your booking is still confirmed.', time: stamp() }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LiquidGlass style={styles.providerPanel} contentStyle={styles.providerPanelInner} strong radius={RADII.xl}>
          <View style={styles.avatar}><Ionicons name="person" size={18} color="#FFFFFF" /></View>
          <View style={styles.providerCopy}>
            <Text style={styles.name}>{provider.name || 'Provider Chat'}</Text>
            <Text style={styles.online}>
              {bookingStateLoading ? 'Checking booking status…' : bookingStatus === 'canceled' ? 'Booking cancelled' : 'Online · Asaaniyat relay active'}
            </Text>
          </View>
        </LiquidGlass>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.messages} onScroll={registerScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
          {messages.map((m, i) => <MessageBubble key={`${m.created_at || m.time || i}-${i}`} message={m} />)}
          {sending ? <TypingIndicator /> : null}
        </ScrollView>
        <LiquidGlass style={styles.composer} contentStyle={styles.composerInner} strong radius={RADII.xl}>
          <TextInput
            style={styles.input}
            placeholder={bookingStatus === 'canceled' ? 'Chat disabled for cancelled booking' : 'iMessage your provider relay...'}
            placeholderTextColor={COLORS.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            editable={bookingStatus !== 'canceled'}
          />
          <TouchableOpacity style={[styles.send, (!input.trim() || sending || bookingStatus === 'canceled') && styles.sendDisabled]} onPress={send} disabled={!input.trim() || sending || bookingStatus === 'canceled'} activeOpacity={0.84}>
            <Ionicons name="arrow-up" size={19} color="#FFFFFF" />
          </TouchableOpacity>
        </LiquidGlass>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.bg },
  providerPanel: { marginTop: 118, marginHorizontal: 16 },
  providerPanelInner: { minHeight: 68, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  providerCopy: { flex: 1 },
  name: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '900' },
  online: { color: COLORS.primary, fontSize: 11, fontWeight: '900', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.7 },
  messages: { padding: 16, paddingTop: 18, paddingBottom: 110, gap: 10 },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22 },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.90)', borderTopLeftRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.96)' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderTopRightRadius: 8 },
  message: { color: COLORS.textPrimary, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  userText: { color: '#FFFFFF' },
  timestamp: { alignSelf: 'flex-end', marginTop: 4, color: COLORS.textMuted, fontSize: 10, fontWeight: '800' },
  userTimestamp: { color: 'rgba(255,255,255,0.72)' },
  typingBubble: { alignSelf: 'flex-start', flexDirection: 'row', gap: 5, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20, borderTopLeftRadius: 8, backgroundColor: 'rgba(255,255,255,0.90)' },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textMuted },
  composer: { position: 'absolute', left: 14, right: 14, bottom: 96 },
  composerInner: { minHeight: 58, paddingLeft: 16, paddingRight: 8, paddingVertical: 8, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input: { flex: 1, maxHeight: 100, color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', paddingVertical: 10 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.42 },
});
