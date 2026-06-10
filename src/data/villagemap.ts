import type { PointOfInterest } from '../components/PixelMap';

// ─── Points of interest ───────────────────────────────────────────────────────
// x / y are pixel coordinates in the ORIGINAL 432×768 SVG/PNG space.
// They scale proportionally with the display width at runtime (see ImageMap).
// Adjust values here if a marker doesn't land on the right building.

export const VILLAGE_POIS: PointOfInterest[] = [
  // ── Top-left forest ─────────────────────────────────────────────────────────
  { id: 'temple',     label: 'Temple',   x:  60, y: 105, icon: '🗿', color: '#7E6A52' },
  { id: 'forest',     label: 'Forêt',    x:  38, y: 515, icon: '🌲', color: '#2D6A4F' },

  // ── River (winding, left side) ───────────────────────────────────────────────
  { id: 'river',      label: 'Rivière',  x: 157, y: 469, icon: '🐟', color: '#4A90D9' },

  // ── Top-right wheat fields ───────────────────────────────────────────────────
  { id: 'fields',     label: 'Champs',   x: 375, y: 108, icon: '🌾', color: '#6AB04C' },

  // ── Upper village: church & guardhouse ──────────────────────────────────────
  { id: 'church',     label: 'Église',   x: 280, y: 170, icon: '⛪', color: '#F0F0F0' },
  { id: 'guardhouse', label: 'Garde',    x: 370, y: 288, icon: '🛡️', color: '#708090' },

  // ── Central village: market, home, bailiff ──────────────────────────────────
  { id: 'market',     label: 'Marché',   x: 198, y: 291, icon: '🧺', color: '#E9A200' },
  { id: 'home',       label: 'Maison',   x: 213, y: 630, icon: '🏠', color: '#A0785A' },
  { id: 'bailiff',    label: 'Bailli',   x: 327, y: 306, icon: '📜', color: '#9B59B6' },

  // ── Lower village ───────────────────────────────────────────────────────────
  { id: 'tavern',     label: 'Taverne',  x: 331, y: 189, icon: '🍺', color: '#C4622D' },

  // ── South workshops ─────────────────────────────────────────────────────────
  { id: 'forge',      label: 'Forge',    x: 318, y: 405, icon: '🔨', color: '#E05C2A' },
  { id: 'craftsman',  label: 'Artisan',  x: 135, y: 258, icon: '🧵', color: '#E9C46A' },
];
