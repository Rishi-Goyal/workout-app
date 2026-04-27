/**
 * DungeonRoom — section header + child quests for one phase of a session.
 *
 * v4.2.0 Theme A: replaces the flat quest list on the dungeon screen with
 * three labelled rooms (Mobs / Mini-Bosses / Recovery). Mobs and Recovery
 * default collapsed because they're hold-only drills with low cognitive
 * load; Mini-Bosses default expanded because each lift carries the
 * primary lift logging UI the user actually needs to see.
 */
import { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import QuestCard from './QuestCard';
import { COLORS, FONTS, RADIUS, SPACING } from '@/lib/constants';
import type { DungeonPhase } from '@/lib/questPhase';
import type { Quest, QuestStatus } from '@/types';

interface DungeonRoomProps {
  phase: DungeonPhase;
  title: string;
  icon: string;
  quests: Quest[];
  onAction: (questId: string, status: QuestStatus) => void;
  /** Default collapse state. Mini-bosses default open; mobs/recovery default closed. */
  defaultExpanded?: boolean;
}

/**
 * Estimated minutes for the phase header subtitle. Hold drills sum
 * holdSeconds × sets; lifts use a rough per-set estimate (45s work + rest).
 */
function estimateMinutes(quests: Quest[]): number {
  let totalSeconds = 0;
  for (const q of quests) {
    if (q.holdSeconds && q.holdSeconds > 0) {
      totalSeconds += q.holdSeconds * q.sets + q.restSeconds * Math.max(0, q.sets - 1);
    } else {
      totalSeconds += (45 + q.restSeconds) * q.sets;
    }
  }
  return Math.max(1, Math.round(totalSeconds / 60));
}

export default function DungeonRoom({
  phase,
  title,
  icon,
  quests,
  onAction,
  defaultExpanded,
}: DungeonRoomProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? phase === 'miniboss');

  const { totalCount, doneCount, mins } = useMemo(() => {
    const total = quests.length;
    const done = quests.filter(
      (q) => q.status === 'complete' || q.status === 'half_complete' || q.status === 'skipped',
    ).length;
    return { totalCount: total, doneCount: done, mins: estimateMinutes(quests) };
  }, [quests]);

  if (quests.length === 0) return null;

  const allDone = doneCount === totalCount && totalCount > 0;
  const isMiniBoss = phase === 'miniboss';

  const summary = `${totalCount} ${totalCount === 1 ? 'drill' : 'drills'} · ~${mins} min`;
  const progress = `${doneCount}/${totalCount}`;

  return (
    <Animated.View entering={FadeIn.duration(300)} layout={Layout.springify()} style={styles.room}>
      <Pressable
        style={[
          styles.header,
          allDone && styles.headerDone,
          isMiniBoss && styles.headerBoss,
        ]}
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={`${title} room — ${expanded ? 'collapse' : 'expand'}`}
      >
        <View style={styles.headerMain}>
          <Text style={styles.headerIcon}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, isMiniBoss && styles.headerTitleBoss]}>
              {title.toUpperCase()}
            </Text>
            <Text style={styles.headerSubtitle}>{summary}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.progress, allDone && styles.progressDone]}>{progress}</Text>
            <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
          </View>
        </View>
      </Pressable>

      {expanded && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.body}>
          {quests.map((quest, idx) => (
            <View key={quest.id} style={styles.questWrap}>
              {isMiniBoss && (
                <Text style={styles.roomLabel}>
                  ROOM {idx + 1} · MINI-BOSS
                </Text>
              )}
              <QuestCard quest={quest} onAction={onAction} />
            </View>
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  room: {
    gap: SPACING.gapSm,
  },
  header: {
    backgroundColor: COLORS.surfaceAccent,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  headerBoss: {
    borderColor: 'rgba(245,166,35,0.45)',
    backgroundColor: 'rgba(245,166,35,0.06)',
  },
  headerDone: {
    opacity: 0.6,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
    letterSpacing: 1.6,
  },
  headerTitleBoss: {
    color: COLORS.gold,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progress: {
    fontSize: 12,
    fontFamily: FONTS.mono,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  progressDone: {
    color: COLORS.jade,
  },
  chevron: {
    fontSize: 12,
    color: COLORS.textMuted,
    width: 14,
    textAlign: 'center',
  },
  body: {
    gap: SPACING.gapSm,
    paddingTop: 6,
  },
  questWrap: {
    gap: 6,
  },
  roomLabel: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: COLORS.gold,
    letterSpacing: 1.8,
    // Aligned flush with the QuestCard's left edge (no inset) so the eyebrow
    // reads as a label *for* the card directly below it.
    paddingLeft: 0,
  },
});
