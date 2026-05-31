import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { COLORS, FONTS } from '../theme';

export default function SplashScreen() {
  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {}, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>Asaaniyat</Text>
        <Text style={styles.subtitle}>Provider Dashboard</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    ...FONTS.h1,
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    ...FONTS.body1,
    color: COLORS.textSecondary,
  },
});
