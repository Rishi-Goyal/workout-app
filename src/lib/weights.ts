/**
 * Weight suggestion engine.
 * Recommends starting weights based on bodyweight, muscle strength ratings,
 * fitness goal, and exercise type. Returns 'bodyweight' for calisthenics.
 */
import type { Equipment, FitnessGoal, MuscleGroup, MuscleStrengths } from '@/types';

// ─── Calisthenics detection ───────────────────────────────────────────────────
const CALISTHENICS_KEYWORDS = [
  'push up', 'push-up', 'pushup',
  'pull up', 'pull-up', 'pullup',
  'chin up', 'chin-up', 'chinup',
  'dip', 'muscle up',
  'bodyweight squat', 'air squat', 'pistol squat',
  'lunge', 'reverse lunge', 'walking lunge',
  'plank', 'side plank',
  'crunch', 'sit up', 'situp',
  'burpee', 'mountain climber',
  'glute bridge', 'hip raise',
  'jumping jack', 'jump squat',
  'wall sit', 'hollow hold', 'superman hold',
  'leg raise', 'knee raise', 'flutter kick',
  'tricep dip', 'bench dip',
  'pike push up', 'pike push-up',
  'diamond push up', 'archer push up',
  'inverted row', 'bodyweight row',
  'nordic curl', 'natural leg curl',
  'dragon flag', 'l-sit', 'handstand',
  'bear crawl', 'crab walk',
  'step up', 'box jump',
];

export function isCalisthenicsExercise(name: string, equipment: Equipment[]): boolean {
  if (equipment.includes('bodyweight_only') || equipment.length === 0) return true;
  const n = name.toLowerCase();
  return CALISTHENICS_KEYWORDS.some(kw => n.includes(kw));
}

// ─── Exercise weight standards (fraction of bodyweight) ──────────────────────
// Beginner standards from strength research (e.g. Symmetric Strength)
const EXERCISE_STANDARDS: Array<{ keywords: string[]; fraction: number; isDumbbell?: boolean }> = [
  // Barbells
  { keywords: ['bench press', 'barbell press'],                              fraction: 0.50 },
  { keywords: ['incline bench', 'incline press'],                            fraction: 0.42 },
  { keywords: ['decline bench'],                                             fraction: 0.55 },
  { keywords: ['overhead press', 'military press', 'ohp', 'shoulder press'], fraction: 0.35 },
  { keywords: ['barbell row', 'bent over row', 'pendlay'],                   fraction: 0.50 },
  { keywords: ['barbell squat', 'back squat', 'front squat'],                fraction: 0.75 },
  { keywords: ['deadlift'],                                                  fraction: 1.00 },
  { keywords: ['romanian deadlift', 'rdl', 'stiff leg'],                    fraction: 0.70 },
  { keywords: ['sumo deadlift'],                                             fraction: 0.90 },
  { keywords: ['hip thrust', 'barbell hip'],                                 fraction: 0.75 },
  { keywords: ['good morning'],                                              fraction: 0.35 },
  { keywords: ['barbell curl', 'ez bar curl'],                              fraction: 0.25 },
  { keywords: ['skull crusher', 'lying tricep'],                             fraction: 0.25 },
  { keywords: ['barbell shrug', 'shrug'],                                    fraction: 0.80 },
  { keywords: ['zercher squat'],                                             fraction: 0.60 },
  // Machines
  { keywords: ['leg press'],                                                 fraction: 1.50 },
  { keywords: ['leg curl', 'hamstring curl'],                                fraction: 0.35 },
  { keywords: ['leg extension'],                                             fraction: 0.40 },
  { keywords: ['lat pulldown', 'cable pulldown'],                            fraction: 0.55 },
  { keywords: ['cable row', 'seated row'],                                   fraction: 0.45 },
  { keywords: ['cable fly', 'chest fly machine'],                           fraction: 0.30 },
  { keywords: ['cable curl'],                                                fraction: 0.20 },
  { keywords: ['tricep pushdown', 'cable pushdown'],                         fraction: 0.25 },
  { keywords: ['calf raise', 'standing calf'],                              fraction: 0.60 },
  { keywords: ['seated calf'],                                               fraction: 0.50 },
  { keywords: ['pec deck', 'chest machine'],                                 fraction: 0.35 },
  { keywords: ['face pull'],                                                 fraction: 0.20 },
  // Dumbbells
  { keywords: ['dumbbell bench', 'db bench'],            isDumbbell: true,  fraction: 0.20 },
  { keywords: ['dumbbell row', 'db row', 'single arm row'], isDumbbell: true, fraction: 0.22 },
  { keywords: ['dumbbell curl', 'db curl', 'bicep curl', 'hammer curl'], isDumbbell: true, fraction: 0.10 },
  { keywords: ['dumbbell press', 'db press', 'dumbbell shoulder'], isDumbbell: true, fraction: 0.15 },
  { keywords: ['dumbbell fly', 'db fly'],                isDumbbell: true,  fraction: 0.12 },
  { keywords: ['lateral raise', 'side raise'],           isDumbbell: true,  fraction: 0.07 },
  { keywords: ['front raise'],                           isDumbbell: true,  fraction: 0.07 },
  { keywords: ['dumbbell lunge', 'db lunge'],            isDumbbell: true,  fraction: 0.15 },
  { keywords: ['goblet squat'],                          isDumbbell: true,  fraction: 0.22 },
  { keywords: ['dumbbell deadlift', 'db deadlift'],      isDumbbell: true,  fraction: 0.30 },
  { keywords: ['tricep kickback', 'dumbbell kickback'],  isDumbbell: true,  fraction: 0.06 },
  { keywords: ['arnold press'],                          isDumbbell: true,  fraction: 0.14 },
  { keywords: ['dumbbell shrug'],                        isDumbbell: true,  fraction: 0.18 },
  { keywords: ['incline dumbbell', 'incline db'],        isDumbbell: true,  fraction: 0.18 },
  // Kettlebell
  { keywords: ['kettlebell swing', 'kb swing'],                              fraction: 0.25 },
  { keywords: ['kettlebell goblet', 'kb goblet'],                            fraction: 0.20 },
  { keywords: ['kettlebell press', 'kb press'],                              fraction: 0.18 },
  { keywords: ['turkish get up', 'tgu'],                                     fraction: 0.12 },
  { keywords: ['kettlebell snatch', 'kb snatch'],                            fraction: 0.20 },
  { keywords: ['kettlebell clean', 'kb clean'],                              fraction: 0.22 },
  // Resistance bands (estimate resistance equivalent)
  { keywords: ['band pull apart', 'resistance band'],                        fraction: 0.08 },
];

type MoveCategory = 'upper_push' | 'upper_pull' | 'lower_push' | 'lower_pull' | 'isolation' | 'core';

function inferCategory(name: string, muscles: MuscleGroup[]): MoveCategory {
  const n = name.toLowerCase();
  if (muscles.includes('core') || n.includes('crunch') || n.includes('plank') || n.includes('ab')) return 'core';
  if (n.includes('curl') && !n.includes('nordic') || n.includes('kickback') || n.includes('raise') ||
      n.includes('extension') && !n.includes('back') || n.includes('pushdown') || n.includes('fly')) return 'isolation';
  const isLower = muscles.some(m => ['quads', 'hamstrings', 'glutes', 'calves'].includes(m));
  const isUpper = muscles.some(m => ['chest', 'back', 'shoulders', 'biceps', 'triceps'].includes(m));
  if (isLower) {
    return n.includes('deadlift') || n.includes('rdl') || n.includes('curl') ? 'lower_pull' : 'lower_push';
  }
  if (isUpper) {
    return muscles.includes('back') || muscles.includes('biceps') ? 'upper_pull' : 'upper_push';
  }
  return 'upper_push';
}

const CATEGORY_DEFAULTS: Record<MoveCategory, number> = {
  upper_push: 0.28,
  upper_pull: 0.35,
  lower_push: 0.60,
  lower_pull: 0.65,
  isolation: 0.10,
  core: 0,
};

const GOAL_SCALE: Record<FitnessGoal, number> = {
  strength: 1.10,
  balanced: 1.00,
  endurance: 0.72,
  weight_loss: 0.75,
  calisthenics: 0.85,
};

/**
 * Returns a suggested starting weight in kg, or 'bodyweight' for calisthenics.
 * Rounds to nearest 2.5 kg (barbell) or 1 kg (dumbbell).
 */
export function getSuggestedWeight(
  exerciseName: string,
  muscles: MuscleGroup[],
  bodyWeightKg: number,
  muscleStrengths: MuscleStrengths,
  equipment: Equipment[],
  goal: FitnessGoal,
): number | 'bodyweight' {
  if (isCalisthenicsExercise(exerciseName, equipment)) return 'bodyweight';

  const n = exerciseName.toLowerCase();

  // Find best matching standard
  let fraction = 0;
  let isDumbbell = false;
  for (const std of EXERCISE_STANDARDS) {
    if (std.keywords.some(kw => n.includes(kw))) {
      fraction = std.fraction;
      isDumbbell = std.isDumbbell ?? false;
      break;
    }
  }

  if (!fraction) {
    // Auto-detect dumbbell
    isDumbbell = n.includes('dumbbell') || n.includes(' db ') || n.startsWith('db ');
    const cat = inferCategory(n, muscles);
    fraction = CATEGORY_DEFAULTS[cat];
  }

  if (!fraction) return 'bodyweight';

  // Strength level adjustment (sliders 0-100, 50 = average)
  const relevantStrengths = muscles.filter(m => m in muscleStrengths).map(m => muscleStrengths[m]);
  const avgStrength = relevantStrengths.length
    ? relevantStrengths.reduce((a, b) => a + b, 0) / relevantStrengths.length
    : 50;

  // 0–100 → 0.5x–1.5x multiplier
  const strengthMult = 0.5 + (avgStrength / 100);
  const goalMult = GOAL_SCALE[goal] ?? 1.0;

  const raw = bodyWeightKg * fraction * strengthMult * goalMult;
  const step = isDumbbell ? 1 : 2.5;
  return Math.max(step, Math.round(raw / step) * step);
}

/** Format a weight value for display */
export function formatWeight(w: number | 'bodyweight', unit: 'kg' | 'lbs' = 'kg'): string {
  if (w === 'bodyweight') return 'Bodyweight';
  if (unit === 'lbs') return `${Math.round(w * 2.2046)} lbs`;
  return `${w} kg`;
}

