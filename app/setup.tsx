import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Pressable, TouchableOpacity, BackHandler,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GoalSelector from '@/components/setup/GoalSelector';
import EquipmentPicker from '@/components/setup/EquipmentPicker';
import MuscleStrengthSliders from '@/components/setup/MuscleStrengthSliders';
import PressableButton from '@/components/ui/PressableButton';
import { useProfileStore } from '@/stores/useProfileStore';
import { MUSCLE_GROUPS, COLORS } from '@/lib/constants';
import type { FitnessGoal, Equipment, MuscleGroup, MuscleStrengths } from '@/types';

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { label: 'Name',      desc: 'Who are you, adventurer?' },
  { label: 'Body',      desc: 'Your body stats' },
  { label: 'Goal',      desc: 'What is your quest?' },
  { label: 'Equipment', desc: 'Your arsenal' },
  { label: 'Strength',  desc: 'Rate your muscles' },
];

const defaultStrengths = (): MuscleStrengths =>
  Object.fromEntries(MUSCLE_GROUPS.map((m) => [m.value, 5])) as MuscleStrengths;

export default function SetupScreen() {
  const setProfile = useProfileStore((s) => s.setProfile);

  const [step, setStep]         = useState<Step>(1);
  const [name, setName]         = useState('');
  const [bodyWeightStr, setBodyWeightStr] = useState('');
  const [weightUnit, setWeightUnit]       = useState<'kg' | 'lbs'>('kg');
  const [goal, setGoal]         = useState<FitnessGoal | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>(['bodyweight_only']);
  const [strengths, setStrengths] = useState<MuscleStrengths>(defaultStrengths());

  const updateStrength = (m: MuscleGroup, v: number) => setStrengths((p) => ({ ...p, [m]: v }));

  // Intercept Android hardware back: step backwards through the wizard instead
  // of exiting the app (which is the default behaviour on the root screen).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 1) {
        setStep((s) => (s - 1) as Step);
        return true; // consumed — don't bubble to OS
      }
      return false; // let OS handle (exit app on step 1)
    });
    return () => sub.remove();
  }, [step]);

  const canProceed =
    (step === 1 && name.trim().length >= 2) ||
    (step === 2) || // bodyWeight is optional — can skip
    (step === 3 && !!goal) ||
    step === 4 ||
    step === 5;

  const handleNext = () => {
    if (step < 5) return setStep((s) => (s + 1) as Step);

    // Parse bodyWeight — convert lbs → kg if needed, fall back to undefined if blank
    let bodyWeightKg: number | undefined;
    const parsed = parseFloat(bodyWeightStr);
    if (!isNaN(parsed) && parsed > 0) {
      bodyWeightKg = weightUnit === 'lbs' ? Math.round(parsed / 2.2046 * 10) / 10 : parsed;
    }

    setProfile({
      name: name.trim(),
      goal: goal!,
      equipment,
      muscleStrengths: strengths,
      createdAt: new Date().toISOString(),
      ...(bodyWeightKg !== undefined && { bodyWeight: bodyWeightKg }),
      weightUnit,
    });
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={styles.header}>
            <Text style={styles.logo}>⚔️ DungeonFit</Text>
            <Text style={styles.tagline}>Your workout adventure begins</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressRow}>
            {STEPS.map((s, i) => {
              const n = (i + 1) as Step;
              return (
                <View key={n} style={styles.stepItem}>
                  <View style={[styles.stepBar, step > n && styles.stepDone, step === n && styles.stepActive]} />
                  <Text style={[styles.stepLabel, step === n && { color: COLORS.gold }]}>{s.label}</Text>
                </View>
              );
            })}
          </View>

          {/* Step heading */}
          <Text style={styles.stepDesc}>{STEPS[step - 1].desc}</Text>

          {/* Step 1 — Name */}
          {step === 1 && (
            <View style={styles.inputWrap}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Ironclad Rishi"
                placeholderTextColor={COLORS.textMuted}
                maxLength={30}
                style={styles.input}
              />
            </View>
          )}

          {/* Step 2 — Body stats (bodyweight + unit) */}
          {step === 2 && (
            <View style={styles.bodyStepWrap}>
              <Text style={styles.hint}>
                Used to suggest weights and track strength ratios. You can always skip this.
              </Text>

              {/* Unit toggle */}
              <View style={styles.unitRow}>
                <TouchableOpacity
                  style={[styles.unitBtn, weightUnit === 'kg' && styles.unitBtnActive]}
                  onPress={() => setWeightUnit('kg')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.unitBtnText, weightUnit === 'kg' && { color: COLORS.gold }]}>kg</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitBtn, weightUnit === 'lbs' && styles.unitBtnActive]}
                  onPress={() => setWeightUnit('lbs')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.unitBtnText, weightUnit === 'lbs' && { color: COLORS.gold }]}>lbs</Text>
                </TouchableOpacity>
              </View>

              {/* Weight input */}
              <View style={styles.weightRow}>
                <TextInput
                  value={bodyWeightStr}
                  onChangeText={setBodyWeightStr}
                  placeholder={weightUnit === 'kg' ? '75' : '165'}
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={6}
                  style={[styles.input, styles.weightInput]}
                />
                <View style={styles.weightUnitLabel}>
                  <Text style={styles.weightUnitText}>{weightUnit}</Text>
                </View>
              </View>

              <Text style={styles.skipHint}>Tap Continue → to skip</Text>
            </View>
          )}

          {step === 3 && <GoalSelector value={goal} onChange={setGoal} />}

          {step === 4 && (
            <View style={{ gap: 8 }}>
              <Text style={styles.hint}>Select all equipment you have access to</Text>
              <EquipmentPicker selected={equipment} onChange={setEquipment} />
            </View>
          )}

          {step === 5 && (
            <View style={{ gap: 8 }}>
              <Text style={styles.hint}>Rate your strength in each muscle group (1 = beginner, 10 = elite)</Text>
              <MuscleStrengthSliders values={strengths} onChange={updateStrength} />
            </View>
          )}

          {/* Navigation */}
          <View style={styles.navRow}>
            {step > 1 && (
              <PressableButton
                label="← Back"
                variant="ghost"
                size="lg"
                style={{ flex: 1 }}
                onPress={() => setStep((s) => (s - 1) as Step)}
              />
            )}
            <PressableButton
              label={step === 5 ? 'Begin Adventure ⚔️' : 'Continue →'}
              size="lg"
              disabled={!canProceed}
              style={{ flex: 1 }}
              onPress={handleNext}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.bg },
  scroll:       { padding: 20, gap: 24, paddingBottom: 40 },
  header:       { alignItems: 'center', paddingTop: 12 },
  logo:         { fontSize: 28, fontWeight: '800', color: COLORS.gold },
  tagline:      { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  progressRow:  { flexDirection: 'row', gap: 8 },
  stepItem:     { flex: 1, gap: 4 },
  stepBar:      { height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  stepDone:     { backgroundColor: COLORS.gold },
  stepActive:   { backgroundColor: 'rgba(245,158,11,0.5)' },
  stepLabel:    { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
  stepDesc:     { fontSize: 20, fontWeight: '700', color: COLORS.text },
  inputWrap:    {},
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  hint:         { fontSize: 13, color: COLORS.textMuted },
  skipHint:     { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', fontStyle: 'italic' },
  navRow:       { flexDirection: 'row', gap: 10 },
  // Body stats step
  bodyStepWrap: { gap: 16 },
  unitRow:      { flexDirection: 'row', gap: 10 },
  unitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  unitBtnActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(245,158,11,0.1)' },
  unitBtnText:   { fontSize: 16, fontWeight: '700', color: COLORS.textMuted },
  weightRow:     { flexDirection: 'row', gap: 10, alignItems: 'center' },
  weightInput:   { flex: 1, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  weightUnitLabel: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weightUnitText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' },
});
