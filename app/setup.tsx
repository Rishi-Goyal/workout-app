import { useState, useEffect, useMemo } from 'react';
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
import Card from '@/components/ui/Card';
import { useProfileStore } from '@/stores/useProfileStore';
import { MUSCLE_GROUPS, COLORS, FONTS, RADIUS } from '@/lib/constants';
import type { FitnessGoal, Equipment, MuscleGroup, MuscleStrengths } from '@/types';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEPS = [
  { label: 'Name',      desc: 'Who enters the dungeon?' },
  { label: 'Body',      desc: 'Your hunter stats' },
  { label: 'Goal',      desc: 'What drives your quest?' },
  { label: 'Gear',      desc: 'Your arsenal' },
  { label: 'Strength',  desc: 'Rate your muscles' },
  { label: 'Cardio',    desc: 'Cardio and mobility' },
  { label: 'Class',     desc: 'Your emerging class' },
];

const defaultStrengths = (): MuscleStrengths =>
  Object.fromEntries(MUSCLE_GROUPS.map((m) => [m.value, 5])) as MuscleStrengths;

// ── Slider (lightweight, no external dep) ─────────────────────────────────
function StepSlider({ value, min, max, step, onChange, suffix }: {
  value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; suffix: string;
}) {
  const canDec = value > min;
  const canInc = value < max;
  return (
    <View style={sliderStyles.row}>
      <Pressable
        disabled={!canDec}
        onPress={() => onChange(Math.max(min, value - step))}
        style={({ pressed }) => [sliderStyles.btn, (!canDec || pressed) && sliderStyles.btnDim]}
      >
        <Text style={sliderStyles.btnText}>−</Text>
      </Pressable>
      <View style={sliderStyles.valueBox}>
        <Text style={sliderStyles.value}>{value}</Text>
        <Text style={sliderStyles.suffix}>{suffix}</Text>
      </View>
      <Pressable
        disabled={!canInc}
        onPress={() => onChange(Math.min(max, value + step))}
        style={({ pressed }) => [sliderStyles.btn, (!canInc || pressed) && sliderStyles.btnDim]}
      >
        <Text style={sliderStyles.btnText}>+</Text>
      </Pressable>
    </View>
  );
}

// ── Dominant-dimension preview (pre-Phase 8 stopgap) ───────────────────────
function dominantDimensions(
  strengths: MuscleStrengths,
  cardioMinutes: number,
  mobilityScore: number,
  gripScore: number,
): { label: string; value: number; tag: string }[] {
  const push = (strengths.chest + strengths.shoulders + strengths.triceps) / 3;
  const pull = (strengths.back + strengths.biceps) / 2;
  const legs = (strengths.quads + strengths.hamstrings + strengths.glutes + strengths.calves) / 4;
  const core = strengths.core;
  const cardio = Math.min(10, cardioMinutes / 15); // 150min → 10
  const mobility = mobilityScore;
  const grip = gripScore;
  return [
    { label: 'Push',     value: push,     tag: 'STR' },
    { label: 'Pull',     value: pull,     tag: 'STR' },
    { label: 'Legs',     value: legs,     tag: 'STR' },
    { label: 'Core',     value: core,     tag: 'STR' },
    { label: 'Cardio',   value: cardio,   tag: 'CON' },
    { label: 'Mobility', value: mobility, tag: 'DEX' },
    { label: 'Grip',     value: grip,     tag: 'PWR' },
  ].sort((a, b) => b.value - a.value);
}

export default function SetupScreen() {
  const setProfile = useProfileStore((s) => s.setProfile);

  const [step, setStep]         = useState<Step>(1);
  const [name, setName]         = useState('');
  const [bodyWeightStr, setBodyWeightStr] = useState('');
  const [weightUnit, setWeightUnit]       = useState<'kg' | 'lbs'>('kg');
  const [goal, setGoal]         = useState<FitnessGoal | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>(['bodyweight_only']);
  const [strengths, setStrengths] = useState<MuscleStrengths>(defaultStrengths());
  const [cardioMinutes, setCardioMinutes] = useState(60);
  const [mobilityScore, setMobilityScore] = useState(5);
  const [gripScore, setGripScore]         = useState(5);

  const updateStrength = (m: MuscleGroup, v: number) => setStrengths((p) => ({ ...p, [m]: v }));

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 1) {
        setStep((s) => (s - 1) as Step);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [step]);

  const canProceed =
    (step === 1 && name.trim().length >= 2) ||
    (step === 2) ||
    (step === 3 && !!goal) ||
    step === 4 ||
    step === 5 ||
    step === 6 ||
    step === 7;

  const dims = useMemo(
    () => dominantDimensions(strengths, cardioMinutes, mobilityScore, gripScore),
    [strengths, cardioMinutes, mobilityScore, gripScore],
  );

  const handleNext = () => {
    if (step < 7) return setStep((s) => (s + 1) as Step);

    let bodyWeightKg: number | undefined;
    const parsed = parseFloat(bodyWeightStr);
    if (!isNaN(parsed) && parsed > 0) {
      bodyWeightKg = weightUnit === 'lbs' ? Math.round(parsed / 2.2046 * 10) / 10 : parsed;
    }

    // NOTE: cardioMinutes/mobilityScore/gripScore are captured here but persisted
    // in Phase 8 once the Profile/Character types are extended.
    setProfile({
      name: name.trim(),
      goal: goal!,
      equipment,
      muscleStrengths: strengths,
      createdAt: new Date().toISOString(),
      ...(bodyWeightKg !== undefined && { bodyWeight: bodyWeightKg }),
      weightUnit,
      cardioMinutes,
      mobilityScore,
      gripScore,
    } as any);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <Text style={styles.logo}>⚔️ DungeonFit</Text>
            <Text style={styles.tagline}>AWAKEN THE HUNTER WITHIN</Text>
          </View>

          <View style={styles.progressRow}>
            {STEPS.map((s, i) => {
              const n = (i + 1) as Step;
              return (
                <View key={n} style={styles.stepItem}>
                  <View style={[styles.stepBar, step > n && styles.stepDone, step === n && styles.stepActive]} />
                </View>
              );
            })}
          </View>
          <Text style={styles.stepCount}>STEP {step} OF 7 · {STEPS[step - 1].label.toUpperCase()}</Text>

          <Text style={styles.stepDesc}>{STEPS[step - 1].desc}</Text>

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

          {step === 2 && (
            <View style={styles.bodyStepWrap}>
              <Text style={styles.hint}>
                Used to suggest weights and track strength ratios. You can always skip this.
              </Text>

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

          {step === 6 && (
            <View style={{ gap: 20 }}>
              <Text style={styles.hint}>
                These shape your class affinity. Cardio minutes per week, mobility and grip on a 1–10 scale.
              </Text>

              <View style={styles.sliderGroup}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Cardio (min / week)</Text>
                  <Text style={styles.sliderHint}>Running, cycling, rowing, swimming</Text>
                </View>
                <StepSlider
                  value={cardioMinutes}
                  min={0}
                  max={300}
                  step={15}
                  onChange={setCardioMinutes}
                  suffix="min"
                />
              </View>

              <View style={styles.sliderGroup}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Mobility</Text>
                  <Text style={styles.sliderHint}>Flexibility, range of motion, yoga</Text>
                </View>
                <StepSlider
                  value={mobilityScore}
                  min={1}
                  max={10}
                  step={1}
                  onChange={setMobilityScore}
                  suffix="/10"
                />
              </View>

              <View style={styles.sliderGroup}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Grip Strength</Text>
                  <Text style={styles.sliderHint}>Deadhangs, farmer carries, crush grip</Text>
                </View>
                <StepSlider
                  value={gripScore}
                  min={1}
                  max={10}
                  step={1}
                  onChange={setGripScore}
                  suffix="/10"
                />
              </View>
            </View>
          )}

          {step === 7 && (
            <View style={{ gap: 16 }}>
              <Text style={styles.hint}>
                Your class emerges from what you train. Here are your strongest dimensions — your true class will
                crystallize after your first dungeon run.
              </Text>
              <Card padding={16}>
                <Text style={styles.previewLabel}>TRAINING PATTERN</Text>
                <View style={styles.dimList}>
                  {dims.slice(0, 4).map((d, i) => (
                    <View key={d.label} style={styles.dimRow}>
                      <Text style={[styles.dimRank, i === 0 && { color: COLORS.gold }]}>
                        #{i + 1}
                      </Text>
                      <Text style={[styles.dimName, i === 0 && { color: COLORS.text }]}>
                        {d.label}
                      </Text>
                      <Text style={styles.dimTag}>{d.tag}</Text>
                      <Text style={styles.dimValue}>{d.value.toFixed(1)}</Text>
                    </View>
                  ))}
                </View>
              </Card>
              <Text style={styles.skipHint}>
                Every floor you clear sharpens the signal. Ranks unlock at C → B → A → S → SS.
              </Text>
            </View>
          )}

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
              label={step === 7 ? '⚔️ Enter the Dungeon' : 'Continue →'}
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
  scroll:       { padding: 20, gap: 20, paddingBottom: 40 },
  header:       { alignItems: 'center', paddingTop: 12, gap: 4 },
  logo:         { fontSize: 28, fontFamily: FONTS.displayBold, color: COLORS.gold, letterSpacing: 0.5 },
  tagline:      { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.violetLight, letterSpacing: 2.5 },

  progressRow:  { flexDirection: 'row', gap: 6, marginTop: 4 },
  stepItem:     { flex: 1 },
  stepBar:      { height: 3, borderRadius: 2, backgroundColor: COLORS.border },
  stepDone:     { backgroundColor: COLORS.gold },
  stepActive:   { backgroundColor: 'rgba(245,166,35,0.5)' },
  stepCount:    { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.violetLight, letterSpacing: 1.5, textAlign: 'center' },

  stepDesc:     { fontSize: 22, fontFamily: FONTS.displayBold, color: COLORS.text, letterSpacing: 0.4 },
  inputWrap:    {},
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: FONTS.sans,
    color: COLORS.text,
  },
  hint:         { fontSize: 13, fontFamily: FONTS.sans, color: COLORS.textMuted, lineHeight: 18 },
  skipHint:     { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted, textAlign: 'center', fontStyle: 'italic' },
  navRow:       { flexDirection: 'row', gap: 10, marginTop: 8 },

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
  unitBtnActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(245,166,35,0.1)' },
  unitBtnText:   { fontSize: 16, fontFamily: FONTS.sansBold, color: COLORS.textMuted, letterSpacing: 0.5 },
  weightRow:     { flexDirection: 'row', gap: 10, alignItems: 'center' },
  weightInput:   { flex: 1, fontSize: 24, fontFamily: FONTS.displayBold, textAlign: 'center' },
  weightUnitLabel: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weightUnitText: { fontSize: 14, fontFamily: FONTS.sansBold, color: COLORS.textMuted, letterSpacing: 0.5 },

  // Slider group (step 6)
  sliderGroup:  { gap: 8 },
  sliderHeader: { gap: 2 },
  sliderLabel:  { fontSize: 14, fontFamily: FONTS.sansBold, color: COLORS.text, letterSpacing: 0.3 },
  sliderHint:   { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted },

  // Preview (step 7)
  previewLabel: { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.violetLight, letterSpacing: 2, marginBottom: 10 },
  dimList:      { gap: 10 },
  dimRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dimRank:      { fontSize: 12, fontFamily: FONTS.mono, color: COLORS.textMuted, width: 24, letterSpacing: 0.5 },
  dimName:      { flex: 1, fontSize: 14, fontFamily: FONTS.sansMed, color: COLORS.textSecondary },
  dimTag:       { fontSize: 10, fontFamily: FONTS.sansBold, color: COLORS.violetLight, letterSpacing: 1.5 },
  dimValue:     { fontSize: 13, fontFamily: FONTS.mono, color: COLORS.gold, letterSpacing: 0.5, width: 40, textAlign: 'right' },
});

const sliderStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: {
    width: 44, height: 44, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAccent,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  btnDim:  { opacity: 0.3 },
  btnText: { fontSize: 20, fontFamily: FONTS.sansBold, color: COLORS.text },
  valueBox: {
    flex: 1, alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 10,
    flexDirection: 'row', gap: 6, justifyContent: 'center',
  },
  value:   { fontSize: 20, fontFamily: FONTS.displayBold, color: COLORS.gold, letterSpacing: 0.5 },
  suffix:  { fontSize: 11, fontFamily: FONTS.sansBold, color: COLORS.textMuted, letterSpacing: 1 },
});
