import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Linking, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QuestCard from '@/components/dungeon/QuestCard';
import QuestSkeleton from '@/components/dungeon/QuestSkeleton';
import SessionSummary from '@/components/dungeon/SessionSummary';
import ResumeSessionCard from '@/components/dungeon/ResumeSessionCard';
import WeeklyGoalWidget from '@/components/dungeon/WeeklyGoalWidget';
import PressableButton from '@/components/ui/PressableButton';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import SectionLabel from '@/components/ui/SectionLabel';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { useAdaptationStore } from '@/stores/useAdaptationStore';
import { useWeeklyGoalStore } from '@/stores/useWeeklyGoalStore';
import { generateQuests, getDungeonRoutineInfo } from '@/lib/questGenerator';
import { xpToNextLevel } from '@/lib/xp';
import { relativeDate } from '@/lib/dateUtils';
import { COLORS, FONTS, SPACING } from '@/lib/constants';
import { getCurrentVersion, compareVersions, getReleasesUrl } from '@/lib/versionCheck';
import type { QuestStatus, DungeonSession, MuscleGroup } from '@/types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DungeonTabScreen() {
  const { profile, character, muscleXP, awardXP, awardMuscleXP, incrementFloorsCleared, latestVersion } = useProfileStore();
  const getRecent = useHistoryStore((s) => s.getRecentSessions);
  const sessions = useHistoryStore((s) => s.sessions);
  const addSession = useHistoryStore((s) => s.addSession);
  const { activeSession, isLoading, startSession, setLoading, setError, markQuest, finalizeSession, clearSession } = useSessionStore();

  // True when activeSession was rehydrated from AsyncStorage (survived a force-quit),
  // as opposed to being freshly started this launch. Used to show the Resume card on
  // the entrance view instead of jumping straight into the session.
  const [sessionWasRehydrated, setSessionWasRehydrated] = useState(false);
  useEffect(() => {
    if (useSessionStore.getState().activeSession) {
      setSessionWasRehydrated(true);
      return;
    }
    // onFinishHydration fires once when Zustand finishes reading from AsyncStorage
    const unsub = useSessionStore.persist.onFinishHydration(() => {
      if (useSessionStore.getState().activeSession) setSessionWasRehydrated(true);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [entering, setEntering] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [summary, setSummary] = useState<{
    session: DungeonSession;
    xpGained: number;
    didLevelUp: boolean;
    newLevel?: number;
    muscleLevelUps: Array<{ muscle: MuscleGroup; newLevel: number }>;
  } | null>(null);

  if (!profile || !character) return null;

  const currentFloor = character.floorsCleared + 1;
  const showUpdateBanner =
    !bannerDismissed &&
    latestVersion !== null &&
    compareVersions(getCurrentVersion(), latestVersion);

  // ── Update banner (shared across entrance and session views) ──────────────
  const UpdateBanner = showUpdateBanner ? (
    <View style={styles.updateBanner}>
      <Text style={styles.updateBannerEmoji}>🎉</Text>
      <Text style={styles.updateBannerText}>
        v{latestVersion} available
      </Text>
      <Pressable
        style={styles.updateBannerCta}
        onPress={() => Linking.openURL(getReleasesUrl())}
      >
        <Text style={styles.updateBannerCtaText}>Download</Text>
      </Pressable>
      <Pressable hitSlop={12} onPress={() => setBannerDismissed(true)}>
        <Text style={styles.updateBannerClose}>✕</Text>
      </Pressable>
    </View>
  ) : null;

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
        adaptations: useAdaptationStore.getState().adaptations,
        preferredSplit: useProfileStore.getState().preferredSplit ?? undefined,
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
          quest.exerciseId,  // ADD THIS
        );
        allMuscleLevelUps.push(...levelUps);
      }
    }

    incrementFloorsCleared();
    addSession(finalized);
    // Feature 1: update per-exercise progressive overload targets
    useAdaptationStore.getState().applyAdaptation(finalized, useProfileStore.getState().muscleXP);
    // Feature 2: evaluate last week's streak now that a new session exists
    useWeeklyGoalStore.getState().evaluateWeek(
      useHistoryStore.getState().sessions,
    );
    setSummary({ session: finalized, xpGained, didLevelUp: leveledUp, newLevel, muscleLevelUps: allMuscleLevelUps });
  };

  const handleSummaryClose = () => setSummary(null);

  // ── Active session view ───────────────────────────────────────────────────
  // Skip directly to session view when actively loading OR when a session was
  // freshly started this launch (not rehydrated). Rehydrated sessions go through
  // the entrance view first so the user can choose to Resume or Discard.
  if (isLoading || (activeSession && !sessionWasRehydrated)) {
    const allActioned = activeSession?.quests.every((q) => q.status !== 'pending') ?? false;
    const routineInfoForSession = getDungeonRoutineInfo(profile.goal, activeSession?.floor ?? currentFloor);
    const estimatedXP = activeSession
      ? activeSession.quests.reduce((sum, q) => sum + (q.xpEarned ?? 0), 0)
      : 0;

    return (
      <SafeAreaView style={styles.safe}>
        {UpdateBanner}
        <View style={styles.sessionTopHeader}>
          <View style={styles.sessionHeaderLeft}>
            <Text style={styles.sessionRoutineName} numberOfLines={2} ellipsizeMode="tail">
              {routineInfoForSession.splitName}
            </Text>
            <Text style={styles.sessionFloorLabel}>
              {activeSession ? `FLOOR ${activeSession.floor}` : 'SUMMONING…'}
            </Text>
          </View>
          {activeSession && (
            <PressableButton
              label="Abandon Floor"
              variant="ghost"
              size="sm"
              onPress={() => {
                Alert.alert('Abandon the dungeon?', 'You will lose progress on this floor.', [
                  { text: 'Stay', style: 'cancel' },
                  {
                    text: 'Abandon', style: 'destructive',
                    onPress: () => useSessionStore.getState().clearSession(),
                  },
                ]);
              }}
            />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.sessionScroll} showsVerticalScrollIndicator={false}>
          <SectionLabel>QUESTS</SectionLabel>

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
              label={`Finish & Save [+${estimatedXP} XP] →`}
              size="lg"
              style={styles.finalizeBtn}
              onPress={handleFinalize}
            />
          )}

          {activeSession && !allActioned && (
            <Text style={styles.hint}>Clear every quest to finalize the dungeon run</Text>
          )}
        </ScrollView>

        {summary && (
          <SessionSummary
            session={summary.session}
            xpGained={summary.xpGained}
            didLevelUp={summary.didLevelUp}
            newLevel={summary.newLevel}
            muscleLevelUps={summary.muscleLevelUps}
            goal={profile.goal}
            onClose={handleSummaryClose}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── Entrance view ─────────────────────────────────────────────────────────
  const routineInfo = getDungeonRoutineInfo(profile.goal, currentFloor);
  const xpFillPercent = Math.min(1, character.currentXP / xpToNextLevel(character.level));
  const recentSessions = sessions.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe}>
      {UpdateBanner}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}, {profile.name}</Text>
            <Text style={styles.charName}>{character.class}</Text>
          </View>
          <Badge label={`Level ${character.level}`} variant="muted" />
        </View>

        {/* XP thin bar */}
        <View style={styles.xpBarTrack}>
          <View style={[styles.xpBarFill, { width: `${xpFillPercent * 100}%` }]} />
        </View>

        {/* Resume card — shown when a session survived a force-quit */}
        {sessionWasRehydrated && activeSession && (
          <ResumeSessionCard
            session={activeSession}
            goal={profile.goal}
            onResume={() => setSessionWasRehydrated(false)}
            onDiscard={() => {
              clearSession();
              setSessionWasRehydrated(false);
            }}
          />
        )}

        {/* Hero card */}
        <Card padding={SPACING.cardLg} glow="gold">
          <SectionLabel style={{ marginBottom: 8 }}>TODAY'S DUNGEON</SectionLabel>
          <Text style={styles.workoutName}>{routineInfo.splitName}</Text>
          <View style={styles.detailsRow}>
            <Text style={styles.detailText}>~45 min</Text>
            <Text style={styles.detailSep}>•</Text>
            {routineInfo.targetMuscles.map((m: MuscleGroup) => (
              <View key={m} style={styles.muscleChip}>
                <Text style={styles.muscleChipText}>{m}</Text>
              </View>
            ))}
          </View>
          <PressableButton
            label={entering ? 'Summoning Quests…' : '⚔️ Enter the Dungeon'}
            size="lg"
            loading={entering}
            style={styles.startBtn}
            onPress={handleEnter}
          />
        </Card>

        {/* Weekly goal widget — streak + Mon–Sun dot row + freeze */}
        <WeeklyGoalWidget />

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard} padding={14}>
            <Text style={styles.statValue}>{character.floorsCleared > 0 ? character.floorsCleared : 0}</Text>
            <Text style={styles.statLabel}>FLOORS</Text>
          </Card>
          <Card style={styles.statCard} padding={14}>
            <Text style={styles.statValue}>{character.level}</Text>
            <Text style={styles.statLabel}>LEVEL</Text>
          </Card>
          <Card style={styles.statCard} padding={14}>
            <Text style={styles.statValue}>{character.totalXPEarned}</Text>
            <Text style={styles.statLabel}>TOTAL XP</Text>
          </Card>
        </View>

        {/* Recent section */}
        {recentSessions.length > 0 && (
          <View>
            <SectionLabel>EXPEDITION LOG</SectionLabel>
            {recentSessions.map((session, index) => (
              <View key={session.id}>
                {index > 0 && <View style={styles.separator} />}
                <View style={styles.recentRow}>
                  <View>
                    <Text style={styles.recentWorkoutName}>Floor {session.floor}</Text>
                    <Text style={styles.recentXP}>+{session.totalXPEarned} XP</Text>
                  </View>
                  <Text style={styles.recentDate}>{relativeDate(session.startedAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {summary && (
        <SessionSummary
          session={summary.session}
          xpGained={summary.xpGained}
          didLevelUp={summary.didLevelUp}
          newLevel={summary.newLevel}
          muscleLevelUps={summary.muscleLevelUps}
          goal={profile.goal}
          onClose={handleSummaryClose}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.screen, gap: SPACING.gap, paddingBottom: 36 },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { gap: 2 },
  greeting: { fontSize: 13, fontFamily: FONTS.sansMed, color: COLORS.textMuted, letterSpacing: 0.3 },
  charName: { fontSize: 22, fontFamily: FONTS.displayBold, color: COLORS.text, letterSpacing: 0.5 },

  // XP bar
  xpBarTrack: {
    height: 3,
    width: '100%',
    backgroundColor: COLORS.border,
    borderRadius: 999,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 999,
  },

  // Hero card internals
  workoutName: { fontSize: 22, fontFamily: FONTS.displayBold, color: COLORS.text, letterSpacing: 0.5 },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  detailText: { fontSize: 12, fontFamily: FONTS.mono, color: COLORS.textMuted, letterSpacing: 0.3 },
  detailSep: { fontSize: 12, color: COLORS.textMuted },
  muscleChip: {
    backgroundColor: COLORS.surfaceAccent,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  muscleChipText: { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  startBtn: { width: '100%', marginTop: 18 },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontFamily: FONTS.displayBold, color: COLORS.text, letterSpacing: 0.3 },
  statLabel: { fontSize: 9, fontFamily: FONTS.sansBold, color: COLORS.textMuted, letterSpacing: 1.5 },

  // Recent section
  separator: { height: 1, backgroundColor: COLORS.border },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentWorkoutName: { fontSize: 14, fontFamily: FONTS.sansBold, color: COLORS.text, letterSpacing: 0.3 },
  recentXP: { fontSize: 11, fontFamily: FONTS.mono, color: COLORS.gold, marginTop: 2, letterSpacing: 0.5 },
  recentDate: { fontSize: 11, fontFamily: FONTS.mono, color: COLORS.textMuted, letterSpacing: 0.3 },

  // Update banner
  updateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99,102,241,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  updateBannerEmoji: { fontSize: 16 },
  updateBannerText: { flex: 1, fontSize: 12, color: COLORS.text, fontFamily: FONTS.sansBold, letterSpacing: 0.3 },
  updateBannerCta: {
    backgroundColor: 'rgba(99,102,241,0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.4)',
  },
  updateBannerCtaText: { fontSize: 11, fontFamily: FONTS.sansBold, color: COLORS.violetLight, letterSpacing: 0.5 },
  updateBannerClose: { fontSize: 16, color: COLORS.textMuted, paddingHorizontal: 4 },

  // Active session
  sessionTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sessionHeaderLeft: { flex: 1, paddingRight: 12 },
  sessionRoutineName: { fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.text, letterSpacing: 0.5 },
  sessionFloorLabel: { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.gold, marginTop: 4, letterSpacing: 2, textTransform: 'uppercase' },
  sessionScroll: { padding: 16, gap: 16, paddingBottom: 36 },
  questList: { gap: 12 },
  finalizeBtn: { marginTop: 8 },
  hint: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 20, fontStyle: 'italic' },
});
