import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, Character, MuscleGroup } from '../types';
import { createCharacter, applyLevelUpStats, deriveClassFromMuscles } from '../lib/character';
import { applyXP } from '../lib/xp';
import {
  type MuscleXP,
  DEFAULT_MUSCLE_XP,
  calculateMuscleXP,
  applyMuscleXP,
} from '../lib/muscleXP';
import { fetchLatestVersion } from '../lib/versionCheck';
import type { QuestDifficulty } from '../types';

interface MuscleXPResult {
  levelUps: Array<{ muscle: MuscleGroup; newLevel: number }>;
}

interface ProfileStore {
  profile: UserProfile | null;
  character: Character | null;
  muscleXP: MuscleXP;
  // Version checking (transient — not persisted, re-checked each launch)
  latestVersion: string | null;
  checkForUpdate: () => Promise<void>;
  setProfile: (profile: UserProfile) => void;
  updateMuscleStrength: (muscle: MuscleGroup, value: number) => void;
  awardXP: (amount: number) => { leveledUp: boolean; levelsGained: number };
  awardMuscleXP: (
    primaryMuscles: MuscleGroup[],
    secondaryMuscles: MuscleGroup[],
    difficulty: QuestDifficulty,
    completion: 'complete' | 'half_complete',
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
        const existing = get().character;
        set({ profile, character: existing ?? createCharacter(profile.goal) });
      },

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

      awardMuscleXP: (primaryMuscles, secondaryMuscles, difficulty, completion) => {
        const current = get().muscleXP;
        const awards = calculateMuscleXP(primaryMuscles, secondaryMuscles, difficulty, completion);
        const { muscleXP: updated, levelUps } = applyMuscleXP(current, awards);

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

      resetProfile: () => set({ profile: null, character: null, muscleXP: DEFAULT_MUSCLE_XP }),
    }),
    {
      name: 'dungeon-profile',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
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
        // latestVersion intentionally excluded — re-checked on every launch
      }),
    }
  )
);
