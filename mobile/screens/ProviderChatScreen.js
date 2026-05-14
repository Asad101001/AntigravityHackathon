import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL, COLORS } from '../config';

export default function ProviderChatScreen({ route }) {
  const { fullResult } = route.params;
  const provider = fullResult.provider || {};
  const bookingId = fullResult.booking_id || 'general';
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hello! I can coordinate with ${provider.name || 'your provider'} and summarize what needs to happen next.` }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/chat/${bookingId}`).then(res => {
      if (res.data?.messages?.length) setMessages(res.data.messages);
    }).catch(() => {});
  }, [bookingId]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content }]);
    setSending(true);
    try {
      const res = await axios.post(`${API_URL}/chat/message`, { booking_id: bookingId, message: content, provider }, { timeout: 20000 });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply || 'I will coordinate this for you.' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I could not reach the chat agent right now, but your booking is still confirmed.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}><Text style={styles.name}>{provider.name || 'Provider Chat'}</Text><Text style={styles.online}>ONLINE</Text></View>
        <ScrollView contentContainerStyle={styles.messages}>
          {messages.map((m, i) => <View key={`${m.created_at || i}`} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble]}><Text style={[styles.message, m.role === 'user' && styles.userText]}>{m.content}</Text></View>)}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput style={styles.input} placeholder="Type a message..." placeholderTextColor={COLORS.textMuted} value={input} onChangeText={setInput} />
          <TouchableOpacity style={styles.send} onPress={send}><Ionicons name="send" size={18} color="#fff" /></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.bgCard },
  name: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900' },
  online: { color: COLORS.primary, fontSize: 10, fontWeight: '900', marginTop: 2 },
  messages: { padding: 16, gap: 10 },
  bubble: { maxWidth: '82%', padding: 13, borderRadius: 18 },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  userBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.accent },
  message: { color: COLORS.textPrimary, lineHeight: 19 },
  userText: { color: '#fff', fontWeight: '700' },
  composer: { flexDirection: 'row', gap: 10, padding: 14, backgroundColor: COLORS.bgCard, borderTopWidth: 1, borderTopColor: COLORS.border },
  input: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 18, paddingHorizontal: 14, color: COLORS.textPrimary },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' }
});
