/**
 * CoachMark — v4.2.0 Theme D.
 *
 * Lightweight inline tutorial tooltip used during the Floor 1 guided dungeon.
 *
 * Design philosophy:
 *   • Inline, not a modal: lives in the document flow next to whatever it's
 *     describing — easier to anchor visually than absolute-positioned with
 *     onLayout measurements (the original plan), and avoids the safe-area /
 *     scroll edge cases that absolute tooltips hit on Android.
 *   • Self-gates: callers pass `stepId` and the component reads the store
 *     itself. Once dismissed, returns null. Once `isVisible` flips false
 *     (e.g. floorsCleared >= 1 or session no longer tutorial), returns null.
 *   • One-line tap to dismiss — no modal blockers.
 *
 * Anchor + arrow direction is purely cosmetic (`anchor: 'top' | 'bottom'`):
 *   • anchor: 'top'    → arrow points up, sits below the target
 *   • anchor: 'bottom' → arrow points down, sits above the target
 */
import { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { COLORS, FONTS, RADIUS } from '@/lib/constants';
import {
  useTutorialStore,
  COACH_MARK_COPY,
  type TutorialStepId,
} from '@/stores/useTutorialStore';

interface CoachMarkProps {
  stepId: TutorialStepId;
  /**
   * Master visibility gate — typically:
   *   isTutorial && (character.floorsCleared ?? 0) < 1
   * The component still re-checks dismissal state internally.
   */
  isVisible: boolean;
  /** Where the arrow points; defaults to 'top' (arrow up, mark sits below the target). */
  anchor?: 'top' | 'bottom';
}

export default function CoachMark({ stepId, isVisible, anchor = 'top' }: CoachMarkProps) {
  const dismissed = useTutorialStore((s) => s.dismissedSteps.includes(stepId));
  const dismissStep = useTutorialStore((s) => s.dismissStep);

  const handleDismiss = useCallback(() => {
    dismissStep(stepId);
  }, [dismissStep, stepId]);

  if (!isVisible || dismissed) return null;

  const { title, body } = COACH_MARK_COPY[stepId];

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(150)}
      style={styles.container}
    >
      {anchor === 'top' && <View style={[styles.arrow, styles.arrowUp]} />}
      <Pressable
        style={styles.bubble}
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel={`Tutorial step ${stepId}: ${title}. Tap to dismiss.`}
      >
        <View style={styles.titleRow}>
          <Text style={styles.stepBadge}>{stepId}/5</Text>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
        <Text style={styles.body}>{body}</Text>
        <Text style={styles.dismiss}>Tap to continue →</Text>
      </Pressable>
      {anchor === 'bottom' && <View style={[styles.arrow, styles.arrowDown]} />}
    </Animated.View>
  );
}

const ACCENT = COLORS.gold;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  bubble: {
    width: '100%',
    backgroundColor: 'rgba(245,166,35,0.12)',
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    // Soft glow
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  arrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowUp: {
    borderBottomWidth: 8,
    borderBottomColor: ACCENT,
    marginBottom: -1,
  },
  arrowDown: {
    borderTopWidth: 8,
    borderTopColor: ACCENT,
    marginTop: -1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBadge: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: COLORS.bg,
    backgroundColor: ACCENT,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    letterSpacing: 1,
    overflow: 'hidden',
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
    letterSpacing: 0.4,
  },
  body: {
    fontSize: 12,
    fontFamily: FONTS.sans,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  dismiss: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: ACCENT,
    letterSpacing: 1.5,
    marginTop: 2,
  },
});
