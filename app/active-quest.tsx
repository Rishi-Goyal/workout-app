/**
 * Active Quest Screen — exercise guide, anatomical muscle map, and set/rest timer.
 *
 * Tabs: Guide (video + steps + cues), Muscles
 */
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import MuscleMap from '@/components/dungeon/MuscleMap';
import ExerciseVideo from '@/components/dungeon/ExerciseVideo';
import InstructionsPanel from '@/components/dungeon/InstructionsPanel';
import WorkoutTimer from '@/components/dungeon/WorkoutTimer';
import Badge from '@/components/ui/Badge';
import PressableButton from '@/components/ui/PressableButton';
import SectionLabel from '@/components/ui/SectionLabel';

import { useSessionStore } from '@/stores/useSessionStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { getSuggestedWeight } from '@/lib/weights';
import { EXERCISE_MAP } from '@/lib/exerciseDatabase';
import { COLORS, RADIUS, SPACING } from '@/lib/constants';
import { showWorkoutNotification, dismissWorkoutNotification } from '@/lib/workoutNotification';
import type { MuscleGroup, QuestStatus, SetLog } from '@/types';

const DIFF_BADGE = {
  easy:   { variant: 'jade'    as const, label: '⚡ Easy' },
  medium: { variant: 'gold'    as const, label: '🔶 Medium' },
  hard:   { variant: 'orange'  as const, label: '🔴 Hard' },
  boss:   { variant: 'crimson' as const, label: '💀 Boss' },
};

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
  const diff = DIFF_BADGE[quest.difficulty];

  // ── Persistent workout notification ────────────────────────────────────────
  useEffect(() => {
    showWorkoutNotification(quest.exerciseName, 1, quest.sets);
    return () => { dismissWorkoutNotification(); };
  }, [quest.exerciseName, quest.sets]);

  function handleMark(status: QuestStatus, logs: SetLog[] = []) {
    markQuest(quest!.id, status, logs.length > 0 ? logs : undefined);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <PressableButton label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
          <Badge label={diff.label} variant={diff.variant} />
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.questName}>{quest.exerciseName}</Text>
          <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>
            {quest.targetMuscles.join(' · ')}
          </Text>
        </View>

        {/* ── Workout timer first — primary action is always above the fold ── */}
        <View style={styles.timerSection}>
          <SectionLabel>WORKOUT</SectionLabel>
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
        </View>

        <View style={styles.xpRow}>
          <Text style={styles.xpLabel}>XP per set · scales with reps</Text>
          <Text style={styles.xpValue}>up to +{quest.xpReward} XP</Text>
        </View>

        <View style={styles.divider} />

        {/* ── Reference material — guide + muscle map below the fold ── */}
        <SectionLabel>EXERCISE GUIDE</SectionLabel>

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

        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(120)}
          key={tab}
          style={[
            styles.tabContent,
            tab === 'muscles' && styles.tabContentCentered,
          ]}
        >
          {tab === 'guide' && (
            <View style={styles.guideTabContent}>
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

          {tab === 'muscles' && (
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
  scroll:       { padding: 20, paddingBottom: 40, gap: 18 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText:    { color: COLORS.textMuted, fontSize: 15 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow:     { gap: 6 },
  questName:    { fontSize: 22, fontWeight: '700', color: COLORS.text },
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
  xpLabel: { fontSize: 13, color: COLORS.textMuted },
  xpValue: { fontSize: 18, fontWeight: '700', color: COLORS.gold },
});
