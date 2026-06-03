import React from 'react';
import {
  View,
  Text,
  StyleSheet,  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useGameStore, energyUsed } from '../store/gameStore';
import FatigueGauge from '../components/FatigueGauge';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default function GameScreen({ navigation }: Props) {
  const player = useGameStore((s) => s.player);
  const advanceMonth = useGameStore((s) => s.advanceMonth);

  if (!player) return null;

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
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Map shortcut — primary gameplay entry point, made prominent */}
        <TouchableOpacity
          style={styles.mapBanner}
          onPress={() => navigation.navigate('VillageMap')}
          activeOpacity={0.85}
        >
          <Text style={styles.mapBannerIcon}>🗺</Text>
          <Text style={styles.mapBannerText}>Carte du village</Text>
          <Text style={styles.mapBannerSub}>Explorez et agissez depuis la carte</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Autres menus</Text>

        <TouchableOpacity
          style={styles.activityButton}
          onPress={() => navigation.navigate('Character')}
        >
          <Text style={styles.activityTitle}>Fiche de personnage</Text>
          <Text style={styles.activityDesc}>Consultez vos statistiques et votre carrière.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.activityButton}
          onPress={() => navigation.navigate('Shop')}
        >
          <Text style={styles.activityTitle}>Visiter le marché</Text>
          <Text style={styles.activityDesc}>Achetez équipements et fournitures.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.activityButton}
          onPress={() => navigation.navigate('Inventory')}
        >
          <Text style={styles.activityTitle}>Inventaire</Text>
          <Text style={styles.activityDesc}>Consultez vos équipements.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.activityButton}
          onPress={() => navigation.navigate('Relations')}
        >
          <Text style={styles.activityTitle}>Relations</Text>
          <Text style={styles.activityDesc}>Gérez vos liens — famille, amis, amours.</Text>
        </TouchableOpacity>

        {player.age >= 20 && (
          <TouchableOpacity
            style={[styles.activityButton, styles.tournamentButton]}
            onPress={() => navigation.navigate('TournamentList')}
          >
            <Text style={[styles.activityTitle, styles.tournamentTitle]}>Tournois</Text>
            <Text style={styles.activityDesc}>Participez aux grands tournois d'Europe.</Text>
          </TouchableOpacity>
        )}

        <View style={styles.spacer} />

        <View style={styles.actionSummary}>
          <FatigueGauge used={energyUsed(player)} />
        </View>

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
    fontFamily: 'serif',
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusValue: {
    fontFamily: 'serif',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  content: {
    padding: 16,
    gap: 10,
  },
  sectionLabel: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  activityButton: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  activityTitle: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  activityDesc: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  spacer: {
    height: 24,
  },
  actionSummary: {
    alignItems: 'stretch',
    marginBottom: 8,
  },
  actionSummaryText: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '700',
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
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 28,
    marginBottom: 12,
    alignItems: 'center',
  },
  mapBannerIcon: {
    fontSize: 40,
    marginBottom: 6,
  },
  mapBannerText: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '700',
    color: Colors.accent,
  },
  mapBannerSub: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  advanceButton: {
    backgroundColor: Colors.buttonBg,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  advanceText: {
    fontFamily: 'serif',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.buttonText,
    letterSpacing: 1,
  },
});
