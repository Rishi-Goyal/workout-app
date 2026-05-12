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
import { LOCAL_GIF_KINDS } from '@/lib/localGifManifest';
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
   * v4.6.0 — also drives a small "FIRST POSITION" disclosure overlay
   * when the kind is 'dynamic' but the bundled visual is a still image.
   * The user knows they're looking at a snapshot, not the full movement.
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
    // v4.6.0 — for the local-bundled path we treat .gif/.webp as animated
    // and .jpg/.png as still. The previous `isLocal ? true` was inaccurate
    // (~half our bundled assets are .jpg stills). LOCAL_GIF_KINDS — emitted
    // by scripts/generateLocalGifManifest.js — tells us per-id.
    const localAssetIsAnimated = isLocal
      ? exerciseId !== undefined && LOCAL_GIF_KINDS[exerciseId] === 'animated'
      : src.uri.endsWith('.gif');
    // v4.6.0 — for `kind: 'dynamic'` warmups whose visual is a still
    // image, surface a small overlay so the user knows the picture is
    // a snapshot of the start position, not the full movement. The
    // curated multi-step instructions in the Form Tips card carry the
    // actual tempo/breathing/alternation guidance.
    const showFirstPositionDisclosure =
      fallbackKind === 'dynamic' && !localAssetIsAnimated;
    const label = isLocal
      ? localAssetIsAnimated
        ? 'BUNDLED · ANIMATED · OFFLINE READY'
        : 'BUNDLED · OFFLINE READY'
      : localAssetIsAnimated
        ? 'ANIMATED · ExerciseDB'
        : 'EXERCISE GUIDE';
    return (
      <View style={styles.gifContainer}>
        <View style={styles.imageWrap}>
          <Image
            source={imageSource}
            style={styles.gif}
            resizeMode="contain"
          />
          {showFirstPositionDisclosure && (
            <View style={styles.dynamicBadge}>
              <Text style={styles.dynamicBadgeText}>FIRST POSITION · MOVEMENT ALTERNATES</Text>
            </View>
          )}
        </View>
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
  imageWrap: {
    width: '100%',
    position: 'relative',
  },
  gif: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  // v4.6.0 — overlay badge for dynamic exercises whose bundled visual is
  // a still image. Sits along the bottom edge of the image, semi-transparent
  // gold so the user notices but isn't visually overwhelmed.
  dynamicBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(7,6,26,0.85)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  dynamicBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: COLORS.gold,
  },
  sourceLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
});
