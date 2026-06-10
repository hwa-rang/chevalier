import React from 'react';
import Svg, { Rect } from 'react-native-svg';

// 8×8 pixel orb: O = dark outline, h = body, H = highlight, s = shade.
const ORB = [
  '00OOOO00',
  '0OhhhhO0',
  'OhHHhhhO',
  'OhHhhhhO',
  'OhhhhhhO',
  'OhhhhssO',
  '0OhhssO0',
  '00OOOO00',
];

function clamp(n: number) {
  return Math.max(0, Math.min(255, n));
}

/** Shift a #rrggbb colour lighter (+amt) or darker (−amt). */
function shift(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const f = (v: number) => clamp(Math.round(v + amt)).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

interface Props {
  color: string;
  size?: number;
}

export default function PixelBubble({ color, size = 28 }: Props) {
  const px = size / 8;
  const map: Record<string, string> = {
    O: shift(color, -95),
    h: color,
    H: shift(color, 85),
    s: shift(color, -45),
  };

  const rects: React.ReactElement[] = [];
  for (let y = 0; y < 8; y++) {
    const row = ORB[y];
    for (let x = 0; x < 8; x++) {
      const c = row[x];
      if (c === '0') continue;
      rects.push(
        <Rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={map[c]} />,
      );
    }
  }

  return (
    <Svg width={size} height={size}>
      {rects}
    </Svg>
  );
}
