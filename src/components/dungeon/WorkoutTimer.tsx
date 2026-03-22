/**
 * WorkoutTimer — set-by-set state machine with rest countdown.
 *
 * States: idle → active (go!) → resting (countdown) → [next set or done]
 *
 * Props:
 *   sets        — number of sets
 *   restSeconds — rest between sets
 *   onComplete  — called when all sets are done (full XP)
 *   onHalf      — called if user bails early (half XP)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  interpolateColor,
  useAnimatedProps,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '@/lib/constants';
import PressableButton from '@/components/ui/PressableButton';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Phase = 'idle' | 'active' | 'resting' | 'done';

interface WorkoutTimerProps {
  sets: number;
  reps: string;
  restSeconds: number;
  onComplete: () => void;
  onHalf: () => void;
  onSkip: () => void;
}

// Ring parameters
const RADIUS  = 44;
const CIRCUM  = 2 * Math.PI * RADIUS;

function RingTimer({ progress, color }: { progress: number; color: string }) {
  // progress: 0 = empty, 1 = full
  const strokeDash = CIRCUM * (1 - progress);
  return (
    <Svg width={110} height={110} viewBox="0 0 110 110">
      {/* Track */}
      <Circle cx={55} cy={55} r={RADIUS} stroke="#2a2035" strokeWidth={8} fill="none" />
      {/* Progress */}
      <Circle
        cx={55}
        cy={55}
        r={RADIUS}
        stroke={color}
        strokeWidth={8}
        fill="none"
        strokeDasharray={`${CIRCUM}`}
        strokeDashoffset={`${strokeDash}`}
        strokeLinecap="round"
        rotation="-90"
        origin="55, 55"
      />
    </Svg>
  );
}

export default function WorkoutTimer({ sets, reps, restSeconds, onComplete, onHalf, onSkip }: WorkoutTimerProps) {
  const [phase, setPhase]           = useState<Phase>('idle');
  const [currentSet, setCurrentSet] = useState(1);
  const [restLeft, setRestLeft]     = useState(restSeconds);
  const intervalRef                 = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scale pulse for "GO!" text
  const pulse = useSharedValue(1);

  const clearTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const startRest = useCallback(() => {
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
  }, [currentSet, sets, restSeconds]);

  // Pulse animation when active
  useEffect(() => {
    if (phase === 'active') {
      pulse.value = withTiming(1.15, { duration: 500, easing: Easing.inOut(Easing.quad) }, () => {
        pulse.value = withTiming(1, { duration: 500 });
      });
    }
  }, [phase, currentSet]);

  useEffect(() => () => clearTimer(), []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <View style={styles.container}>
        <Text style={styles.setsLabel}>{sets} sets × {reps} reps</Text>
        <Text style={styles.subtitle}>Rest {restSeconds}s between sets</Text>

        <View style={styles.setDots}>
          {Array.from({ length: sets }).map((_, i) => (
            <View key={i} style={[styles.dot, i < currentSet - 1 && styles.dotDone]} />
          ))}
        </View>

        <PressableButton
          label="⚔️  Start Quest"
          size="lg"
          onPress={() => setPhase('active')}
          style={styles.startBtn}
        />

        <View style={styles.bail}>
          <PressableButton label="½ Half complete" variant="ghost" size="sm" onPress={onHalf} />
          <PressableButton label="✕ Skip" variant="danger" size="sm" onPress={onSkip} />
        </View>
      </View>
    );
  }

  // ── Active (do the reps!) ─────────────────────────────────────────────────
  if (phase === 'active') {
    return (
      <View style={styles.container}>
        <Text style={styles.setCounter}>Set {currentSet} of {sets}</Text>
        <Animated.Text style={[styles.goText, pulseStyle]}>GO!</Animated.Text>
        <Text style={styles.repsText}>{reps} reps</Text>

        <View style={styles.setDots}>
          {Array.from({ length: sets }).map((_, i) => (
            <View key={i} style={[styles.dot, i < currentSet - 1 && styles.dotDone, i === currentSet - 1 && styles.dotActive]} />
          ))}
        </View>

        <PressableButton
          label={currentSet < sets ? `✓ Done — rest ${restSeconds}s` : '✓ Last set done!'}
          variant="success"
          size="lg"
          onPress={() => {
            if (currentSet >= sets) {
              setPhase('done');
            } else {
              startRest();
            }
          }}
          style={styles.startBtn}
        />

        <View style={styles.bail}>
          <PressableButton label="½ Half complete" variant="ghost" size="sm" onPress={onHalf} />
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
        <Text style={styles.setCounter}>Rest</Text>
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
      <Text style={styles.subtitle}>Claim your XP</Text>
      <PressableButton
        label="✓ Complete Quest"
        variant="success"
        size="lg"
        onPress={onComplete}
        style={styles.startBtn}
      />
      <PressableButton label="½ Half complete" variant="ghost" size="sm" onPress={onHalf} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  setsLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  setDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
  },
  dotDone: {
    backgroundColor: COLORS.jade,
  },
  dotActive: {
    backgroundColor: COLORS.gold,
    transform: [{ scale: 1.3 }],
  },
  startBtn: {
    minWidth: 220,
  },
  bail: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  setCounter: {
    fontSize: 14,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  goText: {
    fontSize: 56,
    fontWeight: '900',
    color: COLORS.gold,
  },
  repsText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  ringWrapper: {
    position: 'relative',
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  restNumber: {
    fontSize: 32,
    fontWeight: '900',
  },
  restSec: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: -4,
  },
  doneIcon: {
    fontSize: 52,
  },
  doneText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.jade,
  },
});
