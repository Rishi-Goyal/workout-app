/**
 * Tests for deriveClassFromMuscles — the core class-assignment algorithm.
 *
 * Zones:
 *   Push  = chest + shoulders + triceps  (avg)
 *   Pull  = back + biceps                (avg)
 *   Legs  = quads + hamstrings + glutes + calves (avg)
 *   Core  = core                         (single value)
 *
 * Classes (in priority order):
 *   Wanderer     – totalAvg < 2
 *   Paragon      – totalAvg >= 8, spread < 25% of avg
 *   Mirror Knight – push dominant (dominance >= 1.3)
 *   Phantom      – pull dominant
 *   Earthshaker  – legs dominant
 *   Iron Monk    – core dominant
 *   Iron Knight  – push AND pull > legs*1.3
 *   Colossus     – legs > upper*1.3 AND core > push*1.1
 *   Berserker    – totalAvg >= 5, otherwise unclassified above
 *   Wanderer     – fallback
 */

import { deriveClassFromMuscles } from '@/lib/character';
import type { MuscleXP } from '@/lib/muscleXP';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a MuscleXP snapshot from a flat level map (xp always 0 for tests). */
function makeMuscleXP(levels: {
  chest?: number; shoulders?: number; triceps?: number;
  back?: number; biceps?: number;
  quads?: number; hamstrings?: number; glutes?: number; calves?: number;
  core?: number;
}): MuscleXP {
  const L = (n = 1) => ({ xp: 0, level: n });
  return {
    chest:      L(levels.chest),
    shoulders:  L(levels.shoulders),
    triceps:    L(levels.triceps),
    back:       L(levels.back),
    biceps:     L(levels.biceps),
    quads:      L(levels.quads),
    hamstrings: L(levels.hamstrings),
    glutes:     L(levels.glutes),
    calves:     L(levels.calves),
    core:       L(levels.core),
  };
}

/** All muscles at the same level — useful for balanced / early-game scenarios. */
function uniform(level: number): MuscleXP {
  return makeMuscleXP({
    chest: level, shoulders: level, triceps: level,
    back: level, biceps: level,
    quads: level, hamstrings: level, glutes: level, calves: level,
    core: level,
  });
}

// ─── Wanderer (beginner) ──────────────────────────────────────────────────────

describe('deriveClassFromMuscles → Wanderer', () => {
  it('returns Wanderer when all muscles are at level 1 (fresh character)', () => {
    expect(deriveClassFromMuscles(uniform(1))).toBe('Wanderer');
  });

  it('returns Wanderer when totalAvg is exactly 1', () => {
    expect(deriveClassFromMuscles(uniform(1))).toBe('Wanderer');
  });

  it('returns Wanderer when totalAvg is just below 2', () => {
    // Mix of level 1 and 2 but average stays < 2
    const m = makeMuscleXP({
      chest: 1, shoulders: 1, triceps: 1,
      back: 1, biceps: 1,
      quads: 2, hamstrings: 1, glutes: 1, calves: 1,
      core: 1,
    });
    expect(deriveClassFromMuscles(m)).toBe('Wanderer');
  });

  // Negative: should NOT return Wanderer once training is substantial
  it('does NOT return Wanderer when push zone is clearly dominant (level 8 push vs 1 rest)', () => {
    const m = makeMuscleXP({
      chest: 8, shoulders: 8, triceps: 8,
      back: 1, biceps: 1,
      quads: 1, hamstrings: 1, glutes: 1, calves: 1,
      core: 1,
    });
    expect(deriveClassFromMuscles(m)).not.toBe('Wanderer');
  });
});

// ─── Paragon (balanced + high) ────────────────────────────────────────────────

describe('deriveClassFromMuscles → Paragon', () => {
  it('returns Paragon when all muscles are equally high (level 10)', () => {
    expect(deriveClassFromMuscles(uniform(10))).toBe('Paragon');
  });

  it('returns Paragon when all muscles are at level 8 with tiny spread', () => {
    const m = makeMuscleXP({
      chest: 8, shoulders: 8, triceps: 8,
      back: 8, biceps: 8,
      quads: 8, hamstrings: 8, glutes: 8, calves: 8,
      core: 8,
    });
    expect(deriveClassFromMuscles(m)).toBe('Paragon');
  });

  // Negative: high but NOT balanced — should not be Paragon
  it('does NOT return Paragon when one zone is neglected despite high average', () => {
    const m = makeMuscleXP({
      chest: 12, shoulders: 12, triceps: 12,
      back: 12, biceps: 12,
      quads: 1, hamstrings: 1, glutes: 1, calves: 1,
      core: 12,
    });
    expect(deriveClassFromMuscles(m)).not.toBe('Paragon');
  });

  // Negative: balanced but too low — should still be Wanderer
  it('does NOT return Paragon when perfectly balanced but totalAvg < 8', () => {
    expect(deriveClassFromMuscles(uniform(4))).not.toBe('Paragon');
  });
});

// ─── Mirror Knight (push dominant) ───────────────────────────────────────────

describe('deriveClassFromMuscles → Mirror Knight', () => {
  it('returns Mirror Knight when chest/shoulders/triceps dominate strongly', () => {
    const m = makeMuscleXP({
      chest: 10, shoulders: 10, triceps: 10,
      back: 2,  biceps: 2,
      quads: 2, hamstrings: 2, glutes: 2, calves: 2,
      core: 2,
    });
    expect(deriveClassFromMuscles(m)).toBe('Mirror Knight');
  });

  it('returns Mirror Knight even when pull is moderate but push is still 1.3× average', () => {
    const m = makeMuscleXP({
      chest: 9, shoulders: 9, triceps: 9,
      back: 4, biceps: 4,
      quads: 3, hamstrings: 3, glutes: 3, calves: 3,
      core: 3,
    });
    expect(deriveClassFromMuscles(m)).toBe('Mirror Knight');
  });

  // Negative: push just barely above everything else — not enough for Mirror Knight
  it('does NOT return Mirror Knight when dominance is below 1.3×', () => {
    // All roughly equal at level 4 — no dominant zone
    const m = uniform(4);
    expect(deriveClassFromMuscles(m)).not.toBe('Mirror Knight');
  });
});

// ─── Phantom (pull dominant) ──────────────────────────────────────────────────

describe('deriveClassFromMuscles → Phantom', () => {
  it('returns Phantom when back/biceps dominate strongly', () => {
    const m = makeMuscleXP({
      chest: 2, shoulders: 2, triceps: 2,
      back: 10, biceps: 10,
      quads: 2, hamstrings: 2, glutes: 2, calves: 2,
      core: 2,
    });
    expect(deriveClassFromMuscles(m)).toBe('Phantom');
  });

  // Negative: pull high but push is equally high — should not be Phantom
  it('does NOT return Phantom when push and pull are equal (no clear dominant zone)', () => {
    const m = makeMuscleXP({
      chest: 9, shoulders: 9, triceps: 9,
      back: 9, biceps: 9,
      quads: 2, hamstrings: 2, glutes: 2, calves: 2,
      core: 2,
    });
    // Both push and pull are high → Iron Knight territory or Berserker
    expect(deriveClassFromMuscles(m)).not.toBe('Phantom');
  });
});

// ─── Earthshaker (legs dominant) ─────────────────────────────────────────────

describe('deriveClassFromMuscles → Earthshaker', () => {
  it('returns Earthshaker when quads/hamstrings/glutes/calves dominate', () => {
    const m = makeMuscleXP({
      chest: 2, shoulders: 2, triceps: 2,
      back: 2,  biceps: 2,
      quads: 10, hamstrings: 10, glutes: 10, calves: 10,
      core: 2,
    });
    expect(deriveClassFromMuscles(m)).toBe('Earthshaker');
  });

  // Negative: legs high but upper is close — should not be Earthshaker
  it('does NOT return Earthshaker when upper body keeps up with legs', () => {
    const m = makeMuscleXP({
      chest: 8, shoulders: 8, triceps: 8,
      back: 8, biceps: 8,
      quads: 10, hamstrings: 10, glutes: 10, calves: 10,
      core: 8,
    });
    // All high, balanced enough — could be Paragon or Iron Knight
    expect(deriveClassFromMuscles(m)).not.toBe('Earthshaker');
  });
});

// ─── Iron Monk (core dominant) ────────────────────────────────────────────────

describe('deriveClassFromMuscles → Iron Monk', () => {
  it('returns Iron Monk when core clearly dominates all zones', () => {
    const m = makeMuscleXP({
      chest: 2, shoulders: 2, triceps: 2,
      back: 2,  biceps: 2,
      quads: 2, hamstrings: 2, glutes: 2, calves: 2,
      core: 15,
    });
    expect(deriveClassFromMuscles(m)).toBe('Iron Monk');
  });

  // Negative: core high but legs are higher
  it('does NOT return Iron Monk when legs level exceeds core', () => {
    const m = makeMuscleXP({
      chest: 2, shoulders: 2, triceps: 2,
      back: 2, biceps: 2,
      quads: 12, hamstrings: 12, glutes: 12, calves: 12,
      core: 10,
    });
    expect(deriveClassFromMuscles(m)).not.toBe('Iron Monk');
  });
});

// ─── Iron Knight (upper body balanced, legs neglected) ───────────────────────

describe('deriveClassFromMuscles → Iron Knight', () => {
  it('returns Iron Knight when push AND pull both beat legs by >30%', () => {
    // Key: legs must be high enough that no single zone exceeds 1.3× totalAvg
    // (otherwise Earthshaker/Mirror Knight/Phantom fires first in the dominance block)
    // push avg=8, pull avg=8, legs avg=6 → dominance = 8/avg([8,8,6,4]) = 8/6.5 ≈ 1.23 < 1.3 ✓
    // Iron Knight check: push(8) > legs(6)*1.3=7.8 ✓  pull(8) > 7.8 ✓
    const m = makeMuscleXP({
      chest: 8, shoulders: 8, triceps: 8,  // push avg = 8
      back: 8,  biceps: 8,                  // pull avg = 8
      quads: 6, hamstrings: 6, glutes: 6, calves: 6, // legs avg = 6
      core: 4,
    });
    expect(deriveClassFromMuscles(m)).toBe('Iron Knight');
  });

  // Negative: legs are not neglected enough
  it('does NOT return Iron Knight when legs are close to upper body', () => {
    const m = makeMuscleXP({
      chest: 6, shoulders: 6, triceps: 6,
      back: 6, biceps: 6,
      quads: 5, hamstrings: 5, glutes: 5, calves: 5,
      core: 5,
    });
    expect(deriveClassFromMuscles(m)).not.toBe('Iron Knight');
  });

  // Negative: push OR pull dominates individually — becomes Mirror Knight / Phantom
  it('does NOT return Iron Knight when only push is high (pull is low)', () => {
    const m = makeMuscleXP({
      chest: 10, shoulders: 10, triceps: 10,
      back: 2,   biceps: 2,
      quads: 2, hamstrings: 2, glutes: 2, calves: 2,
      core: 2,
    });
    expect(deriveClassFromMuscles(m)).not.toBe('Iron Knight');
  });
});

// ─── Colossus (legs + core, upper neglected) ─────────────────────────────────

describe('deriveClassFromMuscles → Colossus', () => {
  it('returns Colossus when legs dominate upper AND core > push', () => {
    // Colossus requires dominance < 1.3 (otherwise Earthshaker fires in the single-zone block).
    // Use moderate legs vs low upper so the ratio check passes but overall dominance stays < 1.3.
    // push avg=4, pull avg=4, legs avg=6, core=5
    // totalAvg = avg([4,4,6,5]) = 4.75 → dominance = 6/4.75 ≈ 1.26 < 1.3 ✓
    // Colossus: legs(6) > push(4)*1.3=5.2 ✓  legs(6) > pull(4)*1.3=5.2 ✓  core(5) > push(4)*1.1=4.4 ✓
    const m = makeMuscleXP({
      chest: 4, shoulders: 4, triceps: 4,  // push avg = 4
      back: 4,  biceps: 4,                  // pull avg = 4
      quads: 6, hamstrings: 6, glutes: 6, calves: 6, // legs avg = 6
      core: 5,
    });
    expect(deriveClassFromMuscles(m)).toBe('Colossus');
  });

  // Negative: legs high but core is not above push threshold
  it('does NOT return Colossus when core is weak despite strong legs', () => {
    const m = makeMuscleXP({
      chest: 4, shoulders: 4, triceps: 4,
      back: 4,  biceps: 4,
      quads: 9, hamstrings: 9, glutes: 9, calves: 9,
      core: 1,  // core(1) < push(4)*1.1=4.4 ✗
    });
    expect(deriveClassFromMuscles(m)).not.toBe('Colossus');
  });
});

// ─── Berserker (high overall, chaotic) ───────────────────────────────────────

describe('deriveClassFromMuscles → Berserker', () => {
  it('returns Berserker when totalAvg >= 5 but no single zone is 1.3× dominant', () => {
    // All zones roughly equal at ~5-6 so dominance < 1.3 AND no combined-zone pattern fires.
    // push avg=5.67, pull avg=6, legs avg=5, core=5 → totalAvg=5.42
    // dominance = 6/5.42 ≈ 1.11 < 1.3 → no single-zone block
    // Iron Knight: push(5.67) > legs(5)*1.3=6.5? NO → not Iron Knight ✓
    // Colossus: legs(5) > push(5.67)*1.3=7.4? NO ✓
    // Berserker: totalAvg(5.42) >= 5 → YES ✓
    const m = makeMuscleXP({
      chest: 7, shoulders: 5, triceps: 5,  // push avg = 5.67
      back: 6, biceps: 6,                   // pull avg = 6
      quads: 5, hamstrings: 5, glutes: 5, calves: 5, // legs avg = 5
      core: 5,
    });
    expect(deriveClassFromMuscles(m)).toBe('Berserker');
  });

  // Negative: totalAvg below 5 and no dominant zone → Wanderer
  it('does NOT return Berserker when totalAvg < 5 (too underdeveloped)', () => {
    const m = makeMuscleXP({
      chest: 3, shoulders: 3, triceps: 3,
      back: 3, biceps: 3,
      quads: 3, hamstrings: 3, glutes: 3, calves: 3,
      core: 3,
    });
    // totalAvg = 3, no dominance → Wanderer fallback
    expect(deriveClassFromMuscles(m)).toBe('Wanderer');
  });
});

// ─── Boundary / edge cases ────────────────────────────────────────────────────

describe('deriveClassFromMuscles → edge cases', () => {
  it('always returns a valid CharacterClass string', () => {
    const valid = [
      'Wanderer', 'Mirror Knight', 'Phantom', 'Earthshaker', 'Iron Monk',
      'Iron Knight', 'Colossus', 'Berserker', 'Paragon',
    ];
    [uniform(1), uniform(5), uniform(10), uniform(20)].forEach((m) => {
      expect(valid).toContain(deriveClassFromMuscles(m));
    });
  });

  it('is deterministic — same input always yields same class', () => {
    const m = makeMuscleXP({
      chest: 6, shoulders: 6, triceps: 6,
      back: 2, biceps: 2,
      quads: 2, hamstrings: 2, glutes: 2, calves: 2,
      core: 2,
    });
    const first = deriveClassFromMuscles(m);
    expect(deriveClassFromMuscles(m)).toBe(first);
    expect(deriveClassFromMuscles(m)).toBe(first);
  });

  it('does not throw for extreme muscle levels (e.g. level 100)', () => {
    expect(() => deriveClassFromMuscles(uniform(100))).not.toThrow();
  });

  it('Paragon threshold is NOT met at totalAvg exactly 7 (below 8)', () => {
    expect(deriveClassFromMuscles(uniform(7))).not.toBe('Paragon');
  });

  it('Paragon is met at totalAvg exactly 8 with zero spread', () => {
    expect(deriveClassFromMuscles(uniform(8))).toBe('Paragon');
  });
});
