/**
 * Active Quest Screen — shows exercise animation, anatomical muscle map, and set/rest timer.
 * Computes suggested starting weight from user profile.
 * Saves logged sets per quest on completion.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import MuscleMap from '@/components/dungeon/MuscleMap';
import ExerciseGif from '@/components/dungeon/ExerciseGif';
import WorkoutTimer from '@/components/dungeon/WorkoutTimer';
import Badge from '@/components/ui/Badge';
import PressableButton from '@/components/ui/PressableButton';

import { useSessionStore } from '@/stores/useSessionStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { getSuggestedWeight } from '@/lib/weights';
import { COLORS } from '@/lib/constants';
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
  const quest = activeSession?.quests.find(q => q.id === questId);
  const [tab, setTab] = useState<'animation' | 'muscles'>('animation');

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

  const suggestedWeight: number | 'bodyweight' = profile
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
  const secondary = inferSecondary(quest.targetMuscles as MuscleGroup[]);
  const diff = DIFF_BADGE[quest.difficulty];

  function handleMark(status: QuestStatus, logs: SetLog[] = []) {
    markQuest(quest!.id, status, logs.length > 0 ? logs : undefined);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <PressableButton label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
          <Badge label={diff.label} variant={diff.variant} />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(60)} style={styles.titleRow}>
          <Text style={styles.questName}>{quest.exerciseName}</Text>
          <Text style={styles.questDesc}>{quest.description}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(120)} style={styles.tabs}>
          <PressableButton
            label="🎬 Exercise"
            variant={tab === 'animation' ? 'primary' : 'ghost'}
            size="sm"
            style={styles.tab}
            onPress={() => setTab('animation')}
          />
          <PressableButton
            label="💪 Muscles"
            variant={tab === 'muscles' ? 'primary' : 'ghost'}
            size="sm"
            style={styles.tab}
            onPress={() => setTab('muscles')}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(180)} key={tab} style={styles.tabContent}>
          {tab === 'animation'
            ? (
              <ExerciseGif
                exerciseName={quest.exerciseName}
                muscles={quest.targetMuscles as MuscleGroup[]}
              />
            ) : (
              <MuscleMap
                targets={quest.targetMuscles as MuscleGroup[]}
                secondary={secondary}
              />
            )
          }
        </Animated.View>

        <View style={styles.divider} />

        <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.timerSection}>
          <Text style={styles.sectionLabel}>WORKOUT</Text>
          <WorkoutTimer
            sets={quest.sets}
            reps={quest.reps}
            restSeconds={quest.restSeconds}
            suggestedWeight={suggestedWeight}
            weightUnit={weightUnit}
            onComplete={logs => handleMark('complete', logs)}
            onHalf={logs => handleMark('half_complete', logs)}
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
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(300).delay(300)} style={styles.xpRow}>
          <Text style={styles.xpLabel}>Full completion</Text>
          <Text style={styles.xpValue}>+{quest.xpReward} XP</Text>
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
  questName:    { fontSize: 22, fontWeight: '800', color: COLORS.text },
  questDesc:    { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },
  tabs:         { flexDirection: 'row', gap: 8 },
  tab:          { flex: 1 },
  tabContent:   {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 220,
    justifyContent: 'center',
  },
  divider:      { height: 1, backgroundColor: COLORS.border },
  sectionLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
    textAlign: 'center',
  },
  timerSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  xpRow:        {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  xpLabel:      { fontSize: 13, color: COLORS.textMuted },
  xpValue:      { fontSize: 18, fontWeight: '800', color: COLORS.gold },
});
