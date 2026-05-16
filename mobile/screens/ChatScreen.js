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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiquidGlass from '../components/LiquidGlass';
import { useTabBarVisibility } from '../components/TabBarVisibility';
import { COLORS, RADII } from '../theme';
import { getActiveBooking, subscribeSessionBookings } from '../sessionBookings';

function stamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const { registerScroll } = useTabBarVisibility();
  const [activeBooking, setActiveBooking] = useState(getActiveBooking());
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Assalam o alaikum. I am Asaaniyat AI. Tell me what changed, and I will help coordinate your active service booking.',
      time: stamp(),
    },
  ]);

  useEffect(() => subscribeSessionBookings(list => setActiveBooking(list[0] || null)), []);
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }, [messages]);

  const send = () => {
    const content = input.trim();
    if (!content) return;
    setInput('');
    setMessages(prev => [
      ...prev,
      { role: 'user', content, time: stamp() },
      {
        role: 'assistant',
        content: activeBooking
          ? `Noted for ${activeBooking.provider}. I will keep this attached to booking ${activeBooking.id}.`
          : 'I can help once a booking is active. For now, start from Home and confirm a provider.',
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
      <View style={[styles.inner, { paddingTop: insets.top + 112, paddingBottom: Math.max(insets.bottom, 12) }]}>
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
          {messages.map((message, index) => <ChatBubble key={`${message.time}-${index}`} message={message} />)}
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
});
