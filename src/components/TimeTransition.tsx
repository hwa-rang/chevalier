import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Fonts } from '../theme/fonts';
import { useGameStore } from '../store/gameStore';
import { navigationRef } from '../navigation/navigationRef';

type Active = { kind: 'month' | 'year' | 'death'; fromYear: number; toYear: number };

/**
 * Global fade-to-black overlay played whenever time advances.
 * - Month: a quick fade out/in.
 * - Year: fades to black, the year visibly changes (from → to) on the black
 *   screen, then fades back to reveal the character sheet.
 * Navigation to the character screen happens while fully black, and the
 * deferred annual/monthly event is surfaced only once the fade completes.
 */
export default function TimeTransition() {
  const transition = useGameStore((s) => s.timeTransition);
  const endTimeTransition = useGameStore((s) => s.endTimeTransition);

  const opacity = useRef(new Animated.Value(0)).current;
  const swap = useRef(new Animated.Value(0)).current; // 0 → fromYear, 1 → toYear
  const runningRef = useRef(false);
  const [active, setActive] = useState<Active | null>(null);

  useEffect(() => {
    if (!transition || runningRef.current) return;
    runningRef.current = true;
    setActive(transition);
    opacity.setValue(0);
    swap.setValue(0);

    const isYear = transition.kind === 'year';
    const isDeath = transition.kind === 'death';

    Animated.timing(opacity, {
      toValue: 1,
      duration: isDeath ? 900 : 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      // Fully black — move behind the curtain (legend screen on death).
      if (navigationRef.isReady()) {
        navigationRef.navigate(isDeath ? 'Legend' : 'Character');
      }

      const middle = isDeath
        ? Animated.delay(2000)
        : isYear
        ? Animated.sequence([
            Animated.delay(450),
            Animated.timing(swap, {
              toValue: 1,
              duration: 650,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.delay(550),
          ])
        : Animated.delay(1000);

      Animated.sequence([
        middle,
        Animated.timing(opacity, {
          toValue: 0,
          duration: 480,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        runningRef.current = false;
        setActive(null);
        endTimeTransition();
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transition]);

  if (!active) return null;

  const isYear = active.kind === 'year';
  const fromOpacity = swap.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="auto">
      {active.kind === 'death' ? (
        <View style={styles.center}>
          <Text style={styles.label}>An {active.toYear}</Text>
          <Text style={styles.phrase}>Votre histoire s'achève…</Text>
        </View>
      ) : isYear ? (
        <View style={styles.center}>
          <Text style={styles.label}>L'année passe…</Text>
          <View style={styles.yearWrap}>
            <Animated.Text style={[styles.year, styles.yearAbs, { opacity: fromOpacity }]}>
              {active.fromYear}
            </Animated.Text>
            <Animated.Text style={[styles.year, { opacity: swap }]}>
              {active.toYear}
            </Animated.Text>
          </View>
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={styles.phrase}>Le mois passe…</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  center: {
    alignItems: 'center',
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#C4A35A',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 22,
  },
  yearWrap: {
    height: 72,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  year: {
    fontFamily: Fonts.title,
    fontSize: 64,
    color: '#F5EDD6',
    letterSpacing: 4,
  },
  yearAbs: {
    position: 'absolute',
  },
  phrase: {
    fontFamily: Fonts.title,
    fontSize: 36,
    color: '#F5EDD6',
    letterSpacing: 2,
  },
});
