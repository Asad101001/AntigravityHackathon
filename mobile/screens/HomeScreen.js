import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SERVICES } from '../config';

const HERO_IMAGE = { uri: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=70' };

const SERVICE_MEDIA = {
  electrician: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=320&q=55',
  plumber: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=320&q=55',
  ac: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=320&q=55',
  carpenter: 'https://images.unsplash.com/photo-1601058268499-e52658b8bb88?auto=format&fit=crop&w=320&q=55',
};

function GlassPanel({ children, style }) {
  return <View style={[styles.glassPanel, style]}>{children}</View>;
}

export default function HomeScreen({ route, navigation }) {
  const [text, setText] = useState('');
  const [pickedLocation, setPickedLocation] = useState(null);

  useEffect(() => {
    if (route.params?.pickedLocation) setPickedLocation(route.params.pickedLocation);
  }, [route.params?.pickedLocation]);

  const handleSend = () => {
    if (!text.trim()) return;
    navigation.navigate('Loading', {
      userText: text.trim(),
      userLocation: pickedLocation,
      locationSource: pickedLocation ? 'map' : 'typed',
    });
  };

  const locationLabel = pickedLocation?.label || 'Choose service location';
  const featuredServices = useMemo(() => SERVICES.slice(0, 4), []);

  return (
    <ImageBackground source={HERO_IMAGE} style={styles.background} imageStyle={styles.backgroundImage}>
      <View style={styles.scrim} />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <GlassPanel style={styles.heroGlass}>
              <View style={styles.heroMetaRow}>
                <TouchableOpacity style={styles.locationPill} onPress={() => navigation.navigate('LocationPicker', { pickedLocation })} activeOpacity={0.84}>
                  <Ionicons name="location" size={16} color="#9EF7C2" />
                  <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
                  <Ionicons name="chevron-down" size={14} color="rgba(248,250,252,0.68)" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.traceButton} onPress={() => navigation.navigate('AgentTrace')} activeOpacity={0.84}>
                  <Ionicons name="terminal-outline" size={18} color="#F8FAFC" />
                </TouchableOpacity>
              </View>

              <Text style={styles.kicker}>Natural-language service booking</Text>
              <Text style={styles.hero}>How can Asaaniyat help today?</Text>
              <Text style={styles.subhero}>Describe the job in English, Urdu, or Roman Urdu. We’ll parse intent, location, urgency, and match a verified provider.</Text>

              <View style={styles.requestCard}>
                <Ionicons name="sparkles" size={19} color="#9EF7C2" />
                <TextInput
                  style={styles.input}
                  placeholder={'e.g., “AC repair needed in DHA tonight”'}
                  placeholderTextColor="rgba(226,232,240,0.48)"
                  value={text}
                  onChangeText={setText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity style={[styles.sendButton, !text.trim() && styles.disabled]} onPress={handleSend} disabled={!text.trim()} activeOpacity={0.82}>
                  <Ionicons name="arrow-forward" size={20} color="#06130D" />
                </TouchableOpacity>
              </View>
            </GlassPanel>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fast-start services</Text>
              <Text style={styles.sectionHint}>Tap to prefill</Text>
            </View>

            <View style={styles.serviceGrid}>
              {featuredServices.map(service => (
                <TouchableOpacity
                  key={service.id}
                  style={styles.serviceCard}
                  onPress={() => setText(`${service.label} chahiye ${pickedLocation?.label || 'near me'}`.trim())}
                  activeOpacity={0.86}
                >
                  <Image source={{ uri: SERVICE_MEDIA[service.id] || SERVICE_MEDIA.plumber }} style={styles.serviceImage} />
                  <View style={styles.serviceOverlay} />
                  <View style={styles.serviceIconGlass}>
                    <Ionicons name={service.icon} size={18} color="#9EF7C2" />
                  </View>
                  <Text style={styles.serviceLabel}>{service.label}</Text>
                  <Text style={styles.serviceUrdu}>{service.urdu}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <GlassPanel style={styles.mapCard}>
              <View style={styles.mapPreview}>
                <View style={styles.mapGridLineHorizontal} />
                <View style={styles.mapGridLineVertical} />
                <View style={[styles.mapPin, styles.pinOne]} />
                <View style={[styles.mapPin, styles.pinTwo]} />
                <View style={styles.routeLine} />
              </View>
              <View style={styles.mapCopy}>
                <Text style={styles.badge}>LIVE NEAR YOU</Text>
                <Text style={styles.featureTitle}>Verified pros within reach</Text>
                <Text style={styles.featureCopy}>A subtle map snapshot keeps provider proximity visible without overwhelming the request flow.</Text>
              </View>
            </GlassPanel>

            <GlassPanel style={styles.providerCard}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=420&q=60' }} style={styles.providerImage} />
              <View style={styles.providerTextWrap}>
                <Text style={styles.badge}>POPULAR MATCH</Text>
                <Text style={styles.featureTitle}>Emergency Plumbing</Text>
                <Text style={styles.featureCopy}>Verified experts available quickly for leaks, clogs, repairs, and urgent home fixes.</Text>
                <TouchableOpacity onPress={() => setText(`Plumber needed ${pickedLocation?.label || 'near me'} today`)} activeOpacity={0.82}>
                  <Text style={styles.bookNow}>Prefill request →</Text>
                </TouchableOpacity>
              </View>
            </GlassPanel>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { flex: 1, backgroundColor: '#07111F' },
  backgroundImage: { opacity: 0.38 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4, 10, 20, 0.72)' },
  container: { flex: 1 },
  content: { padding: 18, paddingTop: 126, paddingBottom: 124 },
  glassPanel: {
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.105)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 8,
    overflow: 'hidden',
  },
  heroGlass: { padding: 18 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24 },
  locationPill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  locationText: { flex: 1, color: '#F8FAFC', fontSize: 12, fontWeight: '800' },
  traceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  kicker: { color: '#9EF7C2', fontSize: 11, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase' },
  hero: { marginTop: 8, color: '#F8FAFC', fontSize: 38, lineHeight: 43, fontWeight: '900', letterSpacing: -1.2 },
  subhero: { marginTop: 12, color: 'rgba(226,232,240,0.72)', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  requestCard: {
    marginTop: 22,
    minHeight: 82,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(7,17,31,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(158,247,194,0.20)',
  },
  input: { flex: 1, minHeight: 52, maxHeight: 96, color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  sendButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#9EF7C2', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.42 },
  sectionHeader: { marginTop: 24, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '900' },
  sectionHint: { color: 'rgba(226,232,240,0.54)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  serviceCard: { width: '48%', height: 148, borderRadius: 24, padding: 14, justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  serviceImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.38 },
  serviceOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,14,25,0.44)' },
  serviceIconGlass: { position: 'absolute', top: 12, left: 12, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(7,17,31,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  serviceLabel: { color: '#F8FAFC', fontSize: 16, fontWeight: '900' },
  serviceUrdu: { marginTop: 2, color: 'rgba(226,232,240,0.70)', fontSize: 12, fontWeight: '700' },
  mapCard: { marginTop: 18, minHeight: 178, flexDirection: 'row' },
  mapPreview: { flex: 0.42, margin: 14, borderRadius: 22, backgroundColor: 'rgba(158,247,194,0.12)', overflow: 'hidden' },
  mapGridLineHorizontal: { position: 'absolute', left: 0, right: 0, top: '42%', height: 1, backgroundColor: 'rgba(255,255,255,0.16)' },
  mapGridLineVertical: { position: 'absolute', top: 0, bottom: 0, left: '56%', width: 1, backgroundColor: 'rgba(255,255,255,0.16)' },
  routeLine: { position: 'absolute', width: 78, height: 3, borderRadius: 2, backgroundColor: '#9EF7C2', left: 23, top: 74, transform: [{ rotate: '-28deg' }] },
  mapPin: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#9EF7C2', borderWidth: 3, borderColor: 'rgba(7,17,31,0.92)' },
  pinOne: { left: 24, top: 82 },
  pinTwo: { right: 26, top: 42 },
  mapCopy: { flex: 0.58, paddingVertical: 20, paddingRight: 16, justifyContent: 'center' },
  badge: { color: '#9EF7C2', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  featureTitle: { marginTop: 8, color: '#F8FAFC', fontSize: 20, lineHeight: 25, fontWeight: '900' },
  featureCopy: { marginTop: 7, color: 'rgba(226,232,240,0.70)', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  providerCard: { marginTop: 18, minHeight: 184, flexDirection: 'row' },
  providerImage: { width: 118, minHeight: '100%', opacity: 0.64 },
  providerTextWrap: { flex: 1, padding: 18, justifyContent: 'center' },
  bookNow: { marginTop: 12, color: '#9EF7C2', fontSize: 13, fontWeight: '900' },
});
