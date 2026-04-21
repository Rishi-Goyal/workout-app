import { View, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import PressableButton from '@/components/ui/PressableButton';
import CornerBrackets from '@/components/ui/CornerBrackets';
import { getDungeonRoutineInfo } from '@/lib/questGenerator';
import { STATUS_ICON, exerciseSummaryLine } from '@/lib/questUtils';
import { COLORS, FONTS, RADIUS } from '@/lib/constants';
import { muscleLevelTitle } from '@/lib/muscleXP';
import type { AdaptationChange } from '@/lib/adaptationEngine';
import type { DungeonSession, FitnessGoal, MuscleGroup } from '@/types';

const REASON_ICON: Record<AdaptationChange['reason'], string> = {
  overachieved:  '🔺',
  met_target:    '📈',
  underachieved: '🔻',
  reset:         '🔄',
};
const REASON_COLOR: Record<AdaptationChange['reason'], string> = {
  overachieved:  COLORS.jade,
  met_target:    COLORS.violetLight,
  underachieved: COLORS.orange,
  reset:         COLORS.textMuted,
};

interface Props {
  session: DungeonSession;
  xpGained: number;
  didLevelUp: boolean;
  newLevel?: number;
  muscleLevelUps?: Array<{ muscle: MuscleGroup; newLevel: number }>;
  adaptationChanges?: AdaptationChange[];
  /** Used to look up the next floor's split/routine for the "what's next" section. */
  goal: FitnessGoal;
  onClose: () => void;
}

export default function SessionSummary({
  session, xpGained, didLevelUp, newLevel, muscleLevelUps = [],
  adaptationChanges = [], goal, onClose,
}: Props) {
  const completed = session.quests.filter((q) => q.status === 'complete').length;
  const half      = session.quests.filter((q) => q.status === 'half_complete').length;
  const skipped   = session.quests.filter((q) => q.status === 'skipped').length;

  const nextRoutine = getDungeonRoutineInfo(goal, session.floor + 1);

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.backdrop}>
        <Animated.View entering={ZoomIn.springify()} style={styles.card}>
          <CornerBrackets color={didLevelUp ? COLORS.gold : COLORS.violet} size={18} thickness={2} inset={8} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* ── Header ── */}
            <Text style={styles.icon}>
              {didLevelUp ? '🎉' : completed === 0 && half === 0 ? '📋' : '⚔️'}
            </Text>
            <Text style={styles.eyebrow}>
              {didLevelUp ? 'RANK UP' : completed === 0 && half === 0 ? 'FLOOR ABANDONED' : 'FLOOR CLEARED'}
            </Text>
            <Text style={styles.title}>
              {didLevelUp
                ? `LEVEL ${newLevel}`
                : `Floor ${session.floor}`}
            </Text>
            {didLevelUp && <Text style={styles.subtitle}>The hunter ascends.</Text>}

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
                EXPERIENCE EARNED
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

            {/* ── Next session goals (adaptation changes) ── */}
            {adaptationChanges.length > 0 && (
              <Animated.View entering={FadeInDown.duration(400).delay(350)} style={styles.adaptSection}>
                <Text style={styles.adaptEyebrow}>⚡ NEXT SESSION GOALS</Text>
                {adaptationChanges.map((ac, i) => {
                  const color = REASON_COLOR[ac.reason];
                  const icon  = REASON_ICON[ac.reason];
                  return (
                    <Animated.View
                      key={`${ac.exerciseName}-${i}`}
                      entering={FadeInRight.duration(260).delay(400 + i * 60)}
                      style={styles.adaptRow}
                    >
                      <Text style={styles.adaptIcon}>{icon}</Text>
                      <View style={styles.adaptInfo}>
                        <Text style={styles.adaptName} numberOfLines={1}>{ac.exerciseName}</Text>
                        {ac.lines.map((line, j) => (
                          <Text key={j} style={[styles.adaptLine, { color }]}>{line}</Text>
                        ))}
                      </View>
                    </Animated.View>
                  );
                })}
              </Animated.View>
            )}

            {/* ── What's next ── */}
            <Animated.View
              entering={FadeInDown.duration(350).delay(400)}
              style={styles.nextSection}
            >
              <Text style={styles.nextEyebrow}>NEXT EXPEDITION</Text>
              <Text style={styles.nextRest}>Rest between dungeon runs. Your muscles rebuild stronger in recovery.</Text>
              <View style={styles.nextRoutineRow}>
                <Text style={styles.nextRoutineLabel}>NEXT UP</Text>
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

            <PressableButton label="Continue" size="lg" onPress={onClose} style={styles.btn} variant="primary" />
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
  eyebrow:  { fontSize: 11, fontFamily: FONTS.sansBold, color: COLORS.violetLight, letterSpacing: 3, marginTop: -4 },
  title:    { fontSize: 26, fontFamily: FONTS.displayBold, color: COLORS.gold, textAlign: 'center', letterSpacing: 1, marginTop: -2 },
  subtitle: { fontSize: 13, fontFamily: FONTS.sans, color: COLORS.textSecondary, marginTop: -6, fontStyle: 'italic' },

  // Counts
  statsRow: { flexDirection: 'row', gap: 24 },
  stat:     { alignItems: 'center' },
  statNum:  { fontSize: 28, fontFamily: FONTS.displayBold, letterSpacing: 0.5 },
  statLbl:  { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.textMuted, marginTop: 2, letterSpacing: 1.5 },

  // XP box
  xpBox: {
    backgroundColor: 'rgba(245,166,35,0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.3)',
    alignItems: 'center',
    width: '100%',
  },
  xpNum: { fontSize: 34, fontFamily: FONTS.displayBold, color: COLORS.gold, letterSpacing: 1 },
  xpLbl: { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.textMuted, marginTop: 4, letterSpacing: 2 },

  // Per-exercise outcomes
  exerciseSection: {
    width: '100%',
    backgroundColor: 'rgba(165,180,252,0.04)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: COLORS.textSecondary,
    letterSpacing: 2,
    marginBottom: 2,
  },
  exerciseRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exerciseStatus: { fontSize: 14, width: 22, textAlign: 'center' },
  exerciseInfo:   { flex: 1, gap: 1 },
  exerciseName:   { fontSize: 13, fontFamily: FONTS.sansMed, color: COLORS.text },
  exerciseDetail: { fontSize: 11, fontFamily: FONTS.mono, color: COLORS.textMuted, letterSpacing: 0.3 },
  exerciseXP:     { fontSize: 12, fontFamily: FONTS.mono, color: COLORS.gold, letterSpacing: 0.5 },

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
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: COLORS.jade,
    letterSpacing: 2,
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
    fontFamily: FONTS.sansMed,
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  muscleLevelBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  muscleLevelText: { fontSize: 11, fontFamily: FONTS.mono, color: COLORS.jade, letterSpacing: 0.5 },

  // Adaptation changes — next session goals
  adaptSection: {
    width: '100%',
    backgroundColor: 'rgba(99,102,241,0.06)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.18)',
  },
  adaptEyebrow: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: COLORS.violetLight,
    letterSpacing: 2,
    marginBottom: 2,
  },
  adaptRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  adaptIcon: { fontSize: 14, width: 20, textAlign: 'center', marginTop: 1 },
  adaptInfo: { flex: 1, gap: 2 },
  adaptName: { fontSize: 12, fontFamily: FONTS.sansMed, color: COLORS.text },
  adaptLine: { fontSize: 11, fontFamily: FONTS.sans },

  // What's next
  nextSection: {
    width: '100%',
    backgroundColor: 'rgba(99,102,241,0.06)',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.18)',
  },
  nextEyebrow: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: COLORS.violetLight,
    letterSpacing: 2,
  },
  nextRest: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textSecondary },
  nextRoutineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextRoutineLabel: { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.textMuted, width: 52, letterSpacing: 1.2 },
  nextRoutineInfo: { flex: 1 },
  nextRoutineName: { fontSize: 14, fontFamily: FONTS.displayBold, color: COLORS.text, letterSpacing: 0.3 },
  nextRoutineDay:  { fontSize: 11, fontFamily: FONTS.mono, color: COLORS.textMuted, letterSpacing: 0.5 },
  nextMuscleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  nextMuscleChip: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
  },
  nextMuscleChipText: { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.violetLight, textTransform: 'uppercase', letterSpacing: 0.8 },

  btn: { width: '100%', marginTop: 4 },
});
