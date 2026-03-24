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

const DIFF_ACCENT: Record<Quest['difficulty'], string> = {
  easy:   COLORS.jade,
  medium: COLORS.gold,
  hard:   COLORS.orange,
  boss:   COLORS.crimson,
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

  const accentColor = DIFF_ACCENT[quest.difficulty];

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      layout={Layout.springify()}
      style={[
        styles.card,
        { borderColor: CARD_BORDER[quest.status], opacity: isSkipped ? 0.4 : 1 },
        isBoss && quest.status === 'pending' && styles.bossCard,
      ]}
    >
      {/* Colored left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      {/* Header */}
      <View style={styles.row}>
        <Text style={styles.name} numberOfLines={2}>{quest.exerciseName}</Text>
        <Badge label={diff.label} variant={diff.variant} />
      </View>

      {/* Description */}
      <Text style={styles.desc}>{quest.description}</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { val: String(quest.sets),            lbl: 'Sets' },
          { val: String(quest.reps),            lbl: 'Reps' },
          { val: `${quest.restSeconds}s`,       lbl: 'Rest' },
          { val: `+${quest.xpReward}`,          lbl: 'XP', gold: true },
        ].map(({ val, lbl, gold }) => (
          <View key={lbl} style={[styles.statItem, gold && styles.xpItem]}>
            <Text style={[styles.statVal, gold && { color: COLORS.gold }]}>{val}</Text>
            <Text style={styles.statLbl}>{lbl}</Text>
          </View>
        ))}
      </View>

      {/* Muscle chips */}
      <View style={styles.muscles}>
        {quest.targetMuscles.map((m) => (
          <View key={m} style={[styles.muscleChip, { borderColor: accentColor + '55' }]}>
            <View style={[styles.muscleDot, { backgroundColor: accentColor }]} />
            <Text style={[styles.muscleText, { color: accentColor }]}>{m}</Text>
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
    paddingVertical: 16,
    paddingRight: 16,
    paddingLeft: 20,       // leave room for accent bar
    borderWidth: 1,
    gap: 10,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  bossCard: { backgroundColor: 'rgba(100,0,0,0.20)' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.text, flex: 1, letterSpacing: 0.2 },
  desc: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', lineHeight: 17 },
  statsRow: { flexDirection: 'row', gap: 4 },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  xpItem: {
    backgroundColor: 'rgba(245,166,35,0.07)',
    borderColor: 'rgba(245,166,35,0.25)',
  },
  statVal: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  statLbl: { fontSize: 9, color: COLORS.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  muscles: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  muscleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  muscleDot: { width: 5, height: 5, borderRadius: 2.5 },
  muscleText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
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
