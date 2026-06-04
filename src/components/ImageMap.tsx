import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import type { PointOfInterest } from './PixelMap';

// Original SVG/PNG dimensions
const MAP_W = 432;
const MAP_H = 768;

interface Props {
  pois: PointOfInterest[];
  onPoiPress: (poi: PointOfInterest) => void;
}

export default function ImageMap({ pois, onPoiPress }: Props) {
  const { width } = useWindowDimensions();
  const scale = width / MAP_W;
  const displayH = MAP_H * scale;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ width, height: displayH }}
    >
      <View style={{ width, height: displayH }}>
        {/* Village map background */}
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../../assets/maps/village-map.png')}
          style={{ width, height: displayH }}
          resizeMode="stretch"
        />

        {/* POI markers — x/y are in the original 432×768 space */}
        {pois.map((poi) => {
          const px = poi.x * scale;
          const py = poi.y * scale;
          const color = poi.locked ? '#888888' : poi.color;

          return (
            <TouchableOpacity
              key={poi.id}
              style={[styles.poiBtn, { left: px - 16, top: py - 16 }]}
              onPress={() => onPoiPress(poi)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.poiCircle,
                  { backgroundColor: color },
                  poi.locked && styles.poiCircleLocked,
                ]}
              >
                <Text style={styles.poiIcon}>{poi.icon}</Text>
              </View>
              <View style={styles.labelWrap}>
                <Text
                  style={[styles.poiLabel, poi.locked && styles.poiLabelLocked]}
                  numberOfLines={1}
                >
                  {poi.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  poiBtn: {
    position: 'absolute',
    alignItems: 'center',
    width: 40,
  },
  poiCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 4,
  },
  poiCircleLocked: {
    opacity: 0.55,
  },
  poiIcon: {
    fontSize: 15,
    lineHeight: 18,
  },
  labelWrap: {
    backgroundColor: 'rgba(0,0,0,0.60)',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginTop: 2,
    maxWidth: 48,
  },
  poiLabel: {
    fontFamily: 'serif',
    fontSize: 7,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  poiLabelLocked: {
    color: '#aaa',
    fontStyle: 'italic',
  },
});
