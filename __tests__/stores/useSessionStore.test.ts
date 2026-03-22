import { act } from 'react';
import { useSessionStore } from '@/stores/useSessionStore';
import { getXPReward } from '@/lib/xp';
import type { RawQuest } from '@/types';

const rawQuests: RawQuest[] = [
  { exerciseName: 'Push-ups', description: 'test', targetMuscles: ['chest'], sets: 3, reps: '10', restSeconds: 60, difficulty: 'easy', xpReward: 50 },
  { exerciseName: 'Squats', description: 'test', targetMuscles: ['quads'], sets: 3, reps: '12', restSeconds: 60, difficulty: 'medium', xpReward: 100 },
  { exerciseName: 'Pull-ups', description: 'test', targetMuscles: ['back'], sets: 3, reps: '8', restSeconds: 90, difficulty: 'hard', xpReward: 150 },
];

beforeEach(() => {
  act(() => { useSessionStore.setState({ activeSession: null, isLoading: false, error: null }); });
});

// ─── startSession ─────────────────────────────────────────────────────────────

describe('useSessionStore.startSession', () => {
  it('creates an active session with the given floor', () => {
    act(() => { useSessionStore.getState().startSession(3, rawQuests); });
    const session = useSessionStore.getState().activeSession;
    expect(session).not.toBeNull();
    expect(session!.floor).toBe(3);
    expect(session!.status).toBe('active');
  });

  it('assigns all quests with pending status', () => {
    act(() => { useSessionStore.getState().startSession(1, rawQuests); });
    const session = useSessionStore.getState().activeSession!;
    expect(session.quests).toHaveLength(3);
    session.quests.forEach((q) => expect(q.status).toBe('pending'));
  });

  it('assigns unique ids to quests', () => {
    act(() => { useSessionStore.getState().startSession(1, rawQuests); });
    const ids = useSessionStore.getState().activeSession!.quests.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('initialises xpEarned to 0 for all quests', () => {
    act(() => { useSessionStore.getState().startSession(1, rawQuests); });
    useSessionStore.getState().activeSession!.quests.forEach((q) => {
      expect(q.xpEarned).toBe(0);
    });
  });

  it('sets totalXPEarned to 0', () => {
    act(() => { useSessionStore.getState().startSession(1, rawQuests); });
    expect(useSessionStore.getState().activeSession!.totalXPEarned).toBe(0);
  });
});

// ─── markQuest ────────────────────────────────────────────────────────────────

describe('useSessionStore.markQuest', () => {
  let questId: string;

  beforeEach(() => {
    act(() => { useSessionStore.getState().startSession(1, rawQuests); });
    questId = useSessionStore.getState().activeSession!.quests[0].id;
  });

  it('marks a quest as complete', () => {
    act(() => { useSessionStore.getState().markQuest(questId, 'complete'); });
    const quest = useSessionStore.getState().activeSession!.quests.find((q) => q.id === questId)!;
    expect(quest.status).toBe('complete');
  });

  it('awards full XP on complete', () => {
    act(() => { useSessionStore.getState().markQuest(questId, 'complete'); });
    const quest = useSessionStore.getState().activeSession!.quests.find((q) => q.id === questId)!;
    expect(quest.xpEarned).toBe(getXPReward('easy'));
  });

  it('marks a quest as half_complete and awards half XP', () => {
    act(() => { useSessionStore.getState().markQuest(questId, 'half_complete'); });
    const quest = useSessionStore.getState().activeSession!.quests.find((q) => q.id === questId)!;
    expect(quest.status).toBe('half_complete');
    expect(quest.xpEarned).toBe(getXPReward('easy', true));
  });

  it('marks a quest as skipped with 0 XP', () => {
    act(() => { useSessionStore.getState().markQuest(questId, 'skipped'); });
    const quest = useSessionStore.getState().activeSession!.quests.find((q) => q.id === questId)!;
    expect(quest.status).toBe('skipped');
    expect(quest.xpEarned).toBe(0);
  });

  it('does not change other quests', () => {
    act(() => { useSessionStore.getState().markQuest(questId, 'complete'); });
    const others = useSessionStore.getState().activeSession!.quests.filter((q) => q.id !== questId);
    others.forEach((q) => expect(q.status).toBe('pending'));
  });

  it('does nothing when no session is active', () => {
    act(() => { useSessionStore.setState({ activeSession: null }); });
    expect(() => {
      act(() => { useSessionStore.getState().markQuest('fake-id', 'complete'); });
    }).not.toThrow();
  });
});

// ─── finalizeSession ─────────────────────────────────────────────────────────

describe('useSessionStore.finalizeSession', () => {
  beforeEach(() => {
    act(() => { useSessionStore.getState().startSession(1, rawQuests); });
  });

  it('returns null when no session is active', () => {
    act(() => { useSessionStore.setState({ activeSession: null }); });
    let result: ReturnType<ReturnType<typeof useSessionStore.getState>['finalizeSession']>;
    act(() => { result = useSessionStore.getState().finalizeSession(); });
    expect(result!).toBeNull();
  });

  it('clears the active session after finalizing', () => {
    act(() => { useSessionStore.getState().finalizeSession(); });
    expect(useSessionStore.getState().activeSession).toBeNull();
  });

  it('sets status to completed', () => {
    let finalized: ReturnType<ReturnType<typeof useSessionStore.getState>['finalizeSession']>;
    act(() => { finalized = useSessionStore.getState().finalizeSession(); });
    expect(finalized!.status).toBe('completed');
  });

  it('calculates totalXPEarned from all completed quests', () => {
    const session = useSessionStore.getState().activeSession!;
    const q0 = session.quests[0].id;
    const q1 = session.quests[1].id;
    const q2 = session.quests[2].id;
    act(() => { useSessionStore.getState().markQuest(q0, 'complete'); });       // +50
    act(() => { useSessionStore.getState().markQuest(q1, 'half_complete'); });  // +50
    act(() => { useSessionStore.getState().markQuest(q2, 'skipped'); });        // +0
    let finalized: ReturnType<ReturnType<typeof useSessionStore.getState>['finalizeSession']>;
    act(() => { finalized = useSessionStore.getState().finalizeSession(); });
    expect(finalized!.totalXPEarned).toBe(100); // 50 + 50 + 0
  });

  it('returns 0 XP when all quests are skipped', () => {
    const session = useSessionStore.getState().activeSession!;
    session.quests.forEach((q) => {
      act(() => { useSessionStore.getState().markQuest(q.id, 'skipped'); });
    });
    let finalized: ReturnType<ReturnType<typeof useSessionStore.getState>['finalizeSession']>;
    act(() => { finalized = useSessionStore.getState().finalizeSession(); });
    expect(finalized!.totalXPEarned).toBe(0);
  });

  it('returns max XP when all quests are fully completed', () => {
    const session = useSessionStore.getState().activeSession!;
    session.quests.forEach((q) => {
      act(() => { useSessionStore.getState().markQuest(q.id, 'complete'); });
    });
    let finalized: ReturnType<ReturnType<typeof useSessionStore.getState>['finalizeSession']>;
    act(() => { finalized = useSessionStore.getState().finalizeSession(); });
    expect(finalized!.totalXPEarned).toBe(50 + 100 + 150); // 300
  });

  it('sets completedAt timestamp', () => {
    let finalized: ReturnType<ReturnType<typeof useSessionStore.getState>['finalizeSession']>;
    act(() => { finalized = useSessionStore.getState().finalizeSession(); });
    expect(finalized!.completedAt).toBeDefined();
    expect(new Date(finalized!.completedAt!).getTime()).not.toBeNaN();
  });
});

// ─── clearSession ─────────────────────────────────────────────────────────────

describe('useSessionStore.clearSession', () => {
  it('clears active session, loading, and error', () => {
    act(() => {
      useSessionStore.setState({ isLoading: true, error: 'oops' });
      useSessionStore.getState().startSession(1, rawQuests);
    });
    act(() => { useSessionStore.getState().clearSession(); });
    const state = useSessionStore.getState();
    expect(state.activeSession).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });
});
