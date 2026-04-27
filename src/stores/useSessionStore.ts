/**
 * useSessionStore — active dungeon session state.
 *
 * Persisted to AsyncStorage so progress survives navigation, backgrounding,
 * and accidental back-presses mid-workout. Only activeSession is stored;
 * transient flags (isLoading, error) are always reset on launch.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import type { DungeonSession, Quest, QuestStatus, RawQuest, SetLog, MuscleGroup, Equipment, FitnessGoal, MuscleStrengths } from '../types';
import { getXPReward } from '../lib/xp';
import { calculatePerformanceXP } from '../lib/muscleXP';
import { EXERCISE_MAP } from '../lib/exerciseDatabase';
import { getSuggestedWeight } from '../lib/weights';

const WidgetBridge = Platform.OS === 'android' ? NativeModules.WidgetBridge : null;

/** Minimal profile data needed to re-derive suggestedWeight on exercise swap. */
export interface SwapProfile {
  bodyWeight?: number;
  muscleStrengths: MuscleStrengths;
  equipment: Equipment[];
  goal: FitnessGoal;
}

interface SessionStore {
  activeSession: DungeonSession | null;
  isLoading: boolean;
  error: string | null;
  /** Reps logged from a background notification while the app was backgrounded. Not persisted. */
  pendingSetReps: { questId: string; setNumber: number; reps: number } | null;
  startSession: (floor: number, rawQuests: RawQuest[]) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  markQuest: (questId: string, status: QuestStatus, loggedSets?: SetLog[]) => void;
  /**
   * v4.2.0 Theme E — swap a quest's exercise mid-session.
   *
   * Re-derives targetMuscles, exerciseName, exerciseId, suggestedWeight, and
   * holdSeconds from the new exercise. Preserves sets / reps / difficulty /
   * xpReward / adaptationCopy / kind. Records swappedFromId so history can
   * show what was substituted.
   *
   * No-ops silently if questId or newExerciseId isn't found.
   */
  swapQuestExercise: (questId: string, newExerciseId: string, profile: SwapProfile) => void;
  finalizeSession: () => DungeonSession | null;
  clearSession: () => void;
  setPendingSetReps: (v: { questId: string; setNumber: number; reps: number }) => void;
  clearPendingSetReps: () => void;
}

function buildQuests(rawQuests: RawQuest[]): Quest[] {
  return rawQuests.map((rq, i) => ({
    ...rq,
    id: `quest-${Date.now()}-${i}`,
    status: 'pending' as QuestStatus,
    xpEarned: 0,
  }));
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      activeSession: null,
      isLoading: false,
      error: null,
      pendingSetReps: null,

      startSession: (floor, rawQuests) => {
        set({
          activeSession: {
            id: `session-${Date.now()}`,
            floor,
            quests: buildQuests(rawQuests),
            status: 'active',
            totalXPEarned: 0,
            startedAt: new Date().toISOString(),
          },
          error: null,
        });
        WidgetBridge?.updateWidget(
          rawQuests[0]?.exerciseName ?? 'Workout started',
          `Set 1 of ${rawQuests[0]?.sets ?? '?'} · ${rawQuests[0]?.reps ?? '?'} reps`,
        );
      },

      setLoading: (v) => set({ isLoading: v }),
      setError: (e) => set({ error: e }),

      markQuest: (questId, status, loggedSets) => {
        const session = get().activeSession;
        if (!session) return;
        const quests = session.quests.map((q) => {
          if (q.id !== questId) return q;

          // Warmup / cooldown / mobility drills carry a fixed xpReward set by
          // the generator (20 / 15 / per-drill). Bypass getXPReward(difficulty)
          // for these — 'easy' difficulty would give 50 XP which inflates
          // progression and disagrees with the on-screen estimate.
          const isNonLift = q.kind && q.kind !== 'lift';
          const baseXP = isNonLift ? q.xpReward : getXPReward(q.difficulty);
          const halfXP = isNonLift
            ? Math.floor(q.xpReward / 2)
            : getXPReward(q.difficulty, true);

          let xpEarned = 0;
          if (status === 'skipped') {
            xpEarned = 0;
          } else if (loggedSets && loggedSets.length > 0) {
            // Performance-based: XP scales with actual reps/time completed
            xpEarned = calculatePerformanceXP(
              loggedSets,
              q.sets,
              q.reps,
              baseXP,
              q.holdSeconds,
            );
          } else if (status === 'complete') {
            xpEarned = baseXP;
          } else if (status === 'half_complete') {
            xpEarned = halfXP;
          }

          return {
            ...q,
            status,
            xpEarned,
            ...(loggedSets ? { loggedSets } : {}),
          };
        });
        set({ activeSession: { ...session, quests } });
        const next = get().activeSession?.quests.find(q => q.status === 'pending');
        if (next) {
          WidgetBridge?.updateWidget(next.exerciseName, `Set 1 of ${next.sets} · ${next.reps} reps`);
        }
      },

      finalizeSession: () => {
        const session = get().activeSession;
        if (!session) return null;
        const totalXPEarned = session.quests.reduce((s, q) => s + q.xpEarned, 0);
        const finalized: DungeonSession = {
          ...session,
          status: 'completed',
          totalXPEarned,
          completedAt: new Date().toISOString(),
        };
        set({ activeSession: null });
        WidgetBridge?.clearWidget();
        return finalized;
      },

      clearSession: () => {
        set({ activeSession: null, isLoading: false, error: null, pendingSetReps: null });
        WidgetBridge?.clearWidget();
      },

      setPendingSetReps: (v) => set({ pendingSetReps: v }),
      clearPendingSetReps: () => set({ pendingSetReps: null }),

      swapQuestExercise: (questId, newExerciseId, profile) => {
        const session = get().activeSession;
        if (!session) return;
        const newEx = EXERCISE_MAP[newExerciseId];
        if (!newEx) return;

        const newTargetMuscles: MuscleGroup[] = [
          newEx.primaryMuscle,
          ...newEx.secondaryMuscles,
        ];
        const newWeight = getSuggestedWeight(
          newEx.name,
          newTargetMuscles,
          profile.bodyWeight ?? 70,
          profile.muscleStrengths,
          profile.equipment,
          profile.goal,
        );

        const quests = session.quests.map((q): Quest => {
          if (q.id !== questId) return q;
          return {
            ...q,
            exerciseId: newEx.id,
            exerciseName: newEx.name,
            targetMuscles: newTargetMuscles,
            suggestedWeight: newWeight,
            // Carry over holdSeconds only if the new exercise is also static
            holdSeconds: newEx.isStatic ? (newEx.defaultHoldSeconds ?? q.holdSeconds) : undefined,
            swappedFromId: q.swappedFromId ?? q.exerciseId,
          };
        });
        set({ activeSession: { ...session, quests } });
      },
    }),
    {
      name: 'dungeon-session',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Only persist the active session — transient flags always reset
      partialize: (state) => ({ activeSession: state.activeSession }),
      // v4.2.0 Theme A — pre-v4.1.0 sessions stored mid-upgrade have no
      // `kind` on their quests. Backfill 'lift' so the dungeon-room grouping
      // doesn't drop them and the routing branch in WorkoutTimer falls
      // through to the lift UI as it always has.
      onRehydrateStorage: () => (state) => {
        if (!state?.activeSession) return;
        let mutated = false;
        const quests = state.activeSession.quests.map((q) => {
          if (q.kind === undefined) {
            mutated = true;
            return { ...q, kind: 'lift' as const };
          }
          return q;
        });
        if (mutated) {
          state.activeSession = { ...state.activeSession, quests };
        }
      },
    },
  ),
);
