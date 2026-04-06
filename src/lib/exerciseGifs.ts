/**
 * Exercise GIF service — fetches animated GIFs from ExerciseDB API (free, no auth).
 * Falls back to Free Exercise DB static images on GitHub CDN.
 *
 * ExerciseDB API: https://exercisedb-api.vercel.app
 * Free Exercise DB images: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/
 */

const EXERCISEDB_BASE = 'https://exercisedb-api.vercel.app/api/v1';
const FREE_DB_BASE    = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

interface ExerciseDBResult {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

// In-memory cache to avoid re-fetching
const gifCache = new Map<string, string | null>();

/** Create an AbortSignal that times out after ms — Hermes-safe (no AbortSignal.timeout). */
function makeTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/** Normalise an exercise name into a search-friendly slug. */
function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

/** Score how well an API result name matches the query. Higher = better. */
function matchScore(query: string, result: string): number {
  const q = normalise(query);
  const r = normalise(result);
  if (r === q) return 100;
  if (r.startsWith(q)) return 80;
  if (r.includes(q)) return 60;
  const qWords = q.split(' ');
  const matchedWords = qWords.filter(w => r.includes(w));
  return (matchedWords.length / qWords.length) * 40;
}

/**
 * Fetch a GIF URL for the given exercise name.
 * Returns a URL string, or null if not found.
 */
export async function fetchExerciseGif(exerciseName: string): Promise<string | null> {
  const cacheKey = normalise(exerciseName);
  if (gifCache.has(cacheKey)) return gifCache.get(cacheKey)!;

  try {
    const encodedName = encodeURIComponent(normalise(exerciseName));
    const res = await fetch(
      `${EXERCISEDB_BASE}/exercises/search?q=${encodedName}&limit=5`,
      { signal: makeTimeoutSignal(5000) },
    );
    if (res.ok) {
      const data = await res.json();
      const exercises: ExerciseDBResult[] = data?.exercises ?? data?.data ?? [];
      if (exercises.length > 0) {
        const best = exercises.reduce((a, b) =>
          matchScore(exerciseName, a.name) >= matchScore(exerciseName, b.name) ? a : b,
        );
        if (best.gifUrl) {
          gifCache.set(cacheKey, best.gifUrl);
          return best.gifUrl;
        }
      }
    }
  } catch {
    // Network error — fall through to fallback
  }

  // Fallback: Free Exercise DB static images on GitHub CDN
  try {
    const freeDbId = exerciseName
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('_');
    const url = `${FREE_DB_BASE}/${freeDbId}/0.jpg`;
    const res = await fetch(url, { method: 'HEAD', signal: makeTimeoutSignal(3000) });
    if (res.ok) {
      gifCache.set(cacheKey, url);
      return url;
    }
  } catch {
    // Ignore
  }

  gifCache.set(cacheKey, null);
  return null;
}
