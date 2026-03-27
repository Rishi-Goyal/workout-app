/**
 * History Screen — workout log with calendar heatmap and flat session list.
 */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WorkoutCalendar from '@/components/dungeon/WorkoutCalendar';
import Badge from '@/components/ui/Badge';
import SectionLabel from '@/components/ui/SectionLabel';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { COLORS } from '@/lib/constants';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HistoryScreen() {
  const sessions = useHistoryStore(s => s.sessions);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>History</Text>

        <WorkoutCalendar sessions={sessions} />

        {sessions.length > 0 && (
          <View>
            <SectionLabel>RECENT</SectionLabel>
            {sessions.slice(0, 30).map((session, index) => {
              const exerciseCount = session.quests.length;
              return (
                <View key={session.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.sessionRow}>
                    <View style={styles.sessionLeft}>
                      <Text style={styles.sessionLabel}>Workout {session.floor}</Text>
                      <Text style={styles.sessionMeta}>
                        +{session.totalXPEarned} XP {'\u2022'} {exerciseCount} exercises
                      </Text>
                    </View>
                    <View style={styles.sessionRight}>
                      <Text style={styles.sessionDate}>{formatDate(session.startedAt)}</Text>
                      <Badge
                        label={session.status === 'completed' ? 'Done' : 'Partial'}
                        variant={session.status === 'completed' ? 'jade' : 'muted'}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {sessions.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptyText}>Complete your first workout to see your history.</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16, gap: 16, paddingBottom: 36 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 4 },

  divider: { height: 1, backgroundColor: COLORS.border },
  sessionRow: {
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionLeft: { flex: 1, gap: 3 },
  sessionLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  sessionMeta: { fontSize: 12, color: COLORS.textMuted },
  sessionRight: { alignItems: 'flex-end', gap: 4 },
  sessionDate: { fontSize: 12, color: COLORS.textMuted },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 6 },
});
