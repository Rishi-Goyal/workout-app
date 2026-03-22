import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { COLORS } from '@/lib/constants';

function SkeletonBox({ width, height }: { width: number | string; height: number }) {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{ width: width as number, height, backgroundColor: COLORS.border, borderRadius: 6 }, style]}
    />
  );
}

export default function QuestSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <SkeletonBox width="60%" height={18} />
        <SkeletonBox width={60} height={18} />
      </View>
      <SkeletonBox width="90%" height={12} />
      <SkeletonBox width="70%" height={12} />
      <View style={styles.statsRow}>
        {[1, 2, 3, 4].map((i) => <SkeletonBox key={i} width={60} height={48} />)}
      </View>
      <SkeletonBox width="100%" height={40} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  statsRow: { flexDirection: 'row', gap: 4 },
});
