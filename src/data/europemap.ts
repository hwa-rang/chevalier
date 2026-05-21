import type { MapTile, PointOfInterest } from '../components/PixelMap';
import { TOURNAMENTS } from './tournaments';
import type { TournamentType } from './tournaments';

// ─── Terrain generation ───────────────────────────────────────────────────────

const ROWS = 60;
const COLS = 80;

function generateEuropeMap(): MapTile[][] {
  // Sea background
  const grid: MapTile[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill('sea' as MapTile),
  );

  const fill = (r1: number, r2: number, c1: number, c2: number, tile: MapTile = 'land') => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) grid[r][c] = tile;
      }
    }
  };

  // ── Iberian Peninsula ─────────────────────────────────────────────────────
  fill(30, 55, 5, 25);
  // Round corners for peninsula shape
  fill(30, 31, 5,  6, 'sea'); // top-left notch
  fill(30, 30, 5, 18, 'sea'); // open north coast (Pyrenees gap)
  fill(53, 55, 5,  6, 'sea'); // bottom-left taper
  fill(54, 55, 5, 10, 'sea');
  fill(53, 55, 23, 25, 'sea'); // bottom-right taper

  // ── France ────────────────────────────────────────────────────────────────
  fill(15, 40, 20, 38);
  // Brittany peninsula sticking west
  fill(18, 24, 17, 21);
  // Round top-left (coast trim)
  fill(15, 16, 20, 21, 'sea');

  // ── British Isles ─────────────────────────────────────────────────────────
  // Great Britain (England, Wales, Scotland)
  fill(5, 18, 9, 19);
  // Scotland narrows northward
  fill(5,  9, 9, 14);
  fill(5,  7, 9, 11);
  // Southwest peninsula (Cornwall) trim
  fill(16, 18, 9, 11, 'sea');
  // Ireland
  fill(7, 16, 5, 11);
  // English Channel — leave sea rows 17-20, cols 9-19 between England bottom & France top
  fill(17, 19, 9, 19, 'sea');

  // ── Holy Roman Empire (Germany, Austria, Bohemia) ────────────────────────
  fill(10, 38, 35, 58);
  // Trim Baltic coast
  fill(10, 11, 35, 40, 'sea');

  // ── Denmark peninsula ─────────────────────────────────────────────────────
  fill(12, 20, 36, 43);

  // ── Scandinavia ───────────────────────────────────────────────────────────
  fill(2, 15, 42, 65);
  // Taper southern end to connect to Denmark
  fill(14, 15, 42, 44);
  // Norway/Sweden shape: taper south-west
  fill(2,  6, 58, 65, 'sea'); // northeast sea trim

  // ── Poland / Eastern Europe ───────────────────────────────────────────────
  fill(10, 35, 55, 76);
  fill(10, 13, 66, 76, 'sea'); // Baltic trim north-east

  // ── Italy (boot shape) ────────────────────────────────────────────────────
  // Northern Italy (Po Valley) — wide
  fill(35, 40, 35, 48);
  // Main peninsula (Apennine spine)
  fill(40, 46, 36, 43);
  // Lower leg, narrowing
  fill(46, 53, 37, 42);
  // Ankle (Calabria)
  fill(53, 57, 37, 41);
  // Toe — extends east (Reggio/Messina area)
  fill(57, 59, 39, 46);
  // Heel spur (Puglia) — east-side bulge
  fill(49, 56, 42, 47);
  // Sicily
  fill(58, 59, 36, 42);
  // Adriatic — keep sea east of peninsula: explicitly clear cols 48-54 in rows 42-56
  fill(42, 56, 48, 54, 'sea');

  // ── Pyrenees mountains ────────────────────────────────────────────────────
  for (let r = 28; r <= 32; r++) {
    for (let c = 18; c <= 28; c++) {
      if (grid[r][c] !== 'sea') grid[r][c] = 'mountain';
    }
  }

  // ── Alps mountains ────────────────────────────────────────────────────────
  for (let r = 28; r <= 34; r++) {
    for (let c = 32; c <= 46; c++) {
      if (grid[r][c] !== 'sea') grid[r][c] = 'mountain';
    }
  }

  // ── Forest clusters (3×3 patches on land) ────────────────────────────────
  const patches: [number, number][] = [
    [11,  8],  // Scotland
    [21, 26],  // Normandy
    [32, 22],  // Central France
    [36, 14],  // Bordeaux region
    [44, 25],  // Spain interior
    [62, 18],  // Poland
    [55, 14],  // Gdansk area
    [40, 37],  // Bavaria
  ];
  for (const [c, r] of patches) {
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const row = r + dr;
        const col = c + dc;
        if (row < ROWS && col < COLS && grid[row][col] === 'land') {
          grid[row][col] = 'forest';
        }
      }
    }
  }

  return grid;
}

export const EUROPE_MAP: MapTile[][] = generateEuropeMap();

// ─── Tournament POI colors & icons ────────────────────────────────────────────

export const TOURNAMENT_TYPE_COLORS: Record<TournamentType, string> = {
  melee:     '#E05C2A',
  joust:     '#4A90D9',
  swordDuel: '#708090',
  archery:   '#6AB04C',
  chess:     '#9B59B6',
  poetry:    '#E9C46A',
};

export const TOURNAMENT_TYPE_ICONS: Record<TournamentType, string> = {
  melee:     '⚔',
  joust:     '🏇',
  swordDuel: '🗡',
  archery:   '🏹',
  chess:     '♟',
  poetry:    '📜',
};

export const TOURNAMENT_TYPE_LABELS: Record<TournamentType, string> = {
  melee:     'Mêlée',
  joust:     'Joûte',
  swordDuel: "Duel à l'épée",
  archery:   "Tir à l'arc",
  chess:     'Échecs',
  poetry:    'Poésie',
};

// ─── Geographic positions for each tournament ─────────────────────────────────
// col = tile column (x), row = tile row (y) on the 80×60 grid

const POSITIONS: Record<string, { col: number; row: number }> = {
  // France
  troyes_melee:    { col: 27, row: 26 },
  rouen_archery:   { col: 22, row: 20 },
  lyon_joust:      { col: 25, row: 33 },
  bordeaux_duel:   { col: 21, row: 37 },
  reims_melee:     { col: 28, row: 22 },
  paris_joust:     { col: 24, row: 26 },
  // England
  canterbury_chess: { col: 17, row: 15 },
  york_melee:      { col: 14, row: 10 },
  london_joust:    { col: 14, row: 14 },
  // Spain
  seville_poetry:  { col: 10, row: 51 },
  toledo_duel:     { col: 13, row: 44 },
  barcelona_joust: { col: 22, row: 42 },
  // Italy
  venice_poetry:   { col: 43, row: 38 },
  milan_melee:     { col: 38, row: 37 },
  florence_chess:  { col: 40, row: 44 },
  // Holy Roman Empire
  cologne_joust:   { col: 36, row: 22 },
  vienna_melee:    { col: 47, row: 27 },
  prague_duel:     { col: 42, row: 22 },
  // Poland
  krakow_archery:  { col: 58, row: 23 },
  gdansk_melee:    { col: 56, row: 16 },
};

// ─── Build POI list from TOURNAMENTS ─────────────────────────────────────────

export function buildEuropePois(playerGlory: number): PointOfInterest[] {
  return TOURNAMENTS.map((t) => {
    const pos = POSITIONS[t.id] ?? { col: 30, row: 30 };
    return {
      id: t.id,
      label: t.city,
      x: pos.col,
      y: pos.row,
      icon: TOURNAMENT_TYPE_ICONS[t.type],
      color: TOURNAMENT_TYPE_COLORS[t.type],
      locked: playerGlory < t.minGlory,
    };
  });
}
