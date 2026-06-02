import React from 'react';
import {
  View,
  Text,
  StyleSheet,  SectionList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useGameStore } from '../store/gameStore';
import { slotForSubtype, EMPTY_EQUIPMENT } from '../utils/equipment';
import type { Item, ItemCategory } from '../types/game';

type Props = NativeStackScreenProps<RootStackParamList, 'Inventory'>;

interface GroupedItem {
  subtype: string;
  name: string;
  quantity: number;
}

interface Section {
  title: string;
  category: ItemCategory;
  data: GroupedItem[];
}

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  weapon: 'Armes',
  armor: 'Armures',
  book: 'Livres',
  game: 'Jeux',
  clothing: 'Vêtements',
  animal: 'Animaux',
};

const CATEGORY_ORDER: ItemCategory[] = [
  'weapon',
  'armor',
  'clothing',
  'animal',
  'book',
  'game',
];

function groupItems(inventory: Item[]): Section[] {
  const byCategory: Partial<Record<ItemCategory, Record<string, GroupedItem>>> = {};

  for (const item of inventory) {
    if (!byCategory[item.category]) byCategory[item.category] = {};
    const group = byCategory[item.category]!;
    if (group[item.subtype]) {
      group[item.subtype].quantity += 1;
    } else {
      group[item.subtype] = { subtype: item.subtype, name: item.name, quantity: 1 };
    }
  }

  return CATEGORY_ORDER.filter((cat) => byCategory[cat])
    .map((cat) => ({
      title: CATEGORY_LABELS[cat],
      category: cat,
      data: Object.values(byCategory[cat]!).sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export default function InventoryScreen({ navigation }: Props) {
  const player = useGameStore((s) => s.player);
  const equipItem = useGameStore((s) => s.equipItem);
  const unequipSlot = useGameStore((s) => s.unequipSlot);

  if (!player) return null;

  const equipment = player.equipment ?? EMPTY_EQUIPMENT;
  const sections = groupItems(player.inventory);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Inventaire</Text>
        <View style={styles.goldBadge}>
          <Text style={styles.goldText}>{player.gold} g</Text>
        </View>
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Votre inventaire est vide.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.subtype}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const slot = slotForSubtype(item.subtype);
            const equipped = slot ? equipment[slot] === item.subtype : false;
            return (
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.quantity > 1 && (
                  <View style={styles.quantityBadge}>
                    <Text style={styles.quantityText}>×{item.quantity}</Text>
                  </View>
                )}
                {slot && (
                  <TouchableOpacity
                    style={[styles.equipBtn, equipped && styles.equipBtnOn]}
                    onPress={() => (equipped ? unequipSlot(slot) : equipItem(item.subtype))}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.equipBtnText, equipped && styles.equipBtnTextOn]}>
                      {equipped ? 'Équipé ✓' : 'Équiper'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.parchment,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  backText: {
    fontSize: 22,
    color: Colors.textPrimary,
  },
  title: {
    flex: 1,
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  goldBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  goldText: {
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.buttonText,
  },
  listContent: {
    padding: 12,
    gap: 4,
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontFamily: 'serif',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceDark,
    gap: 10,
  },
  itemName: {
    flex: 1,
    fontFamily: 'serif',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  quantityBadge: {
    backgroundColor: Colors.tagBg,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  quantityText: {
    fontFamily: 'serif',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.tagText,
  },
  equipBtn: {
    backgroundColor: Colors.surfaceDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  equipBtnOn: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  equipBtnText: {
    fontFamily: 'serif',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  equipBtnTextOn: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'serif',
    fontSize: 16,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});
