import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, Character, MuscleGroup } from '../types';
import type { WorkoutSplitType } from '../lib/exerciseDatabase';
import { createCharacter, applyLevelUpStats, deriveClassFromMuscles } from '../lib/character';
import { applyXP } from '../lib/xp';
import {
  type MuscleXP,
  DEFAULT_MUSCLE_XP,
  seedMuscleXPFromStrengths,
  calculateMuscleXP,
  applyMuscleXP,
} from '../lib/muscleXP';
import { fetchLatestVersion } from '../lib/versionCheck';
import type { QuestDifficulty } from '../types';
import { getMuscleFatigue, EXERCISE_MAP } from '../lib/exerciseDatabase';
import { useAdaptationStore } from './useAdaptationStore';
import { useWeeklyGoalStore } from './useWeeklyGoalStore';

interface MuscleXPResult {
  levelUps: Array<{ muscle: MuscleGroup; newLevel: number }>;
}

interface ProfileStore {
  profile: UserProfile | null;
  character: Character | null;
  muscleXP: MuscleXP;
  preferredSplit: WorkoutSplitType | null;
  // Version checking (transient — not persisted, re-checked each launch)
  latestVersion: string | null;
  checkForUpdate: () => Promise<void>;
  setProfile: (profile: UserProfile) => void;
  setPreferredSplit: (split: WorkoutSplitType | null) => void;
  updateMuscleStrength: (muscle: MuscleGroup, value: number) => void;
  awardXP: (amount: number) => { leveledUp: boolean; levelsGained: number };
  awardMuscleXP: (
    primaryMuscles: MuscleGroup[],
    secondaryMuscles: MuscleGroup[],
    difficulty: QuestDifficulty,
    completion: 'complete' | 'half_complete',
    exerciseId?: string,
  ) => MuscleXPResult;
  incrementFloorsCleared: () => void;
  resetProfile: () => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profile: null,
      character: null,
      muscleXP: DEFAULT_MUSCLE_XP,
      preferredSplit: null,
      latestVersion: null,

      checkForUpdate: async () => {
        // Silently fetch latest version from GitHub; ignore all errors
        try {
          const latest = await fetchLatestVersion();
          if (latest) set({ latestVersion: latest });
        } catch {
          // Network error — not a problem, banner simply won't show
        }
      },

      setProfile: (profile) => {
        const isNew = get().profile === null;
        const existing = get().character;
        set({
          profile,
          character: existing ?? createCharacter(profile.goal),
          ...(isNew && { muscleXP: seedMuscleXPFromStrengths(profile.muscleStrengths) }),
        });
      },

      setPreferredSplit: (split) => set({ preferredSplit: split }),

      updateMuscleStrength: (muscle, value) => {
        const p = get().profile;
        if (!p) return;
        set({ profile: { ...p, muscleStrengths: { ...p.muscleStrengths, [muscle]: value } } });
      },

      awardXP: (amount) => {
        const character = get().character;
        if (!character) return { leveledUp: false, levelsGained: 0 };
        const { character: updated, leveledUp, levelsGained } = applyXP(character, amount);
        const withStats = leveledUp ? applyLevelUpStats(updated, levelsGained) : updated;
        set({ character: withStats });
        return { leveledUp, levelsGained };
      },

      awardMuscleXP: (primaryMuscles, secondaryMuscles, difficulty, completion, exerciseId) => {
        const current = get().muscleXP;
        const awards = calculateMuscleXP(primaryMuscles, secondaryMuscles, difficulty, completion);
        // Look up exercise-specific fatigue if exerciseId provided
        const exercise = exerciseId ? EXERCISE_MAP[exerciseId] : undefined;
        const fatigue = exercise ? getMuscleFatigue(exercise) : undefined;
        const { muscleXP: updated, levelUps } = applyMuscleXP(current, awards, fatigue);

        // Re-derive class from the updated muscle distribution after every session
        const character = get().character;
        const newClass = deriveClassFromMuscles(updated);
        const updatedCharacter = character
          ? { ...character, class: newClass }
          : character;

        set({ muscleXP: updated, character: updatedCharacter });
        return { levelUps };
      },

      incrementFloorsCleared: () => {
        const c = get().character;
        if (!c) return;
        set({ character: { ...c, floorsCleared: c.floorsCleared + 1 } });
      },

      resetProfile: () => {
        set({ profile: null, character: null, muscleXP: DEFAULT_MUSCLE_XP, preferredSplit: null });
        // Clear all dependent stores so no stale data persists after a profile wipe
        useAdaptationStore.getState().clearAllAdaptations();
        useWeeklyGoalStore.getState().resetAll();
      },
    }),
    {
      name: 'dungeon-profile',
      storage: createJSONStorage(() => AsyncStorage),
      version: 5,
      migrate: (persistedState: unknown, _fromVersion: number) => {
        const s = (persistedState ?? {}) as Record<string, unknown>;
        if (!s.muscleXP) s.muscleXP = DEFAULT_MUSCLE_XP;
        if (s.character && typeof s.character === 'object') {
          const c = s.character as Record<string, unknown>;
          if (c.floorsCleared === undefined) c.floorsCleared = 0;
        }
        // v2 → v3: ensure profile has weightUnit (default 'kg')
        if (s.profile && typeof s.profile === 'object') {
          const p = s.profile as Record<string, unknown>;
          if (!p.weightUnit) p.weightUnit = 'kg';
        }
        // v3 → v4: add lastTrained to each muscle entry (undefined = never trained)
        if (s.muscleXP && typeof s.muscleXP === 'object') {
          const mxp = s.muscleXP as Record<string, Record<string, unknown>>;
          for (const key of Object.keys(mxp)) {
            if (mxp[key] && mxp[key].lastTrained === undefined) {
              mxp[key].lastTrained = undefined;
            }
          }
        }
        // v4 → v5: add lastFatigueScore to each muscle entry
        if (s.muscleXP && typeof s.muscleXP === 'object') {
          const mxp = s.muscleXP as Record<string, Record<string, unknown>>;
          for (const key of Object.keys(mxp)) {
            if (mxp[key] && mxp[key].lastFatigueScore === undefined) {
              mxp[key].lastFatigueScore = undefined;
            }
          }
        }
        return s as unknown as Partial<ProfileStore>;
      },
      merge: (persistedState: unknown, currentState: ProfileStore): ProfileStore => {
        const s = (persistedState ?? {}) as Partial<ProfileStore>;
        const mergedMuscleXP = { ...currentState.muscleXP, ...(s.muscleXP ?? {}) };

        // Always re-derive class so old stored values ('Warrior', 'Paladin', etc.) are corrected
        const derivedClass = deriveClassFromMuscles(mergedMuscleXP);
        const mergedCharacter = s.character
          ? { ...s.character, class: derivedClass }
          : currentState.character;

        return {
          ...currentState,
          ...s,
          muscleXP: mergedMuscleXP,
          character: mergedCharacter,
        };
      },
      partialize: (state: ProfileStore) => ({
        profile: state.profile,
        character: state.character,
        muscleXP: state.muscleXP,
        preferredSplit: state.preferredSplit,
        // latestVersion intentionally excluded — re-checked on every launch
      }),
    }
  )
);
