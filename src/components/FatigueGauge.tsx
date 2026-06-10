import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { ENERGY_CAPACITY } from '../store/gameStore';

/**
 * Single fatigue/energy gauge for the monthly action budget.
 * A principal action spends ½ the gauge, a secondary ⅛. Empty = exhausted.
 */
export default function FatigueGauge({ used }: { used: number }) {
  const remaining = Math.max(0, ENERGY_CAPACITY - used);
  const pct = (remaining / ENERGY_CAPACITY) * 100;
  const exhausted = remaining <= 0;
  const color = exhausted ? '#9A3A2A' : pct <= 25 ? '#C77A2A' : pct <= 50 ? '#B8860B' : '#3A7D44';
  const state = exhausted
    ? 'Épuisé'
    : pct <= 25
    ? 'Très fatigué'
    : pct <= 50
    ? 'Fatigué'
    : 'Reposé';

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Énergie</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.state, exhausted && styles.exhausted]}>{state}</Text>
    </View>
  );
}

/** Red health bar (current / max HP). */
export function HealthGauge({ health, maxHealth }: { health: number; maxHealth: number }) {
  const max = Math.max(1, maxHealth);
  const hp = Math.max(0, Math.min(max, health));
  const pct = (hp / max) * 100;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Vie</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` as any, backgroundColor: '#C0392B' }]} />
      </View>
      <Text style={[styles.state, hp <= max * 0.3 && styles.exhausted]}>
        {hp}/{max}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  track: {
    flex: 1,
    height: 12,
    borderRadius: 0,
    backgroundColor: Colors.parchment,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 0,
  },
  state: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    minWidth: 78,
    textAlign: 'right',
  },
  exhausted: {
    color: '#9A3A2A',
  },
});
