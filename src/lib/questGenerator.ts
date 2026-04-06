/**
 * Local Quest Generator — builds dungeon quests from the exercise database.
 *
 * Each dungeon "floor" follows a workout routine template. Exercises are
 * selected based on: user's equipment, muscle levels, progression chains,
 * weakest muscles, and recent session history (to avoid repeats).
 *
 * Falls back to OpenAI when available, but works fully offline.
 */
import type {
  MuscleGroup,
  Equipment,
  FitnessGoal,
  QuestDifficulty,
  RawQuest,
  DungeonSession,
} from '@/types';
import {
  ALL_EXERCISES,
  EXERCISE_MAP,
  WORKOUT_SPLITS,
  getProgressionChain,
  type Exercise,
  type WorkoutSplitType,
  type WorkoutDay,
} from './exerciseDatabase';
import { maxDifficultyForLevel, getWeakestMuscles, type MuscleXP } from './muscleXP';
import type { AdaptationMap } from './adaptationEngine';

// ─── Config ──────────────────────────────────────────────────────────────────

const QUESTS_PER_FLOOR = 3;

interface QuestGenInput {
  equipment: Equipment[];
  goal: FitnessGoal;
  muscleXP: MuscleXP;
  muscleStrengths: Record<MuscleGroup, number>;
  currentFloor: number;
  recentSessions: DungeonSession[];
  preferredSplit?: WorkoutSplitType;
  /** Per-exercise progressive overload targets from the adaptation engine. */
  adaptations?: AdaptationMap;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Determine which workout split suits the user's goal */
function inferSplit(goal: FitnessGoal, floor: number): WorkoutSplitType {
  // Cycle through splits based on floor for variety, but bias toward goal
  const goalSplits: Record<FitnessGoal, WorkoutSplitType[]> = {
    strength:     ['strength_5x5', 'push_pull_legs', 'upper_lower'],
    endurance:    ['full_body', 'push_pull_legs', 'upper_lower'],
    weight_loss:  ['full_body', 'push_pull_legs', 'upper_lower'],
    balanced:     ['push_pull_legs', 'upper_lower', 'full_body'],
    calisthenics: ['full_body', 'upper_lower', 'push_pull_legs'],
  };
  const options = goalSplits[goal];
  return options[floor % options.length];
}

/** Get today's workout day from a split, cycling through active days */
function getWorkoutDay(splitType: WorkoutSplitType, floor: number): WorkoutDay | null {
  const split = WORKOUT_SPLITS[splitType];
  if (!split) return null;

  const activeDays = Object.values(split.schedule).filter(
    (d): d is WorkoutDay => d !== 'rest'
  );
  if (activeDays.length === 0) return null;
  return activeDays[floor % activeDays.length];
}

/** Check if user has ANY of the required equipment.
 *  bodyweight_only exercises are always accessible — if you have equipment
 *  you can still do push-ups, planks, etc. */
function canDoExercise(exercise: Exercise, available: Equipment[]): boolean {
  // Bodyweight exercises are available to everyone
  if (exercise.equipment.includes('bodyweight_only')) return true;
  const avail = new Set(available);
  return exercise.equipment.some(eq => avail.has(eq));
}

/** Get recently used exercise names (from last N sessions) */
function getRecentExercises(sessions: DungeonSession[], count = 3): Set<string> {
  const names = new Set<string>();
  sessions.slice(0, count).forEach(s =>
    s.quests.forEach(q => names.add(q.exerciseName.toLowerCase()))
  );
  return names;
}

/**
 * Find the best exercise for a muscle group at the user's level.
 * Picks from the progression chain based on muscle level.
 */
function pickExerciseForMuscle(
  muscle: MuscleGroup,
  muscleXP: MuscleXP,
  equipment: Equipment[],
  recentNames: Set<string>,
  excludeIds: Set<string>,
): Exercise | null {
  const maxDiff = maxDifficultyForLevel(muscleXP[muscle].level);

  // Get all exercises for this muscle that user can do
  const candidates = ALL_EXERCISES.filter(e =>
    e.primaryMuscle === muscle &&
    e.difficultyLevel <= maxDiff &&
    canDoExercise(e, equipment) &&
    !recentNames.has(e.name.toLowerCase()) &&
    !excludeIds.has(e.id)
  );

  if (candidates.length === 0) {
    // Relax the "not recent" constraint
    const fallback = ALL_EXERCISES.filter(e =>
      e.primaryMuscle === muscle &&
      e.difficultyLevel <= maxDiff &&
      canDoExercise(e, equipment) &&
      !excludeIds.has(e.id)
    );
    return fallback.length > 0 ? fallback[Math.floor(Math.random() * fallback.length)] : null;
  }

  // Prefer exercises at the highest difficulty the user can handle
  // Sort by difficulty descending, pick from top tier with some randomness
  candidates.sort((a, b) => b.difficultyLevel - a.difficultyLevel);
  const topDiff = candidates[0].difficultyLevel;
  const topTier = candidates.filter(e => e.difficultyLevel >= topDiff - 1);
  return topTier[Math.floor(Math.random() * topTier.length)];
}

// ─── Quest difficulty from exercise difficulty ───────────────────────────────

function exerciseDiffToQuestDiff(exDiff: number, isBoss: boolean): QuestDifficulty {
  if (isBoss) return 'boss';
  if (exDiff <= 1) return 'easy';
  if (exDiff <= 2) return 'medium';
  if (exDiff <= 3) return 'hard';
  return 'hard';
}

// ─── Sets/reps based on goal ─────────────────────────────────────────────────

function getSetsReps(
  goal: FitnessGoal,
  difficulty: QuestDifficulty,
  muscleStrength: number,
  exercise?: Exercise,
): { sets: number; reps: string; restSeconds: number; holdSeconds?: number } {
  // Static/isometric exercises: use hold time instead of reps
  if (exercise?.isStatic) {
    const factor = 0.7 + ((muscleStrength - 1) / 9) * 0.6; // 0.7–1.3 across 1–10 scale
    const base = exercise.defaultHoldSeconds ?? 30;
    let holdSeconds = Math.round(base * factor);
    let sets = 3;
    if (difficulty === 'easy') { sets = 2; holdSeconds = Math.max(10, holdSeconds - 5); }
    if (difficulty === 'hard' || difficulty === 'boss') { sets = 4; holdSeconds = holdSeconds + 10; }
    return { sets, reps: '—', restSeconds: 60, holdSeconds };
  }

  // Muscle strength 0-100, scale factor
  const factor = 0.7 + ((muscleStrength - 1) / 9) * 0.6; // 0.7–1.3 across 1–10 scale

  const templates: Record<FitnessGoal, { sets: number; reps: number; rest: number }> = {
    strength:     { sets: 4, reps: 6,  rest: 120 },
    endurance:    { sets: 3, reps: 15, rest: 45  },
    weight_loss:  { sets: 3, reps: 12, rest: 60  },
    balanced:     { sets: 3, reps: 10, rest: 90  },
    calisthenics: { sets: 3, reps: 10, rest: 60  },
  };

  const t = templates[goal];
  let sets = t.sets;
  let reps = Math.round(t.reps * factor);
  let rest = t.rest;

  // Adjust for quest difficulty
  if (difficulty === 'easy') {
    sets = Math.max(2, sets - 1);
    reps = Math.max(5, reps - 2);
  } else if (difficulty === 'hard' || difficulty === 'boss') {
    sets = sets + 1;
    reps = reps + 2;
    rest = Math.min(180, rest + 30);
  }

  return { sets, reps: String(reps), restSeconds: rest };
}

// ─── XP rewards ──────────────────────────────────────────────────────────────

const XP_REWARDS: Record<QuestDifficulty, number> = {
  easy: 50,
  medium: 100,
  hard: 150,
  boss: 300,
};

// ─── Dungeon flavour descriptions ────────────────────────────────────────────

const DESCRIPTIONS: Record<QuestDifficulty, string[]> = {
  easy: [
    'A warm-up challenge to loosen your muscles.',
    'A scouting quest — light but essential.',
    'The dungeon eases you in gently...',
    'A quick skirmish before the real battles.',
    'Hone your form in this starter trial.',
  ],
  medium: [
    'The dungeon tests your resolve!',
    'A worthy challenge for a growing warrior.',
    'Steel your nerves and push through.',
    'The monsters here respect only effort.',
    'Prove your strength on this floor.',
  ],
  hard: [
    'Only the battle-hardened survive this gauntlet!',
    'The dungeon roars — give everything you have!',
    'Forge yourself in iron and sweat.',
    'A grueling trial awaits the brave.',
    'Dig deep — this one separates legends from novices.',
  ],
  boss: [
    'THE BOSS AWAITS — crush it with everything!',
    'A legendary guardian blocks your path!',
    'Face the dungeon\'s ultimate challenge!',
    'Channel all your power into this final stand!',
    'Only true champions survive the boss room!',
  ],
};

function randomDescription(difficulty: QuestDifficulty): string {
  const pool = DESCRIPTIONS[difficulty];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Main generator ──────────────────────────────────────────────────────────

export function generateQuests(input: QuestGenInput): RawQuest[] {
  const {
    equipment, goal, muscleXP, muscleStrengths,
    currentFloor, recentSessions, preferredSplit,
    adaptations,
  } = input;

  const isBoss = currentFloor > 0 && currentFloor % 5 === 0;
  const splitType = preferredSplit ?? inferSplit(goal, currentFloor);
  const workoutDay = getWorkoutDay(splitType, currentFloor);

  // Gather muscles to hit this session
  let targetMuscles: MuscleGroup[];
  if (workoutDay) {
    targetMuscles = [...workoutDay.muscleGroups];
  } else {
    // Fallback: hit weakest muscles
    targetMuscles = getWeakestMuscles(muscleXP, 4);
  }

  // Add weakest muscles for extra priority
  const weakest = getWeakestMuscles(muscleXP, 2);
  for (const m of weakest) {
    if (!targetMuscles.includes(m)) targetMuscles.push(m);
  }

  const recentNames = getRecentExercises(recentSessions);
  const usedIds = new Set<string>();
  const quests: RawQuest[] = [];

  // Difficulty distribution: easy, medium, hard (or boss)
  const difficulties: QuestDifficulty[] = isBoss
    ? ['easy', 'medium', 'boss']
    : ['easy', 'medium', 'hard'];

  for (let i = 0; i < QUESTS_PER_FLOOR; i++) {
    const questDifficulty = difficulties[i] ?? 'medium';

    // Pick a muscle from the target list (round-robin with priority to weakest)
    const muscleIndex = i % targetMuscles.length;
    const primaryMuscle = targetMuscles[muscleIndex];

    // Pick exercise
    const exercise = pickExerciseForMuscle(
      primaryMuscle, muscleXP, equipment, recentNames, usedIds,
    );

    if (!exercise) continue; // Skip if nothing available (shouldn't happen)
    usedIds.add(exercise.id);

    // Get sets/reps
    const avgStrength = exercise.secondaryMuscles.length > 0
      ? Math.round(
          (muscleStrengths[primaryMuscle] +
            exercise.secondaryMuscles.reduce((s, m) => s + (muscleStrengths[m] ?? 5), 0)) /
          (1 + exercise.secondaryMuscles.length)
        )
      : muscleStrengths[primaryMuscle] ?? 50;

    const base = getSetsReps(goal, questDifficulty, avgStrength, exercise);

    // Apply adaptation overrides — only for non-static exercises with a stored target.
    // Static (holdSeconds) overrides are skipped because hold time is more sensitive
    // and the engine only tracks reps/weight progression.
    const adaptation = adaptations?.[exercise.id];
    const sets = adaptation?.overrideSets ?? base.sets;
    const reps = adaptation?.overrideReps != null
      ? String(adaptation.overrideReps)
      : base.reps;
    const restSeconds = base.restSeconds;
    const holdSeconds = base.holdSeconds;
    const suggestedWeight = adaptation?.overrideWeight;

    quests.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      description: randomDescription(questDifficulty),
      targetMuscles: [exercise.primaryMuscle, ...exercise.secondaryMuscles],
      sets,
      reps,
      ...(holdSeconds !== undefined && { holdSeconds }),
      ...(suggestedWeight !== undefined && { suggestedWeight }),
      restSeconds,
      difficulty: questDifficulty,
      xpReward: XP_REWARDS[questDifficulty],
    });
  }

  return quests;
}

// ─── Exercise swap (progression) ─────────────────────────────────────────────

/**
 * Get alternative exercises for a quest — easier or harder from the
 * progression chain, filtered by user's equipment and muscle level.
 */
export function getSwapOptions(
  exerciseName: string,
  muscleXP: MuscleXP,
  equipment: Equipment[],
): { easier: Exercise[]; harder: Exercise[] } {
  // Find exercise in DB by name
  const exercise = ALL_EXERCISES.find(
    e => e.name.toLowerCase() === exerciseName.toLowerCase()
  );
  if (!exercise) return { easier: [], harder: [] };

  const chain = getProgressionChain(exercise.id);
  const currentIndex = chain.findIndex(e => e.id === exercise.id);
  if (currentIndex === -1) return { easier: [], harder: [] };

  const maxDiff = maxDifficultyForLevel(muscleXP[exercise.primaryMuscle].level);

  const easier = chain
    .slice(0, currentIndex)
    .filter(e => canDoExercise(e, equipment))
    .reverse() // closest easier first
    .slice(0, 3);

  const harder = chain
    .slice(currentIndex + 1)
    .filter(e => canDoExercise(e, equipment) && e.difficultyLevel <= maxDiff)
    .slice(0, 3);

  return { easier, harder };
}

/**
 * Swap an exercise in a quest for a progression alternative.
 * Returns the updated RawQuest with the new exercise's name and muscles.
 */
export function swapExercise(
  quest: RawQuest,
  newExerciseId: string,
): RawQuest | null {
  const exercise = EXERCISE_MAP[newExerciseId];
  if (!exercise) return null;

  return {
    ...quest,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    targetMuscles: [exercise.primaryMuscle, ...exercise.secondaryMuscles],
  };
}

// ─── Routine info for display ────────────────────────────────────────────────

export interface RoutineInfo {
  splitName: string;
  dayName: string;
  targetMuscles: MuscleGroup[];
  description: string;
}

/** Get info about today's dungeon routine for display */
export function getDungeonRoutineInfo(
  goal: FitnessGoal,
  floor: number,
  preferredSplit?: WorkoutSplitType,
): RoutineInfo {
  const splitType = preferredSplit ?? inferSplit(goal, floor);
  const split = WORKOUT_SPLITS[splitType];
  const day = getWorkoutDay(splitType, floor);

  return {
    splitName: split?.name ?? 'Custom',
    dayName: day?.name ?? 'Full Body',
    targetMuscles: day?.muscleGroups ?? [],
    description: split?.description ?? '',
  };
}
