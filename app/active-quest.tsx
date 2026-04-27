/**
 * Active Quest Screen — exercise guide, anatomical muscle map, and set/rest timer.
 *
 * Tabs: Guide (video + steps + cues), Muscles
 */
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import MuscleMap from '@/components/dungeon/MuscleMap';
import ExerciseGif from '@/components/dungeon/ExerciseGif';
import ExerciseVideo from '@/components/dungeon/ExerciseVideo';
import InstructionsPanel from '@/components/dungeon/InstructionsPanel';
import WorkoutTimer from '@/components/dungeon/WorkoutTimer';
import HoldDrillTimer from '@/components/dungeon/HoldDrillTimer';
import Badge from '@/components/ui/Badge';
import PressableButton from '@/components/ui/PressableButton';
import SectionLabel from '@/components/ui/SectionLabel';

import { useSessionStore } from '@/stores/useSessionStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { getSuggestedWeight } from '@/lib/weights';
import { EXERCISE_MAP } from '@/lib/exerciseDatabase';
import { COLORS, FONTS, RADIUS, SPACING } from '@/lib/constants';
import { showWorkoutNotification, dismissWorkoutNotification } from '@/lib/workoutNotification';
import type { MuscleGroup, QuestStatus, SetLog } from '@/types';

const DIFF_BADGE = {
  easy:   { variant: 'jade'    as const, label: 'C · EASY' },
  medium: { variant: 'gold'    as const, label: 'B · MEDIUM' },
  hard:   { variant: 'orange'  as const, label: 'A · HARD' },
  boss:   { variant: 'crimson' as const, label: 'S · BOSS' },
};

// v4.2.0 Theme A — non-lift quests don't have a rank; show their phase instead.
const PHASE_BADGE = {
  warmup:   { variant: 'jade'   as const, label: '⚔️ MOB · WARMUP' },
  cooldown: { variant: 'violet' as const, label: '🏕️ RECOVERY · STRETCH' },
  mobility: { variant: 'violet' as const, label: '🏕️ RECOVERY · MOBILITY' },
} as const;

const SECONDARY: Partial<Record<MuscleGroup, MuscleGroup[]>> = {
  chest:      ['triceps', 'shoulders'],
  shoulders:  ['triceps', 'chest'],
  back:       ['biceps', 'core'],
  biceps:     ['shoulders', 'core'],
  triceps:    ['shoulders', 'chest'],
  quads:      ['glutes', 'core'],
  hamstrings: ['glutes', 'core'],
  glutes:     ['hamstrings', 'core'],
  core:       ['shoulders'],
  calves:     ['quads'],
};

function inferSecondary(primary: MuscleGroup[]): MuscleGroup[] {
  const s = new Set<MuscleGroup>();
  primary.forEach(m => (SECONDARY[m] ?? []).filter(x => !primary.includes(x)).forEach(x => s.add(x)));
  return Array.from(s).slice(0, 3);
}

export default function ActiveQuestScreen() {
  const { questId } = useLocalSearchParams<{ questId: string }>();
  const { activeSession, markQuest } = useSessionStore();
  const { profile } = useProfileStore();
  const getLastExerciseLog = useHistoryStore(s => s.getLastExerciseLog);
  const quest = activeSession?.quests.find(q => q.id === questId);
  const [tab, setTab] = useState<'guide' | 'muscles'>('guide');
  const insets = useSafeAreaInsets();

  if (!quest) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Quest not found</Text>
          <PressableButton label="← Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const exerciseEntry = quest.exerciseId ? EXERCISE_MAP[quest.exerciseId] : undefined;

  // Isometric holds use bodyweight as resistance — always suggest 'bodyweight'.
  // For other exercises, check if purely bodyweight_only equipment, else calculate.
  const isBodyweightOnly =
    !!quest.holdSeconds ||
    (exerciseEntry !== undefined &&
      exerciseEntry.equipment.length > 0 &&
      exerciseEntry.equipment.every(e => e === 'bodyweight_only'));

  const suggestedWeight: number | 'bodyweight' = isBodyweightOnly
    ? 'bodyweight'
    : profile
      ? getSuggestedWeight(
          quest.exerciseName,
          quest.targetMuscles as MuscleGroup[],
          profile.bodyWeight ?? 70,
          profile.muscleStrengths,
          profile.equipment,
          profile.goal,
        )
      : 'bodyweight';

  const weightUnit = profile?.weightUnit ?? 'kg';
  const lastSessionLog = getLastExerciseLog(quest.exerciseName);
  const secondary = inferSecondary(quest.targetMuscles as MuscleGroup[]);
  // v4.2.0 Theme A — non-lift quests show a phase pill instead of a rank badge,
  // and skip the muscle-map tab (mobility drills don't drive muscle XP).
  const isNonLift =
    quest.kind === 'warmup' || quest.kind === 'cooldown' || quest.kind === 'mobility';
  const headerBadge = isNonLift
    ? PHASE_BADGE[quest.kind as 'warmup' | 'cooldown' | 'mobility']
    : DIFF_BADGE[quest.difficulty];

  // ── Persistent workout notification ────────────────────────────────────────
  useEffect(() => {
    showWorkoutNotification(quest.exerciseName, 1, quest.sets);
    return () => { dismissWorkoutNotification(); };
  }, [quest.exerciseName, quest.sets]);

  // v4.1.0 A1 — auto-advance to the next pending quest after the current one.
  // We deliberately look only at quests *after* the current in session order,
  // so users running a manual re-order from the list don't get bounced to a
  // quest they already saw. If nothing pending is left → fall back to the
  // list (Home shows the Finish button).
  const nextPendingQuestId: string | null = (() => {
    if (!activeSession) return null;
    const idx = activeSession.quests.findIndex((q) => q.id === quest!.id);
    if (idx < 0) return null;
    const next = activeSession.quests.slice(idx + 1).find((q) => q.status === 'pending');
    return next?.id ?? null;
  })();

  // Label on the done-phase primary depends on what's next.
  const completeLabel = nextPendingQuestId
    ? '✓ Save & Next Quest →'
    : '✓ Save & Finish Dungeon →';

  function handleMark(status: QuestStatus, logs: SetLog[] = []) {
    markQuest(quest!.id, status, logs.length > 0 ? logs : undefined);
    // v4.1.0 A1 — on complete, jump straight to the next pending quest via
    // router.replace so state rehydrates cleanly. On the last quest (or a
    // skip), fall back to the list where Home shows the finalize button.
    if (status === 'complete' && nextPendingQuestId) {
      router.replace({ pathname: '/active-quest', params: { questId: nextPendingQuestId } });
      return;
    }
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.header}>
          <PressableButton label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
          <Badge label={headerBadge.label} variant={headerBadge.variant} />
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.questEyebrow}>CURRENT QUEST</Text>
          <Text style={styles.questName}>{quest.exerciseName}</Text>
          <Text style={styles.questMuscles}>
            {quest.targetMuscles.join(' · ').toUpperCase()}
          </Text>
        </View>

        {/* ── Timer first — primary action is always above the fold.
             v4.2.0 Theme A — non-lifts mount <HoldDrillTimer/> directly so
             <WorkoutTimer/>'s hooks (intervals, notifications, widget
             updates) never run for mobility drills. The earlier in-component
             early-return left those effects active behind the unmounted
             render — the consumer-level branch fixes it cleanly. */}
        <View style={styles.timerSection}>
          <SectionLabel>THE QUEST</SectionLabel>
          {isNonLift && quest.holdSeconds && quest.holdSeconds > 0 ? (
            <HoldDrillTimer
              sets={quest.sets}
              holdSeconds={quest.holdSeconds}
              restSeconds={quest.restSeconds}
              baseXP={quest.xpReward}
              exerciseName={quest.exerciseName}
              questId={quest.id}
              cue={quest.cue}
              completeLabel={completeLabel}
              onBackToList={() => router.back()}
              onComplete={logs => handleMark('complete', logs)}
              onSkip={() =>
                Alert.alert(
                  'Skip Drill?',
                  "You won't earn any XP for this drill.",
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Skip', style: 'destructive', onPress: () => handleMark('skipped') },
                  ],
                )
              }
            />
          ) : (
            <WorkoutTimer
              sets={quest.sets}
              reps={quest.reps}
              holdSeconds={quest.holdSeconds}
              restSeconds={quest.restSeconds}
              suggestedWeight={suggestedWeight}
              weightUnit={weightUnit}
              lastSessionLog={lastSessionLog}
              baseXP={quest.xpReward}
              exerciseName={quest.exerciseName}
              questId={quest.id}
              completeLabel={completeLabel}
              kind={quest.kind}
              cue={quest.cue}
              onBackToList={() => router.back()}
              onComplete={logs => handleMark('complete', logs)}
              onSkip={() =>
                Alert.alert(
                  'Skip Quest?',
                  "You won't earn any XP for this quest.",
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Skip', style: 'destructive', onPress: () => handleMark('skipped') },
                  ],
                )
              }
            />
          )}
        </View>

        <View style={styles.xpRow}>
          <Text style={styles.xpLabel}>
            {quest.kind && quest.kind !== 'lift'
              ? 'XP PER SET · SCALES WITH HOLD TIME'
              : 'XP PER SET · SCALES WITH REPS'}
          </Text>
          <Text style={styles.xpValue}>UP TO +{quest.xpReward} XP</Text>
        </View>

        <View style={styles.divider} />

        {/* ── Reference material — guide + muscle map below the fold ── */}
        <SectionLabel>EXERCISE GUIDE</SectionLabel>

        {/* v4.2.0 Theme A — mobility drills don't drive muscle XP and don't
            warrant a separate muscle-map tab. Show only the guide tab. */}
        {!isNonLift && (
          <View style={styles.tabs}>
            <PressableButton
              label="📖 Guide"
              variant={tab === 'guide' ? 'primary' : 'ghost'}
              size="sm"
              style={styles.tab}
              onPress={() => setTab('guide')}
            />
            <PressableButton
              label="💪 Muscles"
              variant={tab === 'muscles' ? 'primary' : 'ghost'}
              size="sm"
              style={styles.tab}
              onPress={() => setTab('muscles')}
            />
          </View>
        )}

        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(120)}
          key={tab}
          style={[
            styles.tabContent,
            tab === 'muscles' && styles.tabContentCentered,
          ]}
        >
          {(tab === 'guide' || isNonLift) && (
            <View style={styles.guideTabContent}>
              <ExerciseGif
                animationUrl={exerciseEntry?.animationUrl}
                exerciseName={quest.exerciseName}
              />
              <ExerciseVideo
                exerciseId={quest.exerciseId ?? ''}
                exerciseName={quest.exerciseName}
                muscles={quest.targetMuscles as MuscleGroup[]}
              />
              <InstructionsPanel
                exerciseId={quest.exerciseId ?? ''}
                exerciseName={quest.exerciseName}
                muscles={quest.targetMuscles as MuscleGroup[]}
              />
            </View>
          )}

          {!isNonLift && tab === 'muscles' && (
            <MuscleMap
              targets={quest.targetMuscles as MuscleGroup[]}
              secondary={secondary}
            />
          )}
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.bg },
  scroll:       { padding: 20, gap: 18 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText:    { color: COLORS.textMuted, fontSize: 15, fontFamily: FONTS.sansMed },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow:     { gap: 4 },
  questEyebrow: { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.violetLight, letterSpacing: 2.5 },
  questName:    { fontSize: 24, fontFamily: FONTS.displayBold, color: COLORS.text, letterSpacing: 0.4 },
  questMuscles: { fontSize: 11, fontFamily: FONTS.sansBold, color: COLORS.textMuted, letterSpacing: 1.5, marginTop: 2 },
  tabs:         { flexDirection: 'row', gap: 6 },
  tab:          { flex: 1 },
  tabContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabContentCentered: {
    alignItems: 'center',
  },
  guideTabContent: {
    gap: 16,
  },
  divider:      { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  timerSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.15)',
  },
  xpLabel: { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.textMuted, letterSpacing: 1.5 },
  xpValue: { fontSize: 14, fontFamily: FONTS.mono, color: COLORS.gold, letterSpacing: 0.5 },
});
