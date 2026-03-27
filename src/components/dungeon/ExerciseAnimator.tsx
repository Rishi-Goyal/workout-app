/**
 * ExerciseAnimator — animated stick figure + form cues.
 * Pure React Native implementation (no SVG) for new-arch/Fabric compatibility.
 * Uses Animated API with View/borderRadius to render figure segments.
 */
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { COLORS } from '@/lib/constants';
import type { MuscleGroup } from '@/types';

export type ExerciseType = 'push' | 'pull' | 'squat' | 'hinge' | 'curl' | 'core' | 'hold';

export function inferExerciseType(name: string, muscles: MuscleGroup[]): ExerciseType {
  const n = name.toLowerCase();
  if (n.includes('plank') || n.includes('hang') || n.includes('hold') || n.includes('wall sit') || n.includes('l-sit')) return 'hold';
  if (n.includes('squat') || n.includes('lunge') || n.includes('leg press') || n.includes('step up')) return 'squat';
  if (n.includes('deadlift') || n.includes('rdl') || n.includes('romanian') || n.includes('good morning') || n.includes('hinge')) return 'hinge';
  if (n.includes('curl') || n.includes('bicep') || n.includes('hammer') || n.includes('preacher')) return 'curl';
  if (n.includes('row') || n.includes('pull') || n.includes('chin') || n.includes('lat') || muscles.includes('back')) return 'pull';
  if (n.includes('crunch') || n.includes('ab') || n.includes('sit up') || n.includes('leg raise') || muscles.includes('core')) return 'core';
  return 'push';
}

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

// Motion icons that convey the movement pattern
const TYPE_ICONS: Record<ExerciseType, string> = {
  push:  '⬆️',
  pull:  '⬇️',
  squat: '🦵',
  hinge: '🔄',
  curl:  '💪',
  core:  '🎯',
  hold:  '⏱️',
};

interface ExerciseAnimatorProps {
  exerciseName: string;
  muscles: MuscleGroup[];
}

export default function ExerciseAnimator({ exerciseName, muscles }: ExerciseAnimatorProps) {
  const type = inferExerciseType(exerciseName, muscles);
  const color = TYPE_COLORS[type];
  const cues = FORM_CUES[type];

  // Pulsing animation for the icon
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0,  duration: 900, useNativeDriver: true }),
      ]),
    );
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.85, duration: 1200, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.4,  duration: 1200, useNativeDriver: true }),
      ]),
    );
    pulseAnim.start();
    glowAnim.start();
    return () => { pulseAnim.stop(); glowAnim.stop(); };
  }, [type]);

  return (
    <View style={styles.container}>
      {/* Movement type badge */}
      <View style={[styles.typeBadge, { borderColor: color + '50', backgroundColor: color + '15' }]}>
        <View style={[styles.typeDot, { backgroundColor: color }]} />
        <Text style={[styles.typeLabel, { color }]}>{TYPE_LABELS[type]}</Text>
      </View>

      {/* Animated motion icon panel */}
      <View style={[styles.figureBox, { borderColor: color + '30' }]}>
        <Animated.View style={[styles.glowRing, { borderColor: color + '60', opacity: glow, shadowColor: color }]} />
        <Animated.Text style={[styles.motionIcon, { transform: [{ scale: pulse }] }]}>
          {TYPE_ICONS[type]}
        </Animated.Text>
        <Text style={[styles.motionLabel, { color }]}>{TYPE_LABELS[type]}</Text>
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
  typeDot: { width: 6, height: 6, borderRadius: 3 },
  typeLabel: { fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  figureBox: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,8,20,0.85)',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 8,
  },
  glowRing: {
    position: 'absolute',
    width: '90%',
    height: '90%',
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  motionIcon: { fontSize: 64 },
  motionLabel: { fontSize: 10, letterSpacing: 2, fontWeight: '700' },
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
  cueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cueDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.85 },
  cueText: { fontSize: 13, color: COLORS.text, flex: 1, lineHeight: 19 },
});
