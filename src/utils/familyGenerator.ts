import { v4 as uuidv4 } from 'uuid';
import type { Relation } from '../types/game';

const MALE_NAMES: readonly string[] = [
  'Aldric', 'Baldwin', 'Bertrand', 'Clovis', 'Conrad',
  'Dagobert', 'Edmund', 'Everard', 'Fulk', 'Gautier',
  'Gerard', 'Gilbert', 'Godfrey', 'Guichard', 'Henri',
  'Hugh', 'Lambert', 'Landric', 'Lothaire', 'Luc',
  'Mathieu', 'Miles', 'Nicolas', 'Ogier', 'Olivier',
  'Ranulf', 'Raoul', 'Raymond', 'Renaud', 'Robert',
];

const FEMALE_NAMES: readonly string[] = [
  'Adèle', 'Agnes', 'Alienor', 'Alix', 'Aveline',
  'Beatrice', 'Berthe', 'Blanche', 'Cecile', 'Clemence',
  'Constance', 'Edith', 'Emmeline', 'Ermentrude', 'Gisele',
  'Hildegard', 'Ida', 'Isabelle', 'Jacqueline', 'Jeanne',
  'Jourdaine', 'Judith', 'Leonor', 'Mahaut', 'Marguerite',
  'Matilde', 'Pernelle', 'Petronille', 'Rohais', 'Ysabel',
];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const pickMaleName = (): string => pickRandom(MALE_NAMES);
export const pickFemaleName = (): string => pickRandom(FEMALE_NAMES);

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Weighted sibling count: heavily biased toward 0–2, max 8.
 * Weights: 0→20, 1→22, 2→20, 3→15, 4→10, 5→7, 6→4, 7→1, 8→1
 */
function rollSiblingCount(): number {
  const weights = [20, 22, 20, 15, 10, 7, 4, 1, 1];
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll < 0) return i;
  }
  return 0;
}

export function generateFamily(playerAge: number): Relation[] {
  const relations: Relation[] = [];

  // Father: 35–55 at time of player's birth → add playerAge to get current age
  const fatherBirthAge = randomInt(35, 55);
  const fatherCurrentAge = fatherBirthAge + playerAge;

  relations.push({
    personId: uuidv4(),
    name: pickRandom(MALE_NAMES),
    age: fatherCurrentAge,
    type: 'father',
    score: randomInt(20, 60),
    religion: 'christian',
  });

  // Mother: 30–50 at time of birth
  const motherBirthAge = randomInt(30, 50);
  const motherCurrentAge = motherBirthAge + playerAge;

  relations.push({
    personId: uuidv4(),
    name: pickRandom(FEMALE_NAMES),
    age: motherCurrentAge,
    type: 'mother',
    score: randomInt(30, 70),
    religion: 'christian',
  });

  // Parish priest: 40–70 current age
  relations.push({
    personId: uuidv4(),
    name: pickRandom(MALE_NAMES),
    age: randomInt(40, 70),
    type: 'priest',
    score: randomInt(10, 50),
    religion: 'christian',
  });

  // Siblings: 0–8, weighted toward 0–2
  const siblingCount = rollSiblingCount();
  for (let i = 0; i < siblingCount; i++) {
    const isMale = Math.random() < 0.5;
    // Sibling age: anywhere from playerAge-12 to playerAge+12, but at least 1
    const ageDiff = randomInt(-12, 12);
    const siblingAge = Math.max(1, playerAge + ageDiff);

    relations.push({
      personId: uuidv4(),
      name: pickRandom(isMale ? MALE_NAMES : FEMALE_NAMES),
      age: siblingAge,
      type: 'sibling',
      score: randomInt(0, 60),
      religion: 'christian',
    });
  }

  return relations;
}
