import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { COLORS } from '@/lib/constants';

interface AnimatedBarProps {
  value: number; // 0-100
  color?: string;
  height?: number;
  label?: string;
  rightLabel?: string;
}

export default function AnimatedBar({
  value,
  color = COLORS.gold,
  height = 8,
  label,
  rightLabel,
}: AnimatedBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.min(100, Math.max(0, value)), { duration: 600 });
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 12, color: COLORS.textMuted },
  rightLabel: { fontSize: 12, color: COLORS.text },
  track: { width: '100%', backgroundColor: COLORS.border, borderRadius: 999, overflow: 'hidden' },
  fill: { borderRadius: 999 },
});
