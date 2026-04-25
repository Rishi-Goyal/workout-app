/**
 * v4 XP formula + consistency mechanics.
 * (Freeze-token helpers lived here before v4.1.0; they were never called and
 *  were removed in favour of useWeeklyGoalStore.freezesAvailable.)
 */
import {
  calculateQuestXP,
  difficultyMultiplier,
  computeMuscleFreshness,
  applyConsistencyDecay,
  recoverConsistency,
  computeConsistencyPenaltyForGap,
  CONSISTENCY_MAX_PENALTY,
} from '@/lib/xp';
import type { MuscleXP } from '@/lib/muscleXP';

function mkMuscleXP(lastTrainedByMuscle: Partial<Record<string, string | undefined>> = {}): MuscleXP {
  const muscles = ['chest','back','shoulders','biceps','triceps','core','quads','hamstrings','glutes','calves'] as const;
  const result = {} as MuscleXP;
  for (const m of muscles) {
    (result as any)[m] = {
      level: 1, currentXP: 0, xpToNextLevel: 100, totalXP: 0,
      lastTrained: lastTrainedByMuscle[m],
    };
  }
  return result;
}

describe('calculateQuestXP', () => {
  it('neutral multipliers return baseXP', () => {
    expect(calculateQuestXP(100, {
      performance: 1, exerciseDifficulty: 1, historicalPerformance: 1, muscleFreshness: 1,
    })).toBe(100);
  });

  it('perfect reward — all multipliers at cap', () => {
    const xp = calculateQuestXP(100, {
      performance: 2, exerciseDifficulty: 1.5, historicalPerformance: 1.3, muscleFreshness: 1.3,
    });
    // 100 × 2 × 1.5 × 1.3 × 1.3 ≈ 507
    expect(xp).toBe(Math.round(100 * 2 * 1.5 * 1.3 * 1.3));
  });

  it('clamps performance to 0.3 floor', () => {
    const xp = calculateQuestXP(100, {
      performance: 0, exerciseDifficulty: 1, historicalPerformance: 1, muscleFreshness: 1,
    });
    expect(xp).toBe(30);
  });

  it('difficulty multipliers increase by difficulty tier', () => {
    expect(difficultyMultiplier('easy')).toBe(0.9);
    expect(difficultyMultiplier('medium')).toBe(1);
    expect(difficultyMultiplier('hard')).toBe(1.15);
    expect(difficultyMultiplier('boss')).toBe(1.35);
  });
});

describe('computeMuscleFreshness', () => {
  it('never-trained muscle is 1.3× fresh', () => {
    expect(computeMuscleFreshness(mkMuscleXP(), ['chest'])).toBe(1.3);
  });

  it('just-trained muscle is 0.6×', () => {
    const mx = mkMuscleXP({ chest: new Date().toISOString() });
    expect(computeMuscleFreshness(mx, ['chest'])).toBe(0.6);
  });

  it('≥ 48h rested muscle is 1.3×', () => {
    const stale = new Date(Date.now() - 50 * 3_600_000).toISOString();
    const mx = mkMuscleXP({ chest: stale });
    expect(computeMuscleFreshness(mx, ['chest'])).toBe(1.3);
  });
});

describe('applyConsistencyDecay', () => {
  it('adds 5 per inactive week', () => {
    expect(applyConsistencyDecay(0, 2)).toBe(10);
  });

  it('caps at MAX_PENALTY', () => {
    expect(applyConsistencyDecay(18, 5)).toBe(CONSISTENCY_MAX_PENALTY);
  });

  it('recoverConsistency drops by 5, floored at 0', () => {
    expect(recoverConsistency(15)).toBe(10);
    expect(recoverConsistency(2)).toBe(0);
  });
});

describe('computeConsistencyPenaltyForGap', () => {
  const daysAgoIso = (days: number) =>
    new Date(Date.now() - days * 86_400_000).toISOString();

  it('fresh user (no last session) is not penalised', () => {
    expect(computeConsistencyPenaltyForGap(0, null)).toBe(0);
    expect(computeConsistencyPenaltyForGap(10, null)).toBe(10); // stays put
  });

  it('< 7 days gap adds no penalty', () => {
    expect(computeConsistencyPenaltyForGap(0, daysAgoIso(3))).toBe(0);
    expect(computeConsistencyPenaltyForGap(0, daysAgoIso(6))).toBe(0);
  });

  it('raises to weeksInactive × 5', () => {
    expect(computeConsistencyPenaltyForGap(0, daysAgoIso(7))).toBe(5);   // 1 week
    expect(computeConsistencyPenaltyForGap(0, daysAgoIso(14))).toBe(10); // 2 weeks
    expect(computeConsistencyPenaltyForGap(0, daysAgoIso(30))).toBe(20); // 4w → capped
  });

  it('caps at MAX_PENALTY', () => {
    expect(computeConsistencyPenaltyForGap(0, daysAgoIso(90))).toBe(CONSISTENCY_MAX_PENALTY);
  });

  it('never lowers an already-higher penalty', () => {
    // User is penalised 15%, but last session was only 1 week ago (target 5).
    // Should stay at 15, not drop to 5 — recovery is separate.
    expect(computeConsistencyPenaltyForGap(15, daysAgoIso(7))).toBe(15);
  });

  it('is idempotent — repeated calls with same gap return the same value', () => {
    const iso = daysAgoIso(21); // 3 weeks → target 15
    const first = computeConsistencyPenaltyForGap(0, iso);
    const second = computeConsistencyPenaltyForGap(first, iso);
    const third = computeConsistencyPenaltyForGap(second, iso);
    expect(first).toBe(15);
    expect(second).toBe(15);
    expect(third).toBe(15);
  });
});

