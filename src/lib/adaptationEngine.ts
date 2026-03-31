/**
 * adaptationEngine — pure functions that compute progressive overload targets
 * from a completed quest's logged sets.
 *
 * No store imports: this module is stateless and unit-testable in isolation.
 *
 * Progression model
 * -----------------
 *  ratio = totalRepsLogged / totalRepsTarget   (or timeLogged / timeTarget for statics)
 *
 *  ratio >= 1.20  → overachieved  → bump reps +1 (or weight one step if all reps matched)
 *  0.90–1.20      → met target    → keep same (tiny +1 rep every 3 consecutive met sessions)
 *  < 0.80         → underachieved → reduce reps by 1 (floor: never below 3)
 *  skipped        → no change
 */
import type { Quest, SetLog } from '@/types';

export interface ExerciseAdaptation {
  exerciseId: string;
  exerciseName: string;
  overrideReps?: number;           // replaces formula-computed reps
  overrideWeight?: number | 'bodyweight'; // replaces formula-computed weight
  overrideSets?: number;
  consecutiveMet: number;          // consecutive sessions where ratio was 0.90–1.20
  lastAdaptedAt: string;           // ISO date
  adaptationReason: 'overachieved' | 'met_target' | 'underachieved' | 'reset';
}

/** Keyed by exerciseId */
export type AdaptationMap = Record<string, ExerciseAdaptation>;

/** Weight step sizes (kg) by equipment type — used for weight progression. */
const WEIGHT_STEP_KG = 2.5;

function totalLogged(loggedSets: SetLog[], isStatic: boolean): number {
  if (isStatic) return loggedSets.reduce((s, l) => s + (l.timeCompleted ?? 0), 0);
  return loggedSets.reduce((s, l) => s + l.repsCompleted, 0);
}

function totalTarget(quest: Quest): number {
  if (quest.holdSeconds) return quest.sets * quest.holdSeconds;
  const repsNum = parseInt(quest.reps, 10);
  return isNaN(repsNum) ? 0 : quest.sets * repsNum;
}

/**
 * Derive the new adaptation for one completed or half-completed quest.
 * Returns `null` if the quest was skipped, or if there are no logged sets to
 * learn from (e.g. quick-tap 'complete' without going through WorkoutTimer).
 */
export function computeAdaptation(
  quest: Quest,
  current: ExerciseAdaptation | null,
): ExerciseAdaptation | null {
  if (quest.status === 'skipped') return null;
  if (!quest.loggedSets || quest.loggedSets.length === 0) return null;
  if (!quest.exerciseId) return null;

  const isStatic = !!quest.holdSeconds;
  const logged = totalLogged(quest.loggedSets, isStatic);
  const target = totalTarget(quest);
  if (target === 0) return null;

  const ratio = logged / target;

  // Current baseline — use existing override if present, else fall back to quest values
  const baseReps = current?.overrideReps ?? (parseInt(quest.reps, 10) || 10);
  const baseSets = current?.overrideSets ?? quest.sets;
  const baseWeight = current?.overrideWeight ?? quest.loggedSets[0]?.weight ?? 'bodyweight';
  const consecutiveMet = current?.consecutiveMet ?? 0;
  const isBodyweight = baseWeight === 'bodyweight';

  const now = new Date().toISOString();

  if (ratio >= 1.20) {
    // Overachieved: bump reps +1 OR weight +step if user is already hitting all reps
    const bumpWeight = !isBodyweight && ratio >= 1.35;
    return {
      exerciseId: quest.exerciseId,
      exerciseName: quest.exerciseName,
      overrideSets: baseSets,
      overrideReps: bumpWeight ? baseReps : baseReps + 1,
      overrideWeight: bumpWeight
        ? (baseWeight as number) + WEIGHT_STEP_KG
        : baseWeight,
      consecutiveMet: 0,
      lastAdaptedAt: now,
      adaptationReason: 'overachieved',
    };
  }

  if (ratio >= 0.90) {
    // Met target: accumulate consecutive-met count; every 3rd session nudge +1 rep
    const newConsecutive = consecutiveMet + 1;
    const bumpRep = newConsecutive >= 3;
    return {
      exerciseId: quest.exerciseId,
      exerciseName: quest.exerciseName,
      overrideSets: baseSets,
      overrideReps: bumpRep ? baseReps + 1 : baseReps,
      overrideWeight: baseWeight,
      consecutiveMet: bumpRep ? 0 : newConsecutive,
      lastAdaptedAt: now,
      adaptationReason: 'met_target',
    };
  }

  if (ratio < 0.80) {
    // Underachieved: drop one rep (never below 3)
    return {
      exerciseId: quest.exerciseId,
      exerciseName: quest.exerciseName,
      overrideSets: baseSets,
      overrideReps: Math.max(3, baseReps - 1),
      overrideWeight: baseWeight,
      consecutiveMet: 0,
      lastAdaptedAt: now,
      adaptationReason: 'underachieved',
    };
  }

  // 0.80 ≤ ratio < 0.90: slightly below but acceptable — hold position, reset streak
  return {
    exerciseId: quest.exerciseId,
    exerciseName: quest.exerciseName,
    overrideSets: baseSets,
    overrideReps: baseReps,
    overrideWeight: baseWeight,
    consecutiveMet: 0,
    lastAdaptedAt: now,
    adaptationReason: 'met_target',
  };
}
