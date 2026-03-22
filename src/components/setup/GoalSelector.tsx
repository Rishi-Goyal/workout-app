import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FITNESS_GOALS, COLORS } from '@/lib/constants';
import type { FitnessGoal } from '@/types';

interface Props { value: FitnessGoal | null; onChange: (g: FitnessGoal) => void; }

export default function GoalSelector({ value, onChange }: Props) {
  return (
    <View style={styles.grid}>
      {FITNESS_GOALS.map((goal) => {
        const selected = value === goal.value;
        return (
          <Pressable
            key={goal.value}
            onPress={() => onChange(goal.value)}
            style={({ pressed }) => [
              styles.card,
              selected && styles.selected,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.icon}>{goal.icon}</Text>
            <View>
              <Text style={[styles.label, selected && { color: COLORS.gold }]}>{goal.label}</Text>
              <Text style={styles.desc}>{goal.description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selected: { borderColor: COLORS.gold, backgroundColor: 'rgba(245,158,11,0.07)' },
  icon: { fontSize: 26 },
  label: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  desc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});
