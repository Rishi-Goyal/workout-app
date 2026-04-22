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
  /**
   * Optional accent glow. Adds a soft shadow + tinted border to draw the eye:
   * - `gold`: for hero CTAs (today's quest, primary action)
   * - `violet`: for level-up moments / class-related content
   */
  glow?: 'gold' | 'violet';
}

export default function Card({ children, style, padding = SPACING.card, glow }: CardProps) {
  const glowStyle =
    glow === 'gold'
      ? {
          borderColor: 'rgba(245,166,35,0.35)',
          shadowColor: COLORS.gold,
          shadowOpacity: 0.22,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 0 },
          elevation: 4,
        }
      : glow === 'violet'
      ? {
          borderColor: 'rgba(99,102,241,0.35)',
          shadowColor: COLORS.violet,
          shadowOpacity: 0.25,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 0 },
          elevation: 4,
        }
      : null;

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
        glowStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}
