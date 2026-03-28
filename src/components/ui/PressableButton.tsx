import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { COLORS, RADIUS } from '@/lib/constants';

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
  ghost: 'transparent',
  danger: '#b91c1c',
  success: '#065f46',
};

const TEXT_COLOR: Record<string, string> = {
  primary: '#fff',
  ghost: COLORS.text,
  danger: '#fff',
  success: '#fff',
};

const BORDER: Record<string, string | undefined> = {
  ghost: COLORS.border,
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
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;
  const paddingV = size === 'sm' ? 8 : size === 'lg' ? 15 : 11;
  const paddingH = size === 'sm' ? 14 : size === 'lg' ? 24 : 18;

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
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={TEXT_COLOR[variant]} />
      ) : (
        <Text style={{ color: TEXT_COLOR[variant], fontSize, fontWeight: '600' }}>{label}</Text>
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
