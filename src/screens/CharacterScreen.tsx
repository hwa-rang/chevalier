import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CharacterScreenProps } from '../navigation/types';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useGameStore, energyUsed } from '../store/gameStore';
import CharacterSprite from '../components/CharacterSprite';
import FatigueGauge, { HealthGauge } from '../components/FatigueGauge';
import { TITLES, titleById, DEFAULT_TITLE_ID } from '../data/titles';

const BACKGROUND_LABELS: Record<string, string> = {
  noble: 'Noble',
  merchant: 'Marchand',
  blacksmith: 'Forgeron',
  farmer: 'Paysan',
  clergy: 'Clergé',
  outlaw: 'Hors-la-loi',
};

function fameTier(glory: number): string {
  if (glory < 20) return 'Inconnu';
  if (glory < 50) return 'Combattant local';
  if (glory < 70) return 'Champion régional';
  if (glory < 90) return 'Chevalier renommé';
  return "Légende de l'Europe";
}

function fameTierColor(glory: number): string {
  if (glory < 20) return Colors.textSecondary;
  if (glory < 50) return '#5D4037';
  if (glory < 70) return '#1565C0';
  if (glory < 90) return '#6A1B9A';
  return '#B8860B';
}

export default function CharacterScreen({ navigation }: CharacterScreenProps) {
  const player = useGameStore((s) => s.player);
  const setTitle = useGameStore((s) => s.setTitle);
  const spriteScale = useRef(new Animated.Value(1)).current;
  const prevInvLen  = useRef(player?.inventory.length ?? 0);

  useEffect(() => {
    const len = player?.inventory.length ?? 0;
    if (len > prevInvLen.current) {
      Animated.spring(spriteScale, {
        toValue: 1.08,
        useNativeDriver: true,
        speed: 30,
        bounciness: 10,
      }).start(() => {
        Animated.spring(spriteScale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
      });
    }
    prevInvLen.current = len;
  }, [player?.inventory.length]);

  if (!player) return null;

  const { prestige, tournamentRecord, physicalStats, combatSkills, knowledgeSkills } = player;
  const tier = fameTier(prestige.glory);
  const tierColor = fameTierColor(prestige.glory);

  const recentHistory = [...player.history].reverse().slice(0, 6);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Personnage</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>

        {/* ── Character viewer — name, title, identity all under the portrait ── */}
        <View style={styles.viewerContainer}>
          <Animated.View style={[styles.spriteBackdrop, { transform: [{ scale: spriteScale }] }]}>
            <CharacterSprite player={player} flipped={false} />
          </Animated.View>
          <Text style={styles.viewerName}>{player.name}</Text>
          <Text style={styles.viewerTitle}>
            « {titleById(player.title ?? DEFAULT_TITLE_ID).label} »
          </Text>
          <Text style={styles.viewerAge}>{player.age} ans</Text>
          <Text style={[styles.viewerTier, { color: tierColor }]}>{tier}</Text>
          <View style={styles.viewerMetaRow}>
            <Text style={styles.viewerMeta}>
              {BACKGROUND_LABELS[player.background] ?? player.background}
            </Text>
            <Text style={styles.viewerMetaDot}>·</Text>
            <Text style={styles.viewerMeta}>{player.gold} g</Text>
          </View>
          <View style={styles.viewerActions}>
            <TouchableOpacity onPress={() => navigation.navigate('Inventory')} style={styles.flipBtn}>
              <Text style={styles.flipBtnText}>Équipement</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Condition: health + energy */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Condition</Text>
          <View style={{ paddingVertical: 4, gap: 10 }}>
            <HealthGauge
              health={player.health ?? player.maxHealth ?? 100}
              maxHealth={player.maxHealth ?? 100}
            />
            <FatigueGauge used={energyUsed(player)} />
          </View>
        </View>

        {/* Titles */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Titres</Text>
          {TITLES.filter((t) => (player.unlockedTitles ?? [DEFAULT_TITLE_ID]).includes(t.id)).map(
            (t) => {
              const current = (player.title ?? DEFAULT_TITLE_ID) === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.titleRow, current && styles.titleRowCurrent]}
                  onPress={() => setTitle(t.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.titleLabel, current && styles.titleLabelCurrent]}>
                    {current ? '✦ ' : ''}{t.label}
                  </Text>
                  <Text style={styles.titleDesc}>{t.desc}</Text>
                </TouchableOpacity>
              );
            },
          )}
          <Text style={styles.titleHint}>
            {TITLES.length - (player.unlockedTitles ?? [DEFAULT_TITLE_ID]).length} titres restent à découvrir…
          </Text>
        </View>

        {/* Prestige */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Prestige</Text>
          <PrestigeBar label="Gloire" value={prestige.glory} color="#B8860B" />
          <PrestigeBar label="Honneur" value={prestige.honor} color="#7B5EA7" />
          <PrestigeBar label="Réputation" value={prestige.reputation} color="#2E7D32" />
          <StatRow label="Partisans" value={String(player.followers)} />
        </View>

        {/* Tournament career */}
        <View style={[styles.card, styles.cardTournament]}>
          <Text style={styles.cardTitle}>Carrière des tournois</Text>

          <View style={styles.fameRow}>
            <Text style={styles.fameLabel}>Renommée</Text>
            <Text style={[styles.fameTier, { color: tierColor }]}>{tier}</Text>
          </View>

          <View style={styles.recordRow}>
            <View style={styles.recordBox}>
              <Text style={styles.recordNumber}>{tournamentRecord.wins}</Text>
              <Text style={styles.recordLabel}>Victoires</Text>
            </View>
            <View style={styles.recordDivider} />
            <View style={styles.recordBox}>
              <Text style={[styles.recordNumber, styles.recordLoss]}>{tournamentRecord.losses}</Text>
              <Text style={styles.recordLabel}>Défaites</Text>
            </View>
          </View>

          {tournamentRecord.titles.length > 0 ? (
            <View style={styles.titlesBlock}>
              <Text style={styles.titlesLabel}>Titres obtenus :</Text>
              {tournamentRecord.titles.map((t, i) => (
                <Text key={i} style={styles.titleItem}>· {t}</Text>
              ))}
            </View>
          ) : (
            <Text style={styles.noTitles}>Aucun titre pour l'instant.</Text>
          )}
        </View>

        {/* Combat skills */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Combat</Text>
          <StatRow label="Épée longue" value={String(combatSkills.longSword)} />
          <StatRow label="Lance" value={String(combatSkills.lance)} />
          <StatRow label="Hache" value={String(combatSkills.axe)} />
          <StatRow label="Épée & Bouclier" value={String(combatSkills.swordAndShield)} />
          <StatRow label="Arme lourde" value={String(combatSkills.heavyWeapon)} />
          <StatRow label="Tir à l'arc" value={String(combatSkills.archery)} />
        </View>

        {/* Physical stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Physique</Text>
          <StatRow label="Force" value={String(physicalStats.strength)} />
          <StatRow label="Agilité" value={String(physicalStats.agility)} />
          <StatRow label="Endurance" value={String(physicalStats.endurance)} />
          <StatRow label="Vitesse" value={String(physicalStats.speed)} />
        </View>

        {/* Knowledge skills */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Savoir</Text>
          <StatRow label="Culture générale" value={String(knowledgeSkills.generalCulture)} />
          <StatRow label="Littérature" value={String(knowledgeSkills.literature)} />
          <StatRow label="Religion" value={String(knowledgeSkills.religion)} />
          <StatRow label="Médecine" value={String(knowledgeSkills.medicine)} />
          <StatRow label="Stratégie" value={String(knowledgeSkills.strategy)} />
          <StatRow label="Éloquence" value={String(knowledgeSkills.eloquence)} />
          <StatRow label="Connaissances apocryphes" value={String(knowledgeSkills.apocryphal ?? 0)} />
        </View>

        {/* Recent history */}
        {recentHistory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Faits récents</Text>
            {recentHistory.map((h, i) => (
              <View key={i} style={styles.historyItem}>
                <Text style={styles.historyMeta}>
                  {h.age} ans, mois {h.month}
                </Text>
                <Text style={styles.historyText}>{h.text}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function PrestigeBar({ label, value, color }: { label: string; value: number; color: string }) {
  const clamped = Math.max(-100, Math.min(100, value));
  const pct = ((clamped + 100) / 200) * 100; // 0–100%
  return (
    <View style={styles.prestigeRow}>
      <Text style={styles.prestigeLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.prestigeValue, { color }]}>{Math.round(value)}</Text>
    </View>
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
  },
  backBtn: { minWidth: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.accent },
  title: {
    flex: 1,
    fontFamily: Fonts.title,
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  body: { padding: 14, gap: 12, alignItems: 'stretch' },

  // Character viewer
  viewerContainer: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    gap: 4,
  },
  spriteBackdrop: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 8,
  },
  viewerName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  viewerAge: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  viewerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  viewerMeta: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  viewerMetaDot: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  viewerTitle: {
    fontFamily: Fonts.title,
    fontSize: 25,
    color: Colors.accent,
  },
  titleRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceDark,
  },
  titleRowCurrent: {
    backgroundColor: Colors.surfaceDark,
    paddingHorizontal: 8,
  },
  titleLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  titleLabelCurrent: {
    color: Colors.accent,
  },
  titleDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  titleHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 6,
  },
  viewerTier: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  flipBtn: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceDark,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  flipBtnText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  viewerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 6,
  },
  cardTournament: {
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  cardTitle: {
    fontFamily: Fonts.title,
    fontSize: 28,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 6,
  },

  // Stat row
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary },
  statValue: { fontFamily: Fonts.bodyBold, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },

  // Prestige bars
  prestigeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prestigeLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary, width: 90 },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceDark,
    borderRadius: 0,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 0 },
  prestigeValue: { fontFamily: Fonts.bodyBold, fontSize: 13, fontWeight: '700', width: 30, textAlign: 'right' },

  // Tournament career
  fameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fameLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary },
  fameTier: { fontFamily: Fonts.bodyBold, fontSize: 15, fontWeight: '700' },

  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 8,
  },
  recordBox: { alignItems: 'center', gap: 2 },
  recordNumber: {
    fontFamily: Fonts.bodyBold,
    fontSize: 28,
    fontWeight: '700',
    color: '#2E7D32',
  },
  recordLoss: { color: '#C62828' },
  recordLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSecondary, textTransform: 'uppercase' },
  recordDivider: { width: 1, height: 40, backgroundColor: Colors.border },

  titlesBlock: { gap: 3 },
  titlesLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },
  titleItem: { fontFamily: Fonts.body, fontSize: 13, color: Colors.accent, fontStyle: 'italic' },
  noTitles: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' },

  // History
  historyItem: { gap: 1, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: Colors.surfaceDark },
  historyMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSecondary },
  historyText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textPrimary },
});
