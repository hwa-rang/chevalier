import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,  ScrollView,
  FlatList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import {
  useGameStore,
  ITEM_SELL_PRICE,
  MERCHANT_MAX_PER_ITEM,
} from '../store/gameStore';
import { SHOP_ITEMS, makeInventoryItem } from '../data/shopItems';
import type { ShopItem } from '../data/shopItems';
import { canBuy } from '../utils/shopRestrictions';
import type { ItemCategory, Player } from '../types/game';

interface SellGroup {
  subtype: string;
  name: string;
  quantity: number;
}

function groupForSale(inventory: Player['inventory']): SellGroup[] {
  const map: Record<string, SellGroup> = {};
  for (const item of inventory) {
    if (map[item.subtype]) map[item.subtype].quantity += 1;
    else map[item.subtype] = { subtype: item.subtype, name: item.name, quantity: 1 };
  }
  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
}

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
  const sellItem = useGameStore((s) => s.sellItem);

  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [activeCategory, setActiveCategory] = useState<ItemCategory>('weapon');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = SHOP_ITEMS.filter((i) => i.category === activeCategory);

  function showToast(msg: string) {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastVisible(true);
    toastOpacity.setValue(0);
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
    showToast('Équipement acheté — voir le personnage');
  }

  function handleSell(subtype: string) {
    const res = sellItem(subtype);
    showToast(res.ok ? `Vendu pour ${ITEM_SELL_PRICE} g` : res.reason ?? 'Vente refusée');
  }

  if (!player) return null;

  const merchantStock = player.merchantStock ?? {};
  const sellGroups = groupForSale(player.inventory);

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

      {/* Buy / Sell mode toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'buy' && styles.modeBtnActive]}
          onPress={() => setMode('buy')}
        >
          <Text style={[styles.modeText, mode === 'buy' && styles.modeTextActive]}>Acheter</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'sell' && styles.modeBtnActive]}
          onPress={() => setMode('sell')}
        >
          <Text style={[styles.modeText, mode === 'sell' && styles.modeTextActive]}>Vendre</Text>
        </TouchableOpacity>
      </View>

      {mode === 'buy' ? (
        <>
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
        </>
      ) : (
        <FlatList
          data={sellGroups}
          keyExtractor={(g) => g.subtype}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.sellEmpty}>Vous n'avez rien à vendre.</Text>
          }
          renderItem={({ item }) => (
            <SellItemCard
              group={item}
              merchantCount={merchantStock[item.subtype] ?? 0}
              onSell={handleSell}
            />
          )}
        />
      )}

      {/* Toast */}
      {toastVisible && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMsg}</Text>
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
// Sell card
// ---------------------------------------------------------------------------

function SellItemCard({
  group,
  merchantCount,
  onSell,
}: {
  group: SellGroup;
  merchantCount: number;
  onSell: (subtype: string) => void;
}) {
  const full = merchantCount >= MERCHANT_MAX_PER_ITEM;
  return (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.cardInfo}>
          <Text style={styles.itemName}>
            {group.name}
            {group.quantity > 1 ? `  ×${group.quantity}` : ''}
          </Text>
          <Text style={styles.itemDescription}>
            {full
              ? "Le marchand n'en veut plus pour l'instant."
              : `Revente : ${ITEM_SELL_PRICE} g la pièce`}
          </Text>
          <Text style={styles.merchantNote}>
            Marchand : {merchantCount}/{MERCHANT_MAX_PER_ITEM}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <TouchableOpacity
            style={[styles.buyButton, full && styles.buyButtonDisabled]}
            onPress={() => onSell(group.subtype)}
            disabled={full}
          >
            <Text style={[styles.buyButtonText, full && styles.buyButtonTextDisabled]}>
              Vendre
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
  modeRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modeBtnActive: {
    borderBottomWidth: 3,
    borderBottomColor: Colors.accent,
  },
  modeText: {
    fontFamily: 'serif',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  modeTextActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  merchantNote: {
    fontFamily: 'serif',
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sellEmpty: {
    fontFamily: 'serif',
    fontSize: 15,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 40,
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
