import React from 'react';
import MapView, { Marker } from 'react-native-maps';

export default function MapPanel({ style, initialRegion, markers = [], onPress }) {
  return (
    <MapView style={style} initialRegion={initialRegion} onPress={onPress}>
      {markers.map((marker) => (
        <Marker
          key={marker.id || marker.title}
          coordinate={marker.coordinate}
          title={marker.title}
          description={marker.description}
          pinColor={marker.pinColor}
        />
      ))}
    </MapView>
  );
}
