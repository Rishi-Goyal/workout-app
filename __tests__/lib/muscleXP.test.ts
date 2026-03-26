/**
 * Tests for the muscle XP system:
 *   muscleXPToNext  — level-up cost curve
 *   calculateMuscleXP — XP award calculation from a quest
 *   applyMuscleXP   — applying awards + level-up handling
 *   muscleXPProgress — 0-100 progress percentage
 *   getWeakestMuscles — weakest-muscle ranking
 */

import {
  muscleXPToNext,
  calculateMuscleXP,
  applyMuscleXP,
  muscleXPProgress,
  getWeakestMuscles,
  DEFAULT_MUSCLE_XP,
  type MuscleXP,
} from '@/lib/muscleXP';

// ─── muscleXPToNext ───────────────────────────────────────────────────────────

describe('muscleXPToNext', () => {
  it('returns 100 at level 1', () => {
    expect(muscleXPToNext(1)).toBe(100);
  });

  it('is strictly increasing', () => {
    for (let l = 1; l < 30; l++) {
      expect(muscleXPToNext(l + 1)).toBeGreaterThan(muscleXPToNext(l));
    }
  });

  it('follows the ~1.5× scaling factor per level', () => {
    // Each level costs ~1.5× the previous (within floor rounding)
    const ratio = muscleXPToNext(2) / muscleXPToNext(1);
    expect(ratio).toBeCloseTo(1.5, 0);
  });

  it('is always a positive integer', () => {
    for (let l = 1; l <= 20; l++) {
      const cost = muscleXPToNext(l);
      expect(cost).toBeGreaterThan(0);
      expect(Number.isInteger(cost)).toBe(true);
    }
  });

  // Negative: should not return 0 or negative even at level 1
  it('never returns 0 or negative', () => {
    for (let l = 1; l <= 50; l++) {
      expect(muscleXPToNext(l)).toBeGreaterThan(0);
    }
  });
});

// ─── calculateMuscleXP ───────────────────────────────────────────────────────

describe('calculateMuscleXP', () => {
  it('awards primary XP to each primary muscle', () => {
    const awards = calculateMuscleXP(['chest', 'shoulders'], [], 'medium', 'complete');
    const chest = awards.find((a) => a.muscle === 'chest');
    const shoulders = awards.find((a) => a.muscle === 'shoulders');
    expect(chest).toBeDefined();
    expect(shoulders).toBeDefined();
    expect(chest!.amount).toBeGreaterThan(0);
    expect(chest!.role).toBe('primary');
  });

  it('awards secondary XP to each secondary muscle', () => {
    const awards = calculateMuscleXP(['chest'], ['triceps'], 'medium', 'complete');
    const triceps = awards.find((a) => a.muscle === 'triceps');
    expect(triceps).toBeDefined();
    expect(triceps!.role).toBe('secondary');
  });

  it('primary muscle gets more XP than secondary', () => {
    const awards = calculateMuscleXP(['back'], ['biceps'], 'hard', 'complete');
    const back = awards.find((a) => a.muscle === 'back')!;
    const biceps = awards.find((a) => a.muscle === 'biceps')!;
    expect(back.amount).toBeGreaterThan(biceps.amount);
  });

  it('half_complete awards exactly 50% of full XP (floored)', () => {
    const full = calculateMuscleXP(['chest'], [], 'medium', 'complete');
    const half = calculateMuscleXP(['chest'], [], 'medium', 'half_complete');
    expect(half[0].amount).toBe(Math.floor(full[0].amount / 2));
  });

  it('does not award secondary XP to muscles already listed as primary', () => {
    // chest is in both lists — should only appear once as primary
    const awards = calculateMuscleXP(['chest'], ['chest', 'triceps'], 'easy', 'complete');
    const chestAwards = awards.filter((a) => a.muscle === 'chest');
    expect(chestAwards).toHaveLength(1);
    expect(chestAwards[0].role).toBe('primary');
  });

  it('boss quests award more XP than hard quests', () => {
    const boss = calculateMuscleXP(['back'], [], 'boss', 'complete');
    const hard = calculateMuscleXP(['back'], [], 'hard', 'complete');
    expect(boss[0].amount).toBeGreaterThan(hard[0].amount);
  });

  it('returns an empty array when no muscles are targeted', () => {
    const awards = calculateMuscleXP([], [], 'easy', 'complete');
    expect(awards).toHaveLength(0);
  });

  // Negative: half_complete amount should always be less than full
  it('half_complete is always less XP than complete across all difficulties', () => {
    (['easy', 'medium', 'hard', 'boss'] as const).forEach((diff) => {
      const full = calculateMuscleXP(['chest'], [], diff, 'complete');
      const half = calculateMuscleXP(['chest'], [], diff, 'half_complete');
      expect(half[0].amount).toBeLessThan(full[0].amount);
    });
  });
});

// ─── applyMuscleXP ────────────────────────────────────────────────────────────

describe('applyMuscleXP', () => {
  function cloneDefault(): MuscleXP {
    return JSON.parse(JSON.stringify(DEFAULT_MUSCLE_XP));
  }

  it('adds XP to the targeted muscle without touching others', () => {
    const current = cloneDefault();
    const awards = [{ muscle: 'chest' as const, amount: 40, role: 'primary' as const }];
    const { muscleXP } = applyMuscleXP(current, awards);
    expect(muscleXP.chest.xp).toBe(40);
    expect(muscleXP.back.xp).toBe(0);
  });

  it('does not level up when XP is below the threshold', () => {
    const current = cloneDefault(); // chest at level 1, needs 100 XP
    const awards = [{ muscle: 'chest' as const, amount: 50, role: 'primary' as const }];
    const { muscleXP, levelUps } = applyMuscleXP(current, awards);
    expect(muscleXP.chest.level).toBe(1);
    expect(levelUps).toHaveLength(0);
  });

  it('levels up when XP meets the threshold exactly', () => {
    const current = cloneDefault(); // level 1 needs 100 XP
    const awards = [{ muscle: 'chest' as const, amount: 100, role: 'primary' as const }];
    const { muscleXP, levelUps } = applyMuscleXP(current, awards);
    expect(muscleXP.chest.level).toBe(2);
    expect(levelUps).toHaveLength(1);
    expect(levelUps[0]).toEqual({ muscle: 'chest', newLevel: 2 });
  });

  it('carries overflow XP into the next level', () => {
    const current = cloneDefault(); // level 1 needs 100 XP
    const awards = [{ muscle: 'back' as const, amount: 150, role: 'primary' as const }];
    const { muscleXP } = applyMuscleXP(current, awards);
    expect(muscleXP.back.level).toBe(2);
    expect(muscleXP.back.xp).toBe(50); // 150 - 100 = 50 overflow
  });

  it('can trigger multiple level-ups in one call', () => {
    const current = cloneDefault();
    // Level 1→2 needs 100, level 2→3 needs 150 → 260 XP should reach level 3
    const awards = [{ muscle: 'quads' as const, amount: 260, role: 'primary' as const }];
    const { muscleXP, levelUps } = applyMuscleXP(current, awards);
    expect(muscleXP.quads.level).toBeGreaterThanOrEqual(3);
    expect(levelUps.length).toBeGreaterThanOrEqual(2);
  });

  it('does not mutate the original MuscleXP object', () => {
    const current = cloneDefault();
    const chestXPBefore = current.chest.xp;
    const awards = [{ muscle: 'chest' as const, amount: 60, role: 'primary' as const }];
    applyMuscleXP(current, awards);
    expect(current.chest.xp).toBe(chestXPBefore);
  });

  it('handles an empty awards array without error', () => {
    const current = cloneDefault();
    expect(() => applyMuscleXP(current, [])).not.toThrow();
    const { muscleXP, levelUps } = applyMuscleXP(current, []);
    expect(levelUps).toHaveLength(0);
    expect(muscleXP.chest.xp).toBe(0);
  });

  // Negative: zero-amount award should not level up
  it('does not level up when award amount is 0', () => {
    const current = cloneDefault();
    const awards = [{ muscle: 'core' as const, amount: 0, role: 'primary' as const }];
    const { muscleXP, levelUps } = applyMuscleXP(current, awards);
    expect(muscleXP.core.level).toBe(1);
    expect(levelUps).toHaveLength(0);
  });
});

// ─── muscleXPProgress ────────────────────────────────────────────────────────

describe('muscleXPProgress', () => {
  it('returns 0 at the start of a level', () => {
    expect(muscleXPProgress({ xp: 0, level: 1 })).toBe(0);
  });

  it('returns 50 at the halfway point of level 1', () => {
    expect(muscleXPProgress({ xp: 50, level: 1 })).toBe(50); // needs 100
  });

  it('returns 100 when XP exactly equals the threshold', () => {
    expect(muscleXPProgress({ xp: 100, level: 1 })).toBe(100);
  });

  it('never exceeds 100 even with surplus XP', () => {
    expect(muscleXPProgress({ xp: 99999, level: 1 })).toBeLessThanOrEqual(100);
  });

  it('returns an integer percentage', () => {
    const result = muscleXPProgress({ xp: 33, level: 1 });
    expect(Number.isInteger(result)).toBe(true);
  });

  it('works correctly at higher levels', () => {
    const needed = muscleXPToNext(5);
    expect(muscleXPProgress({ xp: needed, level: 5 })).toBe(100);
    expect(muscleXPProgress({ xp: 0, level: 5 })).toBe(0);
  });
});

// ─── getWeakestMuscles ───────────────────────────────────────────────────────

describe('getWeakestMuscles', () => {
  it('returns the requested number of muscles', () => {
    expect(getWeakestMuscles(DEFAULT_MUSCLE_XP, 3)).toHaveLength(3);
  });

  it('returns weakest muscles first when levels differ', () => {
    const m: MuscleXP = {
      ...JSON.parse(JSON.stringify(DEFAULT_MUSCLE_XP)),
      chest:      { xp: 0, level: 5 },
      quads:      { xp: 0, level: 1 },
      hamstrings: { xp: 0, level: 1 },
      core:       { xp: 0, level: 1 },
    };
    const weakest = getWeakestMuscles(m, 1);
    // quads, hamstrings, or core should come first — not chest
    expect(weakest[0]).not.toBe('chest');
  });

  it('breaks level ties by XP (lower XP = weaker)', () => {
    // All muscles at level 2 so none are below the two we're testing,
    // biceps at level 1 xp=10, triceps at level 1 xp=5 → triceps is weakest
    const base = Object.fromEntries(
      Object.keys(DEFAULT_MUSCLE_XP).map((k) => [k, { xp: 0, level: 2 }])
    ) as MuscleXP;
    const m: MuscleXP = {
      ...base,
      biceps:  { xp: 10, level: 1 },
      triceps: { xp: 5,  level: 1 }, // same level, less XP → weakest of the two
    };
    const weakest = getWeakestMuscles(m, 2);
    expect(weakest[0]).toBe('triceps');
    expect(weakest[1]).toBe('biceps');
  });

  it('returns all 10 muscles when count >= 10', () => {
    expect(getWeakestMuscles(DEFAULT_MUSCLE_XP, 10)).toHaveLength(10);
  });

  // Negative: should not include strong muscles in the weakest list
  it('does not include the strongest muscle when only 1 is requested', () => {
    const m: MuscleXP = {
      ...JSON.parse(JSON.stringify(DEFAULT_MUSCLE_XP)),
      back: { xp: 0, level: 20 }, // clearly the strongest
    };
    const weakest = getWeakestMuscles(m, 1);
    expect(weakest[0]).not.toBe('back');
  });
});
