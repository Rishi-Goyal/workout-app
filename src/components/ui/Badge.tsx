import { View, Text, StyleSheet } from 'react-native';

type BadgeVariant = 'gold' | 'crimson' | 'jade' | 'violet' | 'orange' | 'muted';

const COLORS_MAP: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  gold:    { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  crimson: { bg: 'rgba(220,38,38,0.15)',   text: '#f87171', border: 'rgba(220,38,38,0.3)' },
  jade:    { bg: 'rgba(16,185,129,0.15)',  text: '#34d399', border: 'rgba(16,185,129,0.3)' },
  violet:  { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
  orange:  { bg: 'rgba(249,115,22,0.15)', text: '#fb923c', border: 'rgba(249,115,22,0.3)' },
  muted:   { bg: '#221d30',              text: '#9988aa', border: '#2e2540' },
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export default function Badge({ label, variant = 'muted' }: BadgeProps) {
  const c = COLORS_MAP[variant];
  return (
    <View style={[styles.base, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '600' },
});
