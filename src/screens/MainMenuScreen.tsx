import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MainMenuScreenProps } from '../navigation/types';
import { Colors } from '../theme/colors';

export default function MainMenuScreen({ navigation }: MainMenuScreenProps) {
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('medieval_save_v1').then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        setHasSave(!!parsed?.state?.player);
      } catch {}
    });
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.titleSection}>
          <Text style={styles.era}>Anno Domini · XII Siècle</Text>
          <Text style={styles.title}>Chevalier</Text>
          <View style={styles.divider} />
          <Text style={styles.tagline}>Une vie de gloire, d'honneur et de sang</Text>
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('CharacterCreation')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Nouvelle Partie</Text>
          </TouchableOpacity>

          {hasSave && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Game')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Continuer</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.footer}>MCMCC</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.parchment,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  titleSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  era: {
    fontFamily: 'serif',
    fontSize: 12,
    color: Colors.accent,
    letterSpacing: 3,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'serif',
    fontSize: 68,
    color: Colors.textPrimary,
    letterSpacing: 6,
    fontWeight: '700',
  },
  divider: {
    width: 72,
    height: 2,
    backgroundColor: Colors.accent,
    marginVertical: 18,
  },
  tagline: {
    fontFamily: 'serif',
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonSection: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.buttonBg,
    paddingVertical: 16,
    borderRadius: 3,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: 'serif',
    fontSize: 18,
    color: Colors.buttonText,
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    borderRadius: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 52,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'serif',
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  footer: {
    fontFamily: 'serif',
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 4,
    opacity: 0.4,
  },
});
