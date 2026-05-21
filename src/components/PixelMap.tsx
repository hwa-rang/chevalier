import React from 'react';
import { ScrollView } from 'react-native';
import Svg, { Rect, Circle, Text as SvgText, Line } from 'react-native-svg';

export type MapTile =
  | 'grass' | 'dirt' | 'stone' | 'water' | 'forest'
  | 'sand' | 'road' | 'sea' | 'land' | 'mountain' | 'empty';

export interface PointOfInterest {
  id: string;
  label: string;
  x: number;  // tile column
  y: number;  // tile row
  icon: string;
  color: string;
  locked?: boolean;
}

const TILE_COLORS: Record<MapTile, string> = {
  grass:    '#6AB04C',
  dirt:     '#A0785A',
  stone:    '#8E8E8E',
  water:    '#4A90D9',
  forest:   '#2D6A4F',
  sand:     '#E9C46A',
  road:     '#C4A882',
  sea:      '#1A6B9A',
  land:     '#C8B560',
  mountain: '#9B7E6A',
  empty:    '#111111',
};

interface Props {
  mapData: MapTile[][];
  pois: PointOfInterest[];
  onPoiPress: (poi: PointOfInterest) => void;
  width: number;
  height: number;
  tileSize: number;
}

export default function PixelMap({ mapData, pois, onPoiPress, tileSize }: Props) {
  const rows = mapData.length;
  const cols = rows > 0 ? mapData[0].length : 0;
  const svgW = cols * tileSize;
  const svgH = rows * tileSize;

  // Detect background tile (top-left corner) for optimized rendering
  const bgTile: MapTile = rows > 0 && cols > 0 ? mapData[0][cols - 1] : 'grass';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
        <Svg width={svgW} height={svgH}>
          {/* Background fill */}
          <Rect x={0} y={0} width={svgW} height={svgH} fill={TILE_COLORS[bgTile]} />

          {/* Non-background tiles */}
          {mapData.map((row, r) =>
            row.map((tile, c) => {
              if (tile === bgTile) return null;
              return (
                <Rect
                  key={`t${r}-${c}`}
                  x={c * tileSize}
                  y={r * tileSize}
                  width={tileSize}
                  height={tileSize}
                  fill={TILE_COLORS[tile]}
                />
              );
            })
          )}

          {/* Grid overlay: subtle 1px line every 8 tiles */}
          {Array.from({ length: Math.floor(cols / 8) }, (_, i) => (
            <Line
              key={`vg${i}`}
              x1={(i + 1) * 8 * tileSize}
              y1={0}
              x2={(i + 1) * 8 * tileSize}
              y2={svgH}
              stroke="rgba(0,0,0,0.10)"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: Math.floor(rows / 8) }, (_, i) => (
            <Line
              key={`hg${i}`}
              x1={0}
              y1={(i + 1) * 8 * tileSize}
              x2={svgW}
              y2={(i + 1) * 8 * tileSize}
              stroke="rgba(0,0,0,0.10)"
              strokeWidth={1}
            />
          ))}

          {/* POI markers */}
          {pois.map((poi) => {
            const px = poi.x * tileSize + tileSize / 2;
            const py = poi.y * tileSize + tileSize / 2;
            const markerColor = poi.locked ? '#888888' : poi.color;
            return (
              <React.Fragment key={poi.id}>
                {/* Outer ring */}
                <Circle cx={px} cy={py} r={10} fill="rgba(0,0,0,0.3)" />
                {/* Colored dot */}
                <Circle cx={px} cy={py} r={8} fill={markerColor} stroke="#fff" strokeWidth={1.5} />

                {/* Label shadow */}
                <SvgText
                  x={px + 0.5}
                  y={py + 20.5}
                  fontSize={7}
                  fontFamily="serif"
                  textAnchor="middle"
                  fill="rgba(0,0,0,0.7)"
                  fontStyle={poi.locked ? 'italic' : 'normal'}
                >
                  {poi.label}
                </SvgText>
                {/* Label */}
                <SvgText
                  x={px}
                  y={py + 20}
                  fontSize={7}
                  fontFamily="serif"
                  textAnchor="middle"
                  fill={poi.locked ? '#cccccc' : '#ffffff'}
                  fontStyle={poi.locked ? 'italic' : 'normal'}
                >
                  {poi.label}
                </SvgText>

                {/* Transparent 44px hit target (r=22) */}
                <Circle
                  cx={px}
                  cy={py}
                  r={22}
                  fill="transparent"
                  onPress={() => onPoiPress(poi)}
                />
              </React.Fragment>
            );
          })}
        </Svg>
      </ScrollView>
    </ScrollView>
  );
}
