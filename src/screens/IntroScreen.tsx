import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Intro'>;

const NARRATIVE = `An de grâce 1314.

L'Europe vacille entre l'or et le sang. Les cendres de l'Ordre du Temple fument encore sur les bûchers, les grands seigneurs aiguisent leurs ambitions dans l'ombre des donjons, et l'on murmure déjà que de mauvaises récoltes s'annoncent — que la faim viendra frapper aux portes avant que les neiges ne fondent.

Les routes sont mauvaises, les hivers longs, et la peur voyage plus vite que les nouvelles. Pourtant, dans ce monde de fer et de prières, un nom peut encore s'élever de la boue jusqu'à la gloire — ou sombrer dans l'oubli et la honte.

Vous n'êtes qu'un enfant de quinze printemps, né loin des fastes de la cour. Vos mains n'ont pas encore connu le poids d'une véritable épée, ni votre nom l'éclat des tournois. Mais le sang qui bat à vos tempes réclame davantage que la vie tracée pour vous.

Votre père et votre mère veillent sur vous, fiers et inquiets à la fois. Leur estime vous est acquise — mais l'honneur, dit-on, se perd bien plus vite qu'il ne se gagne, et nul déshonneur ne demeure longtemps secret au foyer.

Les années passeront, mois après mois. Vous forgerez votre corps et votre esprit — aux champs, à la forge, au poste de garde, dans le silence des chapelles comme dans le vacarme des tavernes — apprenant le maniement des armes, les lettres, la foi et la ruse.

Vous tisserez des liens : familles, amis, maîtres d'armes, amours… et peut-être quelques ennemis. Chaque geste d'honneur ou de bassesse ouvrira ou fermera bien des portes.

Et quand vous serez prêt, les grands tournois vous appelleront, de la France à la Bohême. Sous les bannières claquant au vent, la foule scandera le nom des champions. Saurez-vous qu'elle scande le vôtre ?

De ces humbles débuts, deviendrez-vous une légende — ou ne resterez-vous qu'un nom de plus, emporté par le vent ?

Le parchemin de votre vie est encore vierge. La plume est entre vos mains.

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
        // Quick start, then a near-steady pace (no mid-crawl acceleration like
        // the default ease-in-out). Gentle quad ease-out keeps the end readable.
        easing: Easing.out(Easing.quad),
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
