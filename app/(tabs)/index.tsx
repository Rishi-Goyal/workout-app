import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import QuestCard from '@/components/dungeon/QuestCard';
import QuestSkeleton from '@/components/dungeon/QuestSkeleton';
import SessionSummary from '@/components/dungeon/SessionSummary';
import PressableButton from '@/components/ui/PressableButton';
import Badge from '@/components/ui/Badge';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { generateQuests, getDungeonRoutineInfo } from '@/lib/questGenerator';
import { COLORS, CLASS_DEFINITIONS } from '@/lib/constants';
import type { QuestStatus, DungeonSession, MuscleGroup } from '@/types';

export default function DungeonTabScreen() {
  const { profile, character, muscleXP, awardXP, awardMuscleXP, incrementFloorsCleared } = useProfileStore();
  const getRecent = useHistoryStore((s) => s.getRecentSessions);
  const addSession = useHistoryStore((s) => s.addSession);
  const { activeSession, isLoading, startSession, setLoading, setError, markQuest, finalizeSession } = useSessionStore();

  const [entering, setEntering] = useState(false);
  const [summary, setSummary] = useState<{
    session: DungeonSession;
    xpGained: number;
    didLevelUp: boolean;
    newLevel?: number;
    muscleLevelUps: Array<{ muscle: MuscleGroup; newLevel: number }>;
  } | null>(null);

  if (!profile || !character) return null;

  const currentFloor = character.floorsCleared + 1;
  const isBoss = currentFloor % 5 === 0 && currentFloor > 0;
  const classDef = CLASS_DEFINITIONS[character.class];

  const handleEnter = () => {
    setEntering(true);
    setLoading(true);
    setError(null);
    try {
      const rawQuests = generateQuests({
        equipment: profile.equipment,
        goal: profile.goal,
        muscleXP,
        muscleStrengths: profile.muscleStrengths,
        currentFloor,
        recentSessions: getRecent(3),
      });

      if (rawQuests.length === 0) {
        Alert.alert('No quests available', 'Try adding more equipment to unlock exercises.');
        return;
      }

      startSession(currentFloor, rawQuests);
    } catch {
      Alert.alert('Quest generation failed', 'Something went wrong preparing your quests.');
      setError('Failed to generate quests');
    } finally {
      setLoading(false);
      setEntering(false);
    }
  };

  const handleQuestAction = useCallback((questId: string, status: QuestStatus) => {
    markQuest(questId, status);
  }, [markQuest]);

  const handleFinalize = () => {
    const finalized = finalizeSession();
    if (!finalized) return;

    const xpGained = finalized.totalXPEarned;
    const { leveledUp } = awardXP(xpGained);
    const newLevel = leveledUp ? useProfileStore.getState().character?.level : undefined;

    const allMuscleLevelUps: Array<{ muscle: MuscleGroup; newLevel: number }> = [];
    for (const quest of finalized.quests) {
      if (quest.status === 'complete' || quest.status === 'half_complete') {
        const primary = quest.targetMuscles.length > 0 ? [quest.targetMuscles[0]] : [];
        const secondary = quest.targetMuscles.slice(1);
        const completion = quest.status === 'complete' ? 'complete' : 'half_complete';
        const { levelUps } = awardMuscleXP(
          primary as MuscleGroup[],
          secondary as MuscleGroup[],
          quest.difficulty,
          completion,
        );
        allMuscleLevelUps.push(...levelUps);
      }
    }

    incrementFloorsCleared();
    addSession(finalized);
    setSummary({ session: finalized, xpGained, didLevelUp: leveledUp, newLevel, muscleLevelUps: allMuscleLevelUps });
  };

  const handleSummaryClose = () => setSummary(null);

  // ── Active session view ───────────────────────────────────────────────────
  if (activeSession || isLoading) {
    const allActioned = activeSession?.quests.every((q) => q.status !== 'pending') ?? false;
    const sessionIsBoss = activeSession ? activeSession.floor % 5 === 0 && activeSession.floor > 0 : false;

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <View style={styles.sessionHeader}>
            <View>
              <Text style={styles.floorHeading}>
                {activeSession ? `Floor ${activeSession.floor}` : 'Loading…'}
              </Text>
              {sessionIsBoss && <Badge label="⚠️ Boss Floor" variant="crimson" />}
            </View>
            {activeSession && (
              <PressableButton
                label="Retreat"
                variant="ghost"
                size="sm"
                onPress={() => {
                  Alert.alert('Retreat?', 'You will lose progress on this floor.', [
                    { text: 'Stay', style: 'cancel' },
                    {
                      text: 'Retreat', style: 'destructive',
                      onPress: () => useSessionStore.getState().clearSession(),
                    },
                  ]);
                }}
              />
            )}
          </View>

          <View style={styles.questList}>
            {isLoading || !activeSession ? (
              <><QuestSkeleton /><QuestSkeleton /><QuestSkeleton /></>
            ) : (
              activeSession.quests.map((quest) => (
                <QuestCard key={quest.id} quest={quest} onAction={handleQuestAction} />
              ))
            )}
          </View>

          {activeSession && allActioned && (
            <PressableButton
              label="Complete Floor & Claim XP 🏆"
              size="lg"
              style={styles.finalizeBtn}
              onPress={handleFinalize}
            />
          )}

          {activeSession && !allActioned && (
            <Text style={styles.hint}>Complete, half-complete, or skip each quest to continue</Text>
          )}
        </ScrollView>

        {summary && (
          <SessionSummary
            session={summary.session}
            xpGained={summary.xpGained}
            didLevelUp={summary.didLevelUp}
            newLevel={summary.newLevel}
            muscleLevelUps={summary.muscleLevelUps}
            onClose={handleSummaryClose}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── Entrance view ─────────────────────────────────────────────────────────
  const routineInfo = getDungeonRoutineInfo(profile.goal, currentFloor);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Class identity */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.classRow}>
          <Text style={[styles.classIcon]}>{classDef.icon}</Text>
          <View>
            <Text style={[styles.className, { color: classDef.color }]}>{character.class}</Text>
            <Text style={styles.classTagline}>{classDef.tagline}</Text>
          </View>
        </Animated.View>

        {/* Floor entrance card */}
        <Animated.View entering={FadeInDown.duration(300).delay(60)} style={[styles.entranceCard, isBoss && styles.bossCard]}>
          <Text style={styles.doorEmoji}>{isBoss ? '🔴' : '🚪'}</Text>
          <Text style={styles.floorLabel}>Floor {currentFloor}</Text>
          {isBoss && (
            <View style={styles.bossBadge}>
              <Text style={styles.bossBadgeText}>⚠️  BOSS FLOOR</Text>
            </View>
          )}

          {/* Routine label */}
          <View style={styles.routineRow}>
            <Text style={styles.routineName}>{routineInfo.splitName}</Text>
            <Text style={styles.routineDay}>{routineInfo.dayName}</Text>
          </View>

          {routineInfo.targetMuscles.length > 0 && (
            <View style={styles.muscleChips}>
              {routineInfo.targetMuscles.map((m: MuscleGroup) => (
                <View key={m} style={styles.chip}>
                  <Text style={styles.chipText}>{m}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.floorHint}>
            {isBoss ? 'A powerful guardian blocks the path…' : '3 quests await beyond the door'}
          </Text>

          <PressableButton
            label={entering ? 'Preparing…' : 'Enter the Dungeon ⚔️'}
            size="lg"
            loading={entering}
            style={styles.enterBtn}
            onPress={handleEnter}
          />
        </Animated.View>

        {/* XP snapshot */}
        <Animated.View entering={FadeInDown.duration(300).delay(120)} style={styles.xpRow}>
          <View style={styles.xpStat}>
            <Text style={styles.xpNum}>{character.level}</Text>
            <Text style={styles.xpLbl}>Level</Text>
          </View>
          <View style={styles.xpDivider} />
          <View style={styles.xpStat}>
            <Text style={styles.xpNum}>{character.floorsCleared}</Text>
            <Text style={styles.xpLbl}>Floors</Text>
          </View>
          <View style={styles.xpDivider} />
          <View style={styles.xpStat}>
            <Text style={styles.xpNum}>{character.totalXPEarned}</Text>
            <Text style={styles.xpLbl}>Total XP</Text>
          </View>
        </Animated.View>

      </ScrollView>

      {summary && (
        <SessionSummary
          session={summary.session}
          xpGained={summary.xpGained}
          didLevelUp={summary.didLevelUp}
          newLevel={summary.newLevel}
          muscleLevelUps={summary.muscleLevelUps}
          onClose={handleSummaryClose}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, gap: 16, paddingBottom: 36 },

  // Class identity
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  classIcon: { fontSize: 36 },
  className: { fontSize: 20, fontWeight: '800' },
  classTagline: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontStyle: 'italic' },

  // Entrance card
  entranceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bossCard: { borderColor: 'rgba(220,38,38,0.5)', backgroundColor: 'rgba(127,0,0,0.12)' },
  doorEmoji: { fontSize: 56 },
  floorLabel: { fontSize: 30, fontWeight: '800', color: COLORS.text },
  bossBadge: {
    backgroundColor: 'rgba(220,38,38,0.2)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.4)',
  },
  bossBadgeText: { color: '#f87171', fontSize: 12, fontWeight: '700' },
  routineRow: { alignItems: 'center', gap: 2 },
  routineName: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' },
  routineDay: { fontSize: 15, fontWeight: '700', color: COLORS.gold },
  muscleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  chip: { backgroundColor: COLORS.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 10, color: COLORS.textMuted, textTransform: 'capitalize' },
  floorHint: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  enterBtn: { width: '100%', marginTop: 4 },

  // XP snapshot row
  xpRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 16,
  },
  xpStat: { flex: 1, alignItems: 'center' },
  xpNum: { fontSize: 22, fontWeight: '800', color: COLORS.gold },
  xpLbl: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  xpDivider: { width: 1, backgroundColor: COLORS.border },

  // Active session
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  floorHeading: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  questList: { gap: 14 },
  finalizeBtn: { marginTop: 8 },
  hint: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 20 },
});
