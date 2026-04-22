/**
 * Muscles Screen — recovery status and zone-based muscle breakdown.
 */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfileStore } from '@/stores/useProfileStore';
import { COLORS, CLASS_DEFINITIONS, FONTS, RADIUS, SPACING } from '@/lib/constants';
import type { MuscleGroup } from '@/types';
import type { MuscleXP } from '@/lib/muscleXP';
import Card from '@/components/ui/Card';
import SectionLabel from '@/components/ui/SectionLabel';
import Badge from '@/components/ui/Badge';

// ─── Zone definitions ────────────────────────────────────────────────────────

interface ZoneConfig {
  id: string;
  label: string;
  muscles: MuscleGroup[];
}

const ZONES: ZoneConfig[] = [
  { id: 'push', label: 'Push', muscles: ['chest', 'shoulders', 'triceps'] },
  { id: 'pull', label: 'Pull', muscles: ['back', 'biceps'] },
  { id: 'legs', label: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { id: 'core', label: 'Core', muscles: ['core'] },
];

const ALL_MUSCLES: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'core', 'quads', 'hamstrings', 'glutes', 'calves',
];

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function zoneAvg(zone: ZoneConfig, muscleXP: MuscleXP): number {
  return avg(zone.muscles.map((m) => muscleXP[m].level));
}

// ─── Recovery status logic ────────────────────────────────────────────────────

function getRecoveryStatus(lastTrained?: string, fatigueScore?: number) {
  if (!lastTrained) return { badge: 'muted' as const, label: 'Not trained', timeAgo: '—' };
  const hoursAgo = (Date.now() - new Date(lastTrained).getTime()) / (1000 * 60 * 60);
  const timeAgo = hoursAgo < 1
    ? `${Math.round(hoursAgo * 60)}m ago`
    : hoursAgo < 24
    ? `${Math.round(hoursAgo)}h ago`
    : `${Math.round(hoursAgo / 24)}d ago`;
  // Recovery window scales with how hard the muscle was worked:
  // fatigueScore 0 → 24h, 5 → 36h, 10 → 48h
  const recoveryHours = 24 + (fatigueScore ?? 5) * 2.4;
  if (hoursAgo < recoveryHours * 0.5) return { badge: 'crimson' as const, label: 'Fatigued', timeAgo };
  if (hoursAgo < recoveryHours) return { badge: 'gold' as const, label: 'Recovering', timeAgo };
  return { badge: 'jade' as const, label: 'Recovered', timeAgo };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MusclesScreen() {
  const { muscleXP, character } = useProfileStore();

  if (!muscleXP || !character) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>Muscles</Text>
        <Text style={styles.subtitle}>RECOVERY · ZONES · RANK</Text>

        {/* Recovery status card */}
        <Card padding={16}>
          <SectionLabel>RECOVERY STATUS</SectionLabel>
          {ALL_MUSCLES.map((muscle, i) => {
            const { badge, label, timeAgo } = getRecoveryStatus(muscleXP[muscle]?.lastTrained, muscleXP[muscle]?.lastFatigueScore);
            const isLast = i === ALL_MUSCLES.length - 1;
            return (
              <View
                key={muscle}
                style={[
                  styles.recoveryRow,
                  !isLast && styles.recoveryRowBorder,
                ]}
              >
                <Text style={styles.muscleName}>
                  {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                </Text>
                <Badge variant={badge} label={label} />
                <Text style={styles.timeAgo}>{timeAgo}</Text>
              </View>
            );
          })}
        </Card>

        {/* Zone breakdown */}
        <View style={styles.zonesSection}>
          <SectionLabel style={styles.zonesLabel}>ZONES</SectionLabel>
          <View style={styles.zonesGap}>
            {ZONES.map((zone) => {
              const za = zoneAvg(zone, muscleXP);
              const barFill = Math.min(100, (za / 20) * 100);
              return (
                <Card key={zone.id} padding={16}>
                  {/* Zone header */}
                  <View style={styles.zoneHeader}>
                    <Text style={styles.zoneLabel}>{zone.label}</Text>
                    <Text style={styles.zoneAvg}>{za.toFixed(1)}</Text>
                  </View>
                  {/* Thin progress bar */}
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${barFill}%` as any }]} />
                  </View>
                  {/* Per-muscle rows */}
                  <View style={styles.muscleRows}>
                    {zone.muscles.map((muscle) => (
                      <View key={muscle} style={styles.muscleLevelRow}>
                        <Text style={styles.muscleLevelName}>
                          {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                        </Text>
                        <Text style={styles.muscleLevelValue}>
                          Lv.{muscleXP[muscle].level}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.screen, gap: SPACING.gap, paddingBottom: 36 },

  title: { fontSize: 28, fontFamily: FONTS.displayBold, color: COLORS.text, letterSpacing: 0.5 },
  subtitle: { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.violetLight, letterSpacing: 2.5, marginTop: -6 },

  // Recovery card rows
  recoveryRow: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recoveryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  muscleName: { flex: 1, fontSize: 13, fontFamily: FONTS.sansBold, color: COLORS.text, letterSpacing: 0.3 },
  timeAgo: {
    fontSize: 10,
    fontFamily: FONTS.mono,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginLeft: 8,
    minWidth: 72,
    letterSpacing: 0.3,
  },

  // Zone section
  zonesSection: { gap: 0 },
  zonesLabel: { marginBottom: 12 },
  zonesGap: { gap: 12 },

  // Zone card internals
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  zoneLabel: { fontSize: 15, fontFamily: FONTS.displayBold, color: COLORS.text, letterSpacing: 0.5 },
  zoneAvg: { fontSize: 14, fontFamily: FONTS.mono, color: COLORS.gold, letterSpacing: 0.5 },

  progressBg: {
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 2,
  },

  muscleRows: { gap: 6 },
  muscleLevelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muscleLevelName: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textSecondary },
  muscleLevelValue: { fontSize: 11, fontFamily: FONTS.mono, color: COLORS.gold, letterSpacing: 0.5 },
});
