/**
 * ExerciseGif — displays an exercise animation or image.
 *
 * Priority:
 *   1. Static animationUrl baked into the Exercise object (instant, no network)
 *   2. Runtime fetch from ExerciseDB API (for the few exercises without a static URL)
 *   3. null — caller shows ExerciseVideo / steps instead
 */
import { useState, useEffect } from 'react';
import { View, Image, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { fetchExerciseGif } from '@/lib/exerciseGifs';
import { COLORS } from '@/lib/constants';

interface ExerciseGifProps {
  animationUrl?: string;   // static URL from exercise object — renders instantly
  exerciseName: string;    // fallback: used for runtime API search
}

type State = 'loading' | 'loaded' | 'empty';

export default function ExerciseGif({ animationUrl, exerciseName }: ExerciseGifProps) {
  const [state, setState] = useState<State>(animationUrl ? 'loaded' : 'loading');
  const [gifUrl, setGifUrl] = useState<string | null>(animationUrl ?? null);

  useEffect(() => {
    // Static URL already available — nothing to fetch
    if (animationUrl) {
      setState('loaded');
      setGifUrl(animationUrl);
      return;
    }

    let cancelled = false;
    setState('loading');
    setGifUrl(null);

    fetchExerciseGif(exerciseName).then((url) => {
      if (cancelled) return;
      setState(url ? 'loaded' : 'empty');
      if (url) setGifUrl(url);
    });

    return () => { cancelled = true; };
  }, [animationUrl, exerciseName]);

  if (state === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
        <Text style={styles.loadingText}>Loading preview…</Text>
      </View>
    );
  }

  if (state === 'loaded' && gifUrl) {
    const isGif = gifUrl.endsWith('.gif');
    return (
      <View style={styles.gifContainer}>
        <Image
          source={{ uri: gifUrl }}
          style={styles.gif}
          resizeMode="contain"
        />
        <Text style={styles.sourceLabel}>{isGif ? 'ANIMATED · ExerciseDB' : 'EXERCISE GUIDE'}</Text>
      </View>
    );
  }

  // No media available — caller shows ExerciseVideo / steps instead
  return null;
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 180,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  gifContainer: {
    alignItems: 'center',
    gap: 8,
  },
  gif: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  sourceLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
});
