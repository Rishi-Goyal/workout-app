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

/**
 * v4.1.0 B8 — per-exercise swap log. If the user swaps the same exercise to
 * the same alternative repeatedly, the generator auto-substitutes the swap
 * going forward. Kept at most MAX_SWAP_HISTORY entries per original.
 */
export interface SwapEntry {
  toId: string;
  sessionId: string;
  swappedAt: string;
}
export type SwapHistory = Record<string, SwapEntry[]>;

const MAX_SWAP_HISTORY = 5;
/** Number of consecutive same-target swaps needed to promote to default. */
const SWAP_PROMOTE_THRESHOLD = 2;

interface AdaptationStore {
  adaptations: AdaptationMap;
  swapHistory: SwapHistory;

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

  /** Record that the user swapped `fromId` → `toId` during `sessionId`. */
  recordSwap: (fromId: string, toId: string, sessionId: string) => void;
  /**
   * Returns the user's preferred swap target if the last
   * SWAP_PROMOTE_THRESHOLD entries in swapHistory[fromId] all point to the
   * same exercise; otherwise null.
   */
  getPreferredSwap: (fromId: string) => string | null;
  /** Forget the swap history for one exercise (Settings → Reset learned swap). */
  clearSwapHistory: (fromId: string) => void;

  resetAdaptation: (exerciseId: string) => void;
  clearAllAdaptations: () => void;
}

export const useAdaptationStore = create<AdaptationStore>()(
  persist(
    (set, get) => ({
      adaptations: {},
      swapHistory: {},

      getAdaptation: (exerciseId) => get().adaptations[exerciseId] ?? null,

      recordSwap: (fromId, toId, sessionId) => {
        if (!fromId || !toId || fromId === toId) return;
        const history = get().swapHistory[fromId] ?? [];
        // De-dupe by sessionId so multiple swaps within the same session
        // don't pollute the streak detection.
        const filtered = history.filter((e) => e.sessionId !== sessionId);
        const next = [
          { toId, sessionId, swappedAt: new Date().toISOString() },
          ...filtered,
        ].slice(0, MAX_SWAP_HISTORY);
        set({
          swapHistory: { ...get().swapHistory, [fromId]: next },
        });
      },

      getPreferredSwap: (fromId) => {
        const history = get().swapHistory[fromId] ?? [];
        if (history.length < SWAP_PROMOTE_THRESHOLD) return null;
        const recent = history.slice(0, SWAP_PROMOTE_THRESHOLD);
        const first = recent[0].toId;
        return recent.every((e) => e.toId === first) ? first : null;
      },

      clearSwapHistory: (fromId) => {
        const next = { ...get().swapHistory };
        delete next[fromId];
        set({ swapHistory: next });
      },

      applyAdaptation: (session, muscleXP) => {
        const current = get().adaptations;
        const updated = { ...current };
        const changes: AdaptationChange[] = [];

        for (const quest of session.quests) {
          if (!quest.exerciseId) continue;
          // v4.1.0 Theme C — only lift quests feed progressive overload.
          // Warmups, cooldowns, and mobility drills use fixed durations.
          if (quest.kind && quest.kind !== 'lift') continue;

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
      version: 3,
      partialize: (state) => ({
        adaptations: state.adaptations,
        swapHistory: state.swapHistory,
      }),
      migrate: (persisted: unknown, _v: number) => {
        const s = (persisted ?? {}) as Record<string, unknown>;
        if (typeof s.adaptations !== 'object' || s.adaptations === null) {
          s.adaptations = {};
        }
        // v1 → v2 (v4.1.0): remap 'met_target' → 'stabilise', drop 'reset'
        const map = s.adaptations as Record<string, Record<string, unknown>>;
        for (const key of Object.keys(map)) {
          const a = map[key];
          if (a && typeof a === 'object') {
            const reason = a.adaptationReason;
            if (reason === 'met_target' || reason === 'reset') {
              a.adaptationReason = 'stabilise';
            }
            if (a.copy === undefined) a.copy = '';
          }
        }
        // v2 → v3 (v4.1.0 B8): ensure swapHistory exists as an empty record.
        if (typeof s.swapHistory !== 'object' || s.swapHistory === null) {
          s.swapHistory = {};
        }
        return s as Partial<AdaptationStore>;
      },
    },
  ),
);
