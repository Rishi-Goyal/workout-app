/**
 * Version checking utilities — fetches the latest release from GitHub and
 * compares it against the currently installed app version.
 *
 * All functions fail gracefully: no exceptions bubble up to the caller.
 */
import Constants from 'expo-constants';
// package.json is always bundled — reliable in dev, Expo Go, and production APKs
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PKG_VERSION: string = (require('../../package.json') as { version: string }).version;

const REPO = 'Rishi-Goyal/workout-app';

export const GITHUB_API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
export const RELEASES_URL   = `https://github.com/${REPO}/releases/latest`;

// ─── Local version ────────────────────────────────────────────────────────────

/** Current app version — package.json is the canonical source. */
export function getCurrentVersion(): string {
  return PKG_VERSION || Constants.expoConfig?.version || '0.0.0';
}

/** Direct link to the GitHub releases page. */
export function getReleasesUrl(): string {
  return RELEASES_URL;
}

// ─── Remote version ───────────────────────────────────────────────────────────

/**
 * Fetches the latest published release tag from GitHub.
 * Returns the version string (e.g. "2.1.0") with the leading 'v' stripped.
 * Returns null on any network / API error so the caller can silently ignore it.
 */
export async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { tag_name?: string };
    const raw = (data.tag_name ?? '').replace(/^v/, '');
    return raw || null;
  } catch {
    // Offline, DNS failure, rate-limited — silently return null
    return null;
  }
}

// ─── Version comparison ───────────────────────────────────────────────────────

/**
 * Returns true if `latest` is strictly newer than `current`.
 * Handles MAJOR.MINOR.PATCH semver only.
 * Pre-release strings (e.g. "2.0.0-beta") are rejected and return false.
 */
export function compareVersions(current: string, latest: string): boolean {
  const isRelease = (v: string) => /^\d+\.\d+\.\d+$/.test(v);
  if (!isRelease(current) || !isRelease(latest)) return false;

  const parse = (v: string): [number, number, number] =>
    v.split('.').map((n) => parseInt(n, 10)) as [number, number, number];

  const [cMaj, cMin, cPat] = parse(current);
  const [lMaj, lMin, lPat] = parse(latest);

  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}
