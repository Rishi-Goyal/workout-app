/**
 * Card — standard surface container used across all screens.
 * Replaces the repeated inline card style pattern.
 */
import { View, type ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '@/lib/constants';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Inner padding. Defaults to SPACING.card (16). Pass SPACING.cardLg (20) for hero cards. */
  padding?: number;
}

export default function Card({ children, style, padding = SPACING.card }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: COLORS.surface,
          borderRadius: RADIUS.card,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
