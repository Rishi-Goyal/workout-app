import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, Character, MuscleGroup, Equipment } from '../types';
import type { WorkoutSplitType } from '../lib/exerciseDatabase';
import { createCharacter, applyLevelUpStats, deriveClass } from '../lib/character';
import {
  applyXP,
  computeConsistencyPenaltyForGap,
  recoverConsistency,
} from '../lib/xp';
import {
  type MuscleXP,
  DEFAULT_MUSCLE_XP,
  seedMuscleXPFromStrengths,
  calculateMuscleXP,
  applyMuscleXP,
} from '../lib/muscleXP';
import { fetchLatestVersion } from '../lib/versionCheck';
import type { QuestDifficulty } from '../types';
import { getMuscleFatigue, EXERCISE_MAP } from '../lib/exerciseDatabase';
import { useAdaptationStore } from './useAdaptationStore';
import { useWeeklyGoalStore } from './useWeeklyGoalStore';

interface MuscleXPResult {
  levelUps: Array<{ muscle: MuscleGroup; newLevel: number }>;
}

interface ProfileStore {
  profile: UserProfile | null;
  character: Character | null;
  muscleXP: MuscleXP;
  preferredSplit: WorkoutSplitType | null;
  // Version checking (transient — not persisted, re-checked each launch)
  latestVersion: string | null;
  checkForUpdate: () => Promise<void>;
  setProfile: (profile: UserProfile) => void;
  setPreferredSplit: (split: WorkoutSplitType | null) => void;
  updateMuscleStrength: (muscle: MuscleGroup, value: number) => void;
  awardXP: (amount: number) => { leveledUp: boolean; levelsGained: number };
  awardMuscleXP: (
    primaryMuscles: MuscleGroup[],
    secondaryMuscles: MuscleGroup[],
    difficulty: QuestDifficulty,
    completion: 'complete' | 'half_complete',
    exerciseId?: string,
  ) => MuscleXPResult;
  incrementFloorsCleared: () => void;
  /**
   * Idempotent — raise character.consistencyPenalty if the gap since the last
   * session implies a higher value. Call on Home mount with the most recent
   * session's ISO timestamp (or null for a fresh user). Never lowers.
   */
  syncConsistencyPenalty: (lastSessionIso: string | null) => void;
  /**
   * Call after a session finalizes — pulls consistencyPenalty back toward zero
   * by CONSISTENCY_RECOVER_RATE. Floor of 0.
   */
  recoverConsistencyOnSession: () => void;
  /**
   * v4.1.0 A6 — prune equipment the user claims they don't have. Used by the
   * "I don't have this kit" swap action so the generator stops re-suggesting
   * exercises for kit the user has off-loaded. Reversible from Settings by
   * setting the profile again.
   */
  removeEquipment: (items: Equipment[]) => void;
  /**
   * v4.1.0 C4 — bump character.mobilityScore by `delta`. Warmup/cooldown
   * drills pass 0.5 per completion; rest-day flows pass 2. Clamped to [0, 100].
   */
  awardMobilityScore: (delta: number) => void;
  /**
   * v4.1.0 C4 — decay mobilityScore based on days since last mobility
   * activity. Lighter curve than consistency decay; -0.25 per 7 days. Call
   * this idempotently on Home mount alongside syncConsistencyPenalty.
   */
  syncMobilityDecay: (lastMobilityIso: string | null) => void;
  resetProfile: () => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profile: null,
      character: null,
      muscleXP: DEFAULT_MUSCLE_XP,
      preferredSplit: null,
      latestVersion: null,

      checkForUpdate: async () => {
        // Silently fetch latest version from GitHub; ignore all errors
        try {
          const latest = await fetchLatestVersion();
          if (latest) set({ latestVersion: latest });
        } catch {
          // Network error — not a problem, banner simply won't show
        }
      },

      setProfile: (profile) => {
        const isNew = get().profile === null;
        const existing = get().character;
        const dims = {
          cardioMinutes: profile.cardioMinutes ?? 0,
          mobilityScore: profile.mobilityScore ?? 5,
          gripScore: profile.gripScore ?? 5,
        };
        set({
          profile,
          character: existing
            ? { ...existing, ...dims }
            : createCharacter(profile.goal, dims),
          ...(isNew && { muscleXP: seedMuscleXPFromStrengths(profile.muscleStrengths) }),
        });
      },

      setPreferredSplit: (split) => set({ preferredSplit: split }),

      updateMuscleStrength: (muscle, value) => {
        const p = get().profile;
        if (!p) return;
        set({ profile: { ...p, muscleStrengths: { ...p.muscleStrengths, [muscle]: value } } });
      },

      awardXP: (amount) => {
        const character = get().character;
        if (!character) return { leveledUp: false, levelsGained: 0 };
        const { character: updated, leveledUp, levelsGained } = applyXP(character, amount);
        const withStats = leveledUp ? applyLevelUpStats(updated, levelsGained) : updated;
        set({ character: withStats });
        return { leveledUp, levelsGained };
      },

      awardMuscleXP: (primaryMuscles, secondaryMuscles, difficulty, completion, exerciseId) => {
        const current = get().muscleXP;
        const awards = calculateMuscleXP(primaryMuscles, secondaryMuscles, difficulty, completion);
        // Look up exercise-specific fatigue if exerciseId provided
        const exercise = exerciseId ? EXERCISE_MAP[exerciseId] : undefined;
        const fatigue = exercise ? getMuscleFatigue(exercise) : undefined;
        const { muscleXP: updated, levelUps } = applyMuscleXP(current, awards, fatigue);

        // Re-derive class from the updated muscle distribution after every session
        const character = get().character;
        const newClass = character
          ? deriveClass(updated, {
              cardioMinutes: character.cardioMinutes ?? 0,
              mobilityScore: character.mobilityScore ?? 5,
              gripScore: character.gripScore ?? 5,
            })
          : 'Awakened Novice' as const;
        const updatedCharacter = character
          ? { ...character, class: newClass }
          : character;

        set({ muscleXP: updated, character: updatedCharacter });
        return { levelUps };
      },

      incrementFloorsCleared: () => {
        const c = get().character;
        if (!c) return;
        set({ character: { ...c, floorsCleared: c.floorsCleared + 1 } });
      },

      syncConsistencyPenalty: (lastSessionIso) => {
        const c = get().character;
        if (!c) return;
        const current = c.consistencyPenalty ?? 0;
        const next = computeConsistencyPenaltyForGap(current, lastSessionIso);
        if (next !== current) {
          set({ character: { ...c, consistencyPenalty: next } });
        }
      },

      recoverConsistencyOnSession: () => {
        const c = get().character;
        if (!c) return;
        const current = c.consistencyPenalty ?? 0;
        const next = recoverConsistency(current);
        if (next !== current) {
          set({ character: { ...c, consistencyPenalty: next } });
        }
      },

      removeEquipment: (items) => {
        const p = get().profile;
        if (!p) return;
        const remove = new Set(items);
        const next = p.equipment.filter((e) => !remove.has(e));
        // Leave bodyweight_only in the set even if nothing else remains —
        // generator always needs at least one option to iterate over.
        const hasAny = next.length > 0;
        set({
          profile: {
            ...p,
            equipment: hasAny ? next : ['bodyweight_only'],
          },
        });
      },

      // v4.1.0 C4 — mobilityScore award/decay.
      awardMobilityScore: (delta) => {
        const c = get().character;
        if (!c) return;
        const cur = c.mobilityScore ?? 5;
        const next = Math.max(0, Math.min(100, cur + delta));
        if (next === cur) return;
        set({ character: { ...c, mobilityScore: next } });
      },
      syncMobilityDecay: (lastMobilityIso) => {
        if (!lastMobilityIso) return;
        const c = get().character;
        if (!c) return;
        const days = Math.floor(
          (Date.now() - new Date(lastMobilityIso).getTime()) / (86_400_000),
        );
        if (days < 7) return;
        const steps = Math.floor(days / 7);
        const cur = c.mobilityScore ?? 5;
        const decayed = Math.max(0, cur - steps * 0.25);
        if (decayed === cur) return;
        set({ character: { ...c, mobilityScore: decayed } });
      },

      resetProfile: () => {
        set({ profile: null, character: null, muscleXP: DEFAULT_MUSCLE_XP, preferredSplit: null });
        // Clear all dependent stores so no stale data persists after a profile wipe
        useAdaptationStore.getState().clearAllAdaptations();
        useWeeklyGoalStore.getState().resetAll();
      },
    }),
    {
      name: 'dungeon-profile',
      storage: createJSONStorage(() => AsyncStorage),
      version: 6,
      migrate: (persistedState: unknown, _fromVersion: number) => {
        const s = (persistedState ?? {}) as Record<string, unknown>;
        if (!s.muscleXP) s.muscleXP = DEFAULT_MUSCLE_XP;
        if (s.character && typeof s.character === 'object') {
          const c = s.character as Record<string, unknown>;
          if (c.floorsCleared === undefined) c.floorsCleared = 0;
          // v5 → v6: add new v4 dimensions + streak fields
          if (c.cardioMinutes === undefined) c.cardioMinutes = 0;
          if (c.mobilityScore === undefined) c.mobilityScore = 5;
          if (c.gripScore === undefined) c.gripScore = 5;
          // v4.1.0: character.freezeTokens removed — source of truth is
          // useWeeklyGoalStore.freezesAvailable. Migration-era values are dropped.
          if ('freezeTokens' in c) delete c.freezeTokens;
          if (c.consistencyPenalty === undefined) c.consistencyPenalty = 0;
          // Reset any v3 class name — merge() will re-derive
          const legacyClasses = ['Wanderer','Mirror Knight','Phantom','Earthshaker','Iron Monk','Iron Knight','Colossus','Berserker'];
          if (typeof c.class === 'string' && legacyClasses.includes(c.class)) {
            c.class = 'Awakened Novice';
          }
        }
        // v2 → v3: ensure profile has weightUnit (default 'kg')
        if (s.profile && typeof s.profile === 'object') {
          const p = s.profile as Record<string, unknown>;
          if (!p.weightUnit) p.weightUnit = 'kg';
        }
        // v3 → v4: add lastTrained to each muscle entry (undefined = never trained)
        if (s.muscleXP && typeof s.muscleXP === 'object') {
          const mxp = s.muscleXP as Record<string, Record<string, unknown>>;
          for (const key of Object.keys(mxp)) {
            if (mxp[key] && mxp[key].lastTrained === undefined) {
              mxp[key].lastTrained = undefined;
            }
          }
        }
        // v4 → v5: add lastFatigueScore to each muscle entry
        if (s.muscleXP && typeof s.muscleXP === 'object') {
          const mxp = s.muscleXP as Record<string, Record<string, unknown>>;
          for (const key of Object.keys(mxp)) {
            if (mxp[key] && mxp[key].lastFatigueScore === undefined) {
              mxp[key].lastFatigueScore = undefined;
            }
          }
        }
        return s as unknown as Partial<ProfileStore>;
      },
      merge: (persistedState: unknown, currentState: ProfileStore): ProfileStore => {
        const s = (persistedState ?? {}) as Partial<ProfileStore>;
        const mergedMuscleXP = { ...currentState.muscleXP, ...(s.muscleXP ?? {}) };

        // Always re-derive class so old stored values are corrected
        const ch = (s.character ?? currentState.character) as Character | null;
        const dims = {
          cardioMinutes: ch?.cardioMinutes ?? 0,
          mobilityScore: ch?.mobilityScore ?? 5,
          gripScore: ch?.gripScore ?? 5,
        };
        const derivedClass = deriveClass(mergedMuscleXP, dims);
        const mergedCharacter = s.character
          ? { ...s.character, class: derivedClass }
          : currentState.character;

        return {
          ...currentState,
          ...s,
          muscleXP: mergedMuscleXP,
          character: mergedCharacter,
        };
      },
      partialize: (state: ProfileStore) => ({
        profile: state.profile,
        character: state.character,
        muscleXP: state.muscleXP,
        preferredSplit: state.preferredSplit,
        // latestVersion intentionally excluded — re-checked on every launch
      }),
    }
  )
);
