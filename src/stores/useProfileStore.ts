import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, Character, MuscleGroup } from '../types';
import { createCharacter, applyLevelUpStats } from '../lib/character';
import { applyXP } from '../lib/xp';

interface ProfileStore {
  profile: UserProfile | null;
  character: Character | null;
  setProfile: (profile: UserProfile) => void;
  updateMuscleStrength: (muscle: MuscleGroup, value: number) => void;
  awardXP: (amount: number) => { leveledUp: boolean; levelsGained: number };
  incrementFloorsCleared: () => void;
  resetProfile: () => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profile: null,
      character: null,

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

      incrementFloorsCleared: () => {
        const c = get().character;
        if (!c) return;
        set({ character: { ...c, floorsCleared: c.floorsCleared + 1 } });
      },

      resetProfile: () => set({ profile: null, character: null }),
    }),
    {
      name: 'dungeon-profile',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
