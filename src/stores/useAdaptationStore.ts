/**
 * useAdaptationStore — persists per-exercise progressive overload targets.
 *
 * Populated automatically after each finalized session via `applyAdaptation()`.
 * Read by `generateQuests()` so the next session uses adapted targets.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeAdaptation, type AdaptationMap, type ExerciseAdaptation } from '@/lib/adaptationEngine';
import type { DungeonSession } from '@/types';

interface AdaptationStore {
  adaptations: AdaptationMap;

  /** Returns the stored adaptation for an exercise, or null if none. */
  getAdaptation: (exerciseId: string) => ExerciseAdaptation | null;

  /**
   * Iterates every non-skipped quest in a finalized session and updates the
   * adaptation map. Called once inside `handleFinalize` in index.tsx.
   */
  applyAdaptation: (session: DungeonSession) => void;

  /** Reset one exercise to formula defaults (e.g. after a long break). */
  resetAdaptation: (exerciseId: string) => void;

  /** Clear all adaptations — called on profile reset. */
  clearAllAdaptations: () => void;
}

export const useAdaptationStore = create<AdaptationStore>()(
  persist(
    (set, get) => ({
      adaptations: {},

      getAdaptation: (exerciseId) => get().adaptations[exerciseId] ?? null,

      applyAdaptation: (session) => {
        const current = get().adaptations;
        const updated = { ...current };

        for (const quest of session.quests) {
          if (!quest.exerciseId) continue;
          const existing = current[quest.exerciseId] ?? null;
          const next = computeAdaptation(quest, existing);
          if (next) updated[quest.exerciseId] = next;
        }

        set({ adaptations: updated });
      },

      resetAdaptation: (exerciseId) => {
        const updated = { ...get().adaptations };
        delete updated[exerciseId];
        set({ adaptations: updated });
      },

      clearAllAdaptations: () => set({ adaptations: {} }),
    }),
    {
      name: 'dungeon-adaptations',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({ adaptations: state.adaptations }),
      migrate: (persisted: unknown, _v: number) => {
        const s = (persisted ?? {}) as Record<string, unknown>;
        if (typeof s.adaptations !== 'object' || s.adaptations === null) {
          s.adaptations = {};
        }
        return s as Partial<AdaptationStore>;
      },
    },
  ),
);
