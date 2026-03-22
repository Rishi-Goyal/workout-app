import type { Equipment, MuscleGroup, CharacterClass, FitnessGoal, QuestDifficulty, CharacterStats } from '../types';

export const EQUIPMENT_LIST: { value: Equipment; label: string; icon: string }[] = [
  { value: 'barbell', label: 'Barbell', icon: '🏋️' },
  { value: 'dumbbells', label: 'Dumbbells', icon: '💪' },
  { value: 'kettlebell', label: 'Kettlebell', icon: '🔔' },
  { value: 'pull_up_bar', label: 'Pull-up Bar', icon: '🔝' },
  { value: 'resistance_bands', label: 'Resistance Bands', icon: '🔗' },
  { value: 'bench', label: 'Bench', icon: '🪑' },
  { value: 'cable_machine', label: 'Cable Machine', icon: '⚙️' },
  { value: 'bodyweight_only', label: 'Bodyweight Only', icon: '🧍' },
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
  { description: string; primaryStat: keyof CharacterStats; icon: string; color: string }
> = {
  Warrior: {
    description: 'Masters of iron and steel. Warriors channel their fury into explosive compound lifts.',
    primaryStat: 'strength',
    icon: '⚔️',
    color: '#f59e0b',
  },
  Berserker: {
    description: 'Unstoppable forces of endurance. Berserkers thrive in high-volume, relentless sessions.',
    primaryStat: 'endurance',
    icon: '🔥',
    color: '#ef4444',
  },
  Rogue: {
    description: 'Swift and precise. Rogues excel at bodyweight mastery and calisthenics.',
    primaryStat: 'agility',
    icon: '🗡️',
    color: '#10b981',
  },
  Paladin: {
    description: 'Guardians of balance. Paladins train every aspect of fitness with discipline.',
    primaryStat: 'vitality',
    icon: '🛡️',
    color: '#8b5cf6',
  },
};

export const XP_BY_DIFFICULTY: Record<QuestDifficulty, number> = {
  easy: 50,
  medium: 100,
  hard: 150,
  boss: 300,
};

export const GOAL_TO_CLASS: Record<FitnessGoal, CharacterClass> = {
  strength: 'Warrior',
  endurance: 'Berserker',
  calisthenics: 'Rogue',
  balanced: 'Paladin',
  weight_loss: 'Paladin',
};

export const TITLES_BY_LEVEL: { maxLevel: number; title: string }[] = [
  { maxLevel: 3, title: 'Initiate' },
  { maxLevel: 7, title: 'Wanderer' },
  { maxLevel: 12, title: 'Iron Knight' },
  { maxLevel: 18, title: 'Stone Warden' },
  { maxLevel: 25, title: 'Shadow Blade' },
  { maxLevel: 35, title: 'Dungeon Slayer' },
  { maxLevel: 50, title: 'Abyssal Champion' },
  { maxLevel: Infinity, title: 'Eternal Conqueror' },
];

export const COLORS = {
  bg: '#0d0a0e',
  surface: '#1a1625',
  surfaceHover: '#221d30',
  border: '#2e2540',
  gold: '#f59e0b',
  crimson: '#dc2626',
  jade: '#10b981',
  violet: '#8b5cf6',
  text: '#e8dcc8',
  textMuted: '#9988aa',
};
