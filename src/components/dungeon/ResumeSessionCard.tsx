/**
 * ResumeSessionCard — shown on the Home entrance view when a session survived
 * a force-quit or backgrounding and was rehydrated from AsyncStorage.
 *
 * Lets the user pick up where they left off, or cleanly discard.
 */
import { Alert, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import PressableButton from '@/components/ui/PressableButton';
import { getDungeonRoutineInfo } from '@/lib/questGenerator';
import { COLORS } from '@/lib/constants';
import type { DungeonSession, FitnessGoal } from '@/types';

interface ResumeSessionCardProps {
  session: DungeonSession;
  goal: FitnessGoal;
  onResume: () => void;
  onDiscard: () => void;
}

export default function ResumeSessionCard({
  session,
  goal,
  onResume,
  onDiscard,
}: ResumeSessionCardProps) {
  const pending  = session.quests.filter((q) => q.status === 'pending').length;
  const done     = session.quests.length - pending;
  const xpSoFar  = session.quests.reduce((s, q) => s + q.xpEarned, 0);
  const routineInfo = getDungeonRoutineInfo(goal, session.floor);

  function confirmDiscard() {
    Alert.alert(
      'Discard session?',
      'Your progress will be lost and you\'ll start fresh.',
      [
        { text: 'Keep session', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onDiscard },
      ],
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(350)}>
      <Card padding={16} style={styles.card}>
        {/* Header row */}
        <View style={styles.topRow}>
          <Text style={styles.eyebrow}>SESSION IN PROGRESS</Text>
          <Badge label="PAUSED" variant="orange" />
        </View>

        {/* Session identity */}
        <View style={styles.titleBlock}>
          <Text style={styles.sessionTitle}>Session {session.floor}</Text>
          <Text style={styles.splitName}>{routineInfo.splitName}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={[styles.statNum, { color: COLORS.jade }]}>{done}</Text>
            <Text style={styles.statLbl}>done</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={[styles.statNum, { color: COLORS.gold }]}>{pending}</Text>
            <Text style={styles.statLbl}>remaining</Text>
          </View>
          {xpSoFar > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statChip}>
                <Text style={[styles.statNum, { color: COLORS.gold }]}>+{xpSoFar}</Text>
                <Text style={styles.statLbl}>XP earned</Text>
              </View>
            </>
          )}
        </View>

        {/* Actions */}
        <View style={styles.btnRow}>
          <PressableButton
            label="Resume →"
            size="lg"
            style={styles.resumeBtn}
            onPress={onResume}
          />
          <PressableButton
            label="Discard"
            variant="ghost"
            size="lg"
            style={styles.discardBtn}
            onPress={confirmDiscard}
          />
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    borderColor: 'rgba(249,115,22,0.3)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
  },
  titleBlock: { gap: 2 },
  sessionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  splitName:    { fontSize: 13, color: COLORS.textMuted },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statChip:    { alignItems: 'center', gap: 2 },
  statNum:     { fontSize: 18, fontWeight: '700', color: COLORS.text },
  statLbl:     { fontSize: 10, color: COLORS.textMuted },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  resumeBtn:  { flex: 2 },
  discardBtn: { flex: 1, borderColor: 'rgba(239,68,68,0.3)' },
});
