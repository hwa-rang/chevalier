import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useGameStore } from '../store/gameStore';
import { ambitionById, ambitionProgress } from '../data/ambitions';
import type { Player } from '../types/game';

type Props = NativeStackScreenProps<RootStackParamList, 'Legend'>;

// ── Legend scoring ────────────────────────────────────────────────────────────

function legendScore(p: Player): number {
  const prog = ambitionProgress(p);
  let score = 0;
  score += Math.max(0, p.prestige.glory) * 0.35;            // 0–35
  score += Math.max(0, p.prestige.honor) * 0.15;            // 0–15
  score += Math.max(0, p.prestige.reputation) * 0.15;       // 0–15
  score += Math.min(20, p.tournamentRecord.wins * 4);       // 0–20
  score += Math.min(10, p.followers);                       // 0–10
  score += prog.fulfilled ? 25 : (prog.done / Math.max(1, prog.total)) * 10;
  return Math.min(100, Math.round(score));
}

function epitaph(score: number): string {
  if (score < 20) return 'Oublié de tous';
  if (score < 40) return 'Une vie modeste';
  if (score < 60) return 'Un nom respecté';
  if (score < 80) return 'Une renommée durable';
  return 'Une légende immortelle';
}

function epitaphFlavor(score: number): string {
  if (score < 20) return "Nul barde ne chantera votre nom. La terre vous reprend, comme tant d'autres.";
  if (score < 40) return 'Votre village se souviendra de vous une génération, peut-être deux.';
  if (score < 60) return 'Dans la région, on raconte encore vos faits à la veillée.';
  if (score < 80) return 'Les chroniqueurs ont couché votre nom sur le parchemin.';
  return "Votre nom traversera les siècles, chanté de cour en cour à travers l'Europe.";
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function LegendScreen({ navigation }: Props) {
  const player = useGameStore((s) => s.player);
  if (!player) return null;

  const amb = ambitionById(player.ambition);
  const prog = ambitionProgress(player);
  const score = legendScore(player);
  const highlights = [...player.history].slice(-8).reverse();

  const startNewLife = () => {
    navigation.reset({
      index: 1,
      routes: [{ name: 'MainMenu' }, { name: 'CharacterCreation' }],
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Epitaph */}
        <Text style={styles.cross}>✝</Text>
        <Text style={styles.name}>{player.name}</Text>
        <Text style={styles.dates}>
          {player.currentYear - player.age} – {player.currentYear} · {player.age} ans
        </Text>
        {player.deathCause ? <Text style={styles.cause}>{player.deathCause}</Text> : null}

        <View style={styles.divider} />

        {/* Score */}
        <Text style={styles.epitaph}>{epitaph(score)}</Text>
        <Text style={styles.score}>Légende : {score}/100</Text>
        <Text style={styles.flavor}>{epitaphFlavor(score)}</Text>

        {/* Ambition */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Destinée</Text>
          <Text style={styles.ambitionName}>
            {amb.label}{prog.fulfilled ? '  ✦ Accomplie' : '  — Inachevée'}
          </Text>
          <Text style={styles.cardLine}>
            {prog.done}/{prog.total} objectifs accomplis
          </Text>
        </View>

        {/* Life summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Une vie en chiffres</Text>
          <Row label="Gloire" value={String(Math.round(player.prestige.glory))} />
          <Row label="Honneur" value={String(Math.round(player.prestige.honor))} />
          <Row label="Réputation" value={String(Math.round(player.prestige.reputation))} />
          <Row
            label="Tournois"
            value={`${player.tournamentRecord.wins} V · ${player.tournamentRecord.losses} D`}
          />
          {player.tournamentRecord.titles.length > 0 && (
            <Row label="Titres" value={String(player.tournamentRecord.titles.length)} />
          )}
          <Row label="Or amassé" value={`${player.gold} g`} />
          <Row label="Partisans" value={String(player.followers)} />
          <Row label="Livres lus" value={String((player.readBooks ?? []).length)} />
        </View>

        {/* Last deeds */}
        {highlights.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Derniers faits</Text>
            {highlights.map((h, i) => (
              <Text key={i} style={styles.historyLine}>
                · {h.text}
              </Text>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.newLifeBtn} onPress={startNewLife} activeOpacity={0.85}>
          <Text style={styles.newLifeText}>Commencer une nouvelle vie</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.parchment,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'stretch',
  },
  cross: {
    fontSize: 34,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  name: {
    fontFamily: Fonts.title,
    fontSize: 44,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 6,
  },
  dates: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  cause: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
  },
  divider: {
    height: 2,
    backgroundColor: Colors.accent,
    width: 64,
    alignSelf: 'center',
    marginVertical: 18,
  },
  epitaph: {
    fontFamily: Fonts.title,
    fontSize: 30,
    color: Colors.accent,
    textAlign: 'center',
  },
  score: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  flavor: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
    lineHeight: 19,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
    gap: 4,
  },
  cardTitle: {
    fontFamily: Fonts.title,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  ambitionName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.accent,
  },
  cardLine: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  rowValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  historyLine: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  newLifeBtn: {
    backgroundColor: Colors.buttonBg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  newLifeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.buttonText,
    letterSpacing: 0.5,
  },
});
