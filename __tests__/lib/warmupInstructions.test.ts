/**
 * v4.6.0 PR 2/4 — coverage guard for hand-curated warmup instructions.
 *
 * Asserts that every `wu-*` ID in warmupDatabase.ts has a corresponding
 * entry in WARMUP_CURATED_INSTRUCTIONS with ≥ 3 steps. This prevents a
 * regression where a future warmup is added without its hand-authored
 * content, falling back to a potentially-wrong free-exercise-db mapping
 * (which was the Cat-Cow bug QA flagged on v4.5.2).
 *
 * Resolution order in getMistakes() is: curated mistakes → (warmup
 * IDs only) WARMUP_CURATED_INSTRUCTIONS → free-exercise-db → wger →
 * cue → none. Since the curated map wins for warmups, every wu-* ID
 * must have an entry here or risk shipping wrong instructions.
 */
import { getMistakes } from '@/lib/exerciseMistakes';
import { WARMUP_EXERCISES } from '@/lib/warmupDatabase';

describe('warmup curated instructions coverage', () => {
  const warmupIds = WARMUP_EXERCISES.map((w) => w.id);

  it('parses every warmup id from warmupDatabase', () => {
    expect(warmupIds.length).toBeGreaterThan(40);
    expect(warmupIds.every((id) => id.startsWith('wu-'))).toBe(true);
  });

  it('returns curated content with at least 3 instructions for every warmup', () => {
    const thin: Array<{ id: string; count: number }> = [];
    for (const id of warmupIds) {
      const result = getMistakes(id, 'chest'); // muscle arg is unused
      if (result.items.length < 3) {
        thin.push({ id, count: result.items.length });
      }
    }
    expect(thin).toEqual([]);
  });

  it('returns non-curated source labels for warmups (form-tips violet, not red watch-out)', () => {
    for (const id of warmupIds) {
      const result = getMistakes(id, 'chest');
      // `'curated'` is reserved for the red WATCH OUT card on top-20 lifts;
      // warmups should always render as violet FORM TIPS.
      expect(result.source).not.toBe('curated');
      expect(result.source).not.toBe('none');
    }
  });
});
