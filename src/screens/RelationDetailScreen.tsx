import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useGameStore } from '../store/gameStore';
import { canRomance } from '../utils/romanceRules';
import type { Relation, RelationType, StatDelta } from '../types/game';

type Props = NativeStackScreenProps<RootStackParamList, 'RelationDetail'>;

const TYPE_LABELS: Record<RelationType, string> = {
  father: 'Père',
  mother: 'Mère',
  sibling: 'Frère/Sœur',
  priest: 'Prêtre',
  friend: 'Ami',
  master: 'Maître',
  lover: 'Amant(e)',
  enemy: 'Ennemi',
  stranger: 'Inconnu',
};

const MASTER_SKILLS: string[] = [
  'combatSkills.longSword',
  'combatSkills.archery',
  'combatSkills.axe',
  'combatSkills.swordAndShield',
  'knowledgeSkills.strategy',
  'knowledgeSkills.eloquence',
  'knowledgeSkills.medicine',
  'knowledgeSkills.literature',
  'craftSkills.blacksmithing',
  'craftSkills.bowyer',
];

function skillLabel(path: string): string {
  const labels: Record<string, string> = {
    'combatSkills.longSword': 'Épée longue',
    'combatSkills.archery': 'Archerie',
    'combatSkills.axe': 'Hache',
    'combatSkills.swordAndShield': 'Épée & bouclier',
    'knowledgeSkills.strategy': 'Stratégie',
    'knowledgeSkills.eloquence': 'Éloquence',
    'knowledgeSkills.medicine': 'Médecine',
    'knowledgeSkills.literature': 'Littérature',
    'craftSkills.blacksmithing': 'Forge',
    'craftSkills.bowyer': 'Archerie (fabrication)',
  };
  return labels[path] ?? path;
}

function buildSkillDelta(skillPath: string, amount: number): StatDelta {
  const [group, key] = skillPath.split('.');
  if (group === 'combatSkills') return { combatSkills: { [key]: amount } as StatDelta['combatSkills'] };
  if (group === 'knowledgeSkills') return { knowledgeSkills: { [key]: amount } as StatDelta['knowledgeSkills'] };
  if (group === 'craftSkills') return { craftSkills: { [key]: amount } as StatDelta['craftSkills'] };
  if (group === 'ridingSkills') return { ridingSkills: { [key]: amount } as StatDelta['ridingSkills'] };
  return {};
}

function ScoreBar({ score }: { score: number }) {
  const pct = ((score + 100) / 200) * 100;
  const barColor = score >= 0 ? '#5A8A3A' : '#9A3A2A';
  return (
    <View style={styles.scoreBarTrack}>
      <View style={[styles.scoreBarFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
    </View>
  );
}

interface ActionButtonProps {
  label: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
  onPress: () => void;
  variant?: 'default' | 'danger' | 'love';
}

function ActionButton({ label, description, disabled, disabledReason, onPress, variant = 'default' }: ActionButtonProps) {
  const bgColor = disabled
    ? Colors.surfaceDark
    : variant === 'danger'
    ? '#7A2020'
    : variant === 'love'
    ? '#6B2A5A'
    : Colors.buttonBg;

  return (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: bgColor }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <Text style={[styles.actionBtnLabel, disabled && styles.actionBtnLabelDisabled]}>
        {label}
      </Text>
      {description && !disabled && (
        <Text style={styles.actionBtnDesc}>{description}</Text>
      )}
      {disabled && disabledReason && (
        <Text style={styles.actionBtnDesc}>{disabledReason}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function RelationDetailScreen({ navigation, route }: Props) {
  const { personId } = route.params;
  const player = useGameStore((s) => s.player);
  const addRelation = useGameStore((s) => s.addRelation);
  const applyStatDelta = useGameStore((s) => s.applyStatDelta);
  const addToHistory = useGameStore((s) => s.addToHistory);

  const [feedback, setFeedback] = useState<string | null>(null);

  if (!player) return null;

  const relation = player.relations.find((r) => r.personId === personId);
  if (!relation) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.empty}>Cette personne n'est plus dans votre vie.</Text>
      </SafeAreaView>
    );
  }

  // Helpers
  const updateScore = (delta: number, newType?: RelationType) => {
    const newScore = Math.max(-100, Math.min(100, relation.score + delta));
    const updated: Relation = {
      ...relation,
      score: newScore,
      ...(newType ? { type: newType } : {}),
    };
    addRelation(updated);
    return newScore;
  };

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const hasWeapon = player.inventory.some((i) => i.category === 'weapon');
  const hasChessSet = player.inventory.some((i) => i.subtype === 'chess');

  const isFamily = ['father', 'mother', 'sibling'].includes(relation.type);
  const isFriendOrStranger = ['friend', 'stranger', 'priest'].includes(relation.type);
  const isMaster = relation.type === 'master';
  const isLover = relation.type === 'lover';

  const romance = canRomance(player, relation);
  const showFlirt = romance.allowed && !isFamily && !isLover;

  // Random combat skill for "S'entraîner ensemble"
  const pickRandomCombatSkill = () => {
    const skills = ['longSword', 'lance', 'axe', 'swordAndShield', 'heavyWeapon', 'archery'];
    return skills[Math.floor(Math.random() * skills.length)];
  };

  // --- FAMILY INTERACTIONS ---
  const doRepas = () => {
    updateScore(3);
    applyStatDelta({ knowledgeSkills: { generalCulture: 0.5 }, prestige: { honor: 0.2 } });
    addToHistory(`Repas partagé avec ${relation.name}. Un moment de lien familial.`);
    showFeedback(`Relation +3 · Culture +0.5 · Honneur +0.2`);
  };

  const doConseil = () => {
    updateScore(2);
    const useStrategy = Math.random() < 0.5;
    if (useStrategy) {
      applyStatDelta({ knowledgeSkills: { strategy: 1 } });
      addToHistory(`${relation.name} vous a donné un précieux conseil stratégique.`);
      showFeedback(`Relation +2 · Stratégie +1`);
    } else {
      applyStatDelta({ knowledgeSkills: { generalCulture: 1 } });
      addToHistory(`${relation.name} vous a partagé sa sagesse.`);
      showFeedback(`Relation +2 · Culture générale +1`);
    }
  };

  const doDispute = () => {
    const win = Math.random() < 0.5;
    if (win) {
      updateScore(5);
      addToHistory(`Dispute avec ${relation.name}. Étonnamment, cela vous a rapprochés.`);
      showFeedback(`Relation +5`);
    } else {
      updateScore(-8);
      addToHistory(`Dispute violente avec ${relation.name}. Les mots ont dépassé la pensée.`);
      showFeedback(`Relation -8`);
    }
  };

  const doSecret = () => {
    if (relation.score < 50) return;
    updateScore(5);
    addToHistory(`Vous avez confié un secret à ${relation.name}. Le lien de confiance s'est renforcé.`);
    showFeedback(`Relation +5`);
  };

  // --- FRIEND / STRANGER INTERACTIONS ---
  const doBoire = () => {
    updateScore(3);
    applyStatDelta({ knowledgeSkills: { eloquence: 0.5 } });
    addToHistory(`Vous avez bu un verre avec ${relation.name}. La conversation a coulé.`);
    showFeedback(`Relation +3 · Éloquence +0.5`);
  };

  const doEchecs = () => {
    if (!hasChessSet) return;
    updateScore(2);
    applyStatDelta({ knowledgeSkills: { strategy: 1 } });
    addToHistory(`Partie d'échecs avec ${relation.name}. Votre esprit s'affûte.`);
    showFeedback(`Relation +2 · Stratégie +1`);
  };

  const doEntrainer = () => {
    if (!hasWeapon) return;
    updateScore(3);
    const skill = pickRandomCombatSkill();
    applyStatDelta({ combatSkills: { [skill]: 1 } as StatDelta['combatSkills'] });
    addToHistory(`Entraînement avec ${relation.name}. Votre technique s'améliore.`);
    showFeedback(`Relation +3 · ${skill} +1`);
  };

  const doDemanderMaitre = () => {
    if (relation.score < 60) return;
    const skill = MASTER_SKILLS[Math.floor(Math.random() * MASTER_SKILLS.length)];
    const updated: Relation = { ...relation, type: 'master', skill };
    addRelation(updated);
    addToHistory(`${relation.name} accepte de vous enseigner l'art de ${skillLabel(skill)}.`);
    showFeedback(`${relation.name} devient votre maître en ${skillLabel(skill)} !`);
  };

  // --- MASTER INTERACTIONS ---
  const doSeanceEntrainement = () => {
    if (player.gold < 10) {
      showFeedback(`Pas assez d'or (10 g requis).`);
      return;
    }
    const skill = relation.skill ?? 'combatSkills.longSword';
    updateScore(2);
    applyStatDelta({ gold: -10, ...buildSkillDelta(skill, 4) });
    addToHistory(`Séance d'entraînement avec ${relation.name} (${skillLabel(skill)}). Vos progrès sont notables.`);
    showFeedback(`-10 g · ${skillLabel(skill)} +4 · Relation +2`);
  };

  const doDiscuterTechnique = () => {
    const skill = relation.skill ?? 'combatSkills.longSword';
    updateScore(1);
    applyStatDelta(buildSkillDelta(skill, 1));
    addToHistory(`Discussion technique avec ${relation.name}. Petits progrès.`);
    showFeedback(`${skillLabel(skill)} +1 · Relation +1`);
  };

  // --- LOVER INTERACTIONS ---
  const doPasserTemps = () => {
    updateScore(4);
    addToHistory(`Vous passez du temps précieux avec ${relation.name}.`);
    showFeedback(`Relation +4`);
  };

  const doDemandeMarriage = () => {
    if (relation.score < 80 || player.age < 16) return;
    addToHistory(`Vous demandez ${relation.name} en mariage. Une nouvelle vie commence.`);
    showFeedback(`${relation.name} accepte votre demande en mariage !`);
  };

  // --- ROMANCE INTERACTIONS ---
  const doFlirter = () => {
    const roll = Math.random();
    updateScore(2);
    if (roll < 0.33) {
      addToHistory(`Tentative de flirt avec ${relation.name}. La réaction reste neutre.`);
      showFeedback(`Relation +2 · Rien de particulier.`);
    } else if (roll < 0.66) {
      const updated: Relation = { ...relation, score: Math.min(100, relation.score + 2), mutualInterest: true };
      addRelation(updated);
      addToHistory(`Vous flirtez avec ${relation.name}. Il/elle semble réciproquement intéressé(e).`);
      showFeedback(`Relation +2 · Intérêt mutuel ! Vous pouvez courtiser.`);
    } else {
      updateScore(-3);
      addToHistory(`${relation.name} a rejeté vos avances. Maladresse.`);
      showFeedback(`Relation -3 · Rejeté(e).`);
    }
  };

  const doCourtiser = () => {
    if (relation.score < 70) {
      updateScore(-5);
      addToHistory(`Vous tentez de courtiser ${relation.name}, mais l'intérêt s'est dissipé.`);
      showFeedback(`Trop tôt — Relation -5.`);
      return;
    }
    const updated: Relation = { ...relation, type: 'lover', mutualInterest: false };
    addRelation(updated);
    addToHistory(`${relation.name} accepte votre cour. Vous devenez amants.`);
    showFeedback(`${relation.name} est maintenant votre amant(e) !`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{relation.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View>
              <Text style={styles.profileName}>{relation.name}</Text>
              <Text style={styles.profileMeta}>
                {TYPE_LABELS[relation.type]} · {relation.age} ans
              </Text>
            </View>
            <Text style={styles.profileScore}>
              {relation.score > 0 ? `+${relation.score}` : relation.score}
            </Text>
          </View>
          <ScoreBar score={relation.score} />
          {relation.skill && (
            <Text style={styles.profileSkill}>Enseigne : {skillLabel(relation.skill)}</Text>
          )}
        </View>

        {/* Feedback banner */}
        {feedback && (
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackText}>{feedback}</Text>
          </View>
        )}

        {/* FAMILY ACTIONS */}
        {isFamily && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Famille</Text>
            <ActionButton label="Partager un repas" description="+3 relation · +culture · +honneur" onPress={doRepas} />
            <ActionButton label="Demander conseil" description="+2 relation · +culture ou stratégie" onPress={doConseil} />
            <ActionButton label="Se disputer" description="Risqué : relation -8 ou +5" onPress={doDispute} variant="danger" />
            <ActionButton
              label="Partager un secret"
              description="+5 relation"
              disabled={relation.score < 50}
              disabledReason="Score requis ≥ 50"
              onPress={doSecret}
            />
          </View>
        )}

        {/* FRIEND / STRANGER / PRIEST ACTIONS */}
        {isFriendOrStranger && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interaction</Text>
            <ActionButton label="Boire un verre" description="+3 relation · +éloquence" onPress={doBoire} />
            <ActionButton
              label="Jouer aux échecs"
              description="+2 relation · +stratégie"
              disabled={!hasChessSet}
              disabledReason="Requiert un jeu d'échecs"
              onPress={doEchecs}
            />
            <ActionButton
              label="S'entraîner ensemble"
              description="+3 relation · +compétence combat"
              disabled={!hasWeapon}
              disabledReason="Requiert une arme"
              onPress={doEntrainer}
            />
            <ActionButton
              label="Demander comme maître"
              description="Score ≥ 60 → type devient Maître"
              disabled={relation.score < 60}
              disabledReason="Score requis ≥ 60"
              onPress={doDemanderMaitre}
            />
          </View>
        )}

        {/* MASTER ACTIONS */}
        {isMaster && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Maître</Text>
            <ActionButton
              label="Séance d'entraînement"
              description="-10 g · +4 compétence · +2 relation"
              disabled={player.gold < 10}
              disabledReason="Pas assez d'or (10 g)"
              onPress={doSeanceEntrainement}
            />
            <ActionButton label="Discuter technique" description="+1 compétence · +1 relation" onPress={doDiscuterTechnique} />
          </View>
        )}

        {/* LOVER ACTIONS */}
        {isLover && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amour</Text>
            <ActionButton label="Passer du temps ensemble" description="+4 relation" onPress={doPasserTemps} variant="love" />
            <ActionButton
              label="Demande en mariage"
              description="Score ≥ 80 · âge ≥ 16"
              disabled={relation.score < 80 || player.age < 16}
              disabledReason={player.age < 16 ? 'Vous êtes trop jeune' : 'Score requis ≥ 80'}
              onPress={doDemandeMarriage}
              variant="love"
            />
          </View>
        )}

        {/* ROMANCE (flirt / courtship) */}
        {showFlirt && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Romance</Text>
            <ActionButton label="Flirter" description="Chance : rien / intérêt mutuel / rejet" onPress={doFlirter} variant="love" />
            {relation.mutualInterest && (
              <ActionButton
                label="Courtiser"
                description="Score ≥ 70 → devient amant(e)"
                onPress={doCourtiser}
                variant="love"
              />
            )}
          </View>
        )}

        {!romance.allowed && !isFamily && !isLover && (
          <Text style={styles.romanceBlocked}>{romance.reason}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.parchment },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backText: { fontFamily: 'serif', fontSize: 14, color: Colors.accent },
  headerTitle: { fontFamily: 'serif', fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  content: { padding: 16, gap: 12 },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  profileName: { fontFamily: 'serif', fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  profileMeta: { fontFamily: 'serif', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  profileScore: { fontFamily: 'serif', fontSize: 22, fontWeight: '700', color: Colors.accent },
  profileSkill: { fontFamily: 'serif', fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },
  scoreBarTrack: { height: 12, backgroundColor: Colors.surfaceDark, borderRadius: 6, overflow: 'hidden' },
  scoreBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6 },
  feedbackBox: {
    backgroundColor: Colors.surfaceDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  feedbackText: { fontFamily: 'serif', fontSize: 13, color: Colors.textPrimary, fontStyle: 'italic', textAlign: 'center' },
  section: { gap: 8 },
  sectionTitle: {
    fontFamily: 'serif',
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  actionBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionBtnLabel: { fontFamily: 'serif', fontSize: 15, fontWeight: '700', color: Colors.buttonText },
  actionBtnLabelDisabled: { color: Colors.textSecondary },
  actionBtnDesc: { fontFamily: 'serif', fontSize: 12, color: Colors.buttonText, opacity: 0.75, marginTop: 2, fontStyle: 'italic' },
  empty: { fontFamily: 'serif', fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 40 },
  romanceBlocked: { fontFamily: 'serif', fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center' },
});
