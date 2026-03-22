import { View, Text, StyleSheet } from 'react-native';
import AnimatedBar from '@/components/ui/AnimatedBar';
import { xpProgress } from '@/lib/xp';
import { COLORS } from '@/lib/constants';
import type { Character } from '@/types';

export default function XPBar({ character }: { character: Character }) {
  const progress = xpProgress(character);
  return (
    <View style={styles.container}>
      <AnimatedBar
        value={progress}
        color={COLORS.gold}
        height={10}
        label={`Lv.${character.level} — ${character.title}`}
        rightLabel={`${character.currentXP}/${character.xpToNextLevel} XP`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
});
