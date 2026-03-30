/**
 * FormCueChecklist — interactive form cues the user ticks off during a set.
 *
 * State is local and intentionally not persisted: the list resets each time the
 * user navigates to a new exercise, which is the correct behaviour.
 */
import { useRef, useState } from 'react';
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

export default function FormCueChecklist({ cues, accentColor }: FormCueChecklistProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  // One shared value per cue for the spring pop animation on check.
  // useRef ensures stable allocation across re-renders without violating rules of hooks.
  const scales = useRef(cues.map(() => useSharedValue(1))).current;

  function toggle(index: number) {
    const next = new Set(checked);
    const isChecking = !next.has(index);

    if (isChecking) {
      next.add(index);
      // Spring pop: scale up then snap back
      scales[index].value = withSpring(1.08, { damping: 6, stiffness: 300 }, () => {
        scales[index].value = withSpring(1, { damping: 12, stiffness: 200 });
      });
    } else {
      next.delete(index);
    }
    setChecked(next);
  }

  const total = cues.length;
  const doneCount = checked.size;
  const allDone = doneCount === total;

  return (
    <View style={styles.container}>
      {/* Progress line */}
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(doneCount / total) * 100}%`,
                backgroundColor: allDone ? COLORS.jade : accentColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, allDone && { color: COLORS.jade }]}>
          {allDone ? '✓ All cues checked' : `${doneCount}/${total}`}
        </Text>
      </View>

      {/* Cue rows */}
      {cues.map((cue, i) => {
        const isChecked = checked.has(i);
        // eslint-disable-next-line react-hooks/rules-of-hooks -- stable array length
        const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scales[i].value }] }));

        return (
          <Pressable
            key={i}
            onPress={() => toggle(i)}
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
              style={[
                styles.cueText,
                isChecked && styles.cueTextChecked,
              ]}
              numberOfLines={2}
            >
              {cue}
            </Text>
          </Pressable>
        );
      })}
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
