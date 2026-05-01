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
  'weighted-dip': 'Weighted_Bench_Dip',
  // No good free-exercise-db analog — intentionally omitted:
  //   'wall-push-up'    — too beginner; closest is plain Pushups
  //   'archer-push-up'  — no archer variant in catalogue
  //   'dead-hang'       — no isometric dead-hang in catalogue
};

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

  for (const ourId of ourIds.sort()) {
    let entry = null;
    let how = '';
    // 1. Manual override (highest priority — covers EXDB-mapped exercises
    //    whose canonical free-exercise-db ID isn't reachable via fuzzy match).
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
  if (misses.length > 0) {
    console.log(`Misses (${misses.length}): ${misses.join(', ')}`);
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
    ' * Coverage: see EXERCISE_DB_COVERAGE_NOTE for the latest curation result.',
    ' * Misses fall back to curated content (exerciseMistakes.ts) or omit the',
    ' * card entirely.',
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
    `// Generated ${new Date().toISOString()} from ${Object.keys(out).length}/${ourIds.length} matches.`,
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
  if (misses.length > 0) {
    console.log(`\nMisses to curate manually or fuzzy-fix later: ${misses.join(', ')}`);
  }
}

main().catch((err) => {
  console.error('curateExerciseDBData failed:', err);
  process.exit(1);
});
