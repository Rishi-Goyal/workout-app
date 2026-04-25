import { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import PressableButton from '@/components/ui/PressableButton';
import CornerBrackets from '@/components/ui/CornerBrackets';
import { getDungeonRoutineInfo } from '@/lib/questGenerator';
import { STATUS_ICON, exerciseSummaryLine } from '@/lib/questUtils';
import { COLORS, FONTS, RADIUS } from '@/lib/constants';
import { muscleLevelTitle } from '@/lib/muscleXP';
import { scheduleTomorrowReminder, cancelTomorrowReminder } from '@/lib/workoutNotification';
import type { AdaptationChange } from '@/lib/adaptationEngine';
import type {
  DungeonSession,
  FitnessGoal,
  MuscleGroup,
  RawQuest,
} from '@/types';

const REASON_ICON: Record<AdaptationChange['reason'], string> = {
  overachieved:     '🔺',
  stabilise:        '📈',
  underachieved:    '🔻',
  cold_start:       '🌱',
  deload_after_gap: '🔄',
};
const REASON_COLOR: Record<AdaptationChange['reason'], string> = {
  overachieved:     COLORS.jade,
  stabilise:        COLORS.violetLight,
  underachieved:    COLORS.orange,
  cold_start:       COLORS.gold,
  deload_after_gap: COLORS.textMuted,
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
  /**
   * v4.1.0 B5 — preview of 2–3 quests the generator would hand out next session,
   * pre-computed by the caller after stores are updated. Undefined disables the
   * NEXT DUNGEON block entirely (used in tests / legacy callsites).
   */
  previewQuests?: RawQuest[];
  onClose: () => void;
}

/** Format seconds → "mm:ss". Clamped to >= 0. */
function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Compact per-quest hit rate line for the RESULTS block. */
function questHitRate(q: DungeonSession['quests'][number]): number | null {
  if (!q.loggedSets || q.loggedSets.length === 0) return null;
  const targetReps = parseInt(q.reps, 10);
  if (isNaN(targetReps) || targetReps <= 0) return null;
  const actual = q.loggedSets.reduce((s, l) => s + l.repsCompleted, 0);
  const target = q.sets * targetReps;
  if (target === 0) return null;
  return actual / target;
}

export default function SessionSummary({
  session, xpGained, didLevelUp, newLevel, muscleLevelUps = [],
  adaptationChanges = [], goal, previewQuests, onClose,
}: Props) {
  const completed = session.quests.filter((q) => q.status === 'complete').length;
  const half      = session.quests.filter((q) => q.status === 'half_complete').length;
  const skipped   = session.quests.filter((q) => q.status === 'skipped').length;

  // Rest-day flows have no lift quests and do not increment floorsCleared,
  // so the next playable floor is still session.floor (not + 1).
  const hasLiftQuests = session.quests.some(q => !q.kind || q.kind === 'lift');
  const nextRoutine = getDungeonRoutineInfo(goal, hasLiftQuests ? session.floor + 1 : session.floor);
  const growth      = session.growthRecord;

  // ── Reminder toggle state (optimistic; scheduleTomorrowReminder returns a
  //    boolean we can fall back on if permission was denied). ────────────────
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const toggleReminder = async () => {
    if (reminderBusy) return;
    setReminderBusy(true);
    try {
      if (reminderOn) {
        await cancelTomorrowReminder();
        setReminderOn(false);
      } else {
        const ok = await scheduleTomorrowReminder(7, 0);
        setReminderOn(ok);
      }
    } finally {
      setReminderBusy(false);
    }
  };

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

            {/* ── v4.1.0 B5 — RESULTS: time + hit rate ── */}
            {growth && (
              <Animated.View entering={FadeInDown.duration(400).delay(250)} style={styles.resultsBox}>
                <Text style={styles.sectionEyebrow}>RESULTS</Text>
                <View style={styles.resultsMainRow}>
                  <View style={styles.resultsStat}>
                    <Text style={styles.resultsStatNum}>{formatTime(growth.totalTimeSec)}</Text>
                    <Text style={styles.resultsStatLbl}>TIME</Text>
                  </View>
                  <View style={styles.resultsStat}>
                    <Text
                      style={[
                        styles.resultsStatNum,
                        {
                          color:
                            growth.hitRate >= 0.9 ? COLORS.jade :
                            growth.hitRate >= 0.6 ? COLORS.gold  :
                            COLORS.orange,
                        },
                      ]}
                    >
                      {Math.round(growth.hitRate * 100)}%
                    </Text>
                    <Text style={styles.resultsStatLbl}>HIT RATE</Text>
                  </View>
                </View>
                {session.quests.map((q) => {
                  const hr = questHitRate(q);
                  if (hr === null) return null;
                  return (
                    <View key={q.id} style={styles.questHitRow}>
                      <Text style={styles.questHitName} numberOfLines={1}>{q.exerciseName}</Text>
                      <Text
                        style={[
                          styles.questHitPct,
                          {
                            color:
                              hr >= 0.9 ? COLORS.jade :
                              hr >= 0.6 ? COLORS.gold  :
                              COLORS.orange,
                          },
                        ]}
                      >
                        {Math.round(hr * 100)}%
                      </Text>
                    </View>
                  );
                })}
              </Animated.View>
            )}

            {/* ── v4.1.0 B5 — GROWTH: PR cards ── */}
            {growth && (
              <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.growthBox}>
                <Text style={styles.growthEyebrow}>🏆 GROWTH</Text>
                {growth.prs.length === 0 ? (
                  <Text style={styles.growthEmpty}>No PRs this session — keep stacking reps.</Text>
                ) : (
                  growth.prs.map((pr, i) => (
                    <Animated.View
                      key={`${pr.exerciseId}-${i}`}
                      entering={FadeInRight.duration(280).delay(350 + i * 70)}
                      style={styles.prRow}
                    >
                      <Text style={styles.prIcon}>🔺</Text>
                      <View style={styles.prInfo}>
                        <Text style={styles.prName} numberOfLines={1}>{pr.exerciseName}</Text>
                        <Text style={styles.prDetail}>
                          {pr.metric === 'weight' ? 'New top weight' : 'New top reps'}
                          {'  ·  '}
                          <Text style={styles.prBefore}>{pr.previous}</Text>
                          {' → '}
                          <Text style={styles.prAfter}>{pr.now}</Text>
                          {pr.metric === 'weight' ? ' kg' : ' reps'}
                        </Text>
                      </View>
                    </Animated.View>
                  ))
                )}
              </Animated.View>
            )}

            {/* ── v4.1.0 B5 — LAGGARDS (optional) ── */}
            {growth && growth.laggards.length > 0 && (
              <Animated.View entering={FadeInDown.duration(400).delay(340)} style={styles.laggardsBox}>
                <Text style={styles.laggardsText}>
                  ⚠ {growth.laggards.map((m) => (m as string)).join(', ')} lagged this session — scheduled for next dungeon.
                </Text>
              </Animated.View>
            )}

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

            {/* ── v4.1.0 B5 — NEXT DUNGEON preview (supersedes old "next expedition") ── */}
            <Animated.View
              entering={FadeInDown.duration(350).delay(400)}
              style={styles.nextSection}
            >
              <Text style={styles.nextEyebrow}>⚔️ NEXT DUNGEON</Text>
              <View style={styles.nextRoutineRow}>
                <View style={styles.nextRoutineInfo}>
                  <Text style={styles.nextRoutineName}>{nextRoutine.splitName}</Text>
                  <Text style={styles.nextRoutineDay}>{nextRoutine.dayName}</Text>
                </View>
              </View>

              {previewQuests && previewQuests.length > 0 ? (
                <View style={styles.previewList}>
                  {/* Filter to lift quests only — warmup/cooldown are bookends,
                      not meaningful "next dungeon" preview content. */}
                  {previewQuests.filter(pq => !pq.kind || pq.kind === 'lift').slice(0, 3).map((pq, i) => (
                    <Animated.View
                      key={`${pq.exerciseId ?? pq.exerciseName}-${i}`}
                      entering={FadeInRight.duration(260).delay(440 + i * 60)}
                      style={styles.previewRow}
                    >
                      <Text style={styles.previewDot}>•</Text>
                      <View style={styles.previewInfo}>
                        <Text style={styles.previewName} numberOfLines={1}>
                          {pq.exerciseName}
                        </Text>
                        <Text style={styles.previewDetail}>
                          {pq.sets}×{pq.reps}
                          {typeof pq.suggestedWeight === 'number' ? `  @ ${pq.suggestedWeight}kg` : ''}
                        </Text>
                        {pq.adaptationCopy ? (
                          <Text style={styles.previewCopy}>{pq.adaptationCopy}</Text>
                        ) : null}
                      </View>
                    </Animated.View>
                  ))}
                </View>
              ) : (
                nextRoutine.targetMuscles.length > 0 && (
                  <View style={styles.nextMuscleChips}>
                    {nextRoutine.targetMuscles.slice(0, 4).map((m) => (
                      <View key={m} style={styles.nextMuscleChip}>
                        <Text style={styles.nextMuscleChipText}>
                          {(m as string).charAt(0).toUpperCase() + (m as string).slice(1)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )
              )}

              <Pressable
                onPress={toggleReminder}
                disabled={reminderBusy}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.reminderToggle,
                  reminderOn && styles.reminderToggleOn,
                ]}
              >
                <Text style={[styles.reminderText, reminderOn && styles.reminderTextOn]}>
                  {reminderOn ? '🔔 Reminder set — tomorrow at 7:00am' : '🔔 Remind me tomorrow at 7am'}
                </Text>
              </Pressable>
            </Animated.View>

            {/* ── Next session goals (adaptation changes — legacy fallback when no preview) ── */}
            {!previewQuests && adaptationChanges.length > 0 && (
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

  // RESULTS (B5)
  resultsBox: {
    width: '100%',
    backgroundColor: 'rgba(165,180,252,0.04)',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultsMainRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4 },
  resultsStat: { alignItems: 'center', gap: 2 },
  resultsStatNum: { fontSize: 28, fontFamily: FONTS.displayBold, letterSpacing: 0.5, color: COLORS.text },
  resultsStatLbl: { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.textMuted, letterSpacing: 2 },
  questHitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  questHitName: { flex: 1, fontSize: 12, fontFamily: FONTS.sansMed, color: COLORS.text, paddingRight: 10 },
  questHitPct:  { fontSize: 12, fontFamily: FONTS.mono, letterSpacing: 0.3 },

  // GROWTH (B5)
  growthBox: {
    width: '100%',
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  growthEyebrow: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: COLORS.jade,
    letterSpacing: 2,
    marginBottom: 2,
  },
  growthEmpty: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted, fontStyle: 'italic' },
  prRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prIcon:   { fontSize: 16, width: 22, textAlign: 'center' },
  prInfo:   { flex: 1, gap: 2 },
  prName:   { fontSize: 13, fontFamily: FONTS.sansMed, color: COLORS.text },
  prDetail: { fontSize: 11, fontFamily: FONTS.mono, color: COLORS.textMuted, letterSpacing: 0.3 },
  prBefore: { color: COLORS.textMuted },
  prAfter:  { color: COLORS.jade, fontFamily: FONTS.mono },

  // LAGGARDS (B5)
  laggardsBox: {
    width: '100%',
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
  },
  laggardsText: {
    fontSize: 11,
    fontFamily: FONTS.sansMed,
    color: COLORS.orange,
    textTransform: 'capitalize',
    lineHeight: 16,
  },

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

  // Adaptation changes — legacy fallback
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

  // NEXT DUNGEON (B5)
  nextSection: {
    width: '100%',
    backgroundColor: 'rgba(99,102,241,0.06)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.18)',
  },
  nextEyebrow: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: COLORS.violetLight,
    letterSpacing: 2,
  },
  nextRoutineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
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

  previewList: { gap: 8 },
  previewRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  previewDot:  { fontSize: 14, color: COLORS.violetLight, width: 12, textAlign: 'center', marginTop: 1 },
  previewInfo: { flex: 1, gap: 1 },
  previewName: { fontSize: 12, fontFamily: FONTS.sansMed, color: COLORS.text },
  previewDetail: { fontSize: 11, fontFamily: FONTS.mono, color: COLORS.textMuted, letterSpacing: 0.3 },
  previewCopy: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.violetLight, fontStyle: 'italic' },

  // Reminder toggle
  reminderToggle: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.35)',
    backgroundColor: 'rgba(99,102,241,0.06)',
    alignItems: 'center',
  },
  reminderToggleOn: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.4)',
  },
  reminderText:   { fontSize: 12, fontFamily: FONTS.sansBold, color: COLORS.violetLight, letterSpacing: 0.4 },
  reminderTextOn: { color: COLORS.jade },

  btn: { width: '100%', marginTop: 4 },
});
