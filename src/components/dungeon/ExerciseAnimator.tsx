/**
 * ExerciseAnimator — animated stick figure + form cues.
 * Larger figure with dark dungeon glow aesthetic, matching MuscleMap style.
 * Uses react-native-svg + Reanimated useAnimatedProps to drive live coordinates.
 */
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle, Defs, RadialGradient, Stop, Ellipse, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect, useRef } from 'react';
import { Animated as RNAnimated } from 'react-native';
import { COLORS } from '@/lib/constants';
import type { MuscleGroup } from '@/types';

const AnimatedLine   = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type ExerciseType = 'push' | 'pull' | 'squat' | 'hinge' | 'curl' | 'core' | 'hold';

export function inferExerciseType(name: string, muscles: MuscleGroup[]): ExerciseType {
  const n = name.toLowerCase();
  // Static/isometric holds
  if (n.includes('plank') || n.includes('hang') || n.includes('hold') || n.includes('wall sit') || n.includes('l-sit')) return 'hold';
  if (n.includes('squat') || n.includes('lunge') || n.includes('leg press') || n.includes('step up')) return 'squat';
  if (n.includes('deadlift') || n.includes('rdl') || n.includes('romanian') || n.includes('good morning') || n.includes('hinge')) return 'hinge';
  if (n.includes('curl') || n.includes('bicep') || n.includes('hammer') || n.includes('preacher')) return 'curl';
  if (n.includes('row') || n.includes('pull') || n.includes('chin') || n.includes('lat') || muscles.includes('back')) return 'pull';
  if (n.includes('crunch') || n.includes('ab') || n.includes('sit up') || n.includes('leg raise') || muscles.includes('core')) return 'core';
  return 'push';
}

// ─── Figure geometry (160×210 viewBox) ───────────────────────────────────────
const FIG = {
  HEAD_CY: 32, HEAD_R: 16,
  NECK_Y:  48,
  TORSO_LEN: 56,
  SH_OFFSET: 22,
  UARM: 32,
  FARM: 28,
  ULEG: 44,
  LLEG: 40,
  CX: 80,
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
  hold:  ['Breathe steadily throughout', 'Maintain neutral spine', 'Brace core — don\'t hold breath'],
};

const TYPE_LABELS: Record<ExerciseType, string> = {
  push:  'PUSH MOVEMENT',
  pull:  'PULL MOVEMENT',
  squat: 'SQUAT PATTERN',
  hinge: 'HINGE PATTERN',
  curl:  'CURL / ISOLATION',
  core:  'CORE MOVEMENT',
  hold:  'ISOMETRIC HOLD',
};

const TYPE_COLORS: Record<ExerciseType, string> = {
  push:  '#f59e0b',
  pull:  '#3b82f6',
  squat: '#10b981',
  hinge: '#f97316',
  curl:  '#8b5cf6',
  core:  '#ec4899',
  hold:  '#06b6d4',
};

export default function ExerciseAnimator({ exerciseName, muscles }: ExerciseAnimatorProps) {
  const type = inferExerciseType(exerciseName, muscles);
  const color = TYPE_COLORS[type];

  // Shared animation parameters
  const bodyOffset  = useSharedValue(0);
  const armAngle    = useSharedValue(0);
  const forearmRel  = useSharedValue(0);
  const torsoAngle  = useSharedValue(0);
  const kneeBend    = useSharedValue(0);

  // Glow pulse (RN Animated for opacity, not Reanimated — avoids worklet conflict)
  const glowOpacity = useRef(new RNAnimated.Value(0.3)).current;

  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(glowOpacity, { toValue: 0.7, duration: 1200, useNativeDriver: true }),
        RNAnimated.timing(glowOpacity, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    bodyOffset.value = 0;
    armAngle.value   = 0;
    forearmRel.value = 0;
    torsoAngle.value = 0;
    kneeBend.value   = 0;

    const SLOW = { duration: 1000, easing: Easing.inOut(Easing.quad) };
    const MED  = { duration: 750,  easing: Easing.inOut(Easing.quad) };

    if (type === 'push') {
      armAngle.value = withRepeat(withSequence(withTiming(55, MED), withTiming(20, MED)), -1, false);
      forearmRel.value = withRepeat(withSequence(withTiming(-40, MED), withTiming(30, MED)), -1, false);
    } else if (type === 'pull') {
      armAngle.value = withRepeat(withSequence(withTiming(60, SLOW), withTiming(10, SLOW)), -1, false);
      forearmRel.value = withRepeat(withSequence(withTiming(20, SLOW), withTiming(60, SLOW)), -1, false);
    } else if (type === 'squat') {
      bodyOffset.value = withRepeat(withSequence(withTiming(22, SLOW), withTiming(0, SLOW)), -1, false);
      kneeBend.value   = withRepeat(withSequence(withTiming(0.85, SLOW), withTiming(0, SLOW)), -1, false);
      armAngle.value   = withRepeat(withSequence(withTiming(40, SLOW), withTiming(10, SLOW)), -1, false);
    } else if (type === 'hinge') {
      torsoAngle.value = withRepeat(withSequence(withTiming(38, SLOW), withTiming(0, SLOW)), -1, false);
      kneeBend.value   = withRepeat(withSequence(withTiming(0.25, SLOW), withTiming(0, SLOW)), -1, false);
    } else if (type === 'curl') {
      forearmRel.value = withRepeat(withSequence(withTiming(-110, MED), withTiming(0, MED)), -1, false);
      armAngle.value = -10;
    } else if (type === 'core') {
      torsoAngle.value = withRepeat(withSequence(withTiming(22, MED), withTiming(0, MED)), -1, false);
      kneeBend.value   = withRepeat(withSequence(withTiming(0.55, MED), withTiming(0.1, MED)), -1, false);
    } else if (type === 'hold') {
      // Subtle breathing sway — small torso oscillation only
      bodyOffset.value = withRepeat(withSequence(withTiming(3, { duration: 2000 }), withTiming(0, { duration: 2000 })), -1, false);
    }
  }, [type]);

  // ── Animated props ─────────────────────────────────────────────────────────
  const headProps = useAnimatedProps(() => ({
    cy: FIG.HEAD_CY + bodyOffset.value,
  }));

  const torsoProps = useAnimatedProps(() => {
    'worklet';
    const rad  = (torsoAngle.value * Math.PI) / 180;
    const neckY = FIG.NECK_Y + bodyOffset.value;
    return { x1: FIG.CX, y1: neckY, x2: FIG.CX + Math.sin(rad) * FIG.TORSO_LEN, y2: neckY + Math.cos(rad) * FIG.TORSO_LEN };
  });

  const lShoulderX = FIG.CX - FIG.SH_OFFSET;
  const rShoulderX = FIG.CX + FIG.SH_OFFSET;

  const lUArmProps = useAnimatedProps(() => {
    'worklet';
    const shY = FIG.NECK_Y + 6 + bodyOffset.value;
    const rad = ((armAngle.value - 25) * Math.PI) / 180;
    return { x1: lShoulderX, y1: shY, x2: lShoulderX - Math.sin(rad) * FIG.UARM, y2: shY + Math.cos(rad) * FIG.UARM };
  });

  const lFArmProps = useAnimatedProps(() => {
    'worklet';
    const shY    = FIG.NECK_Y + 6 + bodyOffset.value;
    const uRad   = ((armAngle.value - 25) * Math.PI) / 180;
    const elbowX = lShoulderX - Math.sin(uRad) * FIG.UARM;
    const elbowY = shY + Math.cos(uRad) * FIG.UARM;
    const fRad   = ((armAngle.value - 25 + forearmRel.value) * Math.PI) / 180;
    return { x1: elbowX, y1: elbowY, x2: elbowX - Math.sin(fRad) * FIG.FARM, y2: elbowY + Math.cos(fRad) * FIG.FARM };
  });

  const rUArmProps = useAnimatedProps(() => {
    'worklet';
    const shY = FIG.NECK_Y + 6 + bodyOffset.value;
    const rad = ((armAngle.value - 25) * Math.PI) / 180;
    return { x1: rShoulderX, y1: shY, x2: rShoulderX + Math.sin(rad) * FIG.UARM, y2: shY + Math.cos(rad) * FIG.UARM };
  });

  const rFArmProps = useAnimatedProps(() => {
    'worklet';
    const shY    = FIG.NECK_Y + 6 + bodyOffset.value;
    const uRad   = ((armAngle.value - 25) * Math.PI) / 180;
    const elbowX = rShoulderX + Math.sin(uRad) * FIG.UARM;
    const elbowY = shY + Math.cos(uRad) * FIG.UARM;
    const fRad   = ((armAngle.value - 25 + forearmRel.value) * Math.PI) / 180;
    return { x1: elbowX, y1: elbowY, x2: elbowX + Math.sin(fRad) * FIG.FARM, y2: elbowY + Math.cos(fRad) * FIG.FARM };
  });

  const lULegProps = useAnimatedProps(() => {
    'worklet';
    const tRad = (torsoAngle.value * Math.PI) / 180;
    const hipX = FIG.CX + Math.sin(tRad) * FIG.TORSO_LEN;
    const hipY = FIG.NECK_Y + bodyOffset.value + Math.cos(tRad) * FIG.TORSO_LEN;
    const lean = kneeBend.value * 10;
    return { x1: hipX, y1: hipY, x2: hipX - 8 - lean, y2: hipY + FIG.ULEG * (1 - kneeBend.value * 0.25) };
  });

  const lLLegProps = useAnimatedProps(() => {
    'worklet';
    const tRad  = (torsoAngle.value * Math.PI) / 180;
    const hipX  = FIG.CX + Math.sin(tRad) * FIG.TORSO_LEN;
    const hipY  = FIG.NECK_Y + bodyOffset.value + Math.cos(tRad) * FIG.TORSO_LEN;
    const lean  = kneeBend.value * 10;
    const kneeX = hipX - 8 - lean;
    const kneeY = hipY + FIG.ULEG * (1 - kneeBend.value * 0.25);
    return { x1: kneeX, y1: kneeY, x2: kneeX + kneeBend.value * 8, y2: kneeY + FIG.LLEG };
  });

  const rULegProps = useAnimatedProps(() => {
    'worklet';
    const tRad = (torsoAngle.value * Math.PI) / 180;
    const hipX = FIG.CX + Math.sin(tRad) * FIG.TORSO_LEN;
    const hipY = FIG.NECK_Y + bodyOffset.value + Math.cos(tRad) * FIG.TORSO_LEN;
    const lean = kneeBend.value * 10;
    return { x1: hipX, y1: hipY, x2: hipX + 8 + lean, y2: hipY + FIG.ULEG * (1 - kneeBend.value * 0.25) };
  });

  const rLLegProps = useAnimatedProps(() => {
    'worklet';
    const tRad  = (torsoAngle.value * Math.PI) / 180;
    const hipX  = FIG.CX + Math.sin(tRad) * FIG.TORSO_LEN;
    const hipY  = FIG.NECK_Y + bodyOffset.value + Math.cos(tRad) * FIG.TORSO_LEN;
    const lean  = kneeBend.value * 10;
    const kneeX = hipX + 8 + lean;
    const kneeY = hipY + FIG.ULEG * (1 - kneeBend.value * 0.25);
    return { x1: kneeX, y1: kneeY, x2: kneeX - kneeBend.value * 8, y2: kneeY + FIG.LLEG };
  });

  const sw = 4.5;
  const cues = FORM_CUES[type];
  // Hex color → rgba for gradient
  const glowRgb = color.startsWith('#') ? hexToRgb(color) : '245,158,11';

  return (
    <View style={styles.container}>
      {/* Movement type badge */}
      <View style={[styles.typeBadge, { borderColor: color + '50', backgroundColor: color + '15' }]}>
        <View style={[styles.typeDot, { backgroundColor: color }]} />
        <Text style={[styles.typeLabel, { color }]}>{TYPE_LABELS[type]}</Text>
      </View>

      {/* Animated stick figure with glow */}
      <View style={styles.figureOuter}>
        {/* Glow layer */}
        <RNAnimated.View style={[styles.glowRing, { opacity: glowOpacity, borderColor: color + '60', shadowColor: color }]} />

        <View style={[styles.figureBox, { borderColor: color + '30' }]}>
          <Svg width={160} height={210} viewBox="0 0 160 210">
            <Defs>
              <RadialGradient id="bg" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%"   stopColor={color} stopOpacity={0.12} />
                <Stop offset="70%"  stopColor={color} stopOpacity={0.04} />
                <Stop offset="100%" stopColor="#000000" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            {/* Background glow ellipse */}
            <Ellipse cx={80} cy={110} rx={70} ry={95} fill="url(#bg)" />

            {/* Joints: shoulder dots */}
            <Circle cx={lShoulderX} cy={FIG.NECK_Y + 6} r={3} fill={color} opacity={0.6} />
            <Circle cx={rShoulderX} cy={FIG.NECK_Y + 6} r={3} fill={color} opacity={0.6} />

            {/* Head */}
            <AnimatedCircle animatedProps={headProps} cx={FIG.CX} r={FIG.HEAD_R} stroke={color} strokeWidth={sw} fill="none" />
            {/* Torso */}
            <AnimatedLine animatedProps={torsoProps} stroke={color} strokeWidth={sw} strokeLinecap="round" />
            {/* Left arm */}
            <AnimatedLine animatedProps={lUArmProps} stroke={color} strokeWidth={sw} strokeLinecap="round" />
            <AnimatedLine animatedProps={lFArmProps} stroke={color} strokeWidth={sw - 1} strokeLinecap="round" />
            {/* Right arm */}
            <AnimatedLine animatedProps={rUArmProps} stroke={color} strokeWidth={sw} strokeLinecap="round" />
            <AnimatedLine animatedProps={rFArmProps} stroke={color} strokeWidth={sw - 1} strokeLinecap="round" />
            {/* Left leg */}
            <AnimatedLine animatedProps={lULegProps} stroke={color} strokeWidth={sw} strokeLinecap="round" />
            <AnimatedLine animatedProps={lLLegProps} stroke={color} strokeWidth={sw - 1} strokeLinecap="round" />
            {/* Right leg */}
            <AnimatedLine animatedProps={rULegProps} stroke={color} strokeWidth={sw} strokeLinecap="round" />
            <AnimatedLine animatedProps={rLLegProps} stroke={color} strokeWidth={sw - 1} strokeLinecap="round" />
          </Svg>
        </View>
      </View>

      {/* Form cues */}
      <View style={styles.cuesBox}>
        <Text style={styles.cuesTitle}>FORM CUES</Text>
        {cues.map((cue, i) => (
          <View key={i} style={styles.cueRow}>
            <View style={[styles.cueDot, { backgroundColor: color }]} />
            <Text style={styles.cueText}>{cue}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
  },
  figureOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 180,
    height: 230,
    borderRadius: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 0,
  },
  figureBox: {
    width: 160,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,8,20,0.85)',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cuesBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 14,
    gap: 8,
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
    gap: 10,
  },
  cueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.85,
  },
  cueText: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
    lineHeight: 19,
  },
});
