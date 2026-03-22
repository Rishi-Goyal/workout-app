/**
 * MuscleMap — simplified front/back body diagram using react-native-svg.
 * Highlighted muscle groups glow gold; secondary muscles glow dimmer.
 */
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Ellipse, Rect, Path, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { useEffect } from 'react';
import { COLORS } from '@/lib/constants';
import type { MuscleGroup } from '@/types';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const MUSCLE_COLOR = {
  primary:   '#f59e0b',  // gold
  secondary: '#78350f',  // dim amber
  inactive:  '#2a2035',  // surface-dark
  outline:   '#3d3356',
};

type Side = 'front' | 'back';

interface MuscleDef {
  side: Side;
  label: string;
  shape: 'ellipse' | 'rect';
  cx?: number; cy?: number; rx?: number; ry?: number;
  x?: number;  y?: number;  w?: number;  h?: number;
  r?: number;
}

// All coordinates are within a 100×200 viewBox
const MUSCLE_DEFS: Record<MuscleGroup, MuscleDef[]> = {
  chest: [
    { side: 'front', label: 'Chest', shape: 'ellipse', cx: 50, cy: 72, rx: 18, ry: 10 },
  ],
  shoulders: [
    { side: 'front', label: 'L Shoulder', shape: 'ellipse', cx: 27, cy: 62, rx: 9, ry: 9 },
    { side: 'front', label: 'R Shoulder', shape: 'ellipse', cx: 73, cy: 62, rx: 9, ry: 9 },
  ],
  back: [
    { side: 'back', label: 'Back', shape: 'ellipse', cx: 50, cy: 78, rx: 20, ry: 16 },
  ],
  biceps: [
    { side: 'front', label: 'L Bicep', shape: 'ellipse', cx: 19, cy: 80, rx: 6, ry: 10 },
    { side: 'front', label: 'R Bicep', shape: 'ellipse', cx: 81, cy: 80, rx: 6, ry: 10 },
  ],
  triceps: [
    { side: 'back', label: 'L Tricep', shape: 'ellipse', cx: 19, cy: 80, rx: 6, ry: 10 },
    { side: 'back', label: 'R Tricep', shape: 'ellipse', cx: 81, cy: 80, rx: 6, ry: 10 },
  ],
  core: [
    { side: 'front', label: 'Core', shape: 'ellipse', cx: 50, cy: 94, rx: 13, ry: 12 },
  ],
  quads: [
    { side: 'front', label: 'L Quad', shape: 'ellipse', cx: 40, cy: 140, rx: 9, ry: 18 },
    { side: 'front', label: 'R Quad', shape: 'ellipse', cx: 60, cy: 140, rx: 9, ry: 18 },
  ],
  hamstrings: [
    { side: 'back', label: 'L Hamstring', shape: 'ellipse', cx: 40, cy: 140, rx: 9, ry: 18 },
    { side: 'back', label: 'R Hamstring', shape: 'ellipse', cx: 60, cy: 140, rx: 9, ry: 18 },
  ],
  glutes: [
    { side: 'back', label: 'Glutes', shape: 'ellipse', cx: 50, cy: 112, rx: 18, ry: 11 },
  ],
  calves: [
    { side: 'front', label: 'L Calf', shape: 'ellipse', cx: 40, cy: 174, rx: 7, ry: 12 },
    { side: 'front', label: 'R Calf', shape: 'ellipse', cx: 60, cy: 174, rx: 7, ry: 12 },
  ],
};

function getMuscleStatus(muscle: MuscleGroup, targets: MuscleGroup[]): 'primary' | 'inactive' {
  return targets.includes(muscle) ? 'primary' : 'inactive';
}

function BodySVG({ side, targets }: { side: Side; targets: MuscleGroup[] }) {
  // Determine which muscles are active on this side
  const activeMuscles = Object.entries(MUSCLE_DEFS).filter(([muscle, defs]) =>
    defs.some(d => d.side === side) && targets.includes(muscle as MuscleGroup)
  ).map(([m]) => m as MuscleGroup);

  return (
    <Svg width="100" height="200" viewBox="0 0 100 200">
      {/* Body outline — head */}
      <Circle cx={50} cy={38} r={16} fill={COLORS.surface} stroke={MUSCLE_COLOR.outline} strokeWidth={1.5} />
      {/* Neck */}
      <Rect x={44} y={52} width={12} height={8} fill={COLORS.surface} />
      {/* Torso */}
      <Rect x={30} y={58} width={40} height={60} rx={8} fill={COLORS.surface} stroke={MUSCLE_COLOR.outline} strokeWidth={1.5} />
      {/* Left arm */}
      <Rect x={14} y={60} width={14} height={42} rx={6} fill={COLORS.surface} stroke={MUSCLE_COLOR.outline} strokeWidth={1.2} />
      {/* Right arm */}
      <Rect x={72} y={60} width={14} height={42} rx={6} fill={COLORS.surface} stroke={MUSCLE_COLOR.outline} strokeWidth={1.2} />
      {/* Left leg */}
      <Rect x={31} y={118} width={17} height={68} rx={7} fill={COLORS.surface} stroke={MUSCLE_COLOR.outline} strokeWidth={1.2} />
      {/* Right leg */}
      <Rect x={52} y={118} width={17} height={68} rx={7} fill={COLORS.surface} stroke={MUSCLE_COLOR.outline} strokeWidth={1.2} />

      {/* Muscle overlays */}
      {(Object.keys(MUSCLE_DEFS) as MuscleGroup[]).map((muscle) =>
        MUSCLE_DEFS[muscle]
          .filter(d => d.side === side)
          .map((d, i) => {
            const status = getMuscleStatus(muscle, targets);
            const fill = status === 'primary' ? MUSCLE_COLOR.primary : MUSCLE_COLOR.inactive;
            const opacity = status === 'primary' ? 0.85 : 0.25;
            return (
              <Ellipse
                key={`${muscle}-${i}`}
                cx={d.cx}
                cy={d.cy}
                rx={d.rx}
                ry={d.ry}
                fill={fill}
                opacity={opacity}
              />
            );
          })
      )}
    </Svg>
  );
}

interface MuscleMapProps {
  targets: MuscleGroup[];
}

export default function MuscleMap({ targets }: MuscleMapProps) {
  const hasFrontMuscle = targets.some(t =>
    MUSCLE_DEFS[t]?.some(d => d.side === 'front')
  );
  const hasBackMuscle = targets.some(t =>
    MUSCLE_DEFS[t]?.some(d => d.side === 'back')
  );

  return (
    <View style={styles.container}>
      {/* Front */}
      <View style={styles.bodyWrapper}>
        <BodySVG side="front" targets={targets} />
        <Text style={styles.sideLabel}>Front</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Back */}
      <View style={styles.bodyWrapper}>
        <BodySVG side="back" targets={targets} />
        <Text style={styles.sideLabel}>Back</Text>
      </View>

      {/* Muscle chips */}
      <View style={styles.chipsRow}>
        {targets.map(m => (
          <View key={m} style={styles.chip}>
            <View style={styles.chipDot} />
            <Text style={styles.chipText}>{m}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  bodyWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  sideLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    width: 1,
    height: 120,
    backgroundColor: COLORS.border,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
  },
  chipText: {
    fontSize: 11,
    color: COLORS.gold,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
});
