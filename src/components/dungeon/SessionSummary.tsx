import { View, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import PressableButton from '@/components/ui/PressableButton';
import { getDungeonRoutineInfo } from '@/lib/questGenerator';
import { STATUS_ICON, exerciseSummaryLine } from '@/lib/questUtils';
import { COLORS, RADIUS } from '@/lib/constants';
import { muscleLevelTitle } from '@/lib/muscleXP';
import type { DungeonSession, FitnessGoal, MuscleGroup } from '@/types';

interface Props {
  session: DungeonSession;
  xpGained: number;
  didLevelUp: boolean;
  newLevel?: number;
  muscleLevelUps?: Array<{ muscle: MuscleGroup; newLevel: number }>;
  /** Used to look up the next floor's split/routine for the "what's next" section. */
  goal: FitnessGoal;
  onClose: () => void;
}

export default function SessionSummary({
  session, xpGained, didLevelUp, newLevel, muscleLevelUps = [], goal, onClose,
}: Props) {
  const completed = session.quests.filter((q) => q.status === 'complete').length;
  const half      = session.quests.filter((q) => q.status === 'half_complete').length;
  const skipped   = session.quests.filter((q) => q.status === 'skipped').length;

  const nextRoutine = getDungeonRoutineInfo(goal, session.floor + 1);

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.backdrop}>
        <Animated.View entering={ZoomIn.springify()} style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* ── Header ── */}
            <Text style={styles.icon}>
              {didLevelUp ? '🎉' : completed === 0 && half === 0 ? '📋' : '⚔️'}
            </Text>
            <Text style={styles.title}>
              {didLevelUp
                ? `Level ${newLevel}!`
                : completed === 0 && half === 0
                  ? `Session ${session.floor} Ended`
                  : `Session ${session.floor} Cleared`}
            </Text>
            {didLevelUp && <Text style={styles.subtitle}>You leveled up!</Text>}

            {/* ── Done / Half / Skip counts ── */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: COLORS.jade }]}>{completed}</Text>
                <Text style={styles.statLbl}>Done</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: COLORS.gold }]}>{half}</Text>
                <Text style={styles.statLbl}>Half</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: COLORS.textMuted }]}>{skipped}</Text>
                <Text style={styles.statLbl}>Skip</Text>
              </View>
            </View>

            {/* ── XP earned — number animates separately for impact ── */}
            <View style={styles.xpBox}>
              <Animated.Text entering={ZoomIn.springify().delay(150)} style={styles.xpNum}>
                +{xpGained} XP
              </Animated.Text>
              <Animated.Text entering={FadeIn.duration(400).delay(350)} style={styles.xpLbl}>
                Experience Earned
              </Animated.Text>
            </View>

            {/* ── Per-exercise outcomes ── */}
            <View style={styles.exerciseSection}>
              <Text style={styles.sectionEyebrow}>EXERCISES</Text>
              {session.quests.map((q, i) => (
                <Animated.View
                  key={q.id}
                  entering={FadeInRight.duration(280).delay(200 + i * 70)}
                  style={styles.exerciseRow}
                >
                  <Text style={styles.exerciseStatus}>{STATUS_ICON[q.status] ?? ''}</Text>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName} numberOfLines={1}>{q.exerciseName}</Text>
                    <Text style={styles.exerciseDetail}>{exerciseSummaryLine(q)}</Text>
                  </View>
                  {q.xpEarned > 0 && (
                    <Text style={styles.exerciseXP}>+{q.xpEarned}</Text>
                  )}
                </Animated.View>
              ))}
            </View>

            {/* ── Muscle level-ups ── */}
            {muscleLevelUps.length > 0 && (
              <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.muscleLevelUps}>
                <Text style={styles.muscleSectionTitle}>💪 MUSCLE LEVEL UPS</Text>
                {muscleLevelUps.map((lu, i) => (
                  <Animated.View
                    key={`${lu.muscle}-${i}`}
                    entering={FadeInDown.duration(300).delay(400 + i * 100)}
                    style={styles.muscleLevelRow}
                  >
                    <Text style={styles.muscleName}>{lu.muscle}</Text>
                    <View style={styles.muscleLevelBadge}>
                      <Text style={styles.muscleLevelText}>
                        Lv.{lu.newLevel} — {muscleLevelTitle(lu.newLevel)}
                      </Text>
                    </View>
                  </Animated.View>
                ))}
              </Animated.View>
            )}

            {/* ── What's next ── */}
            <Animated.View
              entering={FadeInDown.duration(350).delay(400)}
              style={styles.nextSection}
            >
              <Text style={styles.nextEyebrow}>WHAT'S NEXT</Text>
              <Text style={styles.nextRest}>Rest before your next session to let your muscles recover.</Text>
              <View style={styles.nextRoutineRow}>
                <Text style={styles.nextRoutineLabel}>Next up</Text>
                <View style={styles.nextRoutineInfo}>
                  <Text style={styles.nextRoutineName}>{nextRoutine.splitName}</Text>
                  <Text style={styles.nextRoutineDay}>{nextRoutine.dayName}</Text>
                </View>
              </View>
              {nextRoutine.targetMuscles.length > 0 && (
                <View style={styles.nextMuscleChips}>
                  {nextRoutine.targetMuscles.slice(0, 4).map((m) => (
                    <View key={m} style={styles.nextMuscleChip}>
                      <Text style={styles.nextMuscleChipText}>
                        {(m as string).charAt(0).toUpperCase() + (m as string).slice(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>

            <PressableButton label="Continue" size="lg" onPress={onClose} style={styles.btn} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    maxHeight: '90%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scrollContent: { alignItems: 'center', gap: 16 },

  // Header
  icon:     { fontSize: 52 },
  title:    { fontSize: 24, fontWeight: '800', color: COLORS.gold, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: -8 },

  // Counts
  statsRow: { flexDirection: 'row', gap: 24 },
  stat:     { alignItems: 'center' },
  statNum:  { fontSize: 28, fontWeight: '700' },
  statLbl:  { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  // XP box
  xpBox: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    alignItems: 'center',
    width: '100%',
  },
  xpNum: { fontSize: 32, fontWeight: '800', color: COLORS.gold },
  xpLbl: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },

  // Per-exercise outcomes
  exerciseSection: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  exerciseRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exerciseStatus: { fontSize: 14, width: 22, textAlign: 'center' },
  exerciseInfo:   { flex: 1, gap: 1 },
  exerciseName:   { fontSize: 13, fontWeight: '600', color: COLORS.text },
  exerciseDetail: { fontSize: 11, color: COLORS.textMuted },
  exerciseXP:     { fontSize: 12, fontWeight: '700', color: COLORS.gold },

  // Muscle level-ups (unchanged)
  muscleLevelUps: {
    width: '100%',
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  muscleSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.jade,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 4,
  },
  muscleLevelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  muscleName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  muscleLevelBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  muscleLevelText: { fontSize: 11, fontWeight: '700', color: COLORS.jade },

  // What's next
  nextSection: {
    width: '100%',
    backgroundColor: 'rgba(59,130,246,0.06)',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.15)',
  },
  nextEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: '#60a5fa',
    letterSpacing: 1.2,
  },
  nextRest: { fontSize: 12, color: COLORS.textMuted },
  nextRoutineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextRoutineLabel: { fontSize: 11, color: COLORS.textMuted, width: 44 },
  nextRoutineInfo: { flex: 1 },
  nextRoutineName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  nextRoutineDay:  { fontSize: 12, color: COLORS.textMuted },
  nextMuscleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  nextMuscleChip: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  nextMuscleChipText: { fontSize: 10, fontWeight: '600', color: '#60a5fa', textTransform: 'capitalize' },

  btn: { width: '100%', marginTop: 4 },
});
