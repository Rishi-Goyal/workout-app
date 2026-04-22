import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout, FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import CornerBrackets from '@/components/ui/CornerBrackets';
import PressableButton from '@/components/ui/PressableButton';
import { COLORS, FONTS, RADIUS } from '@/lib/constants';
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
  easy:   { variant: 'jade',    label: 'C · EASY' },
  medium: { variant: 'gold',    label: 'B · MEDIUM' },
  hard:   { variant: 'orange',  label: 'A · HARD' },
  boss:   { variant: 'crimson', label: 'S · BOSS' },
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
      <Card style={styles.card} padding={16} glow={quest.difficulty === 'boss' ? 'gold' : undefined}>
        {quest.difficulty === 'boss' && (
          <CornerBrackets color={COLORS.gold} size={14} thickness={2} inset={6} />
        )}

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
              label="⚔️ Accept Quest"
              variant="primary"
              size="sm"
              style={{ flex: 2 }}
              onPress={() => router.push({ pathname: '/active-quest', params: { questId: quest.id } })}
            />
            <PressableButton
              label="↕ Swap"
              variant="ghost"
              size="sm"
              style={{ flex: 1 }}
              onPress={() => setShowSwap(!showSwap)}
            />
            <PressableButton
              label="✕ Skip"
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
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
    letterSpacing: 0.3,
  },
  info: {
    fontSize: 12,
    fontFamily: FONTS.mono,
    color: COLORS.textSecondary,
    marginTop: 8,
    letterSpacing: 0.5,
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
  statusText: { fontSize: 13, fontFamily: FONTS.sansBold, letterSpacing: 0.5 },

  // Swap panel
  swapPanel: {
    backgroundColor: COLORS.surfaceAccent,
    borderRadius: RADIUS.sm,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    marginTop: 12,
  },
  swapTitle: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: COLORS.violetLight,
    letterSpacing: 2,
    textAlign: 'center',
  },
  swapSection: { gap: 4 },
  swapLabel: {
    fontSize: 11,
    fontFamily: FONTS.sansBold,
    color: COLORS.gold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
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
  swapOptionName: { fontSize: 13, fontFamily: FONTS.sansMed, color: COLORS.text, flex: 1 },
  swapOptionDiff: { fontSize: 11, fontFamily: FONTS.mono, color: COLORS.textMuted, letterSpacing: 0.5 },
  noSwaps: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontStyle: 'italic', fontFamily: FONTS.sans },

  // Swap confirmation
  swapConfirm: {
    backgroundColor: COLORS.surfaceAccent,
    borderRadius: RADIUS.sm,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.gold + '50',
    marginTop: 12,
  },
  swapConfirmTitle: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: COLORS.gold,
    letterSpacing: 2,
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
  swapConfirmName: { fontSize: 14, fontFamily: FONTS.displayBold, color: COLORS.text },
  swapConfirmMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  swapConfirmChip: {
    backgroundColor: 'rgba(165,180,252,0.08)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  swapConfirmChipText: { fontSize: 10, fontFamily: FONTS.sansMed, color: COLORS.textSecondary, textTransform: 'capitalize' },
  swapDiffChip: { borderColor: COLORS.gold + '40', backgroundColor: 'rgba(245,166,35,0.1)' },
  swapConfirmDiff: { fontSize: 10, fontFamily: FONTS.mono, color: COLORS.gold, letterSpacing: 0.5 },
  swapConfirmActions: { flexDirection: 'row', gap: 8 },
});
