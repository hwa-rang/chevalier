// Shield layer: 14 cols × 28 rows. Render with offsetX=6, offsetY=18.
// Positioned on the left side of the body (canvas cols 6–19, rows 18–45).
//
// Palette keys: 'sv'=#C0C0C0, 'sv2'=#888888, 'sl'=#444444, 'rd'=#8B0000, 'rd2'=#600000

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

function buildShield(): G {
  const g = mkG(28, 14);
  // Heater shield shape: wide at top, tapers to point at bottom.
  // Cols 0–13 (14 wide) at top, tapering to cols 5–8 at bottom.
  const rows = [
    [1, 12],  // row 0
    [0, 13],  // row 1
    [0, 13],  // row 2
    [0, 13],  // row 3
    [0, 13],  // row 4
    [0, 13],  // row 5
    [0, 13],  // row 6
    [0, 13],  // row 7
    [0, 13],  // row 8
    [0, 13],  // row 9
    [0, 13],  // row 10
    [0, 13],  // row 11
    [1, 12],  // row 12
    [1, 12],  // row 13
    [2, 11],  // row 14
    [2, 11],  // row 15
    [3, 10],  // row 16
    [3, 10],  // row 17
    [4, 9],   // row 18
    [4, 9],   // row 19
    [5, 8],   // row 20
    [5, 8],   // row 21
    [6, 7],   // row 22
    [6, 7],   // row 23
    [7, 6],   // row 24  (near tip)
    [7, 7],   // row 25
    [7, 7],   // row 26
    [7, 7],   // row 27
  ];
  for (let r = 0; r < rows.length; r++) {
    const [c1, c2] = rows[r];
    fill(g, r, c1, r, c2, 'sv');
    px(g, r, c1, 'sl'); px(g, r, c2, 'sl');
  }
  // Red cross design
  // Vertical bar: rows 2–22, cols 6–7
  fill(g, 2, 6, 22, 7, 'rd');
  // Horizontal bar: rows 6–7, cols 2–11
  fill(g, 6, 2, 7, 11, 'rd');
  // Cross shadows
  for (let r = 2; r <= 22; r++) { px(g, r, 6, 'rd2'); }
  for (let c = 2; c <= 11; c++) { px(g, 6, c, 'rd2'); }
  // Shield highlight
  fill(g, 1, 2, 5, 5, 'gy2');
  return g;
}

// Export 'gy2' in palette (reuse silver highlight)
export const shieldNone: G     = mkG(28, 14);
export const shieldEquipped: G = buildShield();
