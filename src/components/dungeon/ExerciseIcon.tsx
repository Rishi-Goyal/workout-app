/**
 * ExerciseIcon — abstract SVG silhouette shown when an exercise has no
 * bundled image, no animationUrl, and no remote fetch result.
 *
 * v4.5.0 PR 3/3 — last-line fallback in ExerciseGif so the Guide tab is
 * never visually empty. Used today only for the 4 warmups where no honest
 * cousin asset exists (Cobra, Box Breathing, Jumping Jacks, High-Knee
 * March). Deliberately abstract — we don't fake a body-pose illustration
 * for an exercise we don't actually have a real visual for.
 *
 * Renders one of two glyphs based on `kind`:
 *   - 'static'     → concentric circles centred (suggests stillness)
 *   - 'dynamic'    → upward-fanning ripple lines (suggests rhythm)
 *   - 'activation' → falls back to static rings
 */
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { COLORS, FONTS, RADIUS } from '@/lib/constants';

type Kind = 'static' | 'dynamic' | 'activation';

interface ExerciseIconProps {
  /** Drives glyph choice. Defaults to 'static'. */
  kind?: Kind;
  /** Display name shown beneath the icon. */
  exerciseName: string;
}

const ICON_SIZE = 160;
const CENTER = ICON_SIZE / 2;

function StaticGlyph() {
  // Three concentric rings + a centre dot. Reads as "calm, centred".
  return (
    <G>
      <Circle cx={CENTER} cy={CENTER} r={56} stroke={COLORS.violetDim} strokeWidth={1.5} fill="none" opacity={0.4} />
      <Circle cx={CENTER} cy={CENTER} r={40} stroke={COLORS.violetLight} strokeWidth={1.5} fill="none" opacity={0.7} />
      <Circle cx={CENTER} cy={CENTER} r={24} stroke={COLORS.violetLight} strokeWidth={2} fill="none" />
      <Circle cx={CENTER} cy={CENTER} r={6} fill={COLORS.violetLight} />
    </G>
  );
}

function DynamicGlyph() {
  // Three upward arcs of increasing height — suggests rhythm/bounce.
  // Anchored along the baseline at y = CENTER + 30; arcs peak above.
  const base = CENTER + 30;
  return (
    <G>
      <Path
        d={`M ${CENTER - 50} ${base} Q ${CENTER} ${base - 40} ${CENTER + 50} ${base}`}
        stroke={COLORS.gold}
        strokeWidth={3}
        fill="none"
        opacity={0.85}
      />
      <Path
        d={`M ${CENTER - 38} ${base + 10} Q ${CENTER} ${base - 22} ${CENTER + 38} ${base + 10}`}
        stroke={COLORS.goldLight}
        strokeWidth={2.5}
        fill="none"
        opacity={0.7}
      />
      <Path
        d={`M ${CENTER - 26} ${base + 20} Q ${CENTER} ${base - 4} ${CENTER + 26} ${base + 20}`}
        stroke={COLORS.goldDim}
        strokeWidth={2}
        fill="none"
        opacity={0.5}
      />
      {/* Trio of dots above suggesting motion accents */}
      <Circle cx={CENTER - 20} cy={base - 50} r={3} fill={COLORS.gold} opacity={0.6} />
      <Circle cx={CENTER} cy={base - 58} r={4} fill={COLORS.gold} />
      <Circle cx={CENTER + 20} cy={base - 50} r={3} fill={COLORS.gold} opacity={0.6} />
    </G>
  );
}

export default function ExerciseIcon({ kind = 'static', exerciseName }: ExerciseIconProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}>
          {kind === 'dynamic' ? <DynamicGlyph /> : <StaticGlyph />}
        </Svg>
      </View>
      <Text style={styles.name} numberOfLines={1}>{exerciseName}</Text>
      <Text style={styles.label}>GUIDE · FOLLOW THE CUE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  iconBox: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 13,
    fontFamily: FONTS.sansMed,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  label: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
});
