import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Fonts } from '../theme/fonts';
import PixelBubble from './PixelBubble';
import type { PointOfInterest } from './PixelMap';

// Original PNG dimensions
const MAP_W = 432;
const MAP_H = 768;

interface Props {
  pois: PointOfInterest[];
  onPoiPress: (poi: PointOfInterest) => void;
}

export default function ImageMap({ pois, onPoiPress }: Props) {
  // Measure the actual available width rather than trusting window dimensions
  // (avoids the map overflowing on the right on some devices).
  const [boxW, setBoxW] = useState(0);
  const width = boxW;
  const scale = width / MAP_W;
  const displayH = MAP_H * scale;

  return (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w && Math.abs(w - boxW) > 0.5) setBoxW(w);
      }}
      contentContainerStyle={{ width, height: displayH }}
    >
      {width > 0 && (
      <View style={{ width, height: displayH, overflow: 'hidden' }}>
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
              <View style={poi.locked ? styles.bubbleLocked : undefined}>
                <PixelBubble color={color} size={30} />
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
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    alignSelf: 'stretch',
  },
  poiBtn: {
    position: 'absolute',
    alignItems: 'center',
    width: 40,
  },
  bubbleLocked: {
    opacity: 0.5,
  },
  labelWrap: {
    backgroundColor: 'rgba(0,0,0,0.60)',
    borderRadius: 0,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginTop: 2,
    maxWidth: 48,
  },
  poiLabel: {
    fontFamily: Fonts.bodyBold,
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
