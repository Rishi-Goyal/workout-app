import { create } from 'zustand';
import type { DungeonSession, Quest, QuestStatus, RawQuest } from '../types';
import { getXPReward } from '../lib/xp';

interface SessionStore {
  activeSession: DungeonSession | null;
  isLoading: boolean;
  error: string | null;
  startSession: (floor: number, rawQuests: RawQuest[]) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  markQuest: (questId: string, status: QuestStatus) => void;
  finalizeSession: () => DungeonSession | null;
  clearSession: () => void;
}

function buildQuests(rawQuests: RawQuest[]): Quest[] {
  return rawQuests.map((rq, i) => ({
    ...rq,
    id: `quest-${Date.now()}-${i}`,
    status: 'pending' as QuestStatus,
    xpEarned: 0,
  }));
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
  activeSession: null,
  isLoading: false,
  error: null,

  startSession: (floor, rawQuests) =>
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
    }),

  setLoading: (v) => set({ isLoading: v }),
  setError: (e) => set({ error: e }),

  markQuest: (questId, status) => {
    const session = get().activeSession;
    if (!session) return;
    const quests = session.quests.map((q) => {
      if (q.id !== questId) return q;
      const xpEarned =
        status === 'complete'
          ? getXPReward(q.difficulty)
          : status === 'half_complete'
          ? getXPReward(q.difficulty, true)
          : 0;
      return { ...q, status, xpEarned };
    });
    set({ activeSession: { ...session, quests } });
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
    return finalized;
  },

  clearSession: () => set({ activeSession: null, isLoading: false, error: null }),
}));
