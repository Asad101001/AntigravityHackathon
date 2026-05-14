import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import MapPanel from '../components/MapPanel';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config';

const DEFAULT_REGION = { latitude: 24.926, longitude: 67.092, latitudeDelta: 0.08, longitudeDelta: 0.08 };

export default function LocationPickerScreen({ route, navigation }) {
  const [pin, setPin] = useState(route.params?.pickedLocation || { lat: DEFAULT_REGION.latitude, lng: DEFAULT_REGION.longitude, label: 'Gulshan-e-Iqbal Karachi' });

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted' && !route.params?.pickedLocation) {
          const loc = await Location.getCurrentPositionAsync({});
          setPin({ lat: loc.coords.latitude, lng: loc.coords.longitude, label: 'Current location' });
        }
      } catch (error) {
        console.warn('Location permission/current position skipped', error.message);
      }
    })();
  }, []);

  const onPick = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    let label = 'Pinned location';
    try {
      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      const first = geo?.[0];
      label = [first?.district, first?.city, first?.region].filter(Boolean).slice(0, 2).join(', ') || label;
    } catch (error) {}
    setPin({ lat: latitude, lng: longitude, label });
  };

  const confirm = () => navigation.navigate('Home', { pickedLocation: pin });

  return (
    <SafeAreaView style={styles.container}>
      <MapPanel
        style={styles.map}
        initialRegion={{ latitude: pin.lat, longitude: pin.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        onPress={onPick}
        markers={[{ id: 'selected-pin', coordinate: { latitude: pin.lat, longitude: pin.lng }, title: pin.label, pinColor: COLORS.primary }]}
      />
      <View style={styles.sheet}>
        <Text style={styles.kicker}>Map location</Text>
        <Text style={styles.title}>Pick where the service is needed</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={18} color={COLORS.primary} />
          <Text style={styles.locationText}>{pin.label}</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={confirm}>
          <Text style={styles.buttonText}>Use this location</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  map: { flex: 1 },
  sheet: { backgroundColor: COLORS.bgCard, padding: 20, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: COLORS.border },
  kicker: { color: COLORS.primary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 16, backgroundColor: COLORS.chip, padding: 12, borderRadius: 14 },
  locationText: { color: COLORS.textSecondary, fontWeight: '700', flex: 1 },
  button: { backgroundColor: COLORS.primary, borderRadius: 18, alignItems: 'center', paddingVertical: 15 },
  buttonText: { color: '#fff', fontWeight: '900' }
});
