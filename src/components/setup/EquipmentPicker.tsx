import { View, Text, StyleSheet, Pressable } from 'react-native';
import { EQUIPMENT_LIST, COLORS } from '@/lib/constants';
import type { Equipment } from '@/types';

interface Props { selected: Equipment[]; onChange: (e: Equipment[]) => void; }

export default function EquipmentPicker({ selected, onChange }: Props) {
  const toggle = (eq: Equipment) => {
    onChange(selected.includes(eq) ? selected.filter((e) => e !== eq) : [...selected, eq]);
  };
  return (
    <View style={styles.grid}>
      {EQUIPMENT_LIST.map((eq) => {
        const isSelected = selected.includes(eq.value);
        return (
          <Pressable
            key={eq.value}
            onPress={() => toggle(eq.value)}
            style={({ pressed }) => [
              styles.cell,
              isSelected && styles.selected,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.icon}>{eq.icon}</Text>
            <Text style={[styles.label, isSelected && { color: COLORS.gold }]}>{eq.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    width: '47%',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selected: { borderColor: COLORS.gold, backgroundColor: 'rgba(245,158,11,0.07)' },
  icon: { fontSize: 28 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },
});
