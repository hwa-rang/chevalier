// All grids: 24 cols × 56 rows. Render with offsetX=20, offsetY=4.
// Helmet covers the head region (rows 0–16).
//
// Palette keys:
//   'sv'=#C0C0C0, 'sv2'=#888888, 'sl'=#555555, 'gy2'=#AAAAAA (highlight)

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

function buildHelmetBasic(): G {
  // Nasal helm: open face, metal dome covering crown/cheeks, nasal bar down center.
  const g = mkG(56, 24);
  // Dome: rows 0–4, cols 6–17 (covers hair)
  fill(g, 0, 6, 4, 17, 'sv');
  for (let c = 6; c <= 17; c++) { px(g, 0, c, 'sl'); px(g, 4, c, 'sv2'); }
  for (let r = 0; r <= 4; r++) { px(g, r, 6, 'sl'); px(g, r, 17, 'sl'); }
  // Highlight on dome
  fill(g, 1, 8, 3, 14, 'gy2');
  // Cheek guards: rows 5–11, cols 6–7 (left) and 16–17 (right)
  fill(g, 5, 6, 11, 7, 'sv');
  fill(g, 5, 16, 11, 17, 'sv');
  for (let r = 5; r <= 11; r++) { px(g, r, 6, 'sl'); px(g, r, 17, 'sl'); }
  // Nasal bar: rows 4–10, col 11–12 (center of face, over face)
  fill(g, 4, 11, 10, 12, 'sv2');
  px(g, 4, 11, 'sl'); px(g, 4, 12, 'sl');
  // Neck guard: rows 12–15, cols 7–16
  fill(g, 12, 7, 15, 16, 'sv');
  for (let c = 7; c <= 16; c++) px(g, 15, c, 'sv2');
  for (let r = 12; r <= 15; r++) { px(g, r, 7, 'sl'); px(g, r, 16, 'sl'); }
  return g;
}

function buildHelmetGreat(): G {
  // Great helm: full coverage, eye slit only (rows 6–7 left+right of center).
  const g = mkG(56, 24);
  // Full helmet body: rows 0–15, cols 6–17
  fill(g, 0, 6, 15, 17, 'sv');
  // Edges
  for (let c = 6; c <= 17; c++) { px(g, 0, c, 'sl'); px(g, 15, c, 'sv2'); }
  for (let r = 0; r <= 15; r++) { px(g, r, 6, 'sl'); px(g, r, 17, 'sl'); }
  // Highlight strip
  fill(g, 1, 8, 3, 14, 'gy2');
  // Eye slit: rows 6–7, cols 8–15. Fill black, leave left col and right col as 'sv2'
  fill(g, 6, 8, 7, 15, 'sl');
  px(g, 6, 8, 'sv2'); px(g, 6, 15, 'sv2');
  px(g, 7, 8, 'sv2'); px(g, 7, 15, 'sv2');
  // Ventilation slots: rows 10–12, cols 10–13
  fill(g, 10, 10, 10, 13, 'sl');
  fill(g, 12, 10, 12, 13, 'sl');
  // Bottom rim
  fill(g, 14, 6, 15, 17, 'sv2');
  for (let c = 6; c <= 17; c++) px(g, 15, c, 'sl');
  return g;
}

export const helmetNone: G  = mkG(56, 24);
export const helmetBasic: G = buildHelmetBasic();
export const helmetGreat: G = buildHelmetGreat();
