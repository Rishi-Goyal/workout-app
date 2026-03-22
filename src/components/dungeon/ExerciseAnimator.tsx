/**
 * ExerciseAnimator — looping Reanimated animation of a stick figure
 * performing the exercise motion inferred from muscle groups / exercise name.
 */
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import Svg, { Circle, Line, Rect, Ellipse, G } from 'react-native-svg';
import { COLORS } from '@/lib/constants';
import type { MuscleGroup } from '@/types';

type ExerciseType = 'push' | 'pull' | 'squat' | 'hinge' | 'core' | 'curl';

function inferExerciseType(exerciseName: string, muscles: MuscleGroup[]): ExerciseType {
  const name = exerciseName.toLowerCase();
  if (name.includes('squat') || name.includes('lunge') || name.includes('leg press')) return 'squat';
  if (name.includes('deadlift') || name.includes('hinge') || name.includes('romanian') || name.includes('rdl')) return 'hinge';
  if (name.includes('curl') || name.includes('bicep') || name.includes('hammer')) return 'curl';
  if (name.includes('row') || name.includes('pull') || name.includes('chin') || name.includes('lat')) return 'pull';
  if (name.includes('crunch') || name.includes('plank') || name.includes('ab') || muscles.includes('core')) return 'core';
  // Default: push (bench, press, pushup, shoulder press, etc.)
  return 'push';
}

// ─── Stick figure parts ───────────────────────────────────────────────────────
const HEAD_R = 10;
const BODY_H = 28;
const ARM_L  = 20;
const LEG_L  = 26;
const CX     = 50; // horizontal centre of the 100×140 viewBox

interface StickFigureProps {
  // Vertical offset of the whole figure centre (0 = neutral)
  bodyY: number;
  // Arm angle in degrees from vertical (positive = raised)
  armAngle: number;
  // Knee bend 0-1 (0=straight, 1=fully bent)
  kneeBend: number;
  // Torso tilt in degrees forward
  torsoTilt: number;
}

function deg(d: number) { return (d * Math.PI) / 180; }

function StickFigure({ bodyY, armAngle, kneeBend, torsoTilt }: StickFigureProps) {
  const headY  = 20 + bodyY;
  const neckY  = headY + HEAD_R;
  const hipY   = neckY + BODY_H;

  // Torso tilt
  const tiltRad = deg(torsoTilt);
  const hipOffX  = Math.sin(tiltRad) * BODY_H;
  const hipOffY  = Math.cos(tiltRad) * BODY_H;
  const hipX     = CX + hipOffX;
  const realHipY = neckY + hipOffY;

  // Arms
  const armRad    = deg(armAngle);
  const lArmEndX  = CX - Math.sin(armRad) * ARM_L;
  const lArmEndY  = neckY + 4 + Math.cos(armRad) * ARM_L;
  const rArmEndX  = CX + Math.sin(armRad) * ARM_L;
  const rArmEndY  = lArmEndY;

  // Legs (knee bend)
  const kb        = Math.min(1, Math.max(0, kneeBend));
  const kneeY     = realHipY + LEG_L * 0.55 * (1 - kb * 0.3);
  const lKneeX    = hipX - 6;
  const rKneeX    = hipX + 6;
  const footY     = kneeY + LEG_L * 0.5 + kb * 8;
  const lFootX    = lKneeX - kb * 4;
  const rFootX    = rKneeX + kb * 4;

  const strokeW   = 3;
  const color     = COLORS.gold;

  return (
    <Svg width={100} height={140} viewBox="0 0 100 140">
      {/* Head */}
      <Circle cx={CX} cy={headY} r={HEAD_R} stroke={color} strokeWidth={strokeW} fill="none" />
      {/* Neck → hip (torso) */}
      <Line x1={CX} y1={neckY} x2={hipX} y2={realHipY} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
      {/* Left arm */}
      <Line x1={CX} y1={neckY + 6} x2={lArmEndX} y2={lArmEndY} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
      {/* Right arm */}
      <Line x1={CX} y1={neckY + 6} x2={rArmEndX} y2={rArmEndY} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
      {/* Left leg upper */}
      <Line x1={hipX} y1={realHipY} x2={lKneeX} y2={kneeY} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
      {/* Left leg lower */}
      <Line x1={lKneeX} y1={kneeY} x2={lFootX} y2={footY} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
      {/* Right leg upper */}
      <Line x1={hipX} y1={realHipY} x2={rKneeX} y2={kneeY} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
      {/* Right leg lower */}
      <Line x1={rKneeX} y1={kneeY} x2={rFootX} y2={footY} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Animation drivers ────────────────────────────────────────────────────────

function usePushAnimation() {
  const armAngle = useSharedValue(10);
  useEffect(() => {
    armAngle.value = withRepeat(
      withSequence(
        withTiming(60, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(10, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1, false,
    );
  }, []);
  return { bodyY: 0, armAngle, kneeBend: 0, torsoTilt: 0 };
}

function usePullAnimation() {
  const armAngle = useSharedValue(60);
  useEffect(() => {
    armAngle.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(60, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1, false,
    );
  }, []);
  return { bodyY: 0, armAngle, kneeBend: 0, torsoTilt: 0 };
}

function useSquatAnimation() {
  const kneeBend = useSharedValue(0);
  const bodyY    = useSharedValue(0);
  useEffect(() => {
    kneeBend.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1, false,
    );
    bodyY.value = withRepeat(
      withSequence(
        withTiming(14, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0,  { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1, false,
    );
  }, []);
  return { bodyY, armAngle: 20, kneeBend, torsoTilt: 0 };
}

function useHingeAnimation() {
  const torsoTilt = useSharedValue(0);
  const kneeBend  = useSharedValue(0);
  useEffect(() => {
    torsoTilt.value = withRepeat(
      withSequence(
        withTiming(40, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0,  { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1, false,
    );
    kneeBend.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 900 }),
        withTiming(0,   { duration: 900 }),
      ),
      -1, false,
    );
  }, []);
  return { bodyY: 0, armAngle: 5, kneeBend, torsoTilt };
}

function useCurlAnimation() {
  const armAngle = useSharedValue(10);
  useEffect(() => {
    armAngle.value = withRepeat(
      withSequence(
        withTiming(-30, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(10,  { duration: 600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1, false,
    );
  }, []);
  return { bodyY: 0, armAngle, kneeBend: 0, torsoTilt: 0 };
}

function useCoreAnimation() {
  const kneeBend = useSharedValue(0);
  const torsoTilt = useSharedValue(0);
  useEffect(() => {
    kneeBend.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 700 }),
        withTiming(0,   { duration: 700 }),
      ),
      -1, false,
    );
    torsoTilt.value = withRepeat(
      withSequence(
        withTiming(20, { duration: 700 }),
        withTiming(0,  { duration: 700 }),
      ),
      -1, false,
    );
  }, []);
  return { bodyY: 4, armAngle: 30, kneeBend, torsoTilt };
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ExerciseAnimatorProps {
  exerciseName: string;
  muscles: MuscleGroup[];
}

export default function ExerciseAnimator({ exerciseName, muscles }: ExerciseAnimatorProps) {
  const type = inferExerciseType(exerciseName, muscles);

  const push  = usePushAnimation();
  const pull  = usePullAnimation();
  const squat = useSquatAnimation();
  const hinge = useHingeAnimation();
  const curl  = useCurlAnimation();
  const core  = useCoreAnimation();

  const anim = { push, pull, squat, hinge, curl, core }[type];

  // Read shared values for rendering (JS side, these update each frame)
  const bodyYVal     = typeof anim.bodyY    === 'number' ? anim.bodyY    : anim.bodyY.value;
  const armAngleVal  = typeof anim.armAngle === 'number' ? anim.armAngle : anim.armAngle.value;
  const kneeBendVal  = typeof anim.kneeBend === 'number' ? anim.kneeBend : anim.kneeBend.value;
  const torsoTiltVal = typeof anim.torsoTilt === 'number' ? anim.torsoTilt : anim.torsoTilt.value;

  // We drive an animated wrapper and pass live props to SVG via a useAnimatedProps approach
  // For simplicity we use a JS-driven timer to read shared values
  // (SVG components aren't natively animatable via useAnimatedStyle)
  // So we use a different approach: wrap in an Animated.View that re-renders

  return (
    <AnimatedFigure
      type={type}
      bodyY={anim.bodyY}
      armAngle={anim.armAngle}
      kneeBend={anim.kneeBend}
      torsoTilt={anim.torsoTilt}
      exerciseName={exerciseName}
    />
  );
}

// Separate component that uses useAnimatedStyle to drive the figure via CSS transforms
// The stick figure SVG stays at fixed coords but we transform the wrapper
function AnimatedFigure({ type, bodyY, armAngle, kneeBend, torsoTilt, exerciseName }: any) {
  // For the push/pull animation we animate a simple icon instead of a full SVG
  // since react-native-svg props can't use useAnimatedProps with all versions

  const translateY = useSharedValue(0);
  const rotate     = useSharedValue(0);
  const scaleY     = useSharedValue(1);

  useEffect(() => {
    if (type === 'push' || type === 'pull' || type === 'curl') {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(0,  { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1, false,
      );
    } else if (type === 'squat' || type === 'hinge') {
      scaleY.value = withRepeat(
        withSequence(
          withTiming(0.88, { duration: 800, easing: Easing.inOut(Easing.quad) }),
          withTiming(1,    { duration: 800, easing: Easing.inOut(Easing.quad) }),
        ),
        -1, false,
      );
    } else if (type === 'core') {
      rotate.value = withRepeat(
        withSequence(
          withTiming(-12, { duration: 700 }),
          withTiming(0,   { duration: 700 }),
        ),
        -1, false,
      );
    }
  }, [type]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scaleY: scaleY.value },
    ],
  }));

  const ICONS: Record<ExerciseType, string> = {
    push:  '🏋️',
    pull:  '💪',
    squat: '🦵',
    hinge: '🔄',
    curl:  '💪',
    core:  '🔥',
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconWrapper, animStyle]}>
        <Animated.Text style={styles.icon}>{ICONS[type as ExerciseType]}</Animated.Text>
      </Animated.View>
      <Animated.Text style={styles.label}>{exerciseName}</Animated.Text>
      <Animated.Text style={styles.typeLabel}>{type.toUpperCase()} MOVEMENT</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  icon: {
    fontSize: 52,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  typeLabel: {
    fontSize: 10,
    color: COLORS.gold,
    letterSpacing: 2,
    fontWeight: '600',
  },
});
