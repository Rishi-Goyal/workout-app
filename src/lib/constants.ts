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

/**
 * Primary training dimension for each class. Used by rank calculation —
 * the rank (C/B/A/S/SS) is derived from the level of the class's primary
 * dimension, minus consistencyPenalty.
 */
export type ClassDimension =
  | 'push' | 'pull' | 'legs' | 'core'
  | 'cardio' | 'mobility' | 'grip' | 'balanced';

export const CLASS_DEFINITIONS: Record<
  CharacterClass,
  {
    tagline: string;
    description: string;
    primaryStat: keyof CharacterStats;
    primaryDimension: ClassDimension;
    icon: string;
    color: string;
  }
> = {
  'Awakened Novice': {
    tagline: 'The System recognizes a new Hunter.',
    description: 'Your awakening is fresh. Every floor you clear etches a new dimension onto your class — push, pull, legs, cardio, mobility, grip. The dungeon is watching.',
    primaryStat: 'vitality',
    primaryDimension: 'balanced',
    icon: '🌿',
    color: '#A5B4FC',
  },
  'Iron Bulwark': {
    tagline: 'The wall the party hides behind.',
    description: 'Push and core fused into living steel. You absorb what others can\'t. Your bench press has deadlines the rest of us don\'t respect.',
    primaryStat: 'strength',
    primaryDimension: 'push',
    icon: '🛡️',
    color: '#6366F1',
  },
  'Atlas Titan': {
    tagline: 'The ground negotiates with your squat.',
    description: 'Legs like load-bearing columns. You do not walk through the dungeon — the dungeon reroutes around you.',
    primaryStat: 'endurance',
    primaryDimension: 'legs',
    icon: '⛰️',
    color: '#F97316',
  },
  'Gauntlet Duelist': {
    tagline: 'Push, pull, and make it look effortless.',
    description: 'Upper-body balance so symmetric it reads as intimidation. Every rep is a duel and you are 6–0 this week.',
    primaryStat: 'strength',
    primaryDimension: 'push',
    icon: '🤺',
    color: '#F5A623',
  },
  'Ironhand Crusher': {
    tagline: 'Doorknobs fear you.',
    description: 'Your grip is a weapon. Deadhangs measured in minutes, farmer carries measured in city blocks. You crush tennis balls for pleasure.',
    primaryStat: 'strength',
    primaryDimension: 'grip',
    icon: '✊',
    color: '#E53E3E',
  },
  'Shadow Archer': {
    tagline: 'Pulled from the void, loosed at the target.',
    description: 'Pull-day assassin with the footwork of a dancer. You stalk PRs silently, collect them all at once.',
    primaryStat: 'agility',
    primaryDimension: 'pull',
    icon: '🏹',
    color: '#8B5CF6',
  },
  'Dragonspine': {
    tagline: 'A posterior chain written in myth.',
    description: 'Your back could carry a raid. Rows, pull-ups, deadlifts — every vertebra is a trophy case. The mirror is afraid of you.',
    primaryStat: 'strength',
    primaryDimension: 'pull',
    icon: '🐉',
    color: '#6366F1',
  },
  'Raven Stalker': {
    tagline: 'Silent. Mobile. Lethal from above.',
    description: 'Pull-strong and scary agile. You drop from the rafters onto compound lifts and disappear before the rest react.',
    primaryStat: 'agility',
    primaryDimension: 'pull',
    icon: '🪶',
    color: '#3A3375',
  },
  'Juggernaut': {
    tagline: 'Unblockable. Unstoppable. Unnuanced.',
    description: 'Mass moved through space. Strength across every zone. Subtlety is for people who can\'t squat three plates.',
    primaryStat: 'strength',
    primaryDimension: 'balanced',
    icon: '🐂',
    color: '#B27712',
  },
  'Storm Rider': {
    tagline: 'Explosive output. Zero speed limit.',
    description: 'Cardio engine fused to a powerlifter. You end workouts gasping and grinning. The dungeon can\'t catch you — but you definitely hit it.',
    primaryStat: 'endurance',
    primaryDimension: 'cardio',
    icon: '⚡',
    color: '#38BDF8',
  },
  'Windrunner': {
    tagline: 'Distance is the only discipline.',
    description: 'You disappear into the horizon and return hours later unbothered. Lungs engineered, legs tireless, the mile is a warm-up.',
    primaryStat: 'endurance',
    primaryDimension: 'cardio',
    icon: '🌬️',
    color: '#34D399',
  },
  'Void Monk': {
    tagline: 'Planks outlast empires.',
    description: 'Your core is a fortress. Your mobility unsettles physiotherapists. You sit in lotus through dungeon boss fights.',
    primaryStat: 'agility',
    primaryDimension: 'core',
    icon: '🏯',
    color: '#14B8A6',
  },
  'Serpent Dancer': {
    tagline: 'Bending is a language. You are fluent.',
    description: 'Mobility and agility in balance so fluid it looks illegal. Pistol squats are a stretch routine. You flow; everything else breaks.',
    primaryStat: 'agility',
    primaryDimension: 'mobility',
    icon: '🐍',
    color: '#10B981',
  },
  'Flame Herald': {
    tagline: 'Explosive. Loud. Briefly on fire.',
    description: 'Power cleans, plyo pushups, jump squats — every rep is an ignition. You leave sessions looking like you survived something.',
    primaryStat: 'endurance',
    primaryDimension: 'balanced',
    icon: '🔥',
    color: '#F43F5E',
  },
  'Paragon': {
    tagline: 'Balanced at a level most only claim.',
    description: 'Every zone, every dimension, trained to equal mastery. No skip days, no imbalance. The System writes essays about you.',
    primaryStat: 'vitality',
    primaryDimension: 'balanced',
    icon: '🏆',
    color: '#EAB308',
  },
  'Ascendant': {
    tagline: 'You are not in the leaderboard. You are the ceiling.',
    description: 'All dimensions past the threshold mortals hit. The dungeon reshapes itself when you enter. SS-rank, S-rank everything.',
    primaryStat: 'vitality',
    primaryDimension: 'balanced',
    icon: '☀️',
    color: '#FFC857',
  },
};

export const XP_BY_DIFFICULTY: Record<QuestDifficulty, number> = {
  easy: 50,
  medium: 100,
  hard: 150,
  boss: 300,
};

/** @deprecated Class is now derived every session via deriveClass() */
export const GOAL_TO_CLASS: Record<FitnessGoal, CharacterClass> = {
  strength:     'Awakened Novice',
  endurance:    'Awakened Novice',
  calisthenics: 'Awakened Novice',
  balanced:     'Awakened Novice',
  weight_loss:  'Awakened Novice',
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
