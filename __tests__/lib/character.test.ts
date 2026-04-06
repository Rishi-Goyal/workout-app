import {
  titleForLevel,
  createCharacter,
  applyLevelUpStats,
  maxStatValue,
} from '@/lib/character';
import { xpToNextLevel } from '@/lib/xp';
import type { Character } from '@/types';

// ─── titleForLevel ────────────────────────────────────────────────────────────

describe('titleForLevel', () => {
  const cases: [number, string][] = [
    [1,   'Initiate'],
    [2,   'Initiate'],
    [3,   'Initiate'],
    [4,   'Seeker'],
    [7,   'Seeker'],
    [8,   'Veteran'],
    [12,  'Veteran'],
    [13,  'Stone Warden'],
    [25,  'Shadow Blade'],
    [26,  'Dungeon Slayer'],
    [51,  'Eternal Conqueror'],
    [100, 'Eternal Conqueror'],
  ];

  test.each(cases)('level %i → "%s"', (level, expected) => {
    expect(titleForLevel(level)).toBe(expected);
  });

  it('never returns an empty string', () => {
    for (let level = 1; level <= 100; level++) {
      expect(titleForLevel(level).length).toBeGreaterThan(0);
    }
  });
});

// ─── createCharacter ─────────────────────────────────────────────────────────

describe('createCharacter', () => {
  it('starts at level 1 with 0 XP', () => {
    const c = createCharacter('strength');
    expect(c.level).toBe(1);
    expect(c.currentXP).toBe(0);
    expect(c.totalXPEarned).toBe(0);
  });

  it('sets xpToNextLevel correctly for level 1', () => {
    const c = createCharacter('strength');
    expect(c.xpToNextLevel).toBe(xpToNextLevel(1));
  });

  it('always starts as Wanderer regardless of goal (class is derived from muscle XP later)', () => {
    expect(createCharacter('strength').class).toBe('Wanderer');
    expect(createCharacter('endurance').class).toBe('Wanderer');
    expect(createCharacter('calisthenics').class).toBe('Wanderer');
    expect(createCharacter('balanced').class).toBe('Wanderer');
    expect(createCharacter('weight_loss').class).toBe('Wanderer');
  });

  it('starts with base stats of 5 in all attributes', () => {
    const c = createCharacter('strength');
    expect(c.stats.strength).toBe(5);
    expect(c.stats.endurance).toBe(5);
    expect(c.stats.agility).toBe(5);
    expect(c.stats.vitality).toBe(5);
  });

  it('starts with 0 floorsCleared', () => {
    expect(createCharacter('balanced').floorsCleared).toBe(0);
  });

  it('has a non-empty title', () => {
    expect(createCharacter('strength').title.length).toBeGreaterThan(0);
  });
});

// ─── applyLevelUpStats ────────────────────────────────────────────────────────

describe('applyLevelUpStats', () => {
  function makeCharAtLevel(level: number, characterClass: Character['class']): Character {
    return {
      class: characterClass,
      level,
      currentXP: 0,
      xpToNextLevel: xpToNextLevel(level),
      totalXPEarned: 0,
      stats: { strength: 5, endurance: 5, agility: 5, vitality: 5 },
      title: 'Initiate',
      floorsCleared: 0,
    };
  }

  it('Mirror Knight gains +1 to strength, +0.5 to others on 1 level-up', () => {
    const c = makeCharAtLevel(2, 'Mirror Knight');
    const updated = applyLevelUpStats(c, 1);
    expect(updated.stats.strength).toBe(6);
    expect(updated.stats.endurance).toBe(5.5);
    expect(updated.stats.agility).toBe(5.5);
    expect(updated.stats.vitality).toBe(5.5);
  });

  it('Berserker gains +1 to endurance, +0.5 to others', () => {
    const c = makeCharAtLevel(2, 'Berserker');
    const updated = applyLevelUpStats(c, 1);
    expect(updated.stats.endurance).toBe(6);
    expect(updated.stats.strength).toBe(5.5);
  });

  it('Iron Monk gains +1 to agility, +0.5 to others', () => {
    const c = makeCharAtLevel(2, 'Iron Monk');
    const updated = applyLevelUpStats(c, 1);
    expect(updated.stats.agility).toBe(6);
    expect(updated.stats.strength).toBe(5.5);
  });

  it('Wanderer gains +1 to vitality, +0.5 to others', () => {
    const c = makeCharAtLevel(2, 'Wanderer');
    const updated = applyLevelUpStats(c, 1);
    expect(updated.stats.vitality).toBe(6);
    expect(updated.stats.strength).toBe(5.5);
  });

  it('scales gains for multiple levels gained at once', () => {
    const c = makeCharAtLevel(3, 'Mirror Knight');
    const updated = applyLevelUpStats(c, 3);
    expect(updated.stats.strength).toBe(8); // 5 + 3*1
    expect(updated.stats.endurance).toBe(6.5); // 5 + 3*0.5
  });

  it('does not mutate the original character', () => {
    const c = makeCharAtLevel(2, 'Wanderer');
    const original = { ...c.stats };
    applyLevelUpStats(c, 1);
    expect(c.stats.strength).toBe(original.strength);
  });

  it('updates the title after leveling up', () => {
    const c = makeCharAtLevel(4, 'Wanderer'); // level 4 → 'Seeker'
    const updated = applyLevelUpStats(c, 1);
    expect(updated.title).toBe('Seeker');
  });
});

// ─── maxStatValue ─────────────────────────────────────────────────────────────

describe('maxStatValue', () => {
  it('is 6.5 at level 1', () => {
    expect(maxStatValue(1)).toBe(6.5);
  });

  it('increases by 1.5 per level', () => {
    expect(maxStatValue(2)).toBe(8);
    expect(maxStatValue(3)).toBe(9.5);
  });

  it('is always greater than the base stat of 5', () => {
    for (let level = 1; level <= 50; level++) {
      expect(maxStatValue(level)).toBeGreaterThan(5);
    }
  });
});
