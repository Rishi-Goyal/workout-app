/**
 * Comprehensive Exercise Database
 *
 * Sources:
 *   - Strength standards: strengthlevel.com (48M+ lift records)
 *   - Exercise lists & muscle anatomy: strengthlog.com, exrx.net, ACE Fitness
 *   - Workout splits / programming: strengthlog.com, muscle & strength, barbellmedicine
 *   - Bodyweight progressions: r/bodyweightfitness recommended routine
 *
 * Difficulty scale 1–5:
 *   1 = Absolute beginner (no prior training needed)
 *   2 = Beginner (1–3 months consistent training)
 *   3 = Intermediate (6 months – 2 years)
 *   4 = Advanced (2–5 years)
 *   5 = Elite (5+ years, competitive level)
 */

import type { MuscleGroup, Equipment } from '../types';
import { EXERCISE_STEPS } from './exerciseSteps';

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type MovementPattern =
  | 'push'       // horizontal or vertical pressing
  | 'pull'       // horizontal or vertical rowing/pulling
  | 'squat'      // knee-dominant lower body
  | 'hinge'      // hip-dominant lower body
  | 'core'       // anti-extension, anti-rotation, flexion
  | 'carry'      // loaded carries & locomotion
  | 'isolation'; // single-joint accessory work

export interface StrengthStandard {
  /** Male 1RM in kg at bodyweight ~80 kg (176 lb), or reps for bodyweight lifts */
  male: { beginner: number; novice: number; intermediate: number; advanced: number; elite: number };
  /** Female 1RM in kg at bodyweight ~60 kg (132 lb), or reps for bodyweight lifts */
  female: { beginner: number; novice: number; intermediate: number; advanced: number; elite: number };
  unit: 'kg' | 'reps';
}

export interface ExerciseProgression {
  /** ID of an easier exercise (null for the easiest in the chain) */
  easierExerciseId: string | null;
  /** ID of a harder exercise (null for the hardest in the chain) */
  harderExerciseId: string | null;
}

/**
 * v4 classification tags — feed into class derivation via Storm Rider / Void
 * Monk / Ironhand Crusher / Flame Herald detection. An exercise can wear
 * multiple tags (e.g. burpees are cardio + explosive).
 *
 * See docs/exercise-classification-prompt.md for the LLM tagging prompt used
 * to retag the entire database.
 */
export type V4Tag = 'cardio' | 'mobility' | 'grip' | 'explosive';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  movementPattern: MovementPattern;
  /** 1 (easiest) – 5 (elite) */
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  equipment: Equipment[];
  /** Short cue notes for form */
  formCues: string[];
  progression: ExerciseProgression;
  strengthStandards?: StrengthStandard;
  /** Tags for filtering (e.g. "compound", "isolation", "powerlifting", "bodyweight") */
  tags: string[];
  /** v4 classification tags — drive class derivation (see V4Tag). */
  v4Tags?: V4Tag[];
  /** True for isometric/static holds — use holdSeconds instead of reps */
  isStatic?: boolean;
  /** Default hold duration in seconds for static exercises */
  defaultHoldSeconds?: number;
  /**
   * Fatigue caused per muscle group on a single hard set (1–10 scale).
   * Omit for muscles not significantly stressed.
   * Defaults derived from difficultyLevel if not provided.
   *   primary ≈ difficultyLevel × 2   (capped at 10)
   *   secondary ≈ difficultyLevel     (capped at 5)
   */
  muscleFatigue?: Partial<Record<MuscleGroup, number>>;
  /** Step-by-step how-to instructions (populated from exerciseSteps.ts at runtime) */
  steps?: string[];
  /** Static CDN URL for an exercise animation or image — populated at init time */
  animationUrl?: string;
}

/**
 * Returns the per-muscle fatigue caused by one working set of this exercise.
 * Uses explicit `muscleFatigue` if provided; otherwise derives from difficulty.
 */
export function getMuscleFatigue(exercise: Exercise): Partial<Record<MuscleGroup, number>> {
  if (exercise.muscleFatigue) return exercise.muscleFatigue;
  const primary = Math.min(10, exercise.difficultyLevel * 2);
  const secondary = Math.max(1, Math.ceil(primary * 0.45));
  const result: Partial<Record<MuscleGroup, number>> = { [exercise.primaryMuscle]: primary };
  exercise.secondaryMuscles.forEach((m, i) => { result[m] = Math.max(1, secondary - i); });
  return result;
}

// ---------------------------------------------------------------------------
// CHEST (Push — horizontal & incline)
// ---------------------------------------------------------------------------

const chestExercises: Exercise[] = [
  {
    id: 'wall-push-up',
    name: 'Wall Push-Up',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    movementPattern: 'push',
    difficultyLevel: 1,
    equipment: ['bodyweight_only'],
    formCues: ['Stand arm-length from wall', 'Keep body straight', 'Lower chest to wall'],
    progression: { easierExerciseId: null, harderExerciseId: 'incline-push-up' },
    tags: ['bodyweight', 'beginner', 'rehabilitation'],
  },
  {
    id: 'incline-push-up',
    name: 'Incline Push-Up',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    movementPattern: 'push',
    difficultyLevel: 1,
    equipment: ['bodyweight_only', 'bench'],
    formCues: ['Hands on elevated surface', 'Body rigid plank', 'Chest touches surface'],
    progression: { easierExerciseId: 'wall-push-up', harderExerciseId: 'push-up' },
    tags: ['bodyweight', 'beginner'],
  },
  {
    id: 'wide-push-up',
    name: 'Wide Push-Up',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    movementPattern: 'push',
    difficultyLevel: 2,
    equipment: ['bodyweight_only'],
    formCues: ['Hands 1.5× shoulder width', 'Elbows flare ~60°', 'Chest to floor', 'Full lockout'],
    progression: { easierExerciseId: 'push-up', harderExerciseId: 'archer-push-up' },
    muscleFatigue: { chest: 6, shoulders: 3, triceps: 2 },
    tags: ['bodyweight', 'compound', 'beginner'],
  },
  {
    id: 'push-up',
    name: 'Push-Up',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps', 'core'],
    movementPattern: 'push',
    difficultyLevel: 2,
    equipment: ['bodyweight_only'],
    formCues: ['Hands shoulder-width', 'Full body rigid', 'Chest touches floor', 'Elbows ~45° flare'],
    progression: { easierExerciseId: 'incline-push-up', harderExerciseId: 'diamond-push-up' },
    tags: ['bodyweight', 'compound', 'beginner'],
  },
  {
    id: 'diamond-push-up',
    name: 'Diamond Push-Up',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['chest', 'shoulders'],
    movementPattern: 'push',
    difficultyLevel: 3,
    equipment: ['bodyweight_only'],
    formCues: ['Hands form diamond shape under sternum', 'Elbows track back', 'Full lock-out at top'],
    progression: { easierExerciseId: 'push-up', harderExerciseId: 'archer-push-up' },
    tags: ['bodyweight', 'compound'],
  },
  {
    id: 'archer-push-up',
    name: 'Archer Push-Up',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    movementPattern: 'push',
    difficultyLevel: 4,
    equipment: ['bodyweight_only'],
    formCues: ['One arm fully extended laterally', 'Lower to bent arm side', 'Keep hips square'],
    progression: { easierExerciseId: 'diamond-push-up', harderExerciseId: 'one-arm-push-up' },
    muscleFatigue: { chest: 7, shoulders: 4, triceps: 4, core: 3 },
    tags: ['bodyweight', 'advanced', 'unilateral'],
  },
  {
    id: 'one-arm-push-up',
    name: 'One-Arm Push-Up',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps', 'core'],
    movementPattern: 'push',
    difficultyLevel: 5,
    equipment: ['bodyweight_only'],
    formCues: ['Feet wide for stability', 'Free arm behind back or at side', 'Avoid rotating hips'],
    progression: { easierExerciseId: 'archer-push-up', harderExerciseId: null },
    muscleFatigue: { chest: 9, shoulders: 5, triceps: 6, core: 5 },
    tags: ['bodyweight', 'elite', 'unilateral'],
  },
  {
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    movementPattern: 'push',
    difficultyLevel: 1,
    equipment: ['cable_machine'],
    formCues: ['Seat height: handles at mid-chest', 'Drive through chest not arms', 'Control the eccentric'],
    progression: { easierExerciseId: null, harderExerciseId: 'dumbbell-bench-press' },
    tags: ['machine', 'beginner', 'compound'],
  },
  {
    id: 'dumbbell-bench-press',
    name: 'Dumbbell Bench Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    movementPattern: 'push',
    difficultyLevel: 2,
    equipment: ['dumbbells', 'bench'],
    formCues: ['Feet flat on floor', 'Shoulder blades retracted', 'Lower to mid-chest', 'Full extension without locking'],
    progression: { easierExerciseId: 'machine-chest-press', harderExerciseId: 'barbell-bench-press' },
    tags: ['dumbbell', 'compound', 'beginner'],
  },
  {
    id: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    movementPattern: 'push',
    difficultyLevel: 3,
    equipment: ['barbell', 'bench'],
    formCues: [
      'Bar path: lower to nipple line',
      'Shoulder blades pinched & depressed',
      'Leg drive into floor',
      'Grip just outside shoulder width',
    ],
    progression: { easierExerciseId: 'dumbbell-bench-press', harderExerciseId: 'paused-bench-press' },
    strengthStandards: {
      male: { beginner: 60, novice: 90, intermediate: 115, advanced: 150, elite: 200 },
      female: { beginner: 25, novice: 42, intermediate: 65, advanced: 95, elite: 130 },
      unit: 'kg',
    },
    muscleFatigue: { chest: 8, shoulders: 4, triceps: 5 },
    tags: ['barbell', 'compound', 'powerlifting', 'strength'],
  },
  {
    id: 'paused-bench-press',
    name: 'Paused Bench Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    movementPattern: 'push',
    difficultyLevel: 4,
    equipment: ['barbell', 'bench'],
    formCues: ['1–2 second pause on chest', 'No bounce off chest', 'Maintain tightness at bottom'],
    progression: { easierExerciseId: 'barbell-bench-press', harderExerciseId: 'weighted-dip' },
    muscleFatigue: { chest: 9, shoulders: 4, triceps: 5 },
    tags: ['barbell', 'compound', 'powerlifting', 'advanced'],
  },
  {
    id: 'incline-barbell-press',
    name: 'Incline Barbell Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    movementPattern: 'push',
    difficultyLevel: 3,
    equipment: ['barbell', 'bench'],
    formCues: ['30–45° incline', 'Bar to upper chest / clavicle line', 'Same arch & leg drive as flat'],
    progression: { easierExerciseId: 'incline-dumbbell-press', harderExerciseId: null },
    muscleFatigue: { chest: 8, shoulders: 5, triceps: 5 },
    tags: ['barbell', 'compound', 'upper chest'],
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Incline Dumbbell Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    movementPattern: 'push',
    difficultyLevel: 2,
    equipment: ['dumbbells', 'bench'],
    formCues: ['30–45° incline', 'Full stretch at bottom', 'Elbows ~45°'],
    progression: { easierExerciseId: 'dumbbell-bench-press', harderExerciseId: 'incline-barbell-press' },
    tags: ['dumbbell', 'compound', 'upper chest'],
  },
  {
    id: 'cable-chest-fly',
    name: 'Cable Chest Fly',
    primaryMuscle: 'chest',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 2,
    equipment: ['cable_machine'],
    formCues: ['Slight elbow bend maintained', 'Squeeze at peak contraction', 'Adjust pulley for upper/lower chest emphasis'],
    progression: { easierExerciseId: 'machine-chest-press', harderExerciseId: 'dumbbell-fly' },
    tags: ['cable', 'isolation', 'stretch overload'],
  },
  {
    id: 'dumbbell-fly',
    name: 'Dumbbell Chest Fly',
    primaryMuscle: 'chest',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 3,
    equipment: ['dumbbells', 'bench'],
    formCues: ['Deep stretch at bottom', 'Slight elbow bend throughout', 'Avoid going too heavy'],
    progression: { easierExerciseId: 'cable-chest-fly', harderExerciseId: null },
    tags: ['dumbbell', 'isolation', 'stretch overload'],
  },
  {
    id: 'weighted-dip',
    name: 'Weighted Dip',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    movementPattern: 'push',
    difficultyLevel: 4,
    equipment: ['bodyweight_only', 'bench'],
    formCues: ['Lean forward for chest emphasis', 'Lower until shoulders below elbows', 'Full lock-out at top'],
    progression: { easierExerciseId: 'paused-bench-press', harderExerciseId: null },
    strengthStandards: {
      male: { beginner: 0, novice: 19, intermediate: 50, advanced: 86, elite: 125 },
      female: { beginner: -20, novice: -3, intermediate: 20, advanced: 44, elite: 72 },
      unit: 'kg', // added weight (negative = assistance)
    },
    muscleFatigue: { chest: 7, triceps: 8, shoulders: 5 },
    tags: ['bodyweight', 'compound', 'advanced'],
  },
];

// ---------------------------------------------------------------------------
// BACK (Pull — vertical & horizontal)
// ---------------------------------------------------------------------------

const backExercises: Exercise[] = [
  {
    id: 'dead-hang',
    name: 'Dead Hang',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    movementPattern: 'pull',
    difficultyLevel: 1,
    equipment: ['pull_up_bar'],
    formCues: ['Full arm extension', 'Depress shoulder blades', 'Breathe steadily', 'Build hang time gradually'],
    progression: { easierExerciseId: null, harderExerciseId: 'australian-pull-up' },
    tags: ['bodyweight', 'beginner', 'grip', 'prehab', 'isometric'],
    v4Tags: ['grip'],
    isStatic: true,
    defaultHoldSeconds: 30,
  },
  {
    id: 'australian-pull-up',
    name: 'Australian Pull-Up (Inverted Row)',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'core'],
    movementPattern: 'pull',
    difficultyLevel: 1,
    equipment: ['pull_up_bar', 'bodyweight_only'],
    formCues: ['Bar at waist height', 'Heels on floor', 'Pull chest to bar', 'Easier with higher bar'],
    progression: { easierExerciseId: 'dead-hang', harderExerciseId: 'lat-pulldown' },
    tags: ['bodyweight', 'beginner', 'horizontal pull'],
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'shoulders'],
    movementPattern: 'pull',
    difficultyLevel: 2,
    equipment: ['cable_machine'],
    formCues: ['Lean back slightly', 'Pull to upper chest', 'Depress shoulder blades before pulling', 'Avoid swinging'],
    progression: { easierExerciseId: 'australian-pull-up', harderExerciseId: 'pull-up' },
    tags: ['cable', 'compound', 'beginner', 'vertical pull'],
  },
  {
    id: 'pull-up',
    name: 'Pull-Up',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'core'],
    movementPattern: 'pull',
    difficultyLevel: 3,
    equipment: ['pull_up_bar'],
    formCues: ['Overhand grip shoulder-width', 'Full extension at bottom', 'Chin over bar', 'Avoid kipping'],
    progression: { easierExerciseId: 'lat-pulldown', harderExerciseId: 'weighted-pull-up' },
    strengthStandards: {
      male: { beginner: 0, novice: 5, intermediate: 14, advanced: 25, elite: 37 },
      female: { beginner: 0, novice: 0, intermediate: 6, advanced: 15, elite: 26 },
      unit: 'reps',
    },
    muscleFatigue: { back: 8, biceps: 6, shoulders: 3, core: 2 },
    tags: ['bodyweight', 'compound', 'intermediate', 'vertical pull'],
  },
  {
    id: 'chin-up',
    name: 'Chin-Up',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'core'],
    movementPattern: 'pull',
    difficultyLevel: 3,
    equipment: ['pull_up_bar'],
    formCues: ['Underhand grip shoulder-width', 'Full extension at bottom', 'Chest to bar for full ROM'],
    progression: { easierExerciseId: 'lat-pulldown', harderExerciseId: 'weighted-pull-up' },
    muscleFatigue: { biceps: 7, back: 7, shoulders: 3 },
    tags: ['bodyweight', 'compound', 'intermediate', 'bicep emphasis', 'vertical pull'],
  },
  {
    id: 'weighted-pull-up',
    name: 'Weighted Pull-Up',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'core'],
    movementPattern: 'pull',
    difficultyLevel: 4,
    equipment: ['pull_up_bar'],
    formCues: ['Weight belt or dumbbell between feet', 'Same form as bodyweight pull-up', 'Full ROM every rep'],
    progression: { easierExerciseId: 'pull-up', harderExerciseId: null },
    muscleFatigue: { back: 9, biceps: 7, shoulders: 4, core: 3 },
    tags: ['bodyweight', 'compound', 'advanced', 'vertical pull'],
  },
  {
    id: 'dumbbell-row',
    name: 'Single-Arm Dumbbell Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    movementPattern: 'pull',
    difficultyLevel: 2,
    equipment: ['dumbbells', 'bench'],
    formCues: ['Brace on bench with same-side knee & hand', 'Row to hip, not shoulder', 'Full stretch at bottom'],
    progression: { easierExerciseId: 'australian-pull-up', harderExerciseId: 'barbell-bent-over-row' },
    tags: ['dumbbell', 'compound', 'unilateral', 'horizontal pull'],
  },
  {
    id: 'barbell-bent-over-row',
    name: 'Barbell Bent-Over Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'hamstrings', 'core'],
    movementPattern: 'pull',
    difficultyLevel: 3,
    equipment: ['barbell'],
    formCues: ['Hip hinge ~45°', 'Bar to lower sternum', 'Retract shoulder blades at top', 'Brace core throughout'],
    progression: { easierExerciseId: 'dumbbell-row', harderExerciseId: 'pendlay-row' },
    strengthStandards: {
      male: { beginner: 40, novice: 60, intermediate: 85, advanced: 115, elite: 147 },
      female: { beginner: 15, novice: 26, intermediate: 41, advanced: 59, elite: 79 },
      unit: 'kg',
    },
    muscleFatigue: { back: 8, biceps: 5, core: 5, glutes: 2 },
    tags: ['barbell', 'compound', 'intermediate', 'horizontal pull'],
  },
  {
    id: 'pendlay-row',
    name: 'Pendlay Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'hamstrings', 'core'],
    movementPattern: 'pull',
    difficultyLevel: 4,
    equipment: ['barbell'],
    formCues: ['Bar starts on floor each rep', 'Torso nearly horizontal', 'Explosive pull', 'Bar to lower chest'],
    progression: { easierExerciseId: 'barbell-bent-over-row', harderExerciseId: null },
    muscleFatigue: { back: 9, biceps: 5, core: 6 },
    tags: ['barbell', 'compound', 'advanced', 'horizontal pull', 'powerlifting'],
  },
  {
    id: 'seated-cable-row',
    name: 'Seated Cable Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    movementPattern: 'pull',
    difficultyLevel: 2,
    equipment: ['cable_machine'],
    formCues: ['Sit tall', 'Drive elbows past torso', 'Squeeze shoulder blades at peak', 'Avoid torso swinging'],
    progression: { easierExerciseId: 'australian-pull-up', harderExerciseId: 'barbell-bent-over-row' },
    tags: ['cable', 'compound', 'beginner', 'horizontal pull'],
  },
  {
    id: 'deadlift',
    name: 'Conventional Deadlift',
    primaryMuscle: 'back',
    secondaryMuscles: ['glutes', 'hamstrings', 'quads', 'core'],
    movementPattern: 'hinge',
    difficultyLevel: 3,
    equipment: ['barbell'],
    formCues: [
      'Bar over mid-foot',
      'Hips between shoulders and knees at start',
      'Brace & "push the floor away"',
      'Bar stays in contact with legs',
      'Lock out hips & knees simultaneously',
    ],
    progression: { easierExerciseId: 'romanian-deadlift', harderExerciseId: 'sumo-deadlift' },
    strengthStandards: {
      male: { beginner: 78, novice: 112, intermediate: 152, advanced: 200, elite: 250 },
      female: { beginner: 38, novice: 60, intermediate: 88, advanced: 120, elite: 157 },
      unit: 'kg',
    },
    muscleFatigue: { back: 9, glutes: 8, hamstrings: 8, core: 6, quads: 3 },
    tags: ['barbell', 'compound', 'powerlifting', 'posterior chain', 'strength'],
  },
  {
    id: 'sumo-deadlift',
    name: 'Sumo Deadlift',
    primaryMuscle: 'back',
    secondaryMuscles: ['glutes', 'quads', 'hamstrings'],
    movementPattern: 'hinge',
    difficultyLevel: 4,
    equipment: ['barbell'],
    formCues: ['Wide stance, toes angled out', 'Grip inside the legs', 'Push knees out over toes', 'Stay upright'],
    progression: { easierExerciseId: 'deadlift', harderExerciseId: null },
    muscleFatigue: { glutes: 9, hamstrings: 8, back: 7, quads: 5, core: 5 },
    tags: ['barbell', 'compound', 'powerlifting', 'advanced'],
  },
  {
    id: 'back-extension',
    name: 'Back Extension',
    primaryMuscle: 'back',
    secondaryMuscles: ['glutes', 'hamstrings'],
    movementPattern: 'hinge',
    difficultyLevel: 1,
    equipment: ['bodyweight_only'],
    formCues: ['Neutral spine', 'Squeeze glutes at top', 'Slow controlled movement'],
    progression: { easierExerciseId: null, harderExerciseId: 'good-morning' },
    tags: ['bodyweight', 'beginner', 'rehabilitation', 'lower back'],
  },
  {
    id: 'good-morning',
    name: 'Good Morning',
    primaryMuscle: 'back',
    secondaryMuscles: ['hamstrings', 'glutes'],
    movementPattern: 'hinge',
    difficultyLevel: 3,
    equipment: ['barbell'],
    formCues: ['Bar across upper traps', 'Soft knee bend', 'Hinge until torso ~45°', 'Start light (50% of squat)'],
    progression: { easierExerciseId: 'back-extension', harderExerciseId: 'deadlift' },
    muscleFatigue: { hamstrings: 7, glutes: 6, back: 6 },
    tags: ['barbell', 'compound', 'posterior chain'],
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['back'],
    movementPattern: 'pull',
    difficultyLevel: 1,
    equipment: ['cable_machine', 'resistance_bands'],
    formCues: ['Rope at face height', 'Pull to forehead, elbows flare out', 'External rotation at end', 'Light weight'],
    progression: { easierExerciseId: null, harderExerciseId: 'barbell-bent-over-row' },
    tags: ['cable', 'isolation', 'prehab', 'rear delt', 'rotator cuff'],
  },
];

// ---------------------------------------------------------------------------
// SHOULDERS (Push / Pull)
// ---------------------------------------------------------------------------

const shoulderExercises: Exercise[] = [
  {
    id: 'band-lateral-raise',
    name: 'Band Lateral Raise',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['back'],
    movementPattern: 'isolation',
    difficultyLevel: 1,
    equipment: ['resistance_bands'],
    formCues: ['Slight forward lean', 'Lead with elbows', 'Raise to ear height', 'Slow lower'],
    progression: { easierExerciseId: null, harderExerciseId: 'lateral-raise' },
    muscleFatigue: { shoulders: 3, back: 1 },
    tags: ['isolation', 'beginner', 'home'],
  },
  {
    id: 'pike-push-up',
    name: 'Pike Push-Up',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'core'],
    movementPattern: 'push',
    difficultyLevel: 2,
    equipment: ['bodyweight_only'],
    formCues: ['Hips high, body inverted V', 'Hands shoulder-width', 'Lower head between hands', 'Push back up'],
    progression: { easierExerciseId: 'band-lateral-raise', harderExerciseId: 'elevated-pike-push-up' },
    muscleFatigue: { shoulders: 5, triceps: 3, core: 2 },
    tags: ['bodyweight', 'compound', 'beginner'],
  },
  {
    id: 'elevated-pike-push-up',
    name: 'Elevated Pike Push-Up',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'core'],
    movementPattern: 'push',
    difficultyLevel: 3,
    equipment: ['bodyweight_only', 'bench'],
    formCues: ['Feet elevated on bench', 'Body near vertical', 'Lower head to floor', 'Drive up explosively'],
    progression: { easierExerciseId: 'pike-push-up', harderExerciseId: 'barbell-overhead-press' },
    muscleFatigue: { shoulders: 7, triceps: 4, core: 3 },
    tags: ['bodyweight', 'compound', 'intermediate'],
  },
  {
    id: 'band-pull-apart',
    name: 'Band Pull-Apart',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['back'],
    movementPattern: 'pull',
    difficultyLevel: 1,
    equipment: ['resistance_bands'],
    formCues: ['Hold band at shoulder height', 'Pull apart to full extension', 'Squeeze rear delts', 'High reps, light band'],
    progression: { easierExerciseId: null, harderExerciseId: 'lateral-raise' },
    tags: ['band', 'isolation', 'beginner', 'prehab', 'rear delt'],
  },
  {
    id: 'lateral-raise',
    name: 'Dumbbell Lateral Raise',
    primaryMuscle: 'shoulders',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 1,
    equipment: ['dumbbells'],
    formCues: ['Slight elbow bend', 'Lead with elbows not hands', 'Raise to shoulder height', 'Slow eccentric'],
    progression: { easierExerciseId: 'band-pull-apart', harderExerciseId: 'seated-db-press' },
    tags: ['dumbbell', 'isolation', 'beginner', 'lateral delt'],
  },
  {
    id: 'seated-db-press',
    name: 'Seated Dumbbell Shoulder Press',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps'],
    movementPattern: 'push',
    difficultyLevel: 2,
    equipment: ['dumbbells', 'bench'],
    formCues: ['Dumbbells at ear level', 'Press in arc overhead', 'Avoid arching lower back'],
    progression: { easierExerciseId: 'lateral-raise', harderExerciseId: 'barbell-overhead-press' },
    tags: ['dumbbell', 'compound', 'beginner', 'vertical push'],
  },
  {
    id: 'barbell-overhead-press',
    name: 'Barbell Overhead Press (OHP)',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'core'],
    movementPattern: 'push',
    difficultyLevel: 3,
    equipment: ['barbell'],
    formCues: [
      'Bar rests on front delts before press',
      'Grip just outside shoulder width',
      'Squeeze glutes & brace core',
      'Press in straight line, head moves back then forward',
      'Full lock-out overhead',
    ],
    progression: { easierExerciseId: 'seated-db-press', harderExerciseId: 'push-press' },
    strengthStandards: {
      male: { beginner: 30, novice: 45, intermediate: 64, advanced: 87, elite: 113 },
      female: { beginner: 13, novice: 22, intermediate: 34, advanced: 49, elite: 65 },
      unit: 'kg',
    },
    muscleFatigue: { shoulders: 8, triceps: 6, core: 4 },
    tags: ['barbell', 'compound', 'intermediate', 'vertical push', 'strength'],
  },
  {
    id: 'push-press',
    name: 'Push Press',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'quads', 'core'],
    movementPattern: 'push',
    difficultyLevel: 4,
    equipment: ['barbell'],
    formCues: ['Slight knee dip', 'Explosive leg drive to initiate press', 'Full lock-out overhead', 'Heavier than strict OHP'],
    progression: { easierExerciseId: 'barbell-overhead-press', harderExerciseId: null },
    muscleFatigue: { shoulders: 7, triceps: 5, core: 5, quads: 3 },
    tags: ['barbell', 'compound', 'advanced', 'vertical push', 'explosive'],
  },
  {
    id: 'upright-row',
    name: 'Barbell Upright Row',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['back', 'biceps'],
    movementPattern: 'pull',
    difficultyLevel: 2,
    equipment: ['barbell'],
    formCues: ['Wider grip to reduce impingement risk', 'Elbows lead the pull', 'Pull to lower chest / upper abs'],
    progression: { easierExerciseId: 'band-pull-apart', harderExerciseId: 'barbell-overhead-press' },
    tags: ['barbell', 'compound', 'intermediate', 'lateral delt'],
  },
  {
    id: 'reverse-fly',
    name: 'Reverse Dumbbell Fly',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['back'],
    movementPattern: 'pull',
    difficultyLevel: 1,
    equipment: ['dumbbells'],
    formCues: ['Hinge forward slightly', 'Lead with elbows', 'Squeeze rear delts at top', 'Use light weights'],
    progression: { easierExerciseId: 'band-pull-apart', harderExerciseId: 'face-pull' },
    tags: ['dumbbell', 'isolation', 'beginner', 'rear delt'],
  },
  {
    id: 'arnold-press',
    name: 'Arnold Press',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps'],
    movementPattern: 'push',
    difficultyLevel: 3,
    equipment: ['dumbbells', 'bench'],
    formCues: ['Start with palms facing you', 'Rotate palms outward as you press up', 'Full ROM rotation'],
    progression: { easierExerciseId: 'seated-db-press', harderExerciseId: 'barbell-overhead-press' },
    tags: ['dumbbell', 'compound', 'intermediate', 'vertical push', 'rotation'],
  },
];

// ---------------------------------------------------------------------------
// BICEPS (Pull / Isolation)
// ---------------------------------------------------------------------------

const bicepsExercises: Exercise[] = [
  {
    id: 'resistance-band-curl',
    name: 'Resistance Band Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 1,
    equipment: ['resistance_bands'],
    formCues: ['Stand on band', 'Elbows fixed at sides', 'Supinate at top', 'Control the eccentric'],
    progression: { easierExerciseId: null, harderExerciseId: 'dumbbell-curl' },
    tags: ['band', 'isolation', 'beginner'],
  },
  {
    id: 'dumbbell-curl',
    name: 'Dumbbell Bicep Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 1,
    equipment: ['dumbbells'],
    formCues: ['Elbows locked at sides', 'Supinate wrist as you curl up', 'Full extension at bottom', 'No swinging'],
    progression: { easierExerciseId: 'resistance-band-curl', harderExerciseId: 'barbell-curl' },
    tags: ['dumbbell', 'isolation', 'beginner'],
  },
  {
    id: 'hammer-curl',
    name: 'Hammer Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 1,
    equipment: ['dumbbells'],
    formCues: ['Neutral grip (thumbs up)', 'Elbows at sides', 'Hits brachialis & brachioradialis more'],
    progression: { easierExerciseId: 'resistance-band-curl', harderExerciseId: 'barbell-curl' },
    tags: ['dumbbell', 'isolation', 'beginner', 'brachialis'],
  },
  {
    id: 'barbell-curl',
    name: 'Barbell Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 2,
    equipment: ['barbell'],
    formCues: ['Shoulder-width grip', 'Elbows forward slightly at peak', 'Full extension at bottom', 'Avoid elbow drift back'],
    progression: { easierExerciseId: 'dumbbell-curl', harderExerciseId: 'preacher-curl' },
    strengthStandards: {
      male: { beginner: 17, novice: 30, intermediate: 47, advanced: 68, elite: 91 },
      female: { beginner: 6, novice: 14, intermediate: 25, advanced: 39, elite: 54 },
      unit: 'kg',
    },
    tags: ['barbell', 'isolation', 'beginner', 'strength'],
  },
  {
    id: 'preacher-curl',
    name: 'Preacher Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 3,
    equipment: ['barbell', 'bench'],
    formCues: ['Arm fully on pad', 'Full extension at bottom', 'Do not hyperextend', 'Eliminates body English'],
    progression: { easierExerciseId: 'barbell-curl', harderExerciseId: 'incline-dumbbell-curl' },
    tags: ['barbell', 'isolation', 'intermediate', 'strict form'],
  },
  {
    id: 'incline-dumbbell-curl',
    name: 'Incline Dumbbell Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 3,
    equipment: ['dumbbells', 'bench'],
    formCues: ['45–60° incline', 'Arms hang behind torso for maximal stretch', 'Slow eccentric', 'Stretches long head of biceps'],
    progression: { easierExerciseId: 'preacher-curl', harderExerciseId: null },
    tags: ['dumbbell', 'isolation', 'intermediate', 'stretch overload'],
  },
  {
    id: 'cable-curl',
    name: 'Cable Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 2,
    equipment: ['cable_machine'],
    formCues: ['Constant tension throughout', 'Elbows pinned to sides', 'Full squeeze at peak'],
    progression: { easierExerciseId: 'dumbbell-curl', harderExerciseId: 'preacher-curl' },
    tags: ['cable', 'isolation', 'intermediate'],
  },
  {
    id: 'concentration-curl',
    name: 'Concentration Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['shoulders'],
    movementPattern: 'isolation',
    difficultyLevel: 2,
    equipment: ['dumbbells'],
    formCues: ['Elbow braced on inner thigh', 'Full range of motion', 'Squeeze at top', 'No shoulder involvement'],
    progression: { easierExerciseId: 'dumbbell-curl', harderExerciseId: 'preacher-curl' },
    muscleFatigue: { biceps: 6, shoulders: 1 },
    tags: ['isolation', 'beginner'],
  },
  {
    id: 'spider-curl',
    name: 'Spider Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['shoulders'],
    movementPattern: 'isolation',
    difficultyLevel: 3,
    equipment: ['dumbbells', 'barbell', 'bench'],
    formCues: ['Chest on incline bench', 'Arms hang free', 'Curl with elbows fixed', 'Full extension each rep'],
    progression: { easierExerciseId: 'preacher-curl', harderExerciseId: 'incline-dumbbell-curl' },
    muscleFatigue: { biceps: 7, shoulders: 1 },
    tags: ['isolation', 'intermediate'],
  },
];

// ---------------------------------------------------------------------------
// TRICEPS (Push / Isolation)
// ---------------------------------------------------------------------------

const tricepsExercises: Exercise[] = [
  {
    id: 'tricep-pushdown-band',
    name: 'Resistance Band Tricep Pushdown',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 1,
    equipment: ['resistance_bands'],
    formCues: ['Elbows at sides', 'Push to full extension', 'Control the return'],
    progression: { easierExerciseId: null, harderExerciseId: 'tricep-pushdown' },
    tags: ['band', 'isolation', 'beginner'],
  },
  {
    id: 'tricep-pushdown',
    name: 'Cable Tricep Pushdown',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 2,
    equipment: ['cable_machine'],
    formCues: ['Elbows pinned to sides', 'Push to full lock-out', 'Avoid shrugging', 'Use rope or bar attachment'],
    progression: { easierExerciseId: 'tricep-pushdown-band', harderExerciseId: 'skull-crusher' },
    tags: ['cable', 'isolation', 'beginner'],
  },
  {
    id: 'overhead-tricep-extension',
    name: 'Overhead Tricep Extension',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 2,
    equipment: ['dumbbells', 'cable_machine'],
    formCues: ['Keep elbows pointing up, not flaring out', 'Full stretch at bottom', 'Targets long head primarily'],
    progression: { easierExerciseId: 'tricep-pushdown', harderExerciseId: 'skull-crusher' },
    tags: ['dumbbell', 'cable', 'isolation', 'beginner', 'long head', 'stretch overload'],
  },
  {
    id: 'skull-crusher',
    name: 'Skull Crusher (EZ-Bar Lying Tricep Extension)',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 3,
    equipment: ['barbell', 'bench'],
    formCues: ['Lower to forehead or behind head', 'Elbows point at ceiling throughout', 'Full extension at top'],
    progression: { easierExerciseId: 'overhead-tricep-extension', harderExerciseId: 'close-grip-bench' },
    muscleFatigue: { triceps: 8, shoulders: 2 },
    tags: ['barbell', 'isolation', 'intermediate', 'long head'],
  },
  {
    id: 'close-grip-bench',
    name: 'Close-Grip Bench Press',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['chest', 'shoulders'],
    movementPattern: 'push',
    difficultyLevel: 3,
    equipment: ['barbell', 'bench'],
    formCues: ['Grip shoulder-width (not too close)', 'Elbows tucked ~45°', 'Lower to lower chest', 'Compound movement'],
    progression: { easierExerciseId: 'skull-crusher', harderExerciseId: 'weighted-dip' },
    muscleFatigue: { triceps: 7, chest: 5, shoulders: 3 },
    tags: ['barbell', 'compound', 'intermediate'],
  },
  {
    id: 'bench-dip',
    name: 'Bench Dip',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['chest', 'shoulders'],
    movementPattern: 'push',
    difficultyLevel: 1,
    equipment: ['bench', 'bodyweight_only'],
    formCues: ['Hands on bench behind you', 'Feet forward, legs extended', 'Lower until arms ~90°'],
    progression: { easierExerciseId: null, harderExerciseId: 'tricep-pushdown' },
    tags: ['bodyweight', 'compound', 'beginner'],
  },
  {
    id: 'parallel-bar-dip',
    name: 'Parallel Bar Dip (Tricep Upright)',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['chest', 'shoulders'],
    movementPattern: 'push',
    difficultyLevel: 3,
    equipment: ['bodyweight_only'],
    formCues: ['Stay upright (minimal forward lean)', 'Lower until arms 90°', 'Full lock-out at top'],
    progression: { easierExerciseId: 'bench-dip', harderExerciseId: 'weighted-dip' },
    tags: ['bodyweight', 'compound', 'intermediate'],
  },
];

// ---------------------------------------------------------------------------
// CORE (Anti-extension, Anti-rotation, Flexion)
// ---------------------------------------------------------------------------

const coreExercises: Exercise[] = [
  {
    id: 'dead-bug',
    name: 'Dead Bug',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    movementPattern: 'core',
    difficultyLevel: 1,
    equipment: ['bodyweight_only'],
    formCues: ['Lower back pressed into floor', 'Extend opposite arm & leg', 'Breathe out on extension', 'Slow controlled'],
    progression: { easierExerciseId: null, harderExerciseId: 'hollow-body-hold' },
    tags: ['bodyweight', 'beginner', 'anti-extension', 'rehabilitation'],
  },
  {
    id: 'hollow-body-hold',
    name: 'Hollow Body Hold',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    movementPattern: 'core',
    difficultyLevel: 2,
    equipment: ['bodyweight_only'],
    formCues: ['Lower back pressed into floor', 'Tuck then extend legs', 'Arms overhead', 'Hold for time'],
    progression: { easierExerciseId: 'dead-bug', harderExerciseId: 'plank' },
    tags: ['bodyweight', 'beginner', 'anti-extension', 'gymnastics', 'isometric'],
    isStatic: true,
    defaultHoldSeconds: 20,
  },
  {
    id: 'plank',
    name: 'Plank',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders'],
    movementPattern: 'core',
    difficultyLevel: 2,
    equipment: ['bodyweight_only'],
    formCues: ['Forearms or hands', 'Straight line head-to-heel', 'No sagging hips or piked butt', 'Brace core, breathe steadily'],
    progression: { easierExerciseId: 'hollow-body-hold', harderExerciseId: 'ab-wheel-rollout' },
    tags: ['bodyweight', 'beginner', 'anti-extension', 'isometric'],
    isStatic: true,
    defaultHoldSeconds: 30,
  },
  {
    id: 'hanging-knee-raise',
    name: 'Hanging Knee Raise',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    movementPattern: 'core',
    difficultyLevel: 2,
    equipment: ['pull_up_bar'],
    formCues: ['Dead hang start', 'Pull knees to chest', 'Avoid swinging', 'Control the descent'],
    progression: { easierExerciseId: 'hollow-body-hold', harderExerciseId: 'hanging-leg-raise' },
    tags: ['bodyweight', 'beginner', 'flexion'],
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    movementPattern: 'core',
    difficultyLevel: 3,
    equipment: ['pull_up_bar'],
    formCues: ['Legs straight', 'Raise to hip height or higher', 'Posterior pelvic tilt at top', 'No swinging'],
    progression: { easierExerciseId: 'hanging-knee-raise', harderExerciseId: 'ab-wheel-rollout' },
    tags: ['bodyweight', 'intermediate', 'flexion'],
  },
  {
    id: 'ab-wheel-rollout',
    name: 'Ab Wheel Rollout',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders', 'back'],
    movementPattern: 'core',
    difficultyLevel: 4,
    equipment: ['bodyweight_only'],
    formCues: ['Start kneeling', 'Roll out until hips about to sag', 'Pull back with abs, not arms', 'Advance to standing rollout'],
    progression: { easierExerciseId: 'hanging-leg-raise', harderExerciseId: 'standing-ab-wheel' },
    muscleFatigue: { core: 9, shoulders: 4 },
    tags: ['bodyweight', 'advanced', 'anti-extension'],
  },
  {
    id: 'standing-ab-wheel',
    name: 'Standing Ab Wheel Rollout',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders', 'back'],
    movementPattern: 'core',
    difficultyLevel: 5,
    equipment: ['bodyweight_only'],
    formCues: ['Start standing, feet hip-width', 'Roll out completely', 'Return with only core strength'],
    progression: { easierExerciseId: 'ab-wheel-rollout', harderExerciseId: null },
    muscleFatigue: { core: 10, shoulders: 5 },
    tags: ['bodyweight', 'elite', 'anti-extension'],
  },
  {
    id: 'cable-crunch',
    name: 'Cable Crunch',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    movementPattern: 'core',
    difficultyLevel: 2,
    equipment: ['cable_machine'],
    formCues: ['Kneel facing cable', 'Hands at head, crunch elbows to knees', 'Flex at spine, not just hips', 'Control the stretch'],
    progression: { easierExerciseId: 'plank', harderExerciseId: 'hanging-leg-raise' },
    tags: ['cable', 'isolation', 'beginner', 'flexion'],
  },
  {
    id: 'russian-twist',
    name: 'Russian Twist',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    movementPattern: 'core',
    difficultyLevel: 2,
    equipment: ['bodyweight_only', 'dumbbells'],
    formCues: ['Lean back ~45°', 'Feet off floor for harder version', 'Rotate fully side to side', 'Touch the floor on each rep'],
    progression: { easierExerciseId: 'plank', harderExerciseId: 'hanging-leg-raise' },
    tags: ['bodyweight', 'intermediate', 'rotation', 'obliques'],
  },
  {
    id: 'side-plank',
    name: 'Side Plank',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders', 'glutes'],
    movementPattern: 'core',
    difficultyLevel: 2,
    equipment: ['bodyweight_only'],
    formCues: ['Elbow directly under shoulder', 'Hips stacked', 'Body in straight line', 'Hold position'],
    progression: { easierExerciseId: 'plank', harderExerciseId: 'hanging-leg-raise' },
    muscleFatigue: { core: 5, shoulders: 2, glutes: 2 },
    isStatic: true,
    defaultHoldSeconds: 30,
    tags: ['bodyweight', 'isometric', 'beginner'],
  },
  {
    id: 'pallof-press',
    name: 'Pallof Press',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders', 'back'],
    movementPattern: 'core',
    difficultyLevel: 2,
    equipment: ['cable', 'resistance_bands'],
    formCues: ['Cable at chest height', 'Stand perpendicular to cable', 'Press straight out and return', 'Resist rotation throughout'],
    progression: { easierExerciseId: 'plank', harderExerciseId: 'cable-crunch' },
    muscleFatigue: { core: 5, shoulders: 2, back: 2 },
    tags: ['anti-rotation', 'functional', 'beginner'],
  },
];

// ---------------------------------------------------------------------------
// QUADS (Squat pattern)
// ---------------------------------------------------------------------------

const quadExercises: Exercise[] = [
  {
    id: 'bodyweight-squat',
    name: 'Bodyweight Squat',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'core'],
    movementPattern: 'squat',
    difficultyLevel: 1,
    equipment: ['bodyweight_only'],
    formCues: ['Feet shoulder-width', 'Knees track over toes', 'Chest up', 'Hip crease below knee at bottom'],
    progression: { easierExerciseId: null, harderExerciseId: 'goblet-squat' },
    tags: ['bodyweight', 'compound', 'beginner'],
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'core'],
    movementPattern: 'squat',
    difficultyLevel: 1,
    equipment: ['dumbbells', 'kettlebell'],
    formCues: ['Hold weight at chest', 'Elbows inside knees at bottom', 'Upright torso', 'Deep squat encouraged'],
    progression: { easierExerciseId: 'bodyweight-squat', harderExerciseId: 'dumbbell-squat' },
    tags: ['dumbbell', 'kettlebell', 'compound', 'beginner'],
  },
  {
    id: 'dumbbell-squat',
    name: 'Dumbbell Squat',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'core'],
    movementPattern: 'squat',
    difficultyLevel: 2,
    equipment: ['dumbbells'],
    formCues: ['Dumbbells at sides or rack position', 'Upright torso', 'Full depth', 'Drive through heels'],
    progression: { easierExerciseId: 'goblet-squat', harderExerciseId: 'barbell-back-squat' },
    tags: ['dumbbell', 'compound', 'beginner'],
  },
  {
    id: 'barbell-back-squat',
    name: 'Barbell Back Squat',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'core'],
    movementPattern: 'squat',
    difficultyLevel: 3,
    equipment: ['barbell'],
    formCues: [
      'Bar on upper traps (high bar) or rear delts (low bar)',
      'Brace core 360°',
      'Knees track over toes',
      'Hip crease below knees',
      'Drive through whole foot',
    ],
    progression: { easierExerciseId: 'dumbbell-squat', harderExerciseId: 'front-squat' },
    strengthStandards: {
      male: { beginner: 64, novice: 93, intermediate: 130, advanced: 173, elite: 219 },
      female: { beginner: 29, novice: 49, intermediate: 73, advanced: 103, elite: 136 },
      unit: 'kg',
    },
    muscleFatigue: { quads: 9, glutes: 8, hamstrings: 5, core: 6 },
    tags: ['barbell', 'compound', 'powerlifting', 'strength'],
  },
  {
    id: 'front-squat',
    name: 'Barbell Front Squat',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'core'],
    movementPattern: 'squat',
    difficultyLevel: 4,
    equipment: ['barbell'],
    formCues: ['Bar on front delts / clavicle', 'Elbows high parallel to floor', 'Very upright torso required', 'Deep knee flexion emphasis'],
    progression: { easierExerciseId: 'barbell-back-squat', harderExerciseId: 'pause-squat' },
    muscleFatigue: { quads: 9, core: 7, glutes: 6, hamstrings: 4 },
    tags: ['barbell', 'compound', 'advanced', 'olympic lifting'],
  },
  {
    id: 'pause-squat',
    name: 'Pause Squat',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'core'],
    movementPattern: 'squat',
    difficultyLevel: 4,
    equipment: ['barbell'],
    formCues: ['2–3 second pause at bottom', 'No bounce out of hole', 'Stay tight throughout pause'],
    progression: { easierExerciseId: 'front-squat', harderExerciseId: null },
    tags: ['barbell', 'compound', 'advanced', 'powerlifting'],
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings'],
    movementPattern: 'squat',
    difficultyLevel: 1,
    equipment: ['cable_machine'],
    formCues: ['Feet hip-width', 'Lower until 90° knee angle', 'Do not lock knees at top', 'Feet high = more glutes'],
    progression: { easierExerciseId: 'bodyweight-squat', harderExerciseId: 'barbell-back-squat' },
    strengthStandards: {
      male: { beginner: 87, novice: 147, intermediate: 226, advanced: 323, elite: 432 },
      female: { beginner: 41, novice: 82, intermediate: 141, advanced: 214, elite: 299 },
      unit: 'kg',
    },
    tags: ['machine', 'compound', 'beginner'],
  },
  {
    id: 'lunge',
    name: 'Walking Lunge',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'core'],
    movementPattern: 'squat',
    difficultyLevel: 2,
    equipment: ['bodyweight_only', 'dumbbells'],
    formCues: ['90° both knees at bottom', 'Front knee over ankle', 'Upright torso', 'Step through to next lunge'],
    progression: { easierExerciseId: 'bodyweight-squat', harderExerciseId: 'bulgarian-split-squat' },
    tags: ['bodyweight', 'dumbbell', 'compound', 'unilateral'],
  },
  {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'core'],
    movementPattern: 'squat',
    difficultyLevel: 3,
    equipment: ['bench', 'dumbbells', 'barbell'],
    formCues: ['Rear foot elevated on bench', 'Front foot far enough for vertical shin', 'Deep knee bend', 'Controlled descent'],
    progression: { easierExerciseId: 'lunge', harderExerciseId: 'front-squat' },
    muscleFatigue: { quads: 8, glutes: 7, hamstrings: 4, core: 3 },
    tags: ['compound', 'intermediate', 'unilateral', 'glute emphasis'],
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    primaryMuscle: 'quads',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 1,
    equipment: ['cable_machine'],
    formCues: ['Full lock-out at top', 'Slow eccentric', 'Avoid hyperextension', 'Isolation for VMO'],
    progression: { easierExerciseId: null, harderExerciseId: 'barbell-back-squat' },
    tags: ['machine', 'isolation', 'beginner'],
  },
  {
    id: 'step-up',
    name: 'Step-Up',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes'],
    movementPattern: 'squat',
    difficultyLevel: 2,
    equipment: ['bench', 'bodyweight_only', 'dumbbells'],
    formCues: ['Full foot on box', 'Drive through heel of lead leg', 'Avoid pushing off rear foot', 'Control descent'],
    progression: { easierExerciseId: 'bodyweight-squat', harderExerciseId: 'bulgarian-split-squat' },
    tags: ['bodyweight', 'dumbbell', 'compound', 'unilateral', 'beginner'],
  },
  {
    id: 'walking-lunge',
    name: 'Walking Lunge',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings', 'core'],
    movementPattern: 'squat',
    difficultyLevel: 2,
    equipment: ['bodyweight_only', 'dumbbells', 'barbell'],
    formCues: ['Step forward into lunge', 'Back knee near floor', 'Front shin vertical', 'Drive through front heel to next step'],
    progression: { easierExerciseId: 'lunge', harderExerciseId: 'bulgarian-split-squat' },
    muscleFatigue: { quads: 6, glutes: 5, hamstrings: 3, core: 2 },
    tags: ['compound', 'beginner', 'functional'],
  },
  {
    id: 'hack-squat',
    name: 'Hack Squat (Machine)',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'hamstrings'],
    movementPattern: 'squat',
    difficultyLevel: 3,
    equipment: ['machine'],
    formCues: ['Feet shoulder-width on platform', 'Toes slightly out', 'Descend until thighs parallel', 'Drive through heels'],
    progression: { easierExerciseId: 'leg-press', harderExerciseId: 'barbell-back-squat' },
    muscleFatigue: { quads: 8, glutes: 5, hamstrings: 3 },
    tags: ['machine', 'intermediate', 'compound'],
  },
  {
    id: 'sissy-squat',
    name: 'Sissy Squat',
    primaryMuscle: 'quads',
    secondaryMuscles: ['core'],
    movementPattern: 'squat',
    difficultyLevel: 4,
    equipment: ['bodyweight_only'],
    formCues: ['Hold support', 'Lean back as you descend', 'Heels rise', 'Knee travels far forward', 'Control descent'],
    progression: { easierExerciseId: 'leg-extension', harderExerciseId: 'barbell-back-squat' },
    muscleFatigue: { quads: 9, core: 3 },
    tags: ['bodyweight', 'advanced', 'isolation'],
  },
];

// ---------------------------------------------------------------------------
// HAMSTRINGS / GLUTES (Hinge pattern)
// ---------------------------------------------------------------------------

const posteriorChainExercises: Exercise[] = [
  {
    id: 'glute-bridge',
    name: 'Glute Bridge',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'core'],
    movementPattern: 'hinge',
    difficultyLevel: 1,
    equipment: ['bodyweight_only'],
    formCues: ['Feet flat, knees bent', 'Drive hips to ceiling', 'Squeeze glutes at top', 'Hold 1–2 seconds'],
    progression: { easierExerciseId: null, harderExerciseId: 'hip-thrust' },
    muscleFatigue: { glutes: 4, hamstrings: 2, core: 1 },
    tags: ['bodyweight', 'compound', 'beginner', 'rehabilitation'],
  },
  {
    id: 'hip-thrust',
    name: 'Barbell Hip Thrust',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'quads'],
    movementPattern: 'hinge',
    difficultyLevel: 2,
    equipment: ['barbell', 'bench'],
    formCues: ['Upper back on bench edge', 'Bar over hip crease (pad)', 'Drive hips up until body parallel', 'Squeeze glutes at top'],
    progression: { easierExerciseId: 'glute-bridge', harderExerciseId: 'romanian-deadlift' },
    tags: ['barbell', 'compound', 'beginner', 'glute isolation'],
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift (RDL)',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'back', 'core'],
    movementPattern: 'hinge',
    difficultyLevel: 2,
    equipment: ['barbell', 'dumbbells'],
    formCues: ['Soft knee bend', 'Bar stays close to legs', 'Hinge until stretch in hamstrings', 'Neutral spine throughout'],
    progression: { easierExerciseId: 'hip-thrust', harderExerciseId: 'deadlift' },
    strengthStandards: {
      male: { beginner: 55, novice: 84, intermediate: 121, advanced: 164, elite: 211 },
      female: { beginner: 29, novice: 45, intermediate: 66, advanced: 91, elite: 119 },
      unit: 'kg',
    },
    muscleFatigue: { hamstrings: 8, glutes: 7, back: 4 },
    tags: ['barbell', 'dumbbell', 'compound', 'intermediate', 'posterior chain'],
  },
  {
    id: 'single-leg-rdl',
    name: 'Single-Leg Romanian Deadlift',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'core'],
    movementPattern: 'hinge',
    difficultyLevel: 3,
    equipment: ['dumbbells', 'barbell'],
    formCues: ['Balance on one leg', 'Hinge at hip, free leg extends back', 'Keep hips square', 'Use wall for balance initially'],
    progression: { easierExerciseId: 'romanian-deadlift', harderExerciseId: null },
    muscleFatigue: { hamstrings: 8, glutes: 8, core: 4 },
    tags: ['dumbbell', 'compound', 'intermediate', 'unilateral', 'balance'],
  },
  {
    id: 'nordic-curl',
    name: 'Nordic Hamstring Curl',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: [],
    movementPattern: 'hinge',
    difficultyLevel: 4,
    equipment: ['bodyweight_only'],
    formCues: ['Kneel, feet anchored under bench/bar', 'Lower body as slowly as possible', 'Use hands to push back up initially', 'Eccentric-only until strong enough'],
    progression: { easierExerciseId: 'romanian-deadlift', harderExerciseId: null },
    muscleFatigue: { hamstrings: 10, glutes: 5, core: 3 },
    tags: ['bodyweight', 'advanced', 'eccentric', 'hamstring injury prevention'],
  },
  {
    id: 'leg-curl',
    name: 'Leg Curl (Lying or Seated)',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 1,
    equipment: ['cable_machine'],
    formCues: ['Lying: hips pressed into pad', 'Seated: full extension start', 'Curl heel to glutes', 'Slow eccentric'],
    progression: { easierExerciseId: null, harderExerciseId: 'romanian-deadlift' },
    tags: ['machine', 'isolation', 'beginner'],
  },
  {
    id: 'kettlebell-swing',
    name: 'Kettlebell Swing',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'back', 'core'],
    movementPattern: 'hinge',
    difficultyLevel: 2,
    equipment: ['kettlebell'],
    formCues: ['Hinge, not squat', 'Explosive hip snap', 'Glutes and core at top', 'Bell drives by hip power, not arms'],
    progression: { easierExerciseId: 'hip-thrust', harderExerciseId: 'deadlift' },
    muscleFatigue: { glutes: 8, hamstrings: 7, back: 6, core: 5 },
    tags: ['kettlebell', 'compound', 'intermediate', 'explosive', 'conditioning'],
    v4Tags: ['cardio', 'explosive'],
  },
  {
    id: 'lying-leg-curl',
    name: 'Lying Leg Curl',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'calves'],
    movementPattern: 'isolation',
    difficultyLevel: 2,
    equipment: ['machine'],
    formCues: ['Pad just above ankles', 'Curl fully to glutes', 'No hip rise', 'Slow eccentric'],
    progression: { easierExerciseId: 'glute-bridge', harderExerciseId: 'nordic-curl' },
    muscleFatigue: { hamstrings: 6, glutes: 2, calves: 2 },
    tags: ['machine', 'isolation', 'beginner'],
  },
  {
    id: 'single-leg-hip-thrust',
    name: 'Single-Leg Hip Thrust',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'core'],
    movementPattern: 'hinge',
    difficultyLevel: 3,
    equipment: ['bodyweight_only', 'bench'],
    formCues: ['Upper back on bench', 'One leg extended', 'Drive through heel of planted leg', 'Full hip extension at top'],
    progression: { easierExerciseId: 'hip-thrust', harderExerciseId: 'romanian-deadlift' },
    muscleFatigue: { glutes: 7, hamstrings: 5, core: 4 },
    tags: ['bodyweight', 'intermediate', 'unilateral'],
  },
];

// ---------------------------------------------------------------------------
// CALVES
// ---------------------------------------------------------------------------

const calfExercises: Exercise[] = [
  {
    id: 'seated-calf-raise',
    name: 'Seated Calf Raise',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 1,
    equipment: ['cable_machine'],
    formCues: ['Knees bent targets soleus', 'Full range (stretch to peak contraction)', 'Slow eccentric', '2-second hold at top'],
    progression: { easierExerciseId: null, harderExerciseId: 'standing-calf-raise' },
    tags: ['machine', 'isolation', 'beginner', 'soleus'],
  },
  {
    id: 'standing-calf-raise',
    name: 'Standing Calf Raise',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 2,
    equipment: ['cable_machine', 'barbell', 'bodyweight_only'],
    formCues: ['Straight knee targets gastrocnemius', 'Full plantar flexion at top', 'Full dorsiflexion stretch at bottom', 'Use step edge for ROM'],
    progression: { easierExerciseId: 'seated-calf-raise', harderExerciseId: 'single-leg-calf-raise' },
    strengthStandards: {
      male: { beginner: 31, novice: 73, intermediate: 134, advanced: 214, elite: 308 },
      female: { beginner: 15, novice: 41, intermediate: 83, advanced: 139, elite: 206 },
      unit: 'kg',
    },
    tags: ['machine', 'bodyweight', 'isolation', 'intermediate', 'gastrocnemius'],
  },
  {
    id: 'single-leg-calf-raise',
    name: 'Single-Leg Calf Raise',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 3,
    equipment: ['bodyweight_only'],
    formCues: ['Hold wall for balance only', 'Full ROM essential', 'Adds load via bodyweight on one leg', 'Progress to weighted'],
    progression: { easierExerciseId: 'standing-calf-raise', harderExerciseId: null },
    tags: ['bodyweight', 'isolation', 'intermediate', 'unilateral'],
  },
  {
    id: 'leg-press-calf-raise',
    name: 'Leg Press Calf Raise',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    movementPattern: 'isolation',
    difficultyLevel: 2,
    equipment: ['cable_machine'],
    formCues: ['Toes on edge of footplate', 'Full plantar flexion', 'Allows heavy loading with reduced spine stress'],
    progression: { easierExerciseId: 'seated-calf-raise', harderExerciseId: 'standing-calf-raise' },
    tags: ['machine', 'isolation', 'beginner'],
  },
];

// ---------------------------------------------------------------------------
// MASTER DATABASE
// ---------------------------------------------------------------------------

export const ALL_EXERCISES: Exercise[] = [
  ...chestExercises,
  ...backExercises,
  ...shoulderExercises,
  ...bicepsExercises,
  ...tricepsExercises,
  ...coreExercises,
  ...quadExercises,
  ...posteriorChainExercises,
  ...calfExercises,
];

// ─── Exercise animation / image URLs ──────────────────────────────────────────
// Animated GIFs (exercisedb.dev) are preferred; static JPGs (jsDelivr CDN)
// are used where animated GIFs were not available.
// Exercises omitted here fall back to the runtime ExerciseDB API search.
const JDLV = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/';
const EXDB = 'https://static.exercisedb.dev/media/';
const ANIMATION_URLS: Partial<Record<string, string>> = {
  // ── Chest ───────────────────────────────────────────────────────────────────
  'wall-push-up':           EXDB + 'P9GFBME.gif',
  'incline-push-up':        EXDB + 'CB8WET1.gif',
  'wide-push-up':           EXDB + 'wpbD28t.gif',
  'push-up':                EXDB + 'Snj1wSv.gif',
  'diamond-push-up':        EXDB + 'soIB2rj.gif',
  'archer-push-up':         EXDB + 'A9qxk2F.gif',
  'one-arm-push-up':        EXDB + 'osdXT3K.gif',
  'machine-chest-press':    EXDB + 'jHAnWmT.gif',
  'dumbbell-bench-press':   EXDB + 'SpYC0Kp.gif',
  'barbell-bench-press':    EXDB + 'EIeI8Vf.gif',
  'paused-bench-press':     EXDB + '7xI5MXA.gif',
  'incline-barbell-press':  EXDB + '3TZduzM.gif',
  'incline-dumbbell-press': EXDB + 'PG1kcIb.gif',
  'cable-chest-fly':        EXDB + 'w4dLzSx.gif',
  'dumbbell-fly':           EXDB + 'yz9nUhF.gif',
  'weighted-dip':           EXDB + 'HMzLjXx.gif',
  // ── Back ────────────────────────────────────────────────────────────────────
  'dead-hang':              EXDB + '03lzqwk.gif',
  'australian-pull-up':     EXDB + 'bZGHsAZ.gif',
  'lat-pulldown':           EXDB + 'ecpY0rH.gif',
  'pull-up':                EXDB + '0V2YQjW.gif',
  'chin-up':                JDLV + 'Chin-Up/0.jpg',
  'weighted-pull-up':       JDLV + 'Weighted_Pull_Ups/0.jpg',
  'dumbbell-row':           JDLV + 'Bent_Over_Two-Dumbbell_Row/0.jpg',
  'barbell-bent-over-row':  JDLV + 'Bent_Over_Barbell_Row/0.jpg',
  'pendlay-row':            JDLV + 'Bent_Over_Barbell_Row/0.jpg',
  'seated-cable-row':       JDLV + 'Seated_Cable_Rows/0.jpg',
  'deadlift':               JDLV + 'Deadlift_with_Bands/0.jpg',
  'sumo-deadlift':          JDLV + 'Sumo_Deadlift/0.jpg',
  'back-extension':         JDLV + 'Hyperextensions_Back_Extensions/0.jpg',
  'good-morning':           JDLV + 'Good_Morning/0.jpg',
  // ── Shoulders ───────────────────────────────────────────────────────────────
  'face-pull':              JDLV + 'Face_Pull/0.jpg',
  'band-lateral-raise':     JDLV + 'Lateral_Raise_-_With_Bands/0.jpg',
  'pike-push-up':           JDLV + 'Hanging_Pike/0.jpg',
  'elevated-pike-push-up':  JDLV + 'Hanging_Pike/0.jpg',
  'band-pull-apart':        JDLV + 'Band_Pull_Apart/0.jpg',
  'lateral-raise':          JDLV + 'Cable_Seated_Lateral_Raise/0.jpg',
  'seated-db-press':        JDLV + 'Seated_Dumbbell_Press/0.jpg',
  'barbell-overhead-press': JDLV + 'Standing_Military_Press/0.jpg',
  'push-press':             JDLV + 'Push_Press/0.jpg',
  'upright-row':            JDLV + 'Upright_Row_-_With_Bands/0.jpg',
  'reverse-fly':            JDLV + 'Cable_Rear_Delt_Fly/0.jpg',
  'arnold-press':           JDLV + 'Kettlebell_Arnold_Press/0.jpg',
  // ── Biceps ──────────────────────────────────────────────────────────────────
  'resistance-band-curl':   JDLV + 'Close-Grip_EZ-Bar_Curl_with_Band/0.jpg',
  'dumbbell-curl':          JDLV + 'Dumbbell_Bicep_Curl/0.jpg',
  'hammer-curl':            JDLV + 'Hammer_Curls/0.jpg',
  'barbell-curl':           JDLV + 'Barbell_Curl/0.jpg',
  'preacher-curl':          JDLV + 'Preacher_Curl/0.jpg',
  'incline-dumbbell-curl':  JDLV + 'Incline_Dumbbell_Curl/0.jpg',
  'cable-curl':             JDLV + 'High_Cable_Curls/0.jpg',
  'concentration-curl':     JDLV + 'Concentration_Curls/0.jpg',
  'spider-curl':            JDLV + 'Spider_Curl/0.jpg',
  // ── Triceps ─────────────────────────────────────────────────────────────────
  'tricep-pushdown-band':         JDLV + 'Reverse_Grip_Triceps_Pushdown/0.jpg',
  'tricep-pushdown':              JDLV + 'Triceps_Pushdown_-_Rope_Attachment/0.jpg',
  'overhead-tricep-extension':    JDLV + 'Cable_Rope_Overhead_Triceps_Extension/0.jpg',
  'skull-crusher':                JDLV + 'Decline_Close-Grip_Bench_To_Skull_Crusher/0.jpg',
  'close-grip-bench':             JDLV + 'Close-Grip_Barbell_Bench_Press/0.jpg',
  'bench-dip':                    JDLV + 'Bench_Dips/0.jpg',
  'parallel-bar-dip':             JDLV + 'Dips_-_Triceps_Version/0.jpg',
  // ── Core ────────────────────────────────────────────────────────────────────
  'dead-bug':               JDLV + 'Dead_Bug/0.jpg',
  'plank':                  JDLV + 'Plank/0.jpg',
  'hanging-leg-raise':      JDLV + 'Hanging_Leg_Raise/0.jpg',
  'ab-wheel-rollout':       JDLV + 'Barbell_Ab_Rollout/0.jpg',
  'standing-ab-wheel':      JDLV + 'Barbell_Ab_Rollout/0.jpg',
  'cable-crunch':           JDLV + 'Cable_Crunch/0.jpg',
  'russian-twist':          JDLV + 'Russian_Twist/0.jpg',
  'side-plank':             JDLV + 'Side_Bridge/0.jpg',
  'pallof-press':           JDLV + 'Pallof_Press/0.jpg',
  // ── Quads ───────────────────────────────────────────────────────────────────
  'bodyweight-squat':       JDLV + 'Bodyweight_Squat/0.jpg',
  'goblet-squat':           JDLV + 'Goblet_Squat/0.jpg',
  'dumbbell-squat':         JDLV + 'Dumbbell_Squat/0.jpg',
  'barbell-back-squat':     JDLV + 'Barbell_Squat/0.jpg',
  'front-squat':            JDLV + 'Front_Squat_Clean_Grip/0.jpg',
  'leg-press':              JDLV + 'Leg_Press/0.jpg',
  'lunge':                  JDLV + 'Lunge_Pass_Through/0.jpg',
  'bulgarian-split-squat':  JDLV + 'Split_Squat_with_Dumbbells/0.jpg',
  'leg-extension':          JDLV + 'Leg_Extensions/0.jpg',
  'step-up':                JDLV + 'Barbell_Step_Ups/0.jpg',
  'walking-lunge':          JDLV + 'Barbell_Walking_Lunge/0.jpg',
  'hack-squat':             JDLV + 'Hack_Squat/0.jpg',
  'sissy-squat':            JDLV + 'Weighted_Sissy_Squat/0.jpg',
  // ── Posterior chain ─────────────────────────────────────────────────────────
  'glute-bridge':           JDLV + 'Barbell_Glute_Bridge/0.jpg',
  'hip-thrust':             JDLV + 'Barbell_Hip_Thrust/0.jpg',
  'romanian-deadlift':      JDLV + 'Romanian_Deadlift/0.jpg',
  'single-leg-rdl':         JDLV + 'Romanian_Deadlift/0.jpg',
  'leg-curl':               JDLV + 'Ball_Leg_Curl/0.jpg',
  'kettlebell-swing':       JDLV + 'One-Arm_Kettlebell_Swings/0.jpg',
  'lying-leg-curl':         JDLV + 'Lying_Leg_Curls/0.jpg',
  // ── Calves ──────────────────────────────────────────────────────────────────
  'seated-calf-raise':      JDLV + 'Seated_Calf_Raise/0.jpg',
  'standing-calf-raise':    JDLV + 'Standing_Calf_Raises/0.jpg',
  'single-leg-calf-raise':  JDLV + 'Calf_Raise_On_A_Dumbbell/0.jpg',
  'leg-press-calf-raise':   JDLV + 'Leg_Press/0.jpg',
};

/** Keyed lookup map for O(1) access by exercise ID — steps and animationUrl merged in at init time */
export const EXERCISE_MAP: Record<string, Exercise> = Object.fromEntries(
  ALL_EXERCISES.map((e) => [e.id, { ...e, steps: EXERCISE_STEPS[e.id], animationUrl: ANIMATION_URLS[e.id] }])
);

/** Get the full progression chain for an exercise, ordered easiest → hardest */
export function getProgressionChain(exerciseId: string): Exercise[] {
  const chain: Exercise[] = [];
  let current: Exercise | undefined = EXERCISE_MAP[exerciseId];
  if (!current) return chain;

  // Walk to the start (easiest)
  while (current && current.progression.easierExerciseId) {
    const prev: Exercise | undefined = EXERCISE_MAP[current.progression.easierExerciseId];
    if (!prev) break;
    current = prev;
  }

  // Walk forward to the end (hardest)
  while (current) {
    chain.push(current);
    const harder: Exercise | undefined = current.progression.harderExerciseId
      ? EXERCISE_MAP[current.progression.harderExerciseId]
      : undefined;
    current = harder;
  }

  return chain;
}

// ---------------------------------------------------------------------------
// WORKOUT SPLITS
// ---------------------------------------------------------------------------

export type WorkoutSplitType =
  | 'push_pull_legs'
  | 'upper_lower'
  | 'full_body'
  | 'bro_split'
  | 'strength_5x5';

export interface WorkoutDay {
  name: string;
  muscleGroups: MuscleGroup[];
  /** Ordered list of exercise IDs for this day */
  exerciseIds: string[];
  /** Sets x reps scheme, e.g. "3x8-12" */
  setsReps: string;
}

export interface WorkoutSplit {
  id: WorkoutSplitType;
  name: string;
  daysPerWeek: number;
  /** Best suited for which experience level */
  targetLevel: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  /**
   * Weekly schedule:
   * Keys are day labels (e.g. "Monday", "Day 1"), values are WorkoutDay or "rest"
   */
  schedule: Record<string, WorkoutDay | 'rest'>;
  progressionModel: string;
  pros: string[];
  cons: string[];
}

export const WORKOUT_SPLITS: Record<WorkoutSplitType, WorkoutSplit> = {

  // -------------------------------------------------------------------------
  // PUSH / PULL / LEGS (3-day or 6-day)
  // -------------------------------------------------------------------------
  push_pull_legs: {
    id: 'push_pull_legs',
    name: 'Push / Pull / Legs (PPL)',
    daysPerWeek: 6,
    targetLevel: 'intermediate',
    description:
      'Groups muscles by movement pattern. Each muscle group trained twice per week on the 6-day version. ' +
      'Push = chest, shoulders, triceps. Pull = back, biceps. Legs = quads, hamstrings, glutes, calves.',
    schedule: {
      Monday: {
        name: 'Push A',
        muscleGroups: ['chest', 'shoulders', 'triceps'],
        exerciseIds: [
          'barbell-bench-press',
          'incline-dumbbell-press',
          'cable-chest-fly',
          'barbell-overhead-press',
          'lateral-raise',
          'overhead-tricep-extension',
          'tricep-pushdown',
        ],
        setsReps: '4x6-8 compound, 3x10-15 isolation',
      },
      Tuesday: {
        name: 'Pull A',
        muscleGroups: ['back', 'biceps'],
        exerciseIds: [
          'deadlift',
          'pull-up',
          'barbell-bent-over-row',
          'seated-cable-row',
          'face-pull',
          'barbell-curl',
          'hammer-curl',
        ],
        setsReps: '4x6-8 compound, 3x10-15 isolation',
      },
      Wednesday: {
        name: 'Legs A',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exerciseIds: [
          'barbell-back-squat',
          'romanian-deadlift',
          'leg-press',
          'bulgarian-split-squat',
          'leg-curl',
          'standing-calf-raise',
          'seated-calf-raise',
        ],
        setsReps: '4x6-8 compound, 3x10-15 isolation',
      },
      Thursday: {
        name: 'Push B',
        muscleGroups: ['chest', 'shoulders', 'triceps'],
        exerciseIds: [
          'incline-barbell-press',
          'dumbbell-bench-press',
          'dumbbell-fly',
          'seated-db-press',
          'upright-row',
          'skull-crusher',
          'close-grip-bench',
        ],
        setsReps: '3x10-15 (hypertrophy focus)',
      },
      Friday: {
        name: 'Pull B',
        muscleGroups: ['back', 'biceps'],
        exerciseIds: [
          'weighted-pull-up',
          'lat-pulldown',
          'dumbbell-row',
          'back-extension',
          'reverse-fly',
          'preacher-curl',
          'incline-dumbbell-curl',
        ],
        setsReps: '3x10-15 (hypertrophy focus)',
      },
      Saturday: {
        name: 'Legs B',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exerciseIds: [
          'front-squat',
          'hip-thrust',
          'leg-extension',
          'lunge',
          'nordic-curl',
          'single-leg-calf-raise',
          'leg-press-calf-raise',
        ],
        setsReps: '3x10-15 (hypertrophy focus)',
      },
      Sunday: 'rest',
    },
    progressionModel:
      'Add weight when you hit the top of the rep range on all sets. ' +
      'Typically add 2.5–5 kg to upper body compounds and 5 kg to lower body compounds per session.',
    pros: [
      'High frequency per muscle group (2x/week)',
      'Excellent volume for hypertrophy',
      'Clear movement-pattern organisation',
      'Scales from 3-day to 6-day',
    ],
    cons: [
      'Demanding — requires good recovery',
      'Not ideal for pure strength (less specificity)',
      'Time-consuming on 6-day version',
    ],
  },

  // -------------------------------------------------------------------------
  // UPPER / LOWER (4-day)
  // -------------------------------------------------------------------------
  upper_lower: {
    id: 'upper_lower',
    name: 'Upper / Lower Split',
    daysPerWeek: 4,
    targetLevel: 'intermediate',
    description:
      'Trains upper body and lower body on alternating days. Each muscle group trained twice per week. ' +
      'Generally considered the gold standard for intermediate hypertrophy and strength.',
    schedule: {
      Monday: {
        name: 'Upper A (Strength)',
        muscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
        exerciseIds: [
          'barbell-bench-press',
          'barbell-bent-over-row',
          'barbell-overhead-press',
          'pull-up',
          'barbell-curl',
          'skull-crusher',
        ],
        setsReps: '4x4-6 (strength focus, heavier loads)',
      },
      Tuesday: {
        name: 'Lower A (Strength)',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exerciseIds: [
          'barbell-back-squat',
          'romanian-deadlift',
          'leg-press',
          'standing-calf-raise',
        ],
        setsReps: '4x4-6 (strength focus, heavier loads)',
      },
      Wednesday: 'rest',
      Thursday: {
        name: 'Upper B (Hypertrophy)',
        muscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
        exerciseIds: [
          'incline-dumbbell-press',
          'seated-cable-row',
          'seated-db-press',
          'lat-pulldown',
          'cable-chest-fly',
          'lateral-raise',
          'dumbbell-curl',
          'overhead-tricep-extension',
        ],
        setsReps: '3x8-12 (hypertrophy focus)',
      },
      Friday: {
        name: 'Lower B (Hypertrophy)',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exerciseIds: [
          'deadlift',
          'bulgarian-split-squat',
          'hip-thrust',
          'leg-curl',
          'lunge',
          'seated-calf-raise',
        ],
        setsReps: '3x8-12 (hypertrophy focus)',
      },
      Saturday: 'rest',
      Sunday: 'rest',
    },
    progressionModel:
      'On strength days (A), add weight when you complete all reps. ' +
      'On hypertrophy days (B), add weight when you hit top of rep range with good form.',
    pros: [
      'Balanced frequency and recovery',
      'Combines strength and hypertrophy in one week',
      'Manageable 4 sessions/week',
      'Great for intermediate lifters',
    ],
    cons: [
      'Less total volume than PPL',
      'Upper sessions can be long',
    ],
  },

  // -------------------------------------------------------------------------
  // FULL BODY (3-day)
  // -------------------------------------------------------------------------
  full_body: {
    id: 'full_body',
    name: 'Full Body',
    daysPerWeek: 3,
    targetLevel: 'beginner',
    description:
      'Every session trains all major muscle groups. High frequency (3x per muscle/week) is ideal for beginners ' +
      'to build motor patterns and accumulate skill rapidly. Also used by advanced lifters for strength peaking.',
    schedule: {
      Monday: {
        name: 'Full Body A',
        muscleGroups: ['chest', 'back', 'quads', 'hamstrings', 'shoulders', 'core'],
        exerciseIds: [
          'barbell-back-squat',
          'barbell-bench-press',
          'barbell-bent-over-row',
          'barbell-overhead-press',
          'deadlift',
          'plank',
        ],
        setsReps: '3x5 compound, 2x8-12 accessory',
      },
      Tuesday: 'rest',
      Wednesday: {
        name: 'Full Body B',
        muscleGroups: ['chest', 'back', 'quads', 'hamstrings', 'shoulders', 'core'],
        exerciseIds: [
          'barbell-back-squat',
          'incline-dumbbell-press',
          'lat-pulldown',
          'seated-db-press',
          'romanian-deadlift',
          'hanging-knee-raise',
        ],
        setsReps: '3x5 compound, 2x8-12 accessory',
      },
      Thursday: 'rest',
      Friday: {
        name: 'Full Body C',
        muscleGroups: ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'core'],
        exerciseIds: [
          'barbell-back-squat',
          'push-up',
          'pull-up',
          'hip-thrust',
          'lunge',
          'cable-crunch',
        ],
        setsReps: '3x5-8 compound, 2x10-15 accessory',
      },
      Saturday: 'rest',
      Sunday: 'rest',
    },
    progressionModel:
      'Linear progression: add 2.5 kg every session on upper body, 5 kg every session on lower body. ' +
      'Reset to 90% of max and rebuild when progress stalls.',
    pros: [
      'Highest skill practice frequency (ideal for beginners)',
      'Time efficient — 3 days/week',
      'Rapid initial strength gains via neural adaptation',
      'Most forgiving if a session is missed',
    ],
    cons: [
      'Sessions can feel long with many exercises',
      'Limited volume per muscle group per session',
      'Less effective for advanced hypertrophy',
    ],
  },

  // -------------------------------------------------------------------------
  // BRO SPLIT (5-day body part split)
  // -------------------------------------------------------------------------
  bro_split: {
    id: 'bro_split',
    name: 'Bro Split (5-Day Body Part Split)',
    daysPerWeek: 5,
    targetLevel: 'intermediate',
    description:
      'Each day targets one or two muscle groups with maximum volume. ' +
      'Each muscle trained once per week. Popular in bodybuilding culture. ' +
      'Best for intermediate–advanced lifters who recover slowly and want high volume specialisation.',
    schedule: {
      Monday: {
        name: 'Chest Day',
        muscleGroups: ['chest', 'triceps'],
        exerciseIds: [
          'barbell-bench-press',
          'incline-barbell-press',
          'incline-dumbbell-press',
          'cable-chest-fly',
          'dumbbell-fly',
          'weighted-dip',
        ],
        setsReps: '4x8-12 per exercise (16–24 sets total)',
      },
      Tuesday: {
        name: 'Back Day',
        muscleGroups: ['back', 'biceps'],
        exerciseIds: [
          'deadlift',
          'barbell-bent-over-row',
          'weighted-pull-up',
          'lat-pulldown',
          'seated-cable-row',
          'dumbbell-row',
          'back-extension',
        ],
        setsReps: '4x8-12 per exercise (20–28 sets total)',
      },
      Wednesday: {
        name: 'Shoulders Day',
        muscleGroups: ['shoulders'],
        exerciseIds: [
          'barbell-overhead-press',
          'seated-db-press',
          'upright-row',
          'lateral-raise',
          'arnold-press',
          'reverse-fly',
          'face-pull',
        ],
        setsReps: '4x8-15 per exercise',
      },
      Thursday: {
        name: 'Arms Day',
        muscleGroups: ['biceps', 'triceps'],
        exerciseIds: [
          'barbell-curl',
          'dumbbell-curl',
          'preacher-curl',
          'hammer-curl',
          'incline-dumbbell-curl',
          'skull-crusher',
          'close-grip-bench',
          'overhead-tricep-extension',
          'tricep-pushdown',
        ],
        setsReps: '3x10-15 per exercise',
      },
      Friday: {
        name: 'Legs Day',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exerciseIds: [
          'barbell-back-squat',
          'romanian-deadlift',
          'leg-press',
          'bulgarian-split-squat',
          'leg-extension',
          'leg-curl',
          'hip-thrust',
          'standing-calf-raise',
          'seated-calf-raise',
        ],
        setsReps: '4x8-12 per exercise',
      },
      Saturday: 'rest',
      Sunday: 'rest',
    },
    progressionModel:
      'Double progression: stay at same weight until you can complete all sets at top of rep range, ' +
      'then increase weight by the smallest increment available.',
    pros: [
      'Maximum volume and focus per muscle group',
      'Long recovery window between same-muscle sessions',
      'Highly flexible — easy to add exercises for specialisation',
      'Enjoyable and motivating for dedicated gym-goers',
    ],
    cons: [
      'Low frequency per muscle group (1x/week)',
      'Sub-optimal for beginners (insufficient practice frequency)',
      'Missing a session means a muscle group goes untrained for 2 weeks',
      'Not evidence-based optimal for most lifters',
    ],
  },

  // -------------------------------------------------------------------------
  // 5x5 / STARTING STRENGTH STYLE (3-day)
  // -------------------------------------------------------------------------
  strength_5x5: {
    id: 'strength_5x5',
    name: '5×5 Strength (Starting Strength / StrongLifts style)',
    daysPerWeek: 3,
    targetLevel: 'beginner',
    description:
      'Two alternating workouts (A and B) built around the big four barbell lifts. ' +
      'Linear progression: add weight every single session. ' +
      'Inspired by Mark Rippetoe\'s Starting Strength and Mehdi\'s StrongLifts 5×5. ' +
      'The most time-efficient beginner strength programme.',
    schedule: {
      Monday: {
        name: 'Workout A',
        muscleGroups: ['quads', 'chest', 'back', 'shoulders', 'glutes', 'hamstrings'],
        exerciseIds: [
          'barbell-back-squat',   // 5x5
          'barbell-bench-press',  // 5x5
          'barbell-bent-over-row',// 5x5
        ],
        setsReps: '5x5 (add 2.5 kg upper / 5 kg lower each session)',
      },
      Tuesday: 'rest',
      Wednesday: {
        name: 'Workout B',
        muscleGroups: ['quads', 'shoulders', 'back', 'glutes', 'hamstrings'],
        exerciseIds: [
          'barbell-back-squat',    // 5x5
          'barbell-overhead-press',// 5x5
          'deadlift',              // 1x5
        ],
        setsReps: 'Squat & OHP: 5x5 | Deadlift: 1x5 (add 5 kg each session)',
      },
      Thursday: 'rest',
      Friday: {
        name: 'Workout A (repeat)',
        muscleGroups: ['quads', 'chest', 'back', 'shoulders', 'glutes', 'hamstrings'],
        exerciseIds: [
          'barbell-back-squat',
          'barbell-bench-press',
          'barbell-bent-over-row',
        ],
        setsReps: '5x5 (add 2.5 kg upper / 5 kg lower from last A session)',
      },
      Saturday: 'rest',
      Sunday: 'rest',
    },
    progressionModel:
      'Linear progression: add weight every session. ' +
      'When you fail to complete 5x5 three times in a row, deload 10% and rebuild. ' +
      'Switch to intermediate programming (e.g. Texas Method or GZCLP) when linear progress ends.',
    pros: [
      'Simplest, most proven beginner programme',
      'Only 3 sessions/week, ~45–60 min each',
      'Rapid strength gains via linear progression',
      'Focuses on most important compound movements',
      'Easy to track and automate progression',
    ],
    cons: [
      'Minimal accessory/isolation work',
      'Squat-heavy (squatting every session)',
      'Not optimised for upper body hypertrophy',
      'Progress stalls relatively quickly for intermediate lifters',
    ],
  },
};

// ---------------------------------------------------------------------------
// STRENGTH STANDARDS SUMMARY (from strengthlevel.com)
// Reference: 170–190 lb (77–86 kg) male body weight
// ---------------------------------------------------------------------------

/**
 * Condensed beginner→elite standards for major lifts.
 * Source: strengthlevel.com (millions of recorded lifts, as of 2025)
 *
 * Percentile definitions:
 *   beginner     = top 95% (stronger than 5%)
 *   novice       = top 80% (stronger than 20%)
 *   intermediate = top 50% (stronger than 50%)  ← population average
 *   advanced     = top 20% (stronger than 80%)
 *   elite        = top 5%  (stronger than 95%)
 */
export const STRENGTH_STANDARDS_MALE_KG = {
  benchPress:         { beginner: 57, novice: 86,  intermediate: 117, advanced: 154, elite: 198 },
  squat:              { beginner: 64, novice: 93,  intermediate: 130, advanced: 173, elite: 219 },
  deadlift:           { beginner: 78, novice: 112, intermediate: 152, advanced: 200, elite: 250 },
  overheadPress:      { beginner: 30, novice: 45,  intermediate: 64,  advanced: 87,  elite: 113 },
  bentOverRow:        { beginner: 40, novice: 60,  intermediate: 85,  advanced: 115, elite: 147 },
  romanianDeadlift:   { beginner: 55, novice: 84,  intermediate: 121, advanced: 164, elite: 211 },
  barbellCurl:        { beginner: 17, novice: 30,  intermediate: 47,  advanced: 68,  elite: 91  },
  legPress:           { beginner: 87, novice: 147, intermediate: 226, advanced: 323, elite: 432 },
  calfRaise:          { beginner: 31, novice: 73,  intermediate: 134, advanced: 214, elite: 308 },
  /** Pull-ups measured in reps */
  pullUps:            { beginner: 0,  novice: 5,   intermediate: 14,  advanced: 25,  elite: 37  },
  /** Dips measured in added kg */
  dips:               { beginner: -8, novice: 19,  intermediate: 50,  advanced: 86,  elite: 125 },
} as const;

export const STRENGTH_STANDARDS_FEMALE_KG = {
  benchPress:         { beginner: 25, novice: 42,  intermediate: 65,  advanced: 95,  elite: 130 },
  squat:              { beginner: 29, novice: 49,  intermediate: 73,  advanced: 103, elite: 136 },
  deadlift:           { beginner: 38, novice: 60,  intermediate: 88,  advanced: 120, elite: 157 },
  overheadPress:      { beginner: 13, novice: 22,  intermediate: 34,  advanced: 49,  elite: 65  },
  bentOverRow:        { beginner: 15, novice: 26,  intermediate: 41,  advanced: 59,  elite: 79  },
  romanianDeadlift:   { beginner: 29, novice: 45,  intermediate: 66,  advanced: 91,  elite: 119 },
  barbellCurl:        { beginner: 6,  novice: 14,  intermediate: 25,  advanced: 39,  elite: 54  },
  legPress:           { beginner: 41, novice: 82,  intermediate: 141, advanced: 214, elite: 299 },
  calfRaise:          { beginner: 15, novice: 41,  intermediate: 83,  advanced: 139, elite: 206 },
  pullUps:            { beginner: 0,  novice: 0,   intermediate: 6,   advanced: 15,  elite: 26  },
  dips:               { beginner: -20,novice: -3,  intermediate: 20,  advanced: 44,  elite: 72  },
} as const;
