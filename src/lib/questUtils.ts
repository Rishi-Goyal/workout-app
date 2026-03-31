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

/** One-line summary of what was logged for a quest (e.g. "3s · 10/9/8 reps"). */
export function exerciseSummaryLine(q: Quest): string {
  if (q.loggedSets && q.loggedSets.length > 0) {
    const reps = q.loggedSets.map((s) => s.repsCompleted).join('/');
    return `${q.loggedSets.length}s · ${reps} reps`;
  }
  return `${q.sets}×${q.reps}`;
}
