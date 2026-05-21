// All grids: 24 cols × 56 rows. Render with offsetX=20, offsetY=4.
// Palette keys: 'sk' skin, 'sk2' dark skin, 'hr' hair, 'ey' eye, 'mo' mouth

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

// Head/face/neck shared by all body types.
// Face center: col 11.5 (head cols 6–17, face cols 7–16).
function drawFaceAndNeck(g: G): void {
  // Hair top (rows 0–3, cols 6–17)
  fill(g, 0, 6, 3, 17, 'hr');
  // Face fills over hair interior
  fill(g, 2, 7, 12, 16, 'sk');
  // Ear stubs
  for (let r = 5; r <= 7; r++) { px(g, r, 6, 'sk'); px(g, r, 17, 'sk'); }
  // Side shadows on jaw
  for (let r = 3; r <= 12; r++) { px(g, r, 7, 'sk2'); px(g, r, 16, 'sk2'); }
  // Eyebrows (row 4)
  px(g, 4, 9, 'hr'); px(g, 4, 10, 'hr');
  px(g, 4, 13, 'hr'); px(g, 4, 14, 'hr');
  // Eyes (row 6)
  px(g, 6, 9, 'ey'); px(g, 6, 14, 'ey');
  // Nose shadow (row 8)
  px(g, 8, 11, 'sk2'); px(g, 8, 12, 'sk2');
  // Mouth (row 10)
  px(g, 10, 10, 'mo'); px(g, 10, 11, 'mo'); px(g, 10, 12, 'mo'); px(g, 10, 13, 'mo');
  // Chin taper (rows 11–13)
  fill(g, 11, 8, 13, 15, 'sk');
  fill(g, 13, 9, 13, 14, 'sk');
  px(g, 13, 8, 'sk2'); px(g, 13, 15, 'sk2');
  // Neck (rows 14–16, cols 10–13)
  fill(g, 14, 10, 16, 13, 'sk');
  px(g, 14, 10, 'sk2'); px(g, 14, 13, 'sk2');
  px(g, 16, 10, 'sk2'); px(g, 16, 13, 'sk2');
}

function buildBodySlim(): G {
  const g = mkG(56, 24);
  drawFaceAndNeck(g);
  // Shoulder row 17: narrow ~10px (cols 7–16) + arm joins (5–6, 17–18)
  fill(g, 17, 5, 17, 18, 'sk');
  // Torso: rows 17–36, cols 7–16
  fill(g, 17, 7, 36, 16, 'sk');
  for (let r = 17; r <= 36; r++) { px(g, r, 7, 'sk2'); px(g, r, 16, 'sk2'); }
  // Left arm: rows 17–33, cols 4–6
  fill(g, 17, 4, 33, 6, 'sk');
  for (let r = 17; r <= 33; r++) px(g, r, 4, 'sk2');
  // Right arm: rows 17–33, cols 17–19
  fill(g, 17, 17, 33, 19, 'sk');
  for (let r = 17; r <= 33; r++) px(g, r, 19, 'sk2');
  // Hands: rows 33–37, cols 3–5 and 18–20
  fill(g, 33, 3, 37, 5, 'sk');
  fill(g, 33, 18, 37, 20, 'sk');
  for (let r = 33; r <= 37; r++) { px(g, r, 3, 'sk2'); px(g, r, 20, 'sk2'); }
  // Hips: rows 37–39, cols 7–16
  fill(g, 37, 7, 39, 16, 'sk');
  for (let c = 7; c <= 16; c++) px(g, 37, c, 'sk2');
  // Left leg: rows 39–54, cols 7–11
  fill(g, 39, 7, 54, 11, 'sk');
  for (let r = 39; r <= 54; r++) { px(g, r, 7, 'sk2'); px(g, r, 11, 'sk2'); }
  // Right leg: rows 39–54, cols 13–17
  fill(g, 39, 13, 54, 17, 'sk');
  for (let r = 39; r <= 54; r++) { px(g, r, 13, 'sk2'); px(g, r, 17, 'sk2'); }
  // Feet (row 55)
  fill(g, 55, 6, 55, 12, 'sk'); fill(g, 55, 12, 55, 18, 'sk');
  px(g, 55, 6, 'sk2'); px(g, 55, 18, 'sk2');
  return g;
}

function buildBodyAverage(): G {
  const g = mkG(56, 24);
  drawFaceAndNeck(g);
  // Shoulder row 17: ~14px (cols 5–18) + arm joins (3–4, 19–20)
  fill(g, 17, 3, 17, 20, 'sk');
  // Torso: rows 17–36, cols 5–18
  fill(g, 17, 5, 36, 18, 'sk');
  for (let r = 17; r <= 36; r++) { px(g, r, 5, 'sk2'); px(g, r, 18, 'sk2'); }
  // Left arm: rows 17–33, cols 2–4
  fill(g, 17, 2, 33, 4, 'sk');
  for (let r = 17; r <= 33; r++) px(g, r, 2, 'sk2');
  // Right arm: rows 17–33, cols 19–21
  fill(g, 17, 19, 33, 21, 'sk');
  for (let r = 17; r <= 33; r++) px(g, r, 21, 'sk2');
  // Hands: rows 33–37, cols 1–3 and 20–22
  fill(g, 33, 1, 37, 3, 'sk');
  fill(g, 33, 20, 37, 22, 'sk');
  for (let r = 33; r <= 37; r++) { px(g, r, 1, 'sk2'); px(g, r, 22, 'sk2'); }
  // Hips: rows 37–39, cols 5–18
  fill(g, 37, 5, 39, 18, 'sk');
  for (let c = 5; c <= 18; c++) px(g, 37, c, 'sk2');
  // Left leg: rows 39–54, cols 5–11
  fill(g, 39, 5, 54, 11, 'sk');
  for (let r = 39; r <= 54; r++) { px(g, r, 5, 'sk2'); px(g, r, 11, 'sk2'); }
  // Right leg: rows 39–54, cols 12–18
  fill(g, 39, 12, 54, 18, 'sk');
  for (let r = 39; r <= 54; r++) { px(g, r, 12, 'sk2'); px(g, r, 18, 'sk2'); }
  // Feet (row 55)
  fill(g, 55, 4, 55, 12, 'sk'); fill(g, 55, 11, 55, 19, 'sk');
  px(g, 55, 4, 'sk2'); px(g, 55, 19, 'sk2');
  return g;
}

function buildBodyMuscular(): G {
  const g = mkG(56, 24);
  drawFaceAndNeck(g);
  // Wide shoulder row 17: ~18px (cols 3–20) + arm joins (1–2, 21–22)
  fill(g, 17, 1, 17, 22, 'sk');
  // Torso: rows 17–36, cols 3–20
  fill(g, 17, 3, 36, 20, 'sk');
  // Barrel chest bulge rows 19–28 (extra px on each side)
  for (let r = 19; r <= 28; r++) { px(g, r, 2, 'sk'); px(g, r, 21, 'sk'); }
  // Side shadows
  for (let r = 17; r <= 36; r++) { px(g, r, 3, 'sk2'); px(g, r, 20, 'sk2'); }
  for (let r = 19; r <= 28; r++) { px(g, r, 2, 'sk2'); px(g, r, 21, 'sk2'); }
  // Left arm: rows 17–33, cols 0–2
  fill(g, 17, 0, 33, 2, 'sk');
  for (let r = 17; r <= 33; r++) px(g, r, 0, 'sk2');
  // Right arm: rows 17–33, cols 21–23
  fill(g, 17, 21, 33, 23, 'sk');
  for (let r = 17; r <= 33; r++) px(g, r, 23, 'sk2');
  // Hands: rows 33–37, cols 0–2 and 21–23
  fill(g, 33, 0, 37, 2, 'sk');
  fill(g, 33, 21, 37, 23, 'sk');
  for (let r = 33; r <= 37; r++) { px(g, r, 0, 'sk2'); px(g, r, 23, 'sk2'); }
  // Hips: rows 37–39, cols 3–20
  fill(g, 37, 3, 39, 20, 'sk');
  for (let c = 3; c <= 20; c++) px(g, 37, c, 'sk2');
  // Left leg: rows 39–54, cols 3–11
  fill(g, 39, 3, 54, 11, 'sk');
  for (let r = 39; r <= 54; r++) { px(g, r, 3, 'sk2'); px(g, r, 11, 'sk2'); }
  // Right leg: rows 39–54, cols 12–20
  fill(g, 39, 12, 54, 20, 'sk');
  for (let r = 39; r <= 54; r++) { px(g, r, 12, 'sk2'); px(g, r, 20, 'sk2'); }
  // Feet (row 55)
  fill(g, 55, 2, 55, 12, 'sk'); fill(g, 55, 11, 55, 21, 'sk');
  px(g, 55, 2, 'sk2'); px(g, 55, 21, 'sk2');
  return g;
}

export const bodySlim: G = buildBodySlim();
export const bodyAverage: G = buildBodyAverage();
export const bodyMuscular: G = buildBodyMuscular();
