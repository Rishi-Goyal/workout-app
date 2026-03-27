import { View, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import Animated, { FadeIn, ZoomIn, FadeInDown } from 'react-native-reanimated';
import PressableButton from '@/components/ui/PressableButton';
import { COLORS, RADIUS } from '@/lib/constants';
import { muscleLevelTitle } from '@/lib/muscleXP';
import type { DungeonSession, MuscleGroup } from '@/types';

interface Props {
  session: DungeonSession;
  xpGained: number;
  didLevelUp: boolean;
  newLevel?: number;
  muscleLevelUps?: Array<{ muscle: MuscleGroup; newLevel: number }>;
  onClose: () => void;
}

export default function SessionSummary({
  session, xpGained, didLevelUp, newLevel, muscleLevelUps = [], onClose,
}: Props) {
  const completed = session.quests.filter((q) => q.status === 'complete').length;
  const half      = session.quests.filter((q) => q.status === 'half_complete').length;
  const skipped   = session.quests.filter((q) => q.status === 'skipped').length;

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.backdrop}>
        <Animated.View entering={ZoomIn.springify()} style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.icon}>{didLevelUp ? '🎉' : '⚔️'}</Text>

            <Text style={styles.title}>
              {didLevelUp ? `Level ${newLevel}!` : `Floor ${session.floor} Cleared`}
            </Text>
            {didLevelUp && (
              <Text style={styles.subtitle}>You leveled up!</Text>
            )}

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: COLORS.jade }]}>{completed}</Text>
                <Text style={styles.statLbl}>Done</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: COLORS.gold }]}>{half}</Text>
                <Text style={styles.statLbl}>Half</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: COLORS.textMuted }]}>{skipped}</Text>
                <Text style={styles.statLbl}>Skip</Text>
              </View>
            </View>

            <View style={styles.xpBox}>
              <Text style={styles.xpNum}>+{xpGained} XP</Text>
              <Text style={styles.xpLbl}>Experience Earned</Text>
            </View>

            {/* Muscle level-ups */}
            {muscleLevelUps.length > 0 && (
              <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.muscleLevelUps}>
                <Text style={styles.muscleSectionTitle}>💪 MUSCLE LEVEL UPS</Text>
                {muscleLevelUps.map((lu, i) => (
                  <Animated.View
                    key={`${lu.muscle}-${i}`}
                    entering={FadeInDown.duration(300).delay(400 + i * 100)}
                    style={styles.muscleLevelRow}
                  >
                    <Text style={styles.muscleName}>{lu.muscle}</Text>
                    <View style={styles.muscleLevelBadge}>
                      <Text style={styles.muscleLevelText}>
                        Lv.{lu.newLevel} — {muscleLevelTitle(lu.newLevel)}
                      </Text>
                    </View>
                  </Animated.View>
                ))}
              </Animated.View>
            )}

            <PressableButton label="Continue" size="lg" onPress={onClose} style={styles.btn} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    maxHeight: '85%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scrollContent: { alignItems: 'center', gap: 16 },
  icon: { fontSize: 52 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.gold, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: -8 },
  statsRow: { flexDirection: 'row', gap: 24 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '700' },
  statLbl: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  xpBox: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    alignItems: 'center',
    width: '100%',
  },
  xpNum: { fontSize: 32, fontWeight: '800', color: COLORS.gold },
  xpLbl: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  muscleLevelUps: {
    width: '100%',
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  muscleSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.jade,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 4,
  },
  muscleLevelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  muscleName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  muscleLevelBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  muscleLevelText: { fontSize: 11, fontWeight: '700', color: COLORS.jade },
  btn: { width: '100%', marginTop: 4 },
});
