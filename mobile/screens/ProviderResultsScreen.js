/**
 * Screen 4: ProviderResultsScreen
 * Top 3 providers with scores, distance, rating, availability
 * #1 has 'Recommended' badge. Tap to select.
 */

import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Dimensions
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { COLORS } from '../config';

const { height } = Dimensions.get('window');

export default function ProviderResultsScreen({ route, navigation }) {
  const { fullResult } = route.params;
  const provider = fullResult.provider;
  const alternatives = fullResult.alternatives || [];
  const reasoning = fullResult.reasoning;

  // Combine top provider with alternatives for display
  const allProviders = [];
  if (provider) {
    allProviders.push({ ...provider, rank: 1, isRecommended: true });
  }
  alternatives.forEach((alt, i) => {
    allProviders.push({ ...alt, rank: i + 2, isRecommended: false });
  });

  const getScoreColor = (score) => {
    if (score >= 0.8) return COLORS.scoreHigh;
    if (score >= 0.6) return COLORS.scoreMid;
    return COLORS.scoreLow;
  };

  const mapRef = useRef(null);

  const initialRegion = {
    latitude: allProviders[0]?.lat || 33.6844,
    longitude: allProviders[0]?.lng || 73.0479,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView 
          ref={mapRef}
          style={styles.map} 
          initialRegion={initialRegion}
          userInterfaceStyle="dark"
        >
          {allProviders.map(p => {
            if (p.lat && p.lng) {
              return (
                <Marker
                  key={p.id || p.rank}
                  coordinate={{ latitude: p.lat, longitude: p.lng }}
                  title={p.name}
                  description={`\${p.distance_km}km away`}
                  pinColor={p.isRecommended ? COLORS.primary : COLORS.warning}
                />
              );
            }
            return null;
          })}
        </MapView>
      </View>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Provider Cards */}
        {allProviders.map((p) => (
          <TouchableOpacity
            key={p.rank}
            style={[styles.providerCard, p.isRecommended && styles.providerCardRecommended]}
            onPress={() => {
              if (p.isRecommended) {
                navigation.navigate('BookingConfirm', { 
                  provider: p,
                  fullResult 
                });
              }
            }}
            activeOpacity={p.isRecommended ? 0.8 : 1}
          >
            {p.isRecommended && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>⭐ RECOMMENDED</Text>
              </View>
            )}

            <View style={styles.providerHeader}>
              <View>
                <Text style={styles.providerName}>{p.name}</Text>
                <Text style={styles.providerMeta}>
                  {p.phone ? `📞 ${p.phone}` : `Rank #${p.rank}`}
                </Text>
              </View>
              <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(p.scores?.total || p.score || 0) + '22' }]}>
                <Text style={[styles.scoreValue, { color: getScoreColor(p.scores?.total || p.score || 0) }]}>
                  {((p.scores?.total || p.score || 0) * 100).toFixed(0)}
                </Text>
                <Text style={styles.scoreLabel}>MATCH</Text>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <StatPill icon="📍" label="Distance" value={`${p.distance_km}km`} />
              <StatPill icon="⭐" label="Rating" value={`${p.rating}/5`} />
              {p.reviews_count && (
                <StatPill icon="💬" label="Reviews" value={p.reviews_count} />
              )}
            </View>

            {/* Score Breakdown */}
            {p.scores && (
              <View style={styles.breakdownSection}>
                <Text style={styles.breakdownTitle}>Score Breakdown</Text>
                <View style={styles.breakdownGrid}>
                  <ScoreBar label="Distance" value={p.scores.distance} />
                  <ScoreBar label="Rating" value={p.scores.rating} />
                  <ScoreBar label="Availability" value={p.scores.availability} />
                  <ScoreBar label="Response" value={p.scores.response_time} />
                </View>
              </View>
            )}

            {p.isRecommended && (
              <View style={styles.selectRow}>
                <Text style={styles.selectText}>Tap to book this provider →</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({ icon, label, value }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ScoreBar({ label, value }) {
  const color = value >= 0.8 ? COLORS.scoreHigh : value >= 0.5 ? COLORS.scoreMid : COLORS.scoreLow;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${value * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barValue, { color }]}>{(value * 100).toFixed(0)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  mapContainer: { height: height * 0.3, width: '100%', backgroundColor: COLORS.border },
  map: { flex: 1 },
  content: { padding: 20 },

  // Provider Card
  providerCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  providerCardRecommended: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  recommendedBadge: {
    backgroundColor: COLORS.primary + '22',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  recommendedText: { fontSize: 11, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },

  providerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  providerName: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  providerMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },

  scoreBadge: { borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 56 },
  scoreValue: { fontSize: 22, fontWeight: '800' },
  scoreLabel: { fontSize: 9, fontWeight: '600', color: COLORS.textMuted, marginTop: 2 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statIcon: { fontSize: 12, marginRight: 4 },
  statValue: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },

  // Score Breakdown
  breakdownSection: { marginTop: 4 },
  breakdownTitle: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  breakdownGrid: {},
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  barLabel: { fontSize: 11, color: COLORS.textSecondary, width: 75 },
  barBg: { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
  barFill: { height: '100%', borderRadius: 3 },
  barValue: { fontSize: 11, fontWeight: '600', width: 35, textAlign: 'right' },

  selectRow: { marginTop: 14, alignItems: 'center' },
  selectText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // Trace
  traceButton: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
    marginBottom: 30,
  },
  traceButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.accent },
});

