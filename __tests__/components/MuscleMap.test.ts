/**
 * Unit tests for MuscleMap helper logic.
 * We test the pure data-mapping concerns — which muscles appear on which side
 * of the body diagram — without rendering any SVG.
 */

import type { MuscleGroup } from '../../src/types';

// ── Muscle → body-side mapping (mirrors MUSCLE_DEFS in MuscleMap.tsx) ──────
type Side = 'front' | 'back';

const MUSCLE_SIDES: Record<MuscleGroup, Side[]> = {
  chest:      ['front'],
  shoulders:  ['front'],
  biceps:     ['front'],
  core:       ['front'],
  quads:      ['front'],
  calves:     ['front'],
  back:       ['back'],
  triceps:    ['back'],
  hamstrings: ['back'],
  glutes:     ['back'],
};

function hasFrontMuscle(targets: MuscleGroup[]): boolean {
  return targets.some(t => MUSCLE_SIDES[t].includes('front'));
}

function hasBackMuscle(targets: MuscleGroup[]): boolean {
  return targets.some(t => MUSCLE_SIDES[t].includes('back'));
}

// ── Exercise-type inference (mirrors inferExerciseType in ExerciseAnimator) ──
type ExerciseType = 'push' | 'pull' | 'squat' | 'hinge' | 'curl' | 'core';

function inferExerciseType(exerciseName: string, muscles: MuscleGroup[]): ExerciseType {
  const name = exerciseName.toLowerCase();
  if (name.includes('squat') || name.includes('lunge') || name.includes('leg press')) return 'squat';
  if (name.includes('deadlift') || name.includes('hinge') || name.includes('romanian') || name.includes('rdl')) return 'hinge';
  if (name.includes('curl') || name.includes('bicep') || name.includes('hammer')) return 'curl';
  if (name.includes('row') || name.includes('pull') || name.includes('chin') || name.includes('lat')) return 'pull';
  if (name.includes('crunch') || name.includes('plank') || name.includes('ab') || muscles.includes('core')) return 'core';
  return 'push';
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Muscle side mapping', () => {
  it('chest is front only', () => {
    expect(hasFrontMuscle(['chest'])).toBe(true);
    expect(hasBackMuscle(['chest'])).toBe(false);
  });

  it('back is back only', () => {
    expect(hasBackMuscle(['back'])).toBe(true);
    expect(hasFrontMuscle(['back'])).toBe(false);
  });

  it('shoulders are front', () => {
    expect(hasFrontMuscle(['shoulders'])).toBe(true);
  });

  it('glutes are back', () => {
    expect(hasBackMuscle(['glutes'])).toBe(true);
  });

  it('mixed targets activate both sides', () => {
    const targets: MuscleGroup[] = ['chest', 'back'];
    expect(hasFrontMuscle(targets)).toBe(true);
    expect(hasBackMuscle(targets)).toBe(true);
  });

  it('quads and hamstrings cover front and back legs', () => {
    expect(hasFrontMuscle(['quads'])).toBe(true);
    expect(hasBackMuscle(['hamstrings'])).toBe(true);
  });

  it('all 10 muscle groups are mapped', () => {
    const allMuscles: MuscleGroup[] = [
      'chest', 'back', 'shoulders', 'biceps', 'triceps',
      'core', 'quads', 'hamstrings', 'glutes', 'calves',
    ];
    allMuscles.forEach(m => {
      expect(MUSCLE_SIDES[m].length).toBeGreaterThan(0);
    });
  });
});

describe('Exercise type inference', () => {
  it('bench press → push', () => {
    expect(inferExerciseType('Bench Press', ['chest'])).toBe('push');
  });

  it('barbell squat → squat', () => {
    expect(inferExerciseType('Barbell Squat', ['quads', 'glutes'])).toBe('squat');
  });

  it('romanian deadlift → hinge', () => {
    expect(inferExerciseType('Romanian Deadlift', ['hamstrings', 'glutes'])).toBe('hinge');
  });

  it('barbell row → pull', () => {
    expect(inferExerciseType('Barbell Row', ['back', 'biceps'])).toBe('pull');
  });

  it('pull-up → pull', () => {
    expect(inferExerciseType('Pull-Up', ['back', 'biceps'])).toBe('pull');
  });

  it('bicep curl → curl', () => {
    expect(inferExerciseType('Bicep Curl', ['biceps'])).toBe('curl');
  });

  it('hammer curl → curl', () => {
    expect(inferExerciseType('Hammer Curl', ['biceps'])).toBe('curl');
  });

  it('plank → core (name match)', () => {
    expect(inferExerciseType('Plank', ['core'])).toBe('core');
  });

  it('crunch → core (name match)', () => {
    expect(inferExerciseType('Crunch', ['core'])).toBe('core');
  });

  it('core muscle triggers core even without keyword', () => {
    expect(inferExerciseType('Dead Bug', ['core'])).toBe('core');
  });

  it('lunge → squat', () => {
    expect(inferExerciseType('Walking Lunge', ['quads', 'glutes'])).toBe('squat');
  });

  it('lat pulldown → pull', () => {
    expect(inferExerciseType('Lat Pulldown', ['back'])).toBe('pull');
  });

  it('shoulder press → push (default)', () => {
    expect(inferExerciseType('Shoulder Press', ['shoulders'])).toBe('push');
  });

  it('unknown exercise defaults to push', () => {
    expect(inferExerciseType('Zottman Exercise', ['biceps', 'core'])).toBe('core');
  });
});
