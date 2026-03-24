import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout, FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import Badge from '@/components/ui/Badge';
import PressableButton from '@/components/ui/PressableButton';
import { COLORS } from '@/lib/constants';
import { getSwapOptions, swapExercise } from '@/lib/questGenerator';
import { useProfileStore } from '@/stores/useProfileStore';
import { useSessionStore } from '@/stores/useSessionStore';
import type { Quest, QuestStatus, MuscleGroup } from '@/types';
import type { Exercise } from '@/lib/exerciseDatabase';

interface QuestCardProps {
  quest: Quest;
  onAction: (questId: string, status: QuestStatus) => void;
  disabled?: boolean;
}

const DIFF_BADGE: Record<Quest['difficulty'], { variant: 'jade' | 'gold' | 'orange' | 'crimson'; label: string }> = {
  easy:   { variant: 'jade',    label: '⚡ Easy' },
  medium: { variant: 'gold',    label: '🔶 Medium' },
  hard:   { variant: 'orange',  label: '🔴 Hard' },
  boss:   { variant: 'crimson', label: '💀 Boss' },
};

const CARD_BORDER: Record<QuestStatus, string> = {
  pending:       COLORS.border,
  complete:      '#065f46',
  half_complete: '#92400e',
  skipped:       COLORS.border,
};

export default function QuestCard({ quest, onAction, disabled }: QuestCardProps) {
  const diff = DIFF_BADGE[quest.difficulty];
  const isBoss = quest.difficulty === 'boss';
  const isSkipped = quest.status === 'skipped';
  const [showSwap, setShowSwap] = useState(false);
  const { muscleXP, profile } = useProfileStore();

  const swapOptions = showSwap && profile
    ? getSwapOptions(quest.exerciseName, muscleXP, profile.equipment)
    : null;

  const handleSwap = (exercise: Exercise) => {
    const updated = swapExercise(
      {
        exerciseName: quest.exerciseName,
        description: quest.description,
        targetMuscles: quest.targetMuscles,
        sets: quest.sets,
        reps: quest.reps,
        restSeconds: quest.restSeconds,
        difficulty: quest.difficulty,
        xpReward: quest.xpReward,
      },
      exercise.id,
    );
    if (updated) {
      // Update the quest in the session store
      const session = useSessionStore.getState().activeSession;
      if (session) {
        const quests = session.quests.map((q) =>
          q.id === quest.id
            ? { ...q, exerciseName: updated.exerciseName, targetMuscles: updated.targetMuscles }
            : q
        );
        useSessionStore.setState({
          activeSession: { ...session, quests },
        });
      }
    }
    setShowSwap(false);
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      layout={Layout.springify()}
      style={[
        styles.card,
        { borderColor: CARD_BORDER[quest.status], opacity: isSkipped ? 0.45 : 1 },
        isBoss && quest.status === 'pending' && styles.bossCard,
      ]}
    >
      {/* Header */}
      <View style={styles.row}>
        <Text style={styles.name} numberOfLines={2}>{quest.exerciseName}</Text>
        <Badge label={diff.label} variant={diff.variant} />
      </View>

      {/* Description */}
      <Text style={styles.desc}>{quest.description}</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{quest.sets}</Text>
          <Text style={styles.statLbl}>Sets</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{quest.reps}</Text>
          <Text style={styles.statLbl}>Reps</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{quest.restSeconds}s</Text>
          <Text style={styles.statLbl}>Rest</Text>
        </View>
        <View style={[styles.statItem, styles.xpItem]}>
          <Text style={styles.xpVal}>+{quest.xpReward}</Text>
          <Text style={styles.statLbl}>XP</Text>
        </View>
      </View>

      {/* Muscle chips */}
      <View style={styles.muscles}>
        {quest.targetMuscles.map((m) => (
          <View key={m} style={styles.muscleChip}>
            <Text style={styles.muscleText}>{m}</Text>
          </View>
        ))}
      </View>

      {/* Swap panel */}
      {showSwap && swapOptions && (
        <Animated.View entering={FadeInDown.duration(200)} style={styles.swapPanel}>
          <Text style={styles.swapTitle}>SWAP EXERCISE</Text>

          {swapOptions.easier.length > 0 && (
            <View style={styles.swapSection}>
              <Text style={styles.swapLabel}>Easier</Text>
              {swapOptions.easier.map((ex) => (
                <Pressable key={ex.id} style={styles.swapOption} onPress={() => handleSwap(ex)}>
                  <Text style={styles.swapOptionName}>{ex.name}</Text>
                  <Text style={styles.swapOptionDiff}>Diff {ex.difficultyLevel}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {swapOptions.harder.length > 0 && (
            <View style={styles.swapSection}>
              <Text style={styles.swapLabel}>Harder</Text>
              {swapOptions.harder.map((ex) => (
                <Pressable key={ex.id} style={styles.swapOption} onPress={() => handleSwap(ex)}>
                  <Text style={styles.swapOptionName}>{ex.name}</Text>
                  <Text style={styles.swapOptionDiff}>Diff {ex.difficultyLevel}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {swapOptions.easier.length === 0 && swapOptions.harder.length === 0 && (
            <Text style={styles.noSwaps}>No alternatives available for your level and equipment.</Text>
          )}
        </Animated.View>
      )}

      {/* Action area */}
      {quest.status === 'pending' && !disabled && (
        <Animated.View entering={FadeIn} style={styles.actions}>
          <PressableButton
            label="⚔️  Accept Quest"
            variant="primary"
            size="sm"
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/active-quest', params: { questId: quest.id } })}
          />
          <PressableButton
            label="🔄"
            variant="ghost"
            size="sm"
            style={{ minWidth: 44 }}
            onPress={() => setShowSwap(!showSwap)}
          />
          <PressableButton
            label="✕"
            variant="danger"
            size="sm"
            style={{ minWidth: 44 }}
            onPress={() => onAction(quest.id, 'skipped')}
          />
        </Animated.View>
      )}

      {quest.status === 'complete' && (
        <Animated.View entering={FadeIn} style={styles.statusBanner}>
          <Text style={[styles.statusText, { color: COLORS.jade }]}>
            ✓ Complete — +{quest.xpEarned} XP
          </Text>
        </Animated.View>
      )}

      {quest.status === 'half_complete' && (
        <Animated.View entering={FadeIn} style={styles.statusBanner}>
          <Text style={[styles.statusText, { color: COLORS.gold }]}>½ Half done — +{quest.xpEarned} XP</Text>
          {!disabled && (
            <PressableButton
              label="Finish"
              variant="success"
              size="sm"
              onPress={() => onAction(quest.id, 'complete')}
            />
          )}
        </Animated.View>
      )}

      {quest.status === 'skipped' && (
        <Text style={[styles.statusText, { color: COLORS.textMuted, textAlign: 'center', marginTop: 4 }]}>
          Quest skipped
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  bossCard: { backgroundColor: 'rgba(127,0,0,0.18)' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  desc: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', gap: 4 },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: COLORS.bg, borderRadius: 8, padding: 8 },
  xpItem: { backgroundColor: 'rgba(245,158,11,0.08)' },
  statVal: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  xpVal: { fontSize: 15, fontWeight: '700', color: COLORS.gold },
  statLbl: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  muscles: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  muscleChip: { backgroundColor: COLORS.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  muscleText: { fontSize: 10, color: COLORS.textMuted, textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 6, marginTop: 4 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },

  // Swap panel
  swapPanel: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  swapTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  swapSection: { gap: 4 },
  swapLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gold,
    marginBottom: 2,
  },
  swapOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  swapOptionName: { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 1 },
  swapOptionDiff: { fontSize: 11, color: COLORS.textMuted },
  noSwaps: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontStyle: 'italic' },
});
