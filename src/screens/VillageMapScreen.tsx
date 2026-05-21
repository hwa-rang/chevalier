import React, { useState } from 'react';
import {
  SafeAreaView,
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
import { VILLAGE_MAP, VILLAGE_POIS } from '../data/villagemap';
import type { PointOfInterest } from '../components/PixelMap';
import type { Player } from '../types/game';

type Props = NativeStackScreenProps<RootStackParamList, 'VillageMap'>;

// ─── Activity definitions per location ───────────────────────────────────────

interface Activity {
  id: string;
  label: string;
  desc: string;
  isLocked: (p: Player) => boolean;
  lockMsg: string;
  perform: (opts: { navigation: Props['navigation']; advanceMonth: () => void; close: () => void }) => void;
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
  temple:     "Plus ancien que l'église, ce sanctuaire accueille dévotions et méditations.",
};

const LOCATION_ACTIVITIES: Record<LocationId, Activity[]> = {
  market: [
    {
      id: 'workMarket', label: 'Travailler au marché', desc: 'Porter, vendre, tenir un étal. Gagne quelques sous.',
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'visitMarket', label: 'Visiter les étals', desc: 'Parcourir les marchands, se faire voir.',
      isLocked: () => false, lockMsg: '',
      perform: ({ navigation, close }) => { close(); navigation.navigate('Shop'); },
    },
    {
      id: 'buyItems', label: 'Acheter des équipements', desc: 'Ouvrir la boutique du marchand.',
      isLocked: () => false, lockMsg: '',
      perform: ({ navigation, close }) => { close(); navigation.navigate('Shop'); },
    },
    {
      id: 'stealMarket', label: 'Voler à la dérobée', desc: 'Tenter de dérober une marchandise. Risqué.',
      isLocked: (p) => p.prestige.honor >= 0,
      lockMsg: "Votre honneur vous en empêche.",
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
  ],
  church: [
    {
      id: 'workChurch', label: "Aider l'église", desc: "Entretien, lectures, aide au prêtre. Bon pour l'âme.",
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'visitChurch', label: "Assister à l'office", desc: 'Messe du matin avec les villageois.',
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'prayAlone', label: 'Prier en silence', desc: 'Un moment de recueillement personnel.',
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'stealChurch', label: "Voler dans l'église", desc: "Sacrilège. Seulement pour les âmes les plus sombres.",
      isLocked: (p) => p.prestige.honor >= -20,
      lockMsg: "Votre conscience s'y oppose encore.",
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
  ],
  fields: [
    {
      id: 'workFarm', label: 'Travailler aux champs', desc: "Labourer, semer, récolter. Éreintant mais honnête.",
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'huntLegal', label: 'Chasser (légal)', desc: 'Gibier petit dans les zones autorisées.',
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'huntIllegal', label: 'Braconner', desc: "Chasse sur les terres du seigneur. Interdit mais lucratif.",
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
  ],
  forge: [
    {
      id: 'workCraftsman', label: 'Travailler à la forge', desc: 'Souffler, forger, tremper. Développe la force.',
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'trainAloneAxe', label: "S'entraîner (hache)", desc: "Exercices seul avec la hache du forgeron.",
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'trainAloneSword', label: "S'entraîner (épée)", desc: "Exercices seul avec une épée longue.",
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'trainAloneHeavy', label: "S'entraîner (arme lourde)", desc: "Exercices avec une arme d'hast ou une masse.",
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
  ],
  tavern: [
    {
      id: 'visitTavern', label: 'Boire et socialiser', desc: 'Rencontrer des gens, entendre des rumeurs.',
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'playChess', label: 'Jouer aux échecs', desc: 'Défier un adversaire local. Requiert un jeu.',
      isLocked: (p) => !p.inventory.some((i) => i.subtype === 'chess_set'),
      lockMsg: "Vous n'avez pas de jeu d'échecs.",
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
  ],
  home: [
    {
      id: 'workHome', label: 'Travailler à la maison', desc: 'Réparations, jardinage, entretien.',
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'talkFamily', label: 'Parler à la famille', desc: 'Passer du temps avec vos proches.',
      isLocked: () => false, lockMsg: '',
      perform: ({ navigation, close }) => { close(); navigation.navigate('Relations'); },
    },
    {
      id: 'learnToRead', label: 'Apprendre à lire', desc: 'Pratiquer les lettres avec un livre ou un tuteur.',
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'readBook', label: 'Lire un livre', desc: "Consulter un ouvrage de votre bibliothèque.",
      isLocked: (p) => !p.inventory.some((i) => i.category === 'book'),
      lockMsg: "Vous n'avez aucun livre.",
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'carePet', label: 'Soigner votre animal', desc: 'Nourrir, brosser et jouer avec votre compagnon.',
      isLocked: (p) => !p.inventory.some((i) => i.category === 'animal'),
      lockMsg: "Vous n'avez pas d'animal.",
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
  ],
  guardhouse: [
    {
      id: 'workGuard', label: 'Travailler comme garde', desc: "Patrouiller et maintenir l'ordre. Réservé aux adultes.",
      isLocked: (p) => p.age < 16,
      lockMsg: 'Requiert 16 ans.',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'trainWithStick', label: "S'entraîner au bâton", desc: 'Exercices de base avec un bâton de combat.',
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'trainAloneWeapon', label: "S'entraîner seul", desc: "Pratiquer votre arme sans adversaire.",
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'trainWithMaster', label: 'Entraînement avec maître', desc: 'Apprendre des techniques avancées. Requiert un maître.',
      isLocked: (p) => !p.relations.some((r) => r.type === 'master'),
      lockMsg: "Vous n'avez pas de maître.",
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
  ],
  bailiff: [
    {
      id: 'workBailiff', label: 'Travailler pour le bailli', desc: "Clercs, collecte d'impôts, administration seigneuriale.",
      isLocked: (p) => p.age < 16,
      lockMsg: 'Requiert 16 ans.',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
  ],
  forest: [
    {
      id: 'huntLegalForest', label: 'Chasser (légal)', desc: "Petit gibier dans la clairière autorisée.",
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'huntIllegalForest', label: 'Braconner dans la forêt', desc: 'Cerf et sanglier sur les terres du seigneur. Risqué.',
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
  ],
  river: [],  // flavor only
  craftsman: [
    {
      id: 'workTailoring', label: 'Travailler chez le tailleur', desc: "Coudre, couper, assembler. Développe l'adresse.",
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'workBowyer', label: "Travailler chez l'archer-armurier", desc: 'Façonner arcs et flèches.',
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
  ],
  temple: [
    {
      id: 'visitTemple', label: 'Assister à la prière', desc: "Un rite ancien, dans un lieu de recueillement.",
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'prayTemple', label: 'Méditer en silence', desc: 'La quiétude du sanctuaire apaise.',
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
    {
      id: 'workTemple', label: 'Aider le sanctuaire', desc: 'Entretien et aide aux pèlerins.',
      isLocked: () => false, lockMsg: '',
      perform: ({ advanceMonth, close }) => { close(); advanceMonth(); },
    },
  ],
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VillageMapScreen({ navigation }: Props) {
  const player = useGameStore((s) => s.player);
  const advanceMonth = useGameStore((s) => s.advanceMonth);

  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);

  if (!player) return null;

  const handlePoiPress = (poi: PointOfInterest) => setSelectedPoi(poi);
  const closeSheet = () => setSelectedPoi(null);

  const locId = selectedPoi?.id as LocationId | undefined;
  const activities = locId ? (LOCATION_ACTIVITIES[locId] ?? []) : [];
  const flavor = locId ? LOCATION_FLAVOR[locId] : '';
  const isRiver = locId === 'river';

  return (
    <SafeAreaView style={styles.safe}>
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

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <View style={[styles.tab, styles.tabActive]}>
          <Text style={[styles.tabText, styles.tabTextActive]}>🏘 Village</Text>
        </View>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => navigation.navigate('EuropeMap')}
        >
          <Text style={styles.tabText}>🌍 Europe</Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      <PixelMap
        mapData={VILLAGE_MAP}
        pois={VILLAGE_POIS}
        onPoiPress={handlePoiPress}
        width={288}
        height={288}
        tileSize={6}
      />

      {/* Location bottom sheet */}
      <BottomSheet
        visible={selectedPoi !== null}
        onClose={closeSheet}
        title={`${selectedPoi?.icon ?? ''} ${selectedPoi?.label ?? ''}`}
      >
        {/* Flavor */}
        {flavor ? (
          <Text style={styles.flavor}>{flavor}</Text>
        ) : null}

        {/* River: flavor only */}
        {isRiver ? (
          <Text style={styles.riverMsg}>
            Vous observez la rivière couler. L'eau murmure entre les pierres.{'\n'}Un moment de paix.
          </Text>
        ) : null}

        {/* Activities */}
        {activities.length > 0 ? (
          <View style={styles.activityList}>
            <Text style={styles.activityHeader}>Activités disponibles</Text>
            {activities.map((act) => {
              const locked = act.isLocked(player);
              return (
                <TouchableOpacity
                  key={act.id}
                  style={[styles.activityRow, locked && styles.activityRowLocked]}
                  onPress={() => {
                    if (!locked) {
                      act.perform({ navigation, advanceMonth, close: closeSheet });
                    }
                  }}
                  disabled={locked}
                  activeOpacity={0.7}
                >
                  <View style={styles.activityRowInner}>
                    <Text style={[styles.activityLabel, locked && styles.activityLabelLocked]}>
                      {act.label}
                    </Text>
                    <Text style={[styles.activityDesc, locked && styles.activityDescLocked]}>
                      {locked ? act.lockMsg : act.desc}
                    </Text>
                  </View>
                  {!locked && <Text style={styles.activityArrow}>›</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
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

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: Colors.accent,
  },
  tabText: {
    fontFamily: 'serif',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
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
  riverMsg: {
    fontFamily: 'serif',
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
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
  activityLabel: {
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  activityLabelLocked: { color: Colors.textSecondary },
  activityDesc: {
    fontFamily: 'serif',
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 1,
  },
  activityDescLocked: { color: Colors.surfaceDark },
  activityArrow: {
    fontFamily: 'serif',
    fontSize: 20,
    color: Colors.accent,
    marginLeft: 8,
  },
});
