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

export type MuscleXP = Record<MuscleGroup, { xp: number; level: number }>;

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

  for (const award of awards) {
    const m = { ...updated[award.muscle] };
    m.xp += award.amount;

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
