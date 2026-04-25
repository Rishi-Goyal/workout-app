/**
 * v4.1.0 A6 — smarter swap picker.
 *
 * Pure ranking logic consumed by QuestCard's swap bottom-sheet. Returns up to
 * three ranked suggestions plus the data needed to power the "I don't have
 * this kit" escape hatch and the "Browse all" fallback.
 *
 * Kept side-effect-free so it can be unit-tested in isolation.
 */
import type { Equipment } from '@/types';
import {
  ALL_EXERCISES,
  EXERCISE_MAP,
  type Exercise,
} from './exerciseDatabase';

export type SwapTag = 'same' | 'bodyweight' | 'easier';

export interface SwapSuggestion {
  exercise: Exercise;
  tag: SwapTag;
  /** User-facing caption ("Same target · same difficulty", …). */
  caption: string;
}

export interface SwapSuggestions {
  /** Top pick — same muscle, same difficulty, movement-pattern match preferred. */
  top: SwapSuggestion | null;
  /** Bodyweight-only alternative for the same muscle. Omitted if current is already bodyweight-only. */
  bodyweight: SwapSuggestion | null;
  /** One step down on the progression chain for the same muscle. */
  easier: SwapSuggestion | null;
  /**
   * Non-bodyweight equipment required by the current exercise that the user
   * lists in their profile. Used by the "I don't have this kit" action to
   * prune the profile.
   */
  missingEquipment: Equipment[];
  /** Flat list of all valid alternatives for the "Browse all" link. */
  allAlternatives: Exercise[];
}

/** Bodyweight-only exercises are always accessible; otherwise require any listed equipment. */
function canDoExercise(exercise: Exercise, available: Equipment[]): boolean {
  if (exercise.equipment.includes('bodyweight_only')) return true;
  const avail = new Set(available);
  return exercise.equipment.some((eq) => avail.has(eq));
}

/**
 * Rank candidate swaps for a given exercise. Only returns suggestions the
 * user can actually do (either bodyweight or matching their owned equipment).
 */
export function getSwapSuggestions(
  currentExerciseId: string,
  equipment: Equipment[],
): SwapSuggestions {
  const current = EXERCISE_MAP[currentExerciseId];
  if (!current) {
    return {
      top: null,
      bodyweight: null,
      easier: null,
      missingEquipment: [],
      allAlternatives: [],
    };
  }

  // Every candidate is: same primary muscle, different id, user can do it.
  const candidates = ALL_EXERCISES.filter(
    (e) =>
      e.id !== current.id &&
      e.primaryMuscle === current.primaryMuscle &&
      canDoExercise(e, equipment),
  );

  // ── 1. Top pick — same difficulty. Prefer same movement pattern. ───────────
  const sameDiff = candidates.filter((e) => e.difficultyLevel === current.difficultyLevel);
  const sameDiffSamePattern = sameDiff.find((e) => e.movementPattern === current.movementPattern);
  const topExercise = sameDiffSamePattern ?? sameDiff[0] ?? null;
  const top: SwapSuggestion | null = topExercise
    ? { exercise: topExercise, tag: 'same', caption: 'Same target · same difficulty' }
    : null;

  // ── 2. Bodyweight alt — only surface if current isn't already bodyweight-only ─
  const currentIsBodyweight = current.equipment.every((e) => e === 'bodyweight_only');
  const bodyweightAlt = currentIsBodyweight
    ? null
    : candidates.find(
        (e) =>
          e.equipment.includes('bodyweight_only') &&
          e.id !== topExercise?.id,
      ) ?? null;
  const bodyweight: SwapSuggestion | null = bodyweightAlt
    ? { exercise: bodyweightAlt, tag: 'bodyweight', caption: 'No equipment needed' }
    : null;

  // ── 3. Easier variation — one difficulty level down. ──────────────────────
  const easierExercise = candidates
    .filter(
      (e) =>
        e.difficultyLevel === current.difficultyLevel - 1 &&
        e.id !== topExercise?.id &&
        e.id !== bodyweightAlt?.id,
    )
    .sort((a, b) => b.difficultyLevel - a.difficultyLevel)[0] ?? null;
  const easier: SwapSuggestion | null = easierExercise
    ? { exercise: easierExercise, tag: 'easier', caption: 'Easier variation' }
    : null;

  // ── Missing-equipment set for the "I don't have this kit" action. ─────────
  // The user is saying "I don't actually own the kit this exercise needs."
  // Remove every non-bodyweight equipment item listed on the current exercise
  // that's in their profile — future sessions won't re-suggest it.
  const userEquip = new Set(equipment);
  const missingEquipment: Equipment[] = current.equipment.filter(
    (eq) => eq !== 'bodyweight_only' && userEquip.has(eq),
  );

  return {
    top,
    bodyweight,
    easier,
    missingEquipment,
    allAlternatives: candidates,
  };
}
