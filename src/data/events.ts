import type { Item, RelationType, StatDelta } from '../types/game';

export interface EventOutcome {
  label: string;
  statDelta?: StatDelta;
  goldDelta?: number;
  addItem?: Omit<Item, 'id'>;
  removeItem?: string; // matches item.subtype
  historyText: string;
  /** Adjusts the score of the first matching relation of this type */
  relationDelta?: { relationType: RelationType; amount: number };
  /** Find-or-create a recurring NPC (by npcRole) and nudge their score. */
  ensureNpc?: { role: string; profession: string; scoreDelta: number };
  /** When true, sets player.activePlague = true for the year */
  setActivePlague?: boolean;
  /** Persistent story flags raised by this choice (dilemmas/quests). */
  setFlags?: string[];
  /** Health LOST by this choice (does not touch maxHealth). 0 HP = death. */
  healthDamage?: number;
  /** Accepts the quest with this id (see data/quests.ts). */
  acceptQuest?: string;
}

export interface GameEvent {
  id: string;
  type: 'monthly' | 'annual';
  title: string;
  description: string;
  conditions?: {
    minAge?: number;
    maxAge?: number;
    minGlory?: number;
    minReputation?: number;
    maxReputation?: number;
    minHonor?: number;
    maxHonor?: number;
    requiresItem?: string; // matches item.subtype
    requiresRelationType?: string; // RelationType value
    minSkill?: { skill: string; value: number }; // e.g. 'combatSkills.longSword'
    /** Player must have this story flag. */
    requiredFlag?: string;
    /** Player must NOT have these story flags (used to make dilemmas one-time). */
    forbiddenFlag?: string | string[];
    /** Only eligible when no contract is currently active. */
    noActiveQuest?: boolean;
    /** Calendar-year window (e.g. the 1315 famine). */
    minYear?: number;
    maxYear?: number;
    /** Minimum cumulative pagan-temple visits. */
    minTempleVisits?: number;
    /** Requires an npc with this role among relations. */
    requiresNpcRole?: string;
  };
  outcomes: EventOutcome[];
  /** Priority events preempt the normal random pick when eligible (famine…). */
  priority?: boolean;
}

// ---------------------------------------------------------------------------
// Monthly events (36)
// ---------------------------------------------------------------------------

export const MONTHLY_EVENTS: GameEvent[] = [
  // ── LAW & FAITH TROUBLES (low reputation only) ─────────────────────────────
  // These only become eligible once your reputation sinks, so they grow more
  // frequent the more notorious you are.

  {
    id: 'monthly_lawfaith_false_accusation',
    type: 'monthly',
    title: 'Une accusation',
    description:
      "Un bourgeois vous accuse publiquement d'un vol que vous n'avez pas commis. Votre réputation joue contre vous.",
    conditions: { maxReputation: -10 },
    outcomes: [
      {
        label: 'Chercher un témoin pour vous disculper',
        statDelta: { prestige: { reputation: 1 } },
        historyText:
          "Un voisin honnête témoigne en votre faveur. L'affaire est classée — de justesse.",
      },
      {
        label: 'Fuir devant la foule',
        statDelta: { prestige: { honor: -4, reputation: -3 } },
        historyText:
          'Votre fuite passe pour un aveu. Votre réputation en pâtit davantage.',
      },
      {
        label: 'Soudoyer l’accusateur',
        goldDelta: -10,
        historyText: 'Quelques pièces font taire les langues. Pour cette fois.',
      },
    ],
  },

  {
    id: 'monthly_lawfaith_guard_shakedown',
    type: 'monthly',
    title: 'Un garde trop zélé',
    description:
      'Un homme du guet vous arrête sans motif et vous somme de vous justifier ou de payer une « amende ».',
    conditions: { maxReputation: -20 },
    outcomes: [
      {
        label: "Payer l'amende",
        goldDelta: -8,
        historyText: 'Vous payez pour avoir la paix. Le garde sourit.',
      },
      {
        label: 'Protester',
        statDelta: { physicalStats: { endurance: -2 }, prestige: { reputation: -2 } },
        historyText: 'Votre protestation vous vaut quelques coups de bâton.',
      },
    ],
  },

  {
    id: 'monthly_lawfaith_sermon_against_you',
    type: 'monthly',
    title: 'Sermon accusateur',
    description:
      "Du haut de sa chaire, le prêtre dénonce les âmes corrompues du village. Tous les regards se tournent vers vous.",
    conditions: { maxReputation: -15 },
    outcomes: [
      {
        label: 'Faire un don de contrition à l’église',
        goldDelta: -6,
        statDelta: { prestige: { honor: 2 } },
        historyText: 'Votre don apaise les esprits. On murmure que vous vous repentez.',
      },
      {
        label: 'Quitter la messe avec mépris',
        statDelta: { prestige: { reputation: -3 } },
        relationDelta: { relationType: 'priest', amount: -8 },
        historyText: 'Votre insolence choque. Le prêtre ne vous le pardonnera pas.',
      },
    ],
  },

  {
    id: 'monthly_lawfaith_theft_victim',
    type: 'monthly',
    title: 'Volé à votre tour',
    description:
      'On vous a dérobé votre bourse pendant la nuit. Dans votre quartier mal famé, nul ne s’en émeut.',
    conditions: { maxReputation: -25 },
    outcomes: [
      {
        label: 'Encaisser la perte',
        goldDelta: -7,
        historyText: 'Vous comptez vos pertes en silence.',
      },
      {
        label: 'Accuser un voisin au hasard',
        statDelta: { prestige: { honor: -3, reputation: -2 } },
        historyText: 'Votre accusation gratuite envenime encore vos rapports au village.',
      },
    ],
  },

  // ── ILLNESS ──────────────────────────────────────────────────────────────

  {
    id: 'monthly_illness_fever',
    type: 'monthly',
    title: 'Une fièvre légère',
    description:
      "Vous vous réveillez avec une fièvre persistante. Un repos forcé s'impose.",
    outcomes: [
      {
        label: 'Se reposer',
        statDelta: { physicalStats: { endurance: -3 } },
        historyText: 'Cloué au lit pendant plusieurs jours par la fièvre.',
      },
      {
        label: 'Consulter le guérisseur',
        goldDelta: -5,
        statDelta: { physicalStats: { endurance: -1 } },
        historyText:
          'Le guérisseur du village vous remet sur pied rapidement, moyennant quelques pièces.',
      },
    ],
  },

  {
    id: 'monthly_illness_wound',
    type: 'monthly',
    title: 'Une blessure accidentelle',
    description:
      'En travaillant, vous vous blessez sérieusement à la main. La plaie saigne abondamment.',
    outcomes: [
      {
        label: 'Se soigner soi-même',
        statDelta: { physicalStats: { strength: -2 } },
        historyText: 'La blessure cicatrise mal et vous laisse une gêne persistante.',
      },
      {
        label: 'Consulter le guérisseur',
        goldDelta: -8,
        historyText:
          'Le guérisseur nettoie et bande la plaie. Vous récupérez complètement.',
      },
    ],
  },

  {
    id: 'monthly_illness_stomach',
    type: 'monthly',
    title: "Mal d'estomac",
    description:
      "Vous avez mangé quelque chose d'avarié au marché. Des crampes vous tordent le ventre toute la nuit.",
    outcomes: [
      {
        label: 'Endurer la douleur',
        statDelta: { physicalStats: { endurance: -2, speed: -1 } },
        historyText: "Une nuit d'agonie, mais vous vous remettez seul.",
      },
      {
        label: 'Prendre des herbes médicinales',
        goldDelta: -3,
        historyText: "Une décoction d'herbes soulage rapidement vos maux.",
      },
    ],
  },

  {
    id: 'monthly_illness_cold',
    type: 'monthly',
    title: 'Un rhume tenace',
    description:
      'Le froid humide de la saison vous a abattu. Vous toussez et éternuez sans cesse.',
    outcomes: [
      {
        label: 'Rester au chaud',
        statDelta: { physicalStats: { endurance: -1 } },
        historyText: 'Quelques jours de repos vous remettent sur pied.',
      },
      {
        label: 'Ignorer la maladie',
        statDelta: { physicalStats: { endurance: -3, strength: -1 } },
        historyText:
          "Vous avez trop forcé malgré la maladie. Le rhume s'est aggravé.",
      },
    ],
  },

  {
    id: 'monthly_illness_eyes',
    type: 'monthly',
    title: 'Fatigue oculaire',
    description:
      'Vos longues heures de lecture à la bougie ont fatigué vos yeux. Vous peinez à distinguer les détails.',
    conditions: { minSkill: { skill: 'knowledgeSkills.literature', value: 20 } },
    outcomes: [
      {
        label: 'Se reposer les yeux',
        statDelta: { knowledgeSkills: { literature: -1 } },
        historyText:
          'Vous réduisez votre lecture pendant quelques semaines pour récupérer.',
      },
      {
        label: 'Continuer à étudier malgré tout',
        statDelta: {
          knowledgeSkills: { literature: 1, generalCulture: 1 },
          physicalStats: { endurance: -2 },
        },
        historyText:
          'Votre détermination paie, mais vos yeux en souffrent.',
      },
    ],
  },

  // ── OPPORTUNITY ───────────────────────────────────────────────────────────

  {
    id: 'monthly_opp_escort',
    type: 'monthly',
    title: 'Un marchand cherche une escorte',
    description:
      'Un marchand doit traverser une forêt réputée dangereuse. Il cherche une escorte armée et vous propose une bonne rémunération.',
    conditions: { minAge: 16 },
    outcomes: [
      {
        label: "Accepter l'escorte",
        goldDelta: 15,
        statDelta: { prestige: { reputation: 1 } },
        historyText:
          'Le voyage se passe sans encombre. Le marchand vous paie généreusement et vante votre sérieux.',
      },
      {
        label: 'Refuser',
        historyText: "Vous déclinez l'offre. Une occasion manquée.",
      },
    ],
  },

  {
    id: 'monthly_opp_messenger',
    type: 'monthly',
    title: 'Un message urgent',
    description:
      'Le secrétaire du seigneur local cherche un messager fiable pour porter des documents importants dans la ville voisine.',
    conditions: { minAge: 14 },
    outcomes: [
      {
        label: 'Accepter la mission',
        goldDelta: 10,
        statDelta: { prestige: { reputation: 1 } },
        historyText:
          'Vous livrez les documents avec diligence. Le seigneur remarque votre fiabilité.',
      },
      {
        label: 'Décliner',
        historyText: 'Vous refusez. Un autre prendra la commission.',
      },
    ],
  },

  {
    id: 'monthly_opp_craftsman',
    type: 'monthly',
    title: "L'aide d'un artisan",
    description:
      "Un artisan renommé cherche un aide pour une commande urgente. C'est une occasion d'apprendre.",
    conditions: { minAge: 14 },
    outcomes: [
      {
        label: 'Proposer son aide',
        goldDelta: 5,
        statDelta: { physicalStats: { strength: 2 } },
        historyText:
          "Vous travaillez dur aux côtés de l'artisan et vos bras s'en trouvent renforcés.",
      },
      {
        label: 'Refuser',
        historyText: 'Vous passez votre chemin.',
      },
    ],
  },

  {
    id: 'monthly_opp_healer',
    type: 'monthly',
    title: "L'herboriste a besoin d'aide",
    description:
      "La vieille herboriste du village cherche quelqu'un pour l'aider à cueillir des herbes médicinales dans la forêt.",
    conditions: { minAge: 14 },
    outcomes: [
      {
        label: "Accompagner l'herboriste",
        goldDelta: 3,
        statDelta: { knowledgeSkills: { medicine: 2 } },
        historyText:
          'Vous apprenez à identifier une dizaine de plantes médicinales.',
      },
      {
        label: 'Refuser',
        historyText: "Une occasion d'apprendre perdue.",
      },
    ],
  },

  {
    id: 'monthly_opp_scribe',
    type: 'monthly',
    title: "Le scribe manque d'assistant",
    description:
      "Le scribe du monastère local a besoin d'aide pour recopier des manuscrits. Il offre quelques leçons en échange.",
    conditions: { minSkill: { skill: 'knowledgeSkills.literature', value: 10 } },
    outcomes: [
      {
        label: 'Aider le scribe',
        statDelta: { knowledgeSkills: { literature: 2, generalCulture: 1 } },
        historyText:
          "Des heures de copie minutieuse renforcent votre maîtrise de l'écriture.",
      },
      {
        label: "Refuser l'invitation",
        historyText: 'Vous déclinez.',
      },
    ],
  },

  // ── ENCOUNTER ─────────────────────────────────────────────────────────────

  {
    id: 'monthly_enc_bard',
    type: 'monthly',
    title: 'Un barde itinérant',
    description:
      "Un barde s'arrête dans la taverne et enchante l'assemblée avec ses récits de terres lointaines et de héros oubliés.",
    outcomes: [
      {
        label: "L'écouter attentivement",
        statDelta: { knowledgeSkills: { generalCulture: 2 } },
        historyText: 'Les récits du barde élargissent votre vision du monde.',
      },
      {
        label: "L'inviter à boire",
        goldDelta: -2,
        statDelta: { knowledgeSkills: { generalCulture: 1, eloquence: 1 } },
        historyText:
          "Au fil de la conversation, vous échangez des histoires et perfectionnez votre éloquence.",
      },
    ],
  },

  {
    id: 'monthly_enc_pilgrim',
    type: 'monthly',
    title: 'Un pèlerin étrange',
    description:
      "Un vieux pèlerin s'arrête chez vous. Ses yeux semblent avoir vu bien plus que la plupart des hommes.",
    outcomes: [
      {
        label: "Offrir l'hospitalité et l'écouter",
        statDelta: {
          knowledgeSkills: { religion: 2, generalCulture: 1 },
          prestige: { honor: 1 },
        },
        historyText:
          'Le pèlerin vous bénit avant de repartir. Ses paroles restent gravées dans votre mémoire.',
      },
      {
        label: 'Le chasser',
        statDelta: { prestige: { honor: -3 } },
        historyText: "Vous le renvoyez sans ménagement. Les voisins vous regardent d'un mauvais œil.",
      },
    ],
  },

  {
    id: 'monthly_enc_soldier',
    type: 'monthly',
    title: 'Un vieux soldat',
    description:
      "Un ancien soldat s'est installé dans le village. Il propose de partager ses techniques de combat contre quelques pièces.",
    conditions: { minAge: 15 },
    outcomes: [
      {
        label: 'Prendre des leçons',
        goldDelta: -5,
        statDelta: { combatSkills: { swordAndShield: 2 } },
        historyText: 'Le vieux soldat vous enseigne des techniques de défense efficaces.',
      },
      {
        label: 'Refuser',
        historyText: 'Vous passez votre chemin.',
      },
    ],
  },

  {
    id: 'monthly_enc_herbalist',
    type: 'monthly',
    title: "L'herboriste ambulant",
    description:
      "Un herboriste ambulant s'arrête sur la place du marché, proposant remèdes et connaissances médicales.",
    outcomes: [
      {
        label: 'Discuter avec lui',
        statDelta: { knowledgeSkills: { medicine: 2 } },
        historyText:
          "L'herboriste partage ses recettes de soins. Vous en mémorisez quelques-unes.",
      },
      {
        label: 'Acheter un remède',
        goldDelta: -4,
        statDelta: { physicalStats: { endurance: 2 } },
        historyText: "Vous achetez un tonique revigorant qui vous regonfle d'énergie.",
      },
    ],
  },

  {
    id: 'monthly_enc_noble_youth',
    type: 'monthly',
    title: 'Un jeune noble en difficulté',
    description:
      "Vous croisez un jeune noble dont le cheval a pris peur et s'est enfui. Il est visiblement embarrassé.",
    conditions: { minAge: 14 },
    outcomes: [
      {
        label: 'Aider à retrouver le cheval',
        statDelta: {
          ridingSkills: { animalHandling: 1 },
          prestige: { reputation: 1 },
        },
        ensureNpc: { role: 'noble', profession: 'le noble', scoreDelta: 8 },
        historyText:
          "Vous rattrapez l'animal. Le jeune noble, soulagé, vous remercie chaleureusement.",
      },
      {
        label: 'Ignorer sa situation',
        historyText: 'Vous continuez votre chemin. Le noble vous regarde avec surprise.',
      },
    ],
  },

  // ── FAMILY ────────────────────────────────────────────────────────────────

  {
    id: 'monthly_fam_ill_parent',
    type: 'monthly',
    title: 'Un parent est malade',
    description:
      "Vous apprenez qu'un de vos proches est tombé gravement malade. Il a besoin d'aide.",
    conditions: { requiresRelationType: 'father' },
    outcomes: [
      {
        label: 'Lui apporter aide et réconfort',
        goldDelta: -10,
        statDelta: { prestige: { honor: 2 } },
        historyText:
          'Vous consacrez du temps et des ressources à soigner votre proche. Il vous en est profondément reconnaissant.',
      },
      {
        label: 'Envoyer quelques pièces seulement',
        goldDelta: -5,
        historyText: "Vous faites l'essentiel, mais votre absence se fait sentir.",
      },
      {
        label: 'Ne rien faire',
        statDelta: { prestige: { honor: -5, reputation: -2 } },
        historyText:
          'Vous ignorez la maladie de votre proche. Les gens remarquent votre froideur.',
      },
    ],
  },

  {
    id: 'monthly_fam_sibling_trouble',
    type: 'monthly',
    title: 'Des ennuis fraternels',
    description:
      "Votre frère ou sœur s'est mis dans une situation délicate — une dette de jeu ou une bagarre. Il vous demande de l'aide.",
    conditions: { requiresRelationType: 'sibling' },
    outcomes: [
      {
        label: 'Aider sans condition',
        goldDelta: -8,
        statDelta: { prestige: { honor: 1 } },
        historyText: "Vous payez ses dettes et le tirez d'affaire. Il vous jure de ne plus recommencer.",
      },
      {
        label: "Aider contre une promesse de changement",
        goldDelta: -5,
        historyText: "Il promet de changer. Vous n'êtes pas certain qu'il tiendra.",
      },
      {
        label: 'Refuser',
        statDelta: { prestige: { honor: -2 } },
        historyText: 'Vous refusez de couvrir ses bêtises. La relation se refroidit.',
      },
    ],
  },

  {
    id: 'monthly_fam_gold_request',
    type: 'monthly',
    title: "La famille a besoin d'argent",
    description:
      'Votre famille traverse une période difficile. On vous demande une contribution financière.',
    outcomes: [
      {
        label: 'Donner généreusement',
        goldDelta: -15,
        statDelta: { prestige: { honor: 2 } },
        historyText: 'Votre générosité renforce les liens familiaux.',
      },
      {
        label: 'Donner modestement',
        goldDelta: -5,
        historyText: 'Vous contribuez selon vos moyens.',
      },
      {
        label: 'Refuser',
        statDelta: { prestige: { honor: -4 } },
        historyText: 'La tension monte au sein de la famille.',
      },
    ],
  },

  {
    id: 'monthly_fam_letter',
    type: 'monthly',
    title: 'Une lettre de loin',
    description:
      "Vous recevez une lettre d'un membre de votre famille installé dans une ville lointaine. Les nouvelles sont mitigées.",
    outcomes: [
      {
        label: 'Répondre avec soin',
        statDelta: { knowledgeSkills: { literature: 1 } },
        historyText: "Vous composez une longue réponse. L'exercice améliore votre écriture.",
      },
      {
        label: 'Lire et ne pas répondre',
        historyText: 'Vous gardez les nouvelles pour vous.',
      },
    ],
  },

  // ── WEATHER ───────────────────────────────────────────────────────────────

  {
    id: 'monthly_weather_harsh_winter',
    type: 'monthly',
    title: 'Un hiver rigoureux',
    description:
      "Le froid est exceptionnellement mordant ce mois-ci. Les provisions s'amenuisent.",
    outcomes: [
      {
        label: 'Se rationner et économiser',
        goldDelta: -5,
        statDelta: { physicalStats: { endurance: -2 } },
        historyText: 'Le froid épuisant vous affaiblit malgré vos précautions.',
      },
      {
        label: 'Dépenser pour se chauffer convenablement',
        goldDelta: -12,
        historyText:
          "Vous dépensez pour du bois et des provisions supplémentaires. Vous traversez l'hiver sans trop souffrir.",
      },
    ],
  },

  {
    id: 'monthly_weather_storm',
    type: 'monthly',
    title: 'Une tempête dévastatrice',
    description:
      "Une violente tempête s'abat sur la région, endommageant toitures et récoltes.",
    outcomes: [
      {
        label: 'Aider à réparer les dégâts',
        statDelta: {
          physicalStats: { strength: 1 },
          prestige: { reputation: 1 },
        },
        historyText: 'Votre aide lors des réparations ne passe pas inaperçue.',
      },
      {
        label: 'Rester chez soi',
        goldDelta: -8,
        historyText: "Votre propre logis subit quelques dégâts qu'il faut réparer.",
      },
    ],
  },

  {
    id: 'monthly_weather_drought',
    type: 'monthly',
    title: 'Une sécheresse tenace',
    description:
      "Pas une goutte de pluie depuis des semaines. Les puits s'assèchent et les prix alimentaires grimpent.",
    outcomes: [
      {
        label: 'Constituer des réserves',
        goldDelta: -10,
        historyText:
          'Vous achetez des provisions avant que les prix ne flambent davantage.',
      },
      {
        label: 'Faire confiance à la Providence',
        goldDelta: -5,
        statDelta: { physicalStats: { endurance: -1 } },
        historyText:
          'La sécheresse vous affecte comme les autres. Vous serrez la ceinture.',
      },
    ],
  },

  // ── CRIME ─────────────────────────────────────────────────────────────────

  {
    id: 'monthly_crime_pickpocket',
    type: 'monthly',
    title: 'Un pickpocket habile',
    description:
      "Dans la foule du marché, vous sentez une main s'insinuer dans votre bourse.",
    outcomes: [
      {
        label: 'Attraper le voleur',
        statDelta: { prestige: { reputation: 1 } },
        historyText: 'Vous saisissez le filou par le poignet. La foule applaudit.',
      },
      {
        label: 'Perdre la bourse',
        goldDelta: -10,
        historyText: 'Trop tard. Le voleur a disparu dans la foule avec quelques-unes de vos pièces.',
      },
    ],
  },

  {
    id: 'monthly_crime_witness_theft',
    type: 'monthly',
    title: "Témoin d'un vol",
    description:
      "Vous voyez clairement un individu dérober la bourse d'un vieillard. Il ne vous a pas remarqué.",
    outcomes: [
      {
        label: 'Intervenir et arrêter le voleur',
        statDelta: { prestige: { honor: 2, reputation: 1 } },
        historyText:
          'Vous maîtrisez le voleur et rendez la bourse au vieillard. Il vous bénit.',
      },
      {
        label: 'Alerter les gardes',
        statDelta: { prestige: { honor: 1 } },
        historyText:
          'Vous prévenez les gardes. Le voleur est arrêté quelques rues plus loin.',
      },
      {
        label: 'Ne rien faire',
        statDelta: { prestige: { honor: -4 } },
        historyText:
          'Vous regardez la scène sans intervenir. Le vieillard pleure sa perte.',
      },
    ],
  },

  {
    id: 'monthly_crime_stolen_goods',
    type: 'monthly',
    title: 'Des marchandises suspectes',
    description:
      "Un receleur vous propose discrètement d'acheter des marchandises à prix dérisoire. Elles semblent volées.",
    outcomes: [
      {
        label: 'Refuser et dénoncer',
        statDelta: { prestige: { honor: 2, reputation: 1 } },
        historyText:
          'Vous refusez et signalez le receleur aux autorités. La ville vous en est reconnaissante.',
      },
      {
        label: 'Refuser sans dénoncer',
        historyText: "Vous déclinez simplement. L'homme disparaît.",
      },
      {
        label: 'Acheter',
        goldDelta: -5,
        statDelta: { prestige: { honor: -5 } },
        historyText:
          'Vous achetez les marchandises. Elles valent leur prix, mais votre conscience vous tourmente.',
      },
    ],
  },

  {
    id: 'monthly_crime_false_accusation',
    type: 'monthly',
    title: 'Une fausse accusation',
    description:
      "Un voisin vous accuse publiquement d'avoir volé ses poulets. C'est faux, mais plusieurs personnes l'entendent.",
    outcomes: [
      {
        label: 'Plaider votre innocence avec force',
        statDelta: { prestige: { reputation: -1 } },
        historyText:
          'Malgré vos explications, le doute plane. La vérité émergera avec le temps.',
      },
      {
        label: 'Trouver des témoins pour vous disculper',
        statDelta: { prestige: { reputation: 1 } },
        historyText:
          "Deux voisins attestent de votre présence ailleurs ce soir-là. L'accusation tombe.",
      },
      {
        label: "Ignorer l'accusation",
        statDelta: { prestige: { reputation: -3 } },
        historyText:
          'Votre silence est interprété comme un aveu par certains.',
      },
    ],
  },

  // ── ANIMAL ────────────────────────────────────────────────────────────────

  {
    id: 'monthly_animal_stray_dog',
    type: 'monthly',
    title: 'Un chien perdu',
    description:
      'Un chien errant, maigre et craintif, vous suit depuis le marché. Son regard est suppliant.',
    outcomes: [
      {
        label: "L'adopter",
        statDelta: { ridingSkills: { animalHandling: 1 } },
        addItem: { name: 'Chien fidèle', category: 'animal', subtype: 'dog' },
        historyText: 'Vous rentrez avec votre nouveau compagnon. Il semble reconnaissant.',
      },
      {
        label: 'Le chasser',
        historyText: "Vous chassez l'animal. Il repart en boitant.",
      },
      {
        label: 'Lui donner à manger puis partir',
        statDelta: { prestige: { honor: 1 } },
        historyText: 'Vous lui donnez quelques restes puis continuez votre chemin.',
      },
    ],
  },

  {
    id: 'monthly_animal_horse_lame',
    type: 'monthly',
    title: 'Un cheval boiteux',
    description:
      "Votre cheval boite et refuse d'avancer. Une pierre coincée dans le sabot ou un tendon froissé ?",
    conditions: { requiresItem: 'horse' },
    outcomes: [
      {
        label: 'Soigner le cheval vous-même',
        statDelta: { ridingSkills: { animalHandling: 2 } },
        historyText:
          'Vous examinez le sabot avec soin, retirez la pierre et bandez la jambe. Le cheval guérit.',
      },
      {
        label: 'Appeler le maréchal-ferrant',
        goldDelta: -8,
        historyText: "Le maréchal-ferrant s'en occupe rapidement. La bête repart au galop.",
      },
    ],
  },

  {
    id: 'monthly_animal_pest',
    type: 'monthly',
    title: 'Une infestation de nuisibles',
    description:
      'Des rongeurs ont envahi vos réserves de nourriture, causant des dégâts considérables.',
    outcomes: [
      {
        label: 'Piéger les animaux vous-même',
        statDelta: { physicalStats: { agility: 1 } },
        historyText: 'Vous passez la semaine à piéger les rongeurs. Le problème est réglé.',
      },
      {
        label: 'Payer un exterminateur',
        goldDelta: -6,
        historyText: 'Un professionnel vide les lieux en deux jours.',
      },
    ],
  },

  // ── RUMOR ─────────────────────────────────────────────────────────────────

  {
    id: 'monthly_rumor_noble',
    type: 'monthly',
    title: 'Des rumeurs sur le seigneur',
    description:
      'On murmure que le seigneur local aurait une liaison secrète. Les langues vont bon train à la taverne.',
    outcomes: [
      {
        label: 'Écouter discrètement',
        statDelta: { knowledgeSkills: { generalCulture: 1 } },
        historyText:
          'Vous absorbez ces informations. Ce genre de savoir peut être utile.',
      },
      {
        label: 'Répandre les rumeurs',
        statDelta: { prestige: { honor: -2, reputation: 1 } },
        historyText:
          'Vous alimentez les cancans. Votre popularité monte, mais votre intégrité en souffre.',
      },
      {
        label: "Refuser d'y participer",
        statDelta: { prestige: { honor: 1 } },
        historyText: 'Vous refusez de vous abaisser aux ragots. Certains vous respectent pour cela.',
      },
    ],
  },

  {
    id: 'monthly_rumor_about_you',
    type: 'monthly',
    title: 'Des rumeurs vous concernant',
    description:
      'Vous apprenez que des rumeurs circulent à votre sujet — apparemment positives, on parle de vos qualités.',
    outcomes: [
      {
        label: 'Ne rien faire, laisser courir',
        statDelta: { prestige: { reputation: 1 } },
        historyText: "Les rumeurs favorables font leur chemin d'elles-mêmes.",
      },
      {
        label: 'Confirmer subtilement votre image',
        statDelta: { prestige: { reputation: 2, honor: -1 } },
        historyText:
          "Vous faites tout pour entretenir votre image. Cela fonctionne, mais manque d'authenticité.",
      },
    ],
  },

  {
    id: 'monthly_rumor_tournament',
    type: 'monthly',
    title: 'Nouvelles du tournoi',
    description:
      "On parle d'un chevalier qui a remporté un tournoi régional avec une technique étrange. Les détails circulent.",
    outcomes: [
      {
        label: "S'intéresser aux détails",
        statDelta: { combatSkills: { longSword: 1 } },
        historyText:
          'En analysant la technique décrite, vous en tirez quelques enseignements.',
      },
      {
        label: 'Écouter distraitement',
        statDelta: { knowledgeSkills: { generalCulture: 1 } },
        historyText: 'Une anecdote de plus dans votre mémoire.',
      },
    ],
  },

  {
    id: 'monthly_rumor_war',
    type: 'monthly',
    title: 'Rumeurs de guerre',
    description:
      'Des voyageurs rapportent des tensions croissantes entre deux seigneurs voisins. La guerre semble imminente.',
    outcomes: [
      {
        label: 'Préparer ses affaires',
        goldDelta: -5,
        statDelta: { physicalStats: { endurance: 1 } },
        historyText:
          'Vous constituez des réserves en prévision des troubles à venir.',
      },
      {
        label: 'Attendre de voir',
        historyText: 'Vous attendez que la situation se précise.',
      },
    ],
  },

  // ── MORAL DILEMMA ─────────────────────────────────────────────────────────

  {
    id: 'monthly_moral_beggar',
    type: 'monthly',
    title: "L'enfant mendiant",
    description:
      "Un enfant déguenillé vous tend la main devant la boulangerie. Ses yeux sont vides de toute espérance.",
    outcomes: [
      {
        label: 'Lui donner généreusement',
        goldDelta: -3,
        statDelta: { prestige: { honor: 2 } },
        historyText: "Vous lui donnez assez pour manger plusieurs jours. Son visage s'illumine.",
      },
      {
        label: 'Lui donner un peu',
        goldDelta: -1,
        statDelta: { prestige: { honor: 1 } },
        historyText: 'Un petit geste, mais il mange ce soir.',
      },
      {
        label: 'Ignorer',
        statDelta: { prestige: { honor: -2 } },
        historyText: "Vous passez votre chemin. Le regard de l'enfant vous suit longtemps.",
      },
    ],
  },

  {
    id: 'monthly_moral_wounded_man',
    type: 'monthly',
    title: 'Un homme blessé sur la route',
    description:
      "Vous trouvez un homme blessé au bord du chemin, inconscient. Sa blessure semble sérieuse.",
    outcomes: [
      {
        label: 'Le soigner et le transporter',
        statDelta: {
          knowledgeSkills: { medicine: 1 },
          prestige: { honor: 2 },
        },
        historyText:
          "Vous prodiguez les premiers soins et l'emmenez au village. Il survit et vous remercie.",
      },
      {
        label: "Aller chercher de l'aide",
        statDelta: { prestige: { honor: 1 } },
        historyText: "Vous courez chercher de l'aide. L'homme est secouru à temps.",
      },
      {
        label: 'Continuer votre chemin',
        statDelta: { prestige: { honor: -5 } },
        historyText: "Vous l'abandonnez. S'il survit, il ne vous le pardonnera pas.",
      },
    ],
  },

  {
    id: 'monthly_moral_false_witness',
    type: 'monthly',
    title: 'Un faux témoignage',
    description:
      "Un puissant notaire vous demande de témoigner contre un homme innocent dont vous savez qu'il n'a pas commis le crime. En échange : une belle somme d'or.",
    outcomes: [
      {
        label: 'Refuser et dire la vérité',
        statDelta: { prestige: { honor: 2 } },
        historyText:
          "Vous dites la vérité malgré les risques. L'innocent est libéré, et votre conscience est nette.",
      },
      {
        label: 'Accepter le faux témoignage',
        goldDelta: 20,
        statDelta: { prestige: { honor: -10, reputation: -3 } },
        historyText:
          "Vous trahissez la vérité contre de l'or. Un homme innocent souffre par votre faute.",
      },
    ],
  },

  // ── FAMILY EVENTS ────────────────────────────────────────────────────────

  {
    id: 'monthly_fam_sibling_ill',
    type: 'monthly',
    title: 'Votre frère ou sœur est malade',
    description:
      "L'un de vos frères ou sœurs est pris d'une forte fièvre. Sa famille proche s'inquiète. Il a besoin d'aide.",
    conditions: { requiresRelationType: 'sibling' },
    outcomes: [
      {
        label: 'Le soigner avec soin',
        relationDelta: { relationType: 'sibling', amount: 5 },
        historyText:
          'Vous restez à son chevet plusieurs jours. Il se remet lentement, et votre lien se renforce.',
      },
      {
        label: 'Ignorer et vaquer à vos affaires',
        statDelta: { prestige: { honor: -1 } },
        historyText:
          "Vous ne prenez pas la peine d'aider. Votre absence ne passera pas inaperçue.",
      },
    ],
  },

  {
    id: 'monthly_fam_mother_talk',
    type: 'monthly',
    title: 'Votre mère souhaite vous parler',
    description:
      "Votre mère vous fait signe d'approcher. Elle a des choses à vous raconter — souvenirs, conseils, récits de famille.",
    conditions: { requiresRelationType: 'mother' },
    outcomes: [
      {
        label: "L'écouter attentivement",
        statDelta: { knowledgeSkills: { generalCulture: 1 } },
        relationDelta: { relationType: 'mother', amount: 3 },
        historyText:
          'Vous passez un long moment avec elle. Ses mots vous enrichissent.',
      },
      {
        label: 'Prétendre être occupé',
        relationDelta: { relationType: 'mother', amount: -2 },
        historyText:
          "Vous déclinez poliment. Elle dissimule sa déception, mais ne l'oublie pas.",
      },
    ],
  },

  {
    id: 'monthly_fam_father_proud',
    type: 'monthly',
    title: 'Votre père est fier de vous',
    description:
      'Votre père a entendu parler de vos exploits récents. Il vous convoque pour vous exprimer sa fierté devant la famille.',
    conditions: { requiresRelationType: 'father', minGlory: 30 },
    outcomes: [
      {
        label: 'Recevoir ses éloges avec humilité',
        statDelta: { prestige: { glory: 1 } },
        relationDelta: { relationType: 'father', amount: 4 },
        historyText:
          'Votre père vous serre la main devant les vôtres. Ce moment restera gravé.',
      },
    ],
  },

  {
    id: 'monthly_fam_sibling_trouble',
    type: 'monthly',
    title: 'Votre frère ou sœur a des ennuis',
    description:
      "L'un de vos frères ou sœurs s'est mis dans une situation difficile : dettes, querelle ou mauvaise fréquentation. Il a besoin de votre aide.",
    conditions: { requiresRelationType: 'sibling' },
    outcomes: [
      {
        label: "L'aider à s'en sortir",
        goldDelta: -5,
        relationDelta: { relationType: 'sibling', amount: 5 },
        historyText:
          'Vous intervenez et réglez la situation. Votre frère ou sœur vous est redevable.',
      },
      {
        label: 'Le laisser se débrouiller',
        statDelta: { prestige: { honor: -2 } },
        historyText:
          "Vous refusez d'intervenir. Il s'en sortira peut-être seul, mais votre réputation familiale en souffre.",
      },
    ],
  },

  // ── DILEMMES (uniques — chaque issue pose un drapeau durable) ───────────────

  {
    id: 'dilemma_purse',
    type: 'monthly',
    title: 'La bourse perdue',
    description:
      "Sur le chemin du marché, vous trouvez une bourse bien garnie. Elle porte le sceau du marchand — il ne s'en est pas encore aperçu.",
    conditions: { forbiddenFlag: 'dilemma_purse_done' },
    outcomes: [
      {
        label: 'La rendre au marchand',
        statDelta: { prestige: { honor: 3, reputation: 2 } },
        ensureNpc: { role: 'merchant', profession: 'le marchand', scoreDelta: 15 },
        setFlags: ['dilemma_purse_done'],
        historyText:
          'Vous rendez la bourse. Le marchand, stupéfait, jure de ne jamais l\'oublier.',
      },
      {
        label: 'La garder discrètement',
        goldDelta: 25,
        statDelta: { prestige: { honor: -4 } },
        setFlags: ['dilemma_purse_done', 'kept_purse'],
        historyText:
          "Personne n'a rien vu. L'or pèse dans votre poche — et un peu sur votre conscience.",
      },
    ],
  },
  {
    id: 'dilemma_false_witness',
    type: 'monthly',
    title: 'Le faux témoignage',
    description:
      "Un ami est accusé de braconnage devant le bailli. Il vous supplie de jurer qu'il était avec vous ce jour-là. C'est faux.",
    conditions: { requiresRelationType: 'friend', forbiddenFlag: 'dilemma_witness_done' },
    outcomes: [
      {
        label: 'Mentir pour le sauver',
        statDelta: { prestige: { honor: -6 } },
        relationDelta: { relationType: 'friend', amount: 18 },
        setFlags: ['dilemma_witness_done', 'perjurer'],
        historyText:
          'Votre serment le sauve. Mais vous avez juré faux devant Dieu et la loi.',
      },
      {
        label: 'Dire la vérité',
        statDelta: { prestige: { honor: 4, reputation: 2 } },
        relationDelta: { relationType: 'friend', amount: -20 },
        setFlags: ['dilemma_witness_done'],
        historyText:
          "Vous refusez de mentir. Votre ami paie l'amende — et ne vous regarde plus pareil.",
      },
    ],
  },

  // ── MALADIE (risque) ────────────────────────────────────────────────────────

  {
    id: 'monthly_fever',
    type: 'monthly',
    title: 'Une mauvaise fièvre',
    description:
      "Depuis quelques jours, la fièvre vous brûle le front et vos forces déclinent. Les remèdes du barbier coûtent cher.",
    outcomes: [
      {
        label: 'Payer le barbier (15 or)',
        goldDelta: -15,
        healthDamage: 3,
        historyText: 'Saignées et décoctions : la fièvre cède en quelques jours.',
      },
      {
        label: 'Se soigner soi-même (Médecine)',
        statDelta: { knowledgeSkills: { medicine: 2 } },
        healthDamage: 8,
        historyText:
          'Vous préparez vos propres remèdes. La fièvre dure, mais vous en tirez des leçons.',
      },
      {
        label: 'Serrer les dents',
        healthDamage: 15,
        statDelta: { physicalStats: { endurance: -1 } },
        historyText: 'La fièvre vous ronge des semaines durant avant de relâcher son étreinte.',
      },
    ],
  },

  // ── LES ANNÉES NOIRES (1315–1317) — misère récurrente de la Grande Famine ──

  {
    id: 'famine_beggars',
    type: 'monthly',
    title: 'Des affamés à votre porte',
    description:
      'Une famille décharnée mendie devant chez vous. Les routes du pays se couvrent de meurt-de-faim venus de Flandre et d\'Artois.',
    conditions: { minYear: 1315, maxYear: 1317 },
    outcomes: [
      {
        label: 'Partager votre pain (5 or)',
        goldDelta: -5,
        statDelta: { prestige: { honor: 3, reputation: 2 } },
        historyText: 'Vous nourrissez ces malheureux. Dieu et le village s\'en souviendront.',
      },
      {
        label: 'Fermer votre porte',
        statDelta: { prestige: { reputation: -2 } },
        historyText: 'Vous détournez les yeux. Chacun sa croix, en ces années noires.',
      },
    ],
  },
  {
    id: 'famine_grain_thieves',
    type: 'monthly',
    title: 'Voleurs de grain',
    description:
      'La nuit, des ombres rôdent autour des réserves. La faim fait des voleurs de tout le monde.',
    conditions: { minYear: 1315, maxYear: 1317 },
    outcomes: [
      {
        label: 'Monter la garde et les chasser',
        healthDamage: 5,
        statDelta: { prestige: { reputation: 2 }, physicalStats: { endurance: 1 } },
        historyText: 'Vous les mettez en fuite après une échauffourée. Quelques bleus, rien de plus.',
      },
      {
        label: 'Laisser faire',
        goldDelta: -8,
        historyText: 'Au matin, une partie de vos réserves a disparu.',
      },
    ],
  },
  {
    id: 'famine_bread_price',
    type: 'monthly',
    title: 'Le prix du pain',
    description:
      "Le boulanger affiche des prix fous : le setier de blé vaut dix fois son prix d'avant les pluies.",
    conditions: { minYear: 1315, maxYear: 1317 },
    outcomes: [
      {
        label: 'Payer sans broncher (8 or)',
        goldDelta: -8,
        historyText: 'Votre bourse se vide pour un pain gris et dur.',
      },
      {
        label: 'Se priver encore',
        healthDamage: 6,
        historyText: 'Le ventre creux, vous tenez bon. Combien de temps encore ?',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Annual events (20)
// ---------------------------------------------------------------------------

export const ANNUAL_EVENTS: GameEvent[] = [
  {
    id: 'annual_plague',
    type: 'annual',
    title: 'La peste frappe la région',
    description:
      'Une épidémie de peste bubonique se répand dans les villages voisins. La peur règne. Les cloches sonnent sans cesse.',
    outcomes: [
      {
        label: 'Fuir vers la campagne',
        goldDelta: -20,
        historyText:
          'Vous abandonnez vos biens et fuyez. Vous survivez, mais la ruine vous guette.',
      },
      {
        label: 'Rester et se soigner soigneusement',
        statDelta: {
          physicalStats: { endurance: -3 },
          knowledgeSkills: { medicine: 1 },
        },
        setActivePlague: true,
        historyText:
          'Vous survivez grâce à vos précautions. Vous avez appris beaucoup sur les maladies.',
      },
      {
        label: 'Soigner les malades',
        statDelta: {
          physicalStats: { endurance: -5 },
          prestige: { honor: 2, reputation: 2 },
        },
        setActivePlague: true,
        historyText:
          'Vous risquez votre vie pour soigner les malades. Votre courage sera longtemps loué.',
      },
    ],
  },

  {
    id: 'annual_tournament_announced',
    type: 'annual',
    title: 'Tournoi annoncé',
    description:
      "Le seigneur organise un grand tournoi pour célébrer l'anniversaire de sa fille. Noblesse et chevaliers de toute la région seront présents.",
    conditions: { minAge: 16 },
    outcomes: [
      {
        label: "S'inscrire au tournoi",
        goldDelta: -5,
        statDelta: { prestige: { glory: 1 } },
        historyText:
          "Vous payez les droits d'inscription et commencez à vous préparer.",
      },
      {
        label: 'Assister comme spectateur',
        statDelta: { knowledgeSkills: { generalCulture: 1 } },
        historyText:
          'Vous observez les combats depuis les gradins, mémorisant les techniques.',
      },
      {
        label: "Ignorer l'événement",
        historyText: 'Vous restez à vos occupations habituelles.',
      },
    ],
  },

  {
    id: 'annual_lord_dies',
    type: 'annual',
    title: 'Le seigneur est mort',
    description:
      "Le seigneur local est décédé subitement. Une crise de succession s'amorce. L'avenir est incertain.",
    outcomes: [
      {
        label: "Soutenir l'héritier légitime",
        statDelta: { prestige: { honor: 2 } },
        historyText:
          "Vous vous rangez du côté de l'héritier reconnu. La transition se passe relativement bien.",
      },
      {
        label: 'Attendre et observer',
        historyText: 'Vous restez neutre, attendant que la situation se clarifie.',
      },
      {
        label: 'Profiter du chaos',
        goldDelta: 15,
        statDelta: { prestige: { honor: -8 } },
        historyText:
          'Dans la confusion, vous saisissez quelques opportunités lucratives. Votre conscience en porte les marques.',
      },
    ],
  },

  {
    id: 'annual_crusade_called',
    type: 'annual',
    title: "L'appel à la croisade",
    description:
      'Le pape lui-même appelle à une nouvelle croisade pour libérer les Lieux Saints. Des prédicateurs enflamment les foules dans toutes les villes.',
    conditions: { minAge: 18 },
    outcomes: [
      {
        label: "Répondre à l'appel",
        goldDelta: -30,
        statDelta: { prestige: { glory: 2, honor: 2 } },
        historyText:
          "Vous vendez une partie de vos biens et rejoignez l'armée des croisés. La gloire divine vous attend — si vous survivez.",
      },
      {
        label: "Faire un don à l'Église",
        goldDelta: -15,
        statDelta: { prestige: { honor: 1, reputation: 1 } },
        historyText:
          'Vous contribuez financièrement à la cause sainte. Le clergé bénit votre générosité.',
      },
      {
        label: 'Rester chez vous',
        historyText:
          "Vous restez. Certains vous regardent avec désapprobation, d'autres avec soulagement.",
      },
    ],
  },

  {
    id: 'annual_harvest_failure',
    type: 'annual',
    title: 'Les récoltes ont échoué',
    description:
      'Les récoltes de cette année sont catastrophiques. Grêle, sécheresse et rouille ont ravagé les champs. Les greniers sont presque vides.',
    outcomes: [
      {
        label: 'Constituer des réserves maintenant',
        goldDelta: -20,
        historyText:
          "Vous achetez des vivres à prix fort avant que la disette ne s'aggrave.",
      },
      {
        label: 'Partager avec les plus démunis',
        goldDelta: -10,
        statDelta: { prestige: { honor: 2, reputation: 2 } },
        historyText:
          'Votre geste de solidarité vous vaut une excellente réputation dans le village.',
      },
      {
        label: 'Spéculer sur les prix des denrées',
        goldDelta: 25,
        statDelta: { prestige: { honor: -8 } },
        historyText:
          "Vous profitez de la crise pour engranger des profits. Les villageois ne l'oublieront pas.",
      },
    ],
  },

  {
    id: 'annual_bandit_raid',
    type: 'annual',
    title: 'Une bande de brigands attaque',
    description:
      'Une troupe de brigands armés attaque les fermes et voyageurs des environs. Tout le monde se barricade.',
    outcomes: [
      {
        label: 'Organiser la défense du village',
        statDelta: {
          combatSkills: { swordAndShield: 1 },
          prestige: { reputation: 2, honor: 2 },
        },
        historyText:
          'Vous prenez la tête de la résistance villageoise. Les brigands finissent par renoncer.',
      },
      {
        label: 'Se défendre seul',
        goldDelta: -5,
        statDelta: { physicalStats: { strength: 1 } },
        historyText:
          'Vous défendez votre bien. Un brigand vous blesse légèrement avant de fuir.',
      },
      {
        label: 'Payer rançon',
        goldDelta: -25,
        historyText: "Vous payez pour qu'ils passent leur chemin. Humiliant mais efficace.",
      },
    ],
  },

  {
    id: 'annual_fire',
    type: 'annual',
    title: 'Le grand incendie',
    description:
      'Un incendie ravage une partie du village. Les flammes se propagent rapidement. Des gens sont piégés.',
    outcomes: [
      {
        label: "Aider à éteindre le feu",
        statDelta: {
          physicalStats: { endurance: -2 },
          prestige: { reputation: 2, honor: 2 },
        },
        historyText:
          'Vous combattez les flammes toute la nuit. Votre courage sauve plusieurs familles.',
      },
      {
        label: 'Sauver une famille piégée',
        statDelta: {
          physicalStats: { strength: 1, endurance: -3 },
          prestige: { honor: 2, glory: 2 },
        },
        historyText:
          'Vous plongez dans la fumée pour secourir une famille entière. Vous en sortez brûlé mais vivant, et héroïque.',
      },
      {
        label: 'Protéger vos propres biens',
        historyText:
          'Vous concentrez vos efforts pour sauver vos affaires. Vous ne perdez rien, mais la honte vous ronge.',
      },
    ],
  },

  {
    id: 'annual_noble_visit',
    type: 'annual',
    title: 'Une visite de la noblesse',
    description:
      "Un haut seigneur visite la région avec sa suite. Toute la population se mobilise pour l'accueillir dignement.",
    outcomes: [
      {
        label: 'Se présenter dignement',
        statDelta: { prestige: { reputation: 1 } },
        ensureNpc: { role: 'noble', profession: 'le noble', scoreDelta: 6 },
        historyText:
          'Le noble remarque votre maintien et demande votre nom. Un contact précieux.',
      },
      {
        label: 'Offrir un présent rare',
        goldDelta: -20,
        statDelta: { prestige: { reputation: 2, glory: 1 } },
        ensureNpc: { role: 'noble', profession: 'le noble', scoreDelta: 12 },
        historyText:
          "Votre cadeau impressionne le seigneur. Il s'en souviendra.",
      },
      {
        label: "Éviter l'événement",
        historyText: "Vous vous faites discret. L'occasion passe sans vous.",
      },
    ],
  },

  {
    id: 'annual_war_declared',
    type: 'annual',
    title: 'La guerre est déclarée',
    description:
      'Le roi a déclaré la guerre au royaume voisin. Levée en masse dans tout le pays. Des messagers royaux sillonnent les routes.',
    conditions: { minAge: 16 },
    outcomes: [
      {
        label: 'Répondre à la levée',
        statDelta: {
          prestige: { glory: 2, honor: 1 },
          combatSkills: { longSword: 1 },
        },
        historyText:
          "Vous rejoignez l'armée royale. La campagne sera longue et éprouvante.",
      },
      {
        label: 'Payer pour un remplaçant',
        goldDelta: -25,
        statDelta: { prestige: { honor: -2 } },
        historyText:
          "Vous payez un homme pour vous remplacer. C'est légal, mais peu valorisant.",
      },
      {
        label: 'Se soustraire à la levée',
        statDelta: { prestige: { honor: -10, reputation: -5 } },
        historyText:
          'Vous vous cachez. Si vous êtes découvert, les conséquences seront graves.',
      },
    ],
  },

  {
    id: 'annual_famine',
    type: 'annual',
    title: 'La grande famine',
    description:
      "La famine frappe durement après des mois de pénurie. Les gens meurent dans les rues. L'air sent la mort.",
    outcomes: [
      {
        label: 'Ouvrir sa table aux affamés',
        goldDelta: -20,
        statDelta: { prestige: { honor: 2, reputation: 2 } },
        historyText:
          'Votre générosité en ces temps sombres ne sera jamais oubliée.',
      },
      {
        label: 'Survivre avec ses propres réserves',
        goldDelta: -15,
        historyText:
          'Vous parvenez à traverser la famine avec vos provisions. Rien de glorieux, mais vous survivez.',
      },
      {
        label: 'Acheter les terres des désespérés',
        goldDelta: 30,
        statDelta: { prestige: { honor: -12, reputation: -5 } },
        historyText:
          'Vous profitez de la misère pour vous enrichir. Les gens ne vous pardonneront pas.',
      },
    ],
  },

  {
    id: 'annual_flood',
    type: 'annual',
    title: 'Les crues du printemps',
    description:
      'Les rivières ont débordé, inondant les terres agricoles et certains quartiers du bourg.',
    outcomes: [
      {
        label: 'Aider les réfugiés',
        statDelta: { prestige: { reputation: 1, honor: 2 } },
        historyText:
          'Vous accueillez des familles déplacées. La communauté vous estime davantage.',
      },
      {
        label: 'Protéger ses propres biens',
        goldDelta: -10,
        historyText:
          'Vous investissez dans des protections pour votre logis. Les dégâts sont limités.',
      },
    ],
  },

  {
    id: 'annual_new_bishop',
    type: 'annual',
    title: "L'arrivée d'un nouvel évêque",
    description:
      'Un nouvel évêque prend ses fonctions dans la région. Les rumeurs le décrivent comme un homme de grande piété — et de grande ambition.',
    outcomes: [
      {
        label: 'Lui rendre hommage',
        statDelta: {
          knowledgeSkills: { religion: 1 },
          prestige: { reputation: 1 },
        },
        historyText:
          "L'évêque vous reçoit brièvement. Un contact utile au sein du clergé.",
      },
      {
        label: "Faire un don généreux à l'Église",
        goldDelta: -15,
        statDelta: { prestige: { honor: 1, reputation: 2 } },
        historyText:
          "L'évêque mentionne votre nom en chaire. Votre réputation de chrétien pieux grandit.",
      },
      {
        label: "Ignorer l'événement",
        historyText: 'Vous vaquez à vos occupations.',
      },
    ],
  },

  {
    id: 'annual_traveling_fair',
    type: 'annual',
    title: 'La grande foire',
    description:
      "Une foire extraordinaire s'installe pour une semaine. Acrobates, marchands exotiques, bêtes sauvages et jongleurs envahissent la ville.",
    outcomes: [
      {
        label: 'Profiter des spectacles',
        goldDelta: -5,
        statDelta: { knowledgeSkills: { generalCulture: 2 } },
        historyText:
          "Une semaine d'émerveillement. Vous en revenez avec une vision plus large du monde.",
      },
      {
        label: 'Chercher des opportunités commerciales',
        goldDelta: 10,
        statDelta: { knowledgeSkills: { eloquence: 1 } },
        historyText:
          'Vous achetez et revendez quelques denrées rares. Un profit honnête.',
      },
      {
        label: 'Ignorer la foire',
        historyText: 'Vous restez à vos tâches.',
      },
    ],
  },

  {
    id: 'annual_knight_seeks_squire',
    type: 'annual',
    title: 'Un chevalier cherche un écuyer',
    description:
      'Un chevalier chevronné cherche un écuyer prometteur à emmener en campagne. Il vous a remarqué.',
    conditions: {
      minAge: 14,
      maxAge: 20,
      minSkill: { skill: 'combatSkills.longSword', value: 20 },
    },
    outcomes: [
      {
        label: 'Accepter la proposition',
        statDelta: {
          combatSkills: { longSword: 3, lance: 2 },
          ridingSkills: { horsemanship: 2 },
          prestige: { glory: 2 },
        },
        historyText:
          'Vous partez aux côtés du chevalier. Une école de chevalerie à ciel ouvert commence.',
      },
      {
        label: 'Refuser poliment',
        historyText: 'Vous déclinez. Le chevalier part sans vous, légèrement déçu.',
      },
    ],
  },

  {
    id: 'annual_merchant_guild',
    type: 'annual',
    title: "La guilde des marchands s'établit",
    description:
      "Une guilde de marchands s'installe dans la région. Ils cherchent des membres fiables et des associés potentiels.",
    conditions: {
      minAge: 16,
      minSkill: { skill: 'knowledgeSkills.eloquence', value: 20 },
    },
    outcomes: [
      {
        label: 'Rejoindre la guilde',
        goldDelta: -10,
        statDelta: {
          knowledgeSkills: { eloquence: 2 },
          prestige: { reputation: 2 },
        },
        historyText:
          "Vous payez la cotisation et rejoignez la guilde. De nouveaux horizons commerciaux s'ouvrent.",
      },
      {
        label: 'Proposer un partenariat limité',
        goldDelta: 5,
        historyText:
          'Vous négociez un accord ponctuel. Quelques profits supplémentaires sans engagement.',
      },
      {
        label: 'Décliner',
        historyText: "Vous refusez l'invitation.",
      },
    ],
  },

  {
    id: 'annual_tax_collector',
    type: 'annual',
    title: "Le collecteur d'impôts",
    description:
      'Le collecteur royal est en ville, réclamant les taxes annuelles. Son regard est froid et son carnet, précis.',
    outcomes: [
      {
        label: 'Payer ses taxes honnêtement',
        goldDelta: -20,
        statDelta: { prestige: { honor: 1 } },
        historyText: 'Vous payez sans rechigner. Vos comptes sont clairs.',
      },
      {
        label: 'Négocier une réduction',
        goldDelta: -10,
        statDelta: { knowledgeSkills: { eloquence: 1 } },
        historyText:
          "Grâce à votre persuasion, vous convainquez le collecteur d'un arrangement. Un succès diplomatique.",
      },
      {
        label: 'Dissimuler des revenus',
        goldDelta: -5,
        statDelta: { prestige: { honor: -8, reputation: -3 } },
        historyText:
          'Vous dissimulez une partie de vos revenus. Le collecteur a peut-être remarqué quelque chose.',
      },
    ],
  },

  {
    id: 'annual_miracle',
    type: 'annual',
    title: 'Un miracle au sanctuaire local',
    description:
      "On rapporte qu'une statue de la Vierge a pleuré du sang. Des pèlerins affluent de toute la région. L'atmosphère est chargée d'émotion.",
    outcomes: [
      {
        label: 'Se recueillir au sanctuaire',
        statDelta: {
          knowledgeSkills: { religion: 2 },
          prestige: { honor: 1 },
        },
        historyText: 'Vous priez longuement. Une paix intérieure vous envahit.',
      },
      {
        label: "Profiter de l'afflux de pèlerins",
        goldDelta: 15,
        statDelta: { prestige: { honor: -2 } },
        historyText:
          'Vous vendez nourriture et logement aux pèlerins. Commerce florissant, foi douteuse.',
      },
      {
        label: 'Ignorer le phénomène',
        historyText:
          'Vous ne croyez pas aux miracles, ou du moins, vous gardez cela pour vous.',
      },
    ],
  },

  {
    id: 'annual_comet',
    type: 'annual',
    title: 'Une comète dans le ciel',
    description:
      'Une comète brillante traverse le ciel nocturne pendant plusieurs semaines. Les astrologues et clercs débattent de son présage.',
    outcomes: [
      {
        label: 'Méditer sur les signes célestes',
        statDelta: { knowledgeSkills: { religion: 1, generalCulture: 1 } },
        historyText:
          "Vous observez la comète chaque nuit et lisez les textes anciens qui l'évoquent.",
      },
      {
        label: 'Ignorer les superstitions',
        statDelta: { knowledgeSkills: { generalCulture: 1 } },
        historyText:
          'Vous observez la beauté du phénomène sans vous perdre en interprétations.',
      },
    ],
  },

  {
    id: 'annual_royal_edict',
    type: 'annual',
    title: 'Un édit royal',
    description:
      "Un édit royal change les règles concernant le commerce et les taxes dans la région. Certains y gagnent, d'autres y perdent.",
    outcomes: [
      {
        label: "S'adapter rapidement",
        goldDelta: 5,
        statDelta: { knowledgeSkills: { eloquence: 1 } },
        historyText: 'Vous ajustez vos activités. Le changement vous est favorable.',
      },
      {
        label: 'Protester auprès du seigneur local',
        statDelta: { prestige: { reputation: 1 } },
        historyText:
          'Vous exprimez votre mécontentement. Cela ne change rien, mais vous êtes entendu.',
      },
      {
        label: 'Subir les changements',
        goldDelta: -10,
        historyText: "L'édit vous coûte. Vous vous adaptez en grommelant.",
      },
    ],
  },

  {
    id: 'annual_old_enemy',
    type: 'annual',
    title: 'Un vieux fantôme réapparaît',
    description:
      "Un individu que vous avez offensé autrefois — ou qui pense l'avoir été — est revenu dans la région. Il n'a pas oublié.",
    conditions: { minAge: 18 },
    outcomes: [
      {
        label: 'Lui faire face franchement',
        statDelta: { prestige: { honor: 2 } },
        historyText:
          'Vous lui faites face sans détour. La confrontation est tendue, mais les choses sont réglées.',
      },
      {
        label: 'Chercher une réconciliation',
        statDelta: { prestige: { reputation: 1, honor: 1 } },
        historyText:
          "Vous faites le premier pas. L'homme est surpris mais finit par tendre la main.",
      },
      {
        label: "L'éviter",
        statDelta: { prestige: { reputation: -2 } },
        historyText:
          "Vous vous esquivez. Mais les gens remarquent. Il reviendra sûrement.",
      },
    ],
  },

  // ── DILEMMES ANNUELS (uniques, conséquences durables) ───────────────────────

  {
    id: 'dilemma_faith',
    type: 'annual',
    title: "L'ultimatum du prêtre",
    description:
      "Le prêtre vous prend à part, le regard dur : « On murmure que vous fréquentez le sanctuaire païen. Renoncez aux anciens dieux devant la paroisse — ou l'Église vous fermera ses portes à jamais. »",
    conditions: { minTempleVisits: 2, forbiddenFlag: 'dilemma_faith_done' },
    outcomes: [
      {
        label: 'Renoncer aux anciens dieux',
        statDelta: { prestige: { honor: 2, reputation: 3 } },
        relationDelta: { relationType: 'priest', amount: 15 },
        setFlags: ['dilemma_faith_done', 'renounced_old_gods'],
        historyText:
          "Vous abjurez publiquement. L'Église vous ouvre les bras — le sanctuaire vous est désormais interdit.",
      },
      {
        label: 'Rester fidèle aux anciens cultes',
        statDelta: { knowledgeSkills: { apocryphal: 4 } },
        relationDelta: { relationType: 'priest', amount: -25 },
        setFlags: ['dilemma_faith_done', 'pagan_path'],
        historyText:
          "Vous refusez d'abjurer. Le prêtre vous excommunie sur-le-champ : l'église vous est fermée, mais les anciens dieux vous reconnaissent.",
      },
    ],
  },
  {
    id: 'dilemma_lord_oath',
    type: 'annual',
    title: 'Le serment du seigneur',
    description:
      "Le seigneur local vous convoque à son manoir : « J'ai besoin d'hommes sûrs. Jure-moi fidélité, et tu mangeras à ma table. Refuse, et reste un sans-maître. »",
    conditions: { minAge: 17, minReputation: 10, forbiddenFlag: 'dilemma_lord_done' },
    outcomes: [
      {
        label: 'Jurer fidélité',
        statDelta: { prestige: { reputation: 5, honor: 3 } },
        ensureNpc: { role: 'noble', profession: 'le seigneur', scoreDelta: 15 },
        setFlags: ['dilemma_lord_done', 'sworn_to_lord'],
        historyText:
          'Un genou à terre, vous prêtez serment. Vous êtes désormais homme lige du seigneur.',
      },
      {
        label: 'Garder votre liberté',
        statDelta: { prestige: { glory: 2 } },
        ensureNpc: { role: 'noble', profession: 'le seigneur', scoreDelta: -8 },
        setFlags: ['dilemma_lord_done', 'free_blade'],
        historyText:
          "Vous déclinez avec respect. Le seigneur plisse les yeux — les lames libres ne font pas de vieux os, dit-on.",
      },
    ],
  },

  // ── LA GRANDE FAMINE DE 1315 (priorité historique) ──────────────────────────

  {
    id: 'famine_1315',
    type: 'annual',
    priority: true,
    title: 'La Grande Famine',
    description:
      "L'an 1315 restera maudit : des pluies sans fin ont pourri les récoltes dans toute l'Europe. Le grain vaut de l'or, et la faim s'installe au village.",
    conditions: { minYear: 1315, maxYear: 1315, forbiddenFlag: 'famine_1315_done' },
    outcomes: [
      {
        label: 'Acheter du grain à prix d\'or (40 or)',
        goldDelta: -40,
        setFlags: ['famine_1315_done'],
        historyText:
          'Votre bourse fond, mais votre table reste garnie pendant que d\'autres maigrissent.',
      },
      {
        label: 'Se serrer la ceinture',
        healthDamage: 20,
        statDelta: { physicalStats: { strength: -2, endurance: -2 } },
        setFlags: ['famine_1315_done'],
        historyText:
          "L'hiver est long et le ventre vide. Vous survivez, amaigri et affaibli.",
      },
      {
        label: 'Piller le grenier seigneurial',
        goldDelta: 10,
        statDelta: { prestige: { honor: -8, reputation: -6 } },
        setFlags: ['famine_1315_done', 'granary_thief'],
        healthDamage: 5,
        historyText:
          'Vous mangez à votre faim — avec le pain volé des affamés. On chuchote votre nom.',
      },
    ],
  },
  {
    id: 'famine_1316',
    type: 'annual',
    priority: true,
    title: 'La famine persiste',
    description:
      "1316 n'apporte aucun répit : les semailles ont encore pourri. Les routes se couvrent de mendiants et l'on enterre les faibles.",
    conditions: { minYear: 1316, maxYear: 1316, forbiddenFlag: 'famine_1316_done' },
    outcomes: [
      {
        label: 'Partager vos réserves avec le village (20 or)',
        goldDelta: -20,
        statDelta: { prestige: { honor: 5, reputation: 5 } },
        setFlags: ['famine_1316_done'],
        historyText:
          'Votre générosité dans la disette ne sera pas oubliée de sitôt.',
      },
      {
        label: 'Ne penser qu\'aux vôtres',
        healthDamage: 10,
        setFlags: ['famine_1316_done'],
        historyText:
          'Chacun pour soi en ces temps maudits. Votre famille survit, votre corps s\'use.',
      },
    ],
  },
  {
    id: 'famine_1317',
    type: 'annual',
    priority: true,
    title: 'Le pic de la faim',
    description:
      "Troisième année de disette. Au printemps 1317, la mort fauche large : on dit qu'un homme sur dix a péri entre la Flandre et le Rhin. Les granges sont vides, les cimetières pleins.",
    conditions: { minYear: 1317, maxYear: 1317, forbiddenFlag: 'famine_1317_done' },
    outcomes: [
      {
        label: 'Vendre un bien pour manger',
        goldDelta: -30,
        setFlags: ['famine_1317_done'],
        historyText: 'Vous bradez ce que vous pouvez. Survivre n\'a pas de prix.',
      },
      {
        label: 'Chasser et glaner sans relâche',
        healthDamage: 12,
        statDelta: { physicalStats: { endurance: 2 }, combatSkills: { archery: 1 } },
        setFlags: ['famine_1317_done'],
        historyText: 'Racines, gibier maigre, pain d\'écorce : vous tenez, épuisé mais vivant.',
      },
    ],
  },

  // ── CHRONIQUES HISTORIQUES (Flandre, Liège, nord du royaume) ────────────────

  {
    id: 'hist_1313_liege',
    type: 'annual',
    priority: true,
    title: 'Les cendres de Liège',
    description:
      "Les colporteurs racontent le Mal Saint-Martin : à Liège, le petit peuple a enfermé des centaines de patriciens dans l'église Saint-Martin — et y a mis le feu. La cité du prince-évêque est à sang.",
    conditions: { minYear: 1312, maxYear: 1313, forbiddenFlag: 'hist_1313_done' },
    outcomes: [
      {
        label: 'Écouter les récits à la taverne',
        statDelta: { knowledgeSkills: { generalCulture: 2, strategy: 1 } },
        setFlags: ['hist_1313_done'],
        historyText: 'Les récits de Liège vous apprennent ce que vaut la colère du peuple.',
      },
      {
        label: 'Prier pour les âmes brûlées',
        statDelta: { knowledgeSkills: { religion: 2 }, prestige: { honor: 1 } },
        setFlags: ['hist_1313_done'],
        historyText: 'Vous faites dire une prière pour les morts de Saint-Martin.',
      },
    ],
  },
  {
    id: 'hist_1314_temple',
    type: 'annual',
    priority: true,
    title: 'La malédiction du Temple',
    description:
      "Nouvelles de Paris : Jacques de Molay, grand maître du Temple, est monté sur le bûcher en maudissant le roi et le pape. Et voilà qu'avant l'hiver, Philippe le Bel est mort à la chasse. Le royaume frissonne.",
    conditions: { minYear: 1314, maxYear: 1314, forbiddenFlag: 'hist_1314_done' },
    outcomes: [
      {
        label: 'Y voir un signe des anciens dieux',
        statDelta: { knowledgeSkills: { apocryphal: 3 } },
        setFlags: ['hist_1314_done'],
        historyText: 'La malédiction du Temple vous trouble : il est des puissances que l\'Église ignore.',
      },
      {
        label: 'Se signer et passer son chemin',
        statDelta: { knowledgeSkills: { religion: 2 } },
        setFlags: ['hist_1314_done'],
        historyText: 'Dieu seul juge les rois. Vous redoublez de piété.',
      },
      {
        label: 'Étudier la chute des puissants',
        statDelta: { knowledgeSkills: { strategy: 2, generalCulture: 1 } },
        setFlags: ['hist_1314_done'],
        historyText: 'Roi, pape, grand maître : nul n\'est intouchable. Leçon retenue.',
      },
    ],
  },
  {
    id: 'hist_1316_kings',
    type: 'annual',
    priority: true,
    title: 'Deux rois en un an',
    description:
      "Le royaume vacille : Louis le Hutin est mort en juin, et son fils posthume, le petit roi Jean, n'a vécu que cinq jours en novembre. Deux rois portés en terre la même année — les mauvais présages s'accumulent.",
    conditions: { minYear: 1316, maxYear: 1317, forbiddenFlag: 'hist_1316_done' },
    outcomes: [
      {
        label: 'Craindre pour le royaume',
        statDelta: { knowledgeSkills: { generalCulture: 2 } },
        setFlags: ['hist_1316_done'],
        historyText: 'Un trône sans héritier, une famine sans fin : sale époque pour le royaume.',
      },
      {
        label: 'Y flairer des opportunités',
        statDelta: { knowledgeSkills: { strategy: 2, eloquence: 1 } },
        setFlags: ['hist_1316_done'],
        historyText: 'Quand les grands se déchirent, les petits peuvent monter. Vous ouvrez l\'œil.',
      },
    ],
  },
  {
    id: 'hist_1320_pastoureaux',
    type: 'annual',
    priority: true,
    title: 'Les Pastoureaux',
    description:
      "Une croisade de gueux déferle du nord : bergers et va-nu-pieds par milliers, pillant celliers et bourgs sur leur passage. Leur colonne approche de la région.",
    conditions: { minYear: 1320, maxYear: 1320, forbiddenFlag: 'hist_1320_done' },
    outcomes: [
      {
        label: 'Défendre le village',
        healthDamage: 10,
        statDelta: { prestige: { reputation: 4, glory: 2 }, combatSkills: { swordAndShield: 1 } },
        setFlags: ['hist_1320_done'],
        historyText: 'Vous tenez la barricade avec les hommes du village. Les Pastoureaux passent au large.',
      },
      {
        label: 'Cacher vivres et famille',
        goldDelta: -10,
        setFlags: ['hist_1320_done'],
        historyText: 'Vous enterrez vos biens et attendez que la horde passe. Elle pille ce qui traîne.',
      },
    ],
  },
  {
    id: 'hist_1321_lepers',
    type: 'annual',
    priority: true,
    title: 'La rumeur des lépreux',
    description:
      "Une rumeur folle embrase le pays : les lépreux auraient empoisonné puits et fontaines. Partout, des léproseries brûlent et des innocents périssent.",
    conditions: { minYear: 1321, maxYear: 1321, forbiddenFlag: 'hist_1321_done' },
    outcomes: [
      {
        label: 'Défendre les innocents',
        statDelta: { prestige: { honor: 5, reputation: -3 } },
        setFlags: ['hist_1321_done'],
        historyText: 'Vous vous dressez contre la foule. On vous traite d\'ami des pestiférés — mais des vies sont sauves.',
      },
      {
        label: 'Hurler avec les loups',
        statDelta: { prestige: { honor: -5, reputation: 2 } },
        setFlags: ['hist_1321_done'],
        historyText: 'Vous suivez la foule vengeresse. Plus tard, la honte vous mordra.',
      },
      {
        label: 'Ne pas s\'en mêler',
        setFlags: ['hist_1321_done'],
        historyText: 'Vous fermez votre porte à la folie du monde.',
      },
    ],
  },
  {
    id: 'hist_1323_flanders',
    type: 'annual',
    priority: true,
    title: 'La Flandre se soulève',
    description:
      "Des nouvelles du nord : les paysans de Flandre maritime ont pris les armes contre comte et dîmes. La révolte gagne bourg après bourg — la guerre couve aux portes de la région.",
    conditions: { minYear: 1323, maxYear: 1328, forbiddenFlag: 'hist_1323_done' },
    outcomes: [
      {
        label: 'Vendre vivres et matériel aux deux camps',
        goldDelta: 30,
        statDelta: { prestige: { honor: -3 } },
        setFlags: ['hist_1323_done'],
        historyText: 'La guerre des autres fait votre beurre. Peu glorieux, fort lucratif.',
      },
      {
        label: 'Soutenir les insurgés',
        statDelta: { prestige: { honor: 2, reputation: -4 }, knowledgeSkills: { strategy: 2 } },
        setFlags: ['hist_1323_done'],
        historyText: 'Votre cœur penche pour les karls de Flandre. Les autorités vous regardent de travers.',
      },
      {
        label: 'Rester loin des troubles',
        setFlags: ['hist_1323_done'],
        historyText: 'La Flandre brûle ; vous gardez la tête baissée.',
      },
    ],
  },
];
