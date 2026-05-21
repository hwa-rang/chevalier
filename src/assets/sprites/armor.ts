// All grids: 24 cols × 56 rows. Render with offsetX=20, offsetY=4.
// Armor covers only the torso (chest piece), over clothing.
//
// Palette keys:
//   leather:   'db'=#5C3D1E, 'dc'=#3E2610 (shadow)
//   chainmail: 'gy'=#8E8E8E, 'gy2'=#A8A8A8 (checker highlight)
//   plate:     'sv'=#C0C0C0, 'sv2'=#888888, 'sl'=#666666 (deep edge)

import { CLOTHING_BOUNDS } from './clothing';

type G = string[][];
function mkG(rows: number, cols: number): G {
  return Array.from({ length: rows }, () => Array(cols).fill('.'));
}
function fill(g: G, r1: number, c1: number, r2: number, c2: number, v: string): void {
  for (let r = Math.max(0, r1); r <= Math.min(g.length - 1, r2); r++)
    for (let c = Math.max(0, c1); c <= Math.min(g[0].length - 1, c2); c++)
      g[r][c] = v;
}
function px(g: G, r: number, c: number, v: string): void {
  if (r >= 0 && r < g.length && c >= 0 && c < g[0].length) g[r][c] = v;
}

type BodyKey = keyof typeof CLOTHING_BOUNDS;

function buildLeather(bk: BodyKey): G {
  const g = mkG(56, 24);
  const b = CLOTHING_BOUNDS[bk];
  // Vest: torso rows 17–34, inset 1px from edges (leaves clothing visible at sides)
  fill(g, 17, b.torsoC1 + 1, 34, b.torsoC2 - 1, 'db');
  for (let r = 17; r <= 34; r++) {
    px(g, r, b.torsoC1 + 1, 'dc');
    px(g, r, b.torsoC2 - 1, 'dc');
  }
  // Shoulder pads (rows 17–19, full torso width)
  fill(g, 17, b.torsoC1, 19, b.torsoC2, 'db');
  for (let c = b.torsoC1; c <= b.torsoC2; c++) {
    px(g, 17, c, 'dc');
    px(g, 19, c, 'dc');
  }
  // Belt (row 34)
  fill(g, 34, b.torsoC1, 34, b.torsoC2, 'dc');
  return g;
}

function buildChainmail(bk: BodyKey): G {
  const g = mkG(56, 24);
  const b = CLOTHING_BOUNDS[bk];
  // Chainmail torso rows 17–36 + shoulder pads + arm coverage
  for (let r = 17; r <= 36; r++) {
    for (let c = b.torsoC1; c <= b.torsoC2; c++) {
      // Checkerboard ring texture
      g[r][c] = (r + c) % 2 === 0 ? 'gy' : 'gy2';
    }
    px(g, r, b.torsoC1, 'gy');
    px(g, r, b.torsoC2, 'gy');
  }
  // Short sleeves / arm coverage (rows 17–26)
  for (let r = 17; r <= 26; r++) {
    for (let c = b.armLC1; c <= b.armLC2; c++)
      g[r][c] = (r + c) % 2 === 0 ? 'gy' : 'gy2';
    for (let c = b.armRC1; c <= b.armRC2; c++)
      g[r][c] = (r + c) % 2 === 0 ? 'gy' : 'gy2';
  }
  // Edge rows solid
  for (let c = b.torsoC1; c <= b.torsoC2; c++) {
    px(g, 17, c, 'gy');
    px(g, 36, c, 'gy');
  }
  return g;
}

function buildPlate(bk: BodyKey): G {
  const g = mkG(56, 24);
  const b = CLOTHING_BOUNDS[bk];
  // Breastplate torso rows 17–36
  fill(g, 17, b.torsoC1, 36, b.torsoC2, 'sv');
  // Side edges
  for (let r = 17; r <= 36; r++) {
    px(g, r, b.torsoC1, 'sl');
    px(g, r, b.torsoC2, 'sl');
    // Inner edge shadow
    px(g, r, b.torsoC1 + 1, 'sv2');
    px(g, r, b.torsoC2 - 1, 'sv2');
  }
  // Top/bottom edges
  for (let c = b.torsoC1; c <= b.torsoC2; c++) {
    px(g, 17, c, 'sl');
    px(g, 36, c, 'sv2');
  }
  // Center ridge (vertical highlight)
  const mid = Math.floor((b.torsoC1 + b.torsoC2) / 2);
  for (let r = 18; r <= 35; r++) px(g, r, mid, 'gy2');
  // Shoulder pauldrons (rows 17–20, slightly wider)
  fill(g, 17, b.torsoC1 - 1, 20, b.torsoC2 + 1, 'sv');
  for (let c = b.torsoC1 - 1; c <= b.torsoC2 + 1; c++) px(g, 17, c, 'sl');
  // Arm plate coverage (rows 17–33)
  fill(g, 17, b.armLC1, 33, b.armLC2, 'sv');
  fill(g, 17, b.armRC1, 33, b.armRC2, 'sv');
  for (let r = 17; r <= 33; r++) {
    px(g, r, b.armLC1, 'sl'); px(g, r, b.armLC2, 'sl');
    px(g, r, b.armRC1, 'sl'); px(g, r, b.armRC2, 'sl');
  }
  return g;
}

export const armorNone      = { slim: mkG(56, 24), average: mkG(56, 24), muscular: mkG(56, 24) };
export const armorLeather   = { slim: buildLeather('slim'),   average: buildLeather('average'),   muscular: buildLeather('muscular') };
export const armorChainmail = { slim: buildChainmail('slim'), average: buildChainmail('average'), muscular: buildChainmail('muscular') };
export const armorPlate     = { slim: buildPlate('slim'),     average: buildPlate('average'),     muscular: buildPlate('muscular') };
