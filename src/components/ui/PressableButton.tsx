import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { COLORS, RADIUS, FONTS } from '@/lib/constants';

interface PressableButtonProps {
  onPress?: () => void;
  label: string;
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

const BG: Record<string, string> = {
  primary: COLORS.gold,
  ghost:   'transparent',
  danger:  'rgba(229,62,62,0.12)',
  success: 'rgba(16,185,129,0.15)',
};

const TEXT_COLOR: Record<string, string> = {
  primary: COLORS.textInverse,   // gold bg needs dark text for contrast
  ghost:   COLORS.text,
  danger:  COLORS.crimson,
  success: COLORS.jadeLight,
};

const BORDER: Record<string, string | undefined> = {
  ghost:   COLORS.border,
  danger:  'rgba(229,62,62,0.5)',
  success: 'rgba(16,185,129,0.5)',
};

export default function PressableButton({
  onPress,
  label,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  style,
  accessibilityHint,
}: PressableButtonProps) {
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 15 : 13;
  const paddingV = size === 'sm' ? 8 : size === 'lg' ? 15 : 11;
  const paddingH = size === 'sm' ? 14 : size === 'lg' ? 24 : 18;

  // Primary CTA gets a soft gold glow to signal the "key action" in a screen.
  const glowStyle =
    variant === 'primary'
      ? {
          shadowColor: COLORS.gold,
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          elevation: 3,
        }
      : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: BG[variant],
          borderColor: BORDER[variant],
          borderWidth: BORDER[variant] ? 1 : 0,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
          opacity: pressed || disabled ? 0.55 : 1,
        },
        glowStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={TEXT_COLOR[variant]} />
      ) : (
        <Text
          style={{
            color: TEXT_COLOR[variant],
            fontSize,
            fontFamily: FONTS.sansBold,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
