/**
 * v4 deriveClass tests — the 16-class system derived from muscle XP plus
 * cardio/mobility/grip dimensions.
 */
import { deriveClass } from '@/lib/character';
import type { MuscleXP } from '@/lib/muscleXP';

function uniform(level: number): MuscleXP {
  const muscles = ['chest','back','shoulders','biceps','triceps','core','quads','hamstrings','glutes','calves'] as const;
  const result = {} as MuscleXP;
  for (const m of muscles) {
    (result as any)[m] = { level, currentXP: 0, xpToNextLevel: 100, totalXP: 0 };
  }
  return result;
}

function mxp(overrides: Partial<Record<keyof MuscleXP, number>>): MuscleXP {
  const base = uniform(3);
  for (const [k, v] of Object.entries(overrides)) {
    (base as any)[k] = { level: v, currentXP: 0, xpToNextLevel: 100, totalXP: 0 };
  }
  return base;
}

const noExtras = { cardioMinutes: 0, mobilityScore: 5, gripScore: 5 };

describe('deriveClass — baseline', () => {
  it('all-1 muscle XP → Awakened Novice', () => {
    expect(deriveClass(uniform(1), noExtras)).toBe('Awakened Novice');
  });

  it('Ascendant when every dimension ≥ 12', () => {
    const high = uniform(12);
    expect(deriveClass(high, { cardioMinutes: 300, mobilityScore: 20, gripScore: 20 }))
      .toBe('Ascendant');
  });

  it('Paragon when totalAvg ≥ 8 and spread ≤ 3', () => {
    expect(deriveClass(uniform(9), { cardioMinutes: 135, mobilityScore: 9, gripScore: 9 }))
      .toBe('Paragon');
  });
});

describe('deriveClass — specialists', () => {
  it('grip dominant → Ironhand Crusher', () => {
    expect(deriveClass(uniform(3), { ...noExtras, gripScore: 18 }))
      .toBe('Ironhand Crusher');
  });

  it('cardio dominant with upper base → Storm Rider', () => {
    const m = mxp({ chest: 6, shoulders: 6, triceps: 6, back: 6, biceps: 6 });
    expect(deriveClass(m, { cardioMinutes: 300, mobilityScore: 5, gripScore: 5 }))
      .toBe('Storm Rider');
  });

  it('cardio dominant without upper → Windrunner', () => {
    expect(deriveClass(uniform(2), { cardioMinutes: 300, mobilityScore: 5, gripScore: 5 }))
      .toBe('Windrunner');
  });

  it('legs dominant → Atlas Titan', () => {
    const m = mxp({ quads: 10, hamstrings: 10, glutes: 10, calves: 10 });
    expect(deriveClass(m, noExtras)).toBe('Atlas Titan');
  });
});
