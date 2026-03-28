/**
 * Muscle XP System
 *
 * Each exercise awards XP to targeted muscle groups.
 * Muscle groups level up independently, unlocking harder progressions.
 *
 * Muscle level determines which difficulty tier exercises are available:
 *   Level 0-2  → difficulty 1 exercises only
 *   Level 3-5  → up to difficulty 2
 *   Level 6-9  → up to difficulty 3
 *   Level 10-14 → up to difficulty 4
 *   Level 15+   → all difficulties
 */
import type { MuscleGroup, QuestDifficulty } from '@/types';

// ─── Muscle XP types ─────────────────────────────────────────────────────────

export type MuscleXP = Record<MuscleGroup, { xp: number; level: number; lastTrained?: string }>;

export const DEFAULT_MUSCLE_XP: MuscleXP = {
  chest:      { xp: 0, level: 1 },
  back:       { xp: 0, level: 1 },
  shoulders:  { xp: 0, level: 1 },
  biceps:     { xp: 0, level: 1 },
  triceps:    { xp: 0, level: 1 },
  core:       { xp: 0, level: 1 },
  quads:      { xp: 0, level: 1 },
  hamstrings: { xp: 0, level: 1 },
  glutes:     { xp: 0, level: 1 },
  calves:     { xp: 0, level: 1 },
};

// ─── Level progression ───────────────────────────────────────────────────────

/** XP needed to reach the next muscle level */
export function muscleXPToNext(level: number): number {
  // Quadratic curve: 100, 150, 225, 337, 506, ...
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

/** Max exercise difficulty available at this muscle level */
export function maxDifficultyForLevel(muscleLevel: number): 1 | 2 | 3 | 4 | 5 {
  if (muscleLevel <= 2)  return 1;
  if (muscleLevel <= 5)  return 2;
  if (muscleLevel <= 9)  return 3;
  if (muscleLevel <= 14) return 4;
  return 5;
}

/** Title for a muscle level */
export function muscleLevelTitle(level: number): string {
  if (level <= 2)  return 'Untrained';
  if (level <= 5)  return 'Novice';
  if (level <= 9)  return 'Trained';
  if (level <= 14) return 'Seasoned';
  if (level <= 20) return 'Elite';
  return 'Legendary';
}

// ─── XP rewards per quest difficulty & muscle role ───────────────────────────

const PRIMARY_XP: Record<QuestDifficulty, number> = {
  easy: 30,
  medium: 50,
  hard: 80,
  boss: 150,
};

const SECONDARY_XP: Record<QuestDifficulty, number> = {
  easy: 10,
  medium: 18,
  hard: 30,
  boss: 55,
};

interface MuscleXPAward {
  muscle: MuscleGroup;
  amount: number;
  role: 'primary' | 'secondary';
}

/** Calculate muscle XP awards from a completed quest */
export function calculateMuscleXP(
  primaryMuscles: MuscleGroup[],
  secondaryMuscles: MuscleGroup[],
  difficulty: QuestDifficulty,
  questCompletion: 'complete' | 'half_complete',
): MuscleXPAward[] {
  const multiplier = questCompletion === 'complete' ? 1.0 : 0.5;
  const awards: MuscleXPAward[] = [];

  for (const muscle of primaryMuscles) {
    awards.push({
      muscle,
      amount: Math.floor(PRIMARY_XP[difficulty] * multiplier),
      role: 'primary',
    });
  }

  for (const muscle of secondaryMuscles) {
    if (!primaryMuscles.includes(muscle)) {
      awards.push({
        muscle,
        amount: Math.floor(SECONDARY_XP[difficulty] * multiplier),
        role: 'secondary',
      });
    }
  }

  return awards;
}

/** Apply XP awards to the muscle XP state, handling level-ups */
export function applyMuscleXP(
  current: MuscleXP,
  awards: MuscleXPAward[],
): { muscleXP: MuscleXP; levelUps: Array<{ muscle: MuscleGroup; newLevel: number }> } {
  const updated = { ...current };
  const levelUps: Array<{ muscle: MuscleGroup; newLevel: number }> = [];

  const now = new Date().toISOString();

  for (const award of awards) {
    const m = { ...updated[award.muscle] };
    m.xp += award.amount;
    m.lastTrained = now;

    // Level up loop
    let needed = muscleXPToNext(m.level);
    while (m.xp >= needed) {
      m.xp -= needed;
      m.level += 1;
      levelUps.push({ muscle: award.muscle, newLevel: m.level });
      needed = muscleXPToNext(m.level);
    }

    updated[award.muscle] = m;
  }

  return { muscleXP: updated, levelUps };
}

// ─── Per-set bonus XP ────────────────────────────────────────────────────────

/**
 * Bonus XP for exceeding the recommended rep target in a single set.
 * +2 XP per extra rep above the recommendation.
 * Returns 0 if the user met or missed the target.
 */
export function calculateSetBonus(
  repsCompleted: number,
  recommendedReps: number,
): number {
  return Math.max(0, repsCompleted - recommendedReps) * 2;
}

/**
 * Bonus XP for holding longer than the target on an isometric exercise.
 * +2 XP per 5 extra seconds above the target.
 */
export function calculateIsometricBonus(
  timeCompleted: number,
  recommendedTime: number,
): number {
  return Math.floor(Math.max(0, timeCompleted - recommendedTime) / 5) * 2;
}

// ─── Performance-based XP calculation ────────────────────────────────────────

/**
 * Calculate total XP earned based on actual sets × reps logged.
 *
 * Formula:
 *   1. For each set: effectiveReps = min(actual, target)  — counts toward base
 *   2. performanceRatio = sum(effectiveReps) / (targetSets × targetRepsPerSet)
 *   3. baseEarned = floor(baseXP × performanceRatio)
 *   4. bonusXP = sum(max(0, actual − target) × 2 per set)  — reward overachievement
 *
 * This means:
 *   - 5×5 hitting all 5 reps every set → 100 % of baseXP
 *   - 5×5 hitting 3 reps on 2 sets, 0 on rest → 6/25 = 24 % of baseXP
 *   - 5×5 hitting 7 reps on every set → 100 % base + 2×5×2 = +20 bonusXP
 *
 * For isometric holds the same formula applies using `timeCompleted` instead
 * of `repsCompleted` (caller passes `reps = String(holdSeconds)`).
 */
export function calculatePerformanceXP(
  loggedSets: import('../types').SetLog[],
  targetSets: number,
  targetRepsStr: string,
  baseXP: number,
  holdSeconds?: number,
): number {
  const targetReps = holdSeconds ?? parseInt(targetRepsStr, 10) ?? 0;
  if (!targetReps || targetSets === 0) return baseXP;

  let effectiveTotal = 0;
  let bonusXP = 0;

  for (const s of loggedSets) {
    const actual = holdSeconds && s.timeCompleted !== undefined
      ? s.timeCompleted
      : s.repsCompleted;
    effectiveTotal += Math.min(actual, targetReps);
    bonusXP += Math.max(0, actual - targetReps) * 2;
  }

  const maxTotal = targetSets * targetReps;
  const ratio = Math.min(1, effectiveTotal / maxTotal);

  return Math.floor(baseXP * ratio) + bonusXP;
}

/**
 * Estimated XP contribution for a single set in the done-phase breakdown.
 *
 * Proportionally splits baseXP across targetSets, then applies the same
 * performance ratio and overachievement bonus as calculatePerformanceXP.
 *
 * @param actualReps  - reps/seconds the user completed for this set (0 is valid)
 * @param targetReps  - recommended reps or hold seconds
 * @param baseXP      - full quest xpReward (e.g. 50 / 100 / 150 / 300)
 * @param targetSets  - total sets for the exercise
 */
export function calculateSetXP(
  actualReps: number,
  targetReps: number,
  baseXP: number,
  targetSets: number,
): number {
  if (targetReps === 0 || targetSets === 0) return 0;
  const effective = Math.min(actualReps, targetReps);
  const base = Math.floor(baseXP * (effective / (targetReps * targetSets)));
  const bonus = Math.max(0, actualReps - targetReps) * 2;
  return base + bonus;
}

/** Get progress to next level as a 0–100 percentage */
export function muscleXPProgress(muscle: { xp: number; level: number }): number {
  const needed = muscleXPToNext(muscle.level);
  return Math.min(100, Math.round((muscle.xp / needed) * 100));
}

/** Find the weakest muscles (sorted ascending by level, then XP) */
export function getWeakestMuscles(muscleXP: MuscleXP, count: number = 3): MuscleGroup[] {
  return (Object.entries(muscleXP) as [MuscleGroup, { xp: number; level: number }][])
    .sort((a, b) => {
      if (a[1].level !== b[1].level) return a[1].level - b[1].level;
      return a[1].xp - b[1].xp;
    })
    .slice(0, count)
    .map(([m]) => m);
}
