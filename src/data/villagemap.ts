import type { PointOfInterest } from '../components/PixelMap';

// ─── Points of interest ───────────────────────────────────────────────────────
// x / y are pixel coordinates in the ORIGINAL 432×768 SVG/PNG space.
// They scale proportionally with the display width at runtime (see ImageMap).
// Adjust values here if a marker doesn't land on the right building.

export const VILLAGE_POIS: PointOfInterest[] = [
  // ── Top-left forest ─────────────────────────────────────────────────────────
  { id: 'temple',     label: 'Temple',   x:  60, y:  72, icon: '🗿', color: '#7E6A52' },
  { id: 'forest',     label: 'Forêt',    x:  38, y: 320, icon: '🌲', color: '#2D6A4F' },

  // ── River (winding, left side) ───────────────────────────────────────────────
  { id: 'river',      label: 'Rivière',  x:  98, y: 268, icon: '🐟', color: '#4A90D9' },

  // ── Top-right wheat fields ───────────────────────────────────────────────────
  { id: 'fields',     label: 'Champs',   x: 375, y:  55, icon: '🌾', color: '#6AB04C' },

  // ── Upper village: church & guardhouse ──────────────────────────────────────
  { id: 'church',     label: 'Église',   x: 228, y: 170, icon: '⛪', color: '#F0F0F0' },
  { id: 'guardhouse', label: 'Garde',    x: 272, y: 183, icon: '⚔',  color: '#708090' },

  // ── Central village: market, home, bailiff ──────────────────────────────────
  { id: 'market',     label: 'Marché',   x: 198, y: 238, icon: '🏪', color: '#E9A200' },
  { id: 'home',       label: 'Maison',   x: 148, y: 225, icon: '🏠', color: '#A0785A' },
  { id: 'bailiff',    label: 'Bailli',   x: 278, y: 220, icon: '📜', color: '#9B59B6' },

  // ── Lower village ───────────────────────────────────────────────────────────
  { id: 'tavern',     label: 'Taverne',  x: 162, y: 292, icon: '🍺', color: '#C4622D' },

  // ── South workshops ─────────────────────────────────────────────────────────
  { id: 'forge',      label: 'Forge',    x: 155, y: 418, icon: '⚒',  color: '#E05C2A' },
  { id: 'craftsman',  label: 'Artisan',  x: 258, y: 468, icon: '🧵', color: '#E9C46A' },
];
