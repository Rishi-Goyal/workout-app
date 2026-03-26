/**
 * Stats Screen — character identity, XP progression, and combat stats.
 */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import XPBar from '@/components/character/XPBar';
import AnimatedBar from '@/components/ui/AnimatedBar';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { COLORS, CLASS_DEFINITIONS } from '@/lib/constants';
import { maxStatValue } from '@/lib/character';

const STAT_CONFIG: {
  key: 'strength' | 'endurance' | 'agility' | 'vitality';
  label: string;
  icon: string;
  color: string;
}[] = [
  { key: 'strength',  label: 'Strength',  icon: '⚔️', color: '#ef4444' },
  { key: 'endurance', label: 'Endurance', icon: '🔥', color: '#f97316' },
  { key: 'agility',   label: 'Agility',   icon: '💨', color: '#06b6d4' },
  { key: 'vitality',  label: 'Vitality',  icon: '🛡️', color: '#10b981' },
];

export default function StatsScreen() {
  const { profile, character } = useProfileStore();
  const sessions = useHistoryStore((s) => s.sessions);

  if (!profile || !character) return null;

  const classDef = CLASS_DEFINITIONS[character.class];
  const completed = sessions.filter((s) => s.status === 'completed').length;
  const totalXP = sessions.reduce((sum, s) => sum + s.totalXPEarned, 0);
  const maxStat = maxStatValue(character.level);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Class hero block */}
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.heroCard, { borderColor: `${classDef.color}44` }]}>
          <Text style={styles.heroIcon}>{classDef.icon}</Text>
          <View style={styles.heroText}>
            <Text style={[styles.heroClass, { color: classDef.color }]}>{character.class}</Text>
            <Text style={styles.heroName}>{profile.name}</Text>
            <Text style={styles.heroTagline}>{classDef.tagline}</Text>
          </View>
        </Animated.View>

        {/* Class lore */}
        <Animated.View entering={FadeInDown.duration(300).delay(60)} style={styles.loreCard}>
          <Text style={styles.loreText}>{classDef.description}</Text>
        </Animated.View>

        {/* Level & XP */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)} style={styles.card}>
          <Text style={styles.sectionLabel}>PROGRESSION</Text>
          <XPBar character={character} />
        </Animated.View>

        {/* Combat stats */}
        <Animated.View entering={FadeInDown.duration(300).delay(140)} style={styles.card}>
          <Text style={styles.sectionLabel}>COMBAT STATS</Text>
          <View style={styles.statsGrid}>
            {STAT_CONFIG.map((stat) => {
              const value = character.stats[stat.key];
              const pct = Math.min(100, (value / maxStat) * 100);
              return (
                <View key={stat.key} style={styles.statRow}>
                  <View style={styles.statLeft}>
                    <Text style={styles.statIcon}>{stat.icon}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                  <View style={styles.statBarWrap}>
                    <AnimatedBar value={pct} color={stat.color} height={6} />
                  </View>
                  <Text style={[styles.statValue, { color: stat.color }]}>{value.toFixed(1)}</Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Lifetime totals */}
        <Animated.View entering={FadeInDown.duration(300).delay(180)} style={styles.totalsRow}>
          <View style={styles.totalBox}>
            <Text style={styles.totalNum}>{character.floorsCleared}</Text>
            <Text style={styles.totalLbl}>Floors</Text>
          </View>
          <View style={[styles.totalBox, styles.totalBoxMid]}>
            <Text style={styles.totalNum}>{completed}</Text>
            <Text style={styles.totalLbl}>Sessions</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalNum}>{totalXP}</Text>
            <Text style={styles.totalLbl}>Total XP</Text>
          </View>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, gap: 14, paddingBottom: 36 },

  // Hero card
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
  },
  heroIcon: { fontSize: 52 },
  heroText: { flex: 1, gap: 3 },
  heroClass: { fontSize: 22, fontWeight: '800' },
  heroName: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  heroTagline: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 2 },

  // Lore
  loreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loreText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20 },

  // Generic card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 2,
  },

  // Stat rows
  statsGrid: { gap: 10 },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 100 },
  statIcon: { fontSize: 14 },
  statLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  statBarWrap: { flex: 1 },
  statValue: { fontSize: 13, fontWeight: '700', width: 36, textAlign: 'right' },

  // Totals row
  totalsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 16,
  },
  totalBox: { flex: 1, alignItems: 'center' },
  totalBoxMid: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  totalNum: { fontSize: 22, fontWeight: '800', color: COLORS.gold },
  totalLbl: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
