/**
 * MuscleMap — detailed anatomical front/back body diagram.
 * Primary targeted muscles glow gold with a pulsing animation.
 * Secondary muscles shown in amber. Inactive muscles are dark.
 */
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Ellipse, Rect, Path, Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { COLORS } from '@/lib/constants';
import type { MuscleGroup } from '@/types';

const AnimatedPath    = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedRect    = Animated.createAnimatedComponent(Rect);

const C = {
  primary:   '#f59e0b',
  secondary: '#b45309',
  inactive:  '#1e1830',
  body:      '#1a1528',
  outline:   '#3d3356',
};

type MuscleStatus = 'primary' | 'secondary' | 'inactive';
type Side = 'front' | 'back';

interface MusclePart {
  side: Side;
  type: 'ellipse' | 'path' | 'rect';
  cx?: number; cy?: number; rx?: number; ry?: number;
  d?: string;
  x?: number; y?: number; w?: number; h?: number; rx2?: number;
}

// All coords in 100x200 viewBox
// Body: Head cy=37 r=15, Neck y=51-59, Torso x=28-72 y=60-116
//       L Arm x=14-26 y=60-99, R Arm x=74-86 y=60-99
//       L Leg x=27-46 y=122-168, R Leg x=54-73 y=122-168
//       L Calf x=27-46 y=168-196, R Calf x=54-73 y=168-196
const MUSCLE_DEFS: Record<MuscleGroup, MusclePart[]> = {
  chest: [
    { side: 'front', type: 'path', d: 'M 50 70 Q 50 63 43 62 Q 35 61 31 67 Q 28 73 31 80 Q 35 86 43 86 Q 49 85 50 80 Z' },
    { side: 'front', type: 'path', d: 'M 50 70 Q 50 63 57 62 Q 65 61 69 67 Q 72 73 69 80 Q 65 86 57 86 Q 51 85 50 80 Z' },
  ],
  shoulders: [
    { side: 'front', type: 'path', d: 'M 21 61 Q 14 62 13 70 Q 12 79 16 83 Q 20 86 25 82 Q 28 78 27 69 Q 27 61 21 61 Z' },
    { side: 'front', type: 'path', d: 'M 79 61 Q 86 62 87 70 Q 88 79 84 83 Q 80 86 75 82 Q 72 78 73 69 Q 73 61 79 61 Z' },
    { side: 'back',  type: 'path', d: 'M 20 61 Q 13 62 12 71 Q 11 80 15 84 Q 19 87 24 83 Q 27 79 26 70 Z' },
    { side: 'back',  type: 'path', d: 'M 80 61 Q 87 62 88 71 Q 89 80 85 84 Q 81 87 76 83 Q 73 79 74 70 Z' },
  ],
  biceps: [
    { side: 'front', type: 'path', d: 'M 15 80 Q 12 87 12 93 Q 13 99 16 100 Q 21 102 24 97 Q 26 92 25 86 Q 24 80 20 80 Z' },
    { side: 'front', type: 'path', d: 'M 85 80 Q 88 87 88 93 Q 87 99 84 100 Q 79 102 76 97 Q 74 92 75 86 Q 76 80 80 80 Z' },
  ],
  triceps: [
    { side: 'back', type: 'path', d: 'M 14 62 Q 11 70 11 80 Q 11 91 15 95 Q 19 98 23 94 Q 26 89 25 80 Q 24 70 19 62 Z' },
    { side: 'back', type: 'path', d: 'M 86 62 Q 89 70 89 80 Q 89 91 85 95 Q 81 98 77 94 Q 74 89 75 80 Q 76 70 81 62 Z' },
  ],
  core: [
    // Six-pack blocks
    { side: 'front', type: 'rect', x: 39, y: 71, w: 10, h: 9,  rx2: 3 },
    { side: 'front', type: 'rect', x: 51, y: 71, w: 10, h: 9,  rx2: 3 },
    { side: 'front', type: 'rect', x: 38, y: 84, w: 11, h: 10, rx2: 3 },
    { side: 'front', type: 'rect', x: 51, y: 84, w: 11, h: 10, rx2: 3 },
    { side: 'front', type: 'rect', x: 38, y: 98, w: 11, h: 11, rx2: 3 },
    { side: 'front', type: 'rect', x: 51, y: 98, w: 11, h: 11, rx2: 3 },
    // Obliques
    { side: 'front', type: 'path', d: 'M 30 80 Q 27 90 28 100 Q 29 109 34 113 L 40 113 L 39 100 Q 39 90 38 80 Z' },
    { side: 'front', type: 'path', d: 'M 70 80 Q 73 90 72 100 Q 71 109 66 113 L 60 113 L 61 100 Q 61 90 62 80 Z' },
    // Back core (erector spinae) shown faintly
    { side: 'back', type: 'path', d: 'M 41 85 Q 39 95 40 106 Q 41 114 45 116 L 49 116 Q 49 110 49 99 Q 48 89 48 85 Z' },
    { side: 'back', type: 'path', d: 'M 51 85 Q 51 89 52 99 Q 51 110 51 116 L 55 116 Q 59 114 60 106 Q 61 95 59 85 Z' },
  ],
  back: [
    // Trapezius
    { side: 'back', type: 'path', d: 'M 32 61 L 50 55 L 68 61 L 71 79 L 50 85 L 29 79 Z' },
    // Left lat
    { side: 'back', type: 'path', d: 'M 27 64 Q 19 75 21 92 Q 23 107 30 115 L 44 115 L 43 90 Q 41 74 34 66 Z' },
    // Right lat
    { side: 'back', type: 'path', d: 'M 73 64 Q 81 75 79 92 Q 77 107 70 115 L 56 115 L 57 90 Q 59 74 66 66 Z' },
  ],
  quads: [
    // Left quad — outer sweep + inner VMO teardrop
    { side: 'front', type: 'path', d: 'M 29 124 Q 26 140 27 154 Q 28 164 33 167 L 39 167 Q 39 155 38 143 Q 37 131 37 124 Z' },
    { side: 'front', type: 'path', d: 'M 37 124 Q 38 138 38 150 Q 38 160 39 167 L 45 167 Q 47 161 47 149 Q 46 137 46 124 Z' },
    { side: 'front', type: 'path', d: 'M 38 152 Q 37 160 38 167 L 44 167 Q 46 163 46 157 Q 45 151 41 151 Z' },
    // Right quad
    { side: 'front', type: 'path', d: 'M 71 124 Q 74 140 73 154 Q 72 164 67 167 L 61 167 Q 61 155 62 143 Q 63 131 63 124 Z' },
    { side: 'front', type: 'path', d: 'M 63 124 Q 62 137 62 149 Q 62 160 61 167 L 55 167 Q 53 161 53 149 Q 54 137 54 124 Z' },
    { side: 'front', type: 'path', d: 'M 56 157 Q 54 163 55 167 L 62 167 Q 63 160 62 152 Q 59 151 56 157 Z' },
  ],
  hamstrings: [
    { side: 'back', type: 'path', d: 'M 29 124 Q 27 140 28 155 Q 29 165 34 168 L 44 168 Q 46 162 46 148 Q 45 134 44 124 Z' },
    { side: 'back', type: 'path', d: 'M 71 124 Q 73 140 72 155 Q 71 165 66 168 L 56 168 Q 54 162 54 148 Q 55 134 56 124 Z' },
  ],
  glutes: [
    { side: 'back', type: 'path', d: 'M 29 120 Q 24 128 25 139 Q 28 148 37 147 Q 46 145 47 137 Q 47 126 46 120 Z' },
    { side: 'back', type: 'path', d: 'M 71 120 Q 76 128 75 139 Q 72 148 63 147 Q 54 145 53 137 Q 53 126 54 120 Z' },
  ],
  calves: [
    // Front (tibialis anterior)
    { side: 'front', type: 'path', d: 'M 29 168 Q 26 178 27 188 Q 29 195 35 196 L 42 196 Q 44 190 43 180 Q 43 170 43 168 Z' },
    { side: 'front', type: 'path', d: 'M 57 168 Q 57 170 57 180 Q 57 190 59 196 L 66 196 Q 72 195 73 188 Q 74 178 71 168 Z' },
    // Back (gastrocnemius — fuller)
    { side: 'back', type: 'path', d: 'M 28 168 Q 25 178 26 188 Q 28 196 35 197 L 42 197 Q 45 191 44 181 Q 44 170 44 168 Z' },
    { side: 'back', type: 'path', d: 'M 56 168 Q 56 170 56 181 Q 55 191 58 197 L 65 197 Q 72 196 74 188 Q 75 178 72 168 Z' },
  ],
};

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest:      'Pectorals',
  shoulders:  'Deltoids',
  biceps:     'Biceps',
  triceps:    'Triceps',
  core:       'Core / Abs',
  back:       'Lats & Traps',
  quads:      'Quadriceps',
  hamstrings: 'Hamstrings',
  glutes:     'Glutes',
  calves:     'Calves',
};

function BodySilhouette({ side }: { side: Side }) {
  const fill   = C.body;
  const stroke = C.outline;
  const sw     = 1.4;
  return (
    <G>
      <Circle cx={50} cy={37} r={15} fill={fill} stroke={stroke} strokeWidth={sw} />
      <Rect x={44} y={51} width={12} height={8} rx={4} fill={fill} stroke={stroke} strokeWidth={sw} />
      <Path
        d="M 28 60 L 72 60 Q 74 60 74 63 L 72 92 Q 71 97 70 100 Q 69 105 70 108 L 71 116 L 29 116 L 30 108 Q 31 105 30 100 Q 29 97 28 92 L 26 63 Q 26 60 28 60 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}
      />
      <Path d="M 14 61 Q 10 62 10 70 L 11 96 Q 12 100 15 99 L 26 99 L 25 70 Q 24 62 20 61 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
      <Path d="M 86 61 Q 90 62 90 70 L 89 96 Q 88 100 85 99 L 74 99 L 75 70 Q 76 62 80 61 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
      <Path d="M 11 98 Q 9 106 10 116 L 14 118 Q 16 113 15 98 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
      <Path d="M 89 98 Q 91 106 90 116 L 86 118 Q 84 113 85 98 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
      <Path d="M 29 116 L 71 116 L 73 122 L 27 122 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
      <Path d="M 27 122 Q 25 138 26 154 L 27 168 L 46 168 Q 47 152 47 136 L 46 122 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
      <Path d="M 73 122 Q 75 138 74 154 L 73 168 L 54 168 Q 53 152 53 136 L 54 122 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
      <Path d="M 27 168 Q 25 178 26 188 Q 28 196 35 197 L 44 197 Q 46 191 46 181 L 46 168 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
      <Path d="M 73 168 Q 75 178 74 188 Q 72 196 65 197 L 56 197 Q 54 191 54 181 L 54 168 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
      {side === 'back' && <Path d="M 50 60 L 50 116" stroke={C.outline} strokeWidth={0.8} opacity={0.6} />}
      {side === 'front' && (
        <>
          <Path d="M 50 68 L 50 114" stroke={C.outline} strokeWidth={0.7} opacity={0.45} />
          <Path d="M 39 80 L 61 80" stroke={C.outline} strokeWidth={0.5} opacity={0.3} />
          <Path d="M 38 93 L 62 93" stroke={C.outline} strokeWidth={0.5} opacity={0.3} />
        </>
      )}
    </G>
  );
}

function MuscleShape({ part, status, pulseOpacity }: {
  part: MusclePart;
  status: MuscleStatus;
  pulseOpacity: ReturnType<typeof useSharedValue<number>>;
}) {
  const baseOpacity = status === 'primary' ? 0.87 : status === 'secondary' ? 0.52 : 0.18;
  const fill        = status === 'primary' ? C.primary : status === 'secondary' ? C.secondary : C.inactive;

  const animProps = useAnimatedProps(() => ({
    opacity: status === 'primary' ? pulseOpacity.value : baseOpacity,
  }));

  if (part.type === 'path') {
    return <AnimatedPath d={part.d!} fill={fill} animatedProps={animProps} />;
  }
  if (part.type === 'ellipse') {
    return <AnimatedEllipse cx={part.cx!} cy={part.cy!} rx={part.rx!} ry={part.ry!} fill={fill} animatedProps={animProps} />;
  }
  return <AnimatedRect x={part.x!} y={part.y!} width={part.w!} height={part.h!} rx={part.rx2 ?? 0} fill={fill} animatedProps={animProps} />;
}

function BodyView({ side, primaries, secondaries, pulseOpacity }: {
  side: Side;
  primaries: MuscleGroup[];
  secondaries: MuscleGroup[];
  pulseOpacity: ReturnType<typeof useSharedValue<number>>;
}) {
  function getStatus(muscle: MuscleGroup): MuscleStatus {
    if (primaries.includes(muscle))   return 'primary';
    if (secondaries.includes(muscle)) return 'secondary';
    return 'inactive';
  }
  return (
    <Svg width={100} height={200} viewBox="0 0 100 200">
      <BodySilhouette side={side} />
      {(Object.keys(MUSCLE_DEFS) as MuscleGroup[]).map(muscle =>
        MUSCLE_DEFS[muscle]
          .filter(p => p.side === side)
          .map((part, i) => (
            <MuscleShape key={`${muscle}-${i}`} part={part} status={getStatus(muscle)} pulseOpacity={pulseOpacity} />
          ))
      )}
    </Svg>
  );
}

interface MuscleMapProps {
  targets: MuscleGroup[];
  secondary?: MuscleGroup[];
}

export default function MuscleMap({ targets, secondary = [] }: MuscleMapProps) {
  const pulseOpacity = useSharedValue(0.87);

  useEffect(() => {
    if (targets.length === 0) return;
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.52, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.95, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false,
    );
  }, [targets.length]);

  return (
    <View style={styles.container}>
      <View style={styles.bodiesRow}>
        <View style={styles.bodyCol}>
          <BodyView side="front" primaries={targets} secondaries={secondary} pulseOpacity={pulseOpacity} />
          <Text style={styles.sideLabel}>FRONT</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.bodyCol}>
          <BodyView side="back" primaries={targets} secondaries={secondary} pulseOpacity={pulseOpacity} />
          <Text style={styles.sideLabel}>BACK</Text>
        </View>
      </View>

      <View style={styles.chipsSection}>
        {targets.length > 0 && (
          <>
            <Text style={styles.chipSectionLabel}>PRIMARY MUSCLES</Text>
            <View style={styles.chips}>
              {targets.map(m => (
                <View key={m} style={[styles.chip, styles.chipPrimary]}>
                  <View style={[styles.chipDot, { backgroundColor: C.primary }]} />
                  <Text style={[styles.chipText, { color: C.primary }]}>{MUSCLE_LABELS[m]}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        {secondary.length > 0 && (
          <>
            <Text style={[styles.chipSectionLabel, { marginTop: 6 }]}>STABILISERS</Text>
            <View style={styles.chips}>
              {secondary.map(m => (
                <View key={m} style={[styles.chip, styles.chipSecondary]}>
                  <View style={[styles.chipDot, { backgroundColor: C.secondary }]} />
                  <Text style={[styles.chipText, { color: C.secondary }]}>{MUSCLE_LABELS[m]}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { alignItems: 'center', gap: 12, width: '100%' },
  bodiesRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  bodyCol:    { alignItems: 'center', gap: 4 },
  sideLabel:  { fontSize: 10, color: COLORS.textMuted, letterSpacing: 1.5, fontWeight: '700' },
  divider:    { width: 1, height: 140, backgroundColor: COLORS.border },
  chipsSection: { alignItems: 'center', gap: 6, width: '100%' },
  chipSectionLabel: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2, fontWeight: '700' },
  chips:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  chipPrimary:   { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.4)' },
  chipSecondary: { backgroundColor: 'rgba(180,83,9,0.10)',   borderColor: 'rgba(180,83,9,0.30)' },
  chipDot:    { width: 6, height: 6, borderRadius: 3 },
  chipText:   { fontSize: 11, fontWeight: '700' },
});
