import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const gradientShift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(gradientShift, { toValue: 1, duration: 4200, useNativeDriver: true }),
        Animated.timing(gradientShift, { toValue: 0, duration: 4200, useNativeDriver: true }),
      ])
    ).start();
  }, [gradientShift]);

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
      <Animated.View style={[styles.gradientOrbSage, { transform: [{ translateX: gradientShift.interpolate({ inputRange: [0, 1], outputRange: [-24, 34] }) }] }]} />
      <Animated.View style={[styles.gradientOrbWhite, { transform: [{ translateY: gradientShift.interpolate({ inputRange: [0, 1], outputRange: [28, -34] }) }] }]} />
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
  shell: { flex: 1, backgroundColor: '#EEF5F1', padding: 20, justifyContent: 'center', overflow: 'hidden' },
  gradientOrbSage: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: 'hsla(139, 44%, 74%, 0.48)', top: -120, left: -130 },
  gradientOrbWhite: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: 'rgba(255,255,255,0.82)', bottom: -150, right: -170 },
  flex: { flex: 1, justifyContent: 'center' },
  card: { borderRadius: 28, backgroundColor: 'rgba(255, 255, 255, 0.16)', padding: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.45)', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  logo: { width: 60, height: 60, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  brand: { color: COLORS.primary, fontSize: 13, fontWeight: '900', letterSpacing: 1.8, textTransform: 'uppercase' },
  title: { marginTop: 8, fontSize: 28, fontWeight: '900', color: COLORS.textPrimary },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 21, color: COLORS.textSecondary },
  segmentRow: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.16)', borderRadius: 20, padding: 4, marginTop: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.45)' },
  segment: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  segmentActive: { backgroundColor: 'rgba(14, 143, 70, 0.74)' },
  segmentText: { color: COLORS.textSecondary, fontWeight: '800' },
  segmentTextActive: { color: '#FFFFFF' },
  field: { marginBottom: 12 },
  label: { marginBottom: 6, color: COLORS.textPrimary, fontSize: 12, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.45)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 13, color: COLORS.textPrimary, fontSize: 15, backgroundColor: 'rgba(255, 255, 255, 0.16)', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  button: { marginTop: 10, borderRadius: 20, backgroundColor: 'rgba(14, 143, 70, 0.82)', paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.45)', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  error: { color: COLORS.danger, marginTop: 4, marginBottom: 6, fontWeight: '700' },
  note: { marginTop: 12, color: COLORS.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
