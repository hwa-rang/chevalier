import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useGameStore } from '../store/gameStore';
import { ambitionById, ambitionProgress } from '../data/ambitions';
import { questById, questMonthsLeft } from '../data/quests';
import { titleById, DEFAULT_TITLE_ID } from '../data/titles';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default function GameScreen({ navigation }: Props) {
  const player = useGameStore((s) => s.player);
  const advanceMonth = useGameStore((s) => s.advanceMonth);

  // A dead hero's tale is over — resuming the save lands on the legend screen.
  const isDead = player?.isDead === true;
  useEffect(() => {
    if (isDead) navigation.replace('Legend');
  }, [isDead, navigation]);

  if (!player || isDead) return null;

  // The global TimeTransition overlay handles the fade + navigating to the
  // character sheet (and surfaces any deferred event afterwards).
  const handleAdvance = () => advanceMonth();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Personnage</Text>
          <Text style={styles.statusValue}>{player.name}</Text>
          <Text style={styles.statusTitle}>
            {titleById(player.title ?? DEFAULT_TITLE_ID).label}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Âge</Text>
          <Text style={styles.statusValue}>{player.age} ans</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Date</Text>
          <Text style={styles.statusValue}>
            {MONTH_NAMES[player.currentMonth - 1]} {player.currentYear}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Or</Text>
          <Text style={styles.statusValue}>{player.gold} g</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>PV</Text>
          <Text
            style={[
              styles.statusValue,
              (player.health ?? 100) <= 30 && { color: '#EF5A6F' },
            ]}
          >
            {player.health ?? player.maxHealth ?? 100}/{player.maxHealth ?? 100}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Map shortcut — primary gameplay entry point, made prominent */}
        <TouchableOpacity
          style={styles.mapBanner}
          onPress={() => navigation.navigate('VillageMap')}
          activeOpacity={0.85}
        >
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../assets/sprites/png/icon-map.png')}
            style={styles.mapBannerIcon}
            resizeMode="contain"
          />
          <Text style={styles.mapBannerText}>Carte du monde</Text>
          <Text style={styles.mapBannerSub}>Explorez et agissez depuis la carte</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.activityButton}
          onPress={() => navigation.navigate('Character')}
        >
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../assets/sprites/png/icon-character.png')}
            style={styles.activityIcon}
            resizeMode="contain"
          />
          <View style={styles.activityTextWrap}>
            <Text style={styles.activityTitle}>Fiche de personnage</Text>
            <Text style={styles.activityDesc}>Consultez vos statistiques et votre carrière.</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.activityButton}
          onPress={() => navigation.navigate('Inventory')}
        >
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../assets/sprites/png/icon-inventory.png')}
            style={styles.activityIcon}
            resizeMode="contain"
          />
          <View style={styles.activityTextWrap}>
            <Text style={styles.activityTitle}>Inventaire</Text>
            <Text style={styles.activityDesc}>Consultez vos équipements.</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.activityButton}
          onPress={() => navigation.navigate('Relations')}
        >
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../assets/sprites/png/icon-relations.png')}
            style={styles.activityIcon}
            resizeMode="contain"
          />
          <View style={styles.activityTextWrap}>
            <Text style={styles.activityTitle}>Relations</Text>
            <Text style={styles.activityDesc}>Gérez vos liens — famille, amis, amours.</Text>
          </View>
        </TouchableOpacity>

        {/* Destiny / ambition */}
        {(() => {
          const amb = ambitionById(player.ambition);
          const prog = ambitionProgress(player);
          return (
            <View style={styles.destinyCard}>
              <Text style={styles.destinyTitle}>Destinée</Text>
              <Text style={styles.destinyName}>
                {amb.label}{prog.fulfilled ? '  ✦ Accomplie' : ''}
              </Text>
              <Text style={styles.destinyFlavor}>{amb.flavor}</Text>
              {amb.objectives.map((o, i) => {
                const done = o.done(player);
                return (
                  <View key={i} style={styles.objRow}>
                    <Text style={[styles.objCheck, done && styles.objCheckDone]}>
                      {done ? '✓' : '○'}
                    </Text>
                    <Text style={[styles.objLabel, done && styles.objLabelDone]}>{o.label}</Text>
                  </View>
                );
              })}
              <Text style={styles.destinyProgress}>
                {prog.done}/{prog.total} objectifs accomplis
              </Text>
            </View>
          );
        })()}

        {/* Active contract */}
        {player.activeQuest && (() => {
          const q = questById(player.activeQuest.id);
          if (!q) return null;
          const left = questMonthsLeft(player);
          return (
            <View style={styles.destinyCard}>
              <Text style={styles.destinyTitle}>Contrat en cours</Text>
              <Text style={styles.destinyName}>{q.title} — {q.giver}</Text>
              <Text style={styles.destinyFlavor}>{q.objective}</Text>
              <Text style={styles.destinyProgress}>
                {left > 0 ? `${left} mois restants` : 'Dernier mois !'} · Récompense : {q.rewardText}
              </Text>
            </View>
          );
        })()}

        {player.age >= 20 && (
          <TouchableOpacity
            style={[styles.activityButton, styles.tournamentButton]}
            onPress={() => navigation.navigate('TournamentList')}
          >
            <View style={styles.activityTextWrap}>
              <Text style={[styles.activityTitle, styles.tournamentTitle]}>Tournois</Text>
              <Text style={styles.activityDesc}>Participez aux grands tournois d'Europe.</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.spacer} />

        <TouchableOpacity
          style={styles.advanceButton}
          onPress={handleAdvance}
        >
          <Text style={styles.advanceText}>Passer au mois suivant →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.parchment,
  },
  statusBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  statusTitle: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.accent,
    fontStyle: 'italic',
  },
  content: {
    padding: 16,
    gap: 10,
  },
  destinyCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  destinyTitle: {
    fontFamily: Fonts.title,
    fontSize: 32,
    color: Colors.textPrimary,
  },
  destinyName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.accent,
  },
  destinyFlavor: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  objRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  objCheck: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    width: 16,
    color: Colors.textSecondary,
  },
  objCheckDone: {
    color: '#5FA85C',
  },
  objLabel: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  objLabelDone: {
    color: Colors.textPrimary,
  },
  destinyProgress: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  activityButton: {
    backgroundColor: Colors.surface,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  activityIcon: {
    width: 56,
    height: 56,
  },
  activityTextWrap: {
    flex: 1,
  },
  activityTitle: {
    fontFamily: Fonts.title,
    fontSize: 32,
    color: Colors.textPrimary,
  },
  activityDesc: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  spacer: {
    height: 24,
  },
  tournamentButton: {
    borderColor: Colors.accent,
    borderWidth: 2,
    backgroundColor: Colors.surfaceDark,
  },
  tournamentTitle: {
    color: Colors.accent,
  },
  mapBanner: {
    backgroundColor: Colors.surfaceDark,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 28,
    marginBottom: 12,
    alignItems: 'center',
  },
  mapBannerIcon: {
    width: 72,
    height: 72,
    marginBottom: 6,
  },
  mapBannerText: {
    fontFamily: Fonts.title,
    fontSize: 40,
    color: Colors.accent,
  },
  mapBannerSub: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  advanceButton: {
    backgroundColor: Colors.buttonBg,
    borderRadius: 0,
    paddingVertical: 14,
    alignItems: 'center',
  },
  advanceText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.buttonText,
    letterSpacing: 1,
  },
});
