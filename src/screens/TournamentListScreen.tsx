import React from 'react';
import {
  View,
  Text,
  StyleSheet,  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TournamentListScreenProps } from '../navigation/types';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useGameStore } from '../store/gameStore';
import { TOURNAMENTS } from '../data/tournaments';
import type { Tournament } from '../data/tournaments';

const TYPE_LABELS: Record<string, string> = {
  melee: 'Mêlée',
  joust: 'Joûte',
  swordDuel: "Duel à l'épée",
  archery: "Tir à l'arc",
  chess: 'Échecs',
  poetry: 'Poésie',
};

const DISTANCE_LABELS: Record<string, string> = {
  local: 'Local',
  regional: 'Régional',
  distant: 'Lointain',
};

const ITEM_NAMES: Record<string, string> = {
  helmet: 'Heaume',
  gauntlets: 'Gantelets',
  long_sword: 'Épée longue',
  lance: 'Lance',
  axe: 'Hache',
  bow: 'Arc',
  chess_set: "Jeu d'échecs",
  horse: 'Cheval',
};

type BlockReason =
  | { type: 'glory'; required: number }
  | { type: 'gold'; required: number }
  | { type: 'items'; missing: string[] }
  | { type: 'horse' };

function getBlockReasons(
  player: NonNullable<ReturnType<typeof useGameStore.getState>['player']>,
  t: Tournament,
): BlockReason[] {
  const reasons: BlockReason[] = [];
  const total = t.travelCost + t.entryFee;

  if (player.prestige.glory < t.minGlory) {
    reasons.push({ type: 'glory', required: t.minGlory });
  }
  if (player.gold < total) {
    reasons.push({ type: 'gold', required: total });
  }
  const missing = t.requiredItems.filter(
    (req) => !player.inventory.some((item) => item.subtype === req),
  );
  if (missing.length > 0) {
    reasons.push({ type: 'items', missing });
  }
  if (
    t.distance !== 'local' &&
    !player.inventory.some((item) => item.subtype === 'horse')
  ) {
    reasons.push({ type: 'horse' });
  }
  return reasons;
}

function reasonLabel(r: BlockReason): string {
  switch (r.type) {
    case 'glory':
      return `Gloire insuffisante (requiert ${r.required})`;
    case 'gold':
      return `Or insuffisant (requiert ${r.required} g)`;
    case 'items':
      return `Équipement manquant : ${r.missing.map((id) => ITEM_NAMES[id] ?? id).join(', ')}`;
    case 'horse':
      return 'Cheval requis pour ce voyage';
  }
}

export default function TournamentListScreen({ navigation }: TournamentListScreenProps) {
  const player = useGameStore((s) => s.player);
  if (!player) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tournois</Text>
        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => navigation.navigate('EuropeMap')}
        >
          <Text style={styles.mapBtnText}>🗺 Carte</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {TOURNAMENTS.map((t) => {
          const blocked = getBlockReasons(player, t);
          const canEnter = blocked.length === 0;
          const total = t.travelCost + t.entryFee;

          return (
            <View key={t.id} style={styles.card}>
              {/* Card header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardName}>{t.name}</Text>
                  <View
                    style={[
                      styles.distanceBadge,
                      t.distance === 'local' && styles.badgeLocal,
                      t.distance === 'regional' && styles.badgeRegional,
                      t.distance === 'distant' && styles.badgeDistant,
                    ]}
                  >
                    <Text style={styles.badgeText}>{DISTANCE_LABELS[t.distance]}</Text>
                  </View>
                </View>
                <Text style={styles.cardSub}>
                  {t.city} · {t.region} · {TYPE_LABELS[t.type]}
                </Text>
              </View>

              {/* Costs & prizes */}
              <View style={styles.infoRow}>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Coût total</Text>
                  <Text style={styles.infoValue}>{total} g</Text>
                  {t.travelMonths > 0 && (
                    <Text style={styles.infoNote}>
                      {t.travelMonths} mois de voyage
                    </Text>
                  )}
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Récompenses</Text>
                  <Text style={styles.prizeGlory}>+{t.prizeGlory} gloire</Text>
                  <Text style={styles.prizeHonor}>+{t.prizeHonor} honneur</Text>
                  <Text style={styles.prizeRep}>+{t.prizeReputation} réputation</Text>
                  <Text style={styles.prizeMoney}>{t.prizeMoney} g</Text>
                </View>
                {t.minGlory > 0 && (
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoLabel}>Condition</Text>
                    <Text style={styles.infoValue}>Gloire ≥ {t.minGlory}</Text>
                  </View>
                )}
              </View>

              {/* Equipment checklist */}
              {t.requiredItems.length > 0 && (
                <View style={styles.equipRow}>
                  <Text style={styles.equipLabel}>Équipement :</Text>
                  {t.requiredItems.map((req) => {
                    const owned = player.inventory.some((i) => i.subtype === req);
                    return (
                      <Text
                        key={req}
                        style={[styles.equipItem, owned ? styles.equipOwned : styles.equipMissing]}
                      >
                        {owned ? '✓' : '✗'} {ITEM_NAMES[req] ?? req}
                      </Text>
                    );
                  })}
                  {t.distance !== 'local' && (
                    (() => {
                      const hasHorse = player.inventory.some((i) => i.subtype === 'horse');
                      return (
                        <Text
                          style={[styles.equipItem, hasHorse ? styles.equipOwned : styles.equipMissing]}
                        >
                          {hasHorse ? '✓' : '✗'} Cheval
                        </Text>
                      );
                    })()
                  )}
                </View>
              )}

              {/* Block reasons */}
              {blocked.length > 0 && (
                <View style={styles.blockList}>
                  {blocked.map((r, i) => (
                    <Text key={i} style={styles.blockText}>
                      · {reasonLabel(r)}
                    </Text>
                  ))}
                </View>
              )}

              {/* CTA */}
              <TouchableOpacity
                style={[styles.enterBtn, !canEnter && styles.enterBtnDisabled]}
                disabled={!canEnter}
                onPress={() => navigation.navigate('Tournament', { tournamentId: t.id })}
              >
                <Text style={[styles.enterBtnText, !canEnter && styles.enterBtnTextDisabled]}>
                  Voyager et participer
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
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
  },
  backBtn: { marginRight: 8 },
  backText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.accent },
  title: {
    flex: 1,
    fontFamily: Fonts.title,
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  mapBtn: {
    backgroundColor: Colors.surfaceDark,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapBtnText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textPrimary },
  list: { padding: 14, gap: 14 },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  cardHeader: { gap: 2 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardName: {
    flex: 1,
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },

  // Distance badge
  distanceBadge: {
    borderRadius: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeLocal: { backgroundColor: '#C8E6C9' },
  badgeRegional: { backgroundColor: '#FFF9C4' },
  badgeDistant: { backgroundColor: '#FFCCBC' },
  badgeText: { fontFamily: Fonts.bodyBold, fontSize: 11, fontWeight: '700', color: Colors.textPrimary },

  // Info row
  infoRow: { flexDirection: 'row', gap: 10 },
  infoBlock: { flex: 1, gap: 1 },
  infoLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: { fontFamily: Fonts.bodyBold, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  infoNote: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSecondary, fontStyle: 'italic' },
  prizeGlory: { fontFamily: Fonts.bodyBold, fontSize: 12, color: '#B8860B', fontWeight: '700' },
  prizeHonor: { fontFamily: Fonts.bodyBold, fontSize: 12, color: '#7B5EA7', fontWeight: '700' },
  prizeRep: { fontFamily: Fonts.bodyBold, fontSize: 12, color: '#2E7D32', fontWeight: '700' },
  prizeMoney: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary },

  // Equipment
  equipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  equipLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary },
  equipItem: { fontFamily: Fonts.body, fontSize: 12 },
  equipOwned: { color: '#2E7D32' },
  equipMissing: { color: '#C62828' },

  // Block reasons
  blockList: { gap: 2 },
  blockText: { fontFamily: Fonts.body, fontSize: 12, color: '#C62828', fontStyle: 'italic' },

  // CTA button
  enterBtn: {
    backgroundColor: Colors.buttonBg,
    borderRadius: 0,
    paddingVertical: 10,
    alignItems: 'center',
  },
  enterBtnDisabled: {
    backgroundColor: Colors.surfaceDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  enterBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.buttonText,
  },
  enterBtnTextDisabled: { color: Colors.textSecondary },
});
