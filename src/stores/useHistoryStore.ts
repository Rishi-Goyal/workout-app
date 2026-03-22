import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DungeonSession } from '../types';

interface HistoryStore {
  sessions: DungeonSession[];
  addSession: (session: DungeonSession) => void;
  getRecentSessions: (count: number) => DungeonSession[];
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
      getRecentSessions: (count) => get().sessions.slice(0, count),
      clearHistory: () => set({ sessions: [] }),
    }),
    {
      name: 'dungeon-history',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
