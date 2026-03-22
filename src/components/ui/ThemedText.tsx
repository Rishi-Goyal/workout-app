import { Text, TextStyle, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/constants';

interface ThemedTextProps {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  variant?: 'heading' | 'subheading' | 'body' | 'caption' | 'muted';
  numberOfLines?: number;
}

export default function ThemedText({ children, style, variant = 'body', numberOfLines }: ThemedTextProps) {
  return (
    <Text style={[styles[variant], style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  body: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    color: COLORS.text,
  },
  muted: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
