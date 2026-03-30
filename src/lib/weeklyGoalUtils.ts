/**
 * weeklyGoalUtils — pure date helpers for the weekly goal system.
 *
 * All weeks are Mon–Sun ISO calendar weeks (consistent with how most
 * gym-goers plan their training schedule, and with a fixed reset boundary
 * the user can reason about).
 */
import type { DungeonSession } from '@/types';

/**
 * Returns an ISO-style week key: "YYYY-Www" (e.g. "2026-W13").
 * Computed in local time so the boundary always falls at local midnight Monday.
 */
export function getISOWeekKey(date: Date): string {
  // Clone so we don't mutate the input
  const d = new Date(date);
  // Shift to nearest Thursday (ISO week rule: a week belongs to the year of its Thursday)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86_400_000 + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

/** Returns the Monday of the given week key at local midnight. */
export function getMondayOfWeek(weekKey: string): Date {
  const [yearStr, wStr] = weekKey.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(wStr, 10);

  // Jan 4 is always in week 1 (ISO rule)
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // 1=Mon … 7=Sun
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (dayOfWeek - 1) + (week - 1) * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Returns the Sunday of the given week key at end-of-day. */
export function getSundayOfWeek(weekKey: string): Date {
  const monday = getMondayOfWeek(weekKey);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

/** Returns the week key for the week immediately before the given one. */
export function prevWeekKey(weekKey: string): string {
  const monday = getMondayOfWeek(weekKey);
  monday.setDate(monday.getDate() - 7);
  return getISOWeekKey(monday);
}

/** True if the session's completed date falls within the given week. */
export function isSessionInWeek(session: DungeonSession, weekKey: string): boolean {
  if (session.status !== 'completed') return false;
  const ts = new Date(session.completedAt ?? session.startedAt).getTime();
  const mon = getMondayOfWeek(weekKey).getTime();
  const sun = getSundayOfWeek(weekKey).getTime();
  return ts >= mon && ts <= sun;
}

/** Count completed sessions in a given week. */
export function countSessionsInWeek(sessions: DungeonSession[], weekKey: string): number {
  return sessions.filter((s) => isSessionInWeek(s, weekKey)).length;
}

/**
 * Returns a Mon–Sun boolean array (index 0 = Monday) for the current week:
 * true if the user completed at least one session on that day.
 */
export function getDaysTrainedThisWeek(sessions: DungeonSession[]): boolean[] {
  const today = new Date();
  const weekKey = getISOWeekKey(today);
  const monday = getMondayOfWeek(weekKey);
  const result: boolean[] = Array(7).fill(false);

  for (const session of sessions) {
    if (!isSessionInWeek(session, weekKey)) continue;
    const d = new Date(session.completedAt ?? session.startedAt);
    const dayIndex = (d.getDay() + 6) % 7; // 0=Mon … 6=Sun
    result[dayIndex] = true;
  }
  return result;
}
