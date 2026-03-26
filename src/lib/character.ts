import type { Character, CharacterClass, CharacterStats, FitnessGoal } from '../types';
import { GOAL_TO_CLASS, TITLES_BY_LEVEL, CLASS_DEFINITIONS } from './constants';
import { xpToNextLevel } from './xp';
import type { MuscleXP } from './muscleXP';

const BASE_STATS: CharacterStats = { strength: 5, endurance: 5, agility: 5, vitality: 5 };

/** @deprecated Use deriveClassFromMuscles instead */
export function classFromGoal(goal: FitnessGoal): CharacterClass {
  return GOAL_TO_CLASS[goal];
}

export function titleForLevel(level: number): string {
  return TITLES_BY_LEVEL.find((t) => level <= t.maxLevel)?.title ?? 'Eternal Conqueror';
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Derives the character class from the player's muscle XP distribution.
 *
 * Zones:
 *   Push  = chest + shoulders + triceps
 *   Pull  = back + biceps
 *   Legs  = quads + hamstrings + glutes + calves
 *   Core  = core
 *
 * Classes reflect the dominant training pattern with a healthy dose of
 * self-awareness about what the player has been skipping.
 */
export function deriveClassFromMuscles(muscleXP: MuscleXP): CharacterClass {
  const push = avg([
    muscleXP.chest.level,
    muscleXP.shoulders.level,
    muscleXP.triceps.level,
  ]);
  const pull = avg([
    muscleXP.back.level,
    muscleXP.biceps.level,
  ]);
  const legs = avg([
    muscleXP.quads.level,
    muscleXP.hamstrings.level,
    muscleXP.glutes.level,
    muscleXP.calves.level,
  ]);
  const core = muscleXP.core.level;

  const all = [push, pull, legs, core];
  const totalAvg = avg(all);
  const maxZone = Math.max(...all);
  const minZone = Math.min(...all);

  // ── Absolute beginner: nobody has trained much yet ───────────────────────
  if (totalAvg < 2) return 'Wanderer';

  // ── Paragon: high overall AND balanced (spread < 25 % of average) ────────
  if (totalAvg >= 8 && (maxZone - minZone) / totalAvg < 0.25) return 'Paragon';

  // ── Dominant-zone detection ───────────────────────────────────────────────
  const dominance = maxZone / Math.max(totalAvg, 1);

  if (dominance >= 1.3) {
    // One zone clearly leads
    if (push >= pull && push >= legs && push >= core) return 'Mirror Knight';
    if (pull >= push && pull >= legs && pull >= core) return 'Phantom';
    if (legs >= push && legs >= pull && legs >= core) return 'Earthshaker';
    if (core >= push && core >= pull && core >= legs) return 'Iron Monk';
  }

  // ── Combined-zone patterns ────────────────────────────────────────────────

  // Upper dominant: both push AND pull well above legs
  if (push > legs * 1.3 && pull > legs * 1.3) return 'Iron Knight';

  // Lower + core dominant: legs well above upper, core above push
  if (legs > push * 1.3 && legs > pull * 1.3 && core > push * 1.1) return 'Colossus';

  // High overall but unbalanced — the chaos warrior
  if (totalAvg >= 5) return 'Berserker';

  return 'Wanderer';
}

function statIncrease(characterClass: CharacterClass): CharacterStats {
  const def = CLASS_DEFINITIONS[characterClass];
  // Fallback to 'vitality' if class somehow isn't in definitions
  const primary = def?.primaryStat ?? 'vitality';
  const inc: CharacterStats = { strength: 0.5, endurance: 0.5, agility: 0.5, vitality: 0.5 };
  inc[primary] = 1;
  return inc;
}

export function createCharacter(_goal: FitnessGoal): Character {
  // Class always starts as Wanderer; re-derived from muscle XP after each session
  return {
    class: 'Wanderer',
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
