import { act } from 'react';
import { useProfileStore } from '@/stores/useProfileStore';
import { xpToNextLevel } from '@/lib/xp';
import { DEFAULT_MUSCLE_XP } from '@/lib/muscleXP';
import type { UserProfile } from '@/types';

// Reset store before every test so tests don't bleed into each other
beforeEach(() => {
  act(() => {
    useProfileStore.setState({ profile: null, character: null, muscleXP: DEFAULT_MUSCLE_XP });
  });
});

const sampleProfile: UserProfile = {
  name: 'Rishi',
  goal: 'strength',
  equipment: ['barbell', 'dumbbells'],
  muscleStrengths: {
    chest: 5, back: 5, shoulders: 5, biceps: 5, triceps: 5,
    core: 5, quads: 5, hamstrings: 5, glutes: 5, calves: 5,
  },
  createdAt: new Date().toISOString(),
};

// ─── setProfile ───────────────────────────────────────────────────────────────

describe('useProfileStore.setProfile', () => {
  it('stores the profile', () => {
    act(() => { useProfileStore.getState().setProfile(sampleProfile); });
    expect(useProfileStore.getState().profile).toEqual(sampleProfile);
  });

  it('always creates a Wanderer character regardless of goal (class is derived from muscle XP)', () => {
    act(() => { useProfileStore.getState().setProfile(sampleProfile); });
    expect(useProfileStore.getState().character?.class).toBe('Wanderer');
  });

  it('creates Wanderer for calisthenics goal too (class is not goal-based)', () => {
    act(() => {
      useProfileStore.getState().setProfile({ ...sampleProfile, goal: 'calisthenics' });
    });
    expect(useProfileStore.getState().character?.class).toBe('Wanderer');
  });

  it('initialises character at level 1', () => {
    act(() => { useProfileStore.getState().setProfile(sampleProfile); });
    expect(useProfileStore.getState().character?.level).toBe(1);
  });

  it('does not overwrite an existing character when called again', () => {
    act(() => { useProfileStore.getState().setProfile(sampleProfile); });
    // Gain some XP first
    act(() => { useProfileStore.getState().awardXP(200); });
    const xpBefore = useProfileStore.getState().character?.currentXP;
    // Calling setProfile again should keep the same character
    act(() => { useProfileStore.getState().setProfile(sampleProfile); });
    expect(useProfileStore.getState().character?.currentXP).toBe(xpBefore);
  });
});

// ─── awardXP ─────────────────────────────────────────────────────────────────

describe('useProfileStore.awardXP', () => {
  beforeEach(() => {
    act(() => { useProfileStore.getState().setProfile(sampleProfile); });
  });

  it('increases currentXP', () => {
    act(() => { useProfileStore.getState().awardXP(100); });
    expect(useProfileStore.getState().character?.currentXP).toBe(100);
  });

  it('returns leveledUp=false when not enough XP', () => {
    let result: ReturnType<ReturnType<typeof useProfileStore.getState>['awardXP']>;
    act(() => { result = useProfileStore.getState().awardXP(100); });
    expect(result!.leveledUp).toBe(false);
  });

  it('triggers a level-up when XP threshold is met', () => {
    let result: ReturnType<ReturnType<typeof useProfileStore.getState>['awardXP']>;
    act(() => { result = useProfileStore.getState().awardXP(xpToNextLevel(1)); });
    expect(result!.leveledUp).toBe(true);
    expect(useProfileStore.getState().character?.level).toBe(2);
  });

  it('accumulates XP across multiple calls', () => {
    act(() => { useProfileStore.getState().awardXP(200); });
    act(() => { useProfileStore.getState().awardXP(150); });
    expect(useProfileStore.getState().character?.currentXP).toBe(350);
  });

  it('updates totalXPEarned on each award', () => {
    act(() => { useProfileStore.getState().awardXP(300); });
    act(() => { useProfileStore.getState().awardXP(200); });
    expect(useProfileStore.getState().character?.totalXPEarned).toBe(500);
  });

  it('returns { leveledUp: false } when no character exists', () => {
    act(() => { useProfileStore.setState({ character: null }); });
    let result: ReturnType<ReturnType<typeof useProfileStore.getState>['awardXP']>;
    act(() => { result = useProfileStore.getState().awardXP(100); });
    expect(result!.leveledUp).toBe(false);
  });

  it('boosts primary stat on level-up (Wanderer gets +1 vitality, +0.5 to all others)', () => {
    const charBefore = useProfileStore.getState().character!;
    act(() => { useProfileStore.getState().awardXP(xpToNextLevel(1)); });
    const charAfter = useProfileStore.getState().character!;
    // Wanderer primaryStat = vitality (+1), others get +0.5
    expect(charAfter.stats.vitality).toBeGreaterThan(charBefore.stats.vitality);
    expect(charAfter.stats.strength).toBeGreaterThan(charBefore.stats.strength);
  });
});

// ─── updateMuscleStrength ────────────────────────────────────────────────────

describe('useProfileStore.updateMuscleStrength', () => {
  beforeEach(() => {
    act(() => { useProfileStore.getState().setProfile(sampleProfile); });
  });

  it('updates the given muscle strength', () => {
    act(() => { useProfileStore.getState().updateMuscleStrength('chest', 8); });
    expect(useProfileStore.getState().profile?.muscleStrengths.chest).toBe(8);
  });

  it('does not affect other muscle groups', () => {
    act(() => { useProfileStore.getState().updateMuscleStrength('chest', 9); });
    expect(useProfileStore.getState().profile?.muscleStrengths.back).toBe(5);
  });

  it('does nothing when profile is null', () => {
    act(() => { useProfileStore.setState({ profile: null }); });
    expect(() => {
      act(() => { useProfileStore.getState().updateMuscleStrength('chest', 9); });
    }).not.toThrow();
  });
});

// ─── incrementFloorsCleared ──────────────────────────────────────────────────

describe('useProfileStore.incrementFloorsCleared', () => {
  beforeEach(() => {
    act(() => { useProfileStore.getState().setProfile(sampleProfile); });
  });

  it('starts at 0', () => {
    expect(useProfileStore.getState().character?.floorsCleared).toBe(0);
  });

  it('increments by 1 each call', () => {
    act(() => { useProfileStore.getState().incrementFloorsCleared(); });
    expect(useProfileStore.getState().character?.floorsCleared).toBe(1);
    act(() => { useProfileStore.getState().incrementFloorsCleared(); });
    expect(useProfileStore.getState().character?.floorsCleared).toBe(2);
  });
});

// ─── awardMuscleXP ───────────────────────────────────────────────────────────

describe('useProfileStore.awardMuscleXP', () => {
  beforeEach(() => {
    act(() => { useProfileStore.getState().setProfile(sampleProfile); });
  });

  it('increases XP for targeted primary muscles', () => {
    const before = useProfileStore.getState().muscleXP.chest.xp;
    act(() => { useProfileStore.getState().awardMuscleXP(['chest'], [], 'medium', 'complete'); });
    expect(useProfileStore.getState().muscleXP.chest.xp).toBeGreaterThan(before);
  });

  it('awards less XP to secondary muscles than primary', () => {
    act(() => { useProfileStore.getState().awardMuscleXP(['chest'], ['triceps'], 'hard', 'complete'); });
    const muscleXP = useProfileStore.getState().muscleXP;
    expect(muscleXP.chest.xp).toBeGreaterThan(muscleXP.triceps.xp);
  });

  it('awards 50% XP for half_complete', () => {
    act(() => { useProfileStore.getState().awardMuscleXP(['back'], [], 'medium', 'complete'); });
    const fullXP = useProfileStore.getState().muscleXP.back.xp;

    // Reset and do half
    act(() => { useProfileStore.getState().resetProfile(); });
    act(() => { useProfileStore.getState().setProfile(sampleProfile); });
    act(() => { useProfileStore.getState().awardMuscleXP(['back'], [], 'medium', 'half_complete'); });
    const halfXP = useProfileStore.getState().muscleXP.back.xp;

    expect(halfXP).toBe(Math.floor(fullXP / 2));
  });

  it('does not award XP to muscles not listed', () => {
    const quads_before = useProfileStore.getState().muscleXP.quads.xp;
    act(() => { useProfileStore.getState().awardMuscleXP(['chest'], ['triceps'], 'easy', 'complete'); });
    expect(useProfileStore.getState().muscleXP.quads.xp).toBe(quads_before);
  });

  it('does not double-award secondary muscle if it is also listed as primary', () => {
    // chest is in both primary and secondary — calculateMuscleXP excludes it from secondary
    // chest should only receive primary XP, triceps gets secondary XP
    act(() => { useProfileStore.getState().awardMuscleXP(['chest'], ['chest', 'triceps'], 'easy', 'complete'); });
    // Easy primary = 30 XP for chest; easy secondary = 10 XP for triceps
    expect(useProfileStore.getState().muscleXP.chest.xp).toBe(30);
    expect(useProfileStore.getState().muscleXP.triceps.xp).toBe(10);
  });

  it('returns levelUps array (empty if no level-up occurred)', () => {
    let result: ReturnType<ReturnType<typeof useProfileStore.getState>['awardMuscleXP']>;
    act(() => { result = useProfileStore.getState().awardMuscleXP(['shoulders'], [], 'easy', 'complete'); });
    expect(Array.isArray(result!.levelUps)).toBe(true);
  });

  it('re-derives character class after muscle XP shifts zone balance', () => {
    // Give chest/shoulders/triceps (push zone) a large XP boost so they all level up
    // enough to make push >> other zones → should become Mirror Knight
    act(() => {
      for (let i = 0; i < 30; i++) {
        useProfileStore.getState().awardMuscleXP(['chest', 'shoulders', 'triceps'], [], 'boss', 'complete');
      }
    });
    const cls = useProfileStore.getState().character?.class;
    // Push zone will dominate, so class should no longer be Wanderer
    expect(cls).not.toBe('Wanderer');
  });

  // Negative: no-op when no character
  it('handles gracefully when no character exists', () => {
    act(() => { useProfileStore.setState({ character: null }); });
    expect(() => {
      act(() => {
        useProfileStore.getState().awardMuscleXP(['chest'], [], 'easy', 'complete');
      });
    }).not.toThrow();
  });
});

// ─── resetProfile ────────────────────────────────────────────────────────────

describe('useProfileStore.resetProfile', () => {
  it('clears both profile and character', () => {
    act(() => { useProfileStore.getState().setProfile(sampleProfile); });
    act(() => { useProfileStore.getState().resetProfile(); });
    expect(useProfileStore.getState().profile).toBeNull();
    expect(useProfileStore.getState().character).toBeNull();
  });

  it('resets muscleXP back to defaults', () => {
    act(() => { useProfileStore.getState().setProfile(sampleProfile); });
    act(() => { useProfileStore.getState().awardMuscleXP(['chest'], [], 'hard', 'complete'); });
    act(() => { useProfileStore.getState().resetProfile(); });
    expect(useProfileStore.getState().muscleXP).toEqual(DEFAULT_MUSCLE_XP);
  });
});
