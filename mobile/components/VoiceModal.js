import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS, RADII } from '../theme';

export default function VoiceModal({ visible, onClose }) {
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
          <Text style={styles.title}>Listening...</Text>
          <Text style={styles.subtitle}>Speak in Urdu, English, or Roman Urdu.</Text>
          <TouchableOpacity style={styles.stopBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.stopBtnText}>Done</Text>
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
  stopBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#DC2626',
    borderRadius: RADII.sm,
  },
  stopBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.heading.fontFamily,
    fontSize: 15,
  },
});
