export type FitnessGoal =
  | 'strength'
  | 'endurance'
  | 'weight_loss'
  | 'balanced'
  | 'calisthenics';

export type Equipment =
  | 'barbell'
  | 'dumbbells'
  | 'kettlebell'
  | 'pull_up_bar'
  | 'resistance_bands'
  | 'bench'
  | 'cable_machine'
  | 'bodyweight_only';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves';

export type CharacterClass = 'Warrior' | 'Berserker' | 'Rogue' | 'Paladin';
export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'boss';
export type QuestStatus = 'pending' | 'complete' | 'half_complete' | 'skipped';
export type SessionStatus = 'active' | 'completed' | 'abandoned';

export type MuscleStrengths = Record<MuscleGroup, number>;

export interface UserProfile {
  name: string;
  goal: FitnessGoal;
  equipment: Equipment[];
  muscleStrengths: MuscleStrengths;
  createdAt: string;
  bodyWeight?: number;       // kg (defaults to 70 if not set)
  weightUnit?: 'kg' | 'lbs'; // display preference (default 'kg')
}

export interface CharacterStats {
  strength: number;
  endurance: number;
  agility: number;
  vitality: number;
}

export interface Character {
  class: CharacterClass;
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  totalXPEarned: number;
  stats: CharacterStats;
  title: string;
  floorsCleared: number;
}

export interface SetLog {
  setNumber: number;
  repsCompleted: number;
  weight: number | 'bodyweight'; // kg or bodyweight
}

export interface Quest {
  id: string;
  exerciseName: string;
  description: string;
  targetMuscles: MuscleGroup[];
  sets: number;
  reps: string;
  restSeconds: number;
  difficulty: QuestDifficulty;
  xpReward: number;
  status: QuestStatus;
  xpEarned: number;
  suggestedWeight?: number | 'bodyweight'; // kg
  loggedSets?: SetLog[];
}

export interface DungeonSession {
  id: string;
  floor: number;
  quests: Quest[];
  status: SessionStatus;
  totalXPEarned: number;
  startedAt: string;
  completedAt?: string;
}

export type RawQuest = Omit<Quest, 'id' | 'status' | 'xpEarned'>;

export interface SuggestQuestsPayload {
  profile: UserProfile;
  character: Character;
  recentSessions: DungeonSession[];
  currentFloor: number;
}

// ─── Muscle XP (re-exported from muscleXP.ts for convenience) ─────────────
export type { MuscleXP } from '@/lib/muscleXP';
