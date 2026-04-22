import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import XPBar from '@/components/character/XPBar';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { COLORS, CLASS_DEFINITIONS, RADIUS, SPACING } from '@/lib/constants';
import type { MuscleGroup } from '@/types';
import Card from '@/components/ui/Card';
import SectionLabel from '@/components/ui/SectionLabel';

const ALL_MUSCLES: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'core', 'quads', 'hamstrings', 'glutes', 'calves',
];

export default function CharacterScreen() {
  const { profile, character, muscleXP } = useProfileStore();
  const sessions = useHistoryStore((s) => s.sessions);

  if (!profile || !character) return null;

  const classDef = CLASS_DEFINITIONS[character.class];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>Profile</Text>

        {/* Identity Card */}
        <Card padding={20}>
          <View style={styles.identityCenter}>
            <View style={styles.classIconCircle}>
              <Text style={styles.classIconEmoji}>{classDef.icon}</Text>
            </View>
            <Text style={styles.characterName}>{profile.name}</Text>
            <Text style={styles.classLine}>
              {classDef.icon} {character.class}  ·  Level {character.level}
            </Text>
          </View>
          <View style={styles.xpBarWrapper}>
            <XPBar character={character} />
          </View>
        </Card>

        {/* Key Stats Card */}
        <Card padding={16}>
          <SectionLabel>STATS</SectionLabel>
          <View style={styles.statsGrid}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{character.floorsCleared}</Text>
              <Text style={styles.statLabel}>Floors</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{character.level}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{character.totalXPEarned}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{sessions.length}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
          </View>
        </Card>

        {/* Muscle Levels Card */}
        <Card padding={16}>
          <SectionLabel>MUSCLE LEVELS</SectionLabel>
          <View style={styles.muscleLevelsGrid}>
            {ALL_MUSCLES.map((muscle) => (
              <View key={muscle} style={styles.muscleItem}>
                <Text style={styles.muscleItemName}>
                  {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                </Text>
                <Text style={styles.muscleItemLevel}>
                  Lv.{muscleXP[muscle]?.level ?? 1}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Class Lore Card */}
        <Card padding={16}>
          <View style={styles.loreHeader}>
            <Text style={styles.loreIcon}>{classDef.icon}</Text>
            <Text style={[styles.loreName, { color: classDef.color }]}>{character.class}</Text>
          </View>
          <Text style={styles.loreTagline}>{classDef.tagline}</Text>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.screen, gap: SPACING.gap, paddingBottom: 36 },

  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },

  // Identity card
  identityCenter: { alignItems: 'center' },
  classIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceAccent,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classIconEmoji: { fontSize: 28 },
  characterName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  classLine: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  xpBarWrapper: { marginTop: 16 },

  // Stats grid (2×2)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBlock: {
    width: '48%',
    backgroundColor: COLORS.surfaceAccent,
    borderRadius: RADIUS.sm,
    padding: 12,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // Muscle levels grid (2-column)
  muscleLevelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleItem: {
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  muscleItemName: { fontSize: 13, color: COLORS.textSecondary },
  muscleItemLevel: { fontSize: 13, color: COLORS.gold, fontWeight: '700' },

  // Class lore card
  loreHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loreIcon: { fontSize: 20 },
  loreName: { fontSize: 14, fontWeight: '600' },
  loreTagline: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
