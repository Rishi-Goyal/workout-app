import {
  classFromGoal,
  titleForLevel,
  createCharacter,
  applyLevelUpStats,
  maxStatValue,
} from '@/lib/character';
import { xpToNextLevel } from '@/lib/xp';
import { GOAL_TO_CLASS } from '@/lib/constants';
import type { Character } from '@/types';

// ─── classFromGoal ────────────────────────────────────────────────────────────

describe('classFromGoal', () => {
  it('maps strength → Warrior', () => {
    expect(classFromGoal('strength')).toBe('Warrior');
  });

  it('maps endurance → Berserker', () => {
    expect(classFromGoal('endurance')).toBe('Berserker');
  });

  it('maps calisthenics → Rogue', () => {
    expect(classFromGoal('calisthenics')).toBe('Rogue');
  });

  it('maps balanced → Paladin', () => {
    expect(classFromGoal('balanced')).toBe('Paladin');
  });

  it('maps weight_loss → Paladin', () => {
    expect(classFromGoal('weight_loss')).toBe('Paladin');
  });

  it('every goal has a corresponding class', () => {
    const goals = Object.keys(GOAL_TO_CLASS) as (keyof typeof GOAL_TO_CLASS)[];
    goals.forEach((goal) => {
      expect(() => classFromGoal(goal)).not.toThrow();
      expect(classFromGoal(goal)).toBeTruthy();
    });
  });
});

// ─── titleForLevel ────────────────────────────────────────────────────────────

describe('titleForLevel', () => {
  const cases: [number, string][] = [
    [1, 'Initiate'],
    [2, 'Initiate'],
    [3, 'Initiate'],
    [4, 'Wanderer'],
    [7, 'Wanderer'],
    [8, 'Iron Knight'],
    [12, 'Iron Knight'],
    [13, 'Stone Warden'],
    [25, 'Shadow Blade'],
    [26, 'Dungeon Slayer'],
    [51, 'Eternal Conqueror'],
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

  it('assigns the correct class for each goal', () => {
    expect(createCharacter('strength').class).toBe('Warrior');
    expect(createCharacter('endurance').class).toBe('Berserker');
    expect(createCharacter('calisthenics').class).toBe('Rogue');
    expect(createCharacter('balanced').class).toBe('Paladin');
    expect(createCharacter('weight_loss').class).toBe('Paladin');
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

  it('Warrior gains +1 to strength, +0.5 to others on 1 level-up', () => {
    const c = makeCharAtLevel(2, 'Warrior');
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

  it('Rogue gains +1 to agility, +0.5 to others', () => {
    const c = makeCharAtLevel(2, 'Rogue');
    const updated = applyLevelUpStats(c, 1);
    expect(updated.stats.agility).toBe(6);
    expect(updated.stats.strength).toBe(5.5);
  });

  it('Paladin gains +1 to vitality, +0.5 to others', () => {
    const c = makeCharAtLevel(2, 'Paladin');
    const updated = applyLevelUpStats(c, 1);
    expect(updated.stats.vitality).toBe(6);
    expect(updated.stats.strength).toBe(5.5);
  });

  it('scales gains for multiple levels gained at once', () => {
    const c = makeCharAtLevel(3, 'Warrior');
    const updated = applyLevelUpStats(c, 3);
    expect(updated.stats.strength).toBe(8); // 5 + 3*1
    expect(updated.stats.endurance).toBe(6.5); // 5 + 3*0.5
  });

  it('does not mutate the original character', () => {
    const c = makeCharAtLevel(2, 'Warrior');
    const original = { ...c.stats };
    applyLevelUpStats(c, 1);
    expect(c.stats.strength).toBe(original.strength);
  });

  it('updates the title after leveling up', () => {
    const c = makeCharAtLevel(4, 'Warrior'); // level 4 = Wanderer
    const updated = applyLevelUpStats(c, 1);
    expect(updated.title).toBe('Wanderer');
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
