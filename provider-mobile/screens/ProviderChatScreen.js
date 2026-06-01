import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import LiquidGlass from '../components/LiquidGlass';
import { COLORS, FONTS, SHADOWS } from '../theme';
import apiClient from '../lib/apiClient';
import { useTabBarVisibility } from '../components/TabBarVisibility';

// Roles stored in DB that belong to the client/AI side
const CLIENT_ROLES = new Set(['user', 'client', 'assistant', 'ai']);

function isProviderMessage(msg) {
  return msg.role === 'provider' || msg.role === 'assistant';
}

export default function ProviderChatScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { registerScroll } = useTabBarVisibility();
  const scrollRef = useRef(null);
  const pollTimer = useRef(null);

  const [activeChat, setActiveChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Handle direct navigation from booking card deep link
  useEffect(() => {
    if (route.params?.booking_id) {
      const { booking_id, clientName, serviceType, status } = route.params;
      setActiveChat({
        id: booking_id,
        bookingId: booking_id,
        clientName: clientName || 'Client',
        serviceType: serviceType || 'Service',
        status: status || 'pending',
      });
      fetchMessages(booking_id);
      
      // Clean up navigation params so switching tabs doesn't lock to this chat
      navigation.setParams({ booking_id: undefined });
    }
  }, [route.params?.booking_id, navigation]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const formatRelTime = (isoString) => {
    if (!isoString) return '';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // Transform raw DB messages → UI format
  const transformMessages = (raw) =>
    raw.map((msg) => ({
      id: msg._id || msg.id,
      role: msg.role,          // 'provider' | 'user' | 'assistant' | ...
      text: msg.content || '',
      timestamp: new Date(msg.created_at || msg.timestamp || Date.now()),
    }));

  // ─── Fetch chat list (bookings + last message preview) ─────────────────────

  const fetchChats = useCallback(async () => {
    try {
      setChatsLoading(true);
      const response = await apiClient.get('/provider/bookings');
      if (!response.data.success) return;

      const bookings = response.data.bookings || [];

      // We read the last message preview directly from the enriched bookings!
      // This reduces N+1 database queries to 0 additional database queries!
      const chatsList = bookings.map((booking) => {
        const bookingId = booking._id || booking.id;
        return {
          id: bookingId,
          bookingId,
          clientName: booking.client_name || 'Client',
          serviceType: booking.service_type || 'Service',
          status: booking.status || 'pending',
          lastMessage: booking.last_message || booking.description || 'No messages yet',
          timestamp: formatRelTime(booking.last_message_time || booking.booking_start_time),
        };
      });

      setChats(chatsList);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setChatsLoading(false);
    }
  }, []);

  // ─── Fetch messages for active chat ─────────────────────────────────────────

  const fetchMessages = useCallback(async (bookingId, silent = false) => {
    if (!bookingId) return;
    try {
      if (!silent) setLoading(true);
      const response = await apiClient.get(`/provider/messages?booking_id=${bookingId}`);
      if (response.data.success) {
        const transformed = transformMessages(response.data.messages || []);
        setMessages(transformed);
        // Auto-scroll to bottom
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
      }

      // Sync booking status to lock chat in real-time if status changed
      const bookingsRes = await apiClient.get('/provider/bookings');
      if (bookingsRes.data.success) {
        const currentBooking = bookingsRes.data.bookings.find(b => (b._id || b.id) === bookingId);
        if (currentBooking) {
          setActiveChat(prev => {
            if (!prev) return null;
            return {
              ...prev,
              status: currentBooking.status || 'pending'
            };
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Polling: refresh messages every 5s when a chat is open ─────────────────

  useEffect(() => {
    if (!activeChat?.bookingId) {
      clearInterval(pollTimer.current);
      return;
    }
    fetchMessages(activeChat.bookingId);
    pollTimer.current = setInterval(() => {
      fetchMessages(activeChat.bookingId, true); // silent = no spinner
    }, 5000);
    return () => clearInterval(pollTimer.current);
  }, [activeChat?.bookingId, fetchMessages]);

  // ─── Load chat list on focus ─────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      fetchChats();
      return () => clearInterval(pollTimer.current);
    }, [fetchChats])
  );

  // ─── Send message ─────────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!inputText.trim() || !activeChat || sending) return;
    const text = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    // Optimistic UI
    const optimistic = {
      id: `tmp_${Date.now()}`,
      role: 'provider',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      setSending(true);
      await apiClient.post('/provider/messages', {
        booking_id: activeChat.bookingId,
        text,
      });
      // Refresh to get server-assigned ID
      fetchMessages(activeChat.bookingId, true);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  // ─── Sub-components ──────────────────────────────────────────────────────────

  const ChatListItem = ({ chat }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => setActiveChat(chat)}
      activeOpacity={0.7}
    >
      <LiquidGlass opacity={0.02} />
      <View style={styles.chatAvatar}>
        <Ionicons name="person" size={24} color={COLORS.primary} />
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{chat.clientName}</Text>
          <Text style={styles.chatTime}>{chat.timestamp}</Text>
        </View>
        <Text style={styles.chatServiceType}>{chat.serviceType}</Text>
        <Text style={styles.chatPreview} numberOfLines={1}>
          {chat.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // isProvider = message sent BY the provider → show on RIGHT with primary color
  // isClient   = message from client/AI     → show on LEFT with card color
  const MessageBubble = ({ msg }) => {
    const isMine = isProviderMessage(msg);
    return (
      <View style={[styles.bubbleRow, isMine ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
        {!isMine && (
          <View style={styles.avatarSmall}>
            <Ionicons name="person" size={14} color={COLORS.primary} />
          </View>
        )}
        <View style={styles.bubbleGroup}>
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
              {msg.text}
            </Text>
          </View>
          <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  // ─── Render: Chat List ────────────────────────────────────────────────────────

  if (!activeChat) {
    return (
      <View style={styles.container}>
        <ScreenHeader 
          title="Messages" 
          subtitle="Connect with your clients" 
          onBack={() => navigation.canGoBack() ? navigation.goBack() : null}
        />
        {chatsLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : chats.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No bookings yet</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scroll} 
            contentContainerStyle={{ padding: 16 }}
            scrollEventThrottle={16}
            onScroll={registerScroll}
          >
            {chats.map((chat) => (
              <ChatListItem key={chat.id} chat={chat} />
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  // ─── Render: Active Chat ──────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={activeChat.clientName}
        subtitle={`${activeChat.serviceType} • ${activeChat.status}`}
        onBack={() => {
          clearInterval(pollTimer.current);
          setActiveChat(null);
          setMessages([]);
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 ? (
              <View style={styles.noMsgs}>
                <Ionicons name="chatbubble-outline" size={32} color={COLORS.textSecondary} />
                <Text style={styles.noMsgsText}>No messages yet. Start the conversation!</Text>
              </View>
            ) : (
              messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
            )}
          </ScrollView>

          {['canceled', 'completed', 'rejected'].includes(activeChat.status?.toLowerCase()) ? null : (
            <View style={[styles.inputBar, { paddingBottom: insets.bottom + 90 }]}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor={COLORS.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={1000}
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="send" size={18} color="white" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...FONTS.body1, color: COLORS.textSecondary, marginTop: 12 },

  // ── Chat list ──
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  chatAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { ...FONTS.subtitle2, color: COLORS.textPrimary },
  chatTime: { ...FONTS.caption, color: COLORS.textSecondary },
  chatServiceType: { ...FONTS.caption, color: COLORS.primary, marginTop: 1 },
  chatPreview: { ...FONTS.body2, color: COLORS.textSecondary, marginTop: 3 },

  // ── Messages area ──
  messagesScroll: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },

  noMsgs: { flex: 1, alignItems: 'center', marginTop: 60, gap: 10 },
  noMsgsText: { ...FONTS.body2, color: COLORS.textSecondary, textAlign: 'center' },

  // Provider bubble → RIGHT
  bubbleRowRight: { justifyContent: 'flex-end' },
  // Client bubble  → LEFT
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 16,
  },
  bubbleGroup: { maxWidth: '78%' },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  // MY bubble (provider) — primary color, white text, rounded right corners sharp
  bubbleMine: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  // THEIR bubble (client/AI) — card color, normal text, rounded left corners sharp
  bubbleTheirs: {
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { ...FONTS.body2 },
  bubbleTextMine: { color: '#FFFFFF' },
  bubbleTextTheirs: { color: COLORS.textPrimary },
  bubbleTime: { ...FONTS.caption, marginTop: 3, color: COLORS.textSecondary },
  bubbleTimeMine: { textAlign: 'right' },
  bubbleTimeTheirs: { textAlign: 'left' },

  // ── Input bar ──
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: COLORS.card,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...FONTS.body2,
    color: COLORS.textPrimary,
    maxHeight: 80,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  lockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: COLORS.card,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    gap: 8,
  },
  lockedText: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
});
