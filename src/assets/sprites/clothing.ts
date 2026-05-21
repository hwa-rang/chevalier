// All grids: 24 cols × 56 rows. Render with offsetX=20, offsetY=4.
// Clothing covers torso, arms (sleeves), legs. Head/neck/hands stay transparent.
//
// Palette keys per variant:
//   none:   'lb'=#C8B49A (linen), 'tb'=#8B6F5A (trouser), 'td'=#6B5040 (trouser shadow)
//   common: 'br'=#8B5E3C, 'bd'=#6B4226, 'tb'=#8B6F5A, 'td'=#6B5040
//   fine:   'bl'=#2E5DA8, 'bd'=#1E4080, 'dg'=#444444, 'dd'=#333333
//   noble:  'bu'=#7B2335, 'bn'=#5C1828, 'gd'=#D4A017, 'dg'=#444444

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

// Body-type bounds for clothing layers (mirrors body.ts dimensions):
export const CLOTHING_BOUNDS = {
  slim:     { torsoC1: 7, torsoC2: 16, armLC1: 4, armLC2: 6, armRC1: 17, armRC2: 19, legLC1: 7, legLC2: 11, legRC1: 13, legRC2: 17 },
  average:  { torsoC1: 5, torsoC2: 18, armLC1: 2, armLC2: 4, armRC1: 19, armRC2: 21, legLC1: 5, legLC2: 11, legRC1: 12, legRC2: 18 },
  muscular: { torsoC1: 3, torsoC2: 20, armLC1: 0, armLC2: 2, armRC1: 21, armRC2: 23, legLC1: 3, legLC2: 11, legRC1: 12, legRC2: 20 },
};
type BodyKey = keyof typeof CLOTHING_BOUNDS;

function buildClothing(
  bodyKey: BodyKey,
  torsoColor: string, torsoShadow: string,
  legColor: string, legShadow: string,
  trimColor?: string,
): G {
  const g = mkG(56, 24);
  const b = CLOTHING_BOUNDS[bodyKey];
  // Torso (rows 17–36)
  fill(g, 17, b.torsoC1, 36, b.torsoC2, torsoColor);
  for (let r = 17; r <= 36; r++) { px(g, r, b.torsoC1, torsoShadow); px(g, r, b.torsoC2, torsoShadow); }
  // Shoulders cap (row 17 slightly wider)
  const sc = 1;
  fill(g, 17, b.torsoC1 - sc, 17, b.torsoC2 + sc, torsoColor);
  // Left sleeve (rows 17–33)
  fill(g, 17, b.armLC1, 33, b.armLC2, torsoColor);
  for (let r = 17; r <= 33; r++) px(g, r, b.armLC1, torsoShadow);
  // Right sleeve
  fill(g, 17, b.armRC1, 33, b.armRC2, torsoColor);
  for (let r = 17; r <= 33; r++) px(g, r, b.armRC2, torsoShadow);
  // Hip zone (rows 37–39, same as torso width)
  fill(g, 37, b.torsoC1, 39, b.torsoC2, legColor);
  for (let c = b.torsoC1; c <= b.torsoC2; c++) px(g, 37, c, legShadow);
  // Left leg (rows 39–55)
  fill(g, 39, b.legLC1, 55, b.legLC2, legColor);
  for (let r = 39; r <= 55; r++) { px(g, r, b.legLC1, legShadow); px(g, r, b.legLC2, legShadow); }
  // Right leg
  fill(g, 39, b.legRC1, 55, b.legRC2, legColor);
  for (let r = 39; r <= 55; r++) { px(g, r, b.legRC1, legShadow); px(g, r, b.legRC2, legShadow); }
  // Optional trim (collar row 17, hem row 36, cuffs row 33)
  if (trimColor) {
    fill(g, 17, b.torsoC1, 17, b.torsoC2, trimColor);
    fill(g, 36, b.torsoC1, 36, b.torsoC2, trimColor);
    fill(g, 33, b.armLC1, 33, b.armLC2, trimColor);
    fill(g, 33, b.armRC1, 33, b.armRC2, trimColor);
  }
  return g;
}

// Linen underclothes (clothingNone)
function buildClothingNone(b: BodyKey): G {
  return buildClothing(b, 'lb', 'td', 'tb', 'td');
}
function buildClothingCommon(b: BodyKey): G {
  return buildClothing(b, 'br', 'bd', 'tb', 'td');
}
function buildClothingFine(b: BodyKey): G {
  return buildClothing(b, 'bl', 'bd', 'dg', 'dd');
}
function buildClothingNoble(b: BodyKey): G {
  return buildClothing(b, 'bu', 'bn', 'dg', 'dd', 'gd');
}

export const clothingNone     = { slim: buildClothingNone('slim'),     average: buildClothingNone('average'),     muscular: buildClothingNone('muscular') };
export const clothingCommon   = { slim: buildClothingCommon('slim'),   average: buildClothingCommon('average'),   muscular: buildClothingCommon('muscular') };
export const clothingFine     = { slim: buildClothingFine('slim'),     average: buildClothingFine('average'),     muscular: buildClothingFine('muscular') };
export const clothingNoble    = { slim: buildClothingNoble('slim'),    average: buildClothingNoble('average'),    muscular: buildClothingNoble('muscular') };
