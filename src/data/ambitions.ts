import type { Player } from '../types/game';

export interface AmbitionObjective {
  label: string;
  done: (p: Player) => boolean;
}

export interface Ambition {
  id: string;
  label: string;
  flavor: string;
  objectives: AmbitionObjective[];
}

const owns = (p: Player, subtype: string) => p.inventory.some((i) => i.subtype === subtype);
const ownsCategory = (p: Player, cat: string) => p.inventory.some((i) => i.category === cat);

export const AMBITIONS: Ambition[] = [
  {
    id: 'knight',
    label: 'Devenir chevalier',
    flavor: "Être adoubé et reconnu comme un noble chevalier d'honneur.",
    objectives: [
      { label: 'Honneur ≥ 40', done: (p) => p.prestige.honor >= 40 },
      { label: 'Réputation ≥ 40', done: (p) => p.prestige.reputation >= 40 },
      { label: 'Posséder un cheval', done: (p) => owns(p, 'horse') },
      { label: 'Posséder une arme', done: (p) => ownsCategory(p, 'weapon') },
      { label: 'Posséder une armure', done: (p) => ownsCategory(p, 'armor') },
      {
        label: "Les faveurs d'un noble (relation ≥ 50)",
        done: (p) => p.relations.some((r) => r.npcRole === 'noble' && r.score >= 50),
      },
      { label: 'Remporter un tournoi', done: (p) => p.tournamentRecord.wins >= 1 },
    ],
  },
  {
    id: 'champion',
    label: "Champion d'Europe",
    flavor: 'Que votre nom soit scandé dans toutes les lices du continent.',
    objectives: [
      { label: 'Gloire ≥ 80', done: (p) => p.prestige.glory >= 80 },
      { label: '5 victoires en tournoi', done: (p) => p.tournamentRecord.wins >= 5 },
      { label: 'Posséder une armure complète', done: (p) => owns(p, 'full_plate') },
      { label: 'Décrocher un titre', done: (p) => p.tournamentRecord.titles.length >= 1 },
    ],
  },
  {
    id: 'lord',
    label: 'Devenir seigneur',
    flavor: 'Amasser terres, or et hommes liges sous votre bannière.',
    objectives: [
      { label: 'Or ≥ 500', done: (p) => p.gold >= 500 },
      { label: 'Réputation ≥ 60', done: (p) => p.prestige.reputation >= 60 },
      { label: '10 partisans', done: (p) => p.followers >= 10 },
      { label: 'Honneur ≥ 30', done: (p) => p.prestige.honor >= 30 },
    ],
  },
  {
    id: 'scholar',
    label: 'Sage érudit',
    flavor: 'Maîtriser le savoir, des lettres anciennes à la médecine.',
    objectives: [
      { label: 'Littérature ≥ 60', done: (p) => p.knowledgeSkills.literature >= 60 },
      { label: 'Culture générale ≥ 60', done: (p) => p.knowledgeSkills.generalCulture >= 60 },
      { label: 'Médecine ≥ 40', done: (p) => p.knowledgeSkills.medicine >= 40 },
      { label: 'Lire 4 livres', done: (p) => (p.readBooks ?? []).length >= 4 },
    ],
  },
  {
    id: 'outlaw',
    label: 'Légende hors-la-loi',
    flavor: 'Régner par la peur et le butin, loin de toute loi.',
    objectives: [
      { label: 'Honneur ≤ −40', done: (p) => p.prestige.honor <= -40 },
      { label: 'Or ≥ 300', done: (p) => p.gold >= 300 },
      { label: 'Gloire ≥ 40', done: (p) => p.prestige.glory >= 40 },
      { label: 'Réputation ≤ −20', done: (p) => p.prestige.reputation <= -20 },
    ],
  },
];

export function ambitionById(id: string): Ambition {
  return AMBITIONS.find((a) => a.id === id) ?? AMBITIONS[0];
}

export function ambitionProgress(p: Player): { done: number; total: number; fulfilled: boolean } {
  const amb = ambitionById(p.ambition);
  const done = amb.objectives.filter((o) => o.done(p)).length;
  return { done, total: amb.objectives.length, fulfilled: done === amb.objectives.length };
}
