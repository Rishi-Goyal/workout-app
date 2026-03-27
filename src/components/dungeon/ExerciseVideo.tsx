/**
 * ExerciseVideo — opens a curated YouTube form tutorial in the YouTube app.
 * Replaced inline WebView embed with Linking.openURL for new-arch compatibility.
 */
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { COLORS } from '@/lib/constants';
import { inferExerciseType, type ExerciseType } from '@/components/dungeon/ExerciseAnimator';
import type { MuscleGroup } from '@/types';

const TYPE_COLOR: Record<ExerciseType, string> = {
  push:  '#6366f1',
  pull:  '#3b82f6',
  squat: '#10b981',
  hinge: '#f97316',
  curl:  '#a855f7',
  core:  '#ec4899',
  hold:  '#06b6d4',
};

// Curated form tutorial video IDs
const CURATED_VIDEOS: Record<string, string> = {
  // Chest
  'push-up':               'IODxDxX7oi4',
  'barbell-bench-press':   'vcBig73ojpE',
  'dumbbell-bench-press':  'VmB1G1K7v94',
  'incline-dumbbell-press':'8iPEnn-ltC8',
  'weighted-dip':          'yN6Q1UI_xr0',
  // Back
  'deadlift':              'op9kVnSso6Q',
  'pull-up':               'eGo4IYlbE5g',
  'barbell-bent-over-row': 'kBWAon7ItDw',
  'lat-pulldown':          'CAwf7n6Luuc',
  'dumbbell-row':          'roCP2_pNLuI',
  'dead-hang':             'HoE-C85ZlCE',
  'romanian-deadlift':     'JCXUYuzwNrM',
  // Shoulders
  'barbell-overhead-press':'_RlRDWO2jfg',
  'lateral-raise':         'XPPfnSEATJA',
  'face-pull':             'HSoHeSjFJEA',
  // Legs
  'barbell-back-squat':    'Dy28eq2PjcM',
  'front-squat':           'uYumuL_G_V0',
  'hip-thrust':            'xDmFkJxPzeM',
  'bulgarian-split-squat': 'kkdqbdwbOpQ',
  'nordic-curl':           '5_SnJN5AQBU',
  // Arms
  'barbell-curl':          'kwG2ipFRgfo',
  'skull-crusher':         'NIKnFGLKqnM',
  // Core
  'plank':                 'ASdvN_XEl_c',
  'hollow-body-hold':      'LlDNef_Ztsc',
  'ab-wheel-rollout':      'aHQXdvFQ3lg',
  'hanging-leg-raise':     'Pr1ieGZ5atk',
};

interface ExerciseVideoProps {
  exerciseId: string;
  exerciseName: string;
  muscles: MuscleGroup[];
  fallbackSteps?: string[];
}

function StepGuide({
  color,
  fallbackSteps,
  title,
  subtitle,
  icon,
}: {
  color: string;
  fallbackSteps: string[];
  title: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <View style={[styles.fallbackBox, { borderColor: color + '30' }]}>
      <View style={styles.fallbackHeader}>
        <Text style={styles.fallbackIcon}>{icon}</Text>
        <View>
          <Text style={[styles.fallbackTitle, { color }]}>{title}</Text>
          <Text style={styles.fallbackSub}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.fallbackSteps}>
        {fallbackSteps.map((step, i) => (
          <View key={i} style={styles.fallbackStep}>
            <View style={[styles.fallbackNum, { backgroundColor: color + '20', borderColor: color + '50' }]}>
              <Text style={[styles.fallbackNumText, { color }]}>{i + 1}</Text>
            </View>
            <Text style={styles.fallbackStepText}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ExerciseVideo({ exerciseId, exerciseName, muscles, fallbackSteps }: ExerciseVideoProps) {
  const type = inferExerciseType(exerciseName, muscles);
  const color = TYPE_COLOR[type];
  const videoId = CURATED_VIDEOS[exerciseId];

  const openVideo = () => {
    Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`);
  };

  // No curated video: show text guide
  if (!videoId) {
    if (fallbackSteps && fallbackSteps.length > 0) {
      return (
        <StepGuide
          color={color}
          fallbackSteps={fallbackSteps}
          title="Step-by-Step Guide"
          subtitle="Follow these form cues for best results"
          icon="📋"
        />
      );
    }
    return (
      <View style={[styles.errorBox, { borderColor: color + '30' }]}>
        <Text style={styles.errorIcon}>🎬</Text>
        <Text style={styles.errorTitle}>No tutorial available</Text>
        <Text style={styles.errorSub}>Search "{exerciseName} form" on YouTube</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.videoCard,
          { borderColor: color + '40', opacity: pressed ? 0.75 : 1 },
        ]}
        onPress={openVideo}
      >
        {/* Thumbnail placeholder with play icon */}
        <View style={[styles.thumbArea, { backgroundColor: color + '12' }]}>
          <View style={[styles.playButton, { borderColor: color, backgroundColor: color + '20' }]}>
            <Text style={[styles.playIcon, { color }]}>▶</Text>
          </View>
          <Text style={[styles.watchLabel, { color }]}>Watch on YouTube</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>📺 Form tutorial · opens YouTube</Text>
          <View style={[styles.curatedBadge, { borderColor: color + '40', backgroundColor: color + '15' }]}>
            <Text style={[styles.curatedText, { color }]}>✓ Curated</Text>
          </View>
        </View>
      </Pressable>

      {/* Show step guide below if available */}
      {fallbackSteps && fallbackSteps.length > 0 && (
        <StepGuide
          color={color}
          fallbackSteps={fallbackSteps}
          title="Step-by-Step Guide"
          subtitle="Follow these form cues for best results"
          icon="📋"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 10,
  },
  videoCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  thumbArea: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 22,
    marginLeft: 4,
  },
  watchLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  curatedBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  curatedText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  errorBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    gap: 6,
  },
  errorIcon: { fontSize: 32 },
  errorTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  errorSub: { fontSize: 12, color: COLORS.textMuted },
  fallbackBox: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: COLORS.surface,
    padding: 14,
    gap: 12,
  },
  fallbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fallbackIcon: { fontSize: 24 },
  fallbackTitle: { fontSize: 13, fontWeight: '700' },
  fallbackSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  fallbackSteps: { gap: 8 },
  fallbackStep: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  fallbackNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  fallbackNumText: { fontSize: 11, fontWeight: '800' },
  fallbackStepText: { flex: 1, fontSize: 12, color: COLORS.text, lineHeight: 18 },
});
