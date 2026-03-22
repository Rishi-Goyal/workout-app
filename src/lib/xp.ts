import type { Character, QuestDifficulty } from '../types';
import { XP_BY_DIFFICULTY } from './constants';

export function xpToNextLevel(level: number): number {
  return 500 + (level - 1) * 150;
}

export function getXPReward(difficulty: QuestDifficulty, half = false): number {
  const full = XP_BY_DIFFICULTY[difficulty];
  return half ? Math.floor(full / 2) : full;
}

export function applyXP(
  character: Character,
  amount: number
): { character: Character; leveledUp: boolean; levelsGained: number } {
  let { level, currentXP, xpToNextLevel: xpNeeded, totalXPEarned } = character;
  let remaining = amount;
  let levelsGained = 0;

  totalXPEarned += amount;

  while (remaining > 0) {
    const space = xpNeeded - currentXP;
    if (remaining >= space) {
      remaining -= space;
      level += 1;
      levelsGained += 1;
      currentXP = 0;
      xpNeeded = xpToNextLevel(level);
    } else {
      currentXP += remaining;
      remaining = 0;
    }
  }

  return {
    character: { ...character, level, currentXP, xpToNextLevel: xpNeeded, totalXPEarned },
    leveledUp: levelsGained > 0,
    levelsGained,
  };
}

export function xpProgress(character: Character): number {
  return Math.min(100, Math.round((character.currentXP / character.xpToNextLevel) * 100));
}
