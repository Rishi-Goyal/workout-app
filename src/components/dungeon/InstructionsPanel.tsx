/**
 * InstructionsPanel — exercise guide pane for the active-quest screen.
 *
 * v4.5.0 PR 2/3 — surface previously-hidden Exercise data:
 *   - Difficulty pill alongside movement type
 *   - Primary + secondary muscles chip row
 *   - Effort-per-set fatigue bar visualization
 *   - Full progression-chain dot indicator (showing user's position)
 *
 * Render order: pills row → equipment → muscles → effort bars →
 *   Watch Out / Form Tips → form checklist → how-to steps → progression
 */
import { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '@/lib/constants';
import { EXERCISE_MAP, getMuscleFatigue, getProgressionChain } from '@/lib/exerciseDatabase';
import { EXERCISE_DB_DATA } from '@/lib/exerciseDBData';
import { getMistakes } from '@/lib/exerciseMistakes';
import { inferExerciseType, type ExerciseType } from '@/components/dungeon/ExerciseAnimator';
import { MUSCLE_LABELS } from '@/components/dungeon/MuscleMap';
import FormCueChecklist from '@/components/dungeon/FormCueChecklist';
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

// v4.5.0 — surface Exercise.difficultyLevel (1–5) as a labelled pill.
// Colour scales jade → cyan → gold → orange → crimson with difficulty.
const DIFFICULTY_LABEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'BEGINNER',
  2: 'NOVICE',
  3: 'INTERMEDIATE',
  4: 'ADVANCED',
  5: 'ELITE',
};
const DIFFICULTY_COLOR: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: COLORS.jade,
  2: COLORS.cyan,
  3: COLORS.gold,
  4: COLORS.orange,
  5: COLORS.crimson,
};

// ---------------------------------------------------------------------------
// ProgressionSwapRow
// ---------------------------------------------------------------------------

interface ProgressionSwapRowProps {
  easierExerciseId: string | null;
  harderExerciseId: string | null;
  /** Number of sets already logged for the current quest. */
  loggedSetCount: number;
  onSwap: (newExerciseId: string) => void;
}

function ProgressionSwapRow({
  easierExerciseId,
  harderExerciseId,
  loggedSetCount,
  onSwap,
}: ProgressionSwapRowProps) {
  const easierEx = easierExerciseId ? EXERCISE_MAP[easierExerciseId] : null;
  const harderEx = harderExerciseId ? EXERCISE_MAP[harderExerciseId] : null;

  const requestSwap = useCallback(
    (newId: string, label: string) => {
      if (loggedSetCount > 0) {
        Alert.alert(
          'Swap exercise?',
          `You've already logged ${loggedSetCount} set${loggedSetCount !== 1 ? 's' : ''}. Swapping to "${label}" will keep your set count but reset your weight suggestion.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Swap anyway', style: 'destructive', onPress: () => onSwap(newId) },
          ],
        );
      } else {
        onSwap(newId);
      }
    },
    [loggedSetCount, onSwap],
  );

  if (!easierEx && !harderEx) return null;

  return (
    <View style={swapStyles.container}>
      <Text style={swapStyles.label}>SWAP EXERCISE</Text>
      <View style={swapStyles.row}>
        {easierEx && (
          <Pressable
            style={({ pressed }) => [swapStyles.pill, swapStyles.easierPill, pressed && swapStyles.pillPressed]}
            onPress={() => requestSwap(easierEx.id, easierEx.name)}
            accessibilityRole="button"
            accessibilityLabel={`Switch to easier exercise: ${easierEx.name}`}
          >
            <Text style={swapStyles.pillArrow}>↓</Text>
            <View style={swapStyles.pillText}>
              <Text style={[swapStyles.pillDirection, swapStyles.easierText]}>EASIER</Text>
              <Text style={swapStyles.pillName} numberOfLines={1}>{easierEx.name}</Text>
            </View>
          </Pressable>
        )}
        {harderEx && (
          <Pressable
            style={({ pressed }) => [swapStyles.pill, swapStyles.harderPill, pressed && swapStyles.pillPressed]}
            onPress={() => requestSwap(harderEx.id, harderEx.name)}
            accessibilityRole="button"
            accessibilityLabel={`Switch to harder exercise: ${harderEx.name}`}
          >
            <Text style={swapStyles.pillArrow}>↑</Text>
            <View style={swapStyles.pillText}>
              <Text style={[swapStyles.pillDirection, swapStyles.harderText]}>HARDER</Text>
              <Text style={swapStyles.pillName} numberOfLines={1}>{harderEx.name}</Text>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const swapStyles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
    fontFamily: FONTS.sansBold,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  easierPill: {
    backgroundColor: 'rgba(16,185,129,0.07)',
    borderColor: 'rgba(16,185,129,0.35)',
  },
  harderPill: {
    backgroundColor: 'rgba(245,166,35,0.07)',
    borderColor: 'rgba(245,166,35,0.35)',
  },
  pillPressed: {
    opacity: 0.65,
  },
  pillArrow: {
    fontSize: 18,
    color: COLORS.textSecondary,
    width: 18,
    textAlign: 'center',
  },
  pillText: {
    flex: 1,
    gap: 1,
  },
  pillDirection: {
    fontSize: 9,
    fontFamily: FONTS.sansBold,
    letterSpacing: 1.5,
  },
  easierText: {
    color: COLORS.jade,
  },
  harderText: {
    color: COLORS.gold,
  },
  pillName: {
    fontSize: 12,
    fontFamily: FONTS.sansMed,
    color: COLORS.text,
  },
});

// ---------------------------------------------------------------------------
// InstructionsPanel
// ---------------------------------------------------------------------------

interface InstructionsPanelProps {
  exerciseId: string;
  exerciseName: string;
  muscles: MuscleGroup[];
  /** Number of sets already logged — gates the swap confirm dialog. */
  loggedSetCount?: number;
  /** Called when user taps an easier/harder swap pill and confirms. */
  onSwap?: (newExerciseId: string) => void;
}

function InstructionsPanel({
  exerciseId,
  exerciseName,
  muscles,
  loggedSetCount = 0,
  onSwap,
}: InstructionsPanelProps) {
  const exercise = EXERCISE_MAP[exerciseId];
  const type = inferExerciseType(exerciseName, muscles);
  const color = TYPE_COLOR[type];

  const steps = exercise?.steps ?? exercise?.formCues ?? [];
  const formCues = exercise?.formCues ?? [];
  const equipment = exercise?.equipment ?? [];
  const mistakes = getMistakes(exerciseId, exercise?.primaryMuscle ?? muscles[0] ?? 'chest');

  const easierExerciseId = exercise?.progression?.easierExerciseId ?? null;
  const harderExerciseId = exercise?.progression?.harderExerciseId ?? null;
  const showSwapRow = onSwap && (easierExerciseId || harderExerciseId);

  // v4.5.0 — surfaced data fields. All gracefully degrade for warmups
  // (wu-* IDs aren't in EXERCISE_MAP so `exercise` is undefined).
  const difficultyLevel = exercise?.difficultyLevel ?? null;
  const dbMechanic = EXERCISE_DB_DATA[exerciseId]?.mechanic ?? null;
  const fatigue = exercise ? getMuscleFatigue(exercise) : null;
  // Sort fatigue entries highest → lowest, take top 4 for compact display.
  const fatigueEntries = fatigue
    ? (Object.entries(fatigue) as [MuscleGroup, number][])
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
    : [];
  const chain = exercise ? getProgressionChain(exerciseId) : [];
  const chainIndex = exercise ? chain.findIndex((e) => e.id === exerciseId) : -1;

  return (
    <View style={styles.container}>

      {/* Pills row — movement type + difficulty (lifts only). v4.5.0:
          difficulty pill is the previously-unsurfaced exercise.difficultyLevel,
          colour-coded jade → crimson with the mechanic suffix from
          EXERCISE_DB_DATA when available (e.g. "INTERMEDIATE · COMPOUND"). */}
      <View style={styles.pillsRow}>
        <View style={[styles.typePill, { backgroundColor: color + '18', borderColor: color + '40' }]}>
          <View style={[styles.typeDot, { backgroundColor: color }]} />
          <Text style={[styles.typeText, { color }]}>{TYPE_LABEL[type]}</Text>
        </View>
        {difficultyLevel !== null && (
          <View style={[styles.diffPill, {
            backgroundColor: DIFFICULTY_COLOR[difficultyLevel] + '18',
            borderColor: DIFFICULTY_COLOR[difficultyLevel] + '40',
          }]}>
            <Text style={[styles.diffText, { color: DIFFICULTY_COLOR[difficultyLevel] }]}>
              {DIFFICULTY_LABEL[difficultyLevel]}
              {dbMechanic ? ` · ${dbMechanic.toUpperCase()}` : ''}
            </Text>
          </View>
        )}
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

      {/* v4.5.0 — muscles section. Primary muscle (gold "WORKS") +
          secondary muscles (amber "ALSO HITS"). Lifts only — warmups
          have target muscles in their warmupDatabase entry but the
          panel doesn't currently look those up; falls back gracefully. */}
      {exercise && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MUSCLES</Text>
          <View style={styles.musclesRow}>
            <Text style={styles.musclesLabel}>WORKS</Text>
            <View style={[styles.muscleChip, styles.muscleChipPrimary]}>
              <Text style={styles.muscleChipText}>{MUSCLE_LABELS[exercise.primaryMuscle]}</Text>
            </View>
          </View>
          {exercise.secondaryMuscles.length > 0 && (
            <View style={styles.musclesRow}>
              <Text style={styles.musclesLabel}>ALSO HITS</Text>
              <View style={styles.muscleChipsList}>
                {exercise.secondaryMuscles.map((m) => (
                  <View key={m} style={[styles.muscleChip, styles.muscleChipSecondary]}>
                    <Text style={styles.muscleChipTextSecondary}>{MUSCLE_LABELS[m]}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* v4.5.0 — effort per set: per-muscle fatigue 1–10 visualised as
          horizontal bars. Driven by getMuscleFatigue() which uses explicit
          muscleFatigue when set or derives from difficultyLevel otherwise. */}
      {fatigueEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EFFORT PER SET</Text>
          <View style={styles.fatigueList}>
            {fatigueEntries.map(([m, v], i) => (
              <View key={m} style={styles.fatigueRow}>
                <Text style={styles.fatigueLabel}>{MUSCLE_LABELS[m]}</Text>
                <View style={styles.fatigueTrack}>
                  <View
                    style={[
                      styles.fatigueFill,
                      {
                        width: `${Math.min(100, v * 10)}%`,
                        backgroundColor: i === 0 ? COLORS.gold : COLORS.goldDim,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.fatigueValue}>{v}/10</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* v4.4.0 / v4.4.1 — Watch Out / Form Tips card.
          - 'curated' → red "WATCH OUT" with hand-written mistakes
          - 'exercisedb' → violet "FORM TIPS" with per-exercise how-to from
            free-exercise-db (replaces v4.2.0's repetitive muscle-keyed
            fallback)
          - 'warmup' → violet "FORM TIPS" with the one-line cue from
            warmupDatabase (so warmups like Cat-Cow are never empty)
          - 'none' → card hides entirely */}
      {mistakes.items.length > 0 && (() => {
        // Both 'exercisedb' and 'warmup' sources use the violet "FORM TIPS"
        // styling — they're both "how to do it" content rather than literal
        // mistakes.
        const isTips = mistakes.source !== 'curated';
        return (
        <View style={[styles.mistakesCard, isTips && styles.mistakesCardTips]}>
          <View style={styles.mistakesHeader}>
            <Text style={styles.mistakesIcon}>{isTips ? '💡' : '⚠️'}</Text>
            <Text style={[styles.mistakesTitle, isTips && styles.mistakesTitleTips]}>
              {isTips ? 'FORM TIPS' : 'WATCH OUT'}
            </Text>
          </View>
          <View style={styles.mistakesList}>
            {mistakes.items.map((m, i) => (
              <View key={i} style={styles.mistakeRow}>
                <View style={[styles.mistakeBullet, isTips && styles.mistakeBulletTips]} />
                <Text style={styles.mistakeText}>{m}</Text>
              </View>
            ))}
          </View>
        </View>
        );
      })()}

      {/* Form cue checklist — interactive, tap each cue to check it off during a set */}
      {formCues.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FORM CHECKLIST — tap to check off</Text>
          <FormCueChecklist cues={formCues} accentColor={color} />
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

      {/* v4.5.0 — full progression-chain visualization. Shows where the
          current exercise sits in the easiest→hardest chain. Read-only
          dots; the existing easier/harder swap pills below remain the
          single source of mutation. Hidden for chains with only the
          current entry (singletons). */}
      {chain.length > 1 && chainIndex >= 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PROGRESSION</Text>
          <View style={styles.chainRow}>
            {chain.map((step, i) => {
              const isCurrent = i === chainIndex;
              const isPast = i < chainIndex;
              return (
                <View key={step.id} style={styles.chainStep}>
                  <View
                    style={[
                      styles.chainDot,
                      isPast && styles.chainDotPast,
                      isCurrent && styles.chainDotCurrent,
                    ]}
                  />
                  {i < chain.length - 1 && (
                    <View
                      style={[
                        styles.chainLine,
                        isPast && styles.chainLinePast,
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
          <Text style={styles.chainLabel}>
            Step {chainIndex + 1} of {chain.length} · {exercise?.name}
          </Text>
        </View>
      )}

      {/* Easier / harder swap row */}
      {showSwapRow && (
        <ProgressionSwapRow
          easierExerciseId={easierExerciseId}
          harderExerciseId={harderExerciseId}
          loggedSetCount={loggedSetCount}
          onSwap={onSwap}
        />
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
    fontFamily: FONTS.sansBold,
  },
  equipRow: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
    fontFamily: FONTS.sansBold,
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
    fontFamily: FONTS.sans,
  },
  // Watch Out card
  mistakesCard: {
    backgroundColor: 'rgba(229,62,62,0.07)',
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: 'rgba(229,62,62,0.30)',
    padding: 14,
    gap: 10,
  },
  mistakesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mistakesIcon: {
    fontSize: 14,
  },
  mistakesTitle: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: COLORS.crimson,
    letterSpacing: 2,
  },
  mistakesList: {
    gap: 8,
  },
  mistakeRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  mistakeBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.crimson,
    marginTop: 7,
    flexShrink: 0,
  },
  // v4.4.0 — violet variant of the card for ExerciseDB-sourced "FORM TIPS"
  // (instructions, not literal mistakes). Distinct from the red WATCH OUT.
  mistakesCardTips: {
    backgroundColor: 'rgba(99,102,241,0.07)',
    borderColor: 'rgba(99,102,241,0.30)',
  },
  mistakesTitleTips: {
    color: COLORS.violetLight,
  },
  mistakeBulletTips: {
    backgroundColor: COLORS.violetLight,
  },
  mistakeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.sans,
    color: COLORS.textSecondary,
    lineHeight: 18,
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
    fontFamily: FONTS.sansBold,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.sans,
    color: COLORS.text,
    lineHeight: 20,
  },

  // ── v4.5.0 — surfaced data ──────────────────────────────────────────────
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  diffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  diffText: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontFamily: FONTS.sansBold,
  },
  // Muscles row
  musclesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  musclesLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontFamily: FONTS.sansBold,
    color: COLORS.textMuted,
    width: 68,
  },
  muscleChipsList: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  muscleChipPrimary: {
    backgroundColor: 'rgba(245,166,35,0.12)',
    borderColor: 'rgba(245,166,35,0.45)',
  },
  muscleChipSecondary: {
    backgroundColor: 'rgba(178,119,18,0.10)',
    borderColor: 'rgba(178,119,18,0.35)',
  },
  muscleChipText: {
    fontSize: 11,
    fontFamily: FONTS.sansBold,
    color: COLORS.gold,
    letterSpacing: 0.4,
  },
  muscleChipTextSecondary: {
    fontSize: 11,
    fontFamily: FONTS.sansMed,
    color: COLORS.goldDim,
    letterSpacing: 0.4,
  },
  // Effort bars
  fatigueList: {
    gap: 6,
  },
  fatigueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fatigueLabel: {
    fontSize: 11,
    fontFamily: FONTS.sansMed,
    color: COLORS.textSecondary,
    width: 80,
  },
  fatigueTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  fatigueFill: {
    height: 6,
    borderRadius: 3,
  },
  fatigueValue: {
    fontSize: 10,
    fontFamily: FONTS.mono,
    color: COLORS.textMuted,
    width: 36,
    textAlign: 'right',
  },
  // Progression chain dots
  chainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chainStep: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chainDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  chainDotPast: {
    backgroundColor: COLORS.goldDim,
    borderColor: COLORS.gold,
  },
  chainDotCurrent: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.goldLight,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  chainLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 2,
  },
  chainLinePast: {
    backgroundColor: COLORS.goldDim,
  },
  chainLabel: {
    fontSize: 11,
    fontFamily: FONTS.sansMed,
    color: COLORS.textSecondary,
    marginTop: 6,
    letterSpacing: 0.3,
  },
});
