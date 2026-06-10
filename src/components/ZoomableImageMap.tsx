import React, { useRef, useState } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { Fonts } from '../theme/fonts';
import PixelBubble from './PixelBubble';
import type { PointOfInterest } from './PixelMap';

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

interface Props {
  source: ImageSourcePropType;
  /** Coordinate space of the POI x/y values (original image pixels). */
  mapWidth: number;
  mapHeight: number;
  pois: PointOfInterest[];
  onPoiPress: (poi: PointOfInterest) => void;
  /** 'contain' letterboxes the whole map at zoom 1; 'cover' fills the container. */
  fit?: 'contain' | 'cover';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function distance(touches: { pageX: number; pageY: number }[]) {
  const dx = touches[0].pageX - touches[1].pageX;
  const dy = touches[0].pageY - touches[1].pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

function midpoint(touches: { pageX: number; pageY: number }[]) {
  return {
    x: (touches[0].pageX + touches[1].pageX) / 2,
    y: (touches[0].pageY + touches[1].pageY) / 2,
  };
}

/**
 * Pinch-to-zoom / drag-to-pan image map with tappable POI markers.
 * Markers are counter-scaled so they keep a constant on-screen size.
 */
export default function ZoomableImageMap({ source, mapWidth, mapHeight, pois, onPoiPress, fit = 'contain' }: Props) {
  const [box, setBox] = useState({ w: 0, h: 0 });

  const zoom = useRef(new Animated.Value(MIN_ZOOM)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const inverseZoom = useRef(Animated.divide(new Animated.Value(1), zoom)).current;

  // Animated values can't be read synchronously — mirror them here.
  const current = useRef({ zoom: MIN_ZOOM, tx: 0, ty: 0 });
  // Gesture baseline, re-anchored whenever the number of fingers changes.
  const gesture = useRef({
    touches: 0,
    zoom: MIN_ZOOM,
    tx: 0,
    ty: 0,
    dist: 1,
    mid: { x: 0, y: 0 },
    pan: { x: 0, y: 0 },
  });
  const boxRef = useRef(box);
  boxRef.current = box;

  // Zoom 1 = map fitted to the container ('contain') or filling it ('cover').
  const fitScale = (w: number, h: number) =>
    fit === 'cover' ? Math.max(w / mapWidth, h / mapHeight) : Math.min(w / mapWidth, h / mapHeight);
  const baseScale = box.w > 0 ? fitScale(box.w, box.h) : 0;
  const dispW = mapWidth * baseScale;
  const dispH = mapHeight * baseScale;

  const apply = (z: number, tx: number, ty: number) => {
    const { w, h } = boxRef.current;
    const bs = fitScale(w, h);
    const maxTx = Math.max(0, (mapWidth * bs * z - w) / 2);
    const maxTy = Math.max(0, (mapHeight * bs * z - h) / 2);
    const c = { tx: clamp(tx, -maxTx, maxTx), ty: clamp(ty, -maxTy, maxTy) };
    current.current = { zoom: z, tx: c.tx, ty: c.ty };
    zoom.setValue(z);
    translateX.setValue(c.tx);
    translateY.setValue(c.ty);
  };

  const rebase = (touches: { pageX: number; pageY: number }[]) => {
    gesture.current = {
      touches: touches.length,
      zoom: current.current.zoom,
      tx: current.current.tx,
      ty: current.current.ty,
      dist: touches.length >= 2 ? distance(touches) : 1,
      mid: touches.length >= 2 ? midpoint(touches) : { x: 0, y: 0 },
      pan: touches.length === 1 ? { x: touches[0].pageX, y: touches[0].pageY } : { x: 0, y: 0 },
    };
  };

  const responder = useRef(
    PanResponder.create({
      // Let taps reach the POI buttons; claim the gesture only on movement or pinch.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, g) =>
        evt.nativeEvent.touches.length >= 2 || Math.abs(g.dx) + Math.abs(g.dy) > 8,
      onMoveShouldSetPanResponderCapture: (evt) => evt.nativeEvent.touches.length >= 2,
      onPanResponderGrant: (evt) => rebase(evt.nativeEvent.touches),
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length !== gesture.current.touches) {
          rebase(touches);
          return;
        }
        const g = gesture.current;
        const { w, h } = boxRef.current;
        if (touches.length >= 2) {
          // Pinch: zoom around the midpoint between the two fingers.
          const z = clamp((distance(touches) / g.dist) * g.zoom, MIN_ZOOM, MAX_ZOOM);
          const m = midpoint(touches);
          const ratio = z / g.zoom;
          const cx = w / 2;
          const cy = h / 2;
          apply(
            z,
            m.x - cx - ratio * (g.mid.x - cx - g.tx),
            m.y - cy - ratio * (g.mid.y - cy - g.ty),
          );
        } else if (touches.length === 1) {
          apply(
            g.zoom,
            g.tx + touches[0].pageX - g.pan.x,
            g.ty + touches[0].pageY - g.pan.y,
          );
        }
      },
    }),
  ).current;

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (Math.abs(width - box.w) > 0.5 || Math.abs(height - box.h) > 0.5) {
          setBox({ w: width, h: height });
          apply(current.current.zoom, current.current.tx, current.current.ty);
        }
      }}
      {...responder.panHandlers}
    >
      {box.w > 0 && (
        <Animated.View
          style={{
            width: dispW,
            height: dispH,
            transform: [{ translateX }, { translateY }, { scale: zoom }],
          }}
        >
          <Image source={source} style={{ width: dispW, height: dispH }} fadeDuration={0} />

          {pois.map((poi) => {
            const px = poi.x * baseScale;
            const py = poi.y * baseScale;
            const color = poi.locked ? '#888888' : poi.color;
            return (
              <Animated.View
                key={poi.id}
                style={[
                  styles.poiAnchor,
                  { left: px - 22, top: py - 22, transform: [{ scale: inverseZoom }] },
                ]}
              >
                <TouchableOpacity
                  style={styles.poiBtn}
                  onPress={() => onPoiPress(poi)}
                  activeOpacity={0.75}
                >
                  <View style={poi.locked ? styles.bubbleLocked : undefined}>
                    <PixelBubble color={color} size={26} />
                  </View>
                </TouchableOpacity>
                <View style={styles.labelWrap} pointerEvents="none">
                  <Text
                    style={[styles.poiLabel, poi.locked && styles.poiLabelLocked]}
                    numberOfLines={1}
                  >
                    {poi.label}
                  </Text>
                </View>
              </Animated.View>
            );
          })}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3a6285', // ocean blue, hides the letterbox around the map
  },
  poiAnchor: {
    position: 'absolute',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poiBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleLocked: {
    opacity: 0.5,
  },
  // Positioned absolutely so it doesn't grow the 44×44 anchor box
  // (keeps the counter-scale transform centered on the bubble).
  labelWrap: {
    position: 'absolute',
    top: 36,
    backgroundColor: 'rgba(0,0,0,0.60)',
    paddingHorizontal: 3,
    paddingVertical: 1,
    maxWidth: 70,
  },
  poiLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 8,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  poiLabelLocked: {
    color: '#aaa',
    fontStyle: 'italic',
  },
});
