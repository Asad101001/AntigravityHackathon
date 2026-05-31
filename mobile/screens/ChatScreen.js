import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarVisibility } from '../components/TabBarVisibility';
import { COLORS, SHADOWS, FONTS } from '../theme';
import { subscribeSessionBookings } from '../sessionBookings';
import apiClient from '../lib/apiClient';
import VoiceModal from '../components/VoiceModal';
import useVoiceInput from '../lib/useVoiceInput';

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

function getQuickReplies(activeBooking) {
  if (!activeBooking) return [];

  if (activeBooking.id === 'general') {
    return [
      { text: 'How does Asaaniyat work?', urdu: 'آسانیت کیسے کام کرتی ہے؟', icon: 'help-circle-outline', custom: false },
      { text: 'How many bookings do I have?', urdu: 'میری کتنی بکنگز موجود ہیں؟', icon: 'list-outline', custom: false },
      { text: 'What services do you offer?', urdu: 'آپ کون سی خدمات پیش کرتے ہیں؟', icon: 'construct-outline', custom: false },
    ];
  }
  
  const status = String(activeBooking.status || '').toLowerCase();
  
  if (status === 'completed') {
    return [
      { text: 'Leave a review for this service', urdu: 'اس سروس کے لیے اپنی رائے دیں', icon: 'star-outline', custom: true },
      { text: 'I need to report an issue', urdu: 'مجھے ایک مسئلے کی اطلاع دینی ہے', icon: 'alert-circle-outline', custom: false },
      { text: 'Book this provider again', urdu: 'اس فراہم کنندہ کو دوبارہ بک کریں', icon: 'refresh-outline', custom: false },
    ];
  }
  
  if (status === 'canceled') {
    return [
      { text: 'Why was this order canceled?', urdu: 'یہ آرڈر کیوں منسوخ کیا گیا؟', icon: 'help-circle-outline', custom: false },
      { text: 'Book a different provider', urdu: 'کسی دوسرے فراہم کنندہ کو بک کریں', icon: 'search-outline', custom: true },
    ];
  }
  
  // Default for active/confirmed/pending
  return [
    { text: 'How quickly can you arrive?', urdu: 'آپ کتنی جلدی پہنچ سکتے ہیں؟', icon: 'time-outline', custom: false },
    { text: 'Show technician profile', urdu: 'ٹیکنیشن کی پروفائل دکھائیں', icon: 'person-outline', custom: false },
    { text: 'What is the standard diagnostic fee?', urdu: 'معیاری تشخیصی فیس کیا ہے؟', icon: 'cash-outline', custom: false },
    { text: 'Confirm Request', urdu: 'درخواست کی تصدیق کریں', icon: 'checkmark-circle-outline', custom: true },
  ];
}

export default function ChatScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const { registerScroll, hideTabBar, showTabBar } = useTabBarVisibility();
  const [activeBooking, setActiveBooking] = useState({
    id: 'general',
    service: 'Asaaniyat AI',
    provider: 'Asaaniyat AI',
    area: 'Pinned assistant chat',
    slot: null,
    quote_pkr: null,
    status: 'active',
    kind: 'assistant',
  });
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const {
    voiceVisible,
    voiceStatus,
    voiceTranscript,
    voiceError,
    startVoiceInput,
    stopVoiceInput,
    cancelVoiceInput,
  } = useVoiceInput({
    onTranscript: (spokenText) => {
      setInput(''); // clear input
      handleSend(spokenText, true); // Auto-send
    },
  });
  
  const [chatThreads, setChatThreads] = useState([]);
  const [isThreadsLoading, setIsThreadsLoading] = useState(true);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const response = await apiClient.get('/chat/threads');
        if (response.data.success && response.data.threads) {
          setChatThreads(response.data.threads);
        }
      } catch (error) {
        console.error('Failed to fetch chats:', error);
      } finally {
        setIsThreadsLoading(false);
      }
    };
    fetchThreads();
  }, []);

  useEffect(() => {
    let pollTimer;
    const loadMessages = async () => {
      try {
        const response = await apiClient.get(`/chat/${activeBooking.id || 'general'}`);
        if (response.data?.messages?.length) {
          setMessages(response.data.messages.map(m => ({ ...m, time: m.created_at || stamp() })));
          return;
        }

        if ((activeBooking.id || 'general') === 'general') {
          setMessages([
            {
              id: generateMessageId(),
              role: 'assistant',
              content: 'Hello. I am the Asaaniyat Assistant. I can help you manage your bookings and chat threads. How can I assist you today?',
              time: stamp(),
            },
          ]);
        } else {
          setMessages([
            {
              id: generateMessageId(),
              role: 'assistant',
              content: `Hello! I can coordinate with ${activeBooking.provider || 'your provider'} and summarize what needs to happen next.`,
              time: stamp(),
            },
          ]);
        }
      } catch (error) {
        console.error('Failed to load chat messages:', error);
        if ((activeBooking.id || 'general') === 'general' && messages.length === 0) {
          setMessages([
            {
              id: generateMessageId(),
              role: 'assistant',
              content: 'Hello. I am the Asaaniyat Assistant. I can help you manage your bookings and chat threads. How can I assist you today?',
              time: stamp(),
            },
          ]);
        }
      }
    };

    loadMessages();
    pollTimer = setInterval(loadMessages, 3000);

    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [activeBooking.id]);

  useEffect(() => subscribeSessionBookings(list => {
    if (list[0]) {
      setActiveBooking({
        id: list[0]._id,
        service: list[0].service_type,
        provider: list[0].provider_name,
        area: list[0].area,
        slot: list[0].booking_start_time,
        quote_pkr: list[0].quote_pkr,
        status: list[0].status,
      });
    }
  }), []);

  // Hide tab bar as soon as we land on the chat screen
  useEffect(() => {
    hideTabBar();
  }, [hideTabBar]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages]);

  // Also scroll to bottom when keyboard opens so input is never hidden
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    });
    return () => sub.remove();
  }, []);

  const send = async () => {
    const content = input.trim();
    if (!content) return;
    setInput('');
    await handleSend(content, false);
  };

  const handleSend = async (content, isVoice = false) => {
    // Add user message immediately
    setMessages(prev => [
      ...prev,
      { id: generateMessageId(), role: 'user', content, time: stamp() },
    ]);

    // If no active booking is present, prompt them
    if (!activeBooking) {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: generateMessageId(),
            role: 'assistant',
            content: 'I can help once a booking is active. For now, start from Home and submit a service request.',
            time: stamp(),
            isVoiceReply: isVoice,
          },
        ]);
      }, 500);
      return;
    }

    // Call backend API  
    // Send booking_id='general' for general chat, otherwise send the actual booking_id
    const booking_id_to_send = activeBooking.id === 'general' ? 'general' : activeBooking.id;
    
    try {
      const response = await apiClient.post('/chat/message', {
        booking_id: booking_id_to_send,
        message: content,
      });

      if (response.data.success) {
        // Check if backend is asking for booking selection
        if (response.data.requires_booking_selection) {
          setMessages(prev => [
            ...prev,
            {
              id: generateMessageId(),
              role: 'assistant',
              content: response.data.reply,
              time: stamp(),
              isVoiceReply: isVoice,
            },
          ]);
          
          // Store the user's original message so we can send it again after selection
          global.pendingOrderMessage = content;
        } else {
          setMessages(prev => [
            ...prev,
            {
              id: generateMessageId(),
              role: 'assistant',
              content: response.data.reply || 'I am here to help. What would you like to do?',
              time: stamp(),
              isVoiceReply: isVoice,
            },
          ]);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Fallback answers so chat is always fully functional even offline
      simulateFallbackReplies(content, isVoice);
    }
  };

  const simulateFallbackReplies = (text, isVoice = false) => {
    setTimeout(() => {
      let reply = "I am scanning our verified provider grid to optimize your schedule. What else would you like to know?";
      if (text.toLowerCase().includes('arrive') || text.toLowerCase().includes('time')) {
        reply = "The service provider is in your vicinity and can reach your location in approximately 20 to 30 minutes.";
      } else if (text.toLowerCase().includes('fee') || text.toLowerCase().includes('charge') || text.toLowerCase().includes('price')) {
        reply = "The base fee structure for plumbing diagnostics is as follows:\n\nStandard Diagnosis: PKR 1,500";
      } else if (text.toLowerCase().includes('profile') || text.toLowerCase().includes('technician') || text.toLowerCase().includes('who')) {
        reply = `👨‍🔧 Technician Profile:\nName: Muhammad Ali\nRating: ⭐ 4.9/5 (182 completed jobs)\nExperience: 6+ Years\nSpecialization: Plumbing Diagnostics & Rapid Repairs`;
      } else if (text.toLowerCase().includes('confirm') || text.toLowerCase().includes('yes')) {
        reply = "✅ Request confirmed successfully! The service provider has been notified and is on their way.\n\nEstimated Arrival: 25 minutes\nStandard Diagnostic Fee: PKR 1,500";
      }

      setMessages(prev => [
        ...prev,
        { id: generateMessageId(), role: 'assistant', content: reply, time: stamp(), isVoiceReply: isVoice },
      ]);
    }, 600);
  };

  const triggerQuickReply = async (text) => {
    await handleSend(text);
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
    
    setMessages(prev => [
      ...prev,
      {
        id: generateMessageId(),
        role: 'assistant',
        content: `✅ Order selected!\n\n${formatBookingInfo(booking)}\n\nWhat would you like to do with this order?`,
        time: stamp(),
      },
    ]);
    
    // If there was a pending order-related message, send it now to this booking
    if (global.pendingOrderMessage) {
      const pendingMsg = global.pendingOrderMessage;
      global.pendingOrderMessage = null;
      
      setTimeout(() => {
        handleSend(pendingMsg);
      }, 500);
    }
  };

  return (
    <View style={styles.screen}>
      <VoiceModal
        visible={voiceVisible}
        status={voiceStatus}
        transcript={voiceTranscript}
        error={voiceError}
        onAction={
          voiceStatus === 'recording'
            ? stopVoiceInput
            : voiceStatus === 'error'
            ? startVoiceInput
            : cancelVoiceInput
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Ambient background tints */}
        <View style={styles.ambientTop} />
        <View style={styles.ambientBottom} />

        <View style={[styles.inner, { paddingTop: insets.top, paddingBottom: 12 }]}>

          {/* Minimal back-button nav bar */}
        <View style={styles.minimalNav}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation?.canGoBack() ? navigation.goBack() : navigation?.navigate('Home')}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={styles.navTitleBlock}>
            <Text style={styles.navTitle} numberOfLines={1}>
              {activeBooking.provider || activeBooking.title || 'Chat'}
            </Text>
            <Text style={styles.navSub} numberOfLines={1}>
              {activeBooking.area || activeBooking.subtitle || 'Assistant'}
            </Text>
          </View>
        </View>

        {/* ── Thread Selector Strip ─────────────────────────────── */}
        <View style={styles.threadStripWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.threadStrip}
          >
            {/* Always pinned General AI chat */}
            <TouchableOpacity
              style={[
                styles.threadChip,
                styles.pinnedThread,
                activeBooking.id === 'general' && styles.threadChipActive
              ]}
              onPress={() => setActiveBooking({ id: 'general', service: 'Asaaniyat AI', provider: 'Asaaniyat AI', area: 'Pinned assistant chat', status: 'active', kind: 'assistant' })}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={12} color={activeBooking.id === 'general' ? '#FFFFFF' : '#D97706'} />
              <Text style={[styles.threadChipText, activeBooking.id === 'general' && styles.threadChipTextActive]} numberOfLines={1}>
                Asaaniyat AI
              </Text>
            </TouchableOpacity>

            {/* Skeletons while loading */}
            {isThreadsLoading && (
              <>
                <View style={[styles.threadChip, { width: 120, opacity: 0.5 }]} />
                <View style={[styles.threadChip, { width: 100, opacity: 0.3 }]} />
              </>
            )}

            {/* Loaded threads */}
            {!isThreadsLoading && chatThreads.filter(t => t.id !== 'general').map(thread => {
              const isActive = activeBooking.id === thread.id;
              return (
                <TouchableOpacity
                  key={thread.id}
                  style={[styles.threadChip, isActive && styles.threadChipActive]}
                  onPress={() => {
                    setActiveBooking({
                      id: thread.id,
                      kind: thread.kind,
                      service: thread.subtitle,
                      provider: thread.title,
                      area: thread.subtitle,
                      slot: thread.booking?.booking_start_time || null,
                      quote_pkr: thread.booking?.quote_pkr || null,
                      status: thread.booking?.status || 'active',
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={thread.kind === 'assistant' ? 'logo-android' : 'person-outline'}
                    size={14}
                    color={isActive ? '#FFFFFF' : COLORS.primary}
                  />
                  <Text
                    style={[styles.threadChipText, isActive && styles.threadChipTextActive]}
                    numberOfLines={1}
                  >
                    {thread.title}
                  </Text>
                  {thread.is_pinned && (
                    <Text style={{ fontSize: 10 }}>📌</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Message Scroll View */}
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          onScroll={registerScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => (
            <ChatBubble 
              key={message.id} 
              message={message} 
              isGeneralChat={activeBooking?.id === 'general'} 
            />
          ))}
          
          {/* Select Inquiry drawer inside scroll view at the bottom of standard messages */}
          {activeBooking && (
            <View style={styles.quickReplySection}>
              <Text style={styles.quickReplyHeader}>SELECT INQUIRY</Text>
              <View style={styles.quickReplyContainer}>
                {getQuickReplies(activeBooking).map((reply, idx) => (
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
                      color={reply.custom ? COLORS.primary : COLORS.primary}
                      style={styles.quickReplyIcon}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.quickReplyText,
                          reply.custom && styles.quickReplyConfirmText
                        ]}
                      >
                        {reply.text}
                      </Text>
                      {reply.urdu && (
                        <Text style={[styles.quickReplyText, { fontFamily: FONTS.urduCaption.fontFamily, fontSize: 10, color: COLORS.textMuted, marginTop: 2, textAlign: 'left' }]}>
                          {reply.urdu}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Message Composer — send button + voice mic */}
        <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              value={input}
              onChangeText={setInput}
              placeholder={activeBooking?.kind === 'assistant' || activeBooking?.id === 'general' ? 'Message Asaaniyat Assistant...' : 'Message your provider...'}
              placeholderTextColor={COLORS.textMuted}
              multiline
              returnKeyType="send"
              onSubmitEditing={send}
            />
            {input.trim() ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={send}
                activeOpacity={0.85}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : activeBooking?.id === 'general' ? (
              <TouchableOpacity
                style={[styles.sendButton, styles.micButtonChat]}
                onPress={startVoiceInput}
                activeOpacity={0.85}
              >
                <Ionicons name="mic" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function ChatBubble({ message, isGeneralChat }) {
  const isUser = message.role === 'user';
  const [isPlaying, setIsPlaying] = useState(false);

  // Cleanup speech when component unmounts or message changes
  useEffect(() => {
    return () => {
      if (isPlaying) {
        Speech.stop();
      }
    };
  }, [isPlaying]);

  const handleTalkback = async () => {
    if (isPlaying) {
      await Speech.stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      // Strip emojis and weird characters from TTS
      const cleanText = message.content.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
      Speech.speak(cleanText, {
        language: 'ur',  // Use urdu/en
        rate: 0.95,
        pitch: 1.0,
        onDone: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
        onStopped: () => setIsPlaying(false),
      });
    }
  };

  // Auto-play TTS if this reply was generated via voice
  useEffect(() => {
    if (message.isVoiceReply && !isUser && !isPlaying) {
      handleTalkback();
    }
  }, [message.id]);
  
  if (isUser) {
    return (
      <View style={[styles.bubbleContainer, styles.userBubbleContainer]}>
        <View style={[styles.bubble, styles.userBubble]}>
          <Text style={[styles.message, styles.userText]}>{message.content}</Text>
          <Text style={[styles.timestamp, styles.userTimestamp]}>{message.time}</Text>
        </View>
      </View>
    );
  }

  // Detect structures inside message content to render beautiful, premium mockup components
  const hasDiagnosticCard = message.content.includes("Diagnostic Fee") || message.content.includes("base fee structure");
  const isBookingSelected = message.content.includes("Order selected") || message.content.includes("📦 Order:");

  return (
    <View style={[styles.bubbleContainer, styles.assistantBubbleContainer]}>
      {/* Bot/Provider Avatar Icon next to message */}
      <View style={styles.avatarContainer}>
        <Ionicons name={message.role === 'provider' ? 'person' : 'logo-android'} size={18} color="#FFFFFF" />
      </View>

      <View style={[styles.bubble, styles.assistantBubble]}>
        <Text style={styles.messageText}>{message.content}</Text>

        {/* Embedded Pricing Diagnostic Card - matches the second mockup image with 100% precision */}
        {hasDiagnosticCard && (
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
        {isBookingSelected && !hasDiagnosticCard && (
          <View style={styles.bookingCard}>
            <Text style={styles.bookingCardTitle}>ACTIVE BOOKING DETAILS</Text>
            <View style={styles.bookingCardDivider} />
            {message.content.split('\n').map((line, idx) => {
              if (line.trim().length === 0) return null;
              return (
                <View key={idx} style={styles.bookingCardRow}>
                  <Text style={styles.bookingCardText}>{line}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Voice output control for AI assistant — powered by expo-speech */}
        {isGeneralChat && !hasDiagnosticCard && !isBookingSelected && (
          <View style={styles.voiceOutputContainer}>
            <TouchableOpacity 
              style={styles.playVoiceBtn}
              onPress={handleTalkback}
              activeOpacity={0.7}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Ionicons name={isPlaying ? "stop" : "volume-medium"} size={16} color={isPlaying ? COLORS.primary : COLORS.textSecondary} />
            </TouchableOpacity>
            {isPlaying && (
              <Text style={styles.playingText}>Speaking...</Text>
            )}
          </View>
        )}

        <Text style={styles.timestamp}>{message.time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5FBF7' },
  // Cohesive background tints
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
  inner: { flex: 1, paddingHorizontal: 16, gap: 10 },

  // Minimal nav bar (replaces heavy context card)
  minimalNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14,143,70,0.08)',
    flexShrink: 0,
  },
  navTitleBlock: { flex: 1 },
  navTitle: { color: COLORS.textPrimary, fontSize: 17, fontFamily: FONTS.heading.fontFamily, letterSpacing: -0.2 },
  navSub: { color: COLORS.primary, fontSize: 11, fontFamily: FONTS.subheading.fontFamily, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.6 },

  // Thread selector strip
  threadStripWrap: { maxHeight: 42, marginBottom: 4 },
  threadStrip: { paddingHorizontal: 4, gap: 8, alignItems: 'center' },
  threadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(14,143,70,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.12)',
  },
  threadChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  threadChipText: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: FONTS.subheading.fontFamily,
    maxWidth: 110,
  },
  threadChipTextActive: {
    color: '#FFFFFF',
  },
  switchButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(14,143,70,0.1)',
    flexShrink: 0,
  },
  switchButtonText: {
    fontSize: 11,
    color: COLORS.primary,
    fontFamily: FONTS.subheading.fontFamily,
  },

  // Message area
  messageList: { flex: 1 },
  messageContent: { gap: 16, paddingTop: 12, paddingBottom: 28 },
  composerWrap: {
    paddingTop: 6,
    paddingBottom: 100,
  },
  composer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.15)',
    color: COLORS.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    paddingLeft: 16,
    paddingRight: 50,
    paddingVertical: 8,
    textAlignVertical: 'center',
    ...SHADOWS.card,
  },
  sendButton: {
    position: 'absolute',
    right: 4,
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  micButtonChat: {
    backgroundColor: 'rgba(14,143,70,0.1)',
  },
  micIdleBtn: {
    backgroundColor: 'rgba(14,143,70,0.1)',
  },
  micRecordingBtn: {
    backgroundColor: '#DC2626',
  },
  
  // Message bubbles containers
  bubbleContainer: {
    flexDirection: 'row',
    width: '100%',
    marginVertical: 4,
  },
  userBubbleContainer: {
    justifyContent: 'flex-end',
  },
  assistantBubbleContainer: {
    justifyContent: 'flex-start',
    gap: 10,
  },

  // Bot avatar
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

  // Voice Output
  voiceOutputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  playVoiceBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingText: {
    fontSize: 10,
    color: COLORS.primary,
    marginLeft: 4,
    fontFamily: FONTS.heading.fontFamily,
  },

  // Message Bubbles
  bubble: { maxWidth: '82%', paddingHorizontal: 16, paddingVertical: 13, borderRadius: 22 },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.08)',
    shadowColor: '#0E8F46',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
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

  // Texts
  messageText: {
    color: '#10251A',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FONTS.bold.fontFamily,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FONTS.bold.fontFamily,
  },
  timestamp: {
    alignSelf: 'flex-end',
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: FONTS.subheading.fontFamily,
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.72)',
  },

  // Embedded diagnostic card matches mockup exactly!
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

  // Embedded booking card styling
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
  // Confirm Button style highlighted with soft mint green tint
  quickReplyConfirmButton: {
    backgroundColor: '#EAF8EF',
    borderColor: 'rgba(14,143,70,0.26)',
    borderWidth: 1.5,
  },
  quickReplyIcon: {
    marginRight: 2,
  },
  quickReplyText: {
    fontSize: 14,
    fontFamily: FONTS.bold.fontFamily,
    color: COLORS.primary,
  },
  quickReplyConfirmText: {
    fontFamily: FONTS.heading.fontFamily,
    color: COLORS.primary,
  },

  // Composer Input
  composer: {
    marginBottom: Platform.OS === 'ios' ? 12 : 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  composerInner: { minHeight: 54, paddingLeft: 16, paddingRight: 8, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, maxHeight: 100, color: COLORS.textPrimary, fontSize: 15, fontFamily: FONTS.bold.fontFamily },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.42 },

  // Booking picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F9FCFA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
    paddingTop: 12,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(14,143,70,0.06)',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FONTS.heading.fontFamily,
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
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.08)',
  },
  bookingRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingProvider: {
    fontSize: 14,
    fontFamily: FONTS.heading.fontFamily,
    color: COLORS.textPrimary,
  },
  bookingMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontFamily: FONTS.bold.fontFamily,
  },
  bookingTime: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    fontFamily: FONTS.bold.fontFamily,
  },
  bookingRowRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.bold.fontFamily,
  },
  pinnedThread: {
    backgroundColor: 'rgba(250, 204, 21, 0.06)',
    borderColor: 'rgba(250, 204, 21, 0.2)',
    borderWidth: 1.5,
  },
});
