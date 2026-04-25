/**
 * v4.1.0 B1 — growthTracker.ts coverage.
 *
 * Focus: hit rate math, PR detection against prior bests, volume delta, and
 * laggard flagging. These are the numbers SessionSummary renders and B7 feeds
 * on, so regressions here break the visible growth loop.
 */
import { computeGrowth } from '@/lib/growthTracker';
import type { DungeonSession, Quest, SetLog, MuscleGroup } from '@/types';
import type { MuscleXP } from '@/lib/muscleXP';

function mkMuscleXP(levels: Partial<Record<MuscleGroup, number>> = {}): MuscleXP {
  const muscles: MuscleGroup[] = [
    'chest', 'back', 'shoulders', 'biceps', 'triceps',
    'core', 'quads', 'hamstrings', 'glutes', 'calves',
  ];
  const result = {} as MuscleXP;
  for (const m of muscles) {
    (result as any)[m] = { xp: 0, level: levels[m] ?? 5 };
  }
  return result;
}

function mkSet(n: number, reps: number, weight: number | 'bodyweight'): SetLog {
  return { setNumber: n, repsCompleted: reps, weight };
}

function mkQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: 'q1',
    exerciseId: 'bench_press',
    exerciseName: 'Bench Press',
    description: '',
    targetMuscles: ['chest'] as MuscleGroup[],
    sets: 3,
    reps: '8',
    restSeconds: 90,
    difficulty: 'medium',
    xpReward: 100,
    status: 'complete',
    xpEarned: 100,
    loggedSets: [mkSet(1, 8, 60), mkSet(2, 8, 60), mkSet(3, 8, 60)],
    ...overrides,
  };
}

function mkSession(quests: Quest[], overrides: Partial<DungeonSession> = {}): DungeonSession {
  return {
    id: 's1',
    floor: 1,
    quests,
    status: 'completed',
    totalXPEarned: 300,
    startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    completedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('computeGrowth — hit rate', () => {
  it('is 1.0 when every set meets target', () => {
    const session = mkSession([mkQuest()]); // 3×8 target, 3×8 actual
    const g = computeGrowth(session, [], mkMuscleXP());
    expect(g.hitRate).toBeCloseTo(1, 3);
  });

  it('is the weighted ratio across multiple exercises', () => {
    // Quest 1: target 3×8 = 24, actual 24 (1.0)
    // Quest 2: target 3×10 = 30, actual 15 (0.5)
    // Combined: 39 / 54 ≈ 0.722
    const session = mkSession([
      mkQuest({ id: 'q1', exerciseId: 'ex1' }),
      mkQuest({
        id: 'q2',
        exerciseId: 'ex2',
        reps: '10',
        loggedSets: [mkSet(1, 5, 60), mkSet(2, 5, 60), mkSet(3, 5, 60)],
      }),
    ]);
    const g = computeGrowth(session, [], mkMuscleXP());
    expect(g.hitRate).toBeCloseTo(39 / 54, 2);
  });

  it('skipped quests are excluded from hit rate', () => {
    const session = mkSession([
      mkQuest({ id: 'q1' }),
      mkQuest({ id: 'q2', status: 'skipped', loggedSets: [] }),
    ]);
    const g = computeGrowth(session, [], mkMuscleXP());
    expect(g.hitRate).toBeCloseTo(1, 3);
  });
});

describe('computeGrowth — PRs', () => {
  it('flags a new weight PR', () => {
    const prior = mkSession([mkQuest({
      loggedSets: [mkSet(1, 8, 60), mkSet(2, 8, 60), mkSet(3, 8, 60)],
    })], { id: 'prior' });
    const current = mkSession([mkQuest({
      loggedSets: [mkSet(1, 8, 65), mkSet(2, 8, 65), mkSet(3, 8, 65)],
    })], { id: 'current' });
    const g = computeGrowth(current, [prior], mkMuscleXP());
    expect(g.prs).toHaveLength(1);
    expect(g.prs[0]).toMatchObject({
      exerciseId: 'bench_press',
      metric: 'weight',
      previous: 60,
      now: 65,
    });
  });

  it('flags a reps PR when weight is unchanged', () => {
    const prior = mkSession([mkQuest({
      loggedSets: [mkSet(1, 8, 60), mkSet(2, 8, 60), mkSet(3, 8, 60)],
    })], { id: 'prior' });
    const current = mkSession([mkQuest({
      loggedSets: [mkSet(1, 10, 60), mkSet(2, 10, 60), mkSet(3, 10, 60)],
    })], { id: 'current' });
    const g = computeGrowth(current, [prior], mkMuscleXP());
    expect(g.prs).toHaveLength(1);
    expect(g.prs[0]).toMatchObject({ metric: 'reps', previous: 8, now: 10 });
  });

  it('first-time exercises do not emit a PR', () => {
    // No prior history → no baseline to beat
    const current = mkSession([mkQuest()]);
    const g = computeGrowth(current, [], mkMuscleXP());
    expect(g.prs).toHaveLength(0);
  });

  it('equalling the prior best is not a PR', () => {
    const prior = mkSession([mkQuest()], { id: 'prior' });
    const current = mkSession([mkQuest()], { id: 'current' });
    const g = computeGrowth(current, [prior], mkMuscleXP());
    expect(g.prs).toHaveLength(0);
  });
});

describe('computeGrowth — volume delta', () => {
  it('is null with no prior session', () => {
    const g = computeGrowth(mkSession([mkQuest()]), [], mkMuscleXP());
    expect(g.volumeDeltaPct).toBeNull();
  });

  it('is positive when volume increases', () => {
    // Prior: 3×8×60 = 1440; Current: 3×8×65 = 1560; delta ≈ +8.33%
    const prior = mkSession([mkQuest()], { id: 'prior' });
    const current = mkSession([mkQuest({
      loggedSets: [mkSet(1, 8, 65), mkSet(2, 8, 65), mkSet(3, 8, 65)],
    })], { id: 'current' });
    const g = computeGrowth(current, [prior], mkMuscleXP());
    expect(g.volumeDeltaPct).not.toBeNull();
    expect(g.volumeDeltaPct!).toBeCloseTo(((1560 - 1440) / 1440) * 100, 1);
  });

  it('is negative when volume decreases', () => {
    const prior = mkSession([mkQuest({
      loggedSets: [mkSet(1, 8, 65), mkSet(2, 8, 65), mkSet(3, 8, 65)],
    })], { id: 'prior' });
    const current = mkSession([mkQuest()], { id: 'current' });
    const g = computeGrowth(current, [prior], mkMuscleXP());
    expect(g.volumeDeltaPct!).toBeLessThan(0);
  });
});

describe('computeGrowth — laggards', () => {
  it('flags muscles 2+ levels below session mean', () => {
    // Trained: chest (level 10), back (level 10), biceps (level 4)
    // mean = 8, biceps is level 4 → 4 <= 8 - 2 → laggard
    const muscleXP = mkMuscleXP({ chest: 10, back: 10, biceps: 4 });
    const session = mkSession([
      mkQuest({ id: 'q1', exerciseId: 'e1', targetMuscles: ['chest'] as MuscleGroup[] }),
      mkQuest({ id: 'q2', exerciseId: 'e2', targetMuscles: ['back'] as MuscleGroup[] }),
      mkQuest({ id: 'q3', exerciseId: 'e3', targetMuscles: ['biceps'] as MuscleGroup[] }),
    ]);
    const g = computeGrowth(session, [], muscleXP);
    expect(g.laggards).toContain('biceps');
    expect(g.laggards).not.toContain('chest');
    expect(g.laggards).not.toContain('back');
  });

  it('empty laggards list when all trained muscles are close to the mean', () => {
    const muscleXP = mkMuscleXP({ chest: 8, back: 9, biceps: 7 });
    const session = mkSession([
      mkQuest({ id: 'q1', exerciseId: 'e1', targetMuscles: ['chest'] as MuscleGroup[] }),
      mkQuest({ id: 'q2', exerciseId: 'e2', targetMuscles: ['back'] as MuscleGroup[] }),
      mkQuest({ id: 'q3', exerciseId: 'e3', targetMuscles: ['biceps'] as MuscleGroup[] }),
    ]);
    const g = computeGrowth(session, [], muscleXP);
    expect(g.laggards).toEqual([]);
  });
});

describe('computeGrowth — totalTimeSec', () => {
  it('is the span between startedAt and completedAt', () => {
    const start = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const end = new Date().toISOString();
    const session = mkSession([mkQuest()], { startedAt: start, completedAt: end });
    const g = computeGrowth(session, [], mkMuscleXP());
    // Should be close to 30 minutes = 1800 seconds
    expect(g.totalTimeSec).toBeGreaterThanOrEqual(1790);
    expect(g.totalTimeSec).toBeLessThanOrEqual(1810);
  });

  it('is 0 if the session has no completedAt', () => {
    const session = mkSession([mkQuest()], { completedAt: undefined });
    const g = computeGrowth(session, [], mkMuscleXP());
    expect(g.totalTimeSec).toBe(0);
  });
});
