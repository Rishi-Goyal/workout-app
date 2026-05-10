#!/usr/bin/env node
/**
 * curateExerciseDBData — v4.4.0.
 *
 * Pulls per-exercise instructions + secondary metadata from
 * free-exercise-db (https://github.com/yuhonas/free-exercise-db) for
 * every exerciseId in our database. Output: `src/lib/exerciseDBData.ts`.
 *
 * Resolution order per exerciseId:
 *   1. Direct match: parse `ANIMATION_URLS` for the JDLV-prefixed path
 *      (e.g. 'glute-bridge': JDLV + 'Barbell_Glute_Bridge/0.jpg' →
 *      free-exercise-db ID 'Barbell_Glute_Bridge').
 *   2. Name-based fuzzy match against the free-exercise-db catalogue
 *      (case-insensitive, slug-normalised) — covers EXDB-prefixed entries
 *      that don't have a direct ID mapping.
 *   3. Miss → exerciseId is omitted from the output. Callers fall back
 *      to whatever they had before (curated mistakes / hand-written steps).
 *
 * Why free-exercise-db instead of ExerciseDB API:
 *   The exercisedb-api.vercel.app deployment returns HTTP 402
 *   DEPLOYMENT_DISABLED as of v4.3.0 release. free-exercise-db is a
 *   static JSON catalogue on GitHub — 873 exercises, no rate limit, no
 *   payment required, instructions are equivalent in quality.
 *
 * Usage:
 *   node scripts/curateExerciseDBData.js
 *
 * Output:
 *   src/lib/exerciseDBData.ts  — generated TS module with EXERCISE_DB_DATA
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'src', 'lib', 'exerciseDatabase.ts');
const WARMUP_PATH = path.join(ROOT, 'src', 'lib', 'warmupDatabase.ts');
const OUT_PATH = path.join(ROOT, 'src', 'lib', 'exerciseDBData.ts');
const FREE_DB_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

// ---------------------------------------------------------------------------
// 1. Parse ANIMATION_URLS from the TS source to get our exerciseIds + the
//    JDLV-mapped subset (which has direct free-exercise-db IDs in the URL).
// ---------------------------------------------------------------------------

function loadOurIds() {
  const src = fs.readFileSync(DB_PATH, 'utf8');
  const block = src.match(/ANIMATION_URLS\s*:[^=]*=\s*\{([\s\S]*?)^\};/m);
  if (!block) throw new Error('ANIMATION_URLS block not found');
  const body = block[1];

  const ourIds = new Set();
  const directMap = {}; // ourId → free-exercise-db ID

  // JDLV pattern: 'our-id': JDLV + 'Their_Id/0.jpg',
  const jdlvRe = /['"]([a-z0-9-]+)['"]\s*:\s*JDLV\s*\+\s*['"]([^'"]+?)\/0\.(?:jpg|gif|png)['"]/g;
  let m;
  while ((m = jdlvRe.exec(body)) !== null) {
    ourIds.add(m[1]);
    directMap[m[1]] = m[2];
  }
  // EXDB pattern: 'our-id': EXDB + 'CODE.gif', — no direct mapping, fuzzy later.
  const exdbRe = /['"]([a-z0-9-]+)['"]\s*:\s*EXDB\s*\+/g;
  while ((m = exdbRe.exec(body)) !== null) {
    ourIds.add(m[1]);
  }

  // Also extract `name` for each exercise (for fuzzy matching). Walk the
  // exercise object literals: `id: 'wall-push-up',\n    name: 'Wall Push-Up',`
  const nameMap = {};
  const objRe = /\bid:\s*['"]([a-z0-9-]+)['"][\s\S]{0,200}?\bname:\s*['"]([^'"]+)['"]/g;
  while ((m = objRe.exec(src)) !== null) {
    nameMap[m[1]] = m[2];
  }

  // v4.4.x — also include warmup IDs from warmupDatabase.ts. Warmups don't
  // have JDLV/EXDB animation URLs (no GIF mapping), but free-exercise-db
  // does have static images for many of them (Cat-Cow → Cat_Stretch, etc.).
  // We add them to `ourIds` and to `nameMap`; resolution happens via the
  // WARMUP_OVERRIDES map below since warmup names rarely match by fuzzy.
  const warmupSrc = fs.readFileSync(WARMUP_PATH, 'utf8');
  const wuRe = /\bid:\s*['"](wu-[a-z0-9-]+)['"][\s\S]{0,200}?\bname:\s*['"]([^'"]+)['"]/g;
  while ((m = wuRe.exec(warmupSrc)) !== null) {
    ourIds.add(m[1]);
    nameMap[m[1]] = m[2];
  }

  return { ourIds: [...ourIds], directMap, nameMap };
}

// ---------------------------------------------------------------------------
// 2. Fetch free-exercise-db catalogue
// ---------------------------------------------------------------------------

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Manual override map — for our exerciseIds whose names don't fuzzy-match
// the free-exercise-db catalogue. Verified against the catalogue at
// curation time; safe to extend as new exercises are added.
// ---------------------------------------------------------------------------

const MANUAL_OVERRIDES = {
  // ── EXDB-prefixed entries (no JDLV path → fuzzy needs help) ───────────────
  'push-up': 'Pushups',
  'pull-up': 'Pullups',
  'wide-push-up': 'Push-Up_Wide',
  'diamond-push-up': 'Push-Ups_-_Close_Triceps_Position',
  'one-arm-push-up': 'Single-Arm_Push-Up',
  'australian-pull-up': 'Inverted_Row',
  'barbell-bench-press': 'Barbell_Bench_Press_-_Medium_Grip',
  'paused-bench-press': 'Bench_Press_-_Powerlifting',
  'incline-barbell-press': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'machine-chest-press': 'Machine_Bench_Press',
  'cable-chest-fly': 'Cable_Crossover',
  'dumbbell-fly': 'Dumbbell_Flyes',
  'lat-pulldown': 'Wide-Grip_Lat_Pulldown',

  // ── v4.4.0 P1 fixes — direct JDLV mapping pointed at the wrong variant ──
  // QA flagged these as actively wrong instructions (e.g. pike push-up
  // showing "hang from a pull-up bar" because JDLV mapped it to "Hanging
  // Pike"). Override with the semantically-equivalent free-exercise-db
  // entry, or DROP entirely if no acceptable analog exists.
  'deadlift':                 'Barbell_Deadlift',                       // was: Deadlift_with_Bands
  'lateral-raise':            'Side_Lateral_Raise',                     // was: Cable_Seated_Lateral_Raise
  'reverse-fly':              'Reverse_Flyes',                          // was: Cable_Rear_Delt_Fly
  'overhead-tricep-extension':'Overhead_Triceps',                       // was: Cable_Rope_Overhead_Triceps_Extension (we want the bodyweight extension)
  'weighted-dip':             'Dips_-_Triceps_Version',                 // was: Weighted_Bench_Dip (different exercise)
  'lunge':                    'Bodyweight_Walking_Lunge',               // was: Lunge_Pass_Through (kettlebell)
  'walking-lunge':            'Bodyweight_Walking_Lunge',               // was: Barbell_Walking_Lunge
  'step-up':                  'Step-up_with_Knee_Raise',                // was: Barbell_Step_Ups
  'glute-bridge':             'Bent-Knee_Hip_Raise',                    // was: Barbell_Glute_Bridge (we want bodyweight bilateral)
  'ab-wheel-rollout':         'Ab_Roller',                              // was: Barbell_Ab_Rollout
  'standing-ab-wheel':        'Ab_Roller',                              // was: Barbell_Ab_Rollout
  'leg-press-calf-raise':     'Calf_Press_On_The_Leg_Press_Machine',    // was: Leg_Press (different exercise)

  // ── v4.4.x — warmup quests (wu-* IDs from warmupDatabase.ts). Direct
  //    or near-exact matches in the free-exercise-db catalogue. Warmups
  //    without an entry here fall through to hand-curated multi-step
  //    instructions in WARMUP_CURATED_INSTRUCTIONS (exerciseMistakes.ts)
  //    or finally to the one-line cue in warmupDatabase.ts.
  'wu-arm-circles':       'Arm_Circles',
  'wu-band-pull-apart':   'Band_Pull_Apart',
  'wu-scap-pull':         'Scapular_Pull-Up',
  'wu-cat-cow':           'Cat_Stretch',
  'wu-wrist-circle':      'Wrist_Circles',
  'wu-deadbug':           'Dead_Bug',
  'wu-bodyweight-squat':  'Bodyweight_Squat',
  'wu-walking-lunge':     'Bodyweight_Walking_Lunge',
  'wu-glute-bridge':      'Bent-Knee_Hip_Raise',
  'wu-ankle-circle':      'Ankle_Circles',
  'wu-triceps-stretch':   'Triceps_Stretch',
  'wu-childs-pose':       "Childs_Pose",  // free-ex-db ID has no apostrophe
  'wu-quad-stretch':      'All_Fours_Quad_Stretch',
  'wu-hamstring-stretch': 'Hamstring_Stretch',
  'wu-calf-wall':         'Calf_Stretch_Hands_Against_Wall',
  'wu-supine-twist':      'Spinal_Stretch',

  // Loose matches — image illustrates the right pose, name differs slightly
  'wu-lat-stretch':       'Overhead_Lat',
  'wu-biceps-wall':       'Standing_Biceps_Stretch',
  'wu-doorway-stretch':   'Behind_Head_Chest_Stretch',
};

// Explicit drops — these exerciseIds have NO acceptable free-exercise-db
// analog. Without an override, fuzzy matching would point at a different
// movement pattern (e.g. pike-push-up → Hanging Pike). Better to hide the
// Watch Out / Form Tips card entirely than ship guidance for a different
// exercise. Curated mistakes (exerciseMistakes.ts) still apply for any of
// these that have hand-written entries.
const MANUAL_DROPS = new Set([
  'arnold-press',          // free-ex-db only has Kettlebell_Arnold_Press; we want dumbbell
  'pike-push-up',          // closest is "Hanging Pike" — different movement
  'elevated-pike-push-up', // same — no analog
  'upright-row',           // only band / smith-machine variants; we want barbell upright row
  'skull-crusher',         // only "Decline Close-Grip Bench To Skull Crusher" combo movement
  'tricep-pushdown-band',  // catalogue only has cable pushdowns; bands are functionally different
  'resistance-band-curl',  // no clean band-only curl in catalogue
  'single-leg-rdl',        // no single-leg variant; matching plain RDL would be misleading
  'sissy-squat',           // only Weighted_Sissy_Squat exists; beginner sissy squat is bodyweight
]);

// ---------------------------------------------------------------------------
// 3. Fuzzy name match for the EXDB-mapped entries
// ---------------------------------------------------------------------------

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function fuzzyFind(ourName, fdbBySlug) {
  const target = slug(ourName);
  // Exact slug match
  if (fdbBySlug.has(target)) return fdbBySlug.get(target);
  // Try with "ups" plural (free-ex-db often uses "Push-Ups" not "Push Up")
  if (fdbBySlug.has(target + 's')) return fdbBySlug.get(target + 's');
  if (target.endsWith('s') && fdbBySlug.has(target.slice(0, -1))) {
    return fdbBySlug.get(target.slice(0, -1));
  }
  // Try removing common modifiers
  const stripped = target.replace(/^(barbell|dumbbell|cable|machine|seated|standing|incline|decline)-/, '');
  if (fdbBySlug.has(stripped)) return fdbBySlug.get(stripped);
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { ourIds, directMap, nameMap } = loadOurIds();
  console.log(`Loaded ${ourIds.length} exerciseIds (${Object.keys(directMap).length} with direct JDLV mapping)`);

  console.log('Fetching free-exercise-db catalogue…');
  const fdb = await fetchJson(FREE_DB_URL);
  console.log(`  got ${fdb.length} exercises`);

  // Index for both direct-id and fuzzy-name lookup
  const fdbById = new Map(fdb.map((e) => [e.id, e]));
  const fdbBySlug = new Map(fdb.map((e) => [slug(e.name), e]));

  const out = {};
  const misses = [];
  const dropped = [];

  for (const ourId of ourIds.sort()) {
    // Honour explicit drops — exercises where any auto-match would be
    // semantically wrong. Skip resolution entirely.
    if (MANUAL_DROPS.has(ourId)) {
      dropped.push(ourId);
      continue;
    }

    let entry = null;
    let how = '';
    // 1. Manual override (highest priority — covers EXDB-mapped exercises
    //    whose canonical free-exercise-db ID isn't reachable via fuzzy match,
    //    plus P1 corrections for direct-JDLV mappings that pointed at the
    //    wrong variant).
    if (MANUAL_OVERRIDES[ourId] && fdbById.has(MANUAL_OVERRIDES[ourId])) {
      entry = fdbById.get(MANUAL_OVERRIDES[ourId]);
      how = 'override';
    }
    // 2. Direct ID match (JDLV-prefixed entries — same as the GIF URL path)
    if (!entry) {
      const theirId = directMap[ourId];
      if (theirId && fdbById.has(theirId)) {
        entry = fdbById.get(theirId);
        how = 'direct';
      }
    }
    // 3. Fuzzy name match
    if (!entry) {
      const ourName = nameMap[ourId];
      if (ourName) {
        entry = fuzzyFind(ourName, fdbBySlug);
        if (entry) how = 'fuzzy';
      }
    }

    if (!entry) {
      misses.push(ourId);
      continue;
    }

    out[ourId] = {
      sourceId: entry.id,
      sourceName: entry.name,
      instructions: entry.instructions,
      primaryMuscles: entry.primaryMuscles,
      secondaryMuscles: entry.secondaryMuscles,
      level: entry.level,
      mechanic: entry.mechanic,
      _matchedBy: how,
    };
  }

  console.log(`Matched ${Object.keys(out).length}/${ourIds.length} exerciseIds`);
  if (dropped.length > 0) {
    console.log(`  Dropped (${dropped.length}): ${dropped.join(', ')}`);
  }
  if (misses.length > 0) {
    console.log(`  Misses (${misses.length}): ${misses.join(', ')}`);
  }

  // Emit src/lib/exerciseDBData.ts
  const lines = [
    '/**',
    ' * exerciseDBData — v4.4.0.',
    ' *',
    ' * AUTOGENERATED by scripts/curateExerciseDBData.js — DO NOT EDIT.',
    ' *',
    ' * Per-exercise data sourced from free-exercise-db',
    ' * (https://github.com/yuhonas/free-exercise-db, public domain). Used to',
    ' * provide unique per-exercise content in the InstructionsPanel\'s',
    ' * Watch Out / Form-cues card so the panel never repeats the same',
    ' * generic muscle copy across multiple exercises in a session.',
    ' *',
    ' * Coverage is tracked in scripts/curateExerciseDBData.js — exerciseIds',
    ' * with no acceptable analog in the catalogue (see MANUAL_DROPS) are',
    ' * intentionally omitted so the panel hides rather than ship instructions',
    ' * for a different exercise (P1 lesson from PR #44 QA).',
    ' */',
    '',
    'export interface ExerciseDBEntry {',
    '  /** ID in the free-exercise-db catalogue. */',
    '  sourceId: string;',
    '  /** Display name in free-exercise-db (may differ slightly from ours). */',
    '  sourceName: string;',
    '  /** Step-by-step instructions written by free-exercise-db contributors. */',
    '  instructions: string[];',
    '  /** Primary muscles in free-exercise-db terminology (not our enum). */',
    '  primaryMuscles: string[];',
    '  /** Secondary muscles in free-exercise-db terminology. */',
    '  secondaryMuscles: string[];',
    '  /** Difficulty per free-exercise-db: beginner | intermediate | expert. */',
    '  level: string;',
    '  /** Movement mechanic: compound | isolation. */',
    '  mechanic: string | null;',
    '}',
    '',
    // Note: deliberately no timestamp — the file is byte-stable across runs
    // when the upstream catalogue is unchanged, so re-running this script
    // produces no spurious diffs (P2 fix from PR #44 review).
    `// Generated from ${Object.keys(out).length}/${ourIds.length} matches.`,
    '',
    'export const EXERCISE_DB_DATA: Record<string, ExerciseDBEntry> = {',
  ];
  for (const id of Object.keys(out).sort()) {
    const e = out[id];
    const ins = e.instructions.map((s) => `    ${JSON.stringify(s)},`).join('\n');
    const prim = JSON.stringify(e.primaryMuscles);
    const sec = JSON.stringify(e.secondaryMuscles);
    lines.push(
      `  '${id}': {`,
      `    sourceId: ${JSON.stringify(e.sourceId)},`,
      `    sourceName: ${JSON.stringify(e.sourceName)},`,
      `    instructions: [`,
      ins,
      `    ],`,
      `    primaryMuscles: ${prim},`,
      `    secondaryMuscles: ${sec},`,
      `    level: ${JSON.stringify(e.level)},`,
      `    mechanic: ${JSON.stringify(e.mechanic)},`,
      `  },`,
    );
  }
  lines.push('};', '');

  fs.writeFileSync(OUT_PATH, lines.join('\n'));
  console.log(`Wrote ${OUT_PATH}`);
  if (dropped.length > 0) {
    console.log(`\nDropped exercises (no acceptable free-exercise-db analog):`);
    console.log(`  ${dropped.join(', ')}`);
    console.log(`  → These hide the Watch Out / Form Tips card entirely.`);
    console.log(`  → Consider adding curated entries to exerciseMistakes.ts for common exercises.`);
  }
  if (misses.length > 0) {
    console.log(`\nMisses to curate manually or fuzzy-fix later: ${misses.join(', ')}`);
  }
}

main().catch((err) => {
  console.error('curateExerciseDBData failed:', err);
  process.exit(1);
});
