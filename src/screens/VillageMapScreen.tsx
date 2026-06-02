import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import {
  useGameStore,
  MAX_PRINCIPAL_ACTIONS,
  MAX_SECONDARY_ACTIONS,
  type ActivityRequest,
} from '../store/gameStore';
import PixelMap from '../components/PixelMap';
import BottomSheet from '../components/BottomSheet';
import ActivityResultModal from '../components/ActivityResultModal';
import { VILLAGE_MAP, VILLAGE_POIS } from '../data/villagemap';
import type { PointOfInterest } from '../components/PixelMap';
import type { Player, StatDelta } from '../types/game';
import type { ChangeLine } from '../utils/statLabels';
import { getZoneAccess, type ZoneAccess } from '../utils/zoneAccess';

type Props = NativeStackScreenProps<RootStackParamList, 'VillageMap'>;

// Runtime-only RNG (never inside a workflow script).
const rint = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// ─── Activity definitions per location ───────────────────────────────────────

type ActivityKind = 'principal' | 'secondary' | 'free';

interface Activity {
  id: string;
  label: string;
  desc: string;
  kind: ActivityKind;
  /** Pure navigation — opens another screen, costs no action slot. */
  navigate?: 'Shop' | 'Relations';
  /** Extra unlock condition (returns true when locked). */
  cond?: (p: Player) => boolean;
  condMsg?: string;
  /** Builds the effect payload (everything except `kind`). */
  req?: (p: Player) => Omit<ActivityRequest, 'kind'>;
}

type LocationId =
  | 'market' | 'church' | 'fields' | 'forge' | 'tavern' | 'home'
  | 'guardhouse' | 'bailiff' | 'forest' | 'river' | 'craftsman' | 'temple';

const LOCATION_FLAVOR: Record<LocationId, string> = {
  market:     'Les étals débordent de marchandises. Marchands et acheteurs se croisent dans un brouhaha constant.',
  church:     "La pierre froide et l'encens, les prières montent vers le ciel depuis les temps anciens.",
  fields:     "L'odeur de la terre fraîchement retournée emplit l'air. Les saisons rythment le labeur des paysans.",
  forge:      "Le martèlement du métal sur l'enclume résonne dans tout le quartier.",
  tavern:     "Fumée, rires et bière bon marché — la taverne accueille les fatigues du jour.",
  home:       "Vos murs, vos souvenirs. La maison familiale, refuge et fardeau à la fois.",
  guardhouse: "Armures rouillées et hommes sévères. La milice veille — tant bien que mal.",
  bailiff:    "Parchemins, sceaux et impôts. Le bailli administre le village au nom du seigneur.",
  forest:     "Les frondaisons denses cachent autant de dangers que de ressources.",
  river:      "L'eau court entre les pierres. Un moment de paix dans le tumulte du village.",
  craftsman:  "Tissus, flèches, outils — les mains habiles de l'artisan façonnent le nécessaire.",
  temple:     "Un sanctuaire dédié aux anciens dieux, antérieur à la venue de la Croix. Les chrétiens du village voient ces lieux d'un très mauvais œil.",
};

const LOCATION_ACTIVITIES: Record<LocationId, Activity[]> = {
  market: [
    {
      id: 'workMarket', label: 'Travailler au marché', desc: 'Porter, vendre, tenir un étal. On y noue des liens avec le marchand.',
      kind: 'principal',
      req: () => ({ location: 'market', statDelta: { gold: rint(2, 5), knowledgeSkills: { eloquence: 1 } }, ensureNpc: { role: 'merchant', profession: 'le marchand' }, npcScoreDelta: 1 }),
    },
    {
      id: 'strollMarket', label: 'Se promener au marché', desc: 'Flâner entre les étals — on y croise parfois de nouvelles têtes.',
      kind: 'secondary',
      req: () => ({ location: 'market', meetRandomFriend: true }),
    },
    {
      id: 'buyItems', label: 'Acheter des équipements', desc: 'Ouvrir la boutique du marchand.',
      kind: 'free', navigate: 'Shop',
    },
    {
      id: 'stealMarket', label: 'Voler à la dérobée', desc: 'Tenter de dérober une marchandise. Risqué.',
      kind: 'secondary',
      cond: (p) => p.prestige.honor >= 0, condMsg: "Votre honneur vous en empêche.",
      req: () => ({ location: 'market', statDelta: { gold: rint(3, 8), prestige: { honor: -2 } } }),
    },
  ],
  church: [
    {
      id: 'workChurch', label: "Aider l'église", desc: "Entretien, lectures, aide au prêtre. Bon pour l'âme.",
      kind: 'principal',
      req: () => ({ location: 'church', statDelta: { knowledgeSkills: { religion: 2 } }, christianRelationDelta: 2 }),
    },
    {
      id: 'visitChurch', label: "Assister à l'office", desc: 'Messe du matin avec les villageois.',
      kind: 'secondary',
      req: () => ({ location: 'church', christianRelationDelta: 1 }),
    },
    {
      id: 'prayAlone', label: 'Prier en silence', desc: 'Un moment de recueillement personnel.',
      kind: 'secondary',
      req: () => ({ location: 'church' }),
    },
    {
      id: 'stealChurch', label: "Voler dans l'église", desc: "Sacrilège. Seulement pour les âmes les plus sombres.",
      kind: 'secondary',
      cond: (p) => p.prestige.honor >= -20, condMsg: "Votre conscience s'y oppose encore.",
      req: () => ({ location: 'church', statDelta: { gold: rint(5, 12), prestige: { honor: -5 }, knowledgeSkills: { religion: -3 } }, christianRelationDelta: -4 }),
    },
  ],
  fields: [
    {
      id: 'workFarm', label: 'Travailler aux champs', desc: "Labourer, semer, récolter. Éreintant mais honnête.",
      kind: 'principal',
      req: () => ({ location: 'fields', statDelta: { gold: rint(1, 3), physicalStats: { endurance: 2 } } }),
    },
    {
      id: 'huntLegal', label: 'Chasser (légal)', desc: 'Gibier petit dans les zones autorisées.',
      kind: 'principal',
      req: () => ({ location: 'fields', statDelta: { gold: rint(1, 2), combatSkills: { archery: 1 } } }),
    },
    {
      id: 'huntIllegal', label: 'Braconner', desc: "Chasse sur les terres du seigneur. Interdit mais lucratif.",
      kind: 'principal',
      req: () => ({ location: 'fields', statDelta: { gold: rint(2, 5), combatSkills: { archery: 2 }, prestige: { honor: -1 } } }),
    },
  ],
  forge: [
    {
      id: 'workForge', label: 'Travailler à la forge', desc: 'Souffler, forger, tremper. On y côtoie le forgeron.',
      kind: 'principal',
      req: () => ({ location: 'forge', statDelta: { gold: rint(1, 3), craftSkills: { blacksmithing: 2 }, physicalStats: { strength: 1 } }, ensureNpc: { role: 'blacksmith', profession: 'le forgeron' }, npcScoreDelta: 1 }),
    },
    {
      id: 'trainHeavy', label: "S'entraîner (arme lourde)", desc: "Manier le marteau du forgeron. Il n'apprécie guère qu'on use son outil.",
      kind: 'principal',
      req: () => ({ location: 'forge', statDelta: { combatSkills: { heavyWeapon: 2 } }, ensureNpc: { role: 'blacksmith', profession: 'le forgeron' }, npcScoreDelta: -3 }),
    },
  ],
  tavern: [
    {
      id: 'visitTavern', label: 'Boire et socialiser', desc: 'Payer une tournée (1 g). On s’y fait parfois un ami.',
      kind: 'secondary',
      cond: (p) => p.gold < 1, condMsg: "Pas assez d'or (1 g).",
      req: () => ({ location: 'tavern', statDelta: { gold: -1 }, meetRandomFriend: true }),
    },
    {
      id: 'playChess', label: 'Jouer aux échecs', desc: 'Défier un adversaire local. Requiert un jeu.',
      kind: 'principal',
      cond: (p) => !p.inventory.some((i) => i.subtype === 'chess_set'),
      condMsg: "Vous n'avez pas de jeu d'échecs.",
      req: () => ({ location: 'tavern', statDelta: { knowledgeSkills: { strategy: 2 } } }),
    },
  ],
  home: [
    {
      id: 'workHome', label: 'Travailler à la maison', desc: 'Réparations, jardinage, entretien.',
      kind: 'principal',
      req: () => ({ location: 'home', statDelta: { gold: rint(1, 2) } }),
    },
    {
      id: 'talkFamily', label: 'Parler à la famille', desc: 'Passer du temps avec vos proches.',
      kind: 'free', navigate: 'Relations',
    },
    {
      id: 'learnToRead', label: 'Apprendre à lire', desc: 'Pratiquer les lettres avec un livre ou un tuteur.',
      kind: 'principal',
      req: () => ({ location: 'home', statDelta: { knowledgeSkills: { literature: 2 } } }),
    },
    {
      id: 'readBook', label: 'Lire un livre', desc: "Consulter un ouvrage de votre bibliothèque.",
      kind: 'secondary',
      cond: (p) => !p.inventory.some((i) => i.category === 'book'),
      condMsg: "Vous n'avez aucun livre.",
      req: () => ({ location: 'home', statDelta: { knowledgeSkills: { literature: 1, generalCulture: 1 } } }),
    },
    {
      id: 'carePet', label: 'Soigner votre animal', desc: 'Nourrir, brosser et jouer avec votre compagnon.',
      kind: 'secondary',
      cond: (p) => !p.inventory.some((i) => i.category === 'animal'),
      condMsg: "Vous n'avez pas d'animal.",
      req: () => ({ location: 'home', statDelta: { ridingSkills: { animalHandling: 2 } } }),
    },
  ],
  guardhouse: [
    {
      id: 'workGuard', label: 'Travailler comme garde', desc: "Patrouiller et maintenir l'ordre. Réservé aux adultes.",
      kind: 'principal',
      cond: (p) => p.age < 16, condMsg: 'Requiert 16 ans.',
      req: () => ({ location: 'guardhouse', statDelta: { gold: rint(2, 4), combatSkills: { swordAndShield: 1 } } }),
    },
    {
      id: 'trainWithStick', label: "S'entraîner au bâton", desc: "Le maniement du bâton affûte la lance ou l'épée longue.",
      kind: 'principal',
      req: () => {
        const skill = Math.random() < 0.5 ? 'lance' : 'longSword';
        return {
          location: 'guardhouse',
          statDelta: { combatSkills: { [skill]: 2 } as StatDelta['combatSkills'] },
        };
      },
    },
    {
      id: 'trainAloneWeapon', label: "S'entraîner à l'épée", desc: "Pratiquer l'épée longue sans adversaire.",
      kind: 'principal',
      req: () => ({ location: 'guardhouse', statDelta: { combatSkills: { longSword: 1 } } }),
    },
    {
      id: 'trainWithMaster', label: 'Entraînement avec maître', desc: 'Apprendre des techniques avancées. Requiert un maître.',
      kind: 'principal',
      cond: (p) => !p.relations.some((r) => r.type === 'master'),
      condMsg: "Vous n'avez pas de maître.",
      req: () => ({ location: 'guardhouse', statDelta: { combatSkills: { longSword: 3 } } }),
    },
  ],
  bailiff: [
    {
      id: 'workBailiff', label: 'Travailler pour le bailli', desc: "Clercs, collecte d'impôts, administration seigneuriale.",
      kind: 'principal',
      cond: (p) => p.age < 16, condMsg: 'Requiert 16 ans.',
      req: () => ({ location: 'bailiff', statDelta: { gold: rint(3, 6), knowledgeSkills: { generalCulture: 1, eloquence: 1 } } }),
    },
  ],
  forest: [
    {
      id: 'strollForest', label: 'Se promener en forêt', desc: 'Explorer les sous-bois. On y fait des rencontres ou de petites trouvailles.',
      kind: 'secondary',
      req: () => ({
        location: 'forest',
        meetRandomFriend: true,
        findItem: {
          chance: 0.55,
          pool: [
            { name: 'Bâton solide', category: 'weapon', subtype: 'training_staff', weight: 3 },
            { name: 'Fronde', category: 'weapon', subtype: 'sling', weight: 1 },
          ],
        },
      }),
    },
    {
      id: 'huntLegalForest', label: 'Chasser (légal)', desc: "Petit gibier dans la clairière autorisée.",
      kind: 'principal',
      req: () => ({ location: 'forest', statDelta: { gold: rint(1, 2), combatSkills: { archery: 1 } } }),
    },
    {
      id: 'huntIllegalForest', label: 'Braconner dans la forêt', desc: 'Cerf et sanglier sur les terres du seigneur. Risqué.',
      kind: 'principal',
      req: () => ({ location: 'forest', statDelta: { gold: rint(2, 6), combatSkills: { archery: 2 }, prestige: { honor: -1 } } }),
    },
  ],
  river: [
    {
      id: 'strollRiver', label: "Se promener au bord de l'eau", desc: 'Longer la rivière. Parfois une rencontre, parfois une trouvaille.',
      kind: 'secondary',
      req: () => ({
        location: 'river',
        meetRandomFriend: true,
        findItem: {
          chance: 0.4,
          pool: [
            { name: 'Canne taillée', category: 'weapon', subtype: 'training_staff', weight: 1 },
          ],
        },
      }),
    },
  ],
  craftsman: [
    {
      id: 'workTailoring', label: 'Travailler chez le tailleur', desc: "Coudre, couper, assembler. On y connaît l'artisan.",
      kind: 'principal',
      req: () => ({ location: 'craftsman', statDelta: { gold: rint(1, 3), craftSkills: { tailoring: 2 }, physicalStats: { agility: 1 } }, ensureNpc: { role: 'artisan', profession: "l'artisan" }, npcScoreDelta: 1 }),
    },
    {
      id: 'workBowyer', label: "Travailler chez l'archer-armurier", desc: "Façonner arcs et flèches aux côtés de l'artisan.",
      kind: 'principal',
      req: () => ({ location: 'craftsman', statDelta: { gold: rint(1, 3), craftSkills: { bowyer: 2 } }, ensureNpc: { role: 'artisan', profession: "l'artisan" }, npcScoreDelta: 1 }),
    },
  ],
  temple: [
    {
      id: 'visitTemple', label: 'Assister au rite ancien', desc: "Une cérémonie païenne, loin du regard de l'Église.",
      kind: 'secondary',
      req: () => ({ location: 'temple', christianRelationDelta: -3, paganRelationDelta: 4 }),
    },
    {
      id: 'prayTemple', label: 'Honorer les anciens dieux', desc: 'Déposer une offrande aux divinités oubliées.',
      kind: 'secondary',
      req: () => ({ location: 'temple', christianRelationDelta: -2, paganRelationDelta: 3 }),
    },
    {
      id: 'workTemple', label: 'Servir le sanctuaire', desc: 'Aider les fidèles païens et entretenir le lieu.',
      kind: 'secondary',
      req: () => ({ location: 'temple', statDelta: { gold: rint(1, 2) }, christianRelationDelta: -4, paganRelationDelta: 5 }),
    },
  ],
};

const KIND_TAG: Record<ActivityKind, string> = {
  principal: 'Principale',
  secondary: 'Secondaire',
  free: 'Libre',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VillageMapScreen({ navigation }: Props) {
  const player = useGameStore((s) => s.player);
  const advanceMonth = useGameStore((s) => s.advanceMonth);
  const performActivity = useGameStore((s) => s.performActivity);

  const { width } = useWindowDimensions();
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);
  const [result, setResult] = useState<{ title: string; lines: ChangeLine[]; note?: string } | null>(null);

  if (!player) return null;

  const principalUsed = player.principalActionsUsed ?? 0;
  const secondaryUsed = player.secondaryActionsUsed ?? 0;

  // Map fills the available width (48×48 grid).
  const tileSize = Math.max(7, Math.floor((width - 16) / 48));
  const mapPx = tileSize * 48;

  const handlePoiPress = (poi: PointOfInterest) => setSelectedPoi(poi);
  const closeSheet = () => setSelectedPoi(null);

  const locId = selectedPoi?.id as LocationId | undefined;
  const activities = locId ? (LOCATION_ACTIVITIES[locId] ?? []) : [];
  const flavor = locId ? LOCATION_FLAVOR[locId] : '';
  const access: ZoneAccess = locId ? getZoneAccess(player, locId) : { forbidden: false };

  // Grey out forbidden zones on the map itself.
  const pois = VILLAGE_POIS.map((p) => ({
    ...p,
    locked: getZoneAccess(player, p.id).forbidden,
  }));

  /** Returns lock state + message for an activity given the current player. */
  const lockState = (act: Activity): { locked: boolean; msg: string } => {
    if (act.cond?.(player)) return { locked: true, msg: act.condMsg ?? 'Indisponible.' };
    if (act.kind === 'principal' && principalUsed >= MAX_PRINCIPAL_ACTIONS) {
      return { locked: true, msg: 'Action principale déjà utilisée ce mois-ci.' };
    }
    if (act.kind === 'secondary' && secondaryUsed >= MAX_SECONDARY_ACTIONS) {
      return { locked: true, msg: 'Actions secondaires épuisées ce mois-ci.' };
    }
    return { locked: false, msg: '' };
  };

  const runActivity = (act: Activity) => {
    if (act.navigate) {
      closeSheet();
      navigation.navigate(act.navigate);
      return;
    }
    if (!act.req) return;

    const res = performActivity({ kind: act.kind as ActivityRequest['kind'], ...act.req(player) });
    closeSheet();
    if (!res.ok) {
      setResult({ title: act.label, lines: [], note: res.reason });
      return;
    }
    setResult({ title: act.label, lines: res.lines ?? [], note: res.note });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Carte du village</Text>
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => navigation.navigate('EuropeMap')}
        >
          <Text style={styles.tabBtnText}>Europe →</Text>
        </TouchableOpacity>
      </View>

      {/* Action economy bar */}
      <View style={styles.actionBar}>
        <View style={styles.actionCounter}>
          <Text style={styles.actionCounterLabel}>⚔ Action principale</Text>
          <Text
            style={[
              styles.actionCounterValue,
              principalUsed >= MAX_PRINCIPAL_ACTIONS && styles.actionCounterFull,
            ]}
          >
            {principalUsed}/{MAX_PRINCIPAL_ACTIONS}
          </Text>
        </View>
        <View style={styles.actionDivider} />
        <View style={styles.actionCounter}>
          <Text style={styles.actionCounterLabel}>✦ Secondaires</Text>
          <Text
            style={[
              styles.actionCounterValue,
              secondaryUsed >= MAX_SECONDARY_ACTIONS && styles.actionCounterFull,
            ]}
          >
            {secondaryUsed}/{MAX_SECONDARY_ACTIONS}
          </Text>
        </View>
      </View>

      {/* Map — fills available space */}
      <View style={styles.mapWrap}>
        <PixelMap
          mapData={VILLAGE_MAP}
          pois={pois}
          onPoiPress={handlePoiPress}
          width={mapPx}
          height={mapPx}
          tileSize={tileSize}
        />
      </View>

      {/* Advance month */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.advanceBtn}
          onPress={() => {
            advanceMonth();
            navigation.navigate('Character');
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.advanceText}>Passer au mois suivant →</Text>
        </TouchableOpacity>
      </View>

      {/* Location bottom sheet */}
      <BottomSheet
        visible={selectedPoi !== null}
        onClose={closeSheet}
        title={`${selectedPoi?.icon ?? ''} ${selectedPoi?.label ?? ''}`}
      >
        {flavor ? <Text style={styles.flavor}>{flavor}</Text> : null}

        {access.forbidden ? (
          <View style={styles.forbiddenBox}>
            <Text style={styles.forbiddenText}>🚫 {access.reason}</Text>
          </View>
        ) : activities.length > 0 ? (
          <View style={styles.activityList}>
            <Text style={styles.activityHeader}>Activités disponibles</Text>
            {activities.map((act) => {
              const { locked, msg } = lockState(act);
              return (
                <TouchableOpacity
                  key={act.id}
                  style={[styles.activityRow, locked && styles.activityRowLocked]}
                  onPress={() => {
                    if (!locked) runActivity(act);
                  }}
                  disabled={locked}
                  activeOpacity={0.7}
                >
                  <View style={styles.activityRowInner}>
                    <View style={styles.activityLabelRow}>
                      <Text style={[styles.activityLabel, locked && styles.activityLabelLocked]}>
                        {act.label}
                      </Text>
                      {act.kind !== 'free' && (
                        <View
                          style={[
                            styles.kindTag,
                            act.kind === 'principal' ? styles.kindTagPrincipal : styles.kindTagSecondary,
                          ]}
                        >
                          <Text style={styles.kindTagText}>{KIND_TAG[act.kind]}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.activityDesc, locked && styles.activityDescLocked]}>
                      {locked ? msg : act.desc}
                    </Text>
                  </View>
                  {!locked && <Text style={styles.activityArrow}>›</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </BottomSheet>

      {/* Activity result popup */}
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

  // Action economy bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceDark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
  },
  actionCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
  actionCounterLabel: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  actionCounterValue: {
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  actionCounterFull: {
    color: '#9A3A2A',
  },
  actionDivider: {
    width: 1,
    height: 18,
    backgroundColor: Colors.border,
  },

  // Map container
  mapWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  // Footer / advance month
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  advanceBtn: {
    backgroundColor: Colors.buttonBg,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  advanceText: {
    fontFamily: 'serif',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.buttonText,
    letterSpacing: 0.5,
  },

  // Bottom sheet content
  flavor: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 19,
  },
  forbiddenBox: {
    backgroundColor: '#E8D6C0',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#9A3A2A',
    padding: 16,
  },
  forbiddenText: {
    fontFamily: 'serif',
    fontSize: 14,
    color: '#9A3A2A',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  activityList: { gap: 6 },
  activityHeader: {
    fontFamily: 'serif',
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  activityRowLocked: {
    backgroundColor: Colors.parchment,
    borderColor: Colors.surfaceDark,
    opacity: 0.6,
  },
  activityRowInner: { flex: 1 },
  activityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityLabel: {
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  activityLabelLocked: { color: Colors.textSecondary },
  kindTag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  kindTagPrincipal: { backgroundColor: '#7B4F1E' },
  kindTagSecondary: { backgroundColor: '#8E7A4A' },
  kindTagText: {
    fontFamily: 'serif',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.buttonText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityDesc: {
    fontFamily: 'serif',
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  activityDescLocked: { color: Colors.surfaceDark },
  activityArrow: {
    fontFamily: 'serif',
    fontSize: 20,
    color: Colors.accent,
    marginLeft: 8,
  },
});
