/**
 * v4.1.0 A6 — exerciseSwapper.ts coverage.
 *
 * Runs against the real exerciseDatabase so we catch ranking regressions that
 * would break QuestCard's swap bottom-sheet. Uses well-known chest lifts as
 * fixtures — swap the IDs if the DB ever renames them.
 */
import { getSwapSuggestions } from '@/lib/exerciseSwapper';
import type { Equipment } from '@/types';

const FULL_GYM: Equipment[] = [
  'barbell', 'dumbbells', 'bench', 'cable_machine', 'pull_up_bar', 'bodyweight_only',
];
const BODYWEIGHT_ONLY: Equipment[] = ['bodyweight_only'];

describe('getSwapSuggestions — unknown exercise', () => {
  it('returns empty suggestions for an unknown id', () => {
    const s = getSwapSuggestions('does-not-exist', FULL_GYM);
    expect(s.top).toBeNull();
    expect(s.bodyweight).toBeNull();
    expect(s.easier).toBeNull();
    expect(s.missingEquipment).toEqual([]);
    expect(s.allAlternatives).toEqual([]);
  });
});

describe('getSwapSuggestions — top pick', () => {
  it('prefers a same-difficulty same-muscle exercise', () => {
    // barbell-bench-press is chest, level 3, push
    const s = getSwapSuggestions('barbell-bench-press', FULL_GYM);
    expect(s.top).not.toBeNull();
    expect(s.top!.exercise.primaryMuscle).toBe('chest');
    expect(s.top!.exercise.difficultyLevel).toBe(3);
    expect(s.top!.tag).toBe('same');
    expect(s.top!.caption).toBe('Same target · same difficulty');
  });

  it('does not return the current exercise as its own swap', () => {
    const s = getSwapSuggestions('barbell-bench-press', FULL_GYM);
    expect(s.top?.exercise.id).not.toBe('barbell-bench-press');
    expect(s.allAlternatives.every((e) => e.id !== 'barbell-bench-press')).toBe(true);
  });
});

describe('getSwapSuggestions — bodyweight alternative', () => {
  it('surfaces a bodyweight chest exercise when current needs equipment', () => {
    const s = getSwapSuggestions('barbell-bench-press', FULL_GYM);
    expect(s.bodyweight).not.toBeNull();
    expect(s.bodyweight!.exercise.equipment).toContain('bodyweight_only');
    expect(s.bodyweight!.tag).toBe('bodyweight');
    expect(s.bodyweight!.caption).toBe('No equipment needed');
  });

  it('is null when the current exercise is already bodyweight-only', () => {
    // push-up is bodyweight_only — no point offering a bodyweight alt
    const s = getSwapSuggestions('push-up', FULL_GYM);
    expect(s.bodyweight).toBeNull();
  });
});

describe('getSwapSuggestions — easier variation', () => {
  it('picks a difficulty-1 exercise for the same muscle', () => {
    const s = getSwapSuggestions('barbell-bench-press', FULL_GYM); // level 3
    expect(s.easier).not.toBeNull();
    expect(s.easier!.exercise.difficultyLevel).toBe(2);
    expect(s.easier!.exercise.primaryMuscle).toBe('chest');
    expect(s.easier!.tag).toBe('easier');
    expect(s.easier!.caption).toBe('Easier variation');
  });
});

describe('getSwapSuggestions — missingEquipment', () => {
  it('lists the non-bodyweight equipment the current exercise needs that the user owns', () => {
    const s = getSwapSuggestions('barbell-bench-press', FULL_GYM);
    // barbell-bench-press requires barbell + bench; both are in FULL_GYM
    expect(s.missingEquipment).toEqual(expect.arrayContaining(['barbell', 'bench']));
    // bodyweight_only is never in missingEquipment even if current lists it
    expect(s.missingEquipment).not.toContain('bodyweight_only');
  });

  it('is empty when the current exercise is bodyweight-only', () => {
    // push-up's only equipment is bodyweight_only → nothing to remove
    const s = getSwapSuggestions('push-up', FULL_GYM);
    expect(s.missingEquipment).toEqual([]);
  });

  it("is empty when the user doesn't own the equipment the exercise needs", () => {
    // User only has bodyweight — barbell-bench-press' kit isn't on their profile
    const s = getSwapSuggestions('barbell-bench-press', BODYWEIGHT_ONLY);
    expect(s.missingEquipment).toEqual([]);
  });
});

describe('getSwapSuggestions — equipment filtering', () => {
  it("filters out candidates the user can't do", () => {
    const s = getSwapSuggestions('barbell-bench-press', BODYWEIGHT_ONLY);
    // Every alternative must be bodyweight-friendly
    expect(s.allAlternatives.length).toBeGreaterThan(0);
    for (const ex of s.allAlternatives) {
      expect(ex.equipment).toContain('bodyweight_only');
    }
  });
});
