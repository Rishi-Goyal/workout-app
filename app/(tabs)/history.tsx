/**
 * History Screen — workout log with calendar heatmap and expandable session cards.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import WorkoutCalendar from '@/components/dungeon/WorkoutCalendar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import SectionLabel from '@/components/ui/SectionLabel';
import PressableButton from '@/components/ui/PressableButton';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { daysSince, isWithinDays } from '@/lib/dateUtils';
import { COLORS, RADIUS } from '@/lib/constants';
import type { DungeonSession, Quest, MuscleGroup } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDuration(startedAt: string, completedAt?: string): string | null {
  if (!completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms <= 0) return null;
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function uniqueMuscles(quests: Quest[]): MuscleGroup[] {
  const seen = new Set<MuscleGroup>();
  for (const q of quests) {
    for (const m of q.targetMuscles) seen.add(m as MuscleGroup);
  }
  return Array.from(seen).slice(0, 5);
}

function formatWeight(w: number | 'bodyweight'): string {
  return w === 'bodyweight' ? 'BW' : `${w}kg`;
}

function questSummary(q: Quest): string {
  if (q.loggedSets && q.loggedSets.length > 0) {
    const last = q.loggedSets[q.loggedSets.length - 1];
    const sets = q.loggedSets.length;
    const reps = q.loggedSets.map(s => s.repsCompleted).join('/');
    const w = formatWeight(last.weight);
    return `${sets}s ${reps}r @ ${w}`;
  }
  return `${q.sets}x${q.reps}`;
}

const STATUS_ICON: Record<string, string> = {
  complete: '\u2705',
  half_complete: '\u26A0\uFE0F',
  skipped: '\u23ED\uFE0F',
  pending: '\u23F3',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const sessions = useHistoryStore(s => s.sessions);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Contextual state logic
  const hasAny            = sessions.length > 0;
  const hasTrainedRecently = hasAny && isWithinDays(sessions[0].startedAt, 7);
  const daysSinceLast      = hasAny ? daysSince(sessions[0].startedAt) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>History</Text>

        <WorkoutCalendar sessions={sessions} />

        {/* ── State 1: no sessions at all ── */}
        {!hasAny && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptyText}>Complete your first workout to start building your history.</Text>
            <PressableButton
              label="Start a Workout →"
              size="md"
              style={styles.emptyCta}
              onPress={() => router.replace('/(tabs)')}
            />
          </View>
        )}

        {/* ── State 2: sessions exist but nothing in the last 7 days ── */}
        {hasAny && !hasTrainedRecently && (
          <Card padding={16} style={styles.gapCard}>
            <Text style={styles.gapIcon}>⚔️</Text>
            <Text style={styles.gapTitle}>The dungeon grows stronger while you rest.</Text>
            <Text style={styles.gapSub}>
              Your last session was {daysSinceLast} {daysSinceLast === 1 ? 'day' : 'days'} ago.
              {' '}Time to return.
            </Text>
            <PressableButton
              label="Start a Workout →"
              size="md"
              style={styles.gapCta}
              onPress={() => router.replace('/(tabs)')}
            />
          </Card>
        )}

        {/* ── Session list (states 2 + 3) ── */}
        {hasAny && (
          <View>
            <SectionLabel>RECENT</SectionLabel>
            {sessions.slice(0, 30).map((session, index) => (
              <SessionCard
                key={session.id}
                session={session}
                isExpanded={expanded.has(session.id)}
                onToggle={() => toggle(session.id)}
                showDivider={index > 0}
              />
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({ session, isExpanded, onToggle, showDivider }: {
  session: DungeonSession;
  isExpanded: boolean;
  onToggle: () => void;
  showDivider: boolean;
}) {
  const duration = formatDuration(session.startedAt, session.completedAt);
  const muscles = uniqueMuscles(session.quests);
  const exerciseCount = session.quests.length;
  const completed = session.quests.filter(q => q.status === 'complete').length;
  const half      = session.quests.filter(q => q.status === 'half_complete').length;

  // Derive a meaningful badge from quest outcomes rather than the top-level
  // session.status, which is always 'completed' after finalizeSession().
  const allSkipped = exerciseCount > 0 && completed === 0 && half === 0;
  const allDone    = completed === exerciseCount;
  const badgeLabel   = allSkipped ? 'Skipped' : allDone ? 'Done' : 'Partial';
  const badgeVariant = allSkipped ? 'muted' : allDone ? 'jade' : 'orange';

  return (
    <View>
      {showDivider && <View style={styles.divider} />}
      <Pressable style={styles.sessionRow} onPress={onToggle}>
        {/* Left: date + summary */}
        <View style={styles.sessionLeft}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionDate}>{formatDate(session.startedAt)}</Text>
            {duration && <Text style={styles.sessionDuration}>{duration}</Text>}
          </View>
          <Text style={styles.sessionMeta}>
            {completed}/{exerciseCount} exercises{' '}
            {session.totalXPEarned > 0 && `\u00B7 +${session.totalXPEarned} XP`}
          </Text>
          {/* Muscle tags */}
          <View style={styles.muscleTags}>
            {muscles.map(m => (
              <View key={m} style={styles.muscleChip}>
                <Text style={styles.muscleChipText}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Right: status + expand chevron */}
        <View style={styles.sessionRight}>
          <Badge
            label={badgeLabel}
            variant={badgeVariant}
          />
          <Text style={styles.chevron}>{isExpanded ? '\u25B2' : '\u25BC'}</Text>
        </View>
      </Pressable>

      {/* Expanded: per-exercise breakdown */}
      {isExpanded && (
        <View style={styles.exerciseList}>
          {session.quests.map(q => (
            <View key={q.id} style={styles.exerciseRow}>
              <Text style={styles.exerciseStatus}>{STATUS_ICON[q.status] ?? ''}</Text>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{q.exerciseName}</Text>
                <Text style={styles.exerciseDetail}>{questSummary(q)}</Text>
              </View>
              {q.xpEarned > 0 && (
                <Text style={styles.exerciseXP}>+{q.xpEarned}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16, gap: 16, paddingBottom: 36 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 4 },

  divider: { height: 1, backgroundColor: COLORS.border },

  sessionRow: {
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionLeft: { flex: 1, gap: 4 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionDate: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  sessionDuration: { fontSize: 12, color: COLORS.textMuted },
  sessionMeta: { fontSize: 12, color: COLORS.textMuted },

  muscleTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  muscleChip: {
    backgroundColor: 'rgba(59,130,246,0.10)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  muscleChipText: { fontSize: 10, color: COLORS.gold, fontWeight: '600' },

  sessionRight: { alignItems: 'flex-end', gap: 6, paddingTop: 2 },
  chevron: { fontSize: 10, color: COLORS.textMuted },

  // Expanded exercise breakdown
  exerciseList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 10,
    marginBottom: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exerciseStatus: { fontSize: 14, width: 22, textAlign: 'center' },
  exerciseInfo: { flex: 1, gap: 1 },
  exerciseName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  exerciseDetail: { fontSize: 11, color: COLORS.textMuted },
  exerciseXP: { fontSize: 12, fontWeight: '700', color: COLORS.gold },

  // State 1 — no sessions
  emptyState: { alignItems: 'center', paddingTop: 48, gap: 6 },
  emptyIcon:  { fontSize: 36 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 6 },
  emptyText:  { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  emptyCta:   { marginTop: 14, alignSelf: 'stretch', marginHorizontal: 32 },

  // State 2 — gap > 7 days
  gapCard:  { gap: 8, borderColor: 'rgba(249,115,22,0.2)' },
  gapIcon:  { fontSize: 28 },
  gapTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  gapSub:   { fontSize: 13, color: COLORS.textMuted },
  gapCta:   { marginTop: 6, alignSelf: 'stretch' },
});
