import { xpToNextLevel, getXPReward, applyXP, xpProgress } from '@/lib/xp';
import type { Character } from '@/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    class: 'Warrior',
    level: 1,
    currentXP: 0,
    xpToNextLevel: xpToNextLevel(1),
    totalXPEarned: 0,
    stats: { strength: 5, endurance: 5, agility: 5, vitality: 5 },
    title: 'Initiate',
    floorsCleared: 0,
    ...overrides,
  };
}

// ─── xpToNextLevel ───────────────────────────────────────────────────────────

describe('xpToNextLevel', () => {
  it('returns 500 XP for level 1', () => {
    expect(xpToNextLevel(1)).toBe(500);
  });

  it('increases by 150 for each subsequent level', () => {
    expect(xpToNextLevel(2)).toBe(650);
    expect(xpToNextLevel(3)).toBe(800);
    expect(xpToNextLevel(10)).toBe(500 + 9 * 150); // 1850
  });

  it('is always positive', () => {
    for (let level = 1; level <= 50; level++) {
      expect(xpToNextLevel(level)).toBeGreaterThan(0);
    }
  });

  it('is strictly increasing', () => {
    for (let level = 1; level < 50; level++) {
      expect(xpToNextLevel(level + 1)).toBeGreaterThan(xpToNextLevel(level));
    }
  });
});

// ─── getXPReward ─────────────────────────────────────────────────────────────

describe('getXPReward', () => {
  it('returns correct full rewards per difficulty', () => {
    expect(getXPReward('easy')).toBe(50);
    expect(getXPReward('medium')).toBe(100);
    expect(getXPReward('hard')).toBe(150);
    expect(getXPReward('boss')).toBe(300);
  });

  it('returns exactly half when half=true', () => {
    expect(getXPReward('easy', true)).toBe(25);
    expect(getXPReward('medium', true)).toBe(50);
    expect(getXPReward('hard', true)).toBe(75);
    expect(getXPReward('boss', true)).toBe(150);
  });

  it('half reward is always less than full reward', () => {
    (['easy', 'medium', 'hard', 'boss'] as const).forEach((d) => {
      expect(getXPReward(d, true)).toBeLessThan(getXPReward(d));
    });
  });
});

// ─── applyXP ─────────────────────────────────────────────────────────────────

describe('applyXP', () => {
  it('adds XP without leveling up when amount is small', () => {
    const character = makeCharacter();
    const { character: updated, leveledUp, levelsGained } = applyXP(character, 100);
    expect(updated.currentXP).toBe(100);
    expect(updated.level).toBe(1);
    expect(updated.totalXPEarned).toBe(100);
    expect(leveledUp).toBe(false);
    expect(levelsGained).toBe(0);
  });

  it('levels up exactly when XP hits the threshold', () => {
    const character = makeCharacter();
    const { character: updated, leveledUp, levelsGained } = applyXP(character, 500);
    expect(updated.level).toBe(2);
    expect(updated.currentXP).toBe(0);
    expect(updated.xpToNextLevel).toBe(xpToNextLevel(2));
    expect(leveledUp).toBe(true);
    expect(levelsGained).toBe(1);
  });

  it('carries overflow XP into the next level', () => {
    const character = makeCharacter();
    const { character: updated } = applyXP(character, 600); // 500 to level, 100 overflow
    expect(updated.level).toBe(2);
    expect(updated.currentXP).toBe(100);
  });

  it('handles multiple level-ups in one call', () => {
    const character = makeCharacter();
    // Level 1→2 needs 500, level 2→3 needs 650 → total 1150 + 1 overflow
    const { character: updated, levelsGained } = applyXP(character, 1151);
    expect(updated.level).toBe(3);
    expect(updated.currentXP).toBe(1);
    expect(levelsGained).toBe(2);
  });

  it('does not mutate the original character', () => {
    const character = makeCharacter({ currentXP: 0 });
    applyXP(character, 300);
    expect(character.currentXP).toBe(0);
  });

  it('accumulates totalXPEarned correctly', () => {
    const character = makeCharacter({ totalXPEarned: 200 });
    const { character: updated } = applyXP(character, 300);
    expect(updated.totalXPEarned).toBe(500);
  });

  it('applies zero XP with no change', () => {
    const character = makeCharacter({ currentXP: 100 });
    const { character: updated, leveledUp } = applyXP(character, 0);
    expect(updated.currentXP).toBe(100);
    expect(updated.level).toBe(1);
    expect(leveledUp).toBe(false);
  });
});

// ─── xpProgress ──────────────────────────────────────────────────────────────

describe('xpProgress', () => {
  it('returns 0 at the start of a level', () => {
    expect(xpProgress(makeCharacter({ currentXP: 0 }))).toBe(0);
  });

  it('returns 50 at the halfway point', () => {
    const xpNeeded = xpToNextLevel(1); // 500
    const character = makeCharacter({ currentXP: xpNeeded / 2 });
    expect(xpProgress(character)).toBe(50);
  });

  it('returns 100 when exactly at the threshold', () => {
    const xpNeeded = xpToNextLevel(1);
    const character = makeCharacter({ currentXP: xpNeeded });
    expect(xpProgress(character)).toBe(100);
  });

  it('never exceeds 100', () => {
    const character = makeCharacter({ currentXP: 99999 });
    expect(xpProgress(character)).toBeLessThanOrEqual(100);
  });

  it('returns an integer percentage', () => {
    const character = makeCharacter({ currentXP: 123 });
    const result = xpProgress(character);
    expect(Number.isInteger(result)).toBe(true);
  });
});
