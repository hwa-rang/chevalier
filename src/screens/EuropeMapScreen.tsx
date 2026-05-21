import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useGameStore } from '../store/gameStore';
import PixelMap from '../components/PixelMap';
import BottomSheet from '../components/BottomSheet';
import {
  EUROPE_MAP,
  TOURNAMENT_TYPE_COLORS,
  TOURNAMENT_TYPE_ICONS,
  TOURNAMENT_TYPE_LABELS,
  buildEuropePois,
} from '../data/europemap';
import { TOURNAMENTS } from '../data/tournaments';
import type { Tournament, TournamentType } from '../data/tournaments';
import type { PointOfInterest } from '../components/PixelMap';

type Props = NativeStackScreenProps<RootStackParamList, 'EuropeMap'>;

// ─── Reusable block-reason logic (mirrors TournamentListScreen) ───────────────

type BlockReason =
  | { type: 'glory'; required: number }
  | { type: 'gold'; required: number }
  | { type: 'items'; missing: string[] }
  | { type: 'horse' };

const ITEM_NAMES: Record<string, string> = {
  helmet: 'Heaume', gauntlets: 'Gantelets', long_sword: 'Épée longue',
  lance: 'Lance', axe: 'Hache', bow: 'Arc', chess_set: "Jeu d'échecs", horse: 'Cheval',
};

function getBlockReasons(
  player: NonNullable<ReturnType<typeof useGameStore.getState>['player']>,
  t: Tournament,
): BlockReason[] {
  const reasons: BlockReason[] = [];
  const total = t.travelCost + t.entryFee;
  if (player.prestige.glory < t.minGlory) reasons.push({ type: 'glory', required: t.minGlory });
  if (player.gold < total) reasons.push({ type: 'gold', required: total });
  const missing = t.requiredItems.filter((r) => !player.inventory.some((i) => i.subtype === r));
  if (missing.length > 0) reasons.push({ type: 'items', missing });
  if (t.distance !== 'local' && !player.inventory.some((i) => i.subtype === 'horse')) {
    reasons.push({ type: 'horse' });
  }
  return reasons;
}

function reasonLabel(r: BlockReason): string {
  switch (r.type) {
    case 'glory':  return `Gloire insuffisante (requiert ${r.required})`;
    case 'gold':   return `Or insuffisant (requiert ${r.required} g)`;
    case 'items':  return `Équipement manquant : ${r.missing.map((id) => ITEM_NAMES[id] ?? id).join(', ')}`;
    case 'horse':  return 'Cheval requis pour ce voyage';
  }
}

function travelFlavor(t: Tournament): string {
  if (t.travelMonths === 0) return 'À quelques heures de marche de votre village.';
  const days = t.travelMonths * 30;
  return `À ${days} jours de marche de votre village.`;
}

const DISTANCE_LABELS: Record<string, string> = {
  local: 'Local', regional: 'Régional', distant: 'Lointain',
};

// ─── Tournament sheet ─────────────────────────────────────────────────────────

interface TournamentSheetProps {
  t: Tournament;
  player: NonNullable<ReturnType<typeof useGameStore.getState>['player']>;
  onTravel: () => void;
}

function TournamentSheet({ t, player, onTravel }: TournamentSheetProps) {
  const blocked = getBlockReasons(player, t);
  const canEnter = blocked.length === 0;
  const total = t.travelCost + t.entryFee;
  const typeColor = TOURNAMENT_TYPE_COLORS[t.type];

  return (
    <View style={sheetStyles.container}>
      {/* Type badge + location */}
      <View style={sheetStyles.badgeRow}>
        <View style={[sheetStyles.typeBadge, { backgroundColor: typeColor }]}>
          <Text style={sheetStyles.typeBadgeText}>
            {TOURNAMENT_TYPE_ICONS[t.type]}  {TOURNAMENT_TYPE_LABELS[t.type]}
          </Text>
        </View>
        <View style={[
          sheetStyles.distBadge,
          t.distance === 'local' && sheetStyles.distLocal,
          t.distance === 'regional' && sheetStyles.distRegional,
          t.distance === 'distant' && sheetStyles.distDistant,
        ]}>
          <Text style={sheetStyles.distBadgeText}>{DISTANCE_LABELS[t.distance]}</Text>
        </View>
      </View>

      {/* Location */}
      <Text style={sheetStyles.location}>{t.city} · {t.region}</Text>

      {/* Flavor */}
      <Text style={sheetStyles.flavor}>{travelFlavor(t)}</Text>

      {/* Costs & prizes */}
      <View style={sheetStyles.infoRow}>
        <View style={sheetStyles.infoBlock}>
          <Text style={sheetStyles.infoLabel}>Coût total</Text>
          <Text style={sheetStyles.infoValue}>{total} g</Text>
          {t.travelMonths > 0 && (
            <Text style={sheetStyles.infoNote}>{t.travelMonths} mois de voyage</Text>
          )}
        </View>
        <View style={sheetStyles.infoBlock}>
          <Text style={sheetStyles.infoLabel}>Récompenses</Text>
          <Text style={sheetStyles.prizeGlory}>+{t.prizeGlory} gloire</Text>
          <Text style={sheetStyles.prizeHonor}>+{t.prizeHonor} honneur</Text>
          <Text style={sheetStyles.prizeRep}>+{t.prizeReputation} réputation</Text>
          <Text style={sheetStyles.prizeMoney}>{t.prizeMoney} g</Text>
        </View>
        {t.minGlory > 0 && (
          <View style={sheetStyles.infoBlock}>
            <Text style={sheetStyles.infoLabel}>Gloire min.</Text>
            <Text style={[
              sheetStyles.infoValue,
              player.prestige.glory >= t.minGlory ? sheetStyles.reqOk : sheetStyles.reqFail,
            ]}>
              {t.minGlory}
            </Text>
            <Text style={[
              sheetStyles.infoNote,
              player.prestige.glory >= t.minGlory ? sheetStyles.reqOk : sheetStyles.reqFail,
            ]}>
              Votre gloire: {Math.floor(player.prestige.glory)}
            </Text>
          </View>
        )}
      </View>

      {/* Equipment checklist */}
      {(t.requiredItems.length > 0 || t.distance !== 'local') && (
        <View style={sheetStyles.equipSection}>
          <Text style={sheetStyles.infoLabel}>Équipement</Text>
          <View style={sheetStyles.equipRow}>
            {t.requiredItems.map((req) => {
              const owned = player.inventory.some((i) => i.subtype === req);
              return (
                <Text key={req} style={[sheetStyles.equipItem, owned ? sheetStyles.equipOk : sheetStyles.equipFail]}>
                  {owned ? '✓' : '✗'} {ITEM_NAMES[req] ?? req}
                </Text>
              );
            })}
            {t.distance !== 'local' && (() => {
              const hasHorse = player.inventory.some((i) => i.subtype === 'horse');
              return (
                <Text style={[sheetStyles.equipItem, hasHorse ? sheetStyles.equipOk : sheetStyles.equipFail]}>
                  {hasHorse ? '✓' : '✗'} Cheval
                </Text>
              );
            })()}
          </View>
        </View>
      )}

      {/* Block reasons */}
      {blocked.length > 0 && (
        <View style={sheetStyles.blockList}>
          {blocked.map((r, i) => (
            <Text key={i} style={sheetStyles.blockText}>· {reasonLabel(r)}</Text>
          ))}
        </View>
      )}

      {/* CTA */}
      <TouchableOpacity
        style={[sheetStyles.enterBtn, !canEnter && sheetStyles.enterBtnDisabled]}
        disabled={!canEnter}
        onPress={onTravel}
      >
        <Text style={[sheetStyles.enterBtnText, !canEnter && sheetStyles.enterBtnTextDisabled]}>
          Voyager et participer
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

const LEGEND_TYPES: TournamentType[] = ['melee', 'joust', 'swordDuel', 'archery', 'chess', 'poetry'];

function MapLegend() {
  return (
    <View style={legendStyles.container}>
      <Text style={legendStyles.title}>Légende des tournois</Text>
      <View style={legendStyles.grid}>
        {LEGEND_TYPES.map((type) => (
          <View key={type} style={legendStyles.item}>
            <View style={[legendStyles.dot, { backgroundColor: TOURNAMENT_TYPE_COLORS[type] }]} />
            <Text style={legendStyles.label}>{TOURNAMENT_TYPE_LABELS[type]}</Text>
          </View>
        ))}
        <View style={legendStyles.item}>
          <View style={[legendStyles.dot, { backgroundColor: '#888888' }]} />
          <Text style={legendStyles.label}>Verrouillé</Text>
        </View>
      </View>
      <Text style={legendStyles.note}>Gris = tournoi verrouillé (gloire insuffisante)</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function EuropeMapScreen({ navigation }: Props) {
  const player = useGameStore((s) => s.player);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pois = useMemo(
    () => buildEuropePois(player?.prestige.glory ?? 0),
    [player?.prestige.glory],
  );

  if (!player) return null;

  const selectedTournament = selectedId
    ? TOURNAMENTS.find((t) => t.id === selectedId) ?? null
    : null;
  const selectedPoi = selectedId ? pois.find((p) => p.id === selectedId) ?? null : null;

  const handlePoiPress = (poi: PointOfInterest) => setSelectedId(poi.id);
  const closeSheet = () => setSelectedId(null);

  const handleTravel = () => {
    if (!selectedTournament) return;
    closeSheet();
    navigation.navigate('Tournament', { tournamentId: selectedTournament.id });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Carte d'Europe</Text>
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => navigation.navigate('VillageMap')}
        >
          <Text style={styles.tabBtnText}>← Village</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => navigation.navigate('VillageMap')}
        >
          <Text style={styles.tabText}>🏘 Village</Text>
        </TouchableOpacity>
        <View style={[styles.tab, styles.tabActive]}>
          <Text style={[styles.tabText, styles.tabTextActive]}>🌍 Europe</Text>
        </View>
      </View>

      {/* Scrollable content: map + legend */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <PixelMap
          mapData={EUROPE_MAP}
          pois={pois}
          onPoiPress={handlePoiPress}
          width={400}
          height={300}
          tileSize={5}
        />
        <MapLegend />
      </ScrollView>

      {/* Tournament bottom sheet */}
      <BottomSheet
        visible={selectedTournament !== null}
        onClose={closeSheet}
        title={`${selectedPoi?.icon ?? ''} ${selectedTournament?.name ?? ''}`}
      >
        {selectedTournament && (
          <TournamentSheet
            t={selectedTournament}
            player={player}
            onTravel={handleTravel}
          />
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.parchment },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: { marginRight: 8 },
  backText: { fontFamily: 'serif', fontSize: 14, color: Colors.accent },
  title: {
    flex: 1,
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  tabBtn: {
    backgroundColor: Colors.surfaceDark,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtnText: { fontFamily: 'serif', fontSize: 12, color: Colors.textSecondary },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: Colors.accent },
  tabText: { fontFamily: 'serif', fontSize: 14, color: Colors.textSecondary },
  tabTextActive: { color: Colors.textPrimary, fontWeight: '700' },
});

const sheetStyles = StyleSheet.create({
  container: { gap: 10 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: { fontFamily: 'serif', fontSize: 12, fontWeight: '700', color: '#fff' },
  distBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  distLocal: { backgroundColor: '#C8E6C9' },
  distRegional: { backgroundColor: '#FFF9C4' },
  distDistant: { backgroundColor: '#FFCCBC' },
  distBadgeText: { fontFamily: 'serif', fontSize: 11, fontWeight: '700', color: Colors.textPrimary },
  location: { fontFamily: 'serif', fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },
  flavor: { fontFamily: 'serif', fontSize: 13, color: Colors.textPrimary, fontStyle: 'italic' },
  infoRow: { flexDirection: 'row', gap: 10 },
  infoBlock: { flex: 1, gap: 1 },
  infoLabel: {
    fontFamily: 'serif', fontSize: 10, color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  infoValue: { fontFamily: 'serif', fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  infoNote: { fontFamily: 'serif', fontSize: 11, color: Colors.textSecondary, fontStyle: 'italic' },
  reqOk:   { color: '#2E7D32' },
  reqFail: { color: '#C62828' },
  prizeGlory:  { fontFamily: 'serif', fontSize: 12, color: '#B8860B', fontWeight: '700' },
  prizeHonor:  { fontFamily: 'serif', fontSize: 12, color: '#7B5EA7', fontWeight: '700' },
  prizeRep:    { fontFamily: 'serif', fontSize: 12, color: '#2E7D32', fontWeight: '700' },
  prizeMoney:  { fontFamily: 'serif', fontSize: 12, color: Colors.textSecondary },
  equipSection: { gap: 4 },
  equipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  equipItem: { fontFamily: 'serif', fontSize: 12 },
  equipOk:   { color: '#2E7D32' },
  equipFail: { color: '#C62828' },
  blockList: { gap: 2 },
  blockText: { fontFamily: 'serif', fontSize: 12, color: '#C62828', fontStyle: 'italic' },
  enterBtn: {
    backgroundColor: Colors.buttonBg,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  enterBtnDisabled: { backgroundColor: Colors.surfaceDark, borderWidth: 1, borderColor: Colors.border },
  enterBtnText: { fontFamily: 'serif', fontSize: 14, fontWeight: '700', color: Colors.buttonText },
  enterBtnTextDisabled: { color: Colors.textSecondary },
});

const legendStyles = StyleSheet.create({
  container: {
    margin: 14,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 8,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: '45%',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  label: { fontFamily: 'serif', fontSize: 12, color: Colors.textPrimary },
  note: {
    fontFamily: 'serif',
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
