import type { Character, CharacterClass, CharacterStats, FitnessGoal } from '../types';
import { GOAL_TO_CLASS, TITLES_BY_LEVEL, CLASS_DEFINITIONS } from './constants';
import { xpToNextLevel } from './xp';

const BASE_STATS: CharacterStats = { strength: 5, endurance: 5, agility: 5, vitality: 5 };

export function classFromGoal(goal: FitnessGoal): CharacterClass {
  return GOAL_TO_CLASS[goal];
}

export function titleForLevel(level: number): string {
  return TITLES_BY_LEVEL.find((t) => level <= t.maxLevel)?.title ?? 'Eternal Conqueror';
}

function statIncrease(characterClass: CharacterClass): CharacterStats {
  const primary = CLASS_DEFINITIONS[characterClass].primaryStat;
  const inc: CharacterStats = { strength: 0.5, endurance: 0.5, agility: 0.5, vitality: 0.5 };
  inc[primary] = 1;
  return inc;
}

export function createCharacter(goal: FitnessGoal): Character {
  const characterClass = classFromGoal(goal);
  return {
    class: characterClass,
    level: 1,
    currentXP: 0,
    xpToNextLevel: xpToNextLevel(1),
    totalXPEarned: 0,
    stats: { ...BASE_STATS },
    title: titleForLevel(1),
    floorsCleared: 0,
  };
}

export function applyLevelUpStats(character: Character, levelsGained: number): Character {
  const inc = statIncrease(character.class);
  return {
    ...character,
    title: titleForLevel(character.level),
    stats: {
      strength: Math.round((character.stats.strength + inc.strength * levelsGained) * 10) / 10,
      endurance: Math.round((character.stats.endurance + inc.endurance * levelsGained) * 10) / 10,
      agility: Math.round((character.stats.agility + inc.agility * levelsGained) * 10) / 10,
      vitality: Math.round((character.stats.vitality + inc.vitality * levelsGained) * 10) / 10,
    },
  };
}

export function maxStatValue(level: number): number {
  return 5 + level * 1.5;
}
