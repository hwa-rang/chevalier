import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Colors } from '../theme/colors';
import type { GameEvent } from '../data/events';

interface Props {
  event: GameEvent | null;
  onChoose: (outcomeIndex: number) => void;
}

export default function EventModal({ event, onChoose }: Props) {
  if (!event) return null;

  const isAnnual = event.type === 'annual';

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, isAnnual && styles.cardAnnual]}>
          <Text style={[styles.typeLabel, isAnnual && styles.typeLabelAnnual]}>
            {isAnnual ? '— Événement annuel —' : '— Événement —'}
          </Text>

          <Text style={styles.title}>{event.title}</Text>

          <Text style={styles.description}>{event.description}</Text>

          <View style={styles.divider} />

          <ScrollView
            style={styles.outcomesScroll}
            showsVerticalScrollIndicator={false}
          >
            {event.outcomes.map((outcome, index) => (
              <TouchableOpacity
                key={index}
                style={styles.outcomeButton}
                onPress={() => onChoose(index)}
                activeOpacity={0.72}
              >
                <Text style={styles.outcomeLabel}>{outcome.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 10, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.parchment,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: 22,
    width: '100%',
    maxHeight: '82%',
  },
  cardAnnual: {
    borderColor: '#8B0000',
    borderWidth: 2,
  },
  typeLabel: {
    fontFamily: 'serif',
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  typeLabelAnnual: {
    color: '#8B0000',
  },
  title: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 26,
  },
  description: {
    fontFamily: 'serif',
    fontSize: 14,
    color: Colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 18,
  },
  outcomesScroll: {
    flexGrow: 0,
  },
  outcomeButton: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 8,
  },
  outcomeLabel: {
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});
