/**
 * useAdaptationStore — persists per-exercise progressive overload targets.
 *
 * Populated automatically after each finalized session via `applyAdaptation()`.
 * Read by `generateQuests()` so the next session uses adapted targets.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  computeAdaptation,
  type AdaptationMap,
  type AdaptationChange,
  type ExerciseAdaptation,
} from '@/lib/adaptationEngine';
import { EXERCISE_MAP } from '@/lib/exerciseDatabase';
import type { DungeonSession, MuscleGroup } from '@/types';
import type { MuscleXP } from '@/lib/muscleXP';

/** Weight step (kg) derived from exercise equipment & tags. */
function weightStepFor(exerciseId: string): number {
  const ex = EXERCISE_MAP[exerciseId];
  if (!ex) return 2.5;
  const hasBarbell  = ex.equipment.includes('barbell');
  const hasDumbbell = ex.equipment.includes('dumbbells');
  const isCompound  = ex.tags.includes('compound');
  if (hasBarbell && isCompound)  return 2.5;
  if (hasDumbbell && isCompound) return 2;
  return 1.25; // isolation / cable / machine
}

interface AdaptationStore {
  adaptations: AdaptationMap;

  getAdaptation: (exerciseId: string) => ExerciseAdaptation | null;

  /**
   * Computes and persists progressive overload adjustments for every non-skipped
   * quest in the finalized session. Returns a list of human-readable changes for
   * display in SessionSummary.
   *
   * @param session  The just-finalized DungeonSession.
   * @param muscleXP Current muscleXP state — used to calibrate progression rate.
   */
  applyAdaptation: (session: DungeonSession, muscleXP: MuscleXP) => AdaptationChange[];

  resetAdaptation: (exerciseId: string) => void;
  clearAllAdaptations: () => void;
}

export const useAdaptationStore = create<AdaptationStore>()(
  persist(
    (set, get) => ({
      adaptations: {},

      getAdaptation: (exerciseId) => get().adaptations[exerciseId] ?? null,

      applyAdaptation: (session, muscleXP) => {
        const current = get().adaptations;
        const updated = { ...current };
        const changes: AdaptationChange[] = [];

        for (const quest of session.quests) {
          if (!quest.exerciseId) continue;

          // Primary muscle for this quest drives the progression rate
          const primaryMuscle = quest.targetMuscles[0] as MuscleGroup | undefined;
          const muscleLevel   = primaryMuscle ? (muscleXP[primaryMuscle]?.level ?? 1) : 1;
          const weightStep    = weightStepFor(quest.exerciseId);

          const existing = current[quest.exerciseId] ?? null;
          const result   = computeAdaptation(quest, existing, muscleLevel, weightStep);
          if (!result) continue;

          updated[quest.exerciseId] = result.adaptation;
          changes.push(result.change);
        }

        set({ adaptations: updated });
        return changes;
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
