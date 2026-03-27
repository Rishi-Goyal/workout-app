import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout, FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import PressableButton from '@/components/ui/PressableButton';
import { COLORS, RADIUS } from '@/lib/constants';
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

export default function QuestCard({ quest, onAction, disabled }: QuestCardProps) {
  const diff = DIFF_BADGE[quest.difficulty];
  const isSkipped = quest.status === 'skipped';
  const [showSwap, setShowSwap] = useState(false);
  const [pendingSwap, setPendingSwap] = useState<Exercise | null>(null);
  const { muscleXP, profile } = useProfileStore();

  const swapOptions = showSwap && profile
    ? getSwapOptions(quest.exerciseName, muscleXP, profile.equipment)
    : null;

  const confirmSwap = (exercise: Exercise) => {
    setPendingSwap(exercise);
  };

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
    setPendingSwap(null);
  };

  // Build the sets/reps/weight info line
  const repsLabel = quest.holdSeconds ? `${quest.holdSeconds}s hold` : `${quest.reps} reps`;
  const weightHint = quest.suggestedWeight
    ? typeof quest.suggestedWeight === 'number'
      ? `${quest.suggestedWeight} kg`
      : quest.suggestedWeight
    : quest.equipment ?? '';
  const infoLine = weightHint
    ? `${quest.sets}×${repsLabel}  ·  ${weightHint}`
    : `${quest.sets}×${repsLabel}`;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      layout={Layout.springify()}
      style={{ opacity: isSkipped ? 0.4 : 1 }}
    >
      <Card style={styles.card} padding={16}>

        {/* Row 1: Exercise name + difficulty badge */}
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={2}>{quest.exerciseName}</Text>
          <Badge label={diff.label} variant={diff.variant} />
        </View>

        {/* Row 2: Sets/reps/weight info */}
        <Text style={styles.info} numberOfLines={1}>{infoLine}</Text>

        {/* Swap panel */}
        {showSwap && swapOptions && !pendingSwap && (
          <Animated.View entering={FadeInDown.duration(200)} style={styles.swapPanel}>
            <Text style={styles.swapTitle}>SWAP EXERCISE</Text>

            {swapOptions.easier.length > 0 && (
              <View style={styles.swapSection}>
                <Text style={styles.swapLabel}>Easier</Text>
                {swapOptions.easier.map((ex) => (
                  <Pressable key={ex.id} style={styles.swapOption} onPress={() => confirmSwap(ex)}>
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
                  <Pressable key={ex.id} style={styles.swapOption} onPress={() => confirmSwap(ex)}>
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

        {/* Swap confirmation step */}
        {pendingSwap && (
          <Animated.View entering={FadeInDown.duration(200)} style={styles.swapConfirm}>
            <Text style={styles.swapConfirmTitle}>CONFIRM SWAP</Text>
            <View style={styles.swapConfirmCard}>
              <Text style={styles.swapConfirmName}>{pendingSwap.name}</Text>
              <View style={styles.swapConfirmMeta}>
                {[pendingSwap.primaryMuscle].concat(pendingSwap.secondaryMuscles ?? []).slice(0, 3).map((m: string) => (
                  <View key={m} style={styles.swapConfirmChip}>
                    <Text style={styles.swapConfirmChipText}>{m}</Text>
                  </View>
                ))}
                <View style={[styles.swapConfirmChip, styles.swapDiffChip]}>
                  <Text style={styles.swapConfirmDiff}>Diff {pendingSwap.difficultyLevel}</Text>
                </View>
              </View>
            </View>
            <View style={styles.swapConfirmActions}>
              <PressableButton
                label="✓ Swap"
                variant="success"
                size="sm"
                style={{ flex: 1 }}
                onPress={() => handleSwap(pendingSwap)}
              />
              <PressableButton
                label="Cancel"
                variant="ghost"
                size="sm"
                style={{ flex: 1 }}
                onPress={() => setPendingSwap(null)}
              />
            </View>
          </Animated.View>
        )}

        {/* Row 3: Action buttons */}
        {quest.status === 'pending' && !disabled && (
          <Animated.View entering={FadeIn} style={styles.actions}>
            <PressableButton
              label="✓ Complete"
              variant="primary"
              size="sm"
              style={{ flex: 2 }}
              onPress={() => router.push({ pathname: '/active-quest', params: { questId: quest.id } })}
            />
            <PressableButton
              label="½"
              variant="ghost"
              size="sm"
              style={{ flex: 1 }}
              onPress={() => setShowSwap(!showSwap)}
            />
            <PressableButton
              label="Skip"
              variant="ghost"
              size="sm"
              style={{ flex: 1, borderColor: COLORS.crimson }}
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

      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 0,
    gap: 0,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  info: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statusText: { fontSize: 13, fontWeight: '600' },

  // Swap panel
  swapPanel: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 12,
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

  // Swap confirmation
  swapConfirm: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.gold + '50',
    marginTop: 12,
  },
  swapConfirmTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.gold,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  swapConfirmCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  swapConfirmName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  swapConfirmMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  swapConfirmChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  swapConfirmChipText: { fontSize: 10, color: COLORS.textMuted, textTransform: 'capitalize' },
  swapDiffChip: { borderColor: COLORS.gold + '40', backgroundColor: 'rgba(59,130,246,0.08)' },
  swapConfirmDiff: { fontSize: 10, color: COLORS.gold, fontWeight: '700' },
  swapConfirmActions: { flexDirection: 'row', gap: 8 },
});
