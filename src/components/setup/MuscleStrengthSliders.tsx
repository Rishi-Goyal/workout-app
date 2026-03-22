import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { MUSCLE_GROUPS, COLORS } from '@/lib/constants';
import type { MuscleGroup, MuscleStrengths } from '@/types';

interface Props { values: MuscleStrengths; onChange: (m: MuscleGroup, v: number) => void; }

function label(v: number) {
  if (v <= 2) return 'Beginner';
  if (v <= 4) return 'Novice';
  if (v <= 6) return 'Intermediate';
  if (v <= 8) return 'Advanced';
  return 'Elite';
}

export default function MuscleStrengthSliders({ values, onChange }: Props) {
  return (
    <View style={styles.container}>
      {MUSCLE_GROUPS.map((mg) => {
        const val = values[mg.value] ?? 5;
        return (
          <View key={mg.value} style={styles.row}>
            <View style={styles.labelRow}>
              <Text style={styles.muscleName}>{mg.label}</Text>
              <Text style={styles.levelLabel}>{val} — {label(val)}</Text>
            </View>
            <Slider
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={val}
              onValueChange={(v) => onChange(mg.value, v)}
              minimumTrackTintColor={COLORS.gold}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.gold}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  row: { gap: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  muscleName: { fontSize: 14, color: COLORS.text },
  levelLabel: { fontSize: 12, color: COLORS.gold, fontWeight: '600' },
});
