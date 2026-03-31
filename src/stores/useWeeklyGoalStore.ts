/**
 * useWeeklyGoalStore — tracks weekly workout targets, streaks, and streak freezes.
 *
 * Streak model
 * ------------
 * A "streak" counts consecutive calendar weeks (Mon–Sun) where the user met
 * their weekly target.  Only the PREVIOUS completed week is evaluated on app
 * launch — the current in-progress week is never penalised.
 *
 * Freeze mechanic
 * ---------------
 * Users start with 1 freeze.  Every `freezeEarnedEvery` weeks of consecutive
 * goal completion, they earn another (max 3 stored at once).  When a week is
 * missed, the UI (WeeklyGoalWidget) reads `pendingMissedWeek` and presents the
 * freeze-or-reset choice; calling `consumeFreeze()` / `breakStreak()` resolves it.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getISOWeekKey,
  prevWeekKey,
  countSessionsInWeek,
} from '@/lib/weeklyGoalUtils';
import type { DungeonSession } from '@/types';

export interface WeeklyGoalSettings {
  /** Number of sessions required per week. */
  targetWorkoutsPerWeek: number;
  /** How many consecutive goal-met weeks earn a freeze. */
  freezeEarnedEvery: number;
}

interface WeeklyGoalState {
  currentStreak: number;
  longestStreak: number;
  /** "YYYY-Www" of the last week we evaluated (so we don't double-evaluate). */
  lastEvaluatedWeek: string | null;
  /** If non-null, last week was missed and the UI should offer a freeze. */
  pendingMissedWeek: string | null;
  freezesAvailable: number;
  frozenWeeks: string[];
  settings: WeeklyGoalSettings;

  // ── Actions ──────────────────────────────────────────────────────────────
  setWeeklyTarget: (n: number) => void;

  /**
   * Called on app launch and after every finalized session.
   * Evaluates the most-recently-completed week (not the current one) and
   * updates the streak accordingly.  Idempotent — safe to call multiple times
   * per week.
   */
  evaluateWeek: (sessions: DungeonSession[]) => void;

  /** User accepts a freeze to protect their streak after a missed week. */
  consumeFreeze: () => void;

  /** User declines the freeze — streak resets to 0. */
  breakStreak: () => void;

  /** Called by profile reset. */
  resetAll: () => void;
}

const DEFAULT_SETTINGS: WeeklyGoalSettings = {
  targetWorkoutsPerWeek: 3,
  freezeEarnedEvery: 4,
};

export const useWeeklyGoalStore = create<WeeklyGoalState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastEvaluatedWeek: null,
      pendingMissedWeek: null,
      freezesAvailable: 1,
      frozenWeeks: [],
      settings: DEFAULT_SETTINGS,

      setWeeklyTarget: (n) =>
        set((s) => ({ settings: { ...s.settings, targetWorkoutsPerWeek: Math.min(7, Math.max(1, n)) } })),

      evaluateWeek: (sessions) => {
        const state = get();
        const currentWeekKey = getISOWeekKey(new Date());
        const lastWeekKey = prevWeekKey(currentWeekKey);

        // Idempotency check — only evaluate the previous week once
        if (state.lastEvaluatedWeek === lastWeekKey) return;

        // Brand-new user: no sessions and never evaluated — skip silently so we
        // don't fire a "goal missed" modal immediately after onboarding.
        if (sessions.length === 0 && state.lastEvaluatedWeek === null) {
          set({ lastEvaluatedWeek: lastWeekKey });
          return;
        }

        const count = countSessionsInWeek(sessions, lastWeekKey);
        const target = state.settings.targetWorkoutsPerWeek;

        if (count >= target) {
          // Goal met — increment streak
          const newStreak = state.currentStreak + 1;
          const newLongest = Math.max(state.longestStreak, newStreak);

          // Earn a freeze every N consecutive goal-met weeks
          const earnedFreeze =
            newStreak % state.settings.freezeEarnedEvery === 0 && newStreak > 0;

          set({
            currentStreak: newStreak,
            longestStreak: newLongest,
            lastEvaluatedWeek: lastWeekKey,
            pendingMissedWeek: null,
            freezesAvailable: earnedFreeze
              ? Math.min(3, state.freezesAvailable + 1)
              : state.freezesAvailable,
          });
        } else {
          // Goal missed — set pending so UI can ask about the freeze
          set({
            lastEvaluatedWeek: lastWeekKey,
            pendingMissedWeek: lastWeekKey,
          });
        }
      },

      consumeFreeze: () => {
        const state = get();
        if (!state.pendingMissedWeek || state.freezesAvailable <= 0) return;
        set({
          pendingMissedWeek: null,
          freezesAvailable: state.freezesAvailable - 1,
          frozenWeeks: [...state.frozenWeeks, state.pendingMissedWeek],
          // Streak is preserved — don't increment, don't reset
        });
      },

      breakStreak: () => {
        set({
          currentStreak: 0,
          pendingMissedWeek: null,
        });
      },

      resetAll: () =>
        set({
          currentStreak: 0,
          longestStreak: 0,
          lastEvaluatedWeek: null,
          pendingMissedWeek: null,
          freezesAvailable: 1,
          frozenWeeks: [],
          settings: DEFAULT_SETTINGS,
        }),
    }),
    {
      name: 'dungeon-weekly-goal',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({
        currentStreak:    state.currentStreak,
        longestStreak:    state.longestStreak,
        lastEvaluatedWeek: state.lastEvaluatedWeek,
        pendingMissedWeek: state.pendingMissedWeek,
        freezesAvailable: state.freezesAvailable,
        frozenWeeks:      state.frozenWeeks,
        settings:         state.settings,
      }),
      migrate: (persisted: unknown, _v: number) => {
        const s = (persisted ?? {}) as Record<string, unknown>;
        if (typeof s.settings !== 'object' || s.settings === null) {
          s.settings = DEFAULT_SETTINGS;
        }
        if (typeof s.freezesAvailable !== 'number') s.freezesAvailable = 1;
        if (!Array.isArray(s.frozenWeeks)) s.frozenWeeks = [];
        return s as Partial<WeeklyGoalState>;
      },
    },
  ),
);
