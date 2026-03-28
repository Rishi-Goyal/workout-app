/**
 * ExerciseVideo — shows a real YouTube thumbnail and opens the video in an
 * in-app Chrome Custom Tab (expo-web-browser) so the user never leaves the app.
 *
 * WebView was dropped because react-native-webview is incompatible with
 * RN 0.83 bridgeless/Fabric. expo-web-browser's openBrowserAsync() uses
 * Android Chrome Custom Tabs — a native activity that slides up over the app.
 */
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
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
}


export default function ExerciseVideo({ exerciseId, exerciseName, muscles }: ExerciseVideoProps) {
  const type = inferExerciseType(exerciseName, muscles);
  const color = TYPE_COLOR[type];
  const videoId = CURATED_VIDEOS[exerciseId];

  const openVideo = async () => {
    // Chrome Custom Tab slides up over the app — user watches and taps back
    await WebBrowser.openBrowserAsync(`https://www.youtube.com/watch?v=${videoId}`, {
      toolbarColor: '#0d0a0e',
      controlsColor: '#6366f1',
      showTitle: true,
      enableBarCollapsing: true,
    });
  };

  // No curated video — return nothing; InstructionsPanel handles the text guide
  if (!videoId) return null;

  // YouTube thumbnail — always available at hqdefault (480×360)
  const thumbnailUri = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.videoCard,
        { borderColor: color + '40', opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={openVideo}
    >
      {/* Real YouTube thumbnail */}
      <View style={styles.thumbWrapper}>
        <Image
          source={{ uri: thumbnailUri }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        {/* Dark overlay + play button centred on the thumbnail */}
        <View style={styles.thumbOverlay}>
          <View style={[styles.playButton, { borderColor: '#fff', backgroundColor: 'rgba(0,0,0,0.55)' }]}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        </View>
        {/* Bottom label */}
        <View style={styles.thumbLabel}>
          <Text style={styles.thumbLabelText}>Tap to watch · opens in-app</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerText}>📺 Form tutorial · curated for this exercise</Text>
        <View style={[styles.curatedBadge, { borderColor: color + '40', backgroundColor: color + '15' }]}>
          <Text style={[styles.curatedText, { color }]}>✓ Curated</Text>
        </View>
      </View>
    </Pressable>
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
  thumbWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#111',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 24,
    color: '#fff',
    marginLeft: 4,
  },
  thumbLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  thumbLabelText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    letterSpacing: 0.3,
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
  // No-video fallback — animated preview banner
  noVideoBox: { width: '100%', gap: 12 },
  noVideoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noVideoIcon:  { fontSize: 20 },
  noVideoTitle: { fontSize: 12, fontWeight: '700' },
  noVideoSub:   { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
});
