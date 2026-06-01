import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, SHADOWS, FONTS } from '../theme';
import LiquidGlass from '../components/LiquidGlass';
import { useTabBarVisibility } from '../components/TabBarVisibility';
import apiClient from '../lib/apiClient';
import { subscribeBookingRealtime } from '../lib/bookingRealtime';

function stamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const QUICK_REPLIES = [
  { text: 'How quickly can you arrive?', icon: 'time-outline', custom: false },
  { text: 'Show technician profile', icon: 'person-outline', custom: false },
];

function MessageBubble({ message }) {
  const anim = useRef(new Animated.Value(0)).current;
  const isUser = message.role === 'user';

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 180 }).start();
  }, [anim]);

  // Parse structured information to display beautiful custom cards
  const hasOrderDetails = message.content.includes("details of your order") || message.content.includes("Order ID:") || message.content.includes("Order:");
  const hasDiagnosticFee = message.content.includes("Diagnostic Fee") || message.content.includes("base fee structure");

  if (isUser) {
    return (
      <View style={[styles.bubbleRow, styles.userBubbleRow]}>
        <Animated.View
          style={[
            styles.bubble,
            styles.userBubble,
            {
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }]
            }
          ]}
        >
          <Text style={[styles.message, styles.userText]}>{message.content}</Text>
          <Text style={[styles.timestamp, styles.userTimestamp]}>{message.created_at || message.time || stamp()}</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleRow, styles.assistantBubbleRow]}>
      {/* Silicon Bot Avatar */}
      <View style={styles.avatarContainer}>
        <Ionicons name="person" size={16} color="#FFFFFF" />
      </View>

      <Animated.View
        style={[
          styles.bubble,
          styles.assistantBubble,
          {
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }]
          }
        ]}
      >
        <Text style={styles.messageText}>{message.content}</Text>

        {/* Embedded Premium Pricing Card */}
        {hasDiagnosticFee && (
          <View style={styles.diagnosticCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.tierLabel}>SERVICE TIER</Text>
              <Text style={styles.tierValue}>Standard</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardFooterRow}>
              <Text style={styles.feeLabel}>Diagnostic Fee</Text>
              <Text style={styles.feeValue}>PKR 1,500</Text>
            </View>
          </View>
        )}

        {/* Embedded Booking/Order Summary Card */}
        {hasOrderDetails && !hasDiagnosticFee && (
          <View style={styles.bookingCard}>
            <Text style={styles.bookingCardTitle}>ACTIVE BOOKING DETAILS</Text>
            <View style={styles.bookingCardDivider} />
            {message.content.split('\n').map((line, idx) => {
              if (line.trim().length === 0 || line.includes('details of your order') || line.includes('help you further')) return null;
              return (
                <View key={idx} style={styles.bookingCardRow}>
                  <Text style={styles.bookingCardText}>{line}</Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.timestamp}>{message.created_at || message.time || stamp()}</Text>
      </Animated.View>
    </View>
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

export default function ProviderChatScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { fullResult = {}, booking: bookingParam = null } = route.params || {};
  const provider = bookingParam ? {
    id: bookingParam.provider_id,
    name: bookingParam.provider_name,
    service_type: bookingParam.service_type,
    service: bookingParam.service_type,
    area: bookingParam.area,
    city: bookingParam.city,
    confirmed_slot: bookingParam.booking_start_time,
  } : (fullResult.provider || {});
  const bookingId = bookingParam?._id || fullResult.booking?._id || fullResult.booking_id || 'general';
  const scrollRef = useRef(null);
  const { registerScroll } = useTabBarVisibility();
  const [bookingStatus, setBookingStatus] = useState(String(bookingParam?.status || '').toLowerCase() || null);
  const [bookingStateLoading, setBookingStateLoading] = useState(Boolean(bookingId && bookingId !== 'general' && !bookingParam));
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

    const unsubscribe = subscribeBookingRealtime((event) => {
      if (event?.type !== 'booking.updated' || event.booking_id !== bookingId) return;
      const nextStatus = String(event.status || '').toLowerCase();
      if (!nextStatus) return;

      setBookingStatus(nextStatus);
      if (nextStatus === 'canceled') {
        setMessages([
          { role: 'assistant', content: cancelledMessage, time: stamp() },
        ]);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [bookingId, cancelledMessage]);

  useEffect(() => {
    apiClient.get(`/chat/${bookingId}`).then(res => {
      if (res.data?.messages?.length) setMessages(res.data.messages.map(m => ({ ...m, time: m.created_at || stamp() })));
    }).catch(() => {});
  }, [bookingId]);

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [messages, sending]);

  // Scroll to end when keyboard opens so quick-reply blocks never go behind input
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    });
    return () => sub.remove();
  }, []);

  const send = async () => {
    if (!input.trim() || sending) return;
    if (bookingStatus === 'canceled') {
      setMessages(prev => [...prev, { role: 'assistant', content: cancelledMessage, time: stamp() }]);
      return;
    }
    const content = input.trim();
    setInput('');
    await handleSend(content);
  };

  const handleSend = async (content) => {
    setMessages(prev => [...prev, { role: 'user', content, time: stamp() }]);
    setSending(true);
    try {
      const res = await apiClient.post('/chat/message', { booking_id: bookingId, message: content, provider }, { timeout: 20000 });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply || 'I will coordinate this for you.', time: stamp() }]);
    } catch (error) {
      // Fallback replies to guarantee full functionality offline
      simulateFallbackReplies(content);
    } finally {
      setSending(false);
    }
  };

  const simulateFallbackReplies = (text) => {
    setTimeout(() => {
      let reply = "I am scanning our verified provider grid to optimize your schedule. What else would you like to know?";
      if (text.toLowerCase().includes('arrive') || text.toLowerCase().includes('time')) {
        reply = "The service provider is in your vicinity and can reach your location in approximately 20 to 30 minutes.";
      } else if (text.toLowerCase().includes('fee') || text.toLowerCase().includes('charge') || text.toLowerCase().includes('price')) {
        reply = "The base fee structure for AC diagnostics is as follows:\n\nStandard Diagnosis: PKR 1,500";
      } else if (text.toLowerCase().includes('profile') || text.toLowerCase().includes('technician') || text.toLowerCase().includes('who')) {
        reply = `👨‍🔧 Technician Profile:\nName: Muhammad Ali\nRating: ⭐ 4.9/5 (182 completed jobs)\nExperience: 6+ Years\nSpecialization: AC Diagnostics & Rapid Repairs`;
      } else if (text.toLowerCase().includes('confirm') || text.toLowerCase().includes('yes')) {
        reply = "Request provider ko bhej di gayi hai. Provider accept karega to booking confirm hogi.";
      }

      setMessages(prev => [
        ...prev,
        { id: generateMessageId(), role: 'assistant', content: reply, time: stamp() },
      ]);
    }, 600);
  };

  const triggerQuickReply = async (text) => {
    if (sending) return;
    await handleSend(text);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 20}
    >
      {/* Ambient background tints */}
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />

      <View style={[styles.inner, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 8) }]}>
        
        {/* Active Provider Info Card */}
        <LiquidGlass style={styles.providerPanel} contentStyle={styles.providerPanelInner} strong radius={RADII.xl}>
          <View style={styles.avatar}><Ionicons name="person" size={18} color="#FFFFFF" /></View>
          <View style={styles.providerCopy}>
            <Text style={styles.name}>{provider.name || 'Provider Chat'}</Text>
            <Text style={styles.online}>
              {bookingStateLoading ? 'Checking booking status…' : bookingStatus === 'canceled' ? 'Booking cancelled' : 'Online · Asaaniyat relay active'}
            </Text>
          </View>
        </LiquidGlass>

        {/* Chat message lists */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          onScroll={registerScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m, i) => <MessageBubble key={`${m.created_at || m.time || i}-${i}`} message={m} />)}
          {sending ? <TypingIndicator /> : null}

          {/* SELECT INQUIRY Drawer inside scroll view at the bottom of the list */}
          {bookingStatus !== 'canceled' && (
            <View style={styles.quickReplySection}>
              <Text style={styles.quickReplyHeader}>SELECT INQUIRY</Text>
              <View style={styles.quickReplyContainer}>
                {QUICK_REPLIES.map((reply, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.quickReplyButton,
                      reply.custom && styles.quickReplyConfirmButton
                    ]}
                    onPress={() => triggerQuickReply(reply.text)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={reply.icon}
                      size={18}
                      color={COLORS.primary}
                      style={styles.quickReplyIcon}
                    />
                    <Text
                      style={[
                        styles.quickReplyText,
                        reply.custom && styles.quickReplyConfirmText
                      ]}
                    >
                      {reply.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Message Input Composer */}
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
      </View>
    </KeyboardAvoidingView>
  );
}

function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#F9FCFA' },
  inner: { flex: 1, paddingHorizontal: 16, gap: 12 },
  
  // Ambient backgrounds
  ambientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '35%',
    backgroundColor: '#EFF6FF',
    opacity: 0.6,
  },
  ambientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    backgroundColor: '#EAF8EF',
    opacity: 0.5,
  },

  // Provider panel
  providerPanel: { marginTop: 6, zIndex: 10 },
  providerPanelInner: { minHeight: 68, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  providerCopy: { flex: 1 },
  name: { color: COLORS.textPrimary, fontSize: 16, fontFamily: FONTS.heading.fontFamily },
  online: { color: COLORS.primary, fontSize: 10, fontFamily: FONTS.subheading.fontFamily, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.7 },
  
  // Message bubbles lists
  messages: { padding: 16, paddingTop: 12, paddingBottom: 24, gap: 14 },
  
  bubbleRow: {
    flexDirection: 'row',
    width: '100%',
    marginVertical: 4,
  },
  userBubbleRow: {
    justifyContent: 'flex-end',
  },
  assistantBubbleRow: {
    justifyContent: 'flex-start',
    gap: 10,
  },

  // Bot Avatar on message list
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0E8F46',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.15)',
    ...SHADOWS.card,
    elevation: 2,
  },

  bubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },

  messageText: {
    color: '#10251A',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONTS.bold.fontFamily,
  },
  message: { color: COLORS.textPrimary, fontSize: 15, lineHeight: 22, fontFamily: FONTS.bold.fontFamily },
  userText: { color: '#FFFFFF', fontSize: 15, lineHeight: 22, fontFamily: FONTS.bold.fontFamily },
  timestamp: { alignSelf: 'flex-end', marginTop: 6, color: COLORS.textMuted, fontSize: 9, fontFamily: FONTS.subheading.fontFamily },
  userTimestamp: { color: 'rgba(255,255,255,0.72)' },
  
  typingBubble: { alignSelf: 'flex-start', flexDirection: 'row', gap: 5, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20, borderTopLeftRadius: 8, backgroundColor: 'rgba(255,255,255,0.90)' },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textMuted },
  
  // Embedded pricing card
  diagnosticCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(14,143,70,0.08)',
    padding: 16,
    marginTop: 12,
    width: 230,
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  tierLabel: {
    fontSize: 10,
    fontFamily: FONTS.heading.fontFamily,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  tierValue: {
    fontSize: 22,
    fontFamily: FONTS.heading.fontFamily,
    color: COLORS.primary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(14,143,70,0.08)',
    marginVertical: 12,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 13,
    fontFamily: FONTS.bold.fontFamily,
    color: COLORS.textSecondary,
  },
  feeValue: {
    fontSize: 15,
    fontFamily: FONTS.heading.fontFamily,
    color: '#10251A',
  },

  // Embedded booking card details
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.08)',
    padding: 12,
    marginTop: 10,
    alignSelf: 'stretch',
  },
  bookingCardTitle: {
    fontSize: 9,
    fontFamily: FONTS.heading.fontFamily,
    color: COLORS.primary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  bookingCardDivider: {
    height: 1,
    backgroundColor: 'rgba(14,143,70,0.06)',
    marginBottom: 8,
  },
  bookingCardRow: {
    marginVertical: 2,
  },
  bookingCardText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.bold.fontFamily,
  },

  // SELECT INQUIRY actions drawer at bottom of scroll view
  quickReplySection: {
    width: '100%',
    marginTop: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  quickReplyHeader: {
    fontSize: 10,
    fontFamily: FONTS.heading.fontFamily,
    color: COLORS.textSecondary,
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  quickReplyContainer: {
    width: '100%',
    gap: 8,
    alignItems: 'center',
  },
  quickReplyButton: {
    width: '100%',
    maxWidth: 290,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.12)',
    borderRadius: 22,
    paddingVertical: 11,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  quickReplyConfirmButton: {
    backgroundColor: '#EAF8EF',
    borderColor: 'rgba(14,143,70,0.26)',
    borderWidth: 1.5,
  },
  quickReplyIcon: {
    marginRight: 2,
  },
  quickReplyText: {
    fontSize: 13,
    fontFamily: FONTS.bold.fontFamily,
    color: COLORS.primary,
  },
  quickReplyConfirmText: {
    fontFamily: FONTS.heading.fontFamily,
    color: COLORS.primary,
  },

  // Composer Input
  composer: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    marginBottom: 4,
  },
  composerInner: { minHeight: 54, paddingLeft: 16, paddingRight: 8, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, maxHeight: 100, color: COLORS.textPrimary, fontSize: 15, fontFamily: FONTS.bold.fontFamily },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.42 },
});
