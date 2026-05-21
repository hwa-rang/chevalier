import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useGameStore } from '../store/gameStore';
import type { Relation, RelationType } from '../types/game';

type Props = NativeStackScreenProps<RootStackParamList, 'Relations'>;

const TYPE_LABELS: Record<RelationType, string> = {
  father: 'Père',
  mother: 'Mère',
  sibling: 'Frère/Sœur',
  priest: 'Prêtre',
  friend: 'Ami',
  master: 'Maître',
  lover: 'Amour',
  enemy: 'Ennemi',
  stranger: 'Inconnu',
};

function ScoreBar({ score }: { score: number }) {
  const pct = ((score + 100) / 200) * 100;
  const barColor = score >= 0 ? '#5A8A3A' : '#9A3A2A';
  return (
    <View style={styles.scoreBarTrack}>
      <View style={[styles.scoreBarFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      <Text style={styles.scoreBarLabel}>{score > 0 ? `+${score}` : score}</Text>
    </View>
  );
}

function RelationCard({ relation, onPress }: { relation: Relation; onPress: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{relation.name}</Text>
          <Text style={styles.cardMeta}>
            {TYPE_LABELS[relation.type]} · {relation.age} ans
          </Text>
        </View>
        <TouchableOpacity style={styles.interactBtn} onPress={onPress}>
          <Text style={styles.interactBtnText}>Interagir</Text>
        </TouchableOpacity>
      </View>
      <ScoreBar score={relation.score} />
    </View>
  );
}

export default function RelationsScreen({ navigation }: Props) {
  const player = useGameStore((s) => s.player);
  if (!player) return null;

  const grouped: Partial<Record<RelationType, Relation[]>> = {};
  for (const r of player.relations) {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type]!.push(r);
  }

  const order: RelationType[] = ['lover', 'father', 'mother', 'sibling', 'master', 'friend', 'priest', 'stranger', 'enemy'];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Relations</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {player.relations.length === 0 && (
          <Text style={styles.empty}>Vous n'avez aucune relation pour le moment.</Text>
        )}
        {order.map((type) => {
          const group = grouped[type];
          if (!group || group.length === 0) return null;
          return (
            <View key={type}>
              <Text style={styles.groupLabel}>{TYPE_LABELS[type]}</Text>
              {group.map((rel) => (
                <RelationCard
                  key={rel.personId}
                  relation={rel}
                  onPress={() =>
                    navigation.navigate('RelationDetail', { personId: rel.personId })
                  }
                />
              ))}
            </View>
          );
        })}

        {player.griefModifiers.length > 0 && (
          <View style={styles.griefBox}>
            <Text style={styles.griefTitle}>Deuil en cours</Text>
            {player.griefModifiers.map((gm, i) => (
              <Text key={i} style={styles.griefItem}>
                · {gm.personName} — pénalité active encore {gm.expiresAtAbsoluteMonth - (player.currentYear * 12 + player.currentMonth)} mois
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.parchment },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backText: { fontFamily: 'serif', fontSize: 14, color: Colors.accent },
  title: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: { padding: 16, gap: 6 },
  groupLabel: {
    fontFamily: 'serif',
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { flex: 1 },
  cardName: {
    fontFamily: 'serif',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardMeta: { fontFamily: 'serif', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  interactBtn: {
    backgroundColor: Colors.buttonBg,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  interactBtnText: { fontFamily: 'serif', fontSize: 12, fontWeight: '700', color: Colors.buttonText },
  scoreBarTrack: {
    height: 10,
    backgroundColor: Colors.surfaceDark,
    borderRadius: 5,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  scoreBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 5 },
  scoreBarLabel: {
    fontFamily: 'serif',
    fontSize: 9,
    color: Colors.textPrimary,
    textAlign: 'center',
    zIndex: 1,
  },
  empty: { fontFamily: 'serif', fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 40 },
  griefBox: {
    marginTop: 20,
    backgroundColor: Colors.surfaceDark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 4,
  },
  griefTitle: { fontFamily: 'serif', fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  griefItem: { fontFamily: 'serif', fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },
});
