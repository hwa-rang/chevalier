// ── SUPER PLUM 21 palette (dark plum theme) ──────────────────────────────────
// Reference swatches (approx. from the palette art):
const PLUM = {
  bg:        '#2B2031', // deep plum background
  panel:     '#3A2C44', // card / header surface
  panelHi:   '#4A3A56', // raised surface / tags
  line:      '#6E5A7E', // borders
  cream:     '#F7EFDD', // light text / on-dark
  lavender:  '#B9A7C7', // muted secondary text
  gold:      '#F4C84E', // warm accent
  orange:    '#F08A4B',
  coral:     '#EF5A6F',
  green:     '#43A95C',
  teal:      '#45BEC6',
  blue:      '#7FA6E0',
  purple:    '#7B4FD0', // primary action
  magenta:   '#9B3D6E',
} as const;

export const Colors = {
  parchment: PLUM.bg,        // main background
  surface: PLUM.panel,       // cards / headers
  surfaceDark: PLUM.panelHi, // raised surfaces / tags
  border: PLUM.line,
  textPrimary: PLUM.cream,
  textSecondary: PLUM.lavender,
  accent: PLUM.gold,
  buttonBg: PLUM.purple,
  buttonText: PLUM.cream,
  tagBg: PLUM.panelHi,
  tagText: PLUM.cream,
};
