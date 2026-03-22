import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import PressableButton from '@/components/ui/PressableButton';
import { COLORS } from '@/lib/constants';
import type { DungeonSession } from '@/types';

interface Props {
  session: DungeonSession;
  xpGained: number;
  didLevelUp: boolean;
  newLevel?: number;
  onClose: () => void;
}

export default function SessionSummary({ session, xpGained, didLevelUp, newLevel, onClose }: Props) {
  const completed = session.quests.filter((q) => q.status === 'complete').length;
  const half      = session.quests.filter((q) => q.status === 'half_complete').length;
  const skipped   = session.quests.filter((q) => q.status === 'skipped').length;

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.backdrop}>
        <Animated.View entering={ZoomIn.springify()} style={styles.card}>
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

          <PressableButton label="Continue" size="lg" onPress={onClose} style={styles.btn} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
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
  btn: { width: '100%', marginTop: 4 },
});
