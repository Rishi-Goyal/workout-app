/**
 * SectionLabel — uppercase overline used above every content section.
 * Replaces the repeated inline sectionLabel style pattern.
 */
import { Text, type TextStyle } from 'react-native';
import { COLORS } from '@/lib/constants';

interface SectionLabelProps {
  children: string;
  style?: TextStyle;
}

export default function SectionLabel({ children, style }: SectionLabelProps) {
  return (
    <Text
      style={[
        {
          fontSize: 11,
          fontWeight: '700',
          color: COLORS.textMuted,
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 12,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
