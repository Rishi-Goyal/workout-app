/**
 * MuscleMap — proper anatomical body diagram using react-native-body-highlighter.
 * Primary targeted muscles glow gold with a pulsing animation.
 * Secondary/stabiliser muscles shown in amber.
 */
import { View, Text, StyleSheet, Animated } from 'react-native';
import Body from 'react-native-body-highlighter';
import { useEffect, useRef } from 'react';
import { COLORS } from '@/lib/constants';
import type { MuscleGroup } from '@/types';
import type { Slug, ExtendedBodyPart } from 'react-native-body-highlighter';

// Map our MuscleGroup keys → react-native-body-highlighter slugs
const MUSCLE_SLUG_MAP: Record<MuscleGroup, Slug[]> = {
  chest:      ['chest'],
  shoulders:  ['deltoids'],
  biceps:     ['biceps'],
  triceps:    ['triceps'],
  core:       ['abs', 'obliques'],
  back:       ['trapezius', 'upper-back', 'lower-back'],
  quads:      ['quadriceps'],
  hamstrings: ['hamstring'],
  glutes:     ['gluteal'],
  calves:     ['calves'],
};

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest:      'Pectorals',
  shoulders:  'Deltoids',
  biceps:     'Biceps',
  triceps:    'Triceps',
  core:       'Core / Abs',
  back:       'Lats & Traps',
  quads:      'Quadriceps',
  hamstrings: 'Hamstrings',
  glutes:     'Glutes',
  calves:     'Calves',
};

const PRIMARY_COLOR   = '#f59e0b';
const SECONDARY_COLOR = '#b45309';
const INACTIVE_COLOR  = '#1e1830';
const BODY_BG         = '#0d0a0e';

interface MuscleMapProps {
  targets: MuscleGroup[];
  secondary?: MuscleGroup[];
}

function buildBodyData(
  targets: MuscleGroup[],
  secondary: MuscleGroup[],
  pulseColor: string,
): ExtendedBodyPart[] {
  const parts: ExtendedBodyPart[] = [];

  targets.forEach((muscle) => {
    MUSCLE_SLUG_MAP[muscle].forEach((slug) => {
      parts.push({ slug, color: pulseColor, intensity: 2 });
    });
  });

  secondary.forEach((muscle) => {
    // Don't override primaries
    if (targets.includes(muscle)) return;
    MUSCLE_SLUG_MAP[muscle].forEach((slug) => {
      parts.push({ slug, color: SECONDARY_COLOR, intensity: 1 });
    });
  });

  return parts;
}

export default function MuscleMap({ targets, secondary = [] }: MuscleMapProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (targets.length === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.55, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [targets.join(',')]);

  // Interpolate opacity for the primary muscle highlight overlay
  const primaryColor = PRIMARY_COLOR;
  const bodyData = buildBodyData(targets, secondary, primaryColor);

  return (
    <View style={styles.container}>
      {/* Front + Back body diagrams */}
      <View style={styles.bodiesRow}>
        <View style={styles.bodyCol}>
          <Animated.View style={{ opacity: pulseAnim }}>
            <Body
              data={bodyData}
              side="front"
              gender="male"
              scale={1.3}
              defaultFill={INACTIVE_COLOR}
              defaultStroke={COLORS.border}
              defaultStrokeWidth={0.5}
              border={COLORS.border}
            />
          </Animated.View>
          <Text style={styles.sideLabel}>FRONT</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.bodyCol}>
          <Animated.View style={{ opacity: pulseAnim }}>
            <Body
              data={bodyData}
              side="back"
              gender="male"
              scale={1.3}
              defaultFill={INACTIVE_COLOR}
              defaultStroke={COLORS.border}
              defaultStrokeWidth={0.5}
              border={COLORS.border}
            />
          </Animated.View>
          <Text style={styles.sideLabel}>BACK</Text>
        </View>
      </View>

      {/* Muscle chips */}
      <View style={styles.chipsSection}>
        {targets.length > 0 && (
          <>
            <Text style={styles.chipSectionLabel}>PRIMARY MUSCLES</Text>
            <View style={styles.chips}>
              {targets.map((m) => (
                <View key={m} style={[styles.chip, styles.chipPrimary]}>
                  <View style={[styles.chipDot, { backgroundColor: PRIMARY_COLOR }]} />
                  <Text style={[styles.chipText, { color: PRIMARY_COLOR }]}>{MUSCLE_LABELS[m]}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        {secondary.length > 0 && (
          <>
            <Text style={[styles.chipSectionLabel, { marginTop: 6 }]}>STABILISERS</Text>
            <View style={styles.chips}>
              {secondary.map((m) => (
                <View key={m} style={[styles.chip, styles.chipSecondary]}>
                  <View style={[styles.chipDot, { backgroundColor: SECONDARY_COLOR }]} />
                  <Text style={[styles.chipText, { color: SECONDARY_COLOR }]}>{MUSCLE_LABELS[m]}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { alignItems: 'center', gap: 12, width: '100%' },
  bodiesRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  bodyCol:          { alignItems: 'center', gap: 4 },
  sideLabel:        { fontSize: 10, color: COLORS.textMuted, letterSpacing: 1.5, fontWeight: '700' },
  divider:          { width: 1, height: 160, backgroundColor: COLORS.border },
  chipsSection:     { alignItems: 'center', gap: 6, width: '100%' },
  chipSectionLabel: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2, fontWeight: '700' },
  chips:            { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  chip:             { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  chipPrimary:      { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.4)' },
  chipSecondary:    { backgroundColor: 'rgba(180,83,9,0.10)',   borderColor: 'rgba(180,83,9,0.30)' },
  chipDot:          { width: 6, height: 6, borderRadius: 3 },
  chipText:         { fontSize: 11, fontWeight: '700' },
});
