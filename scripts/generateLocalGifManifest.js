#!/usr/bin/env node
/**
 * generateLocalGifManifest — v4.2.0 Theme B.
 *
 * Scans `assets/exercises/` for downloaded GIF/JPG/PNG files (one per
 * exerciseId) and emits `src/lib/localGifManifest.ts`. Each entry maps an
 * exerciseId to a `require()` call so Metro bundles the asset into the APK.
 *
 * Run after `curateExerciseGifs.js` (or whenever you've manually added /
 * updated bundled assets). Idempotent — safe to re-run.
 *
 * Usage:
 *   node scripts/generateLocalGifManifest.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ASSET_DIR = path.join(ROOT, 'assets', 'exercises');
const OUT_PATH = path.join(ROOT, 'src', 'lib', 'localGifManifest.ts');

// File extensions we treat as bundleable media. Order matters: the first
// matching extension for an exerciseId wins.
const EXT_PRIORITY = ['gif', 'webp', 'png', 'jpg', 'jpeg'];

// v4.4.x — alias map. Where one exerciseId is the *same physical movement*
// (or close enough that the visual is honest) as an exerciseId we already
// bundle, we point the alias at the existing asset rather than duplicating
// the file. Metro deduplicates the require()s automatically. Listed here so
// the manifest generator picks them up alongside the directory scan.
const ASSET_ALIASES = {
  // ── Warmup → lift (same movement, just a warmup vs working set) ─────────
  'wu-wall-pushup':         'wall-push-up',
  'wu-good-morning':        'good-morning',
  'wu-dead-hang':           'dead-hang',          // identical isometric hang
  'wu-plank-reach':         'plank',              // same prone hand-contact hold

  // ── Lift → lift (identical visual or close family — fills v4.4.x gaps
  //   for exercises that were missing from ANIMATION_URLS originally) ────
  'pause-squat':            'barbell-back-squat', // same exercise, paused tempo
  'single-leg-hip-thrust':  'hip-thrust',         // same setup, one leg
  'hanging-knee-raise':     'hanging-leg-raise',  // same hang, smaller ROM

  // ── v4.5.0 PR 3/3 — close-cousin reuse for warmups. Strict honesty bar:
  //   alias ONLY when the substitute asset depicts the same body position
  //   AND the same movement family. Different-position or different-intent
  //   pairs (e.g. supine vs prone, stretch vs rotation) fall through to
  //   the SVG silhouette in ExerciseGif — better placeholder than wrong
  //   picture. This was tightened in response to a PR #49 Codex P2 that
  //   caught `hollow-body-hold → plank` (supine vs prone) — a class-of-bug
  //   warning that I'd been too generous elsewhere. Pruned set below.
  'wu-plank-reach':         'plank',              // plank-with-arm-reach is a plank
  'wu-calf-pump':           'standing-calf-raise',// bouncing through ankles IS a calf raise
  'wu-shoulder-roll':       'wu-arm-circles',     // both rotational shoulder mobility
  'wu-standing-forward':    'wu-hamstring-stretch',// standing forward fold IS hamstring stretch
  'wu-thoracic-rotation':   'wu-cat-cow',         // both quadruped spine flow
  'wu-tricep-swing':        'wu-arm-circles',     // both arm-swinging overhead
  'wu-wrist-flexor':        'wu-wrist-circle',    // same wrist position + motion family
  'wu-ytw-raise':           'wu-arm-circles',     // shoulder-activation arm movements
  'wu-hip-opener':          'wu-walking-lunge',   // World's Greatest Stretch starts as a lunge

  // Intentionally NOT aliased — falls through to SVG silhouette:
  //   hollow-body-hold     supine; plank is prone (Codex flagged on PR #49)
  //   wu-birddog           quadruped, not supine like dead-bug
  //   wu-cobra             prone back extension — no analog
  //   wu-couch-stretch     rear-foot-elevated quad — different from standing quad stretch
  //   wu-cross-body        shoulder stretch, not arm rotation
  //   wu-deep-breathing    no movement to depict
  //   wu-downward-dog      V-shape inversion, not kneeling like child's pose
  //   wu-figure-four       supine knee-pull, distinct from supine twist
  //   wu-jumping-jacks     cardio bounce — no good single frame
  //   wu-leg-swing         standing pendulum, not forward step
  //   wu-march-in-place    high-knee standing — no good frame
  //   wu-pigeon            seated front-shin fold, not kneeling
};

function main() {
  if (!fs.existsSync(ASSET_DIR)) {
    console.warn(
      `assets/exercises/ does not exist — emitting empty manifest. ` +
      `Run \`node scripts/curateExerciseGifs.js\` first to populate it.`,
    );
    fs.mkdirSync(ASSET_DIR, { recursive: true });
  }

  // Build idsToFile = { 'push-up': 'push-up.gif', ... }
  const files = fs.existsSync(ASSET_DIR) ? fs.readdirSync(ASSET_DIR) : [];
  const byId = new Map();
  for (const file of files) {
    const m = file.match(/^([a-z0-9-]+)\.([a-z]+)$/i);
    if (!m) continue;
    const [, id, ext] = m;
    if (!EXT_PRIORITY.includes(ext.toLowerCase())) continue;
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, file);
      continue;
    }
    // Pick the higher-priority extension if duplicates exist.
    const existingExt = existing.split('.').pop().toLowerCase();
    if (EXT_PRIORITY.indexOf(ext.toLowerCase()) < EXT_PRIORITY.indexOf(existingExt)) {
      byId.set(id, file);
    }
  }

  // Add aliases that resolve to existing assets in byId.
  for (const [aliasId, sourceId] of Object.entries(ASSET_ALIASES)) {
    if (byId.has(sourceId) && !byId.has(aliasId)) {
      byId.set(aliasId, byId.get(sourceId));
    }
  }

  const ids = Array.from(byId.keys()).sort();
  const lines = [
    '/**',
    ' * localGifManifest — v4.2.0 Theme B.',
    ' *',
    ' * AUTOGENERATED by scripts/generateLocalGifManifest.js — DO NOT EDIT.',
    ' *',
    ' * Maps exerciseId → Metro asset module reference for the bundled',
    ' * exercise GIFs in assets/exercises/. Local-first lookup happens in',
    ' * `resolveGif()` (src/lib/exerciseGifs.ts).',
    ' */',
    '',
    // No timestamp — keeps the file byte-stable across reruns so re-running
    // the script never produces a spurious diff (same idempotency principle
    // applied to wgerData.ts in PR #47).
    `// Generated from ${ids.length} bundled assets.`,
    '',
    'export const LOCAL_GIF_MANIFEST: Record<string, number> = {',
    ...ids.map((id) => `  '${id}': require('../../assets/exercises/${byId.get(id)}'),`),
    '};',
    '',
  ];

  fs.writeFileSync(OUT_PATH, lines.join('\n'));
  console.log(`Wrote ${OUT_PATH} (${ids.length} entries)`);
}

main();
