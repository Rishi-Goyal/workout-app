/**
 * warmupPicker — pure selection logic over warmupDatabase.
 *
 * Three pickers:
 *  - pickWarmupDrills(targetMuscles, count=3)      → dynamic/activation primers
 *  - pickCooldownDrills(targetMuscles, count=3)    → static stretches
 *  - pickRestDayDrills(targetMuscles, count=6)     → mixed, recovery-leaning
 *
 * All return deterministic-but-varied results: we bucket by muscle overlap,
 * then pick round-robin so the warmup for a chest day is heavy on chest/
 * shoulder primers and light on leg work. No zustand, no side effects.
 */
import {
  WARMUP_EXERCISES,
  type WarmupExercise,
  type WarmupKind,
} from './warmupDatabase';
import type { MuscleGroup } from '@/types';

/**
 * Score a drill's relevance to the session's target muscles.
 * Drills with no targets (general fillers) score 0.5 — always considered,
 * but outranked by anything that directly matches.
 */
function overlapScore(drill: WarmupExercise, targets: Set<MuscleGroup>): number {
  if (drill.targetMuscles.length === 0) return 0.5;
  let hits = 0;
  for (const m of drill.targetMuscles) {
    if (targets.has(m)) hits += 1;
  }
  return hits;
}

/** Internal: filter + rank + take N.
 *  Scoring:
 *    - direct muscle match → score = number of overlapping muscles (≥1)
 *    - general filler (no targets) → score 0.5
 *    - unrelated drill → score 0 (only picked as last-resort fallback)
 *  We never filter by score — a short target list like `['chest']` still
 *  needs to return `count` drills, so unrelated drills come last rather
 *  than being dropped entirely.
 */
function pickByKinds(
  targetMuscles: MuscleGroup[],
  kinds: WarmupKind[],
  count: number,
): WarmupExercise[] {
  const targets = new Set(targetMuscles);
  const kindSet = new Set(kinds);
  const candidates = WARMUP_EXERCISES
    .filter((w) => kindSet.has(w.kind))
    .map((w) => ({ drill: w, score: overlapScore(w, targets) }))
    .sort((a, b) => b.score - a.score);

  // Deduplicate selection while respecting the sorted order — picker is stable
  // so tests can assert which drills come out. Randomness within a score tier
  // is intentionally omitted; the daily catalogue is small enough that users
  // will see variety simply by shifting target muscles.
  const picked: WarmupExercise[] = [];
  for (const { drill } of candidates) {
    if (picked.find((p) => p.id === drill.id)) continue;
    picked.push(drill);
    if (picked.length >= count) break;
  }
  return picked;
}

/**
 * Pick warmup drills (dynamic + activation kinds) prioritised by how well
 * they prime the session's target muscles.
 */
export function pickWarmupDrills(
  targetMuscles: MuscleGroup[],
  count: number = 3,
): WarmupExercise[] {
  return pickByKinds(targetMuscles, ['dynamic', 'activation'], count);
}

/**
 * Pick cooldown drills (static stretches) for the muscles the session trained.
 */
export function pickCooldownDrills(
  targetMuscles: MuscleGroup[],
  count: number = 3,
): WarmupExercise[] {
  return pickByKinds(targetMuscles, ['static'], count);
}

/**
 * Pick rest-day mobility drills — a balanced mix weighted toward the muscles
 * the user trained most recently. 3 dynamic / activation primers followed by
 * 3 static stretches, defaulting to 6 drills total.
 */
export function pickRestDayDrills(
  recentMuscles: MuscleGroup[],
  count: number = 6,
): WarmupExercise[] {
  const half = Math.ceil(count / 2);
  const rest = count - half;
  const primers   = pickByKinds(recentMuscles, ['dynamic', 'activation'], half);
  const stretches = pickByKinds(recentMuscles, ['static'], rest);
  return [...primers, ...stretches];
}
