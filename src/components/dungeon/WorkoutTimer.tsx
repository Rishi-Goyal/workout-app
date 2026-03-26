/**
 * WorkoutTimer — set-by-set state machine with rest countdown + weight logging.
 *
 * Each set: user can adjust weight (or tap BW for bodyweight) and log reps done.
 * States: idle → active → resting → done
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, TouchableOpacity } from 'react-native';
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
  onComplete: (loggedSets: SetLog[]) => void;
  onHalf: (loggedSets: SetLog[]) => void;
  onSkip: () => void;
}

const RADIUS = 44;
const CIRCUM = 2 * Math.PI * RADIUS;

function RingTimer({ progress, color }: { progress: number; color: string }) {
  const offset = CIRCUM * (1 - progress);
  return (
    <Svg width={110} height={110} viewBox="0 0 110 110">
      <Circle cx={55} cy={55} r={RADIUS} stroke="#2a2035" strokeWidth={8} fill="none" />
      <Circle cx={55} cy={55} r={RADIUS} stroke={color} strokeWidth={8} fill="none"
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
      <TouchableOpacity style={wStyles.btn} onPress={() => adjust(-1)} activeOpacity={0.7}>
        <Text style={wStyles.btnText}>−</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[wStyles.display, isBW && wStyles.displayBW]}
        onPress={() => onChange(isBW ? 20 : 'bodyweight')}
        activeOpacity={0.8}
      >
        <Text style={[wStyles.weightText, isBW && wStyles.weightTextBW]}>
          {isBW ? '🧍 BW' : `${value} ${unit}`}
        </Text>
        <Text style={wStyles.tapHint}>{isBW ? 'tap for weight' : 'tap for BW'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={wStyles.btn} onPress={() => adjust(1)} activeOpacity={0.7}>
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

export default function WorkoutTimer({
  sets, reps, holdSeconds,
  restSeconds,
  suggestedWeight = 'bodyweight',
  weightUnit = 'kg',
  lastSessionLog,
  onComplete, onHalf, onSkip,
}: WorkoutTimerProps) {
  const [phase, setPhase]           = useState<Phase>('idle');
  const [currentSet, setCurrentSet] = useState(1);
  const [restLeft, setRestLeft]     = useState(restSeconds);
  const [holdLeft, setHoldLeft]     = useState(holdSeconds ?? 0);
  const [currentWeight, setWeight]  = useState<number | 'bodyweight'>(suggestedWeight);
  const [loggedSets, setLoggedSets] = useState<SetLog[]>([]);
  const intervalRef                 = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdElapsedRef              = useRef(0);

  const pulse = useSharedValue(1);

  const clearTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  function logCurrentSet(timeHeld?: number) {
    const entry: SetLog = {
      setNumber: currentSet,
      repsCompleted: holdSeconds ? 0 : (parseInt(reps, 10) || 0),
      ...(timeHeld !== undefined && { timeCompleted: timeHeld }),
      weight: currentWeight,
    };
    const updated = [...loggedSets, entry];
    setLoggedSets(updated);
    return updated;
  }

  // Start hold countdown for static exercises
  const startHold = useCallback(() => {
    if (!holdSeconds) return;
    setHoldLeft(holdSeconds);
    holdElapsedRef.current = 0;
    let remaining = holdSeconds;
    clearTimer();
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      holdElapsedRef.current += 1;
      setHoldLeft(remaining);
      if (remaining <= 0) {
        clearTimer();
        // Auto-advance: log set and start rest (or finish)
        const elapsed = holdSeconds;
        const entry: SetLog = { setNumber: currentSet, repsCompleted: 0, timeCompleted: elapsed, weight: currentWeight };
        const updated = [...loggedSets, entry];
        setLoggedSets(updated);
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
              setPhase('active');
            }
          }, 1000);
        }
      }
    }, 1000);
  }, [currentSet, sets, restSeconds, loggedSets, currentWeight, holdSeconds]);

  const startRest = useCallback(() => {
    const updated = logCurrentSet();
    setPhase('resting');
    setRestLeft(restSeconds);
    let remaining = restSeconds;
    clearTimer();
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setRestLeft(remaining);
      if (remaining <= 0) {
        clearTimer();
        if (currentSet >= sets) {
          setPhase('done');
        } else {
          setCurrentSet(s => s + 1);
          setPhase('active');
        }
      }
    }, 1000);
  }, [currentSet, sets, restSeconds, loggedSets, currentWeight, reps]);

  useEffect(() => {
    if (phase === 'active') {
      if (holdSeconds) {
        startHold();
      } else {
        pulse.value = withTiming(1.15, { duration: 500, easing: Easing.inOut(Easing.quad) }, () => {
          pulse.value = withTiming(1, { duration: 500 });
        });
      }
    }
  }, [phase, currentSet]);

  useEffect(() => () => clearTimer(), []);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <View style={styles.container}>
        <Text style={styles.setsLabel}>
          {sets} sets × {holdSeconds ? `${holdSeconds}s hold` : `${reps} reps`}
        </Text>
        <Text style={styles.subtitle}>Rest {restSeconds}s between sets</Text>

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

        <View style={styles.setDots}>
          {Array.from({ length: sets }).map((_, i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>

        <PressableButton label="⚔️  Start Quest" size="lg" onPress={() => setPhase('active')} style={styles.mainBtn} />

        <View style={styles.bail}>
          <PressableButton label="½ Half complete" variant="ghost" size="sm" onPress={() => onHalf(loggedSets)} />
          <PressableButton label="✕ Skip" variant="danger" size="sm" onPress={onSkip} />
        </View>
      </View>
    );
  }

  // ── Active ────────────────────────────────────────────────────────────────
  if (phase === 'active') {
    // ── Static / isometric hold mode ──────────────────────────────────────
    if (holdSeconds) {
      const progress = holdLeft / holdSeconds;
      const ringColor = holdLeft <= 5 ? COLORS.crimson : COLORS.jade;
      return (
        <View style={styles.container}>
          <Text style={styles.setCounter}>Set {currentSet} of {sets}</Text>
          <Text style={[styles.holdLabel, { color: COLORS.jade }]}>HOLD</Text>
          <View style={styles.ringWrapper}>
            <RingTimer progress={progress} color={ringColor} />
            <View style={styles.ringCenter}>
              <Text style={[styles.restNumber, { color: ringColor }]}>{holdLeft}</Text>
              <Text style={styles.restSec}>sec</Text>
            </View>
          </View>

          <View style={styles.setDots}>
            {Array.from({ length: sets }).map((_, i) => (
              <View key={i} style={[styles.dot, i < currentSet - 1 && styles.dotDone, i === currentSet - 1 && styles.dotActive]} />
            ))}
          </View>

          <PressableButton
            label={currentSet < sets ? `✓ Done hold — rest ${restSeconds}s` : '✓ Final hold done!'}
            variant="success"
            size="lg"
            onPress={() => {
              clearTimer();
              const elapsed = holdSeconds - holdLeft;
              const entry: SetLog = { setNumber: currentSet, repsCompleted: 0, timeCompleted: Math.max(elapsed, 1), weight: currentWeight };
              const updated = [...loggedSets, entry];
              setLoggedSets(updated);
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
                    setPhase('active');
                  }
                }, 1000);
              }
            }}
            style={styles.mainBtn}
          />

          <View style={styles.bail}>
            <PressableButton label="½ Half complete" variant="ghost" size="sm" onPress={() => onHalf(loggedSets)} />
            <PressableButton label="✕ Skip" variant="danger" size="sm" onPress={onSkip} />
          </View>
        </View>
      );
    }

    // ── Normal rep mode ───────────────────────────────────────────────────
    return (
      <View style={styles.container}>
        <Text style={styles.setCounter}>Set {currentSet} of {sets}</Text>
        <Animated.Text style={[styles.goText, pulseStyle]}>GO!</Animated.Text>
        <Text style={styles.repsText}>{reps} reps</Text>

        {/* Per-set weight adjustment */}
        <View style={styles.weightSection}>
          <Text style={styles.weightHeader}>WEIGHT THIS SET</Text>
          <WeightSelector value={currentWeight} onChange={setWeight} unit={weightUnit} />
        </View>

        <View style={styles.setDots}>
          {Array.from({ length: sets }).map((_, i) => (
            <View key={i} style={[styles.dot, i < currentSet - 1 && styles.dotDone, i === currentSet - 1 && styles.dotActive]} />
          ))}
        </View>

        <PressableButton
          label={currentSet < sets ? `✓ Done set — rest ${restSeconds}s` : '✓ Final set done!'}
          variant="success"
          size="lg"
          onPress={() => {
            if (currentSet >= sets) {
              const updated = logCurrentSet();
              setPhase('done');
            } else {
              startRest();
            }
          }}
          style={styles.mainBtn}
        />

        <View style={styles.bail}>
          <PressableButton label="½ Half complete" variant="ghost" size="sm" onPress={() => onHalf(loggedSets)} />
          <PressableButton label="✕ Skip" variant="danger" size="sm" onPress={onSkip} />
        </View>
      </View>
    );
  }

  // ── Resting ───────────────────────────────────────────────────────────────
  if (phase === 'resting') {
    const progress = restLeft / restSeconds;
    const ringColor = restLeft <= 5 ? COLORS.crimson : COLORS.gold;
    return (
      <View style={styles.container}>
        <Text style={styles.setCounter}>REST</Text>
        <View style={styles.ringWrapper}>
          <RingTimer progress={progress} color={ringColor} />
          <View style={styles.ringCenter}>
            <Text style={[styles.restNumber, { color: ringColor }]}>{restLeft}</Text>
            <Text style={styles.restSec}>sec</Text>
          </View>
        </View>

        {/* Show logged weight for last set */}
        {loggedSets.length > 0 && (
          <Text style={styles.lastSetInfo}>
            Set {loggedSets[loggedSets.length - 1].setNumber}: {formatWeight(loggedSets[loggedSets.length - 1].weight, weightUnit)} logged ✓
          </Text>
        )}

        <Text style={styles.subtitle}>Next: Set {currentSet + 1} of {sets}</Text>
        <PressableButton
          label="Skip rest →"
          variant="ghost"
          size="sm"
          onPress={() => {
            clearTimer();
            setCurrentSet(s => s + 1);
            setPhase('active');
          }}
        />
      </View>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.doneIcon}>🏆</Text>
      <Text style={styles.doneText}>All sets complete!</Text>

      {/* Summary of logged weights */}
      {loggedSets.length > 0 && (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>YOUR WORKOUT</Text>
          {loggedSets.map(s => (
            <Text key={s.setNumber} style={styles.summaryRow}>
              Set {s.setNumber}  ·  {formatWeight(s.weight, weightUnit)}  ·  {s.timeCompleted ? `${s.timeCompleted}s hold` : `${s.repsCompleted} reps`}
            </Text>
          ))}
        </View>
      )}

      <PressableButton label="✓ Complete Quest" variant="success" size="lg" onPress={() => onComplete(loggedSets)} style={styles.mainBtn} />
      <PressableButton label="½ Half complete" variant="ghost" size="sm" onPress={() => onHalf(loggedSets)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { alignItems: 'center', gap: 14, paddingVertical: 8 },
  setsLabel:    { fontSize: 20, fontWeight: '800', color: COLORS.text },
  subtitle:     { fontSize: 13, color: COLORS.textMuted },
  setDots:      { flexDirection: 'row', gap: 8 },
  dot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border },
  dotDone:      { backgroundColor: COLORS.jade },
  dotActive:    { backgroundColor: COLORS.gold, transform: [{ scale: 1.3 }] },
  mainBtn:      { minWidth: 220 },
  bail:         { flexDirection: 'row', gap: 10, marginTop: 4 },
  setCounter:   { fontSize: 14, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 2 },
  holdLabel:    { fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  goText:       { fontSize: 56, fontWeight: '900', color: COLORS.gold },
  repsText:     { fontSize: 22, fontWeight: '700', color: COLORS.text },
  ringWrapper:  { position: 'relative', width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
  ringCenter:   { position: 'absolute', alignItems: 'center' },
  restNumber:   { fontSize: 32, fontWeight: '900' },
  restSec:      { fontSize: 11, color: COLORS.textMuted, marginTop: -4 },
  doneIcon:     { fontSize: 52 },
  doneText:     { fontSize: 22, fontWeight: '800', color: COLORS.jade },
  weightSection: { width: '100%', gap: 8, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  weightHeader:  { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2, fontWeight: '700', textAlign: 'center' },
  suggestedHint: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', fontStyle: 'italic' },
  lastSessionBox: { width: '100%', backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)', alignItems: 'center', gap: 2 },
  lastSessionLabel: { fontSize: 9, color: COLORS.gold, letterSpacing: 2, fontWeight: '700' },
  lastSessionData: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  lastSessionDate: { fontSize: 10, color: COLORS.textMuted },
  lastSetInfo:   { fontSize: 12, color: COLORS.jade, fontWeight: '600' },
  summaryBox:    { width: '100%', backgroundColor: 'rgba(16,185,129,0.06)', borderRadius: 12, padding: 12, gap: 4, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  summaryTitle:  { fontSize: 10, color: COLORS.jade, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  summaryRow:    { fontSize: 13, color: COLORS.text, fontFamily: 'monospace' },
});
