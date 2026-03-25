/**
 * ExerciseVideo — embeds a YouTube form tutorial video for any exercise.
 *
 * Uses a YouTube search embed so it always finds the most relevant
 * professional form video without needing a curated ID list.
 * Falls back to a branded placeholder if WebView fails.
 */
import { useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
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
}

function buildYouTubeEmbedUrl(exerciseName: string, videoId?: string): string {
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&modestbranding=1&rel=0&showinfo=0&color=white`;
  }
  // YouTube search embed — finds most relevant form tutorial automatically
  const query = encodeURIComponent(`${exerciseName} proper form technique`);
  return `https://www.youtube.com/results?search_query=${query}&sp=EgIQAQ%253D%253D`;
}

// Inline HTML for the YouTube embed to avoid CORS issues in WebView
function buildEmbedHtml(exerciseName: string, videoId?: string): string {
  // Use youtube-nocookie.com to avoid cookie consent + Error 153 on Android WebView
  const embedSrc = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&modestbranding=1&rel=0&color=white&playsinline=1&origin=https://dungeonfit.app`
    : `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(exerciseName + ' proper form tutorial')}&autoplay=0&modestbranding=1&rel=0&playsinline=1&origin=https://dungeonfit.app`;

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

export default function ExerciseVideo({ exerciseId, exerciseName, muscles }: ExerciseVideoProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const type = inferExerciseType(exerciseName, muscles);
  const color = TYPE_COLOR[type];
  const videoId = CURATED_VIDEOS[exerciseId];
  const html = buildEmbedHtml(exerciseName, videoId);

  if (error) {
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
        {videoId && <View style={[styles.curatedBadge, { borderColor: color + '40', backgroundColor: color + '15' }]}>
          <Text style={[styles.curatedText, { color }]}>✓ Curated</Text>
        </View>}
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
});
