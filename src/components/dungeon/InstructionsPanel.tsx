/**
 * InstructionsPanel — full how-to guide for an exercise.
 * Shows YouTube form tutorial video, numbered steps, form cues, and equipment.
 */
import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/constants';
import { EXERCISE_MAP } from '@/lib/exerciseDatabase';
import { inferExerciseType, type ExerciseType } from '@/components/dungeon/ExerciseAnimator';
import ExerciseVideo from '@/components/dungeon/ExerciseVideo';
import type { MuscleGroup, Equipment } from '@/types';

const TYPE_LABEL: Record<ExerciseType, string> = {
  push:  'PRESS / PUSH',
  pull:  'ROW / PULL',
  squat: 'SQUAT PATTERN',
  hinge: 'HIP HINGE',
  curl:  'CURL / ISOLATION',
  core:  'CORE MOVEMENT',
  hold:  'ISOMETRIC HOLD',
};

const TYPE_COLOR: Record<ExerciseType, string> = {
  push:  '#6366f1',
  pull:  '#3b82f6',
  squat: '#10b981',
  hinge: '#f97316',
  curl:  '#a855f7',
  core:  '#ec4899',
  hold:  '#06b6d4',
};

const EQUIPMENT_ICONS: Record<Equipment, string> = {
  barbell:          '🏋️',
  dumbbells:        '💪',
  kettlebell:       '🔔',
  pull_up_bar:      '📊',
  resistance_bands: '↔️',
  bench:            '🪑',
  cable_machine:    '⚙️',
  bodyweight_only:  '🧍',
};

interface InstructionsPanelProps {
  exerciseId: string;
  exerciseName: string;
  muscles: MuscleGroup[];
}

function InstructionsPanel({
  exerciseId,
  exerciseName,
  muscles,
}: InstructionsPanelProps) {
  const exercise = EXERCISE_MAP[exerciseId];
  const type = inferExerciseType(exerciseName, muscles);
  const color = TYPE_COLOR[type];

  const steps = exercise?.steps ?? exercise?.formCues ?? [];
  const formCues = exercise?.formCues ?? [];
  const equipment = exercise?.equipment ?? [];

  return (
    <View style={styles.container}>

      {/* YouTube form tutorial video with offline fallback */}
      <ExerciseVideo
        exerciseId={exerciseId}
        exerciseName={exerciseName}
        muscles={muscles}
        fallbackSteps={steps}
      />

      {/* Movement type pill */}
      <View style={[styles.typePill, { backgroundColor: color + '18', borderColor: color + '40' }]}>
        <View style={[styles.typeDot, { backgroundColor: color }]} />
        <Text style={[styles.typeText, { color }]}>{TYPE_LABEL[type]}</Text>
      </View>

      {/* Equipment needed */}
      {equipment.length > 0 && (
        <View style={styles.equipRow}>
          <Text style={styles.sectionLabel}>EQUIPMENT</Text>
          <View style={styles.equipChips}>
            {equipment.map((eq) => (
              <View key={eq} style={styles.equipChip}>
                <Text style={styles.equipIcon}>{EQUIPMENT_ICONS[eq]}</Text>
                <Text style={styles.equipLabel}>{eq.replace(/_/g, ' ')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Step-by-step instructions */}
      {steps.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOW TO PERFORM</Text>
          <View style={styles.stepsContainer}>
            {steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepNumber, { backgroundColor: color + '20', borderColor: color + '50' }]}>
                  <Text style={[styles.stepNum, { color }]}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Key form cues (quick reference) */}
      {formCues.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>KEY CUES</Text>
          <View style={styles.cuesGrid}>
            {formCues.map((cue, i) => (
              <View key={i} style={[styles.cueChip, { borderColor: color + '30' }]}>
                <View style={[styles.cueDot, { backgroundColor: color }]} />
                <Text style={styles.cueText}>{cue}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

    </View>
  );
}

export default memo(InstructionsPanel);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 16,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeText: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  equipRow: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 2,
  },
  equipChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  equipChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  equipIcon: {
    fontSize: 13,
  },
  equipLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  section: {
    gap: 10,
  },
  stepsContainer: {
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  cuesGrid: {
    gap: 6,
  },
  cueChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    borderWidth: 1,
  },
  cueDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 5,
    flexShrink: 0,
    opacity: 0.8,
  },
  cueText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
