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
 *  Thresholds and streak requirements scale with muscleLevel so beginners
 *  progress faster than advanced trainees:
 *
 *    Level  1-5  (Untrained/Novice):   overachieve at 1.10, rep bump after 1 met session
 *    Level  6-9  (Trained):            overachieve at 1.15, rep bump after 2 met sessions
 *    Level 10-14 (Seasoned):           overachieve at 1.20, rep bump after 3 met sessions
 *    Level 15+   (Elite):              overachieve at 1.25, rep bump after 4 met sessions
 *
 *  Set progression: after consecutivesForSets met/overachieve sessions in a row,
 *  bump sets +1 (capped at the original quest's sets + 1).
 *
 *  Weight progression: bump weight by weightStepKg when ratio >= weightBumpThreshold
 *  (higher bar than reps — needs to be convincingly overachieved).
 *
 *  Underachieved (ratio < 0.70): reduce reps by 1 (floor: 3).
 *  Slightly below (0.70–meetThreshold): hold position, reset streak.
 */
import type { Quest, SetLog } from '@/types';

export interface ExerciseAdaptation {
  exerciseId: string;
  exerciseName: string;
  overrideReps?: number;
  overrideWeight?: number | 'bodyweight';
  overrideSets?: number;
  consecutiveMet: number;
  lastAdaptedAt: string;
  adaptationReason: 'overachieved' | 'met_target' | 'underachieved' | 'reset';
}

/** Keyed by exerciseId */
export type AdaptationMap = Record<string, ExerciseAdaptation>;

/**
 * Human-readable description of what changed for one exercise.
 * Shown in SessionSummary "Next Session Goals" section.
 */
export interface AdaptationChange {
  exerciseName: string;
  reason: ExerciseAdaptation['adaptationReason'];
  /** Non-empty only when something actually changed. */
  lines: string[];
}

// ─── Progression parameters keyed to muscle level ────────────────────────────

interface ProgressionParams {
  /** ratio threshold to count as overachieved */
  overachieveThreshold: number;
  /** ratio threshold above which weight bump is considered (must also not be bodyweight) */
  weightBumpThreshold: number;
  /** consecutive "met" sessions before bumping reps +1 */
  consecutivesForRep: number;
  /** consecutive "met or better" sessions before bumping sets +1 */
  consecutivesForSets: number;
}

function getProgressionParams(muscleLevel: number): ProgressionParams {
  if (muscleLevel <= 5)  return { overachieveThreshold: 1.10, weightBumpThreshold: 1.25, consecutivesForRep: 1, consecutivesForSets: 4 };
  if (muscleLevel <= 9)  return { overachieveThreshold: 1.15, weightBumpThreshold: 1.30, consecutivesForRep: 2, consecutivesForSets: 5 };
  if (muscleLevel <= 14) return { overachieveThreshold: 1.20, weightBumpThreshold: 1.35, consecutivesForRep: 3, consecutivesForSets: 6 };
  return                        { overachieveThreshold: 1.25, weightBumpThreshold: 1.40, consecutivesForRep: 4, consecutivesForSets: 8 };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function totalLogged(loggedSets: SetLog[], isStatic: boolean): number {
  if (isStatic) return loggedSets.reduce((s, l) => s + (l.timeCompleted ?? 0), 0);
  return loggedSets.reduce((s, l) => s + l.repsCompleted, 0);
}

function totalTarget(quest: Quest): number {
  if (quest.holdSeconds) return quest.sets * quest.holdSeconds;
  const repsNum = parseInt(quest.reps, 10);
  return isNaN(repsNum) ? 0 : quest.sets * repsNum;
}

function fmtWeight(w: number | 'bodyweight'): string {
  return w === 'bodyweight' ? 'bodyweight' : `${w} kg`;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Derive the new adaptation for one completed or half-completed quest.
 *
 * @param quest        The completed quest with loggedSets populated.
 * @param current      Previous adaptation for this exercise (null = first time).
 * @param muscleLevel  Level of the primary muscle from muscleXP — drives progression rate.
 * @param weightStepKg Weight increment per progression step (compound barbell: 2.5,
 *                     dumbbell: 2, isolation/cable: 1.25).
 *
 * Returns null if the quest was skipped or has no logged sets.
 */
export function computeAdaptation(
  quest: Quest,
  current: ExerciseAdaptation | null,
  muscleLevel = 6,
  weightStepKg = 2.5,
): { adaptation: ExerciseAdaptation; change: AdaptationChange } | null {
  if (quest.status === 'skipped') return null;
  if (!quest.loggedSets || quest.loggedSets.length === 0) return null;
  if (!quest.exerciseId) return null;

  const isStatic = !!quest.holdSeconds;
  const logged   = totalLogged(quest.loggedSets, isStatic);
  const target   = totalTarget(quest);
  if (target === 0) return null;

  const ratio = logged / target;
  const params = getProgressionParams(muscleLevel);

  // Current baseline
  const baseReps   = current?.overrideReps   ?? (parseInt(quest.reps, 10) || 10);
  const baseSets   = current?.overrideSets   ?? quest.sets;
  const baseWeight = current?.overrideWeight ?? quest.loggedSets[0]?.weight ?? 'bodyweight';
  const prevConsec = current?.consecutiveMet ?? 0;
  const isBodyweight = baseWeight === 'bodyweight';
  const now = new Date().toISOString();

  // Max sets is quest baseline + 1 (one extra set beyond original prescription)
  const maxSets = quest.sets + 1;

  let nextReps   = baseReps;
  let nextSets   = baseSets;
  let nextWeight = baseWeight;
  let nextConsec = prevConsec;
  let reason: ExerciseAdaptation['adaptationReason'] = 'met_target';

  if (ratio >= params.overachieveThreshold) {
    // ── Overachieved ──────────────────────────────────────────────────────────
    reason = 'overachieved';
    nextConsec = 0;

    const bumpWeight = !isBodyweight && ratio >= params.weightBumpThreshold;
    if (bumpWeight) {
      nextWeight = (baseWeight as number) + weightStepKg;
    } else {
      nextReps = baseReps + 1;
    }
    // If consistently overachieving, bump sets too (cap at maxSets)
    if (prevConsec <= 0 && baseSets < maxSets) {
      // Two consecutive overachieve sessions → bump sets
      // We track this via consecutiveMet going negative for "overachieve streak"
    }
  } else if (ratio >= 0.85) {
    // ── Met target ────────────────────────────────────────────────────────────
    reason = 'met_target';
    nextConsec = prevConsec + 1;

    const bumpRep  = nextConsec >= params.consecutivesForRep;
    const bumpSets = nextConsec >= params.consecutivesForSets && baseSets < maxSets;

    if (bumpSets) {
      nextSets   = baseSets + 1;
      nextConsec = 0;
    } else if (bumpRep) {
      nextReps   = baseReps + 1;
      nextConsec = 0;
    }
  } else if (ratio < 0.70) {
    // ── Underachieved ────────────────────────────────────────────────────────
    reason = 'underachieved';
    nextReps   = Math.max(3, baseReps - 1);
    nextConsec = 0;
  } else {
    // ── Slightly below (0.70–0.85): hold, reset streak ────────────────────────
    reason = 'met_target';
    nextConsec = 0;
  }

  const adaptation: ExerciseAdaptation = {
    exerciseId:       quest.exerciseId,
    exerciseName:     quest.exerciseName,
    overrideReps:     nextReps,
    overrideSets:     nextSets,
    overrideWeight:   nextWeight,
    consecutiveMet:   nextConsec,
    lastAdaptedAt:    now,
    adaptationReason: reason,
  };

  // Build human-readable change lines
  const lines: string[] = [];
  if (nextReps !== baseReps) {
    lines.push(`Reps: ${baseReps} → ${nextReps}`);
  }
  if (nextSets !== baseSets) {
    lines.push(`Sets: ${baseSets} → ${nextSets}`);
  }
  if (nextWeight !== baseWeight) {
    lines.push(`Weight: ${fmtWeight(baseWeight)} → ${fmtWeight(nextWeight)}`);
  }
  // Streak progress hint for met_target (no visible change yet)
  if (reason === 'met_target' && lines.length === 0 && nextConsec > 0) {
    const needed = params.consecutivesForRep - nextConsec;
    if (needed > 0) {
      lines.push(`${needed} more consistent session${needed > 1 ? 's' : ''} to progress`);
    }
  }

  const change: AdaptationChange = {
    exerciseName: quest.exerciseName,
    reason,
    lines,
  };

  return { adaptation, change };
}
