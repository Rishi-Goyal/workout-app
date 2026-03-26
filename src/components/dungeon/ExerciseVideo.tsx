/**
 * ExerciseVideo — embeds a YouTube form tutorial video for any exercise.
 *
 * Uses curated video IDs for key exercises.
 * For all other exercises shows a step-by-step text guide instead of a
 * broken search embed (YouTube removed the listType=search embed feature).
 */
import { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
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

// Well-known form tutorial video IDs for key exercises
// (fallback to search for everything else)
const CURATED_VIDEOS: Record<string, string> = {
  // Chest
  'push-up':               'IODxDxX7oi4',  // Jeff Nippard push-up guide
  'barbell-bench-press':   'vcBig73ojpE',  // Jeff Nippard bench press
  'dumbbell-bench-press':  'VmB1G1K7v94',  // ScottHermanFitness DB bench
  'incline-dumbbell-press':'8iPEnn-ltC8',  // Jeff Nippard incline press
  'weighted-dip':          'yN6Q1UI_xr0',  // Alan Thrall weighted dip

  // Back
  'deadlift':              'op9kVnSso6Q',  // Alan Thrall deadlift
  'pull-up':               'eGo4IYlbE5g',  // Calisthenics Movement pull-up
  'barbell-bent-over-row': 'kBWAon7ItDw',  // Jeff Nippard bent over row
  'lat-pulldown':          'CAwf7n6Luuc',  // ScottHermanFitness lat pulldown
  'dumbbell-row':          'roCP2_pNLuI',  // Jeff Nippard DB row
  'dead-hang':             'HoE-C85ZlCE',  // dead hang tutorial
  'romanian-deadlift':     'JCXUYuzwNrM',  // Jeff Nippard RDL

  // Shoulders
  'barbell-overhead-press':'_RlRDWO2jfg',  // Jeff Nippard OHP
  'lateral-raise':         'XPPfnSEATJA',  // Jeff Nippard lateral raise
  'face-pull':             'HSoHeSjFJEA',  // Jeff Nippard face pull

  // Legs
  'barbell-back-squat':    'Dy28eq2PjcM',  // Jeff Nippard squat
  'front-squat':           'uYumuL_G_V0',  // Alan Thrall front squat
  'hip-thrust':            'xDmFkJxPzeM',  // Jeff Nippard hip thrust
  'bulgarian-split-squat': 'kkdqbdwbOpQ',  // Jeff Nippard BSS
  'nordic-curl':           '5_SnJN5AQBU',  // Nordic curl tutorial

  // Arms
  'barbell-curl':          'kwG2ipFRgfo',  // Jeff Nippard bicep curl
  'skull-crusher':         'NIKnFGLKqnM',  // skull crusher tutorial

  // Core
  'plank':                 'ASdvN_XEl_c',  // Athlean-X plank
  'hollow-body-hold':      'LlDNef_Ztsc',  // hollow body hold
  'ab-wheel-rollout':      'aHQXdvFQ3lg',  // ab wheel tutorial
  'hanging-leg-raise':     'Pr1ieGZ5atk',  // hanging leg raise
};

interface ExerciseVideoProps {
  exerciseId: string;
  exerciseName: string;
  muscles: MuscleGroup[];
  /** Step-by-step instructions shown when offline / video unavailable */
  fallbackSteps?: string[];
}

// Inline HTML for the curated YouTube embed to avoid CORS issues in WebView
// Uses youtube-nocookie.com to avoid cookie consent + Error 153 on Android WebView
function buildEmbedHtml(exerciseName: string, videoId: string): string {
  const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&modestbranding=1&rel=0&color=white&playsinline=1&origin=https://dungeonfit.app`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #080610; overflow: hidden; }
    .container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <div class="container">
    <iframe
      src="${embedSrc}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    ></iframe>
  </div>
</body>
</html>`;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const type = inferExerciseType(exerciseName, muscles);
  const color = TYPE_COLOR[type];
  const videoId = CURATED_VIDEOS[exerciseId];

  // No curated video: show step guide immediately (avoids deprecated search embed)
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

  const html = buildEmbedHtml(exerciseName, videoId);

  if (error) {
    // Offline fallback: show step-by-step instructions if available
    if (fallbackSteps && fallbackSteps.length > 0) {
      return (
        <StepGuide
          color={color}
          fallbackSteps={fallbackSteps}
          title="Offline — Text Guide"
          subtitle="Video unavailable without connection"
          icon="📵"
        />
      );
    }
    return (
      <View style={[styles.errorBox, { borderColor: color + '30' }]}>
        <Text style={styles.errorIcon}>🎬</Text>
        <Text style={styles.errorTitle}>Video unavailable</Text>
        <Text style={styles.errorSub}>Check your internet connection</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.videoWrapper, { borderColor: color + '40' }]}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={color} />
            <Text style={[styles.loadingText, { color }]}>Loading video...</Text>
          </View>
        )}
        <WebView
          style={styles.webview}
          source={{ html }}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
      </View>
      <View style={styles.sourceRow}>
        <Text style={styles.sourceText}>📺 YouTube · Form tutorial</Text>
        <View style={[styles.curatedBadge, { borderColor: color + '40', backgroundColor: color + '15' }]}>
          <Text style={[styles.curatedText, { color }]}>✓ Curated</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 8,
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#080610',
    borderWidth: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#080610',
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080610',
    zIndex: 10,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '600',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sourceText: {
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

  // Offline text fallback
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
