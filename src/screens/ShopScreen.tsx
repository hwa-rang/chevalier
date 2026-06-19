import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,  ScrollView,
  FlatList,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
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
    // Bulk goods (e.g. logs) have their own dedicated market sale, not flat resale.
    if (item.category === 'goods') continue;
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

/** Theft success chance (0–1) — clumsy thieves get caught. */
function theftChance(agility: number): number {
  return Math.max(0.12, Math.min(0.9, 0.5 + agility * 0.0035));
}
/** Escape chance (0–1) once spotted — only the swift get away. */
function escapeChance(speed: number): number {
  return Math.max(0.1, Math.min(0.9, 0.45 + speed * 0.0035));
}

/** Flavour shown when a botched escape ends in capture. */
const FLEE_FAIL_LEADS = [
  'Le garde vous rattrape sans peine et vous empoigne par le col.',
  'Vos jambes ne valent pas les siennes : une main de fer s’abat sur votre épaule.',
  'À peine trois enjambées, et le voilà déjà sur vous.',
  'La foule vous barre le passage ; le garde n’a plus qu’à se baisser pour vous cueillir.',
];

/** Flavour shown when the thief gives up without running. */
const SURRENDER_LEADS = [
  'Vous levez les mains et rendez votre butin, tête basse.',
  'Inutile de courir : vous vous rendez sous les huées des marchands.',
  'Le butin glisse de vos doigts tandis que le garde vous saisit le bras.',
];

function pickLead(leads: string[]): string {
  return leads[Math.floor(Math.random() * leads.length)];
}

export default function ShopScreen({ navigation }: Props) {
  const player = useGameStore((s) => s.player);
  const purchaseItem = useGameStore((s) => s.purchaseItem);
  const sellItem = useGameStore((s) => s.sellItem);
  const consumeActionSlot = useGameStore((s) => s.consumeActionSlot);
  const stealMarketSuccess = useGameStore((s) => s.stealMarketSuccess);
  const commitTheftCaught = useGameStore((s) => s.commitTheftCaught);

  const [mode, setMode] = useState<'buy' | 'sell' | 'steal'>('buy');
  const [activeCategory, setActiveCategory] = useState<ItemCategory>('weapon');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Theft flow: when caught, offer to flee; then show the verdict.
  const [caughtItem, setCaughtItem] = useState<ShopItem | null>(null);
  const [theftVerdict, setTheftVerdict] = useState<{ lead: string; note: string } | null>(null);

  // Purchase-confirmation window (offers a shortcut to the inventory).
  const [purchased, setPurchased] = useState<ShopItem | null>(null);

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
    setPurchased(shopItem);
  }

  function handleSell(subtype: string) {
    const res = sellItem(subtype);
    showToast(res.ok ? `Vendu pour ${ITEM_SELL_PRICE} g` : res.reason ?? 'Vente refusée');
  }

  function handleSteal(shopItem: ShopItem) {
    if (!player) return;
    // A theft attempt costs a monthly action.
    if (!consumeActionSlot('secondary')) {
      showToast('Vous êtes épuisé — revenez le mois prochain.');
      return;
    }
    if (Math.random() < theftChance(player.physicalStats.agility)) {
      stealMarketSuccess(makeInventoryItem(shopItem));
      showToast(`Subtilisé : ${shopItem.name} (−1 honneur)`);
    } else {
      setCaughtItem(shopItem); // spotted → flee-or-surrender modal
    }
  }

  function attemptFlee() {
    if (!player) return;
    setCaughtItem(null);
    if (Math.random() < escapeChance(player.physicalStats.speed)) {
      showToast('Vous fendez la foule et disparaissez !');
    } else {
      const res = commitTheftCaught();
      setTheftVerdict({ lead: pickLead(FLEE_FAIL_LEADS), note: res.note });
    }
  }

  function surrender() {
    setCaughtItem(null);
    const res = commitTheftCaught();
    setTheftVerdict({ lead: pickLead(SURRENDER_LEADS), note: res.note });
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
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'steal' && styles.modeBtnActive]}
          onPress={() => setMode('steal')}
        >
          <Text style={[styles.modeText, mode === 'steal' && styles.modeTextActive]}>Voler</Text>
        </TouchableOpacity>
      </View>

      {mode === 'buy' || mode === 'steal' ? (
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

          {mode === 'steal' && (
            <Text style={styles.stealHint}>
              Subtiliser dépend de votre agilité ({player.physicalStats.agility}). Pris en
              flagrant délit, fuyez grâce à votre vitesse — ou rendez-vous.
            </Text>
          )}

          {/* Item list */}
          <FlatList
            data={items}
            style={styles.list}
            keyExtractor={(item) => item.catalogId}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) =>
              mode === 'steal' ? (
                <StealItemCard item={item} chance={theftChance(player.physicalStats.agility)} onSteal={handleSteal} />
              ) : (
                <ShopItemCard item={item} player={player} onBuy={handleBuy} />
              )
            }
          />
        </>
      ) : (
        <FlatList
          data={sellGroups}
          style={styles.list}
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

      {/* Purchase confirmation → shortcut to inventory */}
      <Modal visible={purchased !== null} transparent animationType="fade" onRequestClose={() => setPurchased(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Achat conclu</Text>
            <Text style={styles.modalBody}>« {purchased?.name} » rejoint votre inventaire.</Text>
            <TouchableOpacity
              style={styles.modalBtnPrimary}
              onPress={() => {
                setPurchased(null);
                navigation.navigate('Inventory');
              }}
            >
              <Text style={styles.modalBtnPrimaryText}>Voir l'inventaire</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnGhost} onPress={() => setPurchased(null)}>
              <Text style={styles.modalBtnGhostText}>Continuer les achats</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Caught stealing → flee or surrender */}
      <Modal visible={caughtItem !== null} transparent animationType="fade" onRequestClose={() => setCaughtItem(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Au voleur !</Text>
            <Text style={styles.modalBody}>
              On vous a vu glisser {caughtItem?.name} sous votre cape. Les gardes accourent —
              tenterez-vous de fuir (vitesse {player.physicalStats.speed}) ?
            </Text>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={attemptFlee}>
              <Text style={styles.modalBtnPrimaryText}>Tenter de fuir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnGhost} onPress={surrender}>
              <Text style={styles.modalBtnGhostText}>Se rendre</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Verdict after being caught */}
      <Modal visible={theftVerdict !== null} transparent animationType="fade" onRequestClose={() => setTheftVerdict(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalLead}>{theftVerdict?.lead}</Text>
            <Text style={styles.modalBody}>{theftVerdict?.note}</Text>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => setTheftVerdict(null)}>
              <Text style={styles.modalBtnPrimaryText}>Soit.</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
// Steal card
// ---------------------------------------------------------------------------

function StealItemCard({
  item,
  chance,
  onSteal,
}: {
  item: ShopItem;
  chance: number;
  onSteal: (item: ShopItem) => void;
}) {
  const pct = Math.round(chance * 100);
  const risk = pct >= 66 ? 'Discret' : pct >= 40 ? 'Risqué' : 'Périlleux';
  return (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.cardInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDescription}>{item.description}</Text>
          <Text style={styles.stealOdds}>
            {risk} — {pct}% de réussite
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.price}>{item.price} g</Text>
          <TouchableOpacity style={styles.stealButton} onPress={() => onSteal(item)}>
            <Text style={styles.stealButtonText}>Voler</Text>
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
    fontFamily: Fonts.title,
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  goldBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  goldText: {
    fontFamily: Fonts.bodyBold,
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
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  modeTextActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  merchantNote: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sellEmpty: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 40,
  },
  tabsRow: {
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 0,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: Colors.buttonBg,
  },
  tabText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 22,
    color: Colors.textSecondary,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  tabTextActive: {
    color: Colors.buttonText,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    gap: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 0,
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
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemDescription: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  requirementUnmet: {
    fontFamily: Fonts.body,
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
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accent,
  },
  buyButton: {
    backgroundColor: Colors.buttonBg,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  buyButtonDisabled: {
    backgroundColor: Colors.surfaceDark,
  },
  buyButtonText: {
    fontFamily: Fonts.bodyBold,
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
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toastText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.buttonText,
    textAlign: 'center',
  },
  stealHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  stealOdds: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5A2B',
    marginTop: 2,
  },
  stealButton: {
    backgroundColor: '#6B1F1F',
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  stealButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#F5E9D0',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontFamily: Fonts.title,
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  modalLead: {
    fontFamily: Fonts.title,
    fontSize: 24,
    color: Colors.textPrimary,
    lineHeight: 32,
  },
  modalBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  modalBtnPrimary: {
    backgroundColor: Colors.buttonBg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalBtnPrimaryText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.buttonText,
  },
  modalBtnGhost: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalBtnGhostText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
