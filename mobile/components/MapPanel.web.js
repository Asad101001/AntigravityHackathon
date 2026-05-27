import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../theme';

export default function MapPanel({ style, markers = [] }) {
  return (
    <View style={[style, styles.webMap]}>
      <Ionicons name="map-outline" size={28} color={COLORS.primary} />
      <Text style={styles.title}>Map preview</Text>
      <Text style={styles.subtitle}>Interactive maps are available in Expo Go or Android/iOS. Web shows the selected coordinates and providers.</Text>
      <View style={styles.markerList}>
        {markers.slice(0, 4).map((marker) => (
          <View key={marker.id || marker.title} style={styles.markerRow}>
            <View style={[styles.dot, { backgroundColor: marker.pinColor || COLORS.primary }]} />
            <Text style={styles.markerText} numberOfLines={1}>{marker.title}{marker.description ? ` · ${marker.description}` : ''}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webMap: {
    backgroundColor: COLORS.chip,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: { color: COLORS.textPrimary, fontSize: 16, fontFamily: FONTS.heading.fontFamily, marginTop: 8 },
  subtitle: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 12, marginTop: 4, lineHeight: 18 },
  markerList: { alignSelf: 'stretch', marginTop: 12, gap: 6 },
  markerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  markerText: { color: COLORS.textSecondary, fontSize: 11, fontFamily: FONTS.bold.fontFamily, flex: 1 },
});
