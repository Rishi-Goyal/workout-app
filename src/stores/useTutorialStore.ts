/**
 * useTutorialStore — v4.2.0 Theme D.
 *
 * Tracks which Floor 1 coach-mark steps the user has dismissed. Persisted
 * to AsyncStorage so a force-quit mid-tutorial doesn't replay the same
 * tooltip on the next launch.
 *
 * Step IDs (1–5) match the order they appear in the user's first dungeon:
 *   1. Mobs intro     — home, Mobs room header
 *   2. Hold timer     — active-quest screen, when first warmup opens
 *   3. Set start      — active-quest screen, lift quest, before set 1
 *   4. Rest period    — active-quest screen, after set 1 completes
 *   5. Mark complete  — active-quest screen, end-of-quest CTA
 *
 * Coach-marks read `isStepDismissed(id)` and consumers call `dismissStep(id)`
 * on tap. The full set is wiped via `resetTutorial()` after Floor 1 finalize
 * so a profile reset re-enables the tour.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TutorialStepId = 1 | 2 | 3 | 4 | 5;

interface TutorialStore {
  /** Set of step IDs the user has dismissed during the tutorial run. */
  dismissedSteps: TutorialStepId[];
  isStepDismissed: (id: TutorialStepId) => boolean;
  dismissStep: (id: TutorialStepId) => void;
  resetTutorial: () => void;
}

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set, get) => ({
      dismissedSteps: [],
      isStepDismissed: (id) => get().dismissedSteps.includes(id),
      dismissStep: (id) => {
        const current = get().dismissedSteps;
        if (current.includes(id)) return;
        set({ dismissedSteps: [...current, id] });
      },
      resetTutorial: () => set({ dismissedSteps: [] }),
    }),
    {
      name: 'dungeon-tutorial',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({ dismissedSteps: state.dismissedSteps }),
    },
  ),
);

/**
 * Plain-language copy for each coach-mark step. Exported separately so
 * the CoachMark component can read it without coupling to the store
 * shape, and tests can assert the dictionary directly.
 */
export const COACH_MARK_COPY: Record<TutorialStepId, { title: string; body: string }> = {
  1: {
    title: 'These are your Mobs',
    body: 'Light stretches to wake up your muscles before the main fight. Tap one to begin.',
  },
  2: {
    title: 'Hold for the full time',
    body: "Don't rush — wait for the timer to hit zero, then tap Done.",
  },
  3: {
    title: 'Tap to start your set',
    body: 'When you\'re ready to work, hit Start Set. The timer counts your rest after each one.',
  },
  4: {
    title: 'Rest period — drink water',
    body: 'Rest is part of the work. Catch your breath; the next set unlocks automatically.',
  },
  5: {
    title: 'Mark complete when done',
    body: 'Hit Save & Finish to log your sets and earn your XP. The dungeon remembers everything.',
  },
};
