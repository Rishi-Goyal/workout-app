/**
 * Shared quest display helpers — used in History and SessionSummary.
 */
import type { Quest } from '@/types';

export const STATUS_ICON: Record<string, string> = {
  complete:      '✅',
  half_complete: '⚠️',
  skipped:       '⏭️',
  pending:       '⏳',
};

/** One-line summary of what was logged for a quest. Examples:
 *   - Lift, 3 sets logged 10/9/8 reps:    "3 sets · 10 / 9 / 8 reps"
 *   - Hold drill, 2 sets of 30s/25s:      "2 sets · 30s / 25s"
 *   - Lift, no logs yet:                  "3 × 10 reps"
 *   - Hold drill, no logs yet:            "1 × 30s hold"
 *
 * v4.5.2 QA P1.5 — previously produced "1s · 0 reps" for a 1-set hold
 * drill because `${loggedSets.length}s` was a confusing "set-count plus
 * letter-s" suffix that read as "1 second", and hold-drill set logs have
 * `repsCompleted: 0` (time goes in `timeCompleted`).
 */
export function exerciseSummaryLine(q: Quest): string {
  const isHold = !!q.holdSeconds;
  if (q.loggedSets && q.loggedSets.length > 0) {
    const setsWord = q.loggedSets.length === 1 ? 'set' : 'sets';
    if (isHold) {
      const holds = q.loggedSets.map((s) => `${s.timeCompleted ?? 0}s`).join(' / ');
      return `${q.loggedSets.length} ${setsWord} · ${holds}`;
    }
    const reps = q.loggedSets.map((s) => s.repsCompleted).join(' / ');
    return `${q.loggedSets.length} ${setsWord} · ${reps} reps`;
  }
  return isHold
    ? `${q.sets} × ${q.holdSeconds}s hold`
    : `${q.sets} × ${q.reps} reps`;
}
