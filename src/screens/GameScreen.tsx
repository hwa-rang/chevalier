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
import EventModal from '../components/EventModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default function GameScreen({ navigation }: Props) {
  const player = useGameStore((s) => s.player);
  const advanceMonth = useGameStore((s) => s.advanceMonth);
  const pendingEvent = useGameStore((s) => s.pendingEvent);
  const resolveEvent = useGameStore((s) => s.resolveEvent);

  if (!player) return null;

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
        {/* Map shortcut */}
        <TouchableOpacity
          style={styles.mapBanner}
          onPress={() => navigation.navigate('VillageMap')}
        >
          <Text style={styles.mapBannerText}>🗺 Carte du village</Text>
          <Text style={styles.mapBannerSub}>Explorez et agissez depuis la carte</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Activités sociales</Text>

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

        <TouchableOpacity style={styles.advanceButton} onPress={advanceMonth}>
          <Text style={styles.advanceText}>Passer au mois suivant →</Text>
        </TouchableOpacity>
      </ScrollView>
      <EventModal event={pendingEvent} onChoose={resolveEvent} />
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  mapBannerText: {
    fontFamily: 'serif',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accent,
  },
  mapBannerSub: {
    fontFamily: 'serif',
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
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
