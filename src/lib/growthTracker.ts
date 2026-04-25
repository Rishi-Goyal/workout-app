/**
 * growthTracker — pure functions that derive a `GrowthRecord` from a
 * finalized DungeonSession plus prior history.
 *
 * Called from `handleFinalize()` immediately after `finalizeSession()` and
 * before the session is persisted. The record is attached to the session and
 * consumed by SessionSummary (B5) and laggard-aware generation (B7).
 *
 * Pure: no store imports, no side effects. Easy to unit-test.
 */
import type { DungeonSession, GrowthRecord, MuscleGroup } from '@/types';
import type { MuscleXP } from './muscleXP';

/**
 * Returns the total weight lifted (kg × reps) across all logged sets of a
 * session. Bodyweight sets contribute 0 — but still count via hit rate.
 */
function sessionVolume(session: DungeonSession): number {
  let total = 0;
  for (const q of session.quests) {
    if (!q.loggedSets) continue;
    // v4.1.0 Theme C — mobility drills have no volume contribution.
    if (q.kind && q.kind !== 'lift') continue;
    for (const l of q.loggedSets) {
      const w = typeof l.weight === 'number' ? l.weight : 0;
      total += l.repsCompleted * w;
    }
  }
  return total;
}

/**
 * Compute a growth record for the just-finalized session.
 *
 * @param session      The session that just finalized (with loggedSets).
 * @param history      All prior sessions, newest-first (current session may be
 *                     absent or present; we skip same-id entries).
 * @param muscleXP     Muscle-XP state *before* this session's XP was awarded
 *                     — we use the level distribution to flag laggards.
 */
export function computeGrowth(
  session: DungeonSession,
  history: DungeonSession[],
  muscleXP: MuscleXP,
): GrowthRecord {
  // ── Hit rate + current-session volume ─────────────────────────────────────
  let totalTargetReps = 0;
  let totalActualReps = 0;
  for (const q of session.quests) {
    if (q.status === 'skipped' || !q.loggedSets) continue;
    // v4.1.0 Theme C — mobility drills are not part of the lift hit rate.
    if (q.kind && q.kind !== 'lift') continue;
    const targetReps = parseInt(q.reps, 10);
    if (isNaN(targetReps) || targetReps <= 0) continue; // static holds excluded from hit rate
    totalTargetReps += q.sets * targetReps;
    totalActualReps += q.loggedSets.reduce((s, l) => s + l.repsCompleted, 0);
  }
  const hitRate = totalTargetReps > 0 ? totalActualReps / totalTargetReps : 0;
  const totalVolume = sessionVolume(session);

  // ── PRs vs. history ───────────────────────────────────────────────────────
  // For each exercise in this session, check if the user hit a new best weight
  // OR (if weight didn't change) a new best reps at any weight.
  const prs: GrowthRecord['prs'] = [];
  for (const q of session.quests) {
    if (!q.exerciseId || !q.loggedSets || q.loggedSets.length === 0) continue;
    if (q.status === 'skipped') continue;
    // v4.1.0 Theme C — no PRs on mobility drills.
    if (q.kind && q.kind !== 'lift') continue;

    let curMaxWeight = 0;
    let curMaxReps = 0;
    for (const l of q.loggedSets) {
      if (typeof l.weight === 'number' && l.weight > curMaxWeight) curMaxWeight = l.weight;
      if (l.repsCompleted > curMaxReps) curMaxReps = l.repsCompleted;
    }

    let priorMaxWeight = 0;
    let priorMaxReps = 0;
    for (const s of history) {
      if (s.id === session.id) continue;
      for (const pq of s.quests) {
        if (pq.exerciseId !== q.exerciseId || !pq.loggedSets) continue;
        for (const l of pq.loggedSets) {
          if (typeof l.weight === 'number' && l.weight > priorMaxWeight) priorMaxWeight = l.weight;
          if (l.repsCompleted > priorMaxReps) priorMaxReps = l.repsCompleted;
        }
      }
    }

    // Only flag a PR if there's a prior baseline to beat — first-time logs
    // don't count (we'd spam the user with "PR!" on every new exercise).
    if (curMaxWeight > priorMaxWeight && priorMaxWeight > 0) {
      prs.push({
        exerciseId: q.exerciseId,
        exerciseName: q.exerciseName,
        metric: 'weight',
        previous: priorMaxWeight,
        now: curMaxWeight,
      });
    } else if (curMaxReps > priorMaxReps && priorMaxReps > 0) {
      prs.push({
        exerciseId: q.exerciseId,
        exerciseName: q.exerciseName,
        metric: 'reps',
        previous: priorMaxReps,
        now: curMaxReps,
      });
    }
  }

  // ── Volume delta vs. last completed session ───────────────────────────────
  let volumeDeltaPct: number | null = null;
  const lastCompleted = history.find((s) => s.id !== session.id && s.status === 'completed');
  if (lastCompleted) {
    const prev = sessionVolume(lastCompleted);
    if (prev > 0) {
      volumeDeltaPct = ((totalVolume - prev) / prev) * 100;
    }
  }

  // ── Laggards — muscles trained this session that lag the session mean ─────
  // Use pre-session muscle levels so a muscle that was under-levelled going in
  // stays flagged; it's B7's job to promote it into future sessions.
  const trained = new Set<MuscleGroup>();
  for (const q of session.quests) {
    if (q.status === 'skipped') continue;
    // v4.1.0 Theme C — mobility drills don't count toward laggard detection
    // (they'd skew every muscle into being "trained" each session).
    if (q.kind && q.kind !== 'lift') continue;
    for (const m of q.targetMuscles) trained.add(m);
  }
  const laggards: MuscleGroup[] = [];
  if (trained.size > 0) {
    const levels = Array.from(trained).map((m) => ({ m, level: muscleXP[m]?.level ?? 1 }));
    const mean = levels.reduce((s, x) => s + x.level, 0) / levels.length;
    for (const { m, level } of levels) {
      // 2+ levels below the session mean is a laggard. Tune later if noisy.
      if (level <= mean - 2) laggards.push(m);
    }
  }

  // ── Total time (session duration) ─────────────────────────────────────────
  let totalTimeSec = 0;
  if (session.completedAt) {
    const t = new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime();
    totalTimeSec = Math.max(0, Math.floor(t / 1000));
  }

  return {
    sessionId: session.id,
    hitRate,
    totalVolume,
    volumeDeltaPct,
    prs,
    laggards,
    totalTimeSec,
  };
}
