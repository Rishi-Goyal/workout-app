import { act } from 'react';
import { useHistoryStore } from '@/stores/useHistoryStore';
import type { DungeonSession } from '@/types';

function makeSession(floor: number, status: DungeonSession['status'] = 'completed'): DungeonSession {
  return {
    id: `session-${floor}-${Date.now()}-${Math.random()}`,
    floor,
    quests: [],
    status,
    totalXPEarned: floor * 100,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  act(() => { useHistoryStore.setState({ sessions: [] }); });
});

// ─── addSession ───────────────────────────────────────────────────────────────

describe('useHistoryStore.addSession', () => {
  it('adds a session to the list', () => {
    act(() => { useHistoryStore.getState().addSession(makeSession(1)); });
    expect(useHistoryStore.getState().sessions).toHaveLength(1);
  });

  it('prepends so the most recent session is first', () => {
    act(() => { useHistoryStore.getState().addSession(makeSession(1)); });
    act(() => { useHistoryStore.getState().addSession(makeSession(2)); });
    expect(useHistoryStore.getState().sessions[0].floor).toBe(2);
    expect(useHistoryStore.getState().sessions[1].floor).toBe(1);
  });

  it('accumulates multiple sessions', () => {
    for (let i = 1; i <= 5; i++) {
      act(() => { useHistoryStore.getState().addSession(makeSession(i)); });
    }
    expect(useHistoryStore.getState().sessions).toHaveLength(5);
  });
});

// ─── getRecentSessions ────────────────────────────────────────────────────────

describe('useHistoryStore.getRecentSessions', () => {
  beforeEach(() => {
    // Add 5 sessions, most recent first after adds
    for (let i = 1; i <= 5; i++) {
      act(() => { useHistoryStore.getState().addSession(makeSession(i)); });
    }
  });

  it('returns up to the requested number of sessions', () => {
    expect(useHistoryStore.getState().getRecentSessions(3)).toHaveLength(3);
  });

  it('returns all sessions when count exceeds total', () => {
    expect(useHistoryStore.getState().getRecentSessions(10)).toHaveLength(5);
  });

  it('returns an empty array when there are no sessions', () => {
    act(() => { useHistoryStore.setState({ sessions: [] }); });
    expect(useHistoryStore.getState().getRecentSessions(3)).toHaveLength(0);
  });

  it('returns the most recent sessions first', () => {
    const recent = useHistoryStore.getState().getRecentSessions(2);
    // Floor 5 was added last → first in list
    expect(recent[0].floor).toBe(5);
    expect(recent[1].floor).toBe(4);
  });
});

// ─── clearHistory ─────────────────────────────────────────────────────────────

describe('useHistoryStore.clearHistory', () => {
  it('removes all sessions', () => {
    act(() => { useHistoryStore.getState().addSession(makeSession(1)); });
    act(() => { useHistoryStore.getState().addSession(makeSession(2)); });
    act(() => { useHistoryStore.getState().clearHistory(); });
    expect(useHistoryStore.getState().sessions).toHaveLength(0);
  });
});
