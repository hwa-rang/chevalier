// Weapon layer: 8 cols × 48 rows. Render with offsetX=44, offsetY=8.
// Positioned on the right side (canvas cols 44–51, rows 8–55).
// Weapon is held at the side, angled slightly.
//
// Palette keys:
//   'sv'=#C0C0C0, 'sv2'=#888888 (blade/metal)
//   'gd'=#D4A017 (gold guard/crossguard)
//   'br'=#8B5E3C, 'bd'=#6B4226 (grip/wood)
//   'dk'=#333333 (axe blade dark)

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

function buildSword(): G {
  const g = mkG(48, 8);
  // Pommel (rows 37–40, cols 2–5)
  fill(g, 37, 2, 40, 5, 'sv2');
  // Grip (rows 26–37, cols 3–4)
  fill(g, 26, 3, 37, 4, 'br');
  // Crossguard (rows 24–27, cols 1–6)
  fill(g, 24, 1, 27, 6, 'gd');
  px(g, 24, 1, 'sv2'); px(g, 24, 6, 'sv2');
  px(g, 27, 1, 'sv2'); px(g, 27, 6, 'sv2');
  // Blade (rows 2–24, cols 2–5, tapering to point)
  fill(g, 2, 2, 24, 5, 'sv');
  for (let r = 2; r <= 24; r++) { px(g, r, 2, 'sv2'); px(g, r, 5, 'sv2'); }
  // Taper to tip
  fill(g, 0, 3, 3, 4, 'sv');
  px(g, 0, 3, 'sv2'); px(g, 0, 4, 'sv2');
  // Edge highlight
  for (let r = 2; r <= 22; r++) px(g, r, 3, 'gy2');
  return g;
}

function buildLance(): G {
  const g = mkG(48, 8);
  // Shaft (full height, cols 3–4)
  fill(g, 4, 3, 47, 4, 'br');
  for (let r = 4; r <= 47; r++) px(g, r, 3, 'bd');
  // Spearhead (rows 0–6, cols 2–5)
  fill(g, 0, 3, 6, 4, 'sv');
  fill(g, 2, 2, 4, 5, 'sv');
  px(g, 0, 3, 'sv2'); px(g, 0, 4, 'sv2');
  for (let c = 2; c <= 5; c++) px(g, 6, c, 'sv2');
  // Cross guard around shaft
  fill(g, 20, 1, 22, 6, 'gd');
  return g;
}

function buildAxe(): G {
  const g = mkG(48, 8);
  // Handle (rows 8–47, cols 3–4)
  fill(g, 8, 3, 47, 4, 'br');
  for (let r = 8; r <= 47; r++) px(g, r, 3, 'bd');
  // Axe head (rows 0–12, cols 0–6)
  fill(g, 0, 2, 12, 6, 'sv');
  // Blade edge (left curve of axe head)
  fill(g, 0, 0, 3, 2, 'sv');
  fill(g, 4, 0, 7, 1, 'sv');
  // Edge darkening
  for (let r = 0; r <= 12; r++) { px(g, r, 2, 'sv2'); }
  for (let r = 0; r <= 7; r++) { px(g, r, 0, 'dk'); }
  // Spike top
  fill(g, 0, 3, 2, 5, 'sv2');
  return g;
}

function buildMace(): G {
  const g = mkG(48, 8);
  // Handle (rows 12–47, cols 3–4)
  fill(g, 12, 3, 47, 4, 'br');
  for (let r = 12; r <= 47; r++) px(g, r, 3, 'bd');
  // Mace head (rows 0–12, cols 1–6)
  fill(g, 2, 1, 10, 6, 'sv');
  // Flanges (rows 1,3,5,7,9 extended)
  for (const fr of [1, 3, 5, 7, 9]) {
    px(g, fr, 0, 'sv2'); px(g, fr, 7, 'sv2');
    px(g, fr, 1, 'sv'); px(g, fr, 6, 'sv');
  }
  // Cap
  fill(g, 0, 2, 1, 5, 'sv2');
  fill(g, 10, 1, 11, 6, 'sv2');
  // Grip wrapping
  for (let r = 16; r <= 42; r += 4) fill(g, r, 2, r + 1, 5, 'gd');
  return g;
}

function buildBow(): G {
  const g = mkG(48, 8);
  // Bow limbs (curved stave)
  // Upper limb: rows 0–22, center at col 4 curving left
  for (let r = 0; r <= 10; r++) { px(g, r, 5 - Math.floor(r / 4), 'br'); }
  for (let r = 10; r <= 22; r++) { px(g, r, 4, 'br'); }
  // Lower limb: rows 22–47
  for (let r = 22; r <= 37; r++) { px(g, r, 4, 'br'); }
  for (let r = 37; r <= 47; r++) { px(g, r, 4 + Math.floor((r - 37) / 4), 'br'); }
  // Bowstring: rows 0–47, col 6 (thin vertical line)
  for (let r = 1; r <= 46; r++) px(g, r, 6, 'sv2');
  // Handle grip (rows 20–28, cols 3–5)
  fill(g, 20, 3, 28, 5, 'bd');
  fill(g, 20, 3, 28, 5, 'br');
  fill(g, 22, 3, 26, 5, 'gd');
  return g;
}

export const weaponNone: G  = mkG(48, 8);
export const weaponSword: G = buildSword();
export const weaponLance: G = buildLance();
export const weaponAxe: G   = buildAxe();
export const weaponMace: G  = buildMace();
export const weaponBow: G   = buildBow();
