/**
 * Stats Screen — compact profile header, XP progression, performance metrics, and lifetime totals.
 */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import XPBar from '@/components/character/XPBar';
import Card from '@/components/ui/Card';
import SectionLabel from '@/components/ui/SectionLabel';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { COLORS, CLASS_DEFINITIONS } from '@/lib/constants';
import type { DungeonSession } from '@/types';

function formatTotalTime(sessions: DungeonSession[]): string {
  const totalMins = sessions.length * 45;
  if (totalMins < 60) return `${totalMins}m`;
  return `${Math.round(totalMins / 60)}h`;
}

export default function StatsScreen() {
  const { profile, character } = useProfileStore();
  const sessions = useHistoryStore((s) => s.sessions);

  if (!profile || !character) return null;

  const classDef = CLASS_DEFINITIONS[character.class];

  // Performance metrics derived from character stats
  const statValues = Object.values(character.stats) as number[];
  const maxStat = Math.max(...statValues, 100);

  const perfMetrics = [
    {
      label: 'Avg Weight',
      value: character.stats.strength,
      pct: Math.min(100, (character.stats.strength / maxStat) * 100),
    },
    {
      label: 'Consistency',
      value: character.stats.vitality,
      pct: Math.min(100, (character.stats.vitality / maxStat) * 100),
    },
    {
      label: 'Frequency',
      value: character.stats.agility,
      pct: Math.min(100, (character.stats.agility / maxStat) * 100),
    },
    {
      label: 'Endurance',
      value: character.stats.endurance,
      pct: Math.min(100, (character.stats.endurance / maxStat) * 100),
    },
  ];

  const xpToNext = character.xpToNextLevel - character.currentXP;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile header */}
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarIcon}>{classDef.icon}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileSub}>Level {character.level} · {character.class}</Text>
          </View>
        </View>

        {/* XP Card */}
        <Card padding={16}>
          <SectionLabel style={styles.sectionLabelNoMargin}>PROGRESS</SectionLabel>
          <XPBar character={character} />
          <View style={styles.xpFooter}>
            <Text style={styles.xpFooterText}>{character.currentXP} XP</Text>
            <Text style={styles.xpFooterText}>Level {character.level + 1} in {xpToNext} XP</Text>
          </View>
        </Card>

        {/* Performance Card */}
        <Card padding={16}>
          <SectionLabel>PERFORMANCE</SectionLabel>
          <View style={styles.perfGrid}>
            {perfMetrics.map((metric) => (
              <View key={metric.label} style={styles.perfRow}>
                <Text style={styles.perfLabel}>{metric.label}</Text>
                <View style={styles.perfBarWrap}>
                  <View style={[styles.perfBarFill, { width: `${metric.pct}%` }]} />
                </View>
                <Text style={styles.perfValue}>{metric.value.toFixed(1)}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Lifetime Card */}
        <Card padding={16}>
          <SectionLabel>ALL TIME</SectionLabel>
          <View style={styles.lifetimeGrid}>
            <View style={styles.lifetimeStat}>
              <Text style={styles.lifetimeValue}>{character.floorsCleared}</Text>
              <Text style={styles.lifetimeLabel}>Workouts</Text>
            </View>
            <View style={styles.lifetimeStat}>
              <Text style={styles.lifetimeValue}>{formatTotalTime(sessions)}</Text>
              <Text style={styles.lifetimeLabel}>Time Trained</Text>
            </View>
            <View style={styles.lifetimeStat}>
              <Text style={styles.lifetimeValue}>{character.totalXPEarned}</Text>
              <Text style={styles.lifetimeLabel}>Total XP</Text>
            </View>
            <View style={styles.lifetimeStat}>
              <Text style={styles.lifetimeValue}>{character.level}</Text>
              <Text style={styles.lifetimeLabel}>Current Level</Text>
            </View>
          </View>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16, gap: 16, paddingBottom: 36 },

  // Profile header
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: { fontSize: 28 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  profileSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },

  // XP card
  sectionLabelNoMargin: { marginBottom: 8 },
  xpFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  xpFooterText: { fontSize: 12, color: COLORS.textMuted },

  // Performance card
  perfGrid: { gap: 14 },
  perfRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  perfLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },
  perfBarWrap: {
    flex: 2,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  perfBarFill: {
    height: 4,
    backgroundColor: COLORS.gold,
    borderRadius: 2,
  },
  perfValue: { width: 50, textAlign: 'right', fontSize: 13, color: COLORS.textMuted },

  // Lifetime card
  lifetimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  lifetimeStat: { width: '48%' },
  lifetimeValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  lifetimeLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
