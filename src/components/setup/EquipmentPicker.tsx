import { View, Text, StyleSheet, Pressable } from 'react-native';
import { EQUIPMENT_LIST, COLORS } from '@/lib/constants';
import type { Equipment } from '@/types';

interface Props { selected: Equipment[]; onChange: (e: Equipment[]) => void; }

export default function EquipmentPicker({ selected, onChange }: Props) {
  const toggle = (eq: Equipment) => {
    if (selected.includes(eq)) {
      // Deselect — but always keep at least bodyweight_only if nothing else remains
      const next = selected.filter((e) => e !== eq);
      onChange(next.length === 0 ? ['bodyweight_only'] : next);
    } else if (eq === 'bodyweight_only') {
      // "No Equipment" selected → clear everything else
      onChange(['bodyweight_only']);
    } else {
      // Real equipment selected → add it and remove bodyweight_only
      onChange([...selected.filter((e) => e !== 'bodyweight_only'), eq]);
    }
  };

  return (
    <View style={styles.grid}>
      {EQUIPMENT_LIST.map((eq) => {
        const isSelected = selected.includes(eq.value);
        const isBodyweightOnly = eq.value === 'bodyweight_only';
        return (
          <Pressable
            key={eq.value}
            onPress={() => toggle(eq.value)}
            style={({ pressed }) => [
              styles.cell,
              isSelected && styles.selected,
              isBodyweightOnly && styles.bodyweightCell,
              isBodyweightOnly && isSelected && styles.bodyweightSelected,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.icon}>{eq.icon}</Text>
            <Text style={[styles.label, isSelected && { color: COLORS.gold }]}>{eq.label}</Text>
            {isBodyweightOnly && (
              <Text style={styles.bodyweightHint}>Clears other selections</Text>
            )}
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
  selected: { borderColor: COLORS.gold, backgroundColor: 'rgba(99,102,241,0.07)' },
  bodyweightCell: { width: '100%', flexDirection: 'row', gap: 10, justifyContent: 'center' },
  bodyweightSelected: { borderColor: COLORS.jade, backgroundColor: 'rgba(14,164,114,0.07)' },
  icon: { fontSize: 28 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },
  bodyweightHint: { fontSize: 10, color: COLORS.textMuted, fontStyle: 'italic' },
});
