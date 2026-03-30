/**
 * Shared date utilities — used across History, Stats, and Home screens.
 */

/** Returns "Today", "Yesterday", or "Nd ago" for an ISO timestamp. */
export function relativeDate(isoString: string): string {
  const diffDays = daysSince(isoString);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

/** Number of full calendar days since an ISO timestamp. */
export function daysSince(isoString: string): number {
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 86_400_000);
}

/** True if the ISO timestamp falls within the last `n` days (rolling window). */
export function isWithinDays(isoString: string, n: number): boolean {
  return Date.now() - new Date(isoString).getTime() < n * 86_400_000;
}
