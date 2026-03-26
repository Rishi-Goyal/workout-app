/**
 * Muscles Screen — zone-based muscle XP overview and per-muscle breakdown.
 */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useProfileStore } from '@/stores/useProfileStore';
import { COLORS, CLASS_DEFINITIONS } from '@/lib/constants';
import { muscleLevelTitle, muscleXPProgress } from '@/lib/muscleXP';
import type { MuscleGroup } from '@/types';
import type { MuscleXP } from '@/lib/muscleXP';

// ─── Zone definitions ────────────────────────────────────────────────────────

interface ZoneConfig {
  id: string;
  label: string;
  muscles: MuscleGroup[];
  color: string;
  icon: string;
}

const ZONES: ZoneConfig[] = [
  {
    id: 'push',
    label: 'Push',
    muscles: ['chest', 'shoulders', 'triceps'],
    color: '#6366f1',
    icon: '🤜',
  },
  {
    id: 'pull',
    label: 'Pull',
    muscles: ['back', 'biceps'],
    color: '#8b5cf6',
    icon: '🤛',
  },
  {
    id: 'legs',
    label: 'Legs',
    muscles: ['quads', 'hamstrings', 'glutes', 'calves'],
    color: '#f97316',
    icon: '🦵',
  },
  {
    id: 'core',
    label: 'Core',
    muscles: ['core'],
    color: '#14b8a6',
    icon: '🏯',
  },
];

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  core: 'Core',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
};

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function zoneAvg(zone: ZoneConfig, muscleXP: MuscleXP): number {
  return avg(zone.muscles.map((m) => muscleXP[m].level));
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MusclesScreen() {
  const { muscleXP, character } = useProfileStore();

  if (!muscleXP || !character) return null;

  const zoneAverages = ZONES.map((z) => ({ ...z, avg: zoneAvg(z, muscleXP) }));
  const maxZoneAvg = Math.max(...zoneAverages.map((z) => z.avg));
  const classDef = CLASS_DEFINITIONS[character.class];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Animated.View entering={FadeInDown.duration(300)}>
          <Text style={styles.title}>Muscle Atlas</Text>
          <Text style={styles.subtitle}>Your training balance across muscle zones.</Text>
        </Animated.View>

        {/* Zone overview */}
        <Animated.View entering={FadeInDown.duration(300).delay(60)} style={styles.zonesCard}>
          <Text style={styles.sectionLabel}>ZONE AVERAGES</Text>
          {zoneAverages.map((zone, i) => {
            const isMax = zone.avg === maxZoneAvg;
            const barWidth = maxZoneAvg > 0 ? (zone.avg / maxZoneAvg) * 100 : 0;
            return (
              <Animated.View
                key={zone.id}
                entering={FadeInDown.duration(250).delay(80 + i * 50)}
                style={styles.zoneRow}
              >
                <View style={styles.zoneLeft}>
                  <Text style={styles.zoneIcon}>{zone.icon}</Text>
                  <Text style={[styles.zoneLabel, isMax && { color: zone.color }]}>
                    {zone.label}
                  </Text>
                  {isMax && (
                    <View style={[styles.dominantBadge, { backgroundColor: `${zone.color}22`, borderColor: `${zone.color}55` }]}>
                      <Text style={[styles.dominantText, { color: zone.color }]}>dominant</Text>
                    </View>
                  )}
                </View>
                <View style={styles.zoneRight}>
                  <View style={styles.zoneBarBg}>
                    <View style={[styles.zoneBarFill, { width: `${barWidth}%`, backgroundColor: zone.color }]} />
                  </View>
                  <Text style={[styles.zoneAvgNum, { color: zone.color }]}>
                    {zone.avg.toFixed(1)}
                  </Text>
                </View>
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Class driven by zones */}
        <Animated.View entering={FadeInDown.duration(300).delay(160)} style={styles.classCard}>
          <Text style={styles.classIcon}>{classDef.icon}</Text>
          <View style={styles.classTextBlock}>
            <Text style={[styles.className, { color: classDef.color }]}>{character.class}</Text>
            <Text style={styles.classTagline}>{classDef.tagline}</Text>
          </View>
        </Animated.View>

        {/* Per-zone muscle breakdown */}
        {ZONES.map((zone, zi) => (
          <Animated.View
            key={zone.id}
            entering={FadeInDown.duration(300).delay(220 + zi * 60)}
            style={styles.muscleCard}
          >
            <View style={styles.muscleCardHeader}>
              <Text style={styles.zoneIcon}>{zone.icon}</Text>
              <Text style={[styles.muscleCardTitle, { color: zone.color }]}>{zone.label}</Text>
            </View>

            {zone.muscles.map((muscle) => {
              const data = muscleXP[muscle];
              const progress = muscleXPProgress(data);
              return (
                <View key={muscle} style={styles.muscleItem}>
                  <View style={styles.muscleNameRow}>
                    <Text style={styles.muscleName}>{MUSCLE_LABELS[muscle]}</Text>
                    <View style={styles.muscleMetaRight}>
                      <Text style={styles.muscleTier}>{muscleLevelTitle(data.level)}</Text>
                      <Text style={[styles.muscleLevel, { color: zone.color }]}>Lv.{data.level}</Text>
                    </View>
                  </View>
                  <View style={styles.muscleBarBg}>
                    <View
                      style={[styles.muscleBarFill, { width: `${progress}%`, backgroundColor: zone.color }]}
                    />
                  </View>
                </View>
              );
            })}
          </Animated.View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, gap: 14, paddingBottom: 36 },

  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginBottom: 4,
  },

  // Zones overview card
  zonesCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  zoneLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 110 },
  zoneIcon: { fontSize: 16 },
  zoneLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  dominantBadge: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  dominantText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  zoneRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  zoneBarFill: { height: '100%', borderRadius: 3 },
  zoneAvgNum: { fontSize: 13, fontWeight: '700', width: 32, textAlign: 'right' },

  // Class card
  classCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  classIcon: { fontSize: 28 },
  classTextBlock: { flex: 1 },
  className: { fontSize: 16, fontWeight: '800' },
  classTagline: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontStyle: 'italic' },

  // Per-muscle cards
  muscleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  muscleCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  muscleCardTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  muscleItem: { gap: 4 },
  muscleNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muscleName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  muscleMetaRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  muscleTier: { fontSize: 10, color: COLORS.textMuted },
  muscleLevel: { fontSize: 12, fontWeight: '700', minWidth: 36, textAlign: 'right' },
  muscleBarBg: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  muscleBarFill: { height: '100%', borderRadius: 2 },
});
