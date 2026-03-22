import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import CharacterPanel from '@/components/character/CharacterPanel';
import FloorMap from '@/components/dungeon/FloorMap';
import PressableButton from '@/components/ui/PressableButton';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { fetchQuests } from '@/lib/openai';
import { COLORS } from '@/lib/constants';

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

export default function HomeScreen() {
  const { profile, character } = useProfileStore();
  const sessions = useHistoryStore((s) => s.sessions);
  const getRecent = useHistoryStore((s) => s.getRecentSessions);
  const { startSession, setLoading, setError, isLoading } = useSessionStore();
  const [entering, setEntering] = useState(false);

  if (!profile || !character) return null;

  const currentFloor = character.floorsCleared + 1;
  const isBoss = currentFloor % 5 === 0 && currentFloor > 0;

  const handleEnter = async () => {
    setEntering(true);
    setLoading(true);
    setError(null);
    try {
      const result = await fetchQuests(
        { profile, character, recentSessions: getRecent(3), currentFloor },
        OPENAI_KEY
      );
      startSession(currentFloor, result.quests);
      router.push('/(tabs)/dungeon');
    } catch (e) {
      Alert.alert('Could not reach the dungeon', 'Check your connection and try again.');
      setError('Failed to fetch quests');
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
        <CharacterPanel character={character} profile={profile} />

        {/* Dungeon Entrance */}
        <View style={[styles.entranceCard, isBoss && styles.bossCard]}>
          <Text style={styles.doorEmoji}>{isBoss ? '🔴' : '🚪'}</Text>
          <Text style={styles.floorLabel}>Floor {currentFloor}</Text>
          {isBoss && (
            <View style={styles.bossBadge}>
              <Text style={styles.bossBadgeText}>⚠️  BOSS FLOOR</Text>
            </View>
          )}
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
