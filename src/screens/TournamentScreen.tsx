import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import type { TournamentScreenProps } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useGameStore } from '../store/gameStore';
import { TOURNAMENTS } from '../data/tournaments';
import type { TournamentType } from '../data/tournaments';
import type { Player } from '../types/game';

// ── Opponent name pool ──────────────────────────────────────────────────────

const OPPONENT_NAMES = [
  'Gautier de Montferrat', 'Raoul de Blois', 'Thibaut le Fort', 'Enguerrand de Coucy',
  'Simon de Nesle', 'Renaud de Dammartin', 'Hugues de Châtillon', 'Gilles de Trasignies',
  'Walter Fitzrobert', 'Baldwin of Flanders', 'Aimery de Lusignan', 'Foulques de Joinville',
  'Bertrand de Born', 'Roger de Toeni', 'Ulrich von Liechtenstein', 'Konrad von Regensberg',
  'Rodrigo de Vivar', 'García de Azagra', 'Guglielmo di Monferrato', 'Tancredi di Lecce',
  'Przemysł de Pologne', 'Henryk de Silésie',
];

function pickNames(n: number): string[] {
  const pool = [...OPPONENT_NAMES].sort(() => Math.random() - 0.5);
  return pool.slice(0, n);
}

// ── Flavor texts ────────────────────────────────────────────────────────────

const WIN_FLAVORS: Record<TournamentType, string[]> = {
  melee: [
    "Votre lame s'abat avec une précision foudroyante.",
    "Un enchaînement parfait met votre adversaire à genoux.",
    "La foule retient son souffle, puis éclate en acclamations.",
  ],
  joust: [
    "Votre lance frappe le bouclier adverse avec une force dévastatrice.",
    "L'adversaire vacille sur sa selle et tombe lourdement.",
    "Une joûte parfaite : style et puissance réunis.",
  ],
  swordDuel: [
    "Votre technique irréprochable désarme l'adversaire.",
    "Une feinte brillante ouvre la garde de votre ennemi.",
    "La précision de votre lame impose le respect à toute l'assemblée.",
  ],
  archery: [
    "Votre flèche frappe le centre de la cible avec une précision stupéfiante.",
    "Une volée parfaite laisse les spectateurs sans voix.",
    "Chaque tir est meilleur que le précédent.",
  ],
  chess: [
    "Un gambit audacieux que votre adversaire ne voit pas venir.",
    "Votre stratégie à long terme porte enfin ses fruits.",
    "Mat en douze coups : la salle applaudit longuement.",
  ],
  poetry: [
    "Vos vers touchent les cœurs de l'assemblée.",
    "Une métaphore si juste qu'elle tire des larmes aux dames de la cour.",
    "Votre éloquence surpasse tous les autres troubadours présents.",
  ],
};

const LOSE_FLAVORS: Record<TournamentType, string[]> = {
  melee: [
    "Un coup de taille imprévu vous fait perdre l'équilibre.",
    "Votre adversaire exploite une faille dans votre garde.",
    "Malgré votre courage, vous êtes dépassé aujourd'hui.",
  ],
  joust: [
    "La lance adverse vous touche en pleine poitrine.",
    "Votre cheval dévie au dernier moment — la joûte est perdue.",
    "L'adversaire vous arrache la victoire d'un dernier assaut.",
  ],
  swordDuel: [
    "Une botte inattendue perce votre défense.",
    "Votre adversaire est plus rapide que prévu.",
    "La lame adverse vous contraint à capituler.",
  ],
  archery: [
    "Le vent dévie légèrement votre flèche.",
    "Votre adversaire réalise un tir exceptionnel.",
    "La pression du moment affecte votre concentration.",
  ],
  chess: [
    "Un sacrifice de pièce que vous n'avez pas anticipé.",
    "Votre adversaire joue une défense impénétrable.",
    "Malgré vos efforts, le mat vous prend de court.",
  ],
  poetry: [
    "Les vers de votre adversaire émeuvent davantage l'assemblée.",
    "Votre inspiration vous fait défaut aujourd'hui.",
    "Les juges accordent leur faveur à un style différent du vôtre.",
  ],
};

function pickFlavor(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

// ── Skill lookup ─────────────────────────────────────────────────────────────

function getPlayerSkill(player: Player, skillPath: string): number {
  const [group, key] = skillPath.split('.');
  const skillGroup = player[group as keyof Player];
  if (typeof skillGroup === 'object' && skillGroup !== null && key in (skillGroup as object)) {
    return ((skillGroup as Record<string, unknown>)[key] as number) ?? 0;
  }
  return 0;
}

// ── Round generation ─────────────────────────────────────────────────────────

interface Round {
  opponentName: string;
  opponentSkill: number;
  playerRoll: number;
  opponentRoll: number;
  playerWon: boolean;
  flavor: string;
}

function generateRounds(player: Player, skillPath: string, numRounds: number, type: TournamentType): Round[] {
  const baseSkill = getPlayerSkill(player, skillPath);
  const rounds: Round[] = [];
  const names = pickNames(numRounds);

  for (let i = 0; i < numRounds; i++) {
    // Opponents get progressively stronger in later rounds
    const progression = i / (numRounds - 1 || 1); // 0..1
    const opponentBase = baseSkill - 10 + progression * 30; // ranges from skill-10 to skill+20
    const opponentSkill = Math.round(Math.max(0, opponentBase + (Math.random() * 10 - 5)));

    const rand = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
    const playerRoll = baseSkill + rand(-20, 20);
    const opponentRoll = opponentSkill + rand(-20, 20);
    const playerWon = playerRoll >= opponentRoll;

    rounds.push({
      opponentName: names[i],
      opponentSkill,
      playerRoll,
      opponentRoll,
      playerWon,
      flavor: pickFlavor(playerWon ? WIN_FLAVORS[type] : LOSE_FLAVORS[type]),
    });
  }
  return rounds;
}

// ── Component ────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'combat' | 'result';

const TYPE_LABELS: Record<TournamentType, string> = {
  melee: 'Mêlée',
  joust: 'Joûte',
  swordDuel: "Duel à l'épée",
  archery: "Tir à l'arc",
  chess: 'Échecs',
  poetry: 'Poésie',
};

export default function TournamentScreen({ navigation, route }: TournamentScreenProps) {
  const player = useGameStore((s) => s.player);
  const travelToTournament = useGameStore((s) => s.travelToTournament);
  const recordTournamentResult = useGameStore((s) => s.recordTournamentResult);

  const tournament = useMemo(
    () => TOURNAMENTS.find((t) => t.id === route.params.tournamentId) ?? null,
    [route.params.tournamentId],
  );

  const [phase, setPhase] = useState<Phase>('intro');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [shownRound, setShownRound] = useState(0);
  const [eliminatedAt, setEliminatedAt] = useState<number | null>(null);
  const [resultApplied, setResultApplied] = useState(false);

  if (!player || !tournament) return null;

  const totalCost = tournament.travelCost + tournament.entryFee;
  const numRounds = tournament.distance === 'local' ? 3 : tournament.distance === 'regional' ? 4 : 5;

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleStart() {
    travelToTournament(totalCost, tournament!.travelMonths);
    const generated = generateRounds(player!, tournament!.relevantSkill, numRounds, tournament!.type);
    // Find first loss
    const lossIdx = generated.findIndex((r) => !r.playerWon);
    setRounds(generated);
    setEliminatedAt(lossIdx);
    setShownRound(0);
    setPhase('combat');
  }

  function handleNextRound() {
    const nextIdx = shownRound + 1;
    // If this round was a loss, jump straight to result
    if (!rounds[shownRound].playerWon) {
      applyResult(false);
      return;
    }
    if (nextIdx >= rounds.length) {
      // Completed all rounds
      applyResult(true);
      return;
    }
    setShownRound(nextIdx);
  }

  function applyResult(won: boolean) {
    if (resultApplied) { setPhase('result'); return; }
    setResultApplied(true);

    // Re-read player from store after travelToTournament mutation
    const freshPlayer = useGameStore.getState().player!;
    const glory = freshPlayer.prestige.glory;

    let followersGain = 0;
    if (won && glory > 60) {
      followersGain = Math.floor(Math.random() * 3) + 1;
    }

    const title = won
      ? `Champion du tournoi de ${tournament!.city}, ${freshPlayer.currentYear}`
      : undefined;

    const historyText = won
      ? `Victoire au ${tournament!.name} ! Vous remportez le titre de "${title}".`
      : `Vous avez été éliminé au tournoi de ${tournament!.city}.`;

    recordTournamentResult({
      won,
      title,
      prizeMoney: won ? tournament!.prizeMoney : 0,
      prizeGlory: won ? tournament!.prizeGlory : 0,
      prizeReputation: won ? tournament!.prizeReputation : 0,
      prizeHonor: won ? tournament!.prizeHonor : 0,
      followersGain,
      historyText,
    });

    setPhase('result');
  }

  const overallWon =
    phase === 'result' && (eliminatedAt === -1 || eliminatedAt === null);
  const finalRoundsWon = rounds.filter((r) => r.playerWon).length;

  // ── Render ───────────────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tournoi</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.bigName}>{tournament.name}</Text>
          <Text style={styles.bigSub}>
            {tournament.city} · {TYPE_LABELS[tournament.type]}
          </Text>

          <View style={styles.infoCard}>
            <Row label="Coût total" value={`${totalCost} g`} />
            {tournament.travelMonths > 0 && (
              <Row label="Voyage" value={`${tournament.travelMonths} mois`} />
            )}
            <Row label="Rounds" value={`${numRounds} adversaires`} />
            <Row label="Récompense" value={`+${tournament.prizeGlory} gloire · +${tournament.prizeHonor} honneur · ${tournament.prizeMoney} g`} />
          </View>

          <Text style={styles.warningText}>
            Une fois le tournoi commencé, vous ne pouvez pas revenir en arrière.
            Le coût de voyage et d'inscription ({totalCost} g) sera déduit.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleStart}>
            <Text style={styles.primaryBtnText}>Commencer le tournoi</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (phase === 'combat') {
    const round = rounds[shownRound];
    const roundNumber = shownRound + 1;
    const isEliminated = !round.playerWon;
    const isLastRound = shownRound === rounds.length - 1;
    const btnLabel = isEliminated
      ? 'Voir le résultat'
      : isLastRound
      ? 'Voir le résultat'
      : 'Round suivant →';

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{tournament.name}</Text>
          <Text style={styles.headerSub}>
            Round {roundNumber} / {rounds.length}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.roundCard}>
            <Text style={styles.opponentName}>{round.opponentName}</Text>
            <Text style={styles.opponentSkillLabel}>
              Compétence adverse : {round.opponentSkill}
            </Text>

            <View style={styles.rollRow}>
              <View style={styles.rollBox}>
                <Text style={styles.rollLabel}>Votre jet</Text>
                <Text style={[styles.rollValue, styles.rollPlayer]}>{round.playerRoll}</Text>
              </View>
              <Text style={styles.rollVs}>vs</Text>
              <View style={styles.rollBox}>
                <Text style={styles.rollLabel}>Adversaire</Text>
                <Text style={[styles.rollValue, styles.rollOpponent]}>{round.opponentRoll}</Text>
              </View>
            </View>

            <View style={[styles.outcomeBox, round.playerWon ? styles.outcomeWin : styles.outcomeLose]}>
              <Text style={styles.outcomeText}>
                {round.playerWon ? '⚔ Victoire du round !' : '✦ Défaite du round'}
              </Text>
            </View>

            <Text style={styles.flavorText}>{round.flavor}</Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleNextRound}>
            <Text style={styles.primaryBtnText}>{btnLabel}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // result phase
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, overallWon ? styles.headerWin : styles.headerLose]}>
        <Text style={styles.headerTitle}>
          {overallWon ? '🏆 Victoire !' : 'Éliminé'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.bigName}>{tournament.name}</Text>

        {overallWon ? (
          <>
            <Text style={styles.resultHero}>Champion de {tournament.city} !</Text>
            <View style={styles.infoCard}>
              <Row label="Or gagné" value={`+${tournament.prizeMoney} g`} />
              <Row label="Gloire" value={`+${tournament.prizeGlory}`} />
              <Row label="Honneur" value={`+${tournament.prizeHonor}`} />
              <Row label="Réputation" value={`+${tournament.prizeReputation}`} />
              <Row
                label="Titre"
                value={`Champion du tournoi de ${tournament.city}, ${player.currentYear}`}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.resultHero}>
              Vous avez remporté {finalRoundsWon} round{finalRoundsWon !== 1 ? 's' : ''} sur {rounds.length}.
            </Text>
            <View style={styles.infoCard}>
              <Row label="Gloire" value="-3" negative />
            </View>
          </>
        )}

        {/* Round summary */}
        <Text style={styles.sectionLabel}>Résumé des rounds</Text>
        {rounds.map((r, i) => (
          <View key={i} style={[styles.summaryRow, r.playerWon ? styles.summaryWin : styles.summaryLose]}>
            <Text style={styles.summaryText}>
              Round {i + 1} vs {r.opponentName}
            </Text>
            <Text style={styles.summaryScore}>
              {r.playerRoll} vs {r.opponentRoll} — {r.playerWon ? 'Victoire' : 'Défaite'}
            </Text>
          </View>
        ))}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Game')}
        >
          <Text style={styles.primaryBtnText}>Retourner au jeu</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, negative && styles.rowNegative]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.parchment },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerWin: { backgroundColor: '#E8F5E9' },
  headerLose: { backgroundColor: '#FFEBEE' },
  headerTitle: {
    flex: 1,
    fontFamily: 'serif',
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  headerSub: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  backBtn: { minWidth: 60 },
  backText: { fontFamily: 'serif', fontSize: 14, color: Colors.accent },

  body: { padding: 16, gap: 14 },

  bigName: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  bigSub: {
    fontFamily: 'serif',
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontFamily: 'serif', fontSize: 13, color: Colors.textSecondary },
  rowValue: { fontFamily: 'serif', fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  rowNegative: { color: '#C62828' },

  warningText: {
    fontFamily: 'serif',
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  primaryBtn: {
    backgroundColor: Colors.buttonBg,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: 'serif',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.buttonText,
    letterSpacing: 0.5,
  },

  // Combat round card
  roundCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  opponentName: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  opponentSkillLabel: {
    fontFamily: 'serif',
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  rollRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rollBox: { alignItems: 'center', gap: 4 },
  rollLabel: { fontFamily: 'serif', fontSize: 12, color: Colors.textSecondary },
  rollValue: { fontFamily: 'serif', fontSize: 32, fontWeight: '700' },
  rollPlayer: { color: '#1565C0' },
  rollOpponent: { color: '#C62828' },
  rollVs: { fontFamily: 'serif', fontSize: 16, color: Colors.textSecondary },

  outcomeBox: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  outcomeWin: { backgroundColor: '#E8F5E9' },
  outcomeLose: { backgroundColor: '#FFEBEE' },
  outcomeText: { fontFamily: 'serif', fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  flavorText: {
    fontFamily: 'serif',
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Result screen
  resultHero: {
    fontFamily: 'serif',
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionLabel: {
    fontFamily: 'serif',
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  summaryRow: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  summaryWin: { backgroundColor: '#E8F5E9' },
  summaryLose: { backgroundColor: '#FFEBEE' },
  summaryText: { fontFamily: 'serif', fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  summaryScore: { fontFamily: 'serif', fontSize: 12, color: Colors.textSecondary },
});
