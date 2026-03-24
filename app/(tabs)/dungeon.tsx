import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import QuestCard from '@/components/dungeon/QuestCard';
import QuestSkeleton from '@/components/dungeon/QuestSkeleton';
import SessionSummary from '@/components/dungeon/SessionSummary';
import PressableButton from '@/components/ui/PressableButton';
import Badge from '@/components/ui/Badge';
import { useSessionStore } from '@/stores/useSessionStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { COLORS } from '@/lib/constants';
import type { QuestStatus, DungeonSession, MuscleGroup } from '@/types';

export default function DungeonScreen() {
  const { activeSession, isLoading, markQuest, finalizeSession } = useSessionStore();
  const { awardXP, awardMuscleXP, incrementFloorsCleared } = useProfileStore();
  const addSession = useHistoryStore((s) => s.addSession);

  const [summary, setSummary] = useState<{
    session: DungeonSession;
    xpGained: number;
    didLevelUp: boolean;
    newLevel?: number;
    muscleLevelUps: Array<{ muscle: MuscleGroup; newLevel: number }>;
  } | null>(null);

  const handleQuestAction = useCallback((questId: string, status: QuestStatus) => {
    markQuest(questId, status);
  }, [markQuest]);

  const handleFinalize = () => {
    const finalized = finalizeSession();
    if (!finalized) return;

    // Award character XP
    const xpGained = finalized.totalXPEarned;
    const { leveledUp, levelsGained } = awardXP(xpGained);
    const newLevel = leveledUp ? useProfileStore.getState().character?.level : undefined;

    // Award muscle XP for each completed/half-completed quest
    const allMuscleLevelUps: Array<{ muscle: MuscleGroup; newLevel: number }> = [];
    for (const quest of finalized.quests) {
      if (quest.status === 'complete' || quest.status === 'half_complete') {
        const primary = quest.targetMuscles.length > 0
          ? [quest.targetMuscles[0]]
          : [];
        const secondary = quest.targetMuscles.slice(1);
        const completion = quest.status === 'complete' ? 'complete' : 'half_complete';
        const { levelUps } = awardMuscleXP(
          primary as MuscleGroup[],
          secondary as MuscleGroup[],
          quest.difficulty,
          completion,
        );
        allMuscleLevelUps.push(...levelUps);
      }
    }

    incrementFloorsCleared();
    addSession(finalized);
    setSummary({
      session: finalized,
      xpGained,
      didLevelUp: leveledUp,
      newLevel,
      muscleLevelUps: allMuscleLevelUps,
    });
  };

  const handleSummaryClose = () => {
    setSummary(null);
    router.replace('/(tabs)');
  };

  const allActioned = activeSession?.quests.every((q) => q.status !== 'pending') ?? false;
  const isBoss = activeSession ? activeSession.floor % 5 === 0 && activeSession.floor > 0 : false;

  // No session and no summary → go home
  if (!activeSession && !summary && !isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏰</Text>
          <Text style={styles.emptyText}>No active session</Text>
          <PressableButton label="Go to Home" onPress={() => router.replace('/(tabs)')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              {activeSession ? `Floor ${activeSession.floor}` : 'Dungeon'}
            </Text>
            {isBoss && <Badge label="⚠️ Boss Floor" variant="crimson" />}
          </View>
          {activeSession && (
            <PressableButton
              label="Retreat"
              variant="ghost"
              size="sm"
              onPress={() => {
                Alert.alert('Retreat?', 'You will lose progress on this floor.', [
                  { text: 'Stay', style: 'cancel' },
                  { text: 'Retreat', style: 'destructive', onPress: () => { useSessionStore.getState().clearSession(); router.replace('/(tabs)'); } },
                ]);
              }}
            />
          )}
        </View>

        {/* Quest cards or skeletons */}
        <View style={styles.questList}>
          {isLoading || !activeSession ? (
            <>
              <QuestSkeleton />
              <QuestSkeleton />
              <QuestSkeleton />
            </>
          ) : (
            activeSession.quests.map((quest) => (
              <QuestCard key={quest.id} quest={quest} onAction={handleQuestAction} />
            ))
          )}
        </View>

        {/* Finalize button */}
        {activeSession && allActioned && (
          <PressableButton
            label="Complete Floor & Claim XP 🏆"
            size="lg"
            style={styles.finalizeBtn}
            onPress={handleFinalize}
          />
        )}

        {activeSession && !allActioned && (
          <Text style={styles.hint}>
            Complete, half-complete, or skip each quest to continue
          </Text>
        )}
      </ScrollView>

      {summary && (
        <SessionSummary
          session={summary.session}
          xpGained={summary.xpGained}
          didLevelUp={summary.didLevelUp}
          newLevel={summary.newLevel}
          muscleLevelUps={summary.muscleLevelUps}
          onClose={handleSummaryClose}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, gap: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  questList: { gap: 14 },
  finalizeBtn: { marginTop: 8 },
  hint: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
});
