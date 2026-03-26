import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import CharacterPanel from '@/components/character/CharacterPanel';
import FloorMap from '@/components/dungeon/FloorMap';
import PressableButton from '@/components/ui/PressableButton';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { generateQuests, getDungeonRoutineInfo } from '@/lib/questGenerator';
import { COLORS } from '@/lib/constants';
import type { MuscleGroup } from '@/types';

export default function HomeScreen() {
  const { profile, character, muscleXP } = useProfileStore();
  const sessions = useHistoryStore((s) => s.sessions);
  const getRecent = useHistoryStore((s) => s.getRecentSessions);
  const { startSession, setLoading, setError, isLoading } = useSessionStore();
  const [entering, setEntering] = useState(false);

  if (!profile || !character) return null;

  const currentFloor = character.floorsCleared + 1;
  const isBoss = currentFloor % 5 === 0 && currentFloor > 0;

  // Get routine info for display
  const routineInfo = getDungeonRoutineInfo(profile.goal, currentFloor);

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
      router.push('/(tabs)/dungeon');
    } catch (e) {
      Alert.alert('Quest generation failed', 'Something went wrong preparing your quests.');
      setError('Failed to generate quests');
    } finally {
      setLoading(false);
      setEntering(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Title */}
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={styles.title}>The Dungeon Awaits</Text>
          <Text style={styles.subtitle}>Complete quests, earn XP, grow stronger.</Text>
        </Animated.View>

        {/* Character Panel */}
        <CharacterPanel character={character} profile={profile} muscleXP={muscleXP} />

        {/* Dungeon Entrance */}
        <View style={[styles.entranceCard, isBoss && styles.bossCard]}>
          <Text style={styles.doorEmoji}>{isBoss ? '🔴' : '🚪'}</Text>
          <Text style={styles.floorLabel}>Floor {currentFloor}</Text>
          {isBoss && (
            <View style={styles.bossBadge}>
              <Text style={styles.bossBadgeText}>⚠️  BOSS FLOOR</Text>
            </View>
          )}

          {/* Routine info */}
          <Animated.View entering={FadeInDown.duration(300).delay(100)} style={styles.routineInfo}>
            <Text style={styles.routineSplit}>{routineInfo.splitName}</Text>
            <Text style={styles.routineDay}>{routineInfo.dayName}</Text>
            {routineInfo.targetMuscles.length > 0 && (
              <View style={styles.routineMuscles}>
                {routineInfo.targetMuscles.map((m: MuscleGroup) => (
                  <View key={m} style={styles.muscleChip}>
                    <Text style={styles.muscleChipText}>{m}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          <Text style={styles.floorHint}>
            {isBoss ? 'A powerful guardian blocks the path...' : '3 quests await beyond the door'}
          </Text>
          <PressableButton
            label={entering ? 'Preparing quests...' : 'Enter the Dungeon ⚔️'}
            size="lg"
            loading={entering}
            style={styles.enterBtn}
            onPress={handleEnter}
          />
        </View>

        {/* Floor Map */}
        <View style={styles.section}>
          <FloorMap currentFloor={currentFloor} sessions={sessions} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, gap: 20, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
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
  doorEmoji: { fontSize: 64 },
  floorLabel: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  bossBadge: {
    backgroundColor: 'rgba(220,38,38,0.2)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.4)',
  },
  bossBadgeText: { color: '#f87171', fontSize: 12, fontWeight: '700' },
  routineInfo: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99,102,241,0.06)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.18)',
  },
  routineSplit: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' },
  routineDay: { fontSize: 16, fontWeight: '700', color: COLORS.gold },
  routineMuscles: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, justifyContent: 'center' },
  muscleChip: { backgroundColor: COLORS.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  muscleChipText: { fontSize: 10, color: COLORS.textMuted, textTransform: 'capitalize' },
  floorHint: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  enterBtn: { width: '100%', marginTop: 6 },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
