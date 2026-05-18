import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiquidGlass from '../components/LiquidGlass';
import { useTabBarVisibility } from '../components/TabBarVisibility';
import { COLORS, RADII } from '../theme';
import { getActiveBooking, subscribeSessionBookings } from '../sessionBookings';
import apiClient from '../lib/apiClient';

function stamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateString;
  }
}

function formatBookingInfo(booking) {
  if (!booking) return '';
  
  const lines = [
    `📦 Order: ${booking._id}`,
    `👨‍🔧 Provider: ${booking.provider_name}`,
    `🔧 Service: ${booking.service_type}`,
    `📍 Location: ${[booking.area, booking.city].filter(Boolean).join(', ')}`,
    `🗓️ Appointment: ${formatDate(booking.booking_start_time)}`,
    `💰 Quote: ${booking.quote_pkr ? `PKR ${Math.round(booking.quote_pkr).toLocaleString('en-PK')}` : 'Pending'}`,
    `📊 Status: ${booking.status?.toUpperCase() || 'UNKNOWN'}`,
  ];
  
  return lines.join('\n');
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const HEADER_PADDING = insets.top + (Platform.OS === 'ios' ? 74 : 64);
  const scrollRef = useRef(null);
  const { registerScroll } = useTabBarVisibility();
  const [activeBooking, setActiveBooking] = useState(getActiveBooking());
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: generateMessageId(),
      role: 'assistant',
      content: 'Assalam o alaikum. I am Asaaniyat AI. Tell me what changed, and I will help coordinate your active service booking.',
      time: stamp(),
    },
  ]);
  const [allBookings, setAllBookings] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Fetch bookings from database on mount
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoadingBookings(true);
        const response = await apiClient.get('/bookings');
        if (response.data.success && response.data.bookings) {
          setAllBookings(response.data.bookings);
        }
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
      } finally {
        setLoadingBookings(false);
      }
    };
    fetchBookings();
  }, []);

  useEffect(() => subscribeSessionBookings(list => setActiveBooking(list[0] || null)), []);
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }, [messages]);

  const send = async () => {
    const content = input.trim();
    if (!content) return;

    // If no session booking but multiple DB bookings exist, show selection modal
    if (!activeBooking && allBookings.length > 1) {
      setShowBookingModal(true);
      // Store the message to send after booking selection
      setInput('');
      setMessages(prev => [
        ...prev,
        { id: generateMessageId(), role: 'user', content, time: stamp() },
        {
          id: generateMessageId(),
          role: 'assistant',
          content: 'I found multiple active orders. Please select the order you want me to help with:',
          time: stamp(),
        },
      ]);
      return;
    }

    if (!activeBooking && allBookings.length === 1) {
      // Auto-select the only booking
      const booking = allBookings[0];
      const bookingData = {
        id: booking._id,
        service: booking.service_type,
        provider: booking.provider_name,
        area: booking.area,
        slot: booking.booking_start_time,
        quote_pkr: booking.quote_pkr,
        status: booking.status,
      };
      setActiveBooking(bookingData);
      setInput('');
      // Add message and then proceed with the send
      const newMessages = [
        ...messages,
        { id: generateMessageId(), role: 'user', content, time: stamp() },
        {
          id: generateMessageId(),
          role: 'assistant',
          content: `✅ Order selected!\n\n${formatBookingInfo(booking)}\n\nHow can I help you with this order?`,
          time: stamp(),
        },
      ];
      setMessages(newMessages);
      return;
    }

    if (!activeBooking) {
      setInput('');
      setMessages(prev => [
        ...prev,
        { id: generateMessageId(), role: 'user', content, time: stamp() },
        {
          id: generateMessageId(),
          role: 'assistant',
          content: 'I can help once a booking is active. For now, start from Home and confirm a provider.',
          time: stamp(),
        },
      ]);
      return;
    }

    // Add user message immediately
    setInput('');
    setMessages(prev => [
      ...prev,
      { id: generateMessageId(), role: 'user', content, time: stamp() },
    ]);

    // Send to backend chat API for actual AI response
    try {
      const response = await apiClient.post('/chat/message', {
        booking_id: activeBooking.id,
        message: content,
      });

      if (response.data.success) {
        setMessages(prev => [
          ...prev,
          {
            id: generateMessageId(),
            role: 'assistant',
            content: response.data.reply || 'I am here to help. What would you like to do?',
            time: stamp(),
          },
        ]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: generateMessageId(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          time: stamp(),
        },
      ]);
    }
  };

  const selectBooking = (booking) => {
    const bookingData = {
      id: booking._id,
      service: booking.service_type,
      provider: booking.provider_name,
      area: booking.area,
      slot: booking.booking_start_time,
      quote_pkr: booking.quote_pkr,
      status: booking.status,
    };
    
    setActiveBooking(bookingData);
    setShowBookingModal(false);
    
    // Add a message showing the selected booking details
    setMessages(prev => [
      ...prev,
      {
        id: generateMessageId(),
        role: 'assistant',
        content: `✅ Order selected!\n\n${formatBookingInfo(booking)}\n\nWhat would you like to do with this order?`,
        time: stamp(),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <View style={[styles.inner, { paddingTop: HEADER_PADDING, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <LiquidGlass style={styles.contextCard} contentStyle={styles.contextInner} strong radius={RADII.xl}>
          <View style={styles.contextIcon}>
            <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.contextCopy}>
            <Text style={styles.contextTitle}>{activeBooking ? activeBooking.provider : 'Asaaniyat AI'}</Text>
            <Text style={styles.contextMeta}>{activeBooking ? `${activeBooking.service} - ${activeBooking.area}` : 'No active session booking'}</Text>
          </View>
        </LiquidGlass>

        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          onScroll={registerScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => <ChatBubble key={message.id} message={message} />)}
        </ScrollView>

        <LiquidGlass style={styles.composer} contentStyle={styles.composerInner} strong radius={RADII.xl}>
          <TextInput
            style={styles.input}
            placeholder="Message Asaaniyat agent..."
            placeholderTextColor={COLORS.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity style={[styles.send, !input.trim() && styles.sendDisabled]} onPress={send} disabled={!input.trim()} activeOpacity={0.84}>
            <Ionicons name="arrow-up" size={19} color="#FFFFFF" />
          </TouchableOpacity>
        </LiquidGlass>
      </View>

      {/* Booking Selection Modal */}
      <Modal
        visible={showBookingModal && allBookings.length > 1}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Order</Text>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {loadingBookings ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading orders...</Text>
              </View>
            ) : allBookings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="inbox-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No orders found</Text>
              </View>
            ) : (
              <FlatList
                data={allBookings}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.bookingsList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.bookingRow,
                      item.status === 'canceled' && styles.bookingRowCanceled,
                    ]}
                    onPress={() => selectBooking(item)}
                    disabled={item.status === 'canceled'}
                    activeOpacity={0.7}
                  >
                    <View style={styles.bookingRowLeft}>
                      <View style={[styles.serviceIcon, { backgroundColor: 'rgba(14,143,70,0.2)' }]}>
                        <Text style={styles.serviceIconText}>{item.service_type?.charAt(0) || 'S'}</Text>
                      </View>
                      <View style={styles.bookingInfo}>
                        <Text style={styles.bookingProvider}>{item.provider_name}</Text>
                        <Text style={styles.bookingMeta}>{item.service_type} • {item.area}</Text>
                        <Text style={styles.bookingTime}>{formatDate(item.booking_start_time)}</Text>
                      </View>
                    </View>
                    <View style={styles.bookingRowRight}>
                      <View style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            item.status === 'confirmed' ? 'rgba(34,197,94,0.2)' :
                            item.status === 'Operating' ? 'rgba(14,143,70,0.2)' :
                            item.status === 'Completed' ? 'rgba(59,130,246,0.2)' :
                            'rgba(244,67,54,0.2)',
                        },
                      ]}>
                        <Text style={[
                          styles.statusText,
                          {
                            color:
                              item.status === 'confirmed' ? '#22C55E' :
                              item.status === 'Operating' ? '#0E8F46' :
                              item.status === 'Completed' ? '#3B82F6' :
                              '#F44336',
                          },
                        ]}>
                          {item.status}
                        </Text>
                      </View>
                      {item.status !== 'canceled' && (
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
      <Text style={[styles.message, isUser && styles.userText]}>{message.content}</Text>
      <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>{message.time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flex: 1, paddingHorizontal: 16, gap: 12 },
  contextCard: {},
  contextInner: { minHeight: 66, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  contextIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  contextCopy: { flex: 1 },
  contextTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '900' },
  contextMeta: { color: COLORS.primary, fontSize: 11, fontWeight: '900', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.6 },
  messageList: { flex: 1 },
  messageContent: { gap: 10, paddingVertical: 6 },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22 },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.90)', borderTopLeftRadius: 8, borderWidth: 1, borderColor: COLORS.borderLight },
  userBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderTopRightRadius: 8 },
  message: { color: COLORS.textPrimary, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  userText: { color: '#FFFFFF' },
  timestamp: { alignSelf: 'flex-end', marginTop: 4, color: COLORS.textMuted, fontSize: 10, fontWeight: '800' },
  userTimestamp: { color: 'rgba(255,255,255,0.72)' },
  composer: { marginBottom: 84 },
  composerInner: { minHeight: 58, paddingLeft: 16, paddingRight: 8, paddingVertical: 8, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input: { flex: 1, maxHeight: 100, color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', paddingVertical: 10 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.42 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  bookingsList: {
    paddingVertical: 12,
  },
  bookingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 16,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bookingRowCanceled: {
    opacity: 0.5,
  },
  bookingRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIconText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingProvider: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  bookingMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bookingTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  bookingRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
