import type { Character, QuestDifficulty, MuscleGroup } from '../types';
import { XP_BY_DIFFICULTY } from './constants';
import type { MuscleXP } from './muscleXP';

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

// ═══ v4 XP formula ════════════════════════════════════════════════════════════
//
//   finalXP = baseXP × performance × exerciseDifficulty × historicalPerf × muscleFreshness
//
// Each multiplier is derived from one signal and clamped to a sensible range so
// a single bad input can't zero or balloon the reward.

export interface XPMultipliers {
  /** Reps or time done vs target (target = 1.0). 0.5 → half, 1.5 → 150%. */
  performance: number;
  /** Exercise's intrinsic difficulty multiplier (easy=0.9, medium=1.0, hard=1.15, boss=1.35). */
  exerciseDifficulty: number;
  /**
   * Historical performance vs the user's running average for this lift.
   * 1.0 = at average, 1.2 = strong progression, 0.8 = regression.
   */
  historicalPerformance: number;
  /**
   * Target muscle freshness — rested muscles yield more XP.
   * 1.0 = fully recovered baseline, 1.3 = well-rested bonus, 0.7 = still fatigued.
   */
  muscleFreshness: number;
}

/** Clamp helper. */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Calculate the XP awarded for a completed set or quest.
 *
 * `baseXP` is the quest's nominal reward (from XP_BY_DIFFICULTY). The four
 * multipliers each hit independently, so a perfect set on a rested muscle
 * with historical progression can multiply by ~3×, while a botched set on a
 * fatigued muscle with regression can drop to ~0.3× — rewarding real work and
 * penalising junk volume.
 */
export function calculateQuestXP(baseXP: number, m: XPMultipliers): number {
  const perf = clamp(m.performance, 0.3, 2);
  const diff = clamp(m.exerciseDifficulty, 0.8, 1.5);
  const hist = clamp(m.historicalPerformance, 0.7, 1.3);
  const fresh = clamp(m.muscleFreshness, 0.6, 1.3);
  return Math.round(baseXP * perf * diff * hist * fresh);
}

const DIFFICULTY_MULT: Record<QuestDifficulty, number> = {
  easy: 0.9,
  medium: 1.0,
  hard: 1.15,
  boss: 1.35,
};

export function difficultyMultiplier(d: QuestDifficulty): number {
  return DIFFICULTY_MULT[d];
}

/**
 * Compute muscle freshness for the quest's targets based on hours since last
 * training. Fresh muscles (≥ 48 h rest) earn a 1.3× bonus; fully fatigued
 * (just trained) drop to 0.6×; linear in-between.
 */
export function computeMuscleFreshness(muscleXP: MuscleXP, targets: MuscleGroup[]): number {
  if (targets.length === 0) return 1.0;
  const now = Date.now();
  const values = targets.map((m) => {
    const last = muscleXP[m]?.lastTrained;
    if (!last) return 1.3; // never trained → fully rested
    const hours = (now - new Date(last).getTime()) / 3_600_000;
    if (hours >= 48) return 1.3;
    if (hours >= 24) return 1.0;
    if (hours >= 12) return 0.8;
    return 0.6;
  });
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ═══ v4 Consistency mechanics ═════════════════════════════════════════════════
//
// Per-rank penalty grows when the player skips weeks and shrinks when they
// return. Penalty is applied to the class's primary-dimension score in
// classRank(), so an inactive Ascendant eventually slides back to S or A.

export const CONSISTENCY_WEEKLY_DECAY  = 5;   // +5% per skipped week
export const CONSISTENCY_MAX_PENALTY   = 20;  // capped so comeback is feasible
export const CONSISTENCY_RECOVER_RATE  = 5;   // −5% per active week

/**
 * Given weeks-since-last-session, returns the updated consistencyPenalty (0–20).
 */
export function applyConsistencyDecay(currentPenalty: number, weeksInactive: number): number {
  const next = currentPenalty + weeksInactive * CONSISTENCY_WEEKLY_DECAY;
  return clamp(next, 0, CONSISTENCY_MAX_PENALTY);
}

/** Player trained this week — pull the penalty back toward zero. */
export function recoverConsistency(currentPenalty: number): number {
  return clamp(currentPenalty - CONSISTENCY_RECOVER_RATE, 0, CONSISTENCY_MAX_PENALTY);
}

/**
 * Idempotent "catch-up" decay. Given the last session's ISO timestamp and the
 * current stored penalty, returns what the penalty *should* be based on the
 * inactivity gap. Only ever raises the value — recovery happens separately
 * via `recoverConsistency()` on session finalize. Safe to call on every mount
 * because the target is a pure function of the gap (not the number of calls).
 *
 * Fresh users (`lastSessionIso === null`) are never penalised.
 */
export function computeConsistencyPenaltyForGap(
  currentPenalty: number,
  lastSessionIso: string | null,
): number {
  if (!lastSessionIso) return currentPenalty;
  const days = Math.floor((Date.now() - new Date(lastSessionIso).getTime()) / 86_400_000);
  const weeks = Math.max(0, Math.floor(days / 7));
  const target = Math.min(CONSISTENCY_MAX_PENALTY, weeks * CONSISTENCY_WEEKLY_DECAY);
  return Math.max(currentPenalty, target);
}

// Freeze tokens previously lived here as `earnFreezeToken` / `consumeFreezeToken`
// but were never called from the app. The real streak-freeze mechanic lives in
// useWeeklyGoalStore (freezesAvailable + consumeFreeze). Removed in v4.1.0 so
// there's one source of truth.
