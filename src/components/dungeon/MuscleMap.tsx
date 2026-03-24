/**
 * MuscleMap — anatomical front/back body diagram.
 * Uses react-native-body-highlighter with an error boundary fallback.
 * Primary muscles pulse gold, secondary shown in amber.
 */
import { Component, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '@/lib/constants';
import type { MuscleGroup } from '@/types';
import type { ExtendedBodyPart, Slug } from 'react-native-body-highlighter';

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

interface MuscleMapProps {
  targets: MuscleGroup[];
  secondary?: MuscleGroup[];
}

// Error boundary so a crash in the SVG library never brings down the whole screen
interface EBState { crashed: boolean }
class BodyErrorBoundary extends Component<{ children: React.ReactNode; fallback: React.ReactNode }, EBState> {
  state: EBState = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  render() { return this.state.crashed ? this.props.fallback : this.props.children; }
}

function buildBodyData(targets: MuscleGroup[], secondary: MuscleGroup[]): ExtendedBodyPart[] {
  const parts: ExtendedBodyPart[] = [];
  targets.forEach(m =>
    MUSCLE_SLUG_MAP[m].forEach(slug => parts.push({ slug, color: PRIMARY_COLOR, intensity: 2 }))
  );
  secondary.forEach(m => {
    if (targets.includes(m)) return;
    MUSCLE_SLUG_MAP[m].forEach(slug => parts.push({ slug, color: SECONDARY_COLOR, intensity: 1 }));
  });
  return parts;
}

function BodyDiagram({ targets, secondary }: { targets: MuscleGroup[]; secondary: MuscleGroup[] }) {
  // Lazy-require so a load error is caught by the error boundary, not at module level
  const Body = require('react-native-body-highlighter').default;
  const bodyData = buildBodyData(targets, secondary);

  return (
    <View style={styles.bodiesRow}>
      <View style={styles.bodyCol}>
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
        <Text style={styles.sideLabel}>FRONT</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.bodyCol}>
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
        <Text style={styles.sideLabel}>BACK</Text>
      </View>
    </View>
  );
}

// Simple fallback: coloured muscle chips only (no SVG)
function MuscleChipsOnly({ targets, secondary }: { targets: MuscleGroup[]; secondary: MuscleGroup[] }) {
  return (
    <View style={styles.fallbackContainer}>
      <Text style={styles.fallbackTitle}>TARGETED MUSCLES</Text>
      <View style={styles.chips}>
        {targets.map(m => (
          <View key={m} style={[styles.chip, styles.chipPrimary]}>
            <View style={[styles.chipDot, { backgroundColor: PRIMARY_COLOR }]} />
            <Text style={[styles.chipText, { color: PRIMARY_COLOR }]}>{MUSCLE_LABELS[m]}</Text>
          </View>
        ))}
        {secondary.map(m => (
          <View key={m} style={[styles.chip, styles.chipSecondary]}>
            <View style={[styles.chipDot, { backgroundColor: SECONDARY_COLOR }]} />
            <Text style={[styles.chipText, { color: SECONDARY_COLOR }]}>{MUSCLE_LABELS[m]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
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

  return (
    <View style={styles.container}>
      <BodyErrorBoundary fallback={<MuscleChipsOnly targets={targets} secondary={secondary} />}>
        <Animated.View style={{ opacity: pulseAnim }}>
          <BodyDiagram targets={targets} secondary={secondary} />
        </Animated.View>
      </BodyErrorBoundary>

      {/* Muscle chips always shown below */}
      <View style={styles.chipsSection}>
        {targets.length > 0 && (
          <>
            <Text style={styles.chipSectionLabel}>PRIMARY MUSCLES</Text>
            <View style={styles.chips}>
              {targets.map(m => (
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
              {secondary.map(m => (
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
  fallbackContainer:{ alignItems: 'center', gap: 10, paddingVertical: 12 },
  fallbackTitle:    { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2, fontWeight: '700' },
  chipsSection:     { alignItems: 'center', gap: 6, width: '100%' },
  chipSectionLabel: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2, fontWeight: '700' },
  chips:            { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  chip:             { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  chipPrimary:      { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.4)' },
  chipSecondary:    { backgroundColor: 'rgba(180,83,9,0.10)',   borderColor: 'rgba(180,83,9,0.30)' },
  chipDot:          { width: 6, height: 6, borderRadius: 3 },
  chipText:         { fontSize: 11, fontWeight: '700' },
});
