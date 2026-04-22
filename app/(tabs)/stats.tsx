/**
 * Stats Screen — compact profile header, XP progression, performance metrics, and lifetime totals.
 */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import XPBar from '@/components/character/XPBar';
import ClassIcon from '@/components/character/ClassIcon';
import { classRank } from '@/lib/character';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import SectionLabel from '@/components/ui/SectionLabel';
import PressableButton from '@/components/ui/PressableButton';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { daysSince } from '@/lib/dateUtils';
import { COLORS, CLASS_DEFINITIONS, FONTS } from '@/lib/constants';
import type { DungeonSession } from '@/types';

function formatTotalTime(sessions: DungeonSession[]): string {
  const totalMins = sessions.length * 45;
  if (totalMins < 60) return `${totalMins}m`;
  return `${Math.round(totalMins / 60)}h`;
}

export default function StatsScreen() {
  const { profile, character, muscleXP } = useProfileStore();
  const sessions = useHistoryStore((s) => s.sessions);
  const activeSession = useSessionStore((s) => s.activeSession);

  if (!profile || !character) return null;

  const classDef = CLASS_DEFINITIONS[character.class];
  const rank = classRank(character, muscleXP);
  const daysSinceLast = sessions.length > 0 ? daysSince(sessions[0].startedAt) : null;

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
            <ClassIcon name={character.class} size={40} color={COLORS.gold} strokeWidth={2} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <View style={styles.profileMeta}>
              <Text style={styles.profileSub}>LV.{character.level}</Text>
              <Text style={styles.profileSubDim}>·</Text>
              <Text style={styles.profileSub}>{character.class.toUpperCase()}</Text>
              <Badge label={`RANK ${rank}`} variant="gold" />
            </View>
            {/* Inactivity pill — shown when last workout was more than 3 days ago */}
            {daysSinceLast !== null && daysSinceLast > 3 && (
              <View style={[
                styles.inactivePill,
                daysSinceLast >= 7 && styles.inactivePillRed,
              ]}>
                <Text style={[
                  styles.inactivePillText,
                  daysSinceLast >= 7 && styles.inactivePillTextRed,
                ]}>
                  Last workout {daysSinceLast}d ago
                </Text>
              </View>
            )}
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

        {/* First-workout nudge — only shown until the user completes their first session */}
        {sessions.length === 0 && !activeSession && (
          <Card padding={20} style={styles.nudgeCard}>
            <View style={styles.nudgeRow}>
              <Text style={styles.nudgeIcon}>⚔️</Text>
              <View style={styles.nudgeText}>
                <Text style={styles.nudgeTitle}>Your stats await</Text>
                <Text style={styles.nudgeSub}>
                  Complete a workout to start tracking your performance and progress.
                </Text>
              </View>
            </View>
            <PressableButton
              label="⚔️ Begin Your First Quest"
              size="md"
              style={styles.nudgeCta}
              onPress={() => router.replace('/(tabs)')}
            />
          </Card>
        )}

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
              <Text style={styles.lifetimeLabel}>Floors</Text>
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
    width: 64,
    height: 64,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarIcon: { fontSize: 32 },
  profileInfo: { flex: 1, gap: 6 },
  profileName: { fontSize: 22, fontFamily: FONTS.displayBold, color: COLORS.text, letterSpacing: 0.5 },
  profileMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  profileSub:  { fontSize: 11, fontFamily: FONTS.sansBold, color: COLORS.violetLight, letterSpacing: 1.5 },
  profileSubDim: { fontSize: 11, color: COLORS.textMuted },

  // Inactivity pill
  inactivePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  inactivePillRed: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.25)',
  },
  inactivePillText:    { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.orange, letterSpacing: 0.5 },
  inactivePillTextRed: { color: COLORS.crimson },

  // First-workout nudge card
  nudgeCard: { borderColor: 'rgba(59,130,246,0.2)' },
  nudgeRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  nudgeIcon: { fontSize: 28, marginTop: 2 },
  nudgeText: { flex: 1, gap: 4 },
  nudgeTitle:{ fontSize: 15, fontFamily: FONTS.displayBold, color: COLORS.text, letterSpacing: 0.3 },
  nudgeSub:  { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textSecondary },
  nudgeCta:  { alignSelf: 'stretch' },

  // XP card
  sectionLabelNoMargin: { marginBottom: 8 },
  xpFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  xpFooterText: { fontSize: 11, fontFamily: FONTS.mono, color: COLORS.textMuted, letterSpacing: 0.3 },

  // Performance card
  perfGrid: { gap: 14 },
  perfRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  perfLabel: { flex: 1, fontSize: 12, fontFamily: FONTS.sansBold, color: COLORS.text, letterSpacing: 0.3 },
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
  perfValue: { width: 50, textAlign: 'right', fontSize: 12, fontFamily: FONTS.mono, color: COLORS.textSecondary, letterSpacing: 0.3 },

  // Lifetime card
  lifetimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  lifetimeStat: { width: '48%' },
  lifetimeValue: { fontSize: 24, fontFamily: FONTS.displayBold, color: COLORS.gold, letterSpacing: 0.3 },
  lifetimeLabel: { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.textMuted, letterSpacing: 1.5, marginTop: 2, textTransform: 'uppercase' },
});
