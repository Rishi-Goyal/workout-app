/**
 * History Screen — workout log with calendar heatmap, streaks, and session details.
 */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import WorkoutCalendar from '@/components/dungeon/WorkoutCalendar';
import Badge from '@/components/ui/Badge';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { COLORS } from '@/lib/constants';

export default function HistoryScreen() {
  const sessions = useHistoryStore(s => s.sessions);
  const completed = sessions.filter(s => s.status === 'completed');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Animated.View entering={FadeInDown.duration(300)}>
          <Text style={styles.title}>Expedition Log</Text>
          <Text style={styles.subtitle}>Your journey through the dungeon.</Text>
        </Animated.View>

        {/* Calendar heatmap */}
        <Animated.View entering={FadeInDown.duration(300).delay(60)} style={styles.card}>
          <WorkoutCalendar sessions={sessions} />
        </Animated.View>

        {/* Personal bests / overload summary */}
        {completed.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300).delay(120)} style={styles.card}>
            <Text style={styles.sectionTitle}>RECENT EXPEDITIONS</Text>
            {sessions.slice(0, 30).map((session) => {
              const completedQuests = session.quests.filter(
                q => q.status === 'complete' || q.status === 'half_complete'
              );
              const skipped = session.quests.filter(q => q.status === 'skipped').length;
              const date = new Date(session.startedAt);
              const dateStr = date.toLocaleDateString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric',
              });

              return (
                <View key={session.id} style={styles.sessionCard}>
                  {/* Session header */}
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionHeaderLeft}>
                      <Text style={styles.sessionFloor}>Floor {session.floor}</Text>
                      <Badge
                        label={session.status === 'completed' ? '✓ Done' : session.status}
                        variant={session.status === 'completed' ? 'jade' : 'muted'}
                      />
                    </View>
                    <View style={styles.sessionHeaderRight}>
                      <Text style={styles.sessionXP}>+{session.totalXPEarned} XP</Text>
                      <Text style={styles.sessionDate}>{dateStr}</Text>
                    </View>
                  </View>

                  {/* Quest list */}
                  <View style={styles.questList}>
                    {session.quests.map((quest) => {
                      const done = quest.status === 'complete' || quest.status === 'half_complete';
                      const topSet = quest.loggedSets && quest.loggedSets.length > 0
                        ? quest.loggedSets[quest.loggedSets.length - 1]
                        : null;
                      return (
                        <View key={quest.id} style={[styles.questRow, !done && styles.questSkipped]}>
                          <View style={styles.questLeft}>
                            <Text style={styles.questDot}>{done ? '✓' : '✕'}</Text>
                            <View>
                              <Text style={[styles.questName, !done && styles.questNameMuted]}>
                                {quest.exerciseName}
                              </Text>
                              {topSet && (
                                <Text style={styles.questLog}>
                                  {topSet.weight === 'bodyweight' ? 'BW' : `${topSet.weight}kg`}
                                  {' · '}
                                  {topSet.timeCompleted
                                    ? `${topSet.timeCompleted}s hold`
                                    : `${topSet.repsCompleted} reps`}
                                  {quest.loggedSets && quest.loggedSets.length > 1
                                    ? ` × ${quest.loggedSets.length} sets`
                                    : ''}
                                </Text>
                              )}
                            </View>
                          </View>
                          {done && (
                            <Text style={styles.questXP}>+{quest.xpEarned}</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        {sessions.length === 0 && (
          <Animated.View entering={FadeInDown.duration(300).delay(120)} style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📜</Text>
            <Text style={styles.emptyTitle}>No expeditions yet</Text>
            <Text style={styles.emptyText}>Complete your first dungeon floor to start your log.</Text>
          </Animated.View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 2,
  },

  // Session cards
  sessionCard: {
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionHeaderRight: { alignItems: 'flex-end' },
  sessionFloor: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  sessionXP: { fontSize: 13, fontWeight: '700', color: COLORS.gold },
  sessionDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // Quest rows
  questList: { gap: 6, paddingLeft: 4 },
  questRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  questSkipped: { opacity: 0.45 },
  questLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
  questDot: { fontSize: 11, color: COLORS.jade, marginTop: 2, width: 12 },
  questName: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  questNameMuted: { color: COLORS.textMuted },
  questLog: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  questXP: { fontSize: 11, fontWeight: '600', color: COLORS.gold },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', maxWidth: 240 },
});
