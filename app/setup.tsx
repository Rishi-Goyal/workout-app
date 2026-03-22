import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Pressable,
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

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { label: 'Name', desc: 'Who are you, adventurer?' },
  { label: 'Goal', desc: 'What is your quest?' },
  { label: 'Equipment', desc: 'Your arsenal' },
  { label: 'Strength', desc: 'Rate your muscles' },
];

const defaultStrengths = (): MuscleStrengths =>
  Object.fromEntries(MUSCLE_GROUPS.map((m) => [m.value, 5])) as MuscleStrengths;

export default function SetupScreen() {
  const setProfile = useProfileStore((s) => s.setProfile);

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>(['bodyweight_only']);
  const [strengths, setStrengths] = useState<MuscleStrengths>(defaultStrengths());

  const updateStrength = (m: MuscleGroup, v: number) => setStrengths((p) => ({ ...p, [m]: v }));

  const canProceed =
    (step === 1 && name.trim().length >= 2) ||
    (step === 2 && !!goal) ||
    step === 3 ||
    step === 4;

  const handleNext = () => {
    if (step < 4) return setStep((s) => (s + 1) as Step);
    setProfile({ name: name.trim(), goal: goal!, equipment, muscleStrengths: strengths, createdAt: new Date().toISOString() });
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

          {/* Step content */}
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

          {step === 2 && <GoalSelector value={goal} onChange={setGoal} />}

          {step === 3 && (
            <View style={{ gap: 8 }}>
              <Text style={styles.hint}>Select all equipment you have access to</Text>
              <EquipmentPicker selected={equipment} onChange={setEquipment} />
            </View>
          )}

          {step === 4 && (
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
              label={step === 4 ? 'Begin Adventure ⚔️' : 'Continue →'}
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
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, gap: 24, paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: 12 },
  logo: { fontSize: 28, fontWeight: '800', color: COLORS.gold },
  tagline: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  progressRow: { flexDirection: 'row', gap: 8 },
  stepItem: { flex: 1, gap: 4 },
  stepBar: { height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  stepDone: { backgroundColor: COLORS.gold },
  stepActive: { backgroundColor: 'rgba(245,158,11,0.5)' },
  stepLabel: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
  stepDesc: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  inputWrap: {},
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
  hint: { fontSize: 13, color: COLORS.textMuted },
  navRow: { flexDirection: 'row', gap: 10 },
});
