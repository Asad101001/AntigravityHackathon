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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import LiquidGlass from '../components/LiquidGlass';
import { COLORS, FONTS, SHADOWS } from '../theme';
import apiClient from '../lib/apiClient';

export default function ProviderChatScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const [activeChat, setActiveChat] = useState(null);
  const [chats, setChats] = useState([
    {
      id: '1',
      clientName: 'Ahmed Hassan',
      clientImage: '👨‍💼',
      lastMessage: 'When can you arrive?',
      timestamp: '2 min ago',
      unread: 2,
      bookingId: '1',
      status: 'pending',
    },
    {
      id: '2',
      clientName: 'Fatima Khan',
      clientImage: '👩‍💼',
      lastMessage: 'Thank you for the service',
      timestamp: '1 hour ago',
      unread: 0,
      bookingId: '2',
      status: 'completed',
    },
  ]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      setLoading(true);
      // Mock messages
      await new Promise(resolve => setTimeout(resolve, 300));
      setMessages([
        {
          id: '1',
          sender: 'client',
          text: 'Hi, I have an AC problem',
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          id: '2',
          sender: 'provider',
          text: 'Hello! I can help with that. Can you describe the issue?',
          timestamp: new Date(Date.now() - 3500000),
        },
        {
          id: '3',
          sender: 'client',
          text: 'The AC is not cooling properly',
          timestamp: new Date(Date.now() - 3400000),
        },
        {
          id: '4',
          sender: 'provider',
          text: 'I can come today at 2 PM. Does that work for you?',
          timestamp: new Date(Date.now() - 3300000),
        },
        {
          id: '5',
          sender: 'client',
          text: 'Yes, perfect! See you then',
          timestamp: new Date(Date.now() - 3200000),
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);
    }
  }, [activeChat, fetchMessages]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      sender: 'provider',
      text: message,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setMessage('');
    Keyboard.dismiss();

    // Scroll to bottom
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const ChatListItem = ({ chat, onPress }) => (
    <TouchableOpacity
      style={[styles.chatItem, chat.unread > 0 && styles.unreadChat]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LiquidGlass opacity={0.02} />
      <View style={styles.chatAvatar}>
        <Text style={styles.avatarEmoji}>{chat.clientImage}</Text>
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{chat.clientName}</Text>
          <Text style={styles.chatTime}>{chat.timestamp}</Text>
        </View>
        <Text style={styles.chatPreview} numberOfLines={1}>
          {chat.lastMessage}
        </Text>
      </View>
      {chat.unread > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{chat.unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const MessageBubble = ({ msg, isProvider }) => (
    <View
      style={[
        styles.messageBubbleContainer,
        isProvider ? styles.providerBubbleContainer : styles.clientBubbleContainer,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isProvider ? styles.providerBubble : styles.clientBubble,
        ]}
      >
        <Text style={[styles.messageText, isProvider && styles.providerText]}>
          {msg.text}
        </Text>
      </View>
      <Text
        style={[
          styles.messageTime,
          isProvider ? styles.providerTime : styles.clientTime,
        ]}
      >
        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  if (!activeChat) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Messages" subtitle="Connect with clients" />
        <ScrollView style={styles.scroll} contentContainerStyle={{ flexGrow: 1 }}>
          {chats.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          ) : (
            <View style={styles.chatsList}>
              {chats.map(chat => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  onPress={() => setActiveChat(chat)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={activeChat.clientName}
        subtitle={`Booking for ${activeChat.status}`}
        onBack={() => setActiveChat(null)}
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
          >
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isProvider={msg.sender === 'provider'}
              />
            ))}
          </ScrollView>

          <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.textTertiary}
              value={message}
              onChangeText={setMessage}
              multiline
              maxHeight={100}
            />
            <TouchableOpacity
              style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!message.trim()}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...FONTS.body1,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  chatsList: {
    padding: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  unreadChat: {
    backgroundColor: COLORS.cardHover,
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    ...FONTS.subtitle2,
    color: COLORS.textPrimary,
  },
  chatTime: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
  chatPreview: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  unreadText: {
    ...FONTS.caption,
    color: 'white',
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubbleContainer: {
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  clientBubbleContainer: {
    justifyContent: 'flex-start',
  },
  providerBubbleContainer: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  clientBubble: {
    backgroundColor: COLORS.card,
  },
  providerBubble: {
    backgroundColor: COLORS.primary,
  },
  messageText: {
    ...FONTS.body2,
    color: COLORS.textPrimary,
  },
  providerText: {
    color: '#000',
  },
  messageTime: {
    ...FONTS.caption,
    marginHorizontal: 8,
    color: COLORS.textSecondary,
  },
  clientTime: {
    marginRight: 'auto',
  },
  providerTime: {
    marginLeft: 'auto',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: COLORS.card,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    ...FONTS.body2,
    color: COLORS.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
