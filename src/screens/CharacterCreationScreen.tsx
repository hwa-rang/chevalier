import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CharacterCreationScreenProps } from '../navigation/types';
import { useGameStore } from '../store/gameStore';
import type { Background, SkinTone, Hair } from '../types/game';
import { AMBITIONS } from '../data/ambitions';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const SKIN_TONES: { id: SkinTone; color: string }[] = [
  { id: 'tone1', color: '#F0CBA8' }, // claire → skin-1
  { id: 'tone2', color: '#C68642' }, // mate → skin-2
  { id: 'tone3', color: '#8D5524' }, // brune → skin-3
  { id: 'tone4', color: '#4A2F1B' }, // foncée → skin-4
];

const HAIR_COLORS: { id: Hair; color: string }[] = [
  { id: 'brun', color: '#5A3A1E' },
  { id: 'blond', color: '#D9B45A' },
  { id: 'noir', color: '#1E1A17' },
  { id: 'rouge', color: '#9B3B1B' },
];

const BACKGROUNDS: {
  id: Background;
  label: string;
  flavor: string;
  tags: string[];
}[] = [
  {
    id: 'noble',
    label: 'Noble',
    flavor: 'Né dans une famille illustre aux armoiries respectées.',
    tags: ['Réputation +20', 'Éloquence +15', 'Culture +15', 'Gloire +5'],
  },
  {
    id: 'merchant',
    label: 'Marchand',
    flavor: "Le négoce coule dans vos veines, autant que l'or dans vos coffres.",
    tags: ['Or +50', 'Éloquence +20', 'Culture +20'],
  },
  {
    id: 'blacksmith',
    label: 'Forgeron',
    flavor: 'Vos bras ont été forgés dans la chaleur des braises.',
    tags: ['Forge +25', 'Force +15', 'Endurance +10'],
  },
  {
    id: 'farmer',
    label: 'Paysan',
    flavor: 'La terre vous a appris la patience et la résistance.',
    tags: ['Endurance +20', 'Force +15', 'Vitesse +10'],
  },
  {
    id: 'clergy',
    label: 'Clerc',
    flavor: 'Dieu et les lettres ont guidé votre jeunesse studieuse.',
    tags: ['Religion +25', 'Littérature +20', 'Culture +15', 'Éloquence +10'],
  },
  {
    id: 'outlaw',
    label: 'Hors-la-loi',
    flavor: 'Les ombres et les ruelles sombres sont votre demeure.',
    tags: ['Vitesse +20', 'Agilité +15', 'Honneur −20'],
  },
];

const STEP_TITLES = [
  'Votre Nom',
  'Votre Apparence',
  'Votre Origine',
  'Votre Ambition',
  'Votre Destinée',
] as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepName({
  name,
  onChange,
}: {
  name: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.stepBody}>
      <Text style={styles.stepPrompt}>Comment vous nomme-t-on ?</Text>
      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={onChange}
        placeholder="Votre nom..."
        placeholderTextColor={Colors.textSecondary + '66'}
        maxLength={30}
        autoFocus
        returnKeyType="next"
        autoCapitalize="words"
        selectionColor={Colors.accent}
      />
    </View>
  );
}

function StepAppearance({
  skin,
  hair,
  onSelectSkin,
  onSelectHair,
}: {
  skin: SkinTone;
  hair: Hair;
  onSelectSkin: (t: SkinTone) => void;
  onSelectHair: (h: Hair) => void;
}) {
  return (
    <View style={styles.stepBody}>
      <Text style={styles.stepPrompt}>Votre carnation</Text>
      <View style={styles.toneRow}>
        {SKIN_TONES.map((tone) => (
          <TouchableOpacity
            key={tone.id}
            style={[
              styles.toneCircle,
              { backgroundColor: tone.color },
              skin === tone.id && styles.toneCircleSelected,
            ]}
            onPress={() => onSelectSkin(tone.id)}
            activeOpacity={0.8}
          />
        ))}
      </View>

      <Text style={[styles.stepPrompt, { marginTop: 32 }]}>Vos cheveux</Text>
      <View style={styles.toneRow}>
        {HAIR_COLORS.map((h) => (
          <TouchableOpacity
            key={h.id}
            style={[
              styles.toneCircle,
              { backgroundColor: h.color },
              hair === h.id && styles.toneCircleSelected,
            ]}
            onPress={() => onSelectHair(h.id)}
            activeOpacity={0.8}
          />
        ))}
      </View>
    </View>
  );
}

function StepBackground({
  selected,
  onSelect,
}: {
  selected: Background;
  onSelect: (b: Background) => void;
}) {
  return (
    <View style={styles.stepBody}>
      <Text style={styles.stepPrompt}>De quelle origine êtes-vous ?</Text>
      {BACKGROUNDS.map((bg) => (
        <TouchableOpacity
          key={bg.id}
          style={[styles.bgCard, selected === bg.id && styles.bgCardSelected]}
          onPress={() => onSelect(bg.id)}
          activeOpacity={0.85}
        >
          <Text style={styles.bgName}>{bg.label}</Text>
          <Text style={styles.bgFlavor}>{bg.flavor}</Text>
          <View style={styles.tagRow}>
            {bg.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function StepAmbition({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.stepBody}>
      <Text style={styles.stepPrompt}>Quel destin poursuivez-vous ?</Text>
      {AMBITIONS.map((a) => (
        <TouchableOpacity
          key={a.id}
          style={[styles.bgCard, selected === a.id && styles.bgCardSelected]}
          onPress={() => onSelect(a.id)}
          activeOpacity={0.85}
        >
          <Text style={styles.bgName}>{a.label}</Text>
          <Text style={styles.bgFlavor}>{a.flavor}</Text>
          <View style={styles.tagRow}>
            {a.objectives.map((o, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{o.label}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function StepConfirm({
  name,
  toneColor,
  background,
  ambitionLabel,
}: {
  name: string;
  toneColor: string;
  background: { label: string; tags: string[] };
  ambitionLabel: string;
}) {
  return (
    <View style={styles.stepBody}>
      <Text style={styles.stepPrompt}>Votre destinée</Text>
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Nom</Text>
          <Text style={styles.summaryValue}>{name}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Carnation</Text>
          <View style={[styles.summaryToneSwatch, { backgroundColor: toneColor }]} />
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Origine</Text>
          <Text style={styles.summaryValue}>{background.label}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Ambition</Text>
          <Text style={styles.summaryValue}>{ambitionLabel}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View>
          <Text style={styles.summaryLabel}>Atouts de départ</Text>
          <View style={[styles.tagRow, { marginTop: 10 }]}>
            {background.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

type Step = 1 | 2 | 3 | 4 | 5;

export default function CharacterCreationScreen({
  navigation,
}: CharacterCreationScreenProps) {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [skinTone, setSkinTone] = useState<SkinTone>('tone1');
  const [hair, setHair] = useState<Hair>('brun');
  const [background, setBackground] = useState<Background>('noble');
  const [ambition, setAmbition] = useState<string>(AMBITIONS[0].id);

  const initNewGame = useGameStore((state) => state.initNewGame);

  const handleBack = () => {
    if (step > 1) setStep(((step - 1) as Step));
    else navigation.goBack();
  };

  const handleNext = () => {
    if (step < 5) {
      setStep(((step + 1) as Step));
    } else {
      initNewGame(name.trim(), background, skinTone, hair, ambition);
      navigation.replace('Intro');
    }
  };

  const canProceed = step === 1 ? name.trim().length > 0 : true;

  const selectedBg = BACKGROUNDS.find((b) => b.id === background)!;
  const selectedTone = SKIN_TONES.find((t) => t.id === skinTone)!;
  const selectedAmbition = AMBITIONS.find((a) => a.id === ambition)!;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{STEP_TITLES[step - 1]}</Text>
          <View style={styles.dots}>
            {([1, 2, 3, 4, 5] as Step[]).map((s) => (
              <View
                key={s}
                style={[styles.dot, s === step && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && <StepName name={name} onChange={setName} />}
          {step === 2 && (
            <StepAppearance
              skin={skinTone}
              hair={hair}
              onSelectSkin={setSkinTone}
              onSelectHair={setHair}
            />
          )}
          {step === 3 && (
            <StepBackground selected={background} onSelect={setBackground} />
          )}
          {step === 4 && (
            <StepAmbition selected={ambition} onSelect={setAmbition} />
          )}
          {step === 5 && (
            <StepConfirm
              name={name}
              toneColor={selectedTone.color}
              background={selectedBg}
              ambitionLabel={selectedAmbition.label}
            />
          )}
        </ScrollView>

        {/* Fixed bottom button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              !canProceed && styles.nextButtonDisabled,
            ]}
            onPress={canProceed ? handleNext : undefined}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {step === 5 ? 'Commencer votre histoire' : 'Suivant'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  flex: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '55',
    backgroundColor: Colors.parchment,
  },
  backButton: {
    marginBottom: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: Colors.textSecondary,
  },
  headerTitle: {
    fontFamily: Fonts.title,
    fontSize: 30,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 0,
    backgroundColor: Colors.surfaceDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },

  // Scroll area
  scrollContent: {
    paddingBottom: 24,
  },

  // Shared step layout
  stepBody: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  stepPrompt: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 24,
    textTransform: 'uppercase',
  },

  // Step 1 — Name
  nameInput: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
    fontSize: 28,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    minHeight: 52,
  },

  // Step 2 — Skin tone
  toneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  toneCircle: {
    width: 56,
    height: 56,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  toneCircleSelected: {
    borderColor: Colors.textPrimary,
    borderWidth: 3,
  },

  // Step 3 — Background cards
  bgCard: {
    backgroundColor: Colors.surface,
    borderRadius: 0,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.border + '66',
    minHeight: 44,
  },
  bgCardSelected: {
    borderColor: Colors.accent,
    borderWidth: 2,
    backgroundColor: Colors.surface,
  },
  bgName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  bgFlavor: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 10,
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: Colors.tagBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
  },
  tagText: {
    fontSize: 11,
    color: Colors.tagText,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Step 4 — Summary
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 0,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 17,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border + '55',
  },
  summaryToneSwatch: {
    width: 34,
    height: 34,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Footer / next button
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border + '44',
    backgroundColor: Colors.parchment,
  },
  nextButton: {
    backgroundColor: Colors.buttonBg,
    paddingVertical: 16,
    borderRadius: 0,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: Colors.surfaceDark,
  },
  nextButtonText: {
    fontFamily: Fonts.body,
    fontSize: 17,
    color: Colors.buttonText,
    letterSpacing: 0.5,
  },
});
