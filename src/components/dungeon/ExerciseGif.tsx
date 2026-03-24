/**
 * ExerciseGif — loads and displays a real exercise GIF from ExerciseDB API.
 * Falls back gracefully to the stick-figure ExerciseAnimator if no GIF is found.
 */
import { useState, useEffect } from 'react';
import { View, Image, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { fetchExerciseGif } from '@/lib/exerciseGifs';
import ExerciseAnimator from './ExerciseAnimator';
import { COLORS } from '@/lib/constants';
import type { MuscleGroup } from '@/types';

interface ExerciseGifProps {
  exerciseName: string;
  muscles: MuscleGroup[];
}

type State = 'loading' | 'loaded' | 'fallback';

export default function ExerciseGif({ exerciseName, muscles }: ExerciseGifProps) {
  const [state, setState] = useState<State>('loading');
  const [gifUrl, setGifUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setGifUrl(null);

    fetchExerciseGif(exerciseName).then((url) => {
      if (cancelled) return;
      if (url) {
        setGifUrl(url);
        setState('loaded');
      } else {
        setState('fallback');
      }
    });

    return () => { cancelled = true; };
  }, [exerciseName]);

  if (state === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
        <Text style={styles.loadingText}>Loading exercise...</Text>
      </View>
    );
  }

  if (state === 'loaded' && gifUrl) {
    return (
      <View style={styles.gifContainer}>
        <Image
          source={{ uri: gifUrl }}
          style={styles.gif}
          resizeMode="contain"
        />
        <Text style={styles.sourceLabel}>ExerciseDB</Text>
      </View>
    );
  }

  // Fallback to stick figure animator
  return <ExerciseAnimator exerciseName={exerciseName} muscles={muscles} />;
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
    width: 240,
    height: 240,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  sourceLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
});
