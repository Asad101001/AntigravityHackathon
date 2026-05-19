/**
 * Toast.js — Global floating notification banner system
 * Provides ToastProvider + useToast() hook for all screens.
 * Shows animated slide-in banners for success, error, warning, info.
 */

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, SHADOWS } from '../theme';

const TOAST_TYPES = {
  success: { bg: '#0E8F46', icon: 'checkmark-circle', iconColor: '#FFFFFF', textColor: '#FFFFFF' },
  error:   { bg: '#DC2626', icon: 'close-circle',     iconColor: '#FFFFFF', textColor: '#FFFFFF' },
  warning: { bg: '#D97706', icon: 'warning',           iconColor: '#FFFFFF', textColor: '#FFFFFF' },
  info:    { bg: 'rgba(255,255,255,0.96)', icon: 'information-circle', iconColor: COLORS.primary, textColor: COLORS.textPrimary },
};

const ToastContext = createContext(null);

let _toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'info', options = {}) => {
    const id = ++_toastId;
    const duration = options.duration ?? 4000;
    const action = options.action ?? null; // { label, onPress }

    setToasts(prev => [...prev, { id, message, type, duration, action }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showSuccess = useCallback((msg, opts) => show(msg, 'success', opts), [show]);
  const showError   = useCallback((msg, opts) => show(msg, 'error',   opts), [show]);
  const showWarning = useCallback((msg, opts) => show(msg, 'warning', opts), [show]);
  const showInfo    = useCallback((msg, opts) => show(msg, 'info',    opts), [show]);

  return (
    <ToastContext.Provider value={{ show, showSuccess, showError, showWarning, showInfo, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback if used outside provider
    return {
      show: () => {},
      showSuccess: () => {},
      showError: () => {},
      showWarning: () => {},
      showInfo: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
}

function ToastContainer({ toasts, onDismiss }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { top: insets.top + 8 }]}
      pointerEvents="box-none"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

function ToastItem({ toast, onDismiss }) {
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const config = TOAST_TYPES[toast.type] || TOAST_TYPES.info;

  React.useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 16,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss animation
    if (toast.duration > 0) {
      const dismissDelay = toast.duration - 300;
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -80,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }),
        ]).start();
      }, Math.max(dismissDelay, 300));
      return () => clearTimeout(timer);
    }
  }, []);

  const isLight = toast.type === 'info';

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: config.bg },
        !isLight && styles.toastDark,
        isLight && styles.toastLight,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      <Ionicons name={config.icon} size={20} color={config.iconColor} style={{ flexShrink: 0 }} />
      <Text style={[styles.toastText, { color: config.textColor }]} numberOfLines={3}>
        {toast.message}
      </Text>

      {toast.action && (
        <TouchableOpacity
          onPress={() => {
            toast.action.onPress?.();
            onDismiss(toast.id);
          }}
          style={[styles.toastAction, { borderColor: config.iconColor + '50' }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.toastActionText, { color: config.iconColor }]}>
            {toast.action.label}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => onDismiss(toast.id)} style={styles.toastClose} activeOpacity={0.7}>
        <Ionicons name="close" size={16} color={config.iconColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 10,
    pointerEvents: 'box-none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: RADII.lg,
    ...SHADOWS.floating,
  },
  toastDark: {
    // Colored toasts (success, error, warning)
  },
  toastLight: {
    // Light info toast
    borderWidth: 1,
    borderColor: 'rgba(14,143,70,0.12)',
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  toastAction: {
    borderWidth: 1,
    borderRadius: RADII.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  toastActionText: {
    fontSize: 11,
    fontWeight: '900',
  },
  toastClose: {
    padding: 2,
    flexShrink: 0,
  },
});
