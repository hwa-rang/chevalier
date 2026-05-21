import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useGameStore } from '../store/gameStore';
import { SHOP_ITEMS, makeInventoryItem } from '../data/shopItems';
import type { ShopItem } from '../data/shopItems';
import { canBuy } from '../utils/shopRestrictions';
import type { ItemCategory, Player } from '../types/game';

type Props = NativeStackScreenProps<RootStackParamList, 'Shop'>;

interface Tab {
  category: ItemCategory;
  label: string;
}

const TABS: Tab[] = [
  { category: 'weapon', label: 'Armes' },
  { category: 'armor', label: 'Armures' },
  { category: 'book', label: 'Livres' },
  { category: 'game', label: 'Jeux' },
  { category: 'clothing', label: 'Vêtements' },
  { category: 'animal', label: 'Animaux' },
];

export default function ShopScreen({ navigation }: Props) {
  const player = useGameStore((s) => s.player);
  const purchaseItem = useGameStore((s) => s.purchaseItem);

  const [activeCategory, setActiveCategory] = useState<ItemCategory>('weapon');
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = SHOP_ITEMS.filter((i) => i.category === activeCategory);

  function showToast() {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function handleBuy(shopItem: ShopItem) {
    if (!player) return;
    const check = canBuy(player, shopItem);
    if (!check.allowed) return;
    purchaseItem(makeInventoryItem(shopItem), shopItem.price);
    showToast();
  }

  if (!player) return null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Marché</Text>
        <View style={styles.goldBadge}>
          <Text style={styles.goldText}>{player.gold} g</Text>
        </View>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        style={styles.tabsRow}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.category}
            style={[styles.tab, activeCategory === tab.category && styles.tabActive]}
            onPress={() => setActiveCategory(tab.category)}
          >
            <Text
              style={[styles.tabText, activeCategory === tab.category && styles.tabTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Item list */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.catalogId}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <ShopItemCard item={item} player={player} onBuy={handleBuy} />}
      />

      {/* Toast */}
      {toastVisible && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>
            Équipement mis à jour — voir le personnage
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Item card
// ---------------------------------------------------------------------------

function ShopItemCard({
  item,
  player,
  onBuy,
}: {
  item: ShopItem;
  player: Player;
  onBuy: (item: ShopItem) => void;
}) {
  const check = canBuy(player, item);
  const disabled = !check.allowed;

  return (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.cardInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDescription}>{item.description}</Text>
          {check.reasons.map((reason, i) => (
            <Text key={i} style={styles.requirementUnmet}>
              ✗ {reason}
            </Text>
          ))}
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.price}>{item.price} g</Text>
          <TouchableOpacity
            style={[styles.buyButton, disabled && styles.buyButtonDisabled]}
            onPress={() => onBuy(item)}
            disabled={disabled}
          >
            <Text style={[styles.buyButtonText, disabled && styles.buyButtonTextDisabled]}>
              Acheter
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  tabsRow: {
    maxHeight: 48,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabsContainer: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: Colors.buttonBg,
  },
  tabText: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.buttonText,
    fontWeight: '700',
  },
  listContent: {
    padding: 12,
    gap: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemDescription: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  requirementUnmet: {
    fontFamily: 'serif',
    fontSize: 12,
    color: '#B22222',
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 8,
    minWidth: 80,
  },
  price: {
    fontFamily: 'serif',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accent,
  },
  buyButton: {
    backgroundColor: Colors.buttonBg,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  buyButtonDisabled: {
    backgroundColor: Colors.surfaceDark,
  },
  buyButtonText: {
    fontFamily: 'serif',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.buttonText,
  },
  buyButtonTextDisabled: {
    color: Colors.textSecondary,
  },
  toast: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    backgroundColor: Colors.buttonBg,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toastText: {
    fontFamily: 'serif',
    fontSize: 14,
    color: Colors.buttonText,
    textAlign: 'center',
  },
});
