import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Intro'>;

const NARRATIVE = `An de grâce 1200.

Vous n'êtes qu'un enfant du commun, né loin des fastes de la cour. Pourtant, un rêve brûle en vous : celui de devenir un chevalier dont le nom résonnera dans toute l'Europe.

Les années passeront mois après mois. Vous forgerez votre corps et votre esprit — aux champs, à la forge, au poste de garde — apprenant le maniement des armes, les lettres et la ruse.

Vous tisserez des liens : familles, amis, maîtres d'armes, amours… et peut-être quelques ennemis. Votre honneur et votre réputation ouvriront ou fermeront bien des portes.

Quand vous serez prêt, les grands tournois vous appelleront, de la France à la Bohême. Chaque victoire grandira votre gloire.

Saurez-vous, de ces humbles débuts, devenir une légende ?

Votre histoire commence maintenant.`;

export default function IntroScreen({ navigation }: Props) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [textH, setTextH] = useState(0);
  const [viewH, setViewH] = useState(0);

  useEffect(() => {
    if (textH > 0 && viewH > 0) {
      scrollY.setValue(viewH * 0.6);
      const distance = textH + viewH * 0.6;
      Animated.timing(scrollY, {
        toValue: -textH,
        duration: Math.max(14000, distance * 28),
        useNativeDriver: true,
      }).start();
    }
  }, [textH, viewH, scrollY]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View
        style={styles.viewport}
        onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
      >
        <Animated.View
          style={[styles.crawl, { transform: [{ translateY: scrollY }] }]}
          onLayout={(e) => setTextH(e.nativeEvent.layout.height)}
        >
          <Text style={styles.title}>Chevalier</Text>
          <Text style={styles.body}>{NARRATIVE}</Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => navigation.replace('Game')}
          activeOpacity={0.85}
        >
          <Text style={styles.startText}>Commencer l'aventure →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#2A160A' },
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  crawl: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 28,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 34,
    fontWeight: '700',
    color: Colors.accent,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 2,
  },
  body: {
    fontFamily: 'serif',
    fontSize: 17,
    color: '#F5EDD6',
    textAlign: 'center',
    lineHeight: 28,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245,237,214,0.2)',
  },
  startBtn: {
    backgroundColor: Colors.buttonBg,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  startText: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.buttonText,
    letterSpacing: 0.5,
  },
});
