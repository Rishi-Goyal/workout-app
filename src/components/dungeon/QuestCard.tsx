import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { router } from 'expo-router';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import CornerBrackets from '@/components/ui/CornerBrackets';
import PressableButton from '@/components/ui/PressableButton';
import { COLORS, FONTS, RADIUS } from '@/lib/constants';
import { swapExercise } from '@/lib/questGenerator';
import { getSwapSuggestions, type SwapSuggestion } from '@/lib/exerciseSwapper';
import { EXERCISE_MAP, type Exercise } from '@/lib/exerciseDatabase';
import { useProfileStore, useBeginnerMode } from '@/stores/useProfileStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { useAdaptationStore } from '@/stores/useAdaptationStore';
import { getCopy } from '@/lib/copy';
import type { Quest, QuestStatus, Equipment } from '@/types';

interface QuestCardProps {
  quest: Quest;
  onAction: (questId: string, status: QuestStatus) => void;
  disabled?: boolean;
}

const DIFF_BADGE_VARIANT: Record<Quest['difficulty'], 'jade' | 'gold' | 'orange' | 'crimson'> = {
  easy:   'jade',
  medium: 'gold',
  hard:   'orange',
  boss:   'crimson',
};

/** Pretty-print an equipment slug for "I don't have this kit" copy. */
function formatEquipment(items: Equipment[]): string {
  return items
    .map((e) => e.replace(/_/g, ' ').replace(/\bonly\b/, '').trim())
    .join(' + ');
}

export default function QuestCard({ quest, onAction, disabled }: QuestCardProps) {
  const isBeginnerMode = useBeginnerMode();
  const diffVariant = DIFF_BADGE_VARIANT[quest.difficulty];
  const diffLabel = getCopy(
    quest.difficulty === 'easy' ? 'diffEasy'
    : quest.difficulty === 'medium' ? 'diffMedium'
    : quest.difficulty === 'hard' ? 'diffHard'
    : 'diffBoss',
    isBeginnerMode,
  );
  const isSkipped = quest.status === 'skipped';
  const { profile, removeEquipment } = useProfileStore();

  // v4.1.0 A3 — collapse Accept / Swap / Skip into one primary + a ⋯ menu.
  const [menuOpen, setMenuOpen] = useState(false);
  // v4.1.0 A6 — dedicated swap picker bottom sheet (can be opened from menu).
  const [swapOpen, setSwapOpen] = useState(false);
  const [showAllSwaps, setShowAllSwaps] = useState(false);

  const suggestions = swapOpen && quest.exerciseId && profile
    ? getSwapSuggestions(quest.exerciseId, profile.equipment)
    : null;

  const applySwap = (exercise: Exercise) => {
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
      const session = useSessionStore.getState().activeSession;
      if (session) {
        const quests = session.quests.map((q) =>
          q.id === quest.id
            ? {
                ...q,
                exerciseId: updated.exerciseId,
                exerciseName: updated.exerciseName,
                targetMuscles: updated.targetMuscles,
              }
            : q,
        );
        useSessionStore.setState({ activeSession: { ...session, quests } });

        // v4.1.0 B8 — remember this swap. Two same-target swaps in a row and
        // the generator starts offering this alt as the default.
        if (quest.exerciseId && updated.exerciseId) {
          useAdaptationStore
            .getState()
            .recordSwap(quest.exerciseId, updated.exerciseId, session.id);
        }
      }
    }
    setSwapOpen(false);
    setShowAllSwaps(false);
  };

  const handleDontHaveKit = () => {
    if (!suggestions) return;
    // Remove the missing equipment from the profile so we stop suggesting it.
    if (suggestions.missingEquipment.length > 0) {
      removeEquipment(suggestions.missingEquipment);
    }
    // Prefer the bodyweight alt (the one the user definitely can do now).
    const fallback = suggestions.bodyweight?.exercise ?? suggestions.top?.exercise ?? null;
    if (fallback) applySwap(fallback);
    else setSwapOpen(false);
  };

  // Build the sets/reps/weight info line
  const repsLabel = quest.holdSeconds ? `${quest.holdSeconds}s hold` : `${quest.reps} reps`;
  const weightHint = quest.suggestedWeight
    ? typeof quest.suggestedWeight === 'number'
      ? `${quest.suggestedWeight} kg`
      : quest.suggestedWeight
    : '';
  const infoLine = weightHint
    ? `${quest.sets}×${repsLabel}  ·  ${weightHint}`
    : `${quest.sets}×${repsLabel}`;

  // v4.1.0 B6 + B8 — quest-level adaptationCopy (e.g. "Using your preferred
  // alternative") wins over the adaptation-store copy, because the former
  // describes *this* slot and the latter the historical progression of the
  // underlying exercise.
  const adaptation = quest.exerciseId
    ? useAdaptationStore.getState().getAdaptation(quest.exerciseId)
    : null;
  const rationaleCopy =
    (quest.adaptationCopy && quest.adaptationCopy.length > 0 && quest.adaptationCopy) ||
    (adaptation?.copy && adaptation.copy.length > 0 && adaptation.copy) ||
    null;

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
          <Badge label={diffLabel} variant={diffVariant} />
        </View>

        {/* Row 2: Sets/reps/weight info */}
        <Text style={styles.info} numberOfLines={1}>{infoLine}</Text>

        {/* v4.1.0 B6 — inline adaptation rationale for adapted quests */}
        {rationaleCopy && (
          <Text style={styles.rationale} numberOfLines={2}>
            {rationaleCopy}
          </Text>
        )}

        {/* Row 3: Primary action + ⋯ menu */}
        {quest.status === 'pending' && !disabled && (
          <Animated.View entering={FadeIn} style={styles.actions}>
            <PressableButton
              label="⚔️ Accept Quest →"
              variant="primary"
              size="sm"
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/active-quest', params: { questId: quest.id } })}
            />
            <Pressable
              style={styles.moreBtn}
              onPress={() => setMenuOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="More quest options"
              hitSlop={8}
            >
              <Text style={styles.moreBtnText}>⋯</Text>
            </Pressable>
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
            Quest skipped — tap ⋯ to restore
          </Text>
        )}
      </Card>

      {/* ── ⋯ More menu (A3) ─────────────────────────────────────────────── */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{quest.exerciseName}</Text>

            <Pressable
              style={styles.sheetRow}
              onPress={() => { setMenuOpen(false); setSwapOpen(true); }}
            >
              <Text style={styles.sheetRowIcon}>↕</Text>
              <View style={styles.sheetRowBody}>
                <Text style={styles.sheetRowLabel}>Swap exercise</Text>
                <Text style={styles.sheetRowHint}>Pick a ranked alternative</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.sheetRow}
              onPress={() => { setMenuOpen(false); onAction(quest.id, 'skipped'); }}
            >
              <Text style={styles.sheetRowIcon}>✕</Text>
              <View style={styles.sheetRowBody}>
                <Text style={styles.sheetRowLabel}>Skip quest</Text>
                <Text style={styles.sheetRowHint}>No XP earned — tap ⋯ again to restore</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.sheetRow}
              onPress={() => { setMenuOpen(false); onAction(quest.id, 'complete'); }}
            >
              <Text style={styles.sheetRowIcon}>✓</Text>
              <View style={styles.sheetRowBody}>
                <Text style={styles.sheetRowLabel}>Mark complete (no log)</Text>
                <Text style={styles.sheetRowHint}>Already trained — credit without a log</Text>
              </View>
            </Pressable>

            <PressableButton
              label="Cancel"
              variant="ghost"
              size="sm"
              onPress={() => setMenuOpen(false)}
              style={styles.sheetCancel}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Swap picker bottom sheet (A6) ────────────────────────────────── */}
      <Modal
        visible={swapOpen}
        transparent
        animationType="fade"
        onRequestClose={() => { setSwapOpen(false); setShowAllSwaps(false); }}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => { setSwapOpen(false); setShowAllSwaps(false); }}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Swap {quest.exerciseName}</Text>

            {!showAllSwaps && suggestions && (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {suggestions.top && (
                  <SwapRow suggestion={suggestions.top} onPress={() => applySwap(suggestions.top!.exercise)} />
                )}
                {suggestions.bodyweight && (
                  <SwapRow suggestion={suggestions.bodyweight} onPress={() => applySwap(suggestions.bodyweight!.exercise)} />
                )}
                {suggestions.easier && (
                  <SwapRow suggestion={suggestions.easier} onPress={() => applySwap(suggestions.easier!.exercise)} />
                )}
                {!suggestions.top && !suggestions.bodyweight && !suggestions.easier && (
                  <Text style={styles.noSwaps}>No alternatives available for your level and equipment.</Text>
                )}

                {suggestions.missingEquipment.length > 0 && (
                  <Pressable style={styles.dontHaveKit} onPress={handleDontHaveKit}>
                    <Text style={styles.dontHaveKitLabel}>🚫  I don&apos;t have this kit</Text>
                    <Text style={styles.dontHaveKitHint}>
                      Removes {formatEquipment(suggestions.missingEquipment)} from your profile
                    </Text>
                  </Pressable>
                )}

                {suggestions.allAlternatives.length > 0 && (
                  <Pressable style={styles.browseAllLink} onPress={() => setShowAllSwaps(true)}>
                    <Text style={styles.browseAllText}>Browse all alternatives →</Text>
                  </Pressable>
                )}
              </ScrollView>
            )}

            {showAllSwaps && suggestions && (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {suggestions.allAlternatives.map((ex) => (
                  <Pressable
                    key={ex.id}
                    style={styles.swapOption}
                    onPress={() => applySwap(ex)}
                  >
                    <Text style={styles.swapOptionName}>{ex.name}</Text>
                    <Text style={styles.swapOptionDiff}>Diff {ex.difficultyLevel}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <PressableButton
              label="Cancel"
              variant="ghost"
              size="sm"
              onPress={() => { setSwapOpen(false); setShowAllSwaps(false); }}
              style={styles.sheetCancel}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}

function SwapRow({ suggestion, onPress }: { suggestion: SwapSuggestion; onPress: () => void }) {
  const ex = suggestion.exercise;
  const glyph = suggestion.tag === 'easier' ? '↓' : suggestion.tag === 'bodyweight' ? '🤸' : '↕';
  return (
    <Pressable style={styles.suggestionRow} onPress={onPress} accessibilityRole="button">
      <Text style={styles.suggestionGlyph}>{glyph}</Text>
      <View style={styles.suggestionBody}>
        <Text style={styles.suggestionName}>{ex.name}</Text>
        <Text style={styles.suggestionCaption}>{suggestion.caption}</Text>
      </View>
      <Text style={styles.suggestionDiff}>Diff {ex.difficultyLevel}</Text>
    </Pressable>
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
  // B6 — one-liner rationale under the info line for adapted quests
  rationale: {
    fontSize: 11,
    fontFamily: FONTS.sansMed,
    color: COLORS.violetLight,
    marginTop: 4,
    letterSpacing: 0.2,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  moreBtn: {
    width: 44,
    height: 36,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtnText: {
    fontSize: 20,
    color: COLORS.text,
    lineHeight: 20,
    marginTop: -4,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statusText: { fontSize: 13, fontFamily: FONTS.sansBold, letterSpacing: 0.5 },

  // ── Bottom-sheet shared ───────────────────────────────────────────────
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  sheetTitle: {
    fontSize: 13,
    fontFamily: FONTS.sansBold,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 4,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: COLORS.surfaceAccent,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sheetRowIcon: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
    color: COLORS.text,
  },
  sheetRowBody: { flex: 1 },
  sheetRowLabel: { fontSize: 14, fontFamily: FONTS.sansBold, color: COLORS.text },
  sheetRowHint:  { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted, marginTop: 2 },
  sheetCancel:   { marginTop: 4 },

  // ── Swap picker ranked rows ───────────────────────────────────────────
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surfaceAccent,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  suggestionGlyph: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
    color: COLORS.gold,
  },
  suggestionBody: { flex: 1 },
  suggestionName: { fontSize: 14, fontFamily: FONTS.sansBold, color: COLORS.text },
  suggestionCaption: {
    fontSize: 11,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  suggestionDiff: {
    fontSize: 11,
    fontFamily: FONTS.mono,
    color: COLORS.textMuted,
  },

  // ── "Browse all" flat fallback ───────────────────────────────────────
  swapOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAccent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  swapOptionName: { fontSize: 13, fontFamily: FONTS.sansMed, color: COLORS.text, flex: 1 },
  swapOptionDiff: { fontSize: 11, fontFamily: FONTS.mono, color: COLORS.textMuted, letterSpacing: 0.5 },

  // ── "I don't have this kit" escape hatch ─────────────────────────────
  dontHaveKit: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(224,36,94,0.08)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(224,36,94,0.3)',
    marginBottom: 8,
  },
  dontHaveKitLabel: {
    fontSize: 13,
    fontFamily: FONTS.sansBold,
    color: COLORS.crimson,
    letterSpacing: 0.3,
  },
  dontHaveKitHint: {
    fontSize: 11,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    marginTop: 3,
    letterSpacing: 0.2,
  },

  browseAllLink: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  browseAllText: {
    fontSize: 12,
    fontFamily: FONTS.sansMed,
    color: COLORS.violetLight,
    textDecorationLine: 'underline',
    letterSpacing: 0.3,
  },

  noSwaps: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: FONTS.sans,
    paddingVertical: 16,
  },
});
