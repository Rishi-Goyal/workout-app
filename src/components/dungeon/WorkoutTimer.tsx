/**
 * WorkoutTimer — quest-style set-by-set state machine with rest countdown + weight logging.
 *
 * Flow: idle (Quest Briefing) → active (per-set) → resting → done (XP breakdown + accept)
 * States: idle → active → resting → done
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '@/lib/constants';
import PressableButton from '@/components/ui/PressableButton';
import { formatWeight } from '@/lib/weights';
import { calculateSetBonus, calculateIsometricBonus, calculateSetXP } from '@/lib/muscleXP';
import {
  showWorkoutNotification,
  showRestInProgressNotification,
  scheduleRestCompleteNotification,
  cancelRestNotification,
} from '@/lib/workoutNotification';
import { useSessionStore } from '@/stores/useSessionStore';
import type { SetLog } from '@/types';
import type { ExerciseLastLog } from '@/stores/useHistoryStore';

type Phase = 'idle' | 'active' | 'resting' | 'done';

interface WorkoutTimerProps {
  sets: number;
  reps: string;
  holdSeconds?: number; // set for isometric/static exercises
  restSeconds: number;
  suggestedWeight?: number | 'bodyweight';
  weightUnit?: 'kg' | 'lbs';
  lastSessionLog?: ExerciseLastLog | null;
  /** Full quest XP reward — used for per-set XP display in done phase */
  baseXP: number;
  /** Exercise name shown in background rest notifications. */
  exerciseName: string;
  /** Quest ID passed to the rest-complete notification for rep logging. */
  questId: string;
  onComplete: (loggedSets: SetLog[]) => void;
  onSkip: () => void;
}

const RING_RADIUS = 44;
const CIRCUM = 2 * Math.PI * RING_RADIUS;

function RingTimer({ progress, color }: { progress: number; color: string }) {
  const offset = CIRCUM * (1 - progress);
  return (
    <Svg width={110} height={110} viewBox="0 0 110 110">
      <Circle cx={55} cy={55} r={RING_RADIUS} stroke="#2a2035" strokeWidth={8} fill="none" />
      <Circle cx={55} cy={55} r={RING_RADIUS} stroke={color} strokeWidth={8} fill="none"
        strokeDasharray={`${CIRCUM}`} strokeDashoffset={`${offset}`}
        strokeLinecap="round" rotation="-90" origin="55, 55"
      />
    </Svg>
  );
}

function WeightSelector({
  value,
  onChange,
  unit = 'kg',
}: {
  value: number | 'bodyweight';
  onChange: (v: number | 'bodyweight') => void;
  unit?: 'kg' | 'lbs';
}) {
  const isBW = value === 'bodyweight';

  function adjust(delta: number) {
    if (isBW) return;
    const step = unit === 'lbs' ? 5 : 2.5;
    onChange(Math.max(0, (value as number) + delta * step));
  }

  return (
    <View style={wStyles.row}>
      <TouchableOpacity
        style={wStyles.btn}
        onPress={() => adjust(-1)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Decrease weight"
        accessibilityHint="Decreases the weight by one step"
      >
        <Text style={wStyles.btnText}>−</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[wStyles.display, isBW && wStyles.displayBW]}
        onPress={() => onChange(isBW ? 20 : 'bodyweight')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={isBW ? 'Change to weight' : 'Change to bodyweight'}
        accessibilityHint="Toggles between entering a specific weight or using bodyweight"
      >
        <Text style={[wStyles.weightText, isBW && wStyles.weightTextBW]}>
          {isBW ? '🧍 BW' : `${value} ${unit}`}
        </Text>
        <Text style={wStyles.tapHint}>{isBW ? 'tap for weight' : 'tap for BW'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={wStyles.btn}
        onPress={() => adjust(1)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Increase weight"
        accessibilityHint="Increases the weight by one step"
      >
        <Text style={wStyles.btnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const wStyles = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(99,102,241,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)' },
  btnText:     { color: COLORS.gold, fontSize: 22, fontWeight: '700', lineHeight: 28 },
  display:     { flex: 1, alignItems: 'center', backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
  displayBW:   { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)' },
  weightText:  { fontSize: 18, fontWeight: '800', color: COLORS.gold },
  weightTextBW:{ color: COLORS.jade },
  tapHint:     { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
});

/** Icon for a set's result in the done-phase breakdown */
function getSetIcon(actual: number, target: number, wasSkipped: boolean): string {
  if (wasSkipped || actual === 0) return '—';
  if (actual > target) return '🔥';
  if (actual >= target) return '✓';
  return '⚠️';
}

export default function WorkoutTimer({
  sets, reps, holdSeconds,
  restSeconds,
  suggestedWeight = 'bodyweight',
  weightUnit = 'kg',
  lastSessionLog,
  baseXP,
  exerciseName,
  questId,
  onComplete, onSkip,
}: WorkoutTimerProps) {
  const recommendedReps              = parseInt(reps, 10) || 0;
  const [phase, setPhase]            = useState<Phase>('idle');
  const [currentSet, setCurrentSet]  = useState(1);
  const [restLeft, setRestLeft]      = useState(restSeconds);
  const [holdLeft, setHoldLeft]      = useState(holdSeconds ?? 0);
  // Extra hold seconds after the isometric target is reached (for bonus XP)
  const [holdComplete, setHoldComplete] = useState(false);
  const [extraHoldSec, setExtraHoldSec] = useState(0);
  // Whether the user has pressed "Start Hold" — prevents auto-start of isometric timer
  const [holdStarted, setHoldStarted] = useState(false);
  const [currentWeight, setWeight]   = useState<number | 'bodyweight'>(suggestedWeight);
  // Actual reps the user logged for this set (adjustable before marking done)
  const [repsInput, setRepsInput]    = useState(recommendedReps);
  const [loggedSets, setLoggedSets]  = useState<SetLog[]>([]);
  // Editable copy of loggedSets shown in the done phase — user can adjust before accepting
  const [editedSets, setEditedSets]  = useState<SetLog[]>([]);
  // Bonus accumulated across all sets this exercise (shown in rest + done phases)
  const [totalBonus, setTotalBonus]  = useState(0);
  // Bonus for the most recently completed set (shown during rest)
  const [lastSetBonus, setLastSetBonus] = useState(0);
  // Track set numbers the user explicitly skipped (logged as 0 reps)
  const [skippedSets, setSkippedSets] = useState<Set<number>>(new Set());

  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const extraHoldRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdElapsedRef = useRef(0);

  const pulse = useSharedValue(1);

  const clearTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const clearExtraHold = () => {
    if (extraHoldRef.current) clearInterval(extraHoldRef.current);
  };

  /** Log the current set with actual reps/time and calculate bonus XP. */
  function logCurrentSet(actualReps: number = repsInput, timeHeld?: number): SetLog[] {
    let bonus = 0;
    if (timeHeld !== undefined && holdSeconds) {
      bonus = calculateIsometricBonus(timeHeld, holdSeconds);
    } else {
      bonus = calculateSetBonus(actualReps, recommendedReps);
    }

    const entry: SetLog = {
      setNumber: currentSet,
      repsCompleted: holdSeconds ? 0 : actualReps,
      ...(timeHeld !== undefined && { timeCompleted: timeHeld }),
      weight: currentWeight,
      ...(bonus > 0 && { bonusXPEarned: bonus }),
    };
    const updated = [...loggedSets, entry];
    setLoggedSets(updated);
    setLastSetBonus(bonus);
    setTotalBonus((prev) => prev + bonus);
    return updated;
  }

  /** Log 0 reps for the current set and advance to rest/done. */
  const skipCurrentSet = useCallback(() => {
    const entry: SetLog = {
      setNumber: currentSet,
      repsCompleted: 0,
      weight: currentWeight,
    };
    const updated = [...loggedSets, entry];
    setLoggedSets(updated);
    setSkippedSets(prev => new Set([...prev, currentSet]));
    setLastSetBonus(0);

    if (currentSet >= sets) {
      setPhase('done');
    } else {
      setPhase('resting');
      setRestLeft(restSeconds);
      let r = restSeconds;
      clearTimer();
      intervalRef.current = setInterval(() => {
        r -= 1;
        setRestLeft(r);
        if (r <= 0) {
          clearTimer();
          setCurrentSet(s => s + 1);
          setRepsInput(recommendedReps);
          setLastSetBonus(0);
          setPhase('active');
        }
      }, 1000);
    }
  }, [currentSet, sets, restSeconds, loggedSets, currentWeight, recommendedReps]);

  // Start hold countdown for static exercises
  const startHold = useCallback(() => {
    if (!holdSeconds) return;
    setHoldLeft(holdSeconds);
    setHoldComplete(false);
    setExtraHoldSec(0);
    holdElapsedRef.current = 0;
    let remaining = holdSeconds;
    clearTimer();
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      holdElapsedRef.current += 1;
      setHoldLeft(remaining);
      if (remaining <= 0) {
        clearTimer();
        setHoldComplete(true);
        let extra = 0;
        extraHoldRef.current = setInterval(() => {
          extra += 1;
          setExtraHoldSec(extra);
        }, 1000);
      }
    }, 1000);
  }, [currentSet, sets, restSeconds, loggedSets, currentWeight, holdSeconds]);

  const startRest = useCallback(() => {
    const updated = logCurrentSet(repsInput);
    setPhase('resting');
    setRestLeft(restSeconds);

    // Fire background notifications so the user can track rest from outside the app
    showRestInProgressNotification(exerciseName, currentSet, sets, restSeconds);
    if (currentSet < sets) {
      scheduleRestCompleteNotification(
        exerciseName,
        currentSet + 1,
        sets,
        questId,
        reps,
        restSeconds,
      );
    }

    let remaining = restSeconds;
    clearTimer();
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setRestLeft(remaining);
      if (remaining <= 0) {
        clearTimer();
        cancelRestNotification();
        if (currentSet >= sets) {
          setPhase('done');
        } else {
          setCurrentSet(s => s + 1);
          setRepsInput(recommendedReps);
          setLastSetBonus(0);
          setPhase('active');
          showWorkoutNotification(exerciseName, currentSet + 1, sets);
        }
      }
    }, 1000);
  }, [currentSet, sets, restSeconds, loggedSets, currentWeight, repsInput, recommendedReps, exerciseName, questId, reps]);

  // Reset holdStarted when moving to the next set.
  // Intentionally only depends on currentSet — phase is read as a guard, not a trigger.
  useEffect(() => {
    if (phase === 'active') setHoldStarted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSet]);

  useEffect(() => {
    if (phase === 'active') {
      if (holdSeconds) {
        if (holdStarted) startHold();
      } else {
        pulse.value = withTiming(1.15, { duration: 500, easing: Easing.inOut(Easing.quad) }, () => {
          pulse.value = withTiming(1, { duration: 500 });
        });
      }
    }
    if (phase === 'done') {
      setEditedSets(prev => prev.length === 0 ? [...loggedSets] : prev);
    }
    // startHold intentionally omitted: it captures loggedSets in its closure and including it
    // would re-trigger this effect (and restart the countdown) whenever a set is logged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentSet, holdStarted, holdSeconds, pulse]);

  useEffect(() => () => { clearTimer(); clearExtraHold(); cancelRestNotification(); }, []);

  // Pre-fill reps logged via a background notification (user typed reps while app was closed).
  const pendingSetReps = useSessionStore(s => s.pendingSetReps);
  const clearPendingSetReps = useSessionStore(s => s.clearPendingSetReps);
  useEffect(() => {
    if (
      pendingSetReps &&
      pendingSetReps.questId === questId &&
      pendingSetReps.setNumber === currentSet &&
      phase === 'active'
    ) {
      setRepsInput(pendingSetReps.reps);
      clearPendingSetReps();
    }
  }, [pendingSetReps, phase, currentSet, questId, clearPendingSetReps]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  // ── Set slots helper ──────────────────────────────────────────────────────
  function SetSlots({ phase: slotPhase }: { phase?: string }) {
    return (
      <View style={styles.setDots}>
        {Array.from({ length: sets }).map((_, i) => {
          const setNum = i + 1;
          const isDone = setNum < currentSet;
          const isActive = setNum === currentSet && slotPhase === 'active';
          const wasSkipped = skippedSets.has(setNum);
          return (
            <View
              key={i}
              style={[
                styles.dot,
                isDone && (wasSkipped ? styles.dotSkipped : styles.dotDone),
                isActive && styles.dotActive,
              ]}
            />
          );
        })}
      </View>
    );
  }

  // ── Idle — Quest Briefing ─────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <View style={styles.container}>

        {/* Briefing card */}
        <View style={styles.briefingCard}>
          <Text style={styles.briefingTitle}>QUEST BRIEFING</Text>
          <Text style={styles.briefingInfo}>
            {sets} sets × {holdSeconds ? `${holdSeconds}s hold` : `${reps} reps`}
          </Text>
          <Text style={styles.briefingRest}>Rest {restSeconds}s between sets</Text>

          {/* Set slots — all empty at start */}
          <View style={styles.setDots}>
            {Array.from({ length: sets }).map((_, i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>
        </View>

        {/* Suggested weight */}
        <View style={styles.weightSection}>
          <Text style={styles.weightHeader}>
            {currentWeight === 'bodyweight' ? 'BODYWEIGHT EXERCISE' : 'STARTING WEIGHT'}
          </Text>
          <WeightSelector value={currentWeight} onChange={setWeight} unit={weightUnit} />
          {currentWeight === 'bodyweight' && (
            <Text style={styles.suggestedHint}>Optional: tap display to add extra weight</Text>
          )}
          {currentWeight !== 'bodyweight' && suggestedWeight !== currentWeight && (
            <Text style={styles.suggestedHint}>
              Suggested: {formatWeight(suggestedWeight, weightUnit)}
            </Text>
          )}
        </View>

        {/* Progressive overload: last session data */}
        {lastSessionLog && (
          <View style={styles.lastSessionBox}>
            <Text style={styles.lastSessionLabel}>LAST SESSION</Text>
            <Text style={styles.lastSessionData}>
              {formatWeight(lastSessionLog.weight, weightUnit)} · {lastSessionLog.reps} reps · {lastSessionLog.sets} sets
            </Text>
            <Text style={styles.lastSessionDate}>
              {new Date(lastSessionLog.sessionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        )}

        <PressableButton
          label="⚔️  Begin Quest"
          size="lg"
          onPress={() => { showWorkoutNotification(exerciseName, 1, sets); setRepsInput(recommendedReps); setPhase('active'); }}
          style={styles.mainBtn}
        />
        <PressableButton label="✕ Skip exercise" variant="danger" size="sm" onPress={onSkip} />
      </View>
    );
  }

  // ── Active ────────────────────────────────────────────────────────────────
  if (phase === 'active') {
    // ── Static / isometric hold mode ──────────────────────────────────────
    if (holdSeconds) {
      // ── Pre-start: user hasn't pressed "Start Hold" yet ─────────────────
      if (!holdStarted) {
        return (
          <View style={styles.container}>
            {/* Set progress at top */}
            <SetSlots phase="active" />
            <Text style={styles.setCounter}>Set {currentSet} of {sets}</Text>

            <Text style={[styles.holdLabel, { color: COLORS.jade }]}>ISOMETRIC HOLD</Text>
            <View style={styles.holdReadyCard}>
              <Text style={styles.holdTargetIcon}>⏱️</Text>
              <Text style={styles.holdTargetText}>{holdSeconds}s hold</Text>
              <Text style={styles.holdReadySub}>
                Get into position, then press Start when ready.
              </Text>
            </View>

            <View style={styles.weightSection}>
              <Text style={styles.weightHeader}>WEIGHT THIS SET</Text>
              <WeightSelector value={currentWeight} onChange={setWeight} unit={weightUnit} />
            </View>

            <PressableButton
              label="▶  Start Hold"
              variant="success"
              size="lg"
              onPress={() => setHoldStarted(true)}
              style={styles.mainBtn}
            />
            <PressableButton label="✕ Skip exercise" variant="danger" size="sm" onPress={onSkip} />
          </View>
        );
      }

      const progress = holdComplete ? 1 : holdLeft / holdSeconds;
      const ringColor = holdComplete ? COLORS.gold : holdLeft <= 5 ? COLORS.crimson : COLORS.jade;

      const releaseHold = () => {
        clearTimer();
        clearExtraHold();
        const totalTime = holdSeconds + extraHoldSec;
        logCurrentSet(repsInput, totalTime);
        setHoldComplete(false);
        setExtraHoldSec(0);
        if (currentSet >= sets) {
          setPhase('done');
        } else {
          setPhase('resting');
          setRestLeft(restSeconds);
          let r = restSeconds;
          intervalRef.current = setInterval(() => {
            r -= 1;
            setRestLeft(r);
            if (r <= 0) {
              clearTimer();
              setCurrentSet(s => s + 1);
              setRepsInput(recommendedReps);
              setPhase('active');
            }
          }, 1000);
        }
      };

      return (
        <View style={styles.container}>
          <SetSlots phase="active" />
          <Text style={styles.setCounter}>Set {currentSet} of {sets}</Text>
          {holdComplete ? (
            <Text style={[styles.holdLabel, { color: COLORS.gold }]}>TARGET HIT!</Text>
          ) : (
            <Text style={[styles.holdLabel, { color: COLORS.jade }]}>HOLD</Text>
          )}
          <View style={styles.ringWrapper}>
            <RingTimer progress={progress} color={ringColor} />
            <View style={styles.ringCenter}>
              {holdComplete ? (
                <>
                  <Text style={[styles.restNumber, { color: COLORS.gold }]}>+{extraHoldSec}s</Text>
                  <Text style={styles.restSec}>extra</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.restNumber, { color: ringColor }]}>{holdLeft}</Text>
                  <Text style={styles.restSec}>sec</Text>
                </>
              )}
            </View>
          </View>

          {holdComplete && extraHoldSec > 0 && (
            <Text style={styles.bonusFlash}>
              +{calculateIsometricBonus(holdSeconds + extraHoldSec, holdSeconds)} bonus XP 🔥
            </Text>
          )}

          <PressableButton
            label={holdComplete
              ? (currentSet < sets ? '🏆 Release! — rest' : '🏆 Release! — done')
              : (currentSet < sets ? `✓ Done hold — rest ${restSeconds}s` : '✓ Final hold done!')}
            variant="success"
            size="lg"
            onPress={holdComplete ? releaseHold : () => {
              clearTimer();
              const elapsed = Math.max(holdSeconds - holdLeft, 1);
              logCurrentSet(repsInput, elapsed);
              if (currentSet >= sets) {
                setPhase('done');
              } else {
                setPhase('resting');
                setRestLeft(restSeconds);
                let r = restSeconds;
                intervalRef.current = setInterval(() => {
                  r -= 1;
                  setRestLeft(r);
                  if (r <= 0) {
                    clearTimer();
                    setCurrentSet(s => s + 1);
                    setRepsInput(recommendedReps);
                    setPhase('active');
                  }
                }, 1000);
              }
            }}
            style={styles.mainBtn}
          />
          <PressableButton label="✕ Skip exercise" variant="danger" size="sm" onPress={onSkip} />
        </View>
      );
    }

    // ── Normal rep mode ───────────────────────────────────────────────────
    const previewBonus = calculateSetBonus(repsInput, recommendedReps);
    return (
      <View style={styles.container}>
        {/* Set progress at top */}
        <SetSlots phase="active" />
        <Text style={styles.setCounter}>Set {currentSet} of {sets}</Text>
        <Animated.Text style={[styles.goText, pulseStyle]}>GO!</Animated.Text>

        {/* Rep counter — user adjusts actual reps done */}
        <View style={styles.repSection}>
          <Text style={styles.weightHeader}>REPS THIS SET</Text>
          <View style={styles.repRow}>
            <TouchableOpacity
              style={wStyles.btn}
              onPress={() => setRepsInput(r => Math.max(0, r - 1))}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Decrease reps"
              accessibilityHint="Decreases the number of reps"
            >
              <Text style={wStyles.btnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.repDisplay}>
              <Text style={styles.repNumber}>{repsInput}</Text>
              {repsInput !== recommendedReps && (
                <Text style={[styles.repTarget, { color: repsInput > recommendedReps ? COLORS.jade : COLORS.crimson }]}>
                  target: {recommendedReps}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={wStyles.btn}
              onPress={() => setRepsInput(r => r + 1)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Increase reps"
              accessibilityHint="Increases the number of reps"
            >
              <Text style={wStyles.btnText}>+</Text>
            </TouchableOpacity>
          </View>
          {previewBonus > 0 && (
            <Text style={styles.bonusPreview}>+{previewBonus} bonus XP 🔥</Text>
          )}
        </View>

        {/* Per-set weight adjustment */}
        <View style={styles.weightSection}>
          <Text style={styles.weightHeader}>WEIGHT THIS SET</Text>
          <WeightSelector value={currentWeight} onChange={setWeight} unit={weightUnit} />
        </View>

        <PressableButton
          label={currentSet < sets ? `✓ Done — rest ${restSeconds}s` : '✓ Final set done!'}
          variant="success"
          size="lg"
          onPress={() => {
            if (currentSet >= sets) {
              logCurrentSet(repsInput);
              setPhase('done');
            } else {
              startRest();
            }
          }}
          style={styles.mainBtn}
        />

        {/* Skip this set (logs 0 reps, advances) */}
        <TouchableOpacity
          style={styles.skipSetLink}
          onPress={skipCurrentSet}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="Skip this set"
        >
          <Text style={styles.skipSetText}>— Skip this set (0 reps)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Resting ───────────────────────────────────────────────────────────────
  if (phase === 'resting') {
    const progress = restLeft / restSeconds;
    const ringColor = restLeft <= 5 ? COLORS.crimson : COLORS.gold;
    const lastLog = loggedSets[loggedSets.length - 1];
    const lastWasSkipped = lastLog ? skippedSets.has(lastLog.setNumber) : false;
    const lastActual = lastLog
      ? (holdSeconds && lastLog.timeCompleted !== undefined ? lastLog.timeCompleted : lastLog.repsCompleted)
      : 0;
    const lastUnit = holdSeconds ? 's' : ' reps';
    const lastIcon = lastLog
      ? getSetIcon(lastActual, holdSeconds ?? recommendedReps, lastWasSkipped)
      : '';

    return (
      <View style={styles.container}>
        <Text style={styles.setCounter}>REST</Text>

        {/* What just happened */}
        {lastLog && (
          <View style={styles.restLastSet}>
            <Text style={styles.restSetLabel}>SET {lastLog.setNumber} RESULT</Text>
            <Text style={styles.restSetInfo}>
              {lastWasSkipped ? '— skipped' : `${lastActual}${lastUnit}  ${lastIcon}`}
            </Text>
            {lastSetBonus > 0 && !lastWasSkipped && (
              <Text style={styles.bonusFlash}>+{lastSetBonus} bonus XP 🔥</Text>
            )}
          </View>
        )}

        <View style={styles.ringWrapper}>
          <RingTimer progress={progress} color={ringColor} />
          <View style={styles.ringCenter}>
            <Text style={[styles.restNumber, { color: ringColor }]}>{restLeft}</Text>
            <Text style={styles.restSec}>sec</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>Next: Set {currentSet + 1} of {sets}</Text>
        <PressableButton
          label="Skip rest →"
          variant="ghost"
          size="sm"
          onPress={() => {
            clearTimer();
            cancelRestNotification();
            setCurrentSet(s => s + 1);
            setRepsInput(recommendedReps);
            setLastSetBonus(0);
            setPhase('active');
            showWorkoutNotification(exerciseName, currentSet + 1, sets);
          }}
        />
      </View>
    );
  }

  // ── Done — XP breakdown + editable accept phase ───────────────────────────

  function updateEditedSet(index: number, field: 'weight' | 'reps', value: number | 'bodyweight') {
    setEditedSets(prev =>
      prev.map((s, i) =>
        i !== index
          ? s
          : field === 'weight'
            ? { ...s, weight: value as number | 'bodyweight' }
            : { ...s, repsCompleted: Math.max(0, value as number) },
      ),
    );
  }

  const displaySets = editedSets.length > 0 ? editedSets : loggedSets;

  // Compute estimated total XP for the breakdown table
  const estimatedTotalXP = loggedSets.reduce((sum, s) => {
    const wasSkipped = skippedSets.has(s.setNumber);
    if (wasSkipped) return sum;
    const actual = holdSeconds && s.timeCompleted !== undefined ? s.timeCompleted : s.repsCompleted;
    const target = holdSeconds ?? recommendedReps;
    return sum + calculateSetXP(actual, target, baseXP, sets);
  }, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.doneIcon}>🏆</Text>
      <Text style={styles.doneText}>Quest Complete!</Text>
      <Text style={styles.doneSubtitle}>Review & adjust before accepting</Text>

      {/* ── XP breakdown table ─────────────────────────────────────────── */}
      <View style={styles.xpSectionBox}>
        <Text style={styles.xpSectionTitle}>XP BREAKDOWN</Text>

        {loggedSets.map((s) => {
          const wasSkipped = skippedSets.has(s.setNumber);
          const actual = holdSeconds && s.timeCompleted !== undefined ? s.timeCompleted : s.repsCompleted;
          const target = holdSeconds ?? recommendedReps;
          const icon = getSetIcon(actual, target, wasSkipped);
          const setXP = wasSkipped ? 0 : calculateSetXP(actual, target, baseXP, sets);
          const repsDisplay = holdSeconds
            ? (wasSkipped ? '—' : `${actual}s / ${target}s`)
            : (wasSkipped ? '—' : `${actual} / ${target}`);

          return (
            <View key={s.setNumber} style={styles.xpTableRow}>
              <Text style={styles.xpColSet}>Set {s.setNumber}</Text>
              <Text style={styles.xpColReps}>{repsDisplay}</Text>
              <Text style={styles.xpColIcon}>{icon}</Text>
              <Text style={[styles.xpColXP, wasSkipped && { color: COLORS.textMuted }]}>
                {wasSkipped ? '+0' : `+${setXP}`}
              </Text>
            </View>
          );
        })}

        <View style={styles.xpTotalRow}>
          <Text style={styles.xpTotalLabel}>Estimated total</Text>
          <Text style={styles.xpTotalValue}>~{estimatedTotalXP} XP</Text>
        </View>
      </View>

      {/* ── Editable per-set summary ───────────────────────────────────── */}
      {displaySets.length > 0 && (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>ADJUST IF NEEDED</Text>

          {displaySets.map((s, i) => (
            <View key={s.setNumber} style={styles.editRow}>
              <Text style={styles.editSetLabel}>Set {s.setNumber}</Text>

              <View style={styles.editField}>
                <Text style={styles.editFieldLabel}>WEIGHT</Text>
                <WeightSelector
                  value={s.weight}
                  onChange={(v) => updateEditedSet(i, 'weight', v)}
                  unit={weightUnit}
                />
              </View>

              {!holdSeconds && (
                <View style={styles.editField}>
                  <Text style={styles.editFieldLabel}>REPS</Text>
                  <View style={styles.repRow}>
                    <TouchableOpacity
                      style={wStyles.btn}
                      onPress={() => updateEditedSet(i, 'reps', s.repsCompleted - 1)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease reps"
                      accessibilityHint="Decreases the number of reps"
                    >
                      <Text style={wStyles.btnText}>−</Text>
                    </TouchableOpacity>
                    <View style={styles.editRepDisplay}>
                      <Text style={styles.editRepNumber}>{s.repsCompleted}</Text>
                      {s.repsCompleted !== recommendedReps && (
                        <Text style={[styles.repTarget, {
                          color: s.repsCompleted > recommendedReps ? COLORS.jade : COLORS.crimson,
                        }]}>
                          target: {recommendedReps}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={wStyles.btn}
                      onPress={() => updateEditedSet(i, 'reps', s.repsCompleted + 1)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Increase reps"
                      accessibilityHint="Increases the number of reps"
                    >
                      <Text style={wStyles.btnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {holdSeconds && s.timeCompleted !== undefined && (
                <View style={styles.editField}>
                  <Text style={styles.editFieldLabel}>HOLD</Text>
                  <Text style={styles.holdTime}>{s.timeCompleted}s</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <PressableButton
        label="✓ Accept & Save"
        variant="success"
        size="lg"
        onPress={() => onComplete(displaySets)}
        style={styles.mainBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { alignItems: 'center', gap: 14, paddingVertical: 8 },
  subtitle:     { fontSize: 13, color: COLORS.textMuted },

  // Quest Briefing
  briefingCard:  { width: '100%', backgroundColor: 'rgba(59,130,246,0.05)', borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: 'rgba(59,130,246,0.15)', alignItems: 'center' },
  briefingTitle: { fontSize: 10, color: COLORS.gold, letterSpacing: 2.5, fontWeight: '700' },
  briefingInfo:  { fontSize: 20, fontWeight: '800', color: COLORS.text },
  briefingRest:  { fontSize: 13, color: COLORS.textMuted },

  // Set dots
  setDots:      { flexDirection: 'row', gap: 8 },
  dot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border },
  dotDone:      { backgroundColor: COLORS.jade },
  dotSkipped:   { backgroundColor: COLORS.textMuted },
  dotActive:    { backgroundColor: COLORS.gold, transform: [{ scale: 1.35 }] },

  mainBtn:      { minWidth: 220 },
  setCounter:   { fontSize: 14, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 2 },

  // Isometric hold
  holdLabel:    { fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  holdReadyCard: { alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.07)', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', width: '100%' },
  holdTargetIcon: { fontSize: 40 },
  holdTargetText: { fontSize: 28, fontWeight: '900', color: COLORS.jade },
  holdReadySub:  { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
  holdTime:     { fontSize: 18, fontWeight: '700', color: COLORS.jade },

  // Active rep mode
  goText:       { fontSize: 56, fontWeight: '900', color: COLORS.gold },
  repSection:    { width: '100%', gap: 8, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  repRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  repDisplay:    { flex: 1, alignItems: 'center' },
  repNumber:     { fontSize: 32, fontWeight: '900', color: COLORS.text },
  repTarget:     { fontSize: 11, marginTop: 1 },
  bonusPreview:  { fontSize: 12, color: COLORS.jade, fontWeight: '700', textAlign: 'center' },
  bonusFlash:    { fontSize: 14, color: COLORS.jade, fontWeight: '800', textAlign: 'center' },

  // Skip set link
  skipSetLink:   { marginTop: 2, paddingVertical: 4 },
  skipSetText:   { fontSize: 12, color: COLORS.textMuted, textDecorationLine: 'underline', textAlign: 'center' },

  // Rest phase
  ringWrapper:  { position: 'relative', width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
  ringCenter:   { position: 'absolute', alignItems: 'center' },
  restNumber:   { fontSize: 32, fontWeight: '900' },
  restSec:      { fontSize: 11, color: COLORS.textMuted, marginTop: -4 },
  restLastSet:  { width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 4 },
  restSetLabel: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2, fontWeight: '700' },
  restSetInfo:  { fontSize: 16, fontWeight: '700', color: COLORS.text },

  // Done phase
  doneIcon:     { fontSize: 52 },
  doneText:     { fontSize: 22, fontWeight: '800', color: COLORS.jade },
  doneSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: -6 },

  // XP breakdown table
  xpSectionBox:   { width: '100%', backgroundColor: 'rgba(14,164,114,0.06)', borderRadius: 12, padding: 12, gap: 2, borderWidth: 1, borderColor: 'rgba(14,164,114,0.2)' },
  xpSectionTitle: { fontSize: 10, color: COLORS.jade, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  xpTableRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  xpColSet:       { width: 48, fontSize: 12, color: COLORS.textMuted },
  xpColReps:      { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '600' },
  xpColIcon:      { width: 26, fontSize: 14, textAlign: 'center' },
  xpColXP:        { width: 56, fontSize: 12, color: COLORS.jade, fontWeight: '700', textAlign: 'right' },
  xpTotalRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(14,164,114,0.25)' },
  xpTotalLabel:   { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  xpTotalValue:   { fontSize: 18, color: COLORS.gold, fontWeight: '900' },

  // Editable section
  summaryBox:    { width: '100%', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 12, gap: 4, borderWidth: 1, borderColor: COLORS.border },
  summaryTitle:  { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  editRow:      { gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  editSetLabel: { fontSize: 11, color: COLORS.gold, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  editField:    { gap: 4 },
  editFieldLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 2, fontWeight: '700' },
  editRepDisplay: { flex: 1, alignItems: 'center' },
  editRepNumber:  { fontSize: 24, fontWeight: '900', color: COLORS.text },

  // Weight selector section
  weightSection: { width: '100%', gap: 8, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  weightHeader:  { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2, fontWeight: '700', textAlign: 'center' },
  suggestedHint: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', fontStyle: 'italic' },
  lastSessionBox: { width: '100%', backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)', alignItems: 'center', gap: 2 },
  lastSessionLabel: { fontSize: 9, color: COLORS.gold, letterSpacing: 2, fontWeight: '700' },
  lastSessionData: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  lastSessionDate: { fontSize: 10, color: COLORS.textMuted },
});
