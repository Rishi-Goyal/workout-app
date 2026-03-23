/**
 * ExerciseAnimator — animated stick figure + form cues.
 * Uses react-native-svg + Reanimated useAnimatedProps to drive live coordinates.
 */
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle, G } from 'react-native-svg';
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

const AnimatedLine   = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type ExerciseType = 'push' | 'pull' | 'squat' | 'hinge' | 'curl' | 'core';

export function inferExerciseType(name: string, muscles: MuscleGroup[]): ExerciseType {
  const n = name.toLowerCase();
  if (n.includes('squat') || n.includes('lunge') || n.includes('leg press') || n.includes('step up')) return 'squat';
  if (n.includes('deadlift') || n.includes('rdl') || n.includes('romanian') || n.includes('good morning') || n.includes('hinge')) return 'hinge';
  if (n.includes('curl') || n.includes('bicep') || n.includes('hammer') || n.includes('preacher')) return 'curl';
  if (n.includes('row') || n.includes('pull') || n.includes('chin') || n.includes('lat') || muscles.includes('back')) return 'pull';
  if (n.includes('crunch') || n.includes('plank') || n.includes('ab') || n.includes('sit up') || n.includes('leg raise') || muscles.includes('core')) return 'core';
  return 'push';
}

// ─── Figure geometry (100×150 viewBox) ───────────────────────────────────────
const FIG = {
  HEAD_CY: 16, HEAD_R: 10,
  NECK_Y:  26,
  TORSO_LEN: 36,   // neck → hip
  SH_OFFSET: 14,   // shoulder x offset from center (50)
  UARM: 20,        // upper arm length
  FARM: 17,        // forearm length
  ULEG: 28,        // upper leg length
  LLEG: 26,        // lower leg length
  CX: 50,
};

interface ExerciseAnimatorProps {
  exerciseName: string;
  muscles: MuscleGroup[];
}

// ─── Form cues per exercise type ─────────────────────────────────────────────
const FORM_CUES: Record<ExerciseType, string[]> = {
  push:  ['Retract shoulder blades', 'Lower under control', 'Full range of motion'],
  pull:  ['Initiate with lats not arms', 'Full stretch at bottom', 'Drive elbows to hips'],
  squat: ['Chest up, brace core', 'Knees track over toes', 'Drive through full foot'],
  hinge: ['Hinge at hips first', 'Maintain neutral spine', 'Drive hips forward at top'],
  curl:  ['Upper arms stay fixed', 'Squeeze hard at top', 'Slow controlled negative'],
  core:  ['Exhale on contraction', 'Lower back stays grounded', 'Quality over quantity'],
};

const TYPE_LABELS: Record<ExerciseType, string> = {
  push:  'PUSH MOVEMENT',
  pull:  'PULL MOVEMENT',
  squat: 'SQUAT PATTERN',
  hinge: 'HINGE PATTERN',
  curl:  'CURL / ISOLATION',
  core:  'CORE MOVEMENT',
};

// ─── Worklet helpers ──────────────────────────────────────────────────────────
// Compute stick figure line coordinates given animation parameters
// All values computed in worklets (no JS thread access)

export default function ExerciseAnimator({ exerciseName, muscles }: ExerciseAnimatorProps) {
  const type = inferExerciseType(exerciseName, muscles);

  // Shared animation parameters
  const bodyOffset  = useSharedValue(0);  // vertical body shift (squat)
  const armAngle    = useSharedValue(0);  // upper arm angle from hanging (degrees)
  const forearmRel  = useSharedValue(0);  // forearm angle relative to upper arm
  const torsoAngle  = useSharedValue(0);  // forward torso tilt (degrees)
  const kneeBend    = useSharedValue(0);  // knee bend 0–1

  useEffect(() => {
    // Reset all
    bodyOffset.value = 0;
    armAngle.value   = 0;
    forearmRel.value = 0;
    torsoAngle.value = 0;
    kneeBend.value   = 0;

    const SLOW = { duration: 900, easing: Easing.inOut(Easing.quad) };
    const MED  = { duration: 700, easing: Easing.inOut(Easing.quad) };

    if (type === 'push') {
      // Arms sweep forward (pushing away)
      armAngle.value = withRepeat(withSequence(
        withTiming(55, MED),
        withTiming(20, MED),
      ), -1, false);
      forearmRel.value = withRepeat(withSequence(
        withTiming(-40, MED),
        withTiming(30, MED),
      ), -1, false);
    } else if (type === 'pull') {
      // Arms start overhead and pull down
      armAngle.value = withRepeat(withSequence(
        withTiming(60, SLOW),
        withTiming(10, SLOW),
      ), -1, false);
      forearmRel.value = withRepeat(withSequence(
        withTiming(20, SLOW),
        withTiming(60, SLOW),
      ), -1, false);
    } else if (type === 'squat') {
      bodyOffset.value = withRepeat(withSequence(
        withTiming(18, SLOW),
        withTiming(0,  SLOW),
      ), -1, false);
      kneeBend.value = withRepeat(withSequence(
        withTiming(0.85, SLOW),
        withTiming(0,    SLOW),
      ), -1, false);
      armAngle.value = withRepeat(withSequence(
        withTiming(40, SLOW),
        withTiming(10, SLOW),
      ), -1, false);
    } else if (type === 'hinge') {
      torsoAngle.value = withRepeat(withSequence(
        withTiming(38, SLOW),
        withTiming(0,  SLOW),
      ), -1, false);
      kneeBend.value = withRepeat(withSequence(
        withTiming(0.25, SLOW),
        withTiming(0,    SLOW),
      ), -1, false);
    } else if (type === 'curl') {
      forearmRel.value = withRepeat(withSequence(
        withTiming(-110, MED),
        withTiming(0,    MED),
      ), -1, false);
      armAngle.value = -10; // arms slightly behind body
    } else if (type === 'core') {
      torsoAngle.value = withRepeat(withSequence(
        withTiming(22, MED),
        withTiming(0,  MED),
      ), -1, false);
      kneeBend.value = withRepeat(withSequence(
        withTiming(0.55, MED),
        withTiming(0.1,  MED),
      ), -1, false);
    }
  }, [type]);

  // ── Head ──────────────────────────────────────────────────────────────────
  const headProps = useAnimatedProps(() => ({
    cy: FIG.HEAD_CY + bodyOffset.value,
  }));

  // ── Torso (two points: neckY, hipX/hipY) ──────────────────────────────────
  const torsoProps = useAnimatedProps(() => {
    'worklet';
    const rad    = (torsoAngle.value * Math.PI) / 180;
    const neckY  = FIG.NECK_Y + bodyOffset.value;
    const hipX   = FIG.CX + Math.sin(rad) * FIG.TORSO_LEN;
    const hipY   = neckY + Math.cos(rad) * FIG.TORSO_LEN;
    return { x1: FIG.CX, y1: neckY, x2: hipX, y2: hipY };
  });

  // ── Left upper arm ─────────────────────────────────────────────────────────
  const lShoulderX = FIG.CX - FIG.SH_OFFSET;
  const lUArmProps = useAnimatedProps(() => {
    'worklet';
    const shY    = FIG.NECK_Y + 4 + bodyOffset.value;
    const rad    = ((armAngle.value - 25) * Math.PI) / 180; // -25 = resting slightly outward
    return {
      x1: lShoulderX,  y1: shY,
      x2: lShoulderX - Math.sin(rad) * FIG.UARM,
      y2: shY + Math.cos(rad) * FIG.UARM,
    };
  });

  const lFArmProps = useAnimatedProps(() => {
    'worklet';
    const shY      = FIG.NECK_Y + 4 + bodyOffset.value;
    const uRad     = ((armAngle.value - 25) * Math.PI) / 180;
    const elbowX   = lShoulderX - Math.sin(uRad) * FIG.UARM;
    const elbowY   = shY + Math.cos(uRad) * FIG.UARM;
    const fRad     = ((armAngle.value - 25 + forearmRel.value) * Math.PI) / 180;
    return {
      x1: elbowX, y1: elbowY,
      x2: elbowX - Math.sin(fRad) * FIG.FARM,
      y2: elbowY + Math.cos(fRad) * FIG.FARM,
    };
  });

  // ── Right upper arm (mirror) ───────────────────────────────────────────────
  const rShoulderX = FIG.CX + FIG.SH_OFFSET;
  const rUArmProps = useAnimatedProps(() => {
    'worklet';
    const shY  = FIG.NECK_Y + 4 + bodyOffset.value;
    const rad  = ((armAngle.value - 25) * Math.PI) / 180;
    return {
      x1: rShoulderX, y1: shY,
      x2: rShoulderX + Math.sin(rad) * FIG.UARM,
      y2: shY + Math.cos(rad) * FIG.UARM,
    };
  });

  const rFArmProps = useAnimatedProps(() => {
    'worklet';
    const shY      = FIG.NECK_Y + 4 + bodyOffset.value;
    const uRad     = ((armAngle.value - 25) * Math.PI) / 180;
    const elbowX   = rShoulderX + Math.sin(uRad) * FIG.UARM;
    const elbowY   = shY + Math.cos(uRad) * FIG.UARM;
    const fRad     = ((armAngle.value - 25 + forearmRel.value) * Math.PI) / 180;
    return {
      x1: elbowX, y1: elbowY,
      x2: elbowX + Math.sin(fRad) * FIG.FARM,
      y2: elbowY + Math.cos(fRad) * FIG.FARM,
    };
  });

  // ── Left upper leg ─────────────────────────────────────────────────────────
  const lULegProps = useAnimatedProps(() => {
    'worklet';
    const tRad   = (torsoAngle.value * Math.PI) / 180;
    const hipX   = FIG.CX + Math.sin(tRad) * FIG.TORSO_LEN;
    const hipY   = FIG.NECK_Y + bodyOffset.value + Math.cos(tRad) * FIG.TORSO_LEN;
    const lean   = kneeBend.value * 8;
    return {
      x1: hipX, y1: hipY,
      x2: hipX - 6 - lean,
      y2: hipY + FIG.ULEG * (1 - kneeBend.value * 0.25),
    };
  });

  const lLLegProps = useAnimatedProps(() => {
    'worklet';
    const tRad   = (torsoAngle.value * Math.PI) / 180;
    const hipX   = FIG.CX + Math.sin(tRad) * FIG.TORSO_LEN;
    const hipY   = FIG.NECK_Y + bodyOffset.value + Math.cos(tRad) * FIG.TORSO_LEN;
    const lean   = kneeBend.value * 8;
    const kneeX  = hipX - 6 - lean;
    const kneeY  = hipY + FIG.ULEG * (1 - kneeBend.value * 0.25);
    return {
      x1: kneeX, y1: kneeY,
      x2: kneeX + kneeBend.value * 6,
      y2: kneeY + FIG.LLEG,
    };
  });

  // ── Right upper leg (mirror) ───────────────────────────────────────────────
  const rULegProps = useAnimatedProps(() => {
    'worklet';
    const tRad   = (torsoAngle.value * Math.PI) / 180;
    const hipX   = FIG.CX + Math.sin(tRad) * FIG.TORSO_LEN;
    const hipY   = FIG.NECK_Y + bodyOffset.value + Math.cos(tRad) * FIG.TORSO_LEN;
    const lean   = kneeBend.value * 8;
    return {
      x1: hipX, y1: hipY,
      x2: hipX + 6 + lean,
      y2: hipY + FIG.ULEG * (1 - kneeBend.value * 0.25),
    };
  });

  const rLLegProps = useAnimatedProps(() => {
    'worklet';
    const tRad   = (torsoAngle.value * Math.PI) / 180;
    const hipX   = FIG.CX + Math.sin(tRad) * FIG.TORSO_LEN;
    const hipY   = FIG.NECK_Y + bodyOffset.value + Math.cos(tRad) * FIG.TORSO_LEN;
    const lean   = kneeBend.value * 8;
    const kneeX  = hipX + 6 + lean;
    const kneeY  = hipY + FIG.ULEG * (1 - kneeBend.value * 0.25);
    return {
      x1: kneeX, y1: kneeY,
      x2: kneeX - kneeBend.value * 6,
      y2: kneeY + FIG.LLEG,
    };
  });

  const strokeW = 3.5;
  const color   = COLORS.gold;
  const cues    = FORM_CUES[type];

  return (
    <View style={styles.container}>
      {/* Type badge */}
      <View style={styles.typeBadge}>
        <Text style={styles.typeLabel}>{TYPE_LABELS[type]}</Text>
      </View>

      {/* Animated stick figure */}
      <View style={styles.figureBox}>
        <Svg width={110} height={150} viewBox="0 0 100 150">
          {/* Head */}
          <AnimatedCircle animatedProps={headProps} cx={FIG.CX} r={FIG.HEAD_R} stroke={color} strokeWidth={strokeW} fill="none" />
          {/* Torso */}
          <AnimatedLine animatedProps={torsoProps} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
          {/* Arms */}
          <AnimatedLine animatedProps={lUArmProps} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
          <AnimatedLine animatedProps={lFArmProps} stroke={color} strokeWidth={strokeW - 0.5} strokeLinecap="round" />
          <AnimatedLine animatedProps={rUArmProps} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
          <AnimatedLine animatedProps={rFArmProps} stroke={color} strokeWidth={strokeW - 0.5} strokeLinecap="round" />
          {/* Legs */}
          <AnimatedLine animatedProps={lULegProps} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
          <AnimatedLine animatedProps={lLLegProps} stroke={color} strokeWidth={strokeW - 0.5} strokeLinecap="round" />
          <AnimatedLine animatedProps={rULegProps} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
          <AnimatedLine animatedProps={rLLegProps} stroke={color} strokeWidth={strokeW - 0.5} strokeLinecap="round" />
        </Svg>
      </View>

      {/* Exercise name */}
      <Text style={styles.exerciseName}>{exerciseName}</Text>

      {/* Form cues */}
      <View style={styles.cuesBox}>
        <Text style={styles.cuesTitle}>FORM CUES</Text>
        {cues.map((cue, i) => (
          <View key={i} style={styles.cueRow}>
            <View style={styles.cueDot} />
            <Text style={styles.cueText}>{cue}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  typeBadge: {
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
  },
  typeLabel: {
    fontSize: 10,
    color: COLORS.gold,
    letterSpacing: 2,
    fontWeight: '700',
  },
  figureBox: {
    width: 110,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,158,11,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.12)',
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  cuesBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    gap: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cuesTitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 2,
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cueDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
    opacity: 0.7,
  },
  cueText: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
    lineHeight: 18,
  },
});
