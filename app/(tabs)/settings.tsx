import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Card from '@/components/ui/Card';
import SectionLabel from '@/components/ui/SectionLabel';
import PressableButton from '@/components/ui/PressableButton';
import MuscleStrengthSliders from '@/components/setup/MuscleStrengthSliders';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useAdaptationStore } from '@/stores/useAdaptationStore';
import { useWeeklyGoalStore } from '@/stores/useWeeklyGoalStore';
import { WORKOUT_SPLITS, type WorkoutSplitType } from '@/lib/exerciseDatabase';
import { COLORS, RADIUS, SPACING } from '@/lib/constants';

// ─── Split picker data ──────────────────────────────────────────────────────

const SPLIT_OPTIONS: { key: WorkoutSplitType | 'auto'; label: string }[] = [
  { key: 'auto', label: 'Auto' },
  { key: 'push_pull_legs', label: 'Push / Pull / Legs' },
  { key: 'upper_lower', label: 'Upper / Lower' },
  { key: 'full_body', label: 'Full Body' },
  { key: 'bro_split', label: 'Bro Split' },
  { key: 'strength_5x5', label: 'Strength 5x5' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const preferredSplit = useProfileStore((s) => s.preferredSplit);
  const setPreferredSplit = useProfileStore((s) => s.setPreferredSplit);
  const updateMuscleStrength = useProfileStore((s) => s.updateMuscleStrength);
  const resetProfile = useProfileStore((s) => s.resetProfile);
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const clearAllAdaptations = useAdaptationStore((s) => s.clearAllAdaptations);
  const target = useWeeklyGoalStore((s) => s.settings.targetWorkoutsPerWeek);
  const setWeeklyTarget = useWeeklyGoalStore((s) => s.setWeeklyTarget);

  const [strengthsExpanded, setStrengthsExpanded] = useState(false);

  if (!profile) return null;

  const activeSplit = preferredSplit ?? 'auto';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>Settings</Text>

        {/* ── WEEKLY GOAL ──────────────────────────────────────────── */}
        <Card padding={16}>
          <SectionLabel>WEEKLY GOAL</SectionLabel>
          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Workouts per week</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setWeeklyTarget(target - 1)}
                disabled={target <= 1}
                style={({ pressed }) => [
                  styles.stepperBtn,
                  (pressed || target <= 1) && styles.stepperBtnDisabled,
                ]}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{target}</Text>
              <Pressable
                onPress={() => setWeeklyTarget(target + 1)}
                disabled={target >= 7}
                style={({ pressed }) => [
                  styles.stepperBtn,
                  (pressed || target >= 7) && styles.stepperBtnDisabled,
                ]}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        </Card>

        {/* ── TRAINING ─────────────────────────────────────────────── */}
        <Card padding={16}>
          <SectionLabel>TRAINING</SectionLabel>

          {/* Split Picker */}
          <Text style={styles.fieldLabel}>Workout Split</Text>
          <Text style={styles.fieldHint}>
            Auto cycles splits based on your goal. Pick one to always use that split.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.splitRow}
          >
            {SPLIT_OPTIONS.map(({ key, label }) => {
              const active = key === activeSplit;
              return (
                <Pressable
                  key={key}
                  onPress={() => setPreferredSplit(key === 'auto' ? null : key)}
                  style={[styles.splitChip, active && styles.splitChipActive]}
                >
                  <Text style={[styles.splitChipText, active && styles.splitChipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {activeSplit !== 'auto' && (
            <Text style={styles.splitDescription}>
              {WORKOUT_SPLITS[activeSplit as WorkoutSplitType].description}
            </Text>
          )}

          {/* Muscle Strengths */}
          <View style={styles.strengthSection}>
            <Pressable
              onPress={() => setStrengthsExpanded(!strengthsExpanded)}
              style={styles.strengthToggle}
            >
              <Text style={styles.fieldLabel}>Muscle Strength Levels</Text>
              <Text style={styles.chevron}>{strengthsExpanded ? '▲' : '▼'}</Text>
            </Pressable>
            <Text style={styles.fieldHint}>
              Adjust how strong you are in each muscle group (1–10).
            </Text>
            {strengthsExpanded && (
              <View style={styles.slidersWrapper}>
                <MuscleStrengthSliders
                  values={profile.muscleStrengths}
                  onChange={updateMuscleStrength}
                />
              </View>
            )}
          </View>
        </Card>

        {/* ── DANGER ZONE ──────────────────────────────────────────── */}
        <Card padding={16} style={styles.dangerCard}>
          <SectionLabel style={{ color: COLORS.crimson }}>DANGER ZONE</SectionLabel>

          <PressableButton
            label="Reset Workout Progression"
            variant="ghost"
            style={styles.dangerBtn}
            onPress={() =>
              Alert.alert(
                'Reset Progression?',
                'This resets all progressive overload targets. Your next workouts will start from baseline weights.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: clearAllAdaptations,
                  },
                ],
              )
            }
          />

          <PressableButton
            label="Clear Workout History"
            variant="ghost"
            style={styles.dangerBtn}
            onPress={() =>
              Alert.alert(
                'Clear History?',
                'This permanently deletes all session records. Your streak and XP are unaffected.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: clearHistory,
                  },
                ],
              )
            }
          />

          <PressableButton
            label="Reset Everything"
            variant="danger"
            onPress={() =>
              Alert.alert(
                'Reset Everything?',
                'This wipes your profile, character, history, and all progress. You will restart onboarding.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset Everything',
                    style: 'destructive',
                    onPress: () => {
                      resetProfile();
                      router.replace('/setup');
                    },
                  },
                ],
              )
            }
          />
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.screen, gap: SPACING.gap, paddingBottom: 36 },

  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },

  // Weekly goal stepper
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperLabel: { fontSize: 14, color: COLORS.textSecondary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAccent,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.3 },
  stepperBtnText: { fontSize: 18, color: COLORS.text, fontWeight: '700' },
  stepperValue: { fontSize: 20, fontWeight: '700', color: COLORS.gold, minWidth: 24, textAlign: 'center' },

  // Training section
  fieldLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  fieldHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, marginBottom: 10 },

  splitRow: { gap: 8, paddingVertical: 4 },
  splitChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  splitChipActive: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.gold + '1a', // 10% opacity
  },
  splitChipText: { fontSize: 13, color: COLORS.textSecondary },
  splitChipTextActive: { color: COLORS.gold, fontWeight: '600' },

  splitDescription: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 10,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Strength sliders
  strengthSection: { marginTop: 20 },
  strengthToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chevron: { fontSize: 12, color: COLORS.textMuted },
  slidersWrapper: { marginTop: 12 },

  // Danger zone
  dangerCard: { borderColor: COLORS.crimson + '33' },
  dangerBtn: {
    borderColor: COLORS.crimson + '66',
    borderWidth: 1,
    marginBottom: 10,
  },
});
