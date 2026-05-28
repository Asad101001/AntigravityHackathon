import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS, RADII } from '../theme';

export default function VoiceModal({
  visible,
  status = 'preparing',
  transcript = '',
  error = '',
  onAction,
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [visible, pulseAnim]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <View style={styles.micContainer}>
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.3], outputRange: [0.6, 0] }) }]} />
            <View style={styles.micCircle}>
              <Ionicons name="mic" size={32} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.title}>
            {status === 'recording' ? 'Listening...' : status === 'transcribing' ? 'Writing your words...' : error ? 'Voice input issue' : 'Tap to Speak'}
          </Text>
          <Text style={styles.subtitle}>
            {status === 'recording'
              ? 'Speak in English or Roman Urdu.'
              : status === 'transcribing'
              ? 'Turning your voice into text.'
              : error || 'Speak in English or Roman Urdu.'}
          </Text>
          {!!transcript && (
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>Captured text</Text>
              <Text style={styles.previewText}>{transcript}</Text>
            </View>
          )}
          <TouchableOpacity style={[styles.stopBtn, status === 'transcribing' && styles.stopBtnDisabled]} onPress={onAction} activeOpacity={0.8} disabled={status === 'transcribing'}>
            {status === 'transcribing' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.stopBtnText}>{status === 'recording' ? 'Done' : error ? 'Try Again' : 'Cancel'}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  popup: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: RADII.md,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  micContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  micCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    ...SHADOWS.card,
  },
  pulseRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.heading.fontFamily,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.bold.fontFamily,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  previewBox: {
    width: '100%',
    borderRadius: RADII.sm,
    backgroundColor: '#F5FBF7',
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.12)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 22,
  },
  previewLabel: {
    fontSize: 11,
    color: COLORS.primary,
    fontFamily: FONTS.heading.fontFamily,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold.fontFamily,
    lineHeight: 20,
  },
  stopBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#DC2626',
    borderRadius: RADII.sm,
  },
  stopBtnDisabled: {
    opacity: 0.75,
  },
  stopBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.heading.fontFamily,
    fontSize: 15,
  },
});
