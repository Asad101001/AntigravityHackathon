import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS } from '../theme';
import LiquidGlass from '../components/LiquidGlass';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, loading } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const result = await login(email, password);
    if (!result.success) {
      Alert.alert('Login Failed', result.error);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword || !businessName || !phone) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // For now, just login - signup logic would go here
    Alert.alert('Info', 'Signup feature coming soon');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
          <View style={styles.header}>
            <Text style={styles.logo}>Asaaniyat</Text>
            <Text style={styles.tagline}>Provider Portal</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>
              {isSignUp ? 'Create Provider Account' : 'Provider Login'}
            </Text>

            {/* Business Name Field (Sign Up)*/}
            {isSignUp && (
              <View style={styles.inputContainer}>
                <Ionicons name="business" size={20} color={COLORS.primary} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Business Name"
                  placeholderTextColor={COLORS.textTertiary}
                  value={businessName}
                  onChangeText={setBusinessName}
                  editable={!loading}
                />
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color={COLORS.primary} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={COLORS.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            {/* Phone Field (Sign Up) */}
            {isSignUp && (
              <View style={styles.inputContainer}>
                <Ionicons name="call" size={20} color={COLORS.primary} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor={COLORS.textTertiary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>
            )}

            {/* Password Field */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color={COLORS.primary} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Field (Sign Up) */}
            {isSignUp && (
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={COLORS.primary} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={COLORS.textTertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={isSignUp ? handleSignUp : handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>
                  {isSignUp ? 'Create Account' : 'Login'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Sign Up / Login */}
            <View style={styles.toggle}>
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already have an account? ' : `Don't have an account? `}
              </Text>
              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} disabled={loading}>
                <Text style={styles.toggleButton}>
                  {isSignUp ? 'Login' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    ...FONTS.h1,
    color: COLORS.primary,
  },
  tagline: {
    ...FONTS.body1,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  form: {
    flex: 1,
  },
  title: {
    ...FONTS.h4,
    color: COLORS.textPrimary,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    ...FONTS.body1,
    color: COLORS.textPrimary,
  },
  button: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...FONTS.button,
    color: '#000',
  },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  toggleText: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
  },
  toggleButton: {
    ...FONTS.button,
    color: COLORS.primary,
  },
});
