/**
 * v4 XP formula + consistency + freeze-token mechanics.
 */
import {
  calculateQuestXP,
  difficultyMultiplier,
  computeMuscleFreshness,
  applyConsistencyDecay,
  recoverConsistency,
  earnFreezeToken,
  consumeFreezeToken,
  CONSISTENCY_MAX_PENALTY,
  MAX_FREEZE_TOKENS,
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

describe('freeze tokens', () => {
  it('earnFreezeToken caps at MAX', () => {
    expect(earnFreezeToken(0)).toBe(1);
    expect(earnFreezeToken(2)).toBe(3);
    expect(earnFreezeToken(3)).toBe(MAX_FREEZE_TOKENS);
    expect(earnFreezeToken(undefined)).toBe(1);
  });

  it('consumeFreezeToken drops by 1 when available', () => {
    expect(consumeFreezeToken(2)).toEqual({ remaining: 1, used: true });
    expect(consumeFreezeToken(0)).toEqual({ remaining: 0, used: false });
    expect(consumeFreezeToken(undefined)).toEqual({ remaining: 0, used: false });
  });
});
