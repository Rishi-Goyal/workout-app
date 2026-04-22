/**
 * SectionLabel — uppercase overline used above every content section.
 * Replaces the repeated inline sectionLabel style pattern.
 */
import { Text, type TextStyle } from 'react-native';
import { COLORS, FONTS } from '@/lib/constants';

interface SectionLabelProps {
  children: string;
  style?: TextStyle;
}

export default function SectionLabel({ children, style }: SectionLabelProps) {
  return (
    <Text
      style={[
        {
          fontSize: 10,
          fontFamily: FONTS.sansMed,
          color: COLORS.textSecondary,
          letterSpacing: 2.5,
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
