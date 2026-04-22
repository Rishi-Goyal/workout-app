import type { Character, CharacterClass, CharacterStats, FitnessGoal } from '../types';
import { TITLES_BY_LEVEL, CLASS_DEFINITIONS } from './constants';
import { xpToNextLevel } from './xp';
import type { MuscleXP } from './muscleXP';

const BASE_STATS: CharacterStats = { strength: 5, endurance: 5, agility: 5, vitality: 5 };

export function titleForLevel(level: number): string {
  return TITLES_BY_LEVEL.find((t) => level <= t.maxLevel)?.title ?? 'Eternal Conqueror';
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export interface DeriveDimensions {
  cardioMinutes: number;   // 0–300 minutes/week
  mobilityScore: number;   // 1–20
  gripScore: number;       // 1–20
}

/**
 * v4 class derivation.
 *
 * Seven dimensions are scored on a common 1–20 scale:
 *   push, pull, legs, core  — averaged muscle-XP levels
 *   cardio                  — cardioMinutes mapped: 150min ≈ 10, 300min ≈ 20
 *   mobility, grip          — direct 1–20 scores
 *
 * The class is selected by a cascade of rules (Ascendant → Paragon → imbalanced
 * specialists → balanced fallbacks). Re-runs every session so the class tracks
 * what you've actually trained, not what you once claimed in onboarding.
 */
export function deriveClass(muscleXP: MuscleXP, dims: DeriveDimensions): CharacterClass {
  const push = avg([muscleXP.chest.level, muscleXP.shoulders.level, muscleXP.triceps.level]);
  const pull = avg([muscleXP.back.level, muscleXP.biceps.level]);
  const legs = avg([muscleXP.quads.level, muscleXP.hamstrings.level, muscleXP.glutes.level, muscleXP.calves.level]);
  const core = muscleXP.core.level;
  const cardio   = Math.min(20, dims.cardioMinutes / 15);
  const mobility = Math.min(20, dims.mobilityScore);
  const grip     = Math.min(20, dims.gripScore);

  const all = [push, pull, legs, core, cardio, mobility, grip];
  const totalAvg = avg(all);

  // SS — Ascendant: everything at or past threshold
  if (all.every((v) => v >= 12)) return 'Ascendant';

  // Beginner floor — nothing has emerged yet
  if (totalAvg < 4) return 'Awakened Novice';

  // Paragon — high across the board, tight spread
  const spread = Math.max(...all) - Math.min(...all);
  if (totalAvg >= 8 && spread <= 3) return 'Paragon';

  // Specialist detection — find the dominant dimension
  const max = Math.max(...all);
  const dominance = max / Math.max(totalAvg, 1);

  // Grip specialist — crushes out the competition
  if (grip === max && dominance >= 1.3) return 'Ironhand Crusher';

  // Cardio specialists — split by whether upper body also trained
  if (cardio === max && dominance >= 1.3) {
    const upper = (push + pull) / 2;
    return upper >= 5 ? 'Storm Rider' : 'Windrunner';
  }

  // Mobility/core — Void Monk (core-leaning) vs Serpent Dancer (mobility-leaning)
  if (mobility === max && dominance >= 1.25) {
    return core >= mobility * 0.75 ? 'Void Monk' : 'Serpent Dancer';
  }
  if (core === max && dominance >= 1.3) {
    return mobility >= core * 0.8 ? 'Void Monk' : 'Void Monk';
  }

  // Push specialist — Iron Bulwark (with core) vs Gauntlet Duelist (balanced upper)
  if (push === max && dominance >= 1.2) {
    if (core >= push * 0.8) return 'Iron Bulwark';
    if (pull >= push * 0.85) return 'Gauntlet Duelist';
    return 'Iron Bulwark';
  }

  // Pull specialist — Dragonspine (pure pull) vs Shadow Archer / Raven Stalker (mobile pull)
  if (pull === max && dominance >= 1.2) {
    if (mobility >= 8 && mobility >= pull * 0.7) return 'Raven Stalker';
    if (legs >= pull * 0.7) return 'Shadow Archer';
    return 'Dragonspine';
  }

  // Legs specialist
  if (legs === max && dominance >= 1.2) return 'Atlas Titan';

  // Balanced mid-tier patterns
  if (push >= 6 && pull >= 6 && legs < push * 0.7) return 'Gauntlet Duelist';
  if (push >= 6 && pull >= 6 && legs >= 6) return 'Juggernaut';
  if (totalAvg >= 6) return 'Flame Herald';

  return 'Awakened Novice';
}

/** @deprecated use deriveClass() with dims — kept for backwards compat during migration. */
export function deriveClassFromMuscles(muscleXP: MuscleXP): CharacterClass {
  return deriveClass(muscleXP, { cardioMinutes: 0, mobilityScore: 5, gripScore: 5 });
}

function statIncrease(characterClass: CharacterClass): CharacterStats {
  const def = CLASS_DEFINITIONS[characterClass];
  const primary = def?.primaryStat ?? 'vitality';
  const inc: CharacterStats = { strength: 0.5, endurance: 0.5, agility: 0.5, vitality: 0.5 };
  inc[primary] = 1;
  return inc;
}

export function createCharacter(
  _goal: FitnessGoal,
  dims?: Partial<DeriveDimensions>,
): Character {
  return {
    class: 'Awakened Novice',
    level: 1,
    currentXP: 0,
    xpToNextLevel: xpToNextLevel(1),
    totalXPEarned: 0,
    stats: { ...BASE_STATS },
    title: titleForLevel(1),
    floorsCleared: 0,
    cardioMinutes: dims?.cardioMinutes ?? 0,
    mobilityScore: dims?.mobilityScore ?? 5,
    gripScore: dims?.gripScore ?? 5,
    freezeTokens: 0,
    consistencyPenalty: 0,
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

/**
 * Compute the class rank (C/B/A/S/SS) from the character's primary dimension
 * level, minus consistencyPenalty.
 */
import { RANK_THRESHOLDS, type ClassRank } from './constants';

export function classRank(character: Character, muscleXP: MuscleXP): ClassRank {
  const def = CLASS_DEFINITIONS[character.class];
  const dim = def?.primaryDimension ?? 'balanced';

  const push = avg([muscleXP.chest.level, muscleXP.shoulders.level, muscleXP.triceps.level]);
  const pull = avg([muscleXP.back.level, muscleXP.biceps.level]);
  const legs = avg([muscleXP.quads.level, muscleXP.hamstrings.level, muscleXP.glutes.level, muscleXP.calves.level]);
  const core = muscleXP.core.level;
  const cardio   = Math.min(20, character.cardioMinutes / 15);
  const mobility = Math.min(20, character.mobilityScore);
  const grip     = Math.min(20, character.gripScore);

  const score = {
    push, pull, legs, core, cardio, mobility, grip,
    balanced: avg([push, pull, legs, core, cardio, mobility, grip]),
  }[dim];

  const penalty = character.consistencyPenalty ?? 0;
  const effective = Math.max(0, score * (1 - penalty / 100));

  if (character.class === 'Ascendant') return 'SS';
  if (effective >= RANK_THRESHOLDS.SS) return 'SS';
  if (effective >= RANK_THRESHOLDS.S)  return 'S';
  if (effective >= RANK_THRESHOLDS.A)  return 'A';
  if (effective >= RANK_THRESHOLDS.B)  return 'B';
  return 'C';
}
