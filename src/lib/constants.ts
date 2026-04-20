import type { Equipment, MuscleGroup, CharacterClass, FitnessGoal, QuestDifficulty, CharacterStats } from '../types';

export const EQUIPMENT_LIST: { value: Equipment; label: string; icon: string }[] = [
  { value: 'barbell', label: 'Barbell', icon: '🏋️' },
  { value: 'dumbbells', label: 'Dumbbells', icon: '💪' },
  { value: 'kettlebell', label: 'Kettlebell', icon: '🔔' },
  { value: 'pull_up_bar', label: 'Pull-up Bar', icon: '🔝' },
  { value: 'resistance_bands', label: 'Resistance Bands', icon: '🔗' },
  { value: 'bench', label: 'Bench', icon: '🪑' },
  { value: 'cable_machine', label: 'Cable Machine', icon: '⚙️' },
  { value: 'bodyweight_only', label: 'No Equipment', icon: '🧍' },
];

export const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'core', label: 'Core' },
  { value: 'quads', label: 'Quads' },
  { value: 'hamstrings', label: 'Hamstrings' },
  { value: 'glutes', label: 'Glutes' },
  { value: 'calves', label: 'Calves' },
];

export const FITNESS_GOALS: { value: FitnessGoal; label: string; description: string; icon: string }[] = [
  { value: 'strength', label: 'Strength', description: 'Build raw power and lift heavier', icon: '⚔️' },
  { value: 'endurance', label: 'Endurance', description: 'Push through high-volume sessions', icon: '🔥' },
  { value: 'weight_loss', label: 'Weight Loss', description: 'Burn calories and tone up', icon: '🌪️' },
  { value: 'balanced', label: 'Balanced', description: 'All-round fitness improvement', icon: '⚖️' },
  { value: 'calisthenics', label: 'Calisthenics', description: 'Master your bodyweight', icon: '🤸' },
];

export const CLASS_DEFINITIONS: Record<
  CharacterClass,
  { tagline: string; description: string; primaryStat: keyof CharacterStats; icon: string; color: string }
> = {
  Wanderer: {
    tagline: 'Every legend begins here.',
    description: 'A fresh adventurer stepping into the dungeon. Your muscles are a blank canvas — the real question is which ones you\'ll neglect first.',
    primaryStat: 'vitality',
    icon: '🌿',
    color: '#6b7280',
  },
  'Mirror Knight': {
    tagline: 'International Chest Day. Every day.',
    description: 'A push-day devotee. Chest, shoulders, and triceps forged in countless bench press sets. Legs? The mirror doesn\'t show those.',
    primaryStat: 'strength',
    icon: '🪞',
    color: '#6366f1',
  },
  Phantom: {
    tagline: 'Built in the shadows. Nobody watches back day.',
    description: 'You row, you pull, you conquer — silently, without applause. Your back could carry the whole party. Your biceps are frankly intimidating.',
    primaryStat: 'strength',
    icon: '👻',
    color: '#8b5cf6',
  },
  Earthshaker: {
    tagline: 'Leg day is not a day. It\'s a lifestyle.',
    description: 'The ground trembles when you squat. Your quads are architectural marvels. Upper body training is a formality you tolerate twice a month.',
    primaryStat: 'endurance',
    icon: '🌋',
    color: '#f97316',
  },
  'Iron Monk': {
    tagline: 'The plank has no end. Only you do.',
    description: 'Your core is a fortress. You have performed planks that outlasted civilisations. Other muscles are decorative by comparison.',
    primaryStat: 'agility',
    icon: '🏯',
    color: '#14b8a6',
  },
  'Iron Knight': {
    tagline: 'Upper body warrior. Legs are on sabbatical.',
    description: 'Push and pull in perfect harmony — your upper body is a sculpture. Below the waist exists a philosophical void you have chosen not to address.',
    primaryStat: 'strength',
    icon: '⚔️',
    color: '#f59e0b',
  },
  Colossus: {
    tagline: 'A moving mountain with a concrete core.',
    description: 'Legs like pillars, core like bedrock. Your lower half is an engineering achievement. You could squat a car. You could probably outrun nothing.',
    primaryStat: 'endurance',
    icon: '💥',
    color: '#ef4444',
  },
  Berserker: {
    tagline: 'Untamed. Unpredictable. Unstoppable.',
    description: 'Some muscles are elite. Some are neglected. All of it is loud. You don\'t train in balance — you train in chaos, and somehow it works.',
    primaryStat: 'endurance',
    icon: '🔥',
    color: '#f43f5e',
  },
  Paragon: {
    tagline: 'Statistically rare. Suspiciously perfect.',
    description: 'Every muscle group trained to near-equal mastery. No skip days, no excuses, no imbalance. The dungeon respects you. We all do.',
    primaryStat: 'vitality',
    icon: '🏆',
    color: '#eab308',
  },
};

export const XP_BY_DIFFICULTY: Record<QuestDifficulty, number> = {
  easy: 50,
  medium: 100,
  hard: 150,
  boss: 300,
};

/** @deprecated Class is now derived from muscle XP via deriveClassFromMuscles() */
export const GOAL_TO_CLASS: Record<FitnessGoal, CharacterClass> = {
  strength:     'Wanderer',
  endurance:    'Wanderer',
  calisthenics: 'Wanderer',
  balanced:     'Wanderer',
  weight_loss:  'Wanderer',
};

export const TITLES_BY_LEVEL: { maxLevel: number; title: string }[] = [
  { maxLevel: 3,        title: 'Initiate' },
  { maxLevel: 7,        title: 'Seeker' },
  { maxLevel: 12,       title: 'Veteran' },
  { maxLevel: 18,       title: 'Stone Warden' },
  { maxLevel: 25,       title: 'Shadow Blade' },
  { maxLevel: 35,       title: 'Dungeon Slayer' },
  { maxLevel: 50,       title: 'Abyssal Champion' },
  { maxLevel: Infinity, title: 'Eternal Conqueror' },
];

/**
 * v4 "Solo Leveling" design tokens.
 * Source: Claude Design handoff bundle (api.anthropic.com/v1/design/h/yxrB0zRn_jGZeo8jf8l9Lg).
 * Key names kept stable to avoid downstream churn — only values changed from the v3 indigo set.
 */
export const COLORS = {
  // Backgrounds — deep obsidian
  bg:           '#07061A',
  surface:      '#0E0C24',
  surfaceHover: '#141230',
  surfaceAccent:'#18153C',
  surfaceGlow:  '#221B55',

  // Borders
  border:       '#1E1A40',
  borderLight:  '#2E2A60',
  borderStrong: '#3A3375',

  // Brand — gold primary (key names kept for zero-diff in screens)
  gold:         '#F5A623',       // primary accent / CTAs / XP
  goldLight:    '#FFC857',
  goldDim:      '#B27712',

  // Brand — violet secondary (level-up glow, accents)
  violet:       '#6366F1',
  violetLight:  '#A5B4FC',
  violetDim:    '#3730A3',

  // Semantic
  crimson:      '#E53E3E',       // boss / danger
  jade:         '#10B981',       // cleared / success
  jadeLight:    '#34D399',
  orange:       '#F97316',       // hard difficulty
  cyan:         '#38BDF8',

  // Text
  text:         '#EDEAF8',
  textSecondary:'#C4B8E4',
  textMuted:    '#7A6D9A',
  textInverse:  '#07061A',
};

/**
 * Font families. Loaded via @expo-google-fonts in app/_layout.tsx.
 * Use these constants everywhere instead of hard-coded font names.
 */
export const FONTS = {
  display:     'Unbounded_500Medium',     // screen titles, level numbers, big stats
  displayBold: 'Unbounded_700Bold',
  sans:        'Inter_400Regular',        // body
  sansMed:     'Inter_500Medium',         // labels
  sansBold:    'Inter_700Bold',           // buttons / emphasis
  mono:        'DMMono_400Regular',       // numbers, weights
  monoMed:     'DMMono_500Medium',        // emphasized numerics (XP, timers)
} as const;

/** Border-radius scale — use everywhere, no magic numbers. */
export const RADIUS = {
  card:   16,
  cardLg: 20,
  button: 12,
  pill:   999,
  sm:     8,
} as const;

/** Spacing scale — screen padding, card padding, section gaps. */
export const SPACING = {
  screen: 16,   // horizontal / vertical screen padding
  card:   16,   // inner card padding
  cardLg: 20,   // hero / large card padding
  gap:    16,   // between sections
  gapSm:  8,    // between list items
} as const;

/**
 * Class rank thresholds. Computed from a class's primary muscle/dimension level.
 * SS (Ascendant) is special — only awarded when ALL dimensions ≥ 12.
 */
export const RANK_THRESHOLDS = {
  C:  1,
  B:  4,
  A:  7,
  S:  11,
  SS: 12,
} as const;

export type ClassRank = 'C' | 'B' | 'A' | 'S' | 'SS';
