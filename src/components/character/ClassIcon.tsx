/**
 * ClassIcon — renders a hand-coded SVG glyph for one of the 16 v4 classes.
 *
 * Each glyph is minimal, stroke-based, single-color (tinted via `color` prop),
 * designed on a 48x48 viewBox. Sized via the `size` prop.
 */
import Svg, { Path, Circle, G } from 'react-native-svg';
import type { ColorValue } from 'react-native';
import { COLORS } from '@/lib/constants';

export type ClassGlyph =
  | 'Awakened Novice'
  | 'Iron Bulwark'
  | 'Atlas Titan'
  | 'Gauntlet Duelist'
  | 'Ironhand Crusher'
  | 'Shadow Archer'
  | 'Dragonspine'
  | 'Raven Stalker'
  | 'Juggernaut'
  | 'Storm Rider'
  | 'Windrunner'
  | 'Void Monk'
  | 'Serpent Dancer'
  | 'Flame Herald'
  | 'Paragon'
  | 'Ascendant';

interface ClassIconProps {
  name: ClassGlyph;
  size?: number;
  color?: ColorValue;
  /** Stroke width (auto-scaled with size). Default 2. */
  strokeWidth?: number;
}

export default function ClassIcon({
  name,
  size = 48,
  color = COLORS.gold,
  strokeWidth = 2,
}: ClassIconProps) {
  const c = color as string;
  const common = { stroke: c, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {renderGlyph(name, c, common)}
    </Svg>
  );
}

function renderGlyph(
  name: ClassGlyph,
  c: string,
  common: { stroke: string; strokeWidth: number; fill: string; strokeLinecap: 'round'; strokeLinejoin: 'round' },
) {
  switch (name) {
    // 1 — hexagon outline
    case 'Awakened Novice':
      return <Path {...common} d="M 24 6 L 40 15 L 40 33 L 24 42 L 8 33 L 8 15 Z" />;

    // 2 — shield + chamfered crest bar
    case 'Iron Bulwark':
      return (
        <G>
          <Path {...common} d="M 24 5 L 40 11 L 40 24 Q 40 37 24 44 Q 8 37 8 24 L 8 11 Z" />
          <Path {...common} d="M 14 20 L 24 14 L 34 20" />
          <Path {...common} d="M 24 14 L 24 34" />
        </G>
      );

    // 3 — mountain peaks + twin shoulder stars
    case 'Atlas Titan':
      return (
        <G>
          <Path {...common} d="M 4 40 L 18 20 L 24 28 L 30 18 L 44 40 Z" />
          <Path {...common} d="M 12 10 L 13 13 L 16 13 L 14 15 L 15 18 L 12 16 L 9 18 L 10 15 L 8 13 L 11 13 Z" />
          <Path {...common} d="M 36 10 L 37 13 L 40 13 L 38 15 L 39 18 L 36 16 L 33 18 L 34 15 L 32 13 L 35 13 Z" />
        </G>
      );

    // 4 — crossed gauntlets (two angled bars + knuckle plates)
    case 'Gauntlet Duelist':
      return (
        <G>
          <Path {...common} d="M 8 8 L 16 6 L 40 38 L 32 42 Z" />
          <Path {...common} d="M 40 8 L 32 6 L 8 38 L 16 42 Z" />
          <Circle cx="18" cy="18" r="1.5" fill={c} />
          <Circle cx="30" cy="18" r="1.5" fill={c} />
          <Circle cx="24" cy="24" r="1.5" fill={c} />
        </G>
      );

    // 5 — clenched fist with grip ridges
    case 'Ironhand Crusher':
      return (
        <G>
          <Path {...common} d="M 12 16 Q 12 10 18 10 L 30 10 Q 36 10 36 16 L 36 34 Q 36 40 30 40 L 18 40 Q 12 40 12 34 Z" />
          <Path {...common} d="M 14 18 L 34 18" />
          <Path {...common} d="M 14 26 L 34 26" />
          <Path {...common} d="M 14 34 L 34 34" />
        </G>
      );

    // 6 — drawn bow + arrow
    case 'Shadow Archer':
      return (
        <G>
          <Path {...common} d="M 14 8 Q 36 24 14 40" />
          <Path {...common} d="M 14 8 L 14 40" />
          <Path {...common} d="M 8 24 L 38 24" />
          <Path {...common} d="M 38 24 L 32 20 M 38 24 L 32 28" />
          <Path {...common} d="M 8 24 L 4 20 M 8 24 L 4 28" />
        </G>
      );

    // 7 — dragonspine: arched spine with 7 vertebrae diamonds
    case 'Dragonspine':
      return (
        <G>
          <Path {...common} d="M 6 38 Q 24 6 42 38" />
          {[8, 14, 20, 24, 28, 34, 40].map((x, i) => {
            // y follows arch y = 38 - 30 * (1 - ((x-24)/18)^2)
            const t = (x - 24) / 18;
            const y = 38 - 30 * (1 - t * t);
            return <Path key={i} {...common} d={`M ${x} ${y - 3} L ${x + 3} ${y} L ${x} ${y + 3} L ${x - 3} ${y} Z`} />;
          })}
        </G>
      );

    // 8 — raven silhouette mid-flight
    case 'Raven Stalker':
      return (
        <G>
          <Path {...common} fill={c} d="M 24 22 Q 30 18 38 22 L 40 26 Q 34 27 28 26 Z" />
          <Path {...common} d="M 10 14 Q 18 20 26 24" />
          <Path {...common} d="M 14 10 Q 22 18 28 22" />
          <Path {...common} d="M 38 26 L 44 30 L 40 30 Z" fill={c} />
          <Circle cx="35" cy="22" r="1" fill={c} />
        </G>
      );

    // 9 — bull head with horns
    case 'Juggernaut':
      return (
        <G>
          <Path {...common} d="M 16 18 Q 16 32 24 38 Q 32 32 32 18 L 28 18 Q 28 24 24 24 Q 20 24 20 18 Z" />
          <Path {...common} d="M 16 18 Q 10 14 6 8" />
          <Path {...common} d="M 32 18 Q 38 14 42 8" />
          <Circle cx="20" cy="26" r="1.3" fill={c} />
          <Circle cx="28" cy="26" r="1.3" fill={c} />
        </G>
      );

    // 10 — lightning bolt over arched back
    case 'Storm Rider':
      return (
        <G>
          <Path {...common} d="M 4 38 Q 24 22 44 38" />
          <Path {...common} fill={c} d="M 28 6 L 18 24 L 24 24 L 20 42 L 32 20 L 26 20 L 32 6 Z" />
        </G>
      );

    // 11 — stacked chevron trail (speed lines)
    case 'Windrunner':
      return (
        <G>
          <Path {...common} d="M 8 16 L 24 8 L 40 16" />
          <Path {...common} d="M 8 26 L 24 18 L 40 26" />
          <Path {...common} d="M 8 36 L 24 28 L 40 36" />
        </G>
      );

    // 12 — dharma spiral
    case 'Void Monk':
      return (
        <G>
          <Circle {...common} cx="24" cy="24" r="18" />
          <Path {...common} d="M 24 10 A 14 14 0 0 1 38 24 A 10 10 0 0 1 28 24 A 6 6 0 0 1 34 24" />
        </G>
      );

    // 13 — coiled serpent
    case 'Serpent Dancer':
      return (
        <G>
          <Path {...common} d="M 10 40 Q 10 28 20 28 Q 30 28 30 20 Q 30 12 22 12 Q 14 12 14 20 Q 14 26 20 26 Q 24 26 24 22" />
          <Path {...common} fill={c} d="M 38 40 L 32 36 L 38 34 L 36 40 Z" />
          <Path {...common} d="M 10 40 L 38 40" />
          <Circle cx="22" cy="16" r="0.9" fill={c} />
        </G>
      );

    // 14 — flame outline
    case 'Flame Herald':
      return (
        <G>
          <Path {...common} d="M 24 6 Q 18 18 18 26 Q 18 38 24 44 Q 30 38 30 26 Q 30 22 28 18 Q 26 20 26 22 Q 26 14 24 6 Z" />
          <Path {...common} d="M 24 20 Q 22 26 22 30 Q 22 34 24 36 Q 26 34 26 30 Q 26 26 24 20 Z" fill={c} />
        </G>
      );

    // 15 — concentric diamond
    case 'Paragon':
      return (
        <G>
          <Path {...common} d="M 24 4 L 44 24 L 24 44 L 4 24 Z" />
          <Path {...common} d="M 24 14 L 34 24 L 24 34 L 14 24 Z" />
          <Circle cx="24" cy="24" r="2" fill={c} />
        </G>
      );

    // 16 — 4-point sunburst (filled)
    case 'Ascendant':
      return (
        <G>
          <Path {...common} fill={c} d="M 24 2 L 26 22 L 22 22 Z" />
          <Path {...common} fill={c} d="M 46 24 L 26 26 L 26 22 Z" />
          <Path {...common} fill={c} d="M 24 46 L 22 26 L 26 26 Z" />
          <Path {...common} fill={c} d="M 2 24 L 22 22 L 22 26 Z" />
          <Circle cx="24" cy="24" r="4" fill={c} />
          <Path {...common} fill={c} d="M 36 12 L 28 22 L 26 20 Z" />
          <Path {...common} fill={c} d="M 12 36 L 20 26 L 22 28 Z" />
          <Path {...common} fill={c} d="M 36 36 L 26 28 L 28 26 Z" />
          <Path {...common} fill={c} d="M 12 12 L 22 20 L 20 22 Z" />
        </G>
      );
  }
}
