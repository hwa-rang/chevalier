import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';

type ShortcutTarget = 'Character' | 'Inventory' | 'Relations';

interface Props {
  /** Any stack navigation able to reach the three quick-access screens. */
  navigation: { navigate: (screen: ShortcutTarget) => void };
}

const SHORTCUTS: { target: ShortcutTarget; label: string; icon: number }[] = [
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  { target: 'Character', label: 'Personnage', icon: require('../assets/sprites/png/icon-character.png') },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  { target: 'Inventory', label: 'Inventaire', icon: require('../assets/sprites/png/icon-inventory.png') },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  { target: 'Relations', label: 'Relations', icon: require('../assets/sprites/png/icon-relations.png') },
];

/** Row of quick-access icons (fiche perso, inventaire, relations) for the maps. */
export default function MapShortcuts({ navigation }: Props) {
  return (
    <View style={styles.row}>
      {SHORTCUTS.map((s) => (
        <TouchableOpacity
          key={s.target}
          style={styles.btn}
          onPress={() => navigation.navigate(s.target)}
          activeOpacity={0.75}
        >
          <Image source={s.icon} style={styles.icon} resizeMode="contain" />
          <Text style={styles.label}>{s.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  btn: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  icon: {
    width: 40,
    height: 40,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
