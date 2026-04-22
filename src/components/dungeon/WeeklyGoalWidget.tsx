/**
 * WeeklyGoalWidget — Mon–Sun workout progress, streak, and freeze UI.
 *
 * Renders on the Home entrance view between the hero card and the stats row.
 * Also handles the missed-week freeze prompt via Alert.
 */
import { useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Card from '@/components/ui/Card';
import { useWeeklyGoalStore } from '@/stores/useWeeklyGoalStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { getDaysTrainedThisWeek, countSessionsInWeek, getISOWeekKey } from '@/lib/weeklyGoalUtils';
import { COLORS, FONTS } from '@/lib/constants';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function WeeklyGoalWidget() {
  const {
    currentStreak,
    longestStreak,
    freezesAvailable,
    pendingMissedWeek,
    settings,
    consumeFreeze,
    breakStreak,
    evaluateWeek,
    setWeeklyTarget,
  } = useWeeklyGoalStore();

  const sessions = useHistoryStore((s) => s.sessions);

  // Re-evaluate on mount in case a week boundary passed while the app was closed
  useEffect(() => {
    evaluateWeek(sessions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show freeze-or-reset prompt when a missed week is detected
  useEffect(() => {
    if (!pendingMissedWeek) return;
    const hasFreezes = freezesAvailable > 0;
    Alert.alert(
      'Weekly goal missed',
      hasFreezes
        ? `You didn't hit your ${settings.targetWorkoutsPerWeek}x/week target last week.\n\nUse a streak freeze to protect your ${currentStreak}-week streak? (${freezesAvailable} remaining)`
        : `You didn't hit your ${settings.targetWorkoutsPerWeek}x/week target last week. Your streak has been reset.`,
      hasFreezes
        ? [
            {
              text: 'Use Freeze ❄️',
              onPress: consumeFreeze,
            },
            {
              text: 'Reset Streak',
              style: 'destructive',
              onPress: breakStreak,
            },
          ]
        : [{ text: 'OK', onPress: breakStreak }],
      { cancelable: false },
    );
  // Only fire when pendingMissedWeek changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMissedWeek]);

  const daysThisWeek = getDaysTrainedThisWeek(sessions);
  const thisWeekKey = getISOWeekKey(new Date());
  const thisWeekCount = countSessionsInWeek(sessions, thisWeekKey);
  const target = settings.targetWorkoutsPerWeek;
  const remaining = Math.max(0, target - thisWeekCount);
  const goalMet = thisWeekCount >= target;

  // Today's day index (0 = Mon, 6 = Sun)
  const todayIndex = (new Date().getDay() + 6) % 7;

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <Card padding={14} style={styles.card}>

        {/* Header row: streak + freeze */}
        <View style={styles.headerRow}>
          <View style={styles.streakBlock}>
            <Text style={styles.streakNum}>{currentStreak}</Text>
            <Text style={styles.streakLabel}>WEEK STREAK</Text>
          </View>
          <View style={styles.rightMeta}>
            {longestStreak > 1 && currentStreak < longestStreak && (
              <Text style={styles.bestText}>best: {longestStreak}w</Text>
            )}
            <Pressable style={styles.freezePill} onPress={() => {
              Alert.alert(
                'Streak Freeze ❄️',
                `You have ${freezesAvailable} freeze${freezesAvailable !== 1 ? 's' : ''} available.\n\nA freeze protects your streak if you miss a weekly goal. You earn one every ${useWeeklyGoalStore.getState().settings.freezeEarnedEvery} consecutive weeks of hitting your target.`,
              );
            }}>
              <Text style={styles.freezeIcon}>❄️</Text>
              <Text style={styles.freezeCount}>{freezesAvailable}</Text>
            </Pressable>
          </View>
        </View>

        {/* Mon–Sun dot row */}
        <View style={styles.dotRow}>
          {DAY_LABELS.map((label, i) => {
            const trained = daysThisWeek[i];
            const isToday = i === todayIndex;
            return (
              <View key={i} style={styles.dayCol}>
                <View
                  style={[
                    styles.dot,
                    trained && styles.dotTrained,
                    isToday && !trained && styles.dotToday,
                    goalMet && trained && styles.dotGoalMet,
                  ]}
                />
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Progress line — tap label to adjust target */}
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, (thisWeekCount / target) * 100)}%` },
                goalMet && styles.progressFillGoalMet,
              ]}
            />
          </View>
          <Pressable
            onPress={() => {
              const buttons = [];
              if (target > 1) buttons.push({ text: `Less (${target - 1}x)`, onPress: () => setWeeklyTarget(target - 1) });
              if (target < 7) buttons.push({ text: `More (${target + 1}x)`, onPress: () => setWeeklyTarget(target + 1) });
              buttons.push({ text: 'Keep', style: 'cancel' as const });
              Alert.alert('Weekly Target', `Currently ${target}x per week`, buttons);
            }}
          >
            <Text style={[styles.progressLabel, goalMet && styles.progressLabelGoalMet]}>
              {goalMet
                ? '✓ Goal met!'
                : remaining === 1
                  ? '1 more this week'
                  : `${remaining} more this week`}
            </Text>
          </Pressable>
        </View>

      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  streakNum:   { fontSize: 26, fontFamily: FONTS.displayBold, color: COLORS.gold, letterSpacing: 0.5 },
  streakLabel: { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.textMuted, letterSpacing: 1.8 },
  rightMeta:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bestText:    { fontSize: 10, fontFamily: FONTS.mono, color: COLORS.textMuted, letterSpacing: 0.5 },

  // Freeze pill
  freezePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  freezeIcon:  { fontSize: 12 },
  freezeCount: { fontSize: 12, fontFamily: FONTS.sansBold, color: COLORS.cyan, letterSpacing: 0.5 },

  // Day dots
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayCol:  { alignItems: 'center', gap: 4, flex: 1 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
  },
  dotTrained:   { backgroundColor: COLORS.gold },
  dotGoalMet:   { backgroundColor: COLORS.jade },
  dotToday: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.gold,
  },
  dayLabel: {
    fontSize: 9,
    fontFamily: FONTS.sansBold,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  dayLabelToday: { color: COLORS.gold },

  // Progress bar
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.gold,
  },
  progressFillGoalMet: { backgroundColor: COLORS.jade },
  progressLabel:       { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.sansMed, letterSpacing: 0.3, minWidth: 100, textAlign: 'right' },
  progressLabelGoalMet:{ color: COLORS.jade, fontFamily: FONTS.sansBold, letterSpacing: 0.5 },
});
