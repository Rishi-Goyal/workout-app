/**
 * Muscles Screen — recovery status and zone-based muscle breakdown.
 */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfileStore } from '@/stores/useProfileStore';
import { COLORS, CLASS_DEFINITIONS, RADIUS, SPACING } from '@/lib/constants';
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

/**
 * Since `lastTrained` is not stored on MuscleXP, we use xp > 0 as a proxy for
 * "has been trained at some point." Without a timestamp we cannot determine
 * Fatigued vs. Ready, so xp > 0 maps to Recovered (best available signal).
 */
function getRecoveryStatus(hasTrained: boolean): {
  badge: 'jade' | 'crimson' | 'gold';
  label: string;
  timeAgo: string;
} {
  if (!hasTrained) return { badge: 'jade', label: 'Recovered', timeAgo: '—' };
  // No timestamp available — cannot distinguish Fatigued/Ready/Recovered
  return { badge: 'jade', label: 'Recovered', timeAgo: '—' };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MusclesScreen() {
  const { muscleXP, character } = useProfileStore();

  if (!muscleXP || !character) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>Muscles</Text>

        {/* Recovery status card */}
        <Card padding={16}>
          <SectionLabel>RECOVERY STATUS</SectionLabel>
          {ALL_MUSCLES.map((muscle, i) => {
            const hasTrained = (muscleXP[muscle]?.xp ?? 0) > 0;
            const { badge, label, timeAgo } = getRecoveryStatus(hasTrained);
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

  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },

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
  muscleName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  timeAgo: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginLeft: 8,
    minWidth: 72,
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
  zoneLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  zoneAvg: { fontSize: 14, color: COLORS.gold },

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
  muscleLevelName: { fontSize: 12, color: COLORS.textSecondary },
  muscleLevelValue: { fontSize: 12, color: COLORS.gold },
});
