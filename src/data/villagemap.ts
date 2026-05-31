import type { MapTile, PointOfInterest } from '../components/PixelMap';

// ─── Terrain generation ───────────────────────────────────────────────────────

const ROWS = 48;
const COLS = 48;

function generateVillageMap(): MapTile[][] {
  const grid: MapTile[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill('grass' as MapTile),
  );

  const set = (r: number, c: number, tile: MapTile) => {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) grid[r][c] = tile;
  };

  // ── Forest: top-left corner ─────────────────────────────────────────────────
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      set(r, c, 'forest');
    }
  }

  // ── Forest: bottom-right corner ─────────────────────────────────────────────
  for (let r = 35; r < ROWS; r++) {
    for (let c = 35; c < COLS; c++) {
      set(r, c, 'forest');
    }
  }

  // ── Fields: bottom-left quadrant (alternating 6×6 grass/dirt checkerboard) ──
  // rows 27–47, cols 0–13 (below road, left of vertical road)
  for (let r = 27; r < ROWS; r++) {
    for (let c = 0; c < 14; c++) {
      const blockR = Math.floor((r - 27) / 6);
      const blockC = Math.floor(c / 6);
      set(r, c, (blockR + blockC) % 2 === 0 ? 'grass' : 'dirt');
    }
  }

  // ── Horizontal dirt road: rows 22–25 ────────────────────────────────────────
  for (let r = 22; r <= 25; r++) {
    for (let c = 0; c < COLS; c++) {
      set(r, c, 'dirt');
    }
  }

  // ── Vertical dirt road: cols 14–17 ──────────────────────────────────────────
  for (let r = 0; r < ROWS; r++) {
    for (let c = 14; c <= 17; c++) {
      set(r, c, 'dirt');
    }
  }

  // ── Stone crossroads: intersection ──────────────────────────────────────────
  for (let r = 22; r <= 25; r++) {
    for (let c = 14; c <= 17; c++) {
      set(r, c, 'stone');
    }
  }

  // ── River: diagonal, top-right quadrant, 2–3 tiles wide ─────────────────────
  // Starts at (row 1, col 44) and flows diagonally down-left
  for (let i = 0; i < 20; i++) {
    const r = 1 + i;
    const c = 44 - Math.floor(i * 0.35);
    set(r, c,     'water');
    set(r, c - 1, 'water');
    if (i % 3 === 0) set(r, c + 1, 'water'); // occasional 3rd-tile width
  }

  return grid;
}

export const VILLAGE_MAP: MapTile[][] = generateVillageMap();

// ─── Points of interest ───────────────────────────────────────────────────────

export const VILLAGE_POIS: PointOfInterest[] = [
  // Crossroads area
  { id: 'market',     label: 'Marché',   x: 15, y: 23, icon: '🏪', color: '#E9A200' },
  { id: 'bailiff',    label: 'Bailli',   x: 19, y: 20, icon: '📜', color: '#9B59B6' },

  // Along vertical road (north → south)
  { id: 'guardhouse', label: 'Garde',    x: 15, y:  6, icon: '⚔',  color: '#708090' },
  { id: 'church',     label: 'Église',   x: 15, y: 12, icon: '⛪', color: '#F0F0F0' },
  { id: 'tavern',     label: 'Taverne',  x: 15, y: 30, icon: '🍺', color: '#C4622D' },

  // East of crossroads (along horizontal road)
  { id: 'forge',      label: 'Forge',    x: 24, y: 23, icon: '⚒',  color: '#E05C2A' },
  { id: 'craftsman',  label: 'Artisan',  x: 29, y: 27, icon: '🧵', color: '#E9C46A' },

  // West of crossroads
  { id: 'home',       label: 'Maison',   x:  7, y: 23, icon: '🏠', color: '#A0785A' },

  // Top-left forest
  { id: 'forest',     label: 'Forêt',    x:  5, y:  5, icon: '🌲', color: '#2D6A4F' },

  // Top-right quadrant
  { id: 'temple',     label: 'Temple',   x: 32, y:  8, icon: '🗿', color: '#7E6A52' },
  { id: 'river',      label: 'Rivière',  x: 40, y:  8, icon: '🐟', color: '#4A90D9' },

  // Bottom-left fields
  { id: 'fields',     label: 'Champs',   x:  6, y: 38, icon: '🌾', color: '#6AB04C' },
];
