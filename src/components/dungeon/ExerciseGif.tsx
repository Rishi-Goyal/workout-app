/**
 * ExerciseGif — displays an exercise animation or image.
 *
 * v4.2.0 Theme B priority:
 *   1. Bundled local asset via `resolveGif(exerciseId)` (instant, offline)
 *   2. Static animationUrl baked into the Exercise object (instant, online)
 *   3. Runtime fetch from ExerciseDB API (last resort, network)
 *   4. null — caller shows ExerciseVideo / steps instead
 */
import { useState, useEffect, useMemo } from 'react';
import { View, Image, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { fetchExerciseGif, resolveGif } from '@/lib/exerciseGifs';
import { COLORS } from '@/lib/constants';

interface ExerciseGifProps {
  /** Preferred — keys the local manifest. v4.2.0+ callers should always pass this. */
  exerciseId?: string;
  /** Static URL baked into the Exercise — used when local lookup misses. */
  animationUrl?: string;
  /** Last-resort: API search by display name. */
  exerciseName: string;
}

type State = 'loading' | 'loaded' | 'empty';

type LocalSrc = { kind: 'local'; module: number };
type RemoteSrc = { kind: 'remote'; uri: string };
type Src = LocalSrc | RemoteSrc | null;

export default function ExerciseGif({ exerciseId, animationUrl, exerciseName }: ExerciseGifProps) {
  // 1. Local-first — synchronous, no flicker.
  const localSrc = useMemo<LocalSrc | null>(() => {
    const r = resolveGif(exerciseId);
    return r?.source === 'local' ? { kind: 'local', module: r.value } : null;
  }, [exerciseId]);

  const [state, setState] = useState<State>(
    localSrc || animationUrl ? 'loaded' : 'loading',
  );
  const [src, setSrc] = useState<Src>(
    localSrc ?? (animationUrl ? { kind: 'remote', uri: animationUrl } : null),
  );

  useEffect(() => {
    // Local hit — done.
    if (localSrc) {
      setState('loaded');
      setSrc(localSrc);
      return;
    }
    // Static URL hit — done.
    if (animationUrl) {
      setState('loaded');
      setSrc({ kind: 'remote', uri: animationUrl });
      return;
    }

    let cancelled = false;
    setState('loading');
    setSrc(null);

    fetchExerciseGif(exerciseName).then((url) => {
      if (cancelled) return;
      if (url) {
        setSrc({ kind: 'remote', uri: url });
        setState('loaded');
      } else {
        setState('empty');
      }
    });

    return () => { cancelled = true; };
  }, [localSrc, animationUrl, exerciseName]);

  if (state === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
        <Text style={styles.loadingText}>Loading preview…</Text>
      </View>
    );
  }

  if (state === 'loaded' && src) {
    const isLocal = src.kind === 'local';
    const imageSource = isLocal ? src.module : { uri: src.uri };
    const isGif = isLocal
      ? true // local manifest only includes media; treat as animated
      : src.uri.endsWith('.gif');
    const label = isLocal
      ? 'BUNDLED · OFFLINE READY'
      : isGif
        ? 'ANIMATED · ExerciseDB'
        : 'EXERCISE GUIDE';
    return (
      <View style={styles.gifContainer}>
        <Image
          source={imageSource}
          style={styles.gif}
          resizeMode="contain"
        />
        <Text style={styles.sourceLabel}>{label}</Text>
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
