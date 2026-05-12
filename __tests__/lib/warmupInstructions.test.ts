/**
 * v4.6.0 PR 2/4 — coverage guard for hand-curated warmup instructions.
 *
 * Asserts that every `wu-*` ID in warmupDatabase.ts has its own entry in
 * `WARMUP_CURATED_INSTRUCTIONS` with ≥ 3 steps. The point is to *prevent*
 * a regression where a future warmup is added without curated content —
 * which would silently fall back to whatever ExerciseDB / wger entry got
 * mapped at curation time, reintroducing the Cat-Cow class of bug
 * (mapped to free-ex-db's "Cat Stretch", whose instructions say "Hold
 * for 15 seconds" even though our timer runs 40s).
 *
 * PR #56 Codex P2 — earlier version of this test called `getMistakes()`
 * and just asserted ≥ 3 items, but that's satisfied by ExerciseDB
 * fallthrough; removing a curated entry would still pass. The test now
 * inspects `WARMUP_CURATED_INSTRUCTIONS` directly to prove the curated
 * branch is the one populated.
 */
import { WARMUP_CURATED_INSTRUCTIONS, getMistakes } from '@/lib/exerciseMistakes';
import { WARMUP_EXERCISES } from '@/lib/warmupDatabase';

describe('warmup curated instructions coverage', () => {
  const warmupIds = WARMUP_EXERCISES.map((w) => w.id);

  it('parses every warmup id from warmupDatabase', () => {
    expect(warmupIds.length).toBeGreaterThan(40);
    expect(warmupIds.every((id) => id.startsWith('wu-'))).toBe(true);
  });

  it('has a hand-curated entry with ≥ 3 steps for every warmup', () => {
    const missing: string[] = [];
    const thin: Array<{ id: string; count: number }> = [];
    for (const id of warmupIds) {
      const entry = WARMUP_CURATED_INSTRUCTIONS[id];
      if (!entry) {
        missing.push(id);
        continue;
      }
      if (entry.length < 3) {
        thin.push({ id, count: entry.length });
      }
    }
    expect({ missing, thin }).toEqual({ missing: [], thin: [] });
  });

  it('routes every warmup through the curated branch at runtime', () => {
    // Independently of the map-level check above, prove that
    // getMistakes() actually returns the curated content (and not e.g. a
    // wger fallback) for every warmup id. We do this by comparing the
    // returned items to the curated entry byte-for-byte.
    for (const id of warmupIds) {
      const result = getMistakes(id, 'chest');
      const curated = WARMUP_CURATED_INSTRUCTIONS[id];
      expect(result.items).toEqual(curated);
      // Source tag should be the violet "FORM TIPS" variant — not the red
      // WATCH OUT (reserved for top-20 lift mistakes) and not 'none'.
      expect(result.source).not.toBe('curated');
      expect(result.source).not.toBe('none');
    }
  });
});
