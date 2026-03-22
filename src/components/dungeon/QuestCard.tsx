import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import Badge from '@/components/ui/Badge';
import PressableButton from '@/components/ui/PressableButton';
import { COLORS } from '@/lib/constants';
import type { Quest, QuestStatus } from '@/types';

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

      {/* Action area */}
      {quest.status === 'pending' && !disabled && (
        <Animated.View entering={FadeIn} style={styles.actions}>
          <PressableButton
            label={`✓ Complete (+${quest.xpReward} XP)`}
            variant="success"
            size="sm"
            style={{ flex: 1 }}
            onPress={() => onAction(quest.id, 'complete')}
          />
          <PressableButton
            label="½ Half"
            variant="ghost"
            size="sm"
            style={{ minWidth: 70 }}
            onPress={() => onAction(quest.id, 'half_complete')}
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
});
