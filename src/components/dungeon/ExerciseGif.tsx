/**
 * ExerciseGif — displays an exercise animation or image.
 *
 * Priority order:
 *   1. Bundled local asset via `resolveGif(exerciseId)` (instant, offline)
 *   2. Static animationUrl baked into the Exercise object (instant, online)
 *   3. Runtime fetch from ExerciseDB API (last resort, network)
 *   4. v4.5.0 — SVG silhouette via <ExerciseIcon> (was: return null). Ensures
 *      the Guide tab is never visually empty for the handful of warmups
 *      (Cobra, Box Breathing, Jumping Jacks, High-Knee March) where no
 *      honest cousin asset exists in our bundled set.
 */
import { useState, useEffect, useMemo } from 'react';
import { View, Image, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { fetchExerciseGif, resolveGif, isRemoteFetchBlocked } from '@/lib/exerciseGifs';
import { COLORS } from '@/lib/constants';
import ExerciseIcon from '@/components/dungeon/ExerciseIcon';

interface ExerciseGifProps {
  /** Preferred — keys the local manifest. v4.2.0+ callers should always pass this. */
  exerciseId?: string;
  /** Static URL baked into the Exercise — used when local lookup misses. */
  animationUrl?: string;
  /** Last-resort: API search by display name. */
  exerciseName: string;
  /**
   * v4.5.0 — warmup `kind` from warmupDatabase ('static' | 'dynamic' | 'activation').
   * Drives the SVG fallback glyph choice when no image is available.
   * Optional; defaults to 'static' inside ExerciseIcon when absent.
   */
  fallbackKind?: 'static' | 'dynamic' | 'activation';
}

type State = 'loading' | 'loaded' | 'empty';

type LocalSrc = { kind: 'local'; module: number };
type RemoteSrc = { kind: 'remote'; uri: string };
type Src = LocalSrc | RemoteSrc | null;

export default function ExerciseGif({ exerciseId, animationUrl, exerciseName, fallbackKind }: ExerciseGifProps) {
  // 1. Local-first — synchronous, no flicker.
  const localSrc = useMemo<LocalSrc | null>(() => {
    const r = resolveGif(exerciseId);
    return r?.source === 'local' ? { kind: 'local', module: r.value } : null;
  }, [exerciseId]);

  // v4.5.2 — start in 'empty' immediately for blocklisted names (Wall
  // Push-Up etc.) so the loading spinner never appears. QA on v4.5.1
  // saw the spinner stay visible even though fetchExerciseGif's blocklist
  // check returns null in a microtask — short-circuit at mount removes
  // any chance of a render race.
  const blockedRemote = useMemo(() => isRemoteFetchBlocked(exerciseName), [exerciseName]);
  const initialState: State = localSrc || animationUrl
    ? 'loaded'
    : blockedRemote ? 'empty' : 'loading';
  const [state, setState] = useState<State>(initialState);
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
    // Blocklisted name — never enter loading, go straight to empty.
    if (blockedRemote) {
      setState('empty');
      setSrc(null);
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
  }, [localSrc, animationUrl, exerciseName, blockedRemote]);

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

  // v4.5.0 — no media available. Render an SVG silhouette so the panel is
  // never visually empty. The caller can still rely on the Form Tips card
  // + step-by-step instructions for full guidance.
  return <ExerciseIcon kind={fallbackKind} exerciseName={exerciseName} />;
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
