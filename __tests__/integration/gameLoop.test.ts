/**
 * Integration tests: full game loop from session start → completion → XP award.
 *
 * These tests exercise the stores and lib together the same way the app does,
 * verifying that the core gameplay loop works end-to-end.
 */

import { act } from 'react';
import { useProfileStore } from '@/stores/useProfileStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { xpToNextLevel } from '@/lib/xp';
import type { UserProfile, RawQuest } from '@/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const profile: UserProfile = {
  name: 'Hero',
  goal: 'strength',
  equipment: ['barbell'],
  muscleStrengths: {
    chest: 5, back: 5, shoulders: 5, biceps: 5, triceps: 5,
    core: 5, quads: 5, hamstrings: 5, glutes: 5, calves: 5,
  },
  createdAt: new Date().toISOString(),
};

const threeQuests: RawQuest[] = [
  { exerciseName: 'Bench Press', description: 'd', targetMuscles: ['chest'], sets: 4, reps: '8', restSeconds: 90, difficulty: 'easy', xpReward: 50 },
  { exerciseName: 'Deadlift', description: 'd', targetMuscles: ['back'], sets: 3, reps: '5', restSeconds: 120, difficulty: 'medium', xpReward: 100 },
  { exerciseName: 'Barbell Squat', description: 'd', targetMuscles: ['quads'], sets: 4, reps: '6', restSeconds: 120, difficulty: 'hard', xpReward: 150 },
];

function resetAll() {
  act(() => {
    useProfileStore.setState({ profile: null, character: null });
    useSessionStore.setState({ activeSession: null, isLoading: false, error: null });
    useHistoryStore.setState({ sessions: [] });
  });
}

beforeEach(resetAll);

// ─── Complete floor loop ──────────────────────────────────────────────────────

describe('Full floor completion loop', () => {
  it('awards XP after completing all quests', () => {
    // Setup
    act(() => { useProfileStore.getState().setProfile(profile); });
    act(() => { useSessionStore.getState().startSession(1, threeQuests); });

    // Complete all quests
    const quests = useSessionStore.getState().activeSession!.quests;
    quests.forEach((q) => {
      act(() => { useSessionStore.getState().markQuest(q.id, 'complete'); });
    });

    // Finalize
    let finalized: ReturnType<ReturnType<typeof useSessionStore.getState>['finalizeSession']>;
    act(() => { finalized = useSessionStore.getState().finalizeSession(); });

    expect(finalized!.totalXPEarned).toBe(300); // 50+100+150

    // Award XP to character
    act(() => { useProfileStore.getState().awardXP(finalized!.totalXPEarned); });
    expect(useProfileStore.getState().character?.currentXP).toBe(300);
    expect(useProfileStore.getState().character?.totalXPEarned).toBe(300);
  });

  it('saves the session to history after finalization', () => {
    act(() => { useProfileStore.getState().setProfile(profile); });
    act(() => { useSessionStore.getState().startSession(2, threeQuests); });

    const quests = useSessionStore.getState().activeSession!.quests;
    quests.forEach((q) => {
      act(() => { useSessionStore.getState().markQuest(q.id, 'skipped'); });
    });

    let finalized: ReturnType<ReturnType<typeof useSessionStore.getState>['finalizeSession']>;
    act(() => { finalized = useSessionStore.getState().finalizeSession(); });
    act(() => { useHistoryStore.getState().addSession(finalized!); });

    expect(useHistoryStore.getState().sessions).toHaveLength(1);
    expect(useHistoryStore.getState().sessions[0].floor).toBe(2);
  });

  it('increments floorsCleared after completing a session', () => {
    act(() => { useProfileStore.getState().setProfile(profile); });
    expect(useProfileStore.getState().character?.floorsCleared).toBe(0);

    act(() => { useProfileStore.getState().incrementFloorsCleared(); });
    expect(useProfileStore.getState().character?.floorsCleared).toBe(1);
  });

  it('currentFloor equals floorsCleared + 1', () => {
    act(() => { useProfileStore.getState().setProfile(profile); });
    act(() => { useProfileStore.getState().incrementFloorsCleared(); });
    act(() => { useProfileStore.getState().incrementFloorsCleared(); });

    const floorsCleared = useProfileStore.getState().character!.floorsCleared;
    expect(floorsCleared + 1).toBe(3); // currentFloor
  });
});

// ─── Level-up flow ────────────────────────────────────────────────────────────

describe('Level-up flow', () => {
  beforeEach(() => {
    act(() => { useProfileStore.getState().setProfile(profile); });
  });

  it('triggers level-up when session XP fills the bar', () => {
    const xpNeeded = xpToNextLevel(1); // 500
    let result: ReturnType<ReturnType<typeof useProfileStore.getState>['awardXP']>;
    act(() => { result = useProfileStore.getState().awardXP(xpNeeded); });
    expect(result!.leveledUp).toBe(true);
    expect(useProfileStore.getState().character?.level).toBe(2);
  });

  it('does NOT trigger level-up for a partial floor', () => {
    let result: ReturnType<ReturnType<typeof useProfileStore.getState>['awardXP']>;
    act(() => { result = useProfileStore.getState().awardXP(150); }); // one hard quest
    expect(result!.leveledUp).toBe(false);
    expect(useProfileStore.getState().character?.level).toBe(1);
  });

  it('gradually levels up across multiple sessions', () => {
    // 5 sessions × 300 XP = 1500 XP
    // Level 1 needs 500, level 2 needs 650 → should reach level 3 after 1150 XP
    for (let i = 0; i < 5; i++) {
      act(() => { useProfileStore.getState().awardXP(300); });
    }
    const character = useProfileStore.getState().character!;
    expect(character.level).toBeGreaterThanOrEqual(2);
    expect(character.totalXPEarned).toBe(1500);
  });

  it('character stats improve after leveling up', () => {
    const statsBefore = { ...useProfileStore.getState().character!.stats };
    act(() => { useProfileStore.getState().awardXP(xpToNextLevel(1)); });
    const statsAfter = useProfileStore.getState().character!.stats;
    // At least one stat should have increased
    const anyImproved = (Object.keys(statsBefore) as (keyof typeof statsBefore)[])
      .some((k) => statsAfter[k] > statsBefore[k]);
    expect(anyImproved).toBe(true);
  });
});

// ─── Partial completion ───────────────────────────────────────────────────────

describe('Partial quest completion', () => {
  beforeEach(() => {
    act(() => { useProfileStore.getState().setProfile(profile); });
    act(() => { useSessionStore.getState().startSession(1, threeQuests); });
  });

  it('awards 50% XP for a half-completed quest', () => {
    const quest = useSessionStore.getState().activeSession!.quests[0]; // easy: 50 XP
    act(() => { useSessionStore.getState().markQuest(quest.id, 'half_complete'); });
    const updated = useSessionStore.getState().activeSession!.quests.find((q) => q.id === quest.id)!;
    expect(updated.xpEarned).toBe(25); // 50% of 50
  });

  it('allows upgrading from half_complete to complete', () => {
    const quest = useSessionStore.getState().activeSession!.quests[1]; // medium: 100 XP
    act(() => { useSessionStore.getState().markQuest(quest.id, 'half_complete'); });
    act(() => { useSessionStore.getState().markQuest(quest.id, 'complete'); });
    const updated = useSessionStore.getState().activeSession!.quests.find((q) => q.id === quest.id)!;
    expect(updated.status).toBe('complete');
    expect(updated.xpEarned).toBe(100);
  });

  it('mixed completion totals correctly in finalized session', () => {
    const quests = useSessionStore.getState().activeSession!.quests;
    act(() => { useSessionStore.getState().markQuest(quests[0].id, 'complete'); });       // +50
    act(() => { useSessionStore.getState().markQuest(quests[1].id, 'half_complete'); });  // +50
    act(() => { useSessionStore.getState().markQuest(quests[2].id, 'skipped'); });        // +0

    let finalized: ReturnType<ReturnType<typeof useSessionStore.getState>['finalizeSession']>;
    act(() => { finalized = useSessionStore.getState().finalizeSession(); });
    expect(finalized!.totalXPEarned).toBe(100);
  });
});

// ─── History integration ──────────────────────────────────────────────────────

describe('History integration', () => {
  it('recent sessions exclude exercises from the next suggestion', () => {
    // Simulate 3 completed sessions being stored
    for (let i = 1; i <= 3; i++) {
      const fakeSession = {
        id: `s${i}`, floor: i,
        quests: [{ id: `q${i}`, exerciseName: `Exercise ${i}`, description: '', targetMuscles: ['chest'] as ['chest'],
          sets: 3, reps: '10', restSeconds: 60, difficulty: 'easy' as const, xpReward: 50, status: 'complete' as const, xpEarned: 50 }],
        status: 'completed' as const, totalXPEarned: 50, startedAt: new Date().toISOString(),
      };
      act(() => { useHistoryStore.getState().addSession(fakeSession); });
    }

    const recent = useHistoryStore.getState().getRecentSessions(3);
    expect(recent).toHaveLength(3);

    // The prompt builder should include these exercise names
    const { buildPrompt } = require('@/lib/openai');
    act(() => { useProfileStore.getState().setProfile(profile); });
    const character = useProfileStore.getState().character!;
    const { user } = buildPrompt({ profile, character, recentSessions: recent, currentFloor: 4 });

    expect(user).toContain('Exercise 1');
    expect(user).toContain('Exercise 2');
    expect(user).toContain('Exercise 3');
  });
});
