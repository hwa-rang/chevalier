import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TournamentScreenProps } from '../navigation/types';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useGameStore } from '../store/gameStore';
import { TOURNAMENTS } from '../data/tournaments';
import type { TournamentType } from '../data/tournaments';
import type { Player } from '../types/game';
import {
  stancesForType,
  resourceLabel,
  MAX_MOMENTUM,
  MOMENTUM_BONUS_PER_POINT,
  CHEAT_BONUS,
  CHEAT_CAUGHT_PENALTY,
  DECISIVE_MARGIN,
  maxResource,
  vigueurPenalty,
  cheatSuspicionGain,
  stanceBonus,
  pickEvent,
  type Stance,
  type TournamentEvent,
  type EventChoice,
} from '../data/tournamentTactics';

const WIN_TINT = 'rgba(67,169,92,0.20)';
const LOSE_TINT = 'rgba(239,90,111,0.20)';

// Illustration de combat par type de tournoi (bannière en haut de l'écran).
const TOURNAMENT_IMAGES: Record<TournamentType, number> = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  melee: require('../assets/tournaments/melee.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  joust: require('../assets/tournaments/joust.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  swordDuel: require('../assets/tournaments/swordDuel.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  archery: require('../assets/tournaments/archery.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  chess: require('../assets/tournaments/chess.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  poetry: require('../assets/tournaments/poetry.png'),
};

// ── Opponent name pool ──────────────────────────────────────────────────────

const OPPONENT_NAMES = [
  'Gautier de Montferrat', 'Raoul de Blois', 'Thibaut le Fort', 'Enguerrand de Coucy',
  'Simon de Nesle', 'Renaud de Dammartin', 'Hugues de Châtillon', 'Gilles de Trasignies',
  'Walter Fitzrobert', 'Baldwin of Flanders', 'Aimery de Lusignan', 'Foulques de Joinville',
  'Bertrand de Born', 'Roger de Toeni', 'Ulrich von Liechtenstein', 'Konrad von Regensberg',
  'Rodrigo de Vivar', 'García de Azagra', 'Guglielmo di Monferrato', 'Tancredi di Lecce',
  'Przemysł de Pologne', 'Henryk de Silésie',
];

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

const rand = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;

// ── Skill lookup ─────────────────────────────────────────────────────────────

function getPlayerSkill(player: Player, skillPath: string): number {
  const [group, key] = skillPath.split('.');
  const skillGroup = player[group as keyof Player];
  if (typeof skillGroup === 'object' && skillGroup !== null && key in (skillGroup as object)) {
    return ((skillGroup as unknown as Record<string, unknown>)[key] as number) ?? 0;
  }
  return 0;
}

// ── Opponents ─────────────────────────────────────────────────────────────────

interface Opponent {
  name: string;
  skill: number;
}

function generateOpponents(baseSkill: number, numRounds: number): Opponent[] {
  const names = [...OPPONENT_NAMES].sort(() => Math.random() - 0.5).slice(0, numRounds);
  const out: Opponent[] = [];
  for (let i = 0; i < numRounds; i++) {
    const progression = i / (numRounds - 1 || 1); // 0..1, later rounds tougher
    const opponentBase = baseSkill - 10 + progression * 30;
    const skill = Math.round(Math.max(0, opponentBase + (Math.random() * 10 - 5)));
    out.push({ name: names[i], skill });
  }
  return out;
}

// ── Resolution / summary records ───────────────────────────────────────────────

interface Resolution {
  stance: Stance;
  cheated: boolean;
  caught: boolean;
  playerWon: boolean;
  decisive: boolean;
  playerRoll: number;
  opponentRoll: number;
  flavor: string;
  // breakdown
  baseSkill: number;
  sBonus: number;
  momoBonus: number;
  cheatBonus: number;
  vigPen: number;
  luck: number;
  oppPenalty: number;
}

interface RoundSummary {
  n: number;
  opponentName: string;
  playerRoll: number;
  opponentRoll: number;
  won: boolean;
  stanceLabel: string;
  cheated: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'choice' | 'resolve' | 'event' | 'result';

const TYPE_LABELS: Record<TournamentType, string> = {
  melee: 'Mêlée',
  joust: 'Joûte',
  swordDuel: 'Combat à pied',
  archery: "Tir à l'arc",
  chess: 'Échecs',
  poetry: 'Poésie',
};

// Some disciplines lean on a second skill. Jousting demands not just lance work
// but real horsemanship — your effective skill blends the two.
const TYPE_SECONDARY_SKILL: Partial<Record<TournamentType, string>> = {
  joust: 'ridingSkills.horsemanship',
};
const SECONDARY_WEIGHT = 0.35;

/** Effective base skill for a tournament, blending in any secondary skill. */
function effectiveBaseSkill(player: Player, tournament: { type: TournamentType; relevantSkill: string }): number {
  const primary = getPlayerSkill(player, tournament.relevantSkill);
  const secPath = TYPE_SECONDARY_SKILL[tournament.type];
  if (!secPath) return primary;
  const secondary = getPlayerSkill(player, secPath);
  return Math.round(primary * (1 - SECONDARY_WEIGHT) + secondary * SECONDARY_WEIGHT);
}

export default function TournamentScreen({ navigation, route }: TournamentScreenProps) {
  const player = useGameStore((s) => s.player);
  const travelToTournament = useGameStore((s) => s.travelToTournament);
  const recordTournamentResult = useGameStore((s) => s.recordTournamentResult);

  const tournament = useMemo(
    () => TOURNAMENTS.find((t) => t.id === route.params.tournamentId) ?? null,
    [route.params.tournamentId],
  );

  const [phase, setPhase] = useState<Phase>('intro');

  // Persistent tournament run state
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [maxVig, setMaxVig] = useState(100);
  const [vigueur, setVigueur] = useState(100);
  const [momentum, setMomentum] = useState(0);
  const [suspicion, setSuspicion] = useState(0);
  const [nextOpponentPenalty, setNextOpponentPenalty] = useState(0);

  // Per-round selection
  const [selectedStanceId, setSelectedStanceId] = useState<string | null>(null);
  const [cheatArmed, setCheatArmed] = useState(false);
  const [lastResolve, setLastResolve] = useState<Resolution | null>(null);

  // Narrative event
  const [seenEventIds, setSeenEventIds] = useState<string[]>([]);
  const [pendingEvent, setPendingEvent] = useState<TournamentEvent | null>(null);
  const [eventResult, setEventResult] = useState<string | null>(null);

  // Accumulators applied once at the end
  const [woundAccrued, setWoundAccrued] = useState(0);
  const [bonusGlory, setBonusGlory] = useState(0);
  const [bonusHonor, setBonusHonor] = useState(0);
  const [bonusReputation, setBonusReputation] = useState(0);
  const [bonusGold, setBonusGold] = useState(0);

  const [summaries, setSummaries] = useState<RoundSummary[]>([]);
  const [disqualified, setDisqualified] = useState(false);
  const [overallWon, setOverallWon] = useState(false);
  const [resultApplied, setResultApplied] = useState(false);

  if (!player || !tournament) return null;

  const totalCost = tournament.travelCost + tournament.entryFee;
  const numRounds = tournament.distance === 'local' ? 3 : tournament.distance === 'regional' ? 4 : 5;
  const baseSkill = effectiveBaseSkill(player, tournament);

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleStart() {
    travelToTournament(totalCost, tournament!.travelMonths);
    const fresh = useGameStore.getState().player!;
    const mv = maxResource(fresh, tournament!.type);
    setOpponents(generateOpponents(baseSkill, numRounds));
    setMaxVig(mv);
    setVigueur(mv);
    setMomentum(0);
    setSuspicion(0);
    setNextOpponentPenalty(0);
    setRoundIndex(0);
    setSelectedStanceId(null);
    setCheatArmed(false);
    setSummaries([]);
    setWoundAccrued(0);
    setBonusGlory(0);
    setBonusHonor(0);
    setBonusReputation(0);
    setBonusGold(0);
    setDisqualified(false);
    setOverallWon(false);
    setResultApplied(false);
    setPhase('choice');
  }

  function handleResolve(stance: Stance) {
    const stats = player!.physicalStats;
    const opp = opponents[roundIndex];

    // Cheating: roll for getting caught first.
    let caught = false;
    let newSuspicion = suspicion;
    if (cheatArmed) {
      newSuspicion = Math.min(95, suspicion + cheatSuspicionGain(stats.agility));
      caught = rand(1, 100) <= newSuspicion;
    }
    setSuspicion(newSuspicion);

    const sBonus = stanceBonus(stance, player!, momentum);
    const momoBonus = stance.consumesMomentum ? 0 : momentum * MOMENTUM_BONUS_PER_POINT;
    const vigPen = vigueurPenalty(vigueur, maxVig);
    const cheatBonus = cheatArmed ? CHEAT_BONUS : 0;
    const luck = rand(-12, 12);
    const playerRoll = baseSkill + sBonus + momoBonus + cheatBonus - vigPen + luck;

    const oppPenalty = stance.opponentPenalty + nextOpponentPenalty;
    const opponentRoll = Math.max(0, opp.skill - oppPenalty + rand(-15, 15));

    const margin = playerRoll - opponentRoll;
    const playerWon = margin > 0 || (margin === 0 && stance.winsTies);
    const decisive = playerWon && margin >= DECISIVE_MARGIN;

    // Update vigueur
    const newVig = Math.max(0, Math.min(maxVig, vigueur - stance.vigueurCost + stance.vigueurRecover));
    setVigueur(newVig);

    // Update momentum
    if (!caught) {
      if (!playerWon) {
        setMomentum(0);
      } else if (stance.consumesMomentum) {
        setMomentum(0);
      } else {
        setMomentum(Math.min(MAX_MOMENTUM, momentum + stance.momentumGain + (decisive ? 1 : 0)));
      }
    }

    // Injuries on a losing round
    if (!playerWon && stance.injuryRisk > 0) {
      setWoundAccrued((w) => w + stance.injuryRisk);
    }

    setNextOpponentPenalty(0); // consumed

    setSummaries((prev) => [
      ...prev,
      {
        n: roundIndex + 1,
        opponentName: opp.name,
        playerRoll,
        opponentRoll,
        won: playerWon && !caught,
        stanceLabel: stance.label,
        cheated: cheatArmed,
      },
    ]);

    setLastResolve({
      stance,
      cheated: cheatArmed,
      caught,
      playerWon,
      decisive,
      playerRoll,
      opponentRoll,
      flavor: pickFlavor(playerWon ? WIN_FLAVORS[tournament!.type] : LOSE_FLAVORS[tournament!.type]),
      baseSkill,
      sBonus,
      momoBonus,
      cheatBonus,
      vigPen,
      luck,
      oppPenalty,
    });

    if (caught) setDisqualified(true);
    setPhase('resolve');
  }

  function handleAdvanceFromResolve() {
    const r = lastResolve!;
    if (r.caught) {
      applyResult(false, true);
      return;
    }
    if (!r.playerWon) {
      applyResult(false, false);
      return;
    }
    // Won this round
    const isLast = roundIndex === opponents.length - 1;
    if (isLast) {
      applyResult(true, false);
      return;
    }
    // Maybe a narrative event before the next round
    if (Math.random() < 0.45) {
      const ev = pickEvent(seenEventIds);
      if (ev) {
        setPendingEvent(ev);
        setEventResult(null);
        setPhase('event');
        return;
      }
    }
    goToNextRound();
  }

  function goToNextRound() {
    setRoundIndex((i) => i + 1);
    setSelectedStanceId(null);
    setCheatArmed(false);
    setPhase('choice');
  }

  function handleEventChoice(choice: EventChoice) {
    const e = choice.effects;
    if (e.vigueur) setVigueur((v) => Math.max(0, Math.min(maxVig, v + e.vigueur!)));
    if (e.momentum) setMomentum((m) => Math.max(0, Math.min(MAX_MOMENTUM, m + e.momentum!)));
    if (e.suspicion) setSuspicion((s) => Math.min(95, s + e.suspicion!));
    if (e.opponentPenaltyNext) setNextOpponentPenalty((p) => p + e.opponentPenaltyNext!);
    if (e.healthLost) setWoundAccrued((w) => w + e.healthLost!);
    if (e.gold) setBonusGold((g) => g + e.gold!);
    if (e.honor) setBonusHonor((h) => h + e.honor!);
    if (e.reputation) setBonusReputation((r) => r + e.reputation!);
    if (e.glory) setBonusGlory((g) => g + e.glory!);

    if (pendingEvent) setSeenEventIds((ids) => [...ids, pendingEvent.id]);
    setEventResult(choice.resultText);
  }

  function handleContinueFromEvent() {
    setPendingEvent(null);
    setEventResult(null);
    goToNextRound();
  }

  function applyResult(won: boolean, wasDisqualified: boolean) {
    setOverallWon(won);
    setDisqualified(wasDisqualified);
    if (resultApplied) { setPhase('result'); return; }
    setResultApplied(true);

    const freshPlayer = useGameStore.getState().player!;
    const glory = freshPlayer.prestige.glory;

    let followersGain = 0;
    if (won && glory > 60) {
      followersGain = Math.floor(Math.random() * 3) + 1;
    }

    const title = won
      ? `Champion du tournoi de ${tournament!.city}, ${freshPlayer.currentYear}`
      : undefined;

    // Cheating disgrace stacks on top of any in-tournament prestige changes.
    let bGlory = bonusGlory;
    let bHonor = bonusHonor;
    let bRep = bonusReputation;
    if (wasDisqualified) {
      bGlory += CHEAT_CAUGHT_PENALTY.glory;
      bHonor += CHEAT_CAUGHT_PENALTY.honor;
      bRep += CHEAT_CAUGHT_PENALTY.reputation;
    }

    const historyText = wasDisqualified
      ? `Pris en flagrant délit de tricherie au ${tournament!.name} — disqualifié et déshonoré.`
      : won
      ? `Victoire au ${tournament!.name} ! Vous remportez le titre de « ${title} ».`
      : `Vous avez été éliminé au tournoi de ${tournament!.city}.`;

    recordTournamentResult({
      won,
      disqualified: wasDisqualified,
      title,
      tournamentType: tournament!.type,
      distance: tournament!.distance,
      prizeMoney: won ? tournament!.prizeMoney : 0,
      prizeGlory: won ? tournament!.prizeGlory : 0,
      prizeReputation: won ? tournament!.prizeReputation : 0,
      prizeHonor: won ? tournament!.prizeHonor : 0,
      followersGain,
      healthLost: woundAccrued,
      bonusGlory: bGlory,
      bonusHonor: bHonor,
      bonusReputation: bRep,
      bonusGold,
      historyText,
    });

    setPhase('result');
  }

  const roundsWon = summaries.filter((s) => s.won).length;

  // ── Render: intro ──────────────────────────────────────────────────────────

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

          <View style={styles.infoCard}>
            <Text style={styles.tipTitle}>À chaque round</Text>
            <Text style={styles.tipText}>
              Choisissez une posture selon vos forces, gérez votre {resourceLabel(tournament.type).toLowerCase()} et votre élan.
              Vous pouvez tenter de tricher… si vous osez le risque.
            </Text>
            {tournament.type === 'joust' && (
              <Text style={styles.tipText}>
                À la joute, votre Équitation compte presque autant que votre maîtrise de la Lance.
              </Text>
            )}
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

  // ── Render: choice ───────────────────────────────────────────────────────

  if (phase === 'choice') {
    const opp = opponents[roundIndex];
    const selectedStance = stancesForType(tournament.type).find((s) => s.id === selectedStanceId) ?? null;
    const projectedSuspicion = cheatArmed
      ? Math.min(95, suspicion + cheatSuspicionGain(player.physicalStats.agility))
      : suspicion;

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{tournament.name}</Text>
          <Text style={styles.headerSub}>
            Round {roundIndex + 1} / {opponents.length}
          </Text>
        </View>

        <Image
          source={TOURNAMENT_IMAGES[tournament.type]}
          style={styles.banner}
          resizeMode="cover"
        />

        <ScrollView contentContainerStyle={styles.body}>
          <ResourceBars
            vigueur={vigueur}
            maxVig={maxVig}
            momentum={momentum}
            suspicion={suspicion}
            resourceName={resourceLabel(tournament.type)}
          />

          <View style={styles.roundCard}>
            <Text style={styles.opponentName}>{opp.name}</Text>
            <Text style={styles.opponentSkillLabel}>Compétence adverse : {opp.skill}</Text>
            {nextOpponentPenalty > 0 && (
              <Text style={styles.foeWeak}>Adversaire affaibli (−{nextOpponentPenalty})</Text>
            )}
          </View>

          <Text style={styles.sectionLabel}>Choisissez votre posture</Text>
          {stancesForType(tournament.type).map((stance) => {
            const locked = momentum < stance.requiresMomentum;
            const selected = selectedStanceId === stance.id;
            const bonus = stanceBonus(stance, player, momentum);
            return (
              <TouchableOpacity
                key={stance.id}
                disabled={locked}
                onPress={() => setSelectedStanceId(stance.id)}
                style={[
                  styles.stanceCard,
                  selected && styles.stanceCardSelected,
                  locked && styles.stanceCardLocked,
                ]}
              >
                <View style={styles.stanceHeader}>
                  <Text style={styles.stanceTitle}>
                    {stance.icon} {stance.label}
                  </Text>
                  <Text style={[styles.stanceBonus, bonus >= 0 ? styles.bonusPos : styles.bonusNeg]}>
                    {bonus >= 0 ? '+' : ''}{bonus}
                  </Text>
                </View>
                <Text style={styles.stanceDesc}>{stance.description}</Text>
                <Text style={styles.stanceMeta}>
                  {stance.statPath ? `${stance.statLabel} · ` : ''}
                  {resourceLabel(tournament.type)} −{stance.vigueurCost}
                  {stance.vigueurRecover > 0 ? ` (+${stance.vigueurRecover} récup.)` : ''}
                  {stance.opponentPenalty > 0 ? ` · adversaire −${stance.opponentPenalty}` : ''}
                  {locked ? ` · nécessite ${stance.requiresMomentum} élan` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={() => setCheatArmed((c) => !c)}
            style={[styles.cheatToggle, cheatArmed && styles.cheatToggleOn]}
          >
            <Text style={[styles.cheatText, cheatArmed && styles.cheatTextOn]}>
              {cheatArmed ? '☠ Tricher (armé)' : 'Tricher ?'}
            </Text>
            <Text style={styles.cheatMeta}>
              {cheatArmed
                ? `+${CHEAT_BONUS} au jet · risque d'être pris : ${projectedSuspicion}%`
                : `+${CHEAT_BONUS} au jet, mais risque de disqualification`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, !selectedStance && styles.primaryBtnDisabled]}
            disabled={!selectedStance}
            onPress={() => selectedStance && handleResolve(selectedStance)}
          >
            <Text style={styles.primaryBtnText}>
              {selectedStance ? `Affronter ${opp.name.split(' ')[0]}` : 'Choisissez une posture'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: resolve ──────────────────────────────────────────────────────

  if (phase === 'resolve') {
    const r = lastResolve!;
    const isLast = roundIndex === opponents.length - 1;
    const btnLabel = r.caught || !r.playerWon || isLast ? 'Voir le résultat' : 'Continuer →';

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{tournament.name}</Text>
          <Text style={styles.headerSub}>
            Round {roundIndex + 1} / {opponents.length}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {r.caught ? (
            <View style={[styles.roundCard, { backgroundColor: LOSE_TINT }]}>
              <Text style={styles.caughtTitle}>☠ Pris en flagrant délit !</Text>
              <Text style={styles.flavorText}>
                Un juge a surpris votre tricherie. Vous êtes disqualifié et chassé du tournoi
                sous les huées.
              </Text>
            </View>
          ) : (
            <View style={styles.roundCard}>
              <View style={styles.rollRow}>
                <View style={styles.rollBox}>
                  <Text style={styles.rollLabel}>Votre jet</Text>
                  <Text style={[styles.rollValue, styles.rollPlayer]}>{r.playerRoll}</Text>
                </View>
                <Text style={styles.rollVs}>vs</Text>
                <View style={styles.rollBox}>
                  <Text style={styles.rollLabel}>Adversaire</Text>
                  <Text style={[styles.rollValue, styles.rollOpponent]}>{r.opponentRoll}</Text>
                </View>
              </View>

              <View
                style={[
                  styles.outcomeBox,
                  { backgroundColor: r.playerWon ? WIN_TINT : LOSE_TINT },
                ]}
              >
                <Text style={styles.outcomeText}>
                  {r.playerWon
                    ? r.decisive
                      ? '⚔ Victoire éclatante !'
                      : '⚔ Victoire du round !'
                    : '✦ Défaite du round'}
                </Text>
              </View>

              <Text style={styles.flavorText}>{r.flavor}</Text>

              {/* Roll breakdown */}
              <View style={styles.breakdown}>
                <BreakdownRow label={`${r.stance.icon} ${r.stance.label}`} value={r.baseSkill} prefix="Base " />
                <BreakdownLine label="Posture" value={r.sBonus} />
                {r.momoBonus > 0 && <BreakdownLine label="Élan" value={r.momoBonus} />}
                {r.cheatBonus > 0 && <BreakdownLine label="Tricherie" value={r.cheatBonus} />}
                {r.vigPen > 0 && <BreakdownLine label="Fatigue" value={-r.vigPen} />}
                <BreakdownLine label="Hasard" value={r.luck} />
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleAdvanceFromResolve}>
            <Text style={styles.primaryBtnText}>{btnLabel}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: event ────────────────────────────────────────────────────────

  if (phase === 'event' && pendingEvent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Entre deux rounds</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.roundCard}>
            <Text style={styles.eventTitle}>{pendingEvent.title}</Text>
            <Text style={styles.flavorText}>{pendingEvent.text}</Text>
          </View>

          {eventResult === null ? (
            pendingEvent.choices.map((choice, i) => (
              <TouchableOpacity
                key={i}
                style={styles.stanceCard}
                onPress={() => handleEventChoice(choice)}
              >
                <Text style={styles.stanceTitle}>{choice.label}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <>
              <View style={[styles.roundCard, { backgroundColor: WIN_TINT }]}>
                <Text style={styles.flavorText}>{eventResult}</Text>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleContinueFromEvent}>
                <Text style={styles.primaryBtnText}>Continuer →</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: result ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <View
        style={[
          styles.header,
          overallWon ? styles.headerWin : styles.headerLose,
        ]}
      >
        <Text style={styles.headerTitle}>
          {disqualified ? '☠ Disqualifié' : overallWon ? '🏆 Victoire !' : 'Éliminé'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.bigName}>{tournament.name}</Text>

        {disqualified ? (
          <>
            <Text style={styles.resultHero}>
              Surpris à tricher, vous quittez la lice couvert de honte.
            </Text>
            <View style={styles.infoCard}>
              <Row label="Gloire" value={`${CHEAT_CAUGHT_PENALTY.glory}`} negative />
              <Row label="Honneur" value={`${CHEAT_CAUGHT_PENALTY.honor}`} negative />
              <Row label="Réputation" value={`${CHEAT_CAUGHT_PENALTY.reputation}`} negative />
            </View>
          </>
        ) : overallWon ? (
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
              Vous avez remporté {roundsWon} round{roundsWon !== 1 ? 's' : ''} sur {summaries.length}.
            </Text>
            <View style={styles.infoCard}>
              <Row label="Gloire" value="-3" negative />
            </View>
          </>
        )}

        {/* Extra effects from in-tournament choices */}
        {(bonusGold !== 0 || bonusHonor !== 0 || bonusReputation !== 0 || woundAccrued > 0) && (
          <View style={styles.infoCard}>
            <Text style={styles.tipTitle}>Au fil du tournoi</Text>
            {bonusGold !== 0 && <Row label="Or" value={`${bonusGold > 0 ? '+' : ''}${bonusGold} g`} negative={bonusGold < 0} />}
            {bonusHonor !== 0 && <Row label="Honneur" value={`${bonusHonor > 0 ? '+' : ''}${bonusHonor}`} negative={bonusHonor < 0} />}
            {bonusReputation !== 0 && <Row label="Réputation" value={`${bonusReputation > 0 ? '+' : ''}${bonusReputation}`} negative={bonusReputation < 0} />}
            {woundAccrued > 0 && <Row label="Points de vie" value={`-${woundAccrued}`} negative />}
          </View>
        )}

        {/* Round summary */}
        <Text style={styles.sectionLabel}>Résumé des rounds</Text>
        {summaries.map((s, i) => (
          <View key={i} style={[styles.summaryRow, { backgroundColor: s.won ? WIN_TINT : LOSE_TINT }]}>
            <Text style={styles.summaryText}>
              Round {s.n} vs {s.opponentName} {s.cheated ? '☠' : ''}
            </Text>
            <Text style={styles.summaryScore}>
              {s.stanceLabel} · {s.playerRoll} vs {s.opponentRoll} — {s.won ? 'Victoire' : 'Défaite'}
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function ResourceBars({
  vigueur,
  maxVig,
  momentum,
  suspicion,
  resourceName,
}: {
  vigueur: number;
  maxVig: number;
  momentum: number;
  suspicion: number;
  resourceName: string;
}) {
  const vigPct = Math.max(0, Math.min(1, vigueur / maxVig));
  return (
    <View style={styles.resourceCard}>
      <View style={styles.resourceRow}>
        <Text style={styles.resourceLabel}>{resourceName}</Text>
        <Text style={styles.resourceValue}>{Math.round(vigueur)} / {maxVig}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${vigPct * 100}%` }]} />
      </View>

      <View style={styles.resourceRow}>
        <Text style={styles.resourceLabel}>Élan</Text>
        <View style={styles.pipRow}>
          {Array.from({ length: MAX_MOMENTUM }).map((_, i) => (
            <View key={i} style={[styles.pip, i < momentum && styles.pipOn]} />
          ))}
        </View>
      </View>

      {suspicion > 0 && (
        <View style={styles.resourceRow}>
          <Text style={styles.resourceLabel}>Soupçon</Text>
          <Text style={styles.suspicionValue}>{suspicion}%</Text>
        </View>
      )}
    </View>
  );
}

function BreakdownRow({ label, value, prefix }: { label: string; value: number; prefix?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>{prefix}{value}</Text>
    </View>
  );
}

function BreakdownLine({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={[styles.breakdownValue, value >= 0 ? styles.bonusPos : styles.bonusNeg]}>
        {value >= 0 ? '+' : ''}{value}
      </Text>
    </View>
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
  headerWin: { backgroundColor: 'rgba(67,169,92,0.25)' },
  headerLose: { backgroundColor: 'rgba(239,90,111,0.25)' },
  banner: {
    width: '100%',
    height: 130,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.title,
    fontSize: 21,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  headerSub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  backBtn: { minWidth: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.accent },

  body: { padding: 16, gap: 14 },

  bigName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  bigSub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary },
  rowValue: { fontFamily: Fonts.bodyBold, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  rowNegative: { color: '#EF5A6F' },

  tipTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  warningText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  primaryBtn: {
    backgroundColor: Colors.buttonBg,
    borderRadius: 0,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.buttonText,
    letterSpacing: 0.5,
  },

  // Resource bars
  resourceCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 8,
  },
  resourceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resourceLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resourceValue: { fontFamily: Fonts.bodyBold, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  suspicionValue: { fontFamily: Fonts.bodyBold, fontSize: 13, fontWeight: '700', color: Colors.accent },
  barTrack: {
    height: 10,
    backgroundColor: Colors.surfaceDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  barFill: { height: '100%', backgroundColor: Colors.accent },
  pipRow: { flexDirection: 'row', gap: 4 },
  pip: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceDark,
  },
  pipOn: { backgroundColor: Colors.accent },

  // Round / opponent card
  roundCard: {
    backgroundColor: Colors.surface,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  opponentName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  opponentSkillLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  foeWeak: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.accent },

  // Stances
  stanceCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 4,
  },
  stanceCardSelected: { borderColor: Colors.accent, backgroundColor: Colors.surfaceDark },
  stanceCardLocked: { opacity: 0.4 },
  stanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stanceTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  stanceBonus: { fontFamily: Fonts.bodyBold, fontSize: 16, fontWeight: '700' },
  bonusPos: { color: '#43A95C' },
  bonusNeg: { color: '#EF5A6F' },
  stanceDesc: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  stanceMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSecondary, fontStyle: 'italic' },

  // Cheat toggle
  cheatToggle: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: 12,
    gap: 2,
  },
  cheatToggleOn: { borderColor: Colors.accent, borderStyle: 'solid', backgroundColor: 'rgba(244,200,78,0.12)' },
  cheatText: { fontFamily: Fonts.bodyBold, fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  cheatTextOn: { color: Colors.accent },
  cheatMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.textSecondary, fontStyle: 'italic' },

  // Rolls
  rollRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rollBox: { alignItems: 'center', gap: 4 },
  rollLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary },
  rollValue: { fontFamily: Fonts.bodyBold, fontSize: 32, fontWeight: '700' },
  rollPlayer: { color: Colors.accent },
  rollOpponent: { color: '#EF5A6F' },
  rollVs: { fontFamily: Fonts.body, fontSize: 16, color: Colors.textSecondary },

  outcomeBox: {
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  outcomeText: { fontFamily: Fonts.bodyBold, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  caughtTitle: { fontFamily: Fonts.bodyBold, fontSize: 18, fontWeight: '700', color: '#EF5A6F' },

  flavorText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 19,
  },

  // Breakdown
  breakdown: {
    alignSelf: 'stretch',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    gap: 3,
  },
  breakdownLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary },
  breakdownValue: { fontFamily: Fonts.bodyBold, fontSize: 12, fontWeight: '700', color: Colors.textPrimary },

  // Event
  eventTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  // Result
  resultHero: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  summaryRow: {
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  summaryText: { fontFamily: Fonts.bodyBold, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  summaryScore: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary },
});
