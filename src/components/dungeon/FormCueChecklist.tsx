/**
 * FormCueChecklist — interactive form cues the user ticks off during a set.
 *
 * State is local and intentionally not persisted: the list resets each time the
 * user navigates to a new exercise, which is the correct behaviour.
 *
 * v4.2.0 hotfix — each cue row is now its own <CueRow/> component so the
 * parent calls a fixed number of hooks regardless of cue count. The
 * previous version called `useSharedValue` and `useAnimatedStyle` inside
 * `cues.map(...)`, which crashed with "Should have a queue. You are
 * likely calling Hooks conditionally" the moment Theme E's mid-quest
 * progression-swap changed the underlying exercise's cue count.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { COLORS } from '@/lib/constants';

interface FormCueChecklistProps {
  cues: string[];
  /** Accent colour matching the exercise movement type (from TYPE_COLOR in InstructionsPanel). */
  accentColor: string;
}

// ---------------------------------------------------------------------------
// CueRow — owns its own animation state. One instance per cue.
// Hook count is fixed (1 useSharedValue + 1 useAnimatedStyle + 1 useEffect),
// so changes to the parent's `cues` array length never violate rules of hooks.
// ---------------------------------------------------------------------------

interface CueRowProps {
  cue: string;
  isChecked: boolean;
  accentColor: string;
  onPress: () => void;
}

function CueRow({ cue, isChecked, accentColor, onPress }: CueRowProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // Spring pop on the false → true transition. Skip the initial-mount fire.
  useEffect(() => {
    if (!isChecked) return;
    scale.value = withSpring(1.08, { damping: 6, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    });
  }, [isChecked, scale]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cueRow, pressed && styles.cueRowPressed]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isChecked }}
      accessibilityLabel={cue}
    >
      <Animated.View style={animStyle}>
        <View
          style={[
            styles.checkbox,
            isChecked
              ? { backgroundColor: accentColor, borderColor: accentColor }
              : { borderColor: accentColor + '60' },
          ]}
        >
          {isChecked && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Animated.View>

      <Text
        style={[styles.cueText, isChecked && styles.cueTextChecked]}
        numberOfLines={2}
      >
        {cue}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// FormCueChecklist
// ---------------------------------------------------------------------------

export default function FormCueChecklist({ cues, accentColor }: FormCueChecklistProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // v4.2.0 — reset checked-state when the cue list itself changes (e.g. the
  // user swaps the active quest's exercise). Otherwise stale checks from the
  // previous exercise carry over by index/text and look weird. Keying off
  // the joined cue text gives a stable identity that survives re-orderings.
  const cueKey = cues.join('|');
  useEffect(() => {
    setChecked(new Set());
  }, [cueKey]);

  function toggle(cue: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(cue)) next.delete(cue);
      else next.add(cue);
      return next;
    });
  }

  const total = cues.length;
  const doneCount = checked.size;
  const allDone = total > 0 && doneCount === total;

  return (
    <View style={styles.container}>
      {/* Progress line */}
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: total > 0 ? `${(doneCount / total) * 100}%` : '0%',
                backgroundColor: allDone ? COLORS.jade : accentColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, allDone && { color: COLORS.jade }]}>
          {allDone ? '✓ All cues checked' : `${doneCount}/${total}`}
        </Text>
      </View>

      {/* Cue rows — one CueRow component per cue. Hook count per child is
          fixed; total parent hook count is also fixed, so this is safe under
          dynamic-length cue arrays (mid-quest progression swaps). */}
      {cues.map((cue) => (
        <CueRow
          key={cue}
          cue={cue}
          isChecked={checked.has(cue)}
          accentColor={accentColor}
          onPress={() => toggle(cue)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },

  // Progress bar
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    borderRadius: 999,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    minWidth: 60,
    textAlign: 'right',
  },

  // Individual cue row
  cueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cueRowPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Checkbox circle
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkmark: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 14,
  },

  // Cue text
  cueText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  cueTextChecked: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
});
