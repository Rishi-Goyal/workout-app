import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '@/lib/constants';

type BadgeVariant = 'gold' | 'crimson' | 'jade' | 'violet' | 'orange' | 'muted' | 'blue' | 'cyan';

const COLORS_MAP: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  gold:    { bg: 'rgba(245,166,35,0.14)', text: COLORS.goldLight,    border: 'rgba(245,166,35,0.35)' },
  // `blue` kept as an alias (some callers still use it) — maps to cyan on the v4 palette.
  blue:    { bg: 'rgba(56,189,248,0.14)', text: COLORS.cyan,         border: 'rgba(56,189,248,0.35)' },
  cyan:    { bg: 'rgba(56,189,248,0.14)', text: COLORS.cyan,         border: 'rgba(56,189,248,0.35)' },
  crimson: { bg: 'rgba(229,62,62,0.14)',  text: '#fb7185',           border: 'rgba(229,62,62,0.35)' },
  jade:    { bg: 'rgba(16,185,129,0.14)', text: COLORS.jadeLight,    border: 'rgba(16,185,129,0.35)' },
  violet:  { bg: 'rgba(99,102,241,0.14)', text: COLORS.violetLight,  border: 'rgba(99,102,241,0.35)' },
  orange:  { bg: 'rgba(249,115,22,0.14)', text: '#fb923c',           border: 'rgba(249,115,22,0.35)' },
  muted:   { bg: COLORS.surfaceAccent,    text: COLORS.textMuted,    border: COLORS.border },
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
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
