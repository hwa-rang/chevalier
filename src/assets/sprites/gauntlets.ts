// All grids: 24 cols × 56 rows. Render with offsetX=20, offsetY=4.
// Gauntlets cover the hand/forearm region (rows 30–37).
//
// Palette keys: 'sv'=#C0C0C0, 'sv2'=#888888, 'sl'=#555555

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

function buildGauntletsMetal(bk: BodyKey): G {
  const g = mkG(56, 24);
  const b = CLOTHING_BOUNDS[bk];
  // Gauntlet cuffs: rows 30–33 on both arms
  fill(g, 30, b.armLC1, 33, b.armLC2, 'sv');
  fill(g, 30, b.armRC1, 33, b.armRC2, 'sv');
  for (let c = b.armLC1; c <= b.armLC2; c++) px(g, 30, c, 'sl');
  for (let c = b.armRC1; c <= b.armRC2; c++) px(g, 30, c, 'sl');
  // Glove/hand: rows 33–37
  fill(g, 33, b.armLC1, 37, b.armLC2 + 1, 'sv');
  fill(g, 33, b.armRC1 - 1, 37, b.armRC2, 'sv');
  // Finger line (row 36)
  for (let c = b.armLC1; c <= b.armLC2; c++) px(g, 36, c, 'sv2');
  for (let c = b.armRC1; c <= b.armRC2; c++) px(g, 36, c, 'sv2');
  // Edge shadows
  for (let r = 30; r <= 37; r++) {
    px(g, r, b.armLC1, 'sl'); px(g, r, b.armLC2 + 1, 'sl');
    px(g, r, b.armRC1 - 1, 'sl'); px(g, r, b.armRC2, 'sl');
  }
  return g;
}

export const gauntletsNone  = { slim: mkG(56, 24), average: mkG(56, 24), muscular: mkG(56, 24) };
export const gauntletsMetal = {
  slim:     buildGauntletsMetal('slim'),
  average:  buildGauntletsMetal('average'),
  muscular: buildGauntletsMetal('muscular'),
};
