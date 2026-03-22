import { act } from 'react';
import { useProfileStore } from '@/stores/useProfileStore';
import { xpToNextLevel } from '@/lib/xp';
import type { UserProfile } from '@/types';

// Reset store before every test so tests don't bleed into each other
beforeEach(() => {
  act(() => {
    useProfileStore.setState({ profile: null, character: null });
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

  it('creates a Warrior character for strength goal', () => {
    act(() => { useProfileStore.getState().setProfile(sampleProfile); });
    expect(useProfileStore.getState().character?.class).toBe('Warrior');
  });

  it('creates a Rogue character for calisthenics goal', () => {
    act(() => {
      useProfileStore.getState().setProfile({ ...sampleProfile, goal: 'calisthenics' });
    });
    expect(useProfileStore.getState().character?.class).toBe('Rogue');
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

  it('boosts primary stat on level-up (Warrior gets +1 strength)', () => {
    const charBefore = useProfileStore.getState().character!;
    act(() => { useProfileStore.getState().awardXP(xpToNextLevel(1)); });
    const charAfter = useProfileStore.getState().character!;
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

// ─── resetProfile ────────────────────────────────────────────────────────────

describe('useProfileStore.resetProfile', () => {
  it('clears both profile and character', () => {
    act(() => { useProfileStore.getState().setProfile(sampleProfile); });
    act(() => { useProfileStore.getState().resetProfile(); });
    expect(useProfileStore.getState().profile).toBeNull();
    expect(useProfileStore.getState().character).toBeNull();
  });
});
