import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DungeonSession } from '../types';

export interface ExerciseLastLog {
  weight: number | 'bodyweight';
  reps: number;
  sets: number;
  sessionDate: string;
}

interface HistoryStore {
  sessions: DungeonSession[];
  addSession: (session: DungeonSession) => void;
  getRecentSessions: (count: number) => DungeonSession[];
  /** Returns the most recent logged set data for an exercise, or null if never performed. */
  getLastExerciseLog: (exerciseName: string) => ExerciseLastLog | null;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
      getRecentSessions: (count) => get().sessions.slice(0, count),
      getLastExerciseLog: (exerciseName) => {
        for (const session of get().sessions) {
          for (const quest of session.quests) {
            if (
              quest.exerciseName === exerciseName &&
              quest.loggedSets &&
              quest.loggedSets.length > 0
            ) {
              const last = quest.loggedSets[quest.loggedSets.length - 1];
              return {
                weight: last.weight,
                reps: last.repsCompleted,
                sets: quest.loggedSets.length,
                sessionDate: session.startedAt,
              };
            }
          }
        }
        return null;
      },
      clearHistory: () => set({ sessions: [] }),
    }),
    {
      name: 'dungeon-history',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      /** Guard against a corrupted / missing sessions array after an update. */
      migrate: (persistedState: unknown, _version: number) => {
        const s = (persistedState ?? {}) as Record<string, unknown>;
        if (!Array.isArray(s.sessions)) s.sessions = [];
        return s as unknown as Partial<HistoryStore>;
      },
      /** Always start from current state so methods are present; overlay persisted data. */
      merge: (persistedState: unknown, currentState: HistoryStore): HistoryStore => {
        const s = (persistedState ?? {}) as Partial<HistoryStore>;
        return {
          ...currentState,
          sessions: Array.isArray(s.sessions) ? s.sessions : [],
        };
      },
      /** Only the sessions array needs to survive restarts. */
      partialize: (state: HistoryStore) => ({ sessions: state.sessions }),
    }
  )
);
