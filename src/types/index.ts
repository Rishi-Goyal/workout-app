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

/**
 * v4 class system — 16 archetypes. Class is re-derived from muscleXP +
 * cardio/mobility/grip on the character every session. See deriveClass().
 */
export type CharacterClass =
  | 'Awakened Novice'   // C — entry, dimensions below threshold
  | 'Iron Bulwark'      // push + core, defensive upper
  | 'Atlas Titan'       // legs dominant, heavy
  | 'Gauntlet Duelist'  // balanced upper (push + pull), moderate
  | 'Ironhand Crusher'  // grip dominant, brute strength
  | 'Shadow Archer'     // pull + agility, explosive
  | 'Dragonspine'       // back specialist, posterior chain
  | 'Raven Stalker'     // pull + mobility, cat-like
  | 'Juggernaut'        // overall mass, high STR across the board
  | 'Storm Rider'       // cardio + explosive, high-output
  | 'Windrunner'        // pure cardio, long-distance
  | 'Void Monk'         // core + mobility, zen specialist
  | 'Serpent Dancer'    // mobility + agility, fluid
  | 'Flame Herald'      // explosive power + upper
  | 'Paragon'           // A — balanced high across all dimensions
  | 'Ascendant';        // SS — all dimensions ≥ 12
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
  // v4 onboarding dimensions — feed into class derivation
  cardioMinutes?: number;    // minutes/week of cardio (0–300)
  mobilityScore?: number;    // 1–10 flexibility/ROM
  gripScore?: number;        // 1–10 grip strength
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
  // v4 dimensions — grow with training, feed into class derivation
  cardioMinutes: number;     // mirrors profile but can grow via cardio workouts
  mobilityScore: number;     // 1–20
  gripScore: number;         // 1–20
  // v4 streak mechanics (Phase 9 wires earning/consumption)
  freezeTokens?: number;     // 0–3, consumed to preserve streak on off weeks
  consistencyPenalty?: number; // 0–20, % subtracted from class rank score
}

export interface SetLog {
  setNumber: number;
  repsCompleted: number;
  timeCompleted?: number;    // seconds, for static/isometric exercises
  weight: number | 'bodyweight'; // kg or bodyweight
  bonusXPEarned?: number;   // bonus XP awarded for exceeding recommended reps/time
}

export interface Quest {
  id: string;
  exerciseId?: string;
  exerciseName: string;
  description: string;
  targetMuscles: MuscleGroup[];
  sets: number;
  reps: string;
  holdSeconds?: number; // set for isometric/static exercises instead of reps
  restSeconds: number;
  difficulty: QuestDifficulty;
  xpReward: number;
  status: QuestStatus;
  xpEarned: number;
  suggestedWeight?: number | 'bodyweight'; // kg
  loggedSets?: SetLog[];
  bonusXPAwarded?: number;  // total bonus XP earned across all sets for this quest
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
