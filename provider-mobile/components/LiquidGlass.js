import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS } from '../theme';

export default function LiquidGlass({ opacity = 0.1, style }) {
  return (
    <View
      style={[
        styles.container,
        {
          opacity,
          backgroundColor: COLORS.overlay,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
});
