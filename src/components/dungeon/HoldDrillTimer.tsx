/**
 * HoldDrillTimer — dedicated timer UI for warmup / cooldown / mobility drills.
 *
 * v4.2.0 Theme A. Replaces the conditional `!isNonLift` paths inside
 * WorkoutTimer that v4.1.0 added. The lift timer's idle "Quest Briefing"
 * gate, weight selector, rep input, and bonus-XP review are all wrong for
 * hold drills — this component owns the simpler hold-only lifecycle so the
 * lift timer can stay focused on its own job.
 *
 * Lifecycle: `hold` (countdown active) → `resting` (between sets) → `done`.
 * Each set auto-starts on mount / set-advance — there is no pre-start gate.
 * The "Done" CTA is disabled until the hold timer completes for the current set.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import PressableButton from '@/components/ui/PressableButton';
import { COLORS, FONTS, RADIUS, SPACING } from '@/lib/constants';
import {
  scheduleRestCompleteNotification,
  cancelRestNotification,
} from '@/lib/workoutNotification';
import {
  showActiveSetNotif,
  showRestingNotif,
  dismissSessionNotif,
} from '@/lib/sessionNotifBridge';
import { NativeModules, Platform } from 'react-native';
import type { SetLog } from '@/types';

const WidgetBridge = Platform.OS === 'android' ? NativeModules.WidgetBridge : null;

type Phase = 'hold' | 'resting' | 'done';

interface HoldDrillTimerProps {
  sets: number;
  holdSeconds: number;
  restSeconds: number;
  baseXP: number;
  exerciseName: string;
  questId: string;
  /** Coaching cue shown during the countdown (e.g. "Slow rolls, breathe"). */
  cue?: string;
  onComplete: (loggedSets: SetLog[]) => void;
  onSkip: () => void;
  completeLabel?: string;
  onBackToList?: () => void;
}

const RING_R = 60;
const RING_C = 2 * Math.PI * RING_R;

function HoldRing({ progress }: { progress: number }) {
  const offset = RING_C * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <Svg width={150} height={150} viewBox="0 0 150 150">
      <Circle cx={75} cy={75} r={RING_R} stroke="#2a2035" strokeWidth={10} fill="none" />
      <Circle
        cx={75}
        cy={75}
        r={RING_R}
        stroke={COLORS.violetLight}
        strokeWidth={10}
        fill="none"
        strokeDasharray={`${RING_C}`}
        strokeDashoffset={`${offset}`}
        strokeLinecap="round"
        rotation="-90"
        origin="75, 75"
      />
    </Svg>
  );
}

export default function HoldDrillTimer({
  sets,
  holdSeconds,
  restSeconds,
  baseXP,
  exerciseName,
  questId,
  cue,
  onComplete,
  onSkip,
  completeLabel,
  onBackToList,
}: HoldDrillTimerProps) {
  const [phase, setPhase] = useState<Phase>('hold');
  const [currentSet, setCurrentSet] = useState(1);
  const [holdLeft, setHoldLeft] = useState(holdSeconds);
  const [restLeft, setRestLeft] = useState(restSeconds);
  const [holdComplete, setHoldComplete] = useState(false);
  const [logs, setLogs] = useState<SetLog[]>([]);
  // v4.2.1 — pause/resume gate. When `paused` is true, the active interval
  // skips its tick instead of decrementing. We mirror to a ref so the
  // closures captured by setInterval read the latest value (state itself
  // would be stale-closure'd for the lifetime of the interval).
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  // ── Auto-start the hold countdown for each set ────────────────────────────
  const startHoldCountdown = useCallback(() => {
    setHoldLeft(holdSeconds);
    setHoldComplete(false);
    setPaused(false);
    let remaining = holdSeconds;
    clearTimer();
    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return;
      remaining -= 1;
      setHoldLeft(remaining);
      if (remaining <= 0) {
        clearTimer();
        setHoldComplete(true);
      }
    }, 1000);
  }, [holdSeconds]);

  useEffect(() => {
    if (phase === 'hold') startHoldCountdown();
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentSet]);

  useEffect(
    () => () => {
      clearTimer();
      cancelRestNotification();
      dismissSessionNotif();
    },
    [],
  );

  // ── Mark the current set done ─────────────────────────────────────────────
  const markSetDone = useCallback(() => {
    if (!holdComplete) return;
    const log: SetLog = {
      setNumber: currentSet,
      repsCompleted: 0,
      timeCompleted: holdSeconds,
      weight: 'bodyweight',
    };
    const updated = [...logs, log];
    setLogs(updated);

    // Last set → done phase
    if (currentSet >= sets) {
      dismissSessionNotif();
      WidgetBridge?.updateWidgetTimer(0, false);
      setPhase('done');
      return;
    }

    // Otherwise → rest, then auto-advance
    setPhase('resting');
    setRestLeft(restSeconds);
    setPaused(false);
    showRestingNotif(
      exerciseName,
      `Set ${currentSet} of ${sets} done`,
      restSeconds * 1000,
      questId,
      currentSet + 1,
    );
    WidgetBridge?.updateWidgetTimer(restSeconds * 1000, true);
    scheduleRestCompleteNotification(
      exerciseName,
      currentSet + 1,
      sets,
      questId,
      `${holdSeconds}s hold`,
      restSeconds,
    );

    let remaining = restSeconds;
    clearTimer();
    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return;
      remaining -= 1;
      setRestLeft(remaining);
      if (remaining <= 0) {
        clearTimer();
        cancelRestNotification();
        setCurrentSet((s) => s + 1);
        setPhase('hold');
        showActiveSetNotif(
          exerciseName,
          `Set ${currentSet + 1} of ${sets}`,
          questId,
          currentSet + 1,
        );
        WidgetBridge?.updateWidgetTimer(0, false);
      }
    }, 1000);
  }, [holdComplete, currentSet, sets, holdSeconds, restSeconds, logs, exerciseName, questId]);

  // ── Skip rest ─────────────────────────────────────────────────────────────
  const skipRest = useCallback(() => {
    clearTimer();
    cancelRestNotification();
    setCurrentSet((s) => s + 1);
    setPhase('hold');
  }, []);

  const holdProgress = holdSeconds > 0 ? 1 - holdLeft / holdSeconds : 1;

  // ── Render: done phase ───────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <Animated.View entering={FadeIn.duration(250)} style={styles.container}>
        <Text style={styles.eyebrow}>HOLD COMPLETE</Text>
        <Text style={styles.bigStat}>+{baseXP * sets} XP</Text>
        <Text style={styles.subText}>
          {sets} {sets === 1 ? 'set' : 'sets'} held — locked in.
        </Text>
        <PressableButton
          label={completeLabel ?? '✓ Save & Continue →'}
          variant="primary"
          size="lg"
          onPress={() => onComplete(logs)}
          style={styles.cta}
        />
        {onBackToList && (
          <PressableButton
            label="← Back to dungeon"
            variant="ghost"
            size="sm"
            onPress={onBackToList}
            style={styles.secondaryCta}
          />
        )}
      </Animated.View>
    );
  }

  // ── Render: resting between sets ──────────────────────────────────────────
  if (phase === 'resting') {
    return (
      <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
        <Text style={styles.eyebrow}>
          REST · SET {currentSet} OF {sets}{paused ? ' · PAUSED' : ''}
        </Text>
        <View style={styles.ringWrap}>
          <HoldRing progress={1 - restLeft / restSeconds} />
          <View style={styles.ringText}>
            <Text style={styles.ringNumber}>{Math.max(0, restLeft)}</Text>
            <Text style={styles.ringUnit}>SECONDS</Text>
          </View>
        </View>
        <Text style={styles.subText}>
          {paused ? 'Timer paused. Resume when you\'re ready.' : 'Breathe. The next set starts automatically.'}
        </Text>
        <PressableButton
          label={paused ? '▶ Resume' : '❚❚ Pause'}
          variant="ghost"
          size="sm"
          onPress={() => setPaused((p) => !p)}
          style={styles.secondaryCta}
        />
        <PressableButton
          label="Skip rest →"
          variant="ghost"
          size="sm"
          onPress={skipRest}
          style={styles.secondaryCta}
        />
      </Animated.View>
    );
  }

  // ── Render: hold phase ────────────────────────────────────────────────────
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
      <Text style={styles.eyebrow}>SET {currentSet} OF {sets}</Text>

      <View style={styles.ringWrap}>
        <HoldRing progress={holdProgress} />
        <View style={styles.ringText}>
          <Text style={styles.ringNumber}>{Math.max(0, holdLeft)}</Text>
          <Text style={styles.ringUnit}>SECONDS</Text>
        </View>
      </View>

      {cue && !holdComplete && (
        <View style={styles.cueBox}>
          <Text style={styles.cueLabel}>HOLD CUE</Text>
          <Text style={styles.cueText}>{cue}</Text>
        </View>
      )}

      <PressableButton
        label={holdComplete ? '✓ Set Done →' : `Hold for ${Math.max(0, holdLeft)}s…`}
        variant={holdComplete ? 'primary' : 'ghost'}
        size="lg"
        onPress={markSetDone}
        disabled={!holdComplete}
        style={styles.cta}
      />

      {/* v4.2.1 — pause/resume the hold countdown. Hidden once the hold has
          completed for this set; the only forward action then is "Set Done". */}
      {!holdComplete && (
        <PressableButton
          label={paused ? '▶ Resume' : '❚❚ Pause'}
          variant="ghost"
          size="sm"
          onPress={() => setPaused((p) => !p)}
          style={styles.secondaryCta}
        />
      )}

      <PressableButton
        label="Skip drill"
        variant="ghost"
        size="sm"
        onPress={onSkip}
        style={styles.secondaryCta}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: SPACING.gap,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: FONTS.sansBold,
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  ringWrap: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  ringText: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringNumber: {
    fontSize: 44,
    fontFamily: FONTS.monoMed,
    color: COLORS.text,
    letterSpacing: -1,
  },
  ringUnit: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginTop: -2,
  },
  bigStat: {
    fontSize: 44,
    fontFamily: FONTS.displayBold,
    color: COLORS.gold,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  cueBox: {
    backgroundColor: COLORS.surfaceAccent,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
    gap: 4,
  },
  cueLabel: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: COLORS.violetLight,
    letterSpacing: 2,
  },
  cueText: {
    fontSize: 14,
    fontFamily: FONTS.sansMed,
    color: COLORS.text,
    lineHeight: 20,
  },
  subText: {
    fontSize: 13,
    fontFamily: FONTS.sans,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginTop: 4,
  },
  cta: {
    width: '100%',
    marginTop: 8,
  },
  secondaryCta: {
    marginTop: 4,
  },
});
