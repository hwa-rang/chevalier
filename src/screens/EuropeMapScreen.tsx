import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useGameStore, energyUsed } from '../store/gameStore';
import ZoomableImageMap from '../components/ZoomableImageMap';
import BottomSheet from '../components/BottomSheet';
import ActivityResultModal from '../components/ActivityResultModal';
import FatigueGauge from '../components/FatigueGauge';
import {
  EUROPE_MAP_IMAGE,
  EUROPE_MAP_WIDTH,
  EUROPE_MAP_HEIGHT,
  PLAYER_HOME_POS,
  TOURNAMENT_TYPE_COLORS,
  TOURNAMENT_TYPE_ICONS,
  TOURNAMENT_TYPE_LABELS,
  buildEuropePois,
  buildBanditPois,
  BANDIT_CAMPS,
} from '../data/europemap';
import type { BanditCamp } from '../data/europemap';
import { TOURNAMENTS } from '../data/tournaments';
import type { Tournament, TournamentType } from '../data/tournaments';
import type { PointOfInterest } from '../components/PixelMap';
import type { Player } from '../types/game';
import type { ChangeLine } from '../utils/statLabels';

/** Reputation below which bandits will shelter you. */
const BANDIT_REST_REP_MAX = -20;

/** Rough martial power used to resolve a bandit-camp fight. */
function martialPower(p: Player): number {
  const bestCombat = Math.max(0, ...Object.values(p.combatSkills));
  return bestCombat + p.physicalStats.strength * 0.5 + p.physicalStats.endurance * 0.3;
}

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

// ─── Bandit camp sheet ─────────────────────────────────────────────────────────

interface BanditSheetProps {
  camp: BanditCamp;
  player: Player;
  onFight: () => void;
  onRest: () => void;
}

function BanditSheet({ camp, player, onFight, onRest }: BanditSheetProps) {
  const power = Math.round(martialPower(player));
  const canRest = player.prestige.reputation < BANDIT_REST_REP_MAX;
  const winChance = Math.min(0.9, Math.max(0.1, 0.5 + (power - camp.difficulty) / 100));

  return (
    <View style={sheetStyles.container}>
      <Text style={sheetStyles.flavor}>
        Un repaire de brigands qui rançonnent les routes alentour.
      </Text>

      <View style={sheetStyles.infoRow}>
        <View style={sheetStyles.infoBlock}>
          <Text style={sheetStyles.infoLabel}>Difficulté</Text>
          <Text style={sheetStyles.infoValue}>{camp.difficulty}</Text>
          <Text style={sheetStyles.infoNote}>Votre puissance : {power}</Text>
        </View>
        <View style={sheetStyles.infoBlock}>
          <Text style={sheetStyles.infoLabel}>Si vous gagnez</Text>
          <Text style={sheetStyles.prizeMoney}>{camp.rewardGold} g</Text>
          <Text style={sheetStyles.prizeGlory}>+{camp.rewardGlory} gloire</Text>
          <Text style={sheetStyles.prizeRep}>+honneur · +réputation</Text>
        </View>
        <View style={sheetStyles.infoBlock}>
          <Text style={sheetStyles.infoLabel}>Chances</Text>
          <Text style={sheetStyles.infoValue}>{Math.round(winChance * 100)}%</Text>
        </View>
      </View>

      <TouchableOpacity style={sheetStyles.enterBtn} onPress={onFight} activeOpacity={0.8}>
        <Text style={sheetStyles.enterBtnText}>⚔ Nettoyer le camp</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[sheetStyles.restBtn, !canRest && sheetStyles.enterBtnDisabled]}
        onPress={onRest}
        disabled={!canRest}
        activeOpacity={0.8}
      >
        <Text style={[sheetStyles.enterBtnText, !canRest && sheetStyles.enterBtnTextDisabled]}>
          🛖 Se reposer parmi eux
        </Text>
      </TouchableOpacity>
      {!canRest && (
        <Text style={sheetStyles.blockText}>
          · Les brigands ne hébergent que les hors-la-loi (réputation &lt; {BANDIT_REST_REP_MAX}).
        </Text>
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function EuropeMapScreen({ navigation }: Props) {
  const player = useGameStore((s) => s.player);
  const applyStatDelta = useGameStore((s) => s.applyStatDelta);
  const applyDamage = useGameStore((s) => s.applyDamage);
  const registerBanditVictory = useGameStore((s) => s.registerBanditVictory);
  const addToHistory = useGameStore((s) => s.addToHistory);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [result, setResult] = useState<{ title: string; lines: ChangeLine[]; note?: string } | null>(null);

  const pois = useMemo(
    () => [...buildEuropePois(player?.prestige.glory ?? 0), ...buildBanditPois()],
    [player?.prestige.glory],
  );

  if (!player) return null;

  const selectedTournament = selectedId
    ? TOURNAMENTS.find((t) => t.id === selectedId) ?? null
    : null;
  const selectedCamp = selectedId
    ? BANDIT_CAMPS.find((c) => c.id === selectedId) ?? null
    : null;
  const selectedPoi = selectedId ? pois.find((p) => p.id === selectedId) ?? null : null;

  const handlePoiPress = (poi: PointOfInterest) => setSelectedId(poi.id);
  const closeSheet = () => setSelectedId(null);

  const handleTravel = () => {
    if (!selectedTournament) return;
    closeSheet();
    navigation.navigate('Tournament', { tournamentId: selectedTournament.id });
  };

  const handleFight = () => {
    if (!selectedCamp) return;
    const camp = selectedCamp;
    closeSheet();
    const power = martialPower(player);
    const winChance = Math.min(0.9, Math.max(0.1, 0.5 + (power - camp.difficulty) / 100));
    if (Math.random() < winChance) {
      applyStatDelta({ gold: camp.rewardGold, prestige: { glory: camp.rewardGlory, reputation: 3, honor: 3 } });
      registerBanditVictory();
      const scratch = 3 + Math.floor(Math.random() * 6); // 3–8: even victory draws blood
      applyDamage(scratch);
      addToHistory(`Vous avez nettoyé ${camp.label}. Les routes sont plus sûres.`);
      setResult({
        title: camp.label,
        note: 'Victoire ! Les brigands sont défaits.',
        lines: [
          { label: 'Or', value: camp.rewardGold },
          { label: 'Gloire', value: camp.rewardGlory },
          { label: 'Réputation', value: 3 },
          { label: 'Honneur', value: 3 },
          { label: 'Points de vie', value: -scratch },
        ],
      });
    } else {
      const wound = 12 + Math.floor(Math.random() * 14); // 12–25
      applyStatDelta({ physicalStats: { strength: -3, endurance: -4 }, prestige: { glory: -2 } });
      applyDamage(wound);
      addToHistory(`Vous avez été repoussé par les brigands de ${camp.label}.`);
      setResult({
        title: camp.label,
        note: 'Défaite… vous repartez grièvement blessé.',
        lines: [
          { label: 'Force', value: -3 },
          { label: 'Endurance', value: -4 },
          { label: 'Gloire', value: -2 },
          { label: 'Points de vie', value: -wound },
        ],
      });
    }
  };

  const handleRest = () => {
    if (!selectedCamp) return;
    const camp = selectedCamp;
    closeSheet();
    applyStatDelta({ gold: 8, physicalStats: { endurance: 2 }, prestige: { honor: -2, reputation: -2 } });
    addToHistory(`Vous vous êtes terré parmi les brigands de ${camp.label}.`);
    setResult({
      title: camp.label,
      note: 'Les brigands vous offrent gîte et butin — au prix de votre honneur.',
      lines: [
        { label: 'Or', value: 8 },
        { label: 'Endurance', value: 2 },
        { label: 'Honneur', value: -2 },
        { label: 'Réputation', value: -2 },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🌍 Carte d'Europe</Text>
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => navigation.navigate('VillageMap')}
        >
          <Text style={styles.tabBtnText}>🏘 Village</Text>
        </TouchableOpacity>
      </View>

      {/* Energy gauge */}
      <View style={styles.gaugeBar}>
        <FatigueGauge used={energyUsed(player)} />
      </View>

      {/* Zoomable map — fills the remaining height; pinch to zoom, drag to pan */}
      <View style={styles.mapWrap}>
        <ZoomableImageMap
          source={EUROPE_MAP_IMAGE}
          mapWidth={EUROPE_MAP_WIDTH}
          mapHeight={EUROPE_MAP_HEIGHT}
          pois={pois}
          onPoiPress={handlePoiPress}
          fit="cover"
          playerPos={PLAYER_HOME_POS}
        />

        {/* Legend toggle, overlaid on the map */}
        <TouchableOpacity
          style={styles.legendBtn}
          onPress={() => setLegendOpen((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.legendBtnText}>{legendOpen ? '✕ Légende' : 'Légende'}</Text>
        </TouchableOpacity>
        {legendOpen && (
          <View style={styles.legendOverlay} pointerEvents="none">
            <MapLegend />
          </View>
        )}
      </View>

      {/* Location bottom sheet (tournament or bandit camp) */}
      <BottomSheet
        visible={selectedTournament !== null || selectedCamp !== null}
        onClose={closeSheet}
        title={`${selectedPoi?.icon ?? ''} ${selectedTournament?.name ?? selectedCamp?.label ?? ''}`}
      >
        {selectedTournament && (
          <TournamentSheet
            t={selectedTournament}
            player={player}
            onTravel={handleTravel}
          />
        )}
        {selectedCamp && (
          <BanditSheet
            camp={selectedCamp}
            player={player}
            onFight={handleFight}
            onRest={handleRest}
          />
        )}
      </BottomSheet>

      <ActivityResultModal
        visible={result !== null}
        title={result?.title ?? ''}
        lines={result?.lines ?? []}
        note={result?.note}
        onClose={() => setResult(null)}
      />
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
  backText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.accent },
  title: {
    flex: 1,
    fontFamily: Fonts.title,
    fontSize: 20,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  tabBtn: {
    backgroundColor: Colors.surfaceDark,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtnText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary },
  gaugeBar: {
    backgroundColor: Colors.surfaceDark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 10,
  },
  mapWrap: { flex: 1 },
  legendBtn: {
    position: 'absolute',
    bottom: 14,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  legendBtnText: { fontFamily: Fonts.bodyBold, fontSize: 12, fontWeight: '700', color: '#fff' },
  legendOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 44,
  },
});

const sheetStyles = StyleSheet.create({
  container: { gap: 10 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  typeBadge: {
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 12, fontWeight: '700', color: '#fff' },
  distBadge: { borderRadius: 0, paddingHorizontal: 8, paddingVertical: 4 },
  distLocal: { backgroundColor: '#C8E6C9' },
  distRegional: { backgroundColor: '#FFF9C4' },
  distDistant: { backgroundColor: '#FFCCBC' },
  distBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 11, fontWeight: '700', color: Colors.textPrimary },
  location: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },
  flavor: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textPrimary, fontStyle: 'italic' },
  infoRow: { flexDirection: 'row', gap: 10 },
  infoBlock: { flex: 1, gap: 1 },
  infoLabel: {
    fontFamily: Fonts.body, fontSize: 10, color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  infoValue: { fontFamily: Fonts.bodyBold, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  infoNote: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSecondary, fontStyle: 'italic' },
  reqOk:   { color: '#2E7D32' },
  reqFail: { color: '#C62828' },
  prizeGlory:  { fontFamily: Fonts.bodyBold, fontSize: 12, color: '#B8860B', fontWeight: '700' },
  prizeHonor:  { fontFamily: Fonts.bodyBold, fontSize: 12, color: '#7B5EA7', fontWeight: '700' },
  prizeRep:    { fontFamily: Fonts.bodyBold, fontSize: 12, color: '#2E7D32', fontWeight: '700' },
  prizeMoney:  { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary },
  equipSection: { gap: 4 },
  equipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  equipItem: { fontFamily: Fonts.body, fontSize: 12 },
  equipOk:   { color: '#2E7D32' },
  equipFail: { color: '#C62828' },
  blockList: { gap: 2 },
  blockText: { fontFamily: Fonts.body, fontSize: 12, color: '#C62828', fontStyle: 'italic' },
  enterBtn: {
    backgroundColor: Colors.buttonBg,
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  enterBtnDisabled: { backgroundColor: Colors.surfaceDark, borderWidth: 1, borderColor: Colors.border },
  enterBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, fontWeight: '700', color: Colors.buttonText },
  enterBtnTextDisabled: { color: Colors.textSecondary },
  restBtn: {
    backgroundColor: '#5A4632',
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
});

const legendStyles = StyleSheet.create({
  container: {
    margin: 14,
    backgroundColor: Colors.surface,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 8,
  },
  title: {
    fontFamily: Fonts.title,
    fontSize: 16,
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
    borderRadius: 0,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  label: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textPrimary },
  note: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
