import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/constants';

type BadgeVariant = 'gold' | 'crimson' | 'jade' | 'violet' | 'orange' | 'muted' | 'blue';

const COLORS_MAP: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  // 'gold' now maps to blue accent — name kept so all callers work unchanged
  gold:    { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  blue:    { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  // Semantic variants — gamification moments only
  crimson: { bg: 'rgba(220,38,38,0.12)',   text: '#f87171', border: 'rgba(220,38,38,0.25)' },
  jade:    { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', border: 'rgba(16,185,129,0.25)' },
  violet:  { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa', border: 'rgba(139,92,246,0.25)' },
  orange:  { bg: 'rgba(249,115,22,0.12)', text: '#fb923c', border: 'rgba(249,115,22,0.25)' },
  muted:   { bg: COLORS.surface,          text: COLORS.textMuted, border: COLORS.border },
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
  base: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '600' },
});
