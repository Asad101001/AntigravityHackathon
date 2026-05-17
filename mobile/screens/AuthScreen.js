import React, { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isRegister = mode === 'register';
  const title = useMemo(() => (isRegister ? 'Create your account' : 'Welcome back'), [isRegister]);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    if (isRegister && !city.trim()) {
      setError('City is required.');
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register({ email: email.trim(), password, displayName: displayName.trim(), city: city.trim() });
      } else {
        await login({ email: email.trim(), password });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.shell}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.card}>
          <View style={styles.logo}><Ionicons name="flash" size={28} color="#FFFFFF" /></View>
          <Text style={styles.brand}>Asaaniyat</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Log in to continue or create a new account to start booking services securely.</Text>

          <View style={styles.segmentRow}>
            <Pressable onPress={() => setMode('login')} style={[styles.segment, !isRegister && styles.segmentActive]}>
              <Text style={[styles.segmentText, !isRegister && styles.segmentTextActive]}>Login</Text>
            </Pressable>
            <Pressable onPress={() => setMode('register')} style={[styles.segment, isRegister && styles.segmentActive]}>
              <Text style={[styles.segmentText, isRegister && styles.segmentTextActive]}>Register</Text>
            </Pressable>
          </View>

          {isRegister ? (
            <View style={styles.field}>
              <Text style={styles.label}>Display name</Text>
              <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor={COLORS.textMuted} autoCapitalize="words" />
            </View>
          ) : null}

          {isRegister ? (
            <View style={styles.field}>
              <Text style={styles.label}>City</Text>
              <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Islamabad" placeholderTextColor={COLORS.textMuted} autoCapitalize="words" />
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="name@example.com" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" keyboardType="email-address" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Minimum 8 characters" placeholderTextColor={COLORS.textMuted} secureTextEntry />
          </View>

          {isRegister ? (
            <View style={styles.field}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat password" placeholderTextColor={COLORS.textMuted} secureTextEntry />
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading} activeOpacity={0.86}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{isRegister ? 'Create account' : 'Log in'}</Text>}
          </TouchableOpacity>

          <Text style={styles.note}>Your session is remembered securely on this device for next time.</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: COLORS.bg, padding: 20, justifyContent: 'center' },
  flex: { flex: 1, justifyContent: 'center' },
  card: { borderRadius: 28, backgroundColor: '#FFFFFF', padding: 24, borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.primary, shadowOpacity: 0.12, shadowRadius: 24, elevation: 4 },
  logo: { width: 60, height: 60, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  brand: { color: COLORS.primary, fontSize: 13, fontWeight: '900', letterSpacing: 1.8, textTransform: 'uppercase' },
  title: { marginTop: 8, fontSize: 28, fontWeight: '900', color: COLORS.textPrimary },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 21, color: COLORS.textSecondary },
  segmentRow: { flexDirection: 'row', backgroundColor: COLORS.bgCardHover, borderRadius: 18, padding: 4, marginTop: 18, marginBottom: 16 },
  segment: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  segmentActive: { backgroundColor: COLORS.primary },
  segmentText: { color: COLORS.textSecondary, fontWeight: '800' },
  segmentTextActive: { color: '#FFFFFF' },
  field: { marginBottom: 12 },
  label: { marginBottom: 6, color: COLORS.textPrimary, fontSize: 12, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, color: COLORS.textPrimary, fontSize: 15, backgroundColor: '#FFFFFF' },
  button: { marginTop: 10, borderRadius: 18, backgroundColor: COLORS.primary, paddingVertical: 15, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  error: { color: COLORS.danger, marginTop: 4, marginBottom: 6, fontWeight: '700' },
  note: { marginTop: 12, color: COLORS.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
