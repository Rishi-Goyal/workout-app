import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { COLORS, FONTS } from '@/lib/constants';

interface AnimatedBarProps {
  value: number; // 0-100
  color?: string;
  height?: number;
  label?: string;
  rightLabel?: string;
  /**
   * If true, overlays 10 thin vertical divider ticks so the bar reads as a
   * segmented progress gauge (Solo Leveling HUD style). Off by default.
   */
  segmented?: boolean;
}

export default function AnimatedBar({
  value,
  color = COLORS.gold,
  height = 8,
  label,
  rightLabel,
  segmented = false,
}: AnimatedBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.min(100, Math.max(0, value)), { duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- width is a stable Reanimated shared value (ref-like)
  }, [value]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View>
      {(label || rightLabel) && (
        <View style={styles.labelRow}>
          {label && <Text style={styles.label}>{label}</Text>}
          {rightLabel && <Text style={styles.rightLabel}>{rightLabel}</Text>}
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color, height }, animStyle]} />
        {segmented && (
          <View pointerEvents="none" style={[styles.ticksRow, { height }]}>
            {Array.from({ length: 9 }).map((_, i) => (
              <View key={i} style={styles.tick} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.sansMed,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rightLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontFamily: FONTS.mono,
  },
  track: {
    width: '100%',
    backgroundColor: COLORS.surfaceAccent,
    borderRadius: 999,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: { borderRadius: 999 },
  // Segmented ticks overlay — 9 dividers create 10 visually-equal segments
  ticksRow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: '10%', // first/last tick skipped (10% * 1 = next to edge)
  },
  tick: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(7,6,26,0.55)', // bg-colored divider for contrast on any fill
  },
});
