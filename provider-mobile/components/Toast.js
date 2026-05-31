import React, { createContext, useContext, useState } from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';
import { COLORS, FONTS } from '../theme';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const show = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const animValue = new Animated.Value(0);

    setToasts(prev => [...prev, { id, message, type, animValue }]);

    Animated.sequence([
      Animated.timing(animValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(duration),
      Animated.timing(animValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    });
  };

  const value = { show };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} />
    </ToastContext.Provider>
  );
};

const ToastStack = ({ toasts }) => {
  return (
    <View style={styles.container}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  );
};

const ToastItem = ({ toast }) => {
  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success': return COLORS.success;
      case 'error': return COLORS.error;
      case 'warning': return COLORS.warning;
      default: return COLORS.info;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: getBackgroundColor(),
          opacity: toast.animValue,
          transform: [{
            translateY: toast.animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          }],
        },
      ]}
    >
      <Text style={styles.text}>{toast.message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 20,
    zIndex: 9999,
  },
  toast: {
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    maxWidth: '90%',
  },
  text: {
    ...FONTS.body2,
    color: 'white',
    textAlign: 'center',
  },
});
