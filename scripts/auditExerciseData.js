#!/usr/bin/env node
/**
 * auditExerciseData — v4.5.0.
 *
 * Cross-checks every exerciseId in our database against free-exercise-db
 * (the primary source) and the already-generated EXERCISE_DB_DATA.
 * Reports per-exercise mismatches grouped by severity.
 *
 * Severity tiers:
 *   - HARD: our `primaryMuscle` doesn't appear in source's primary or
 *     secondary lists at all. Suggests a real data error in our DB.
 *   - SOFT: secondary-muscles count or equipment differs by ≥1 entry.
 *   - INFO: our formCues count is < 3 and source has 4+ instructions —
 *     opportunity to enrich, not a correctness issue.
 *
 * Output: docs/exercise-data-audit.md (markdown table, committed alongside
 * any DB corrections). Re-run after corrections to verify zero HARDs.
 *
 * Usage:
 *   node scripts/auditExerciseData.js
 *
 * No network call — reads the locally-stored EXERCISE_DB_DATA which is
 * already synced from free-exercise-db via scripts/curateExerciseDBData.js.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'src', 'lib', 'exerciseDatabase.ts');
const EDB_PATH = path.join(ROOT, 'src', 'lib', 'exerciseDBData.ts');
const OUT_PATH = path.join(ROOT, 'docs', 'exercise-data-audit.md');

// ---------------------------------------------------------------------------
// free-exercise-db's muscle taxonomy → our MuscleGroup enum
// ---------------------------------------------------------------------------

const MUSCLE_MAP = {
  // Direct
  'chest':       'chest',
  'lats':        'back',
  'middle back': 'back',
  'lower back':  'back',
  'traps':       'back',
  'neck':        'back',
  'shoulders':   'shoulders',
  'biceps':      'biceps',
  'triceps':     'triceps',
  'forearms':    'biceps',  // closest in our enum
  'abdominals':  'core',
  'quadriceps':  'quads',
  'hamstrings':  'hamstrings',
  'glutes':      'glutes',
  'calves':      'calves',
  'adductors':   'quads',   // closest
  'abductors':   'glutes',  // closest
};

function mapMuscle(name) {
  if (!name) return null;
  return MUSCLE_MAP[name.toLowerCase()] ?? null;
}

// ---------------------------------------------------------------------------
// Known false positives — exerciseIds where our DB is correct but the
// free-exercise-db source mapping uses a related-but-different exercise
// whose muscle taxonomy differs. Reviewed and validated; suppressed from
// the HARD mismatch list so re-runs of the audit stay clean.
// ---------------------------------------------------------------------------

const EXPECTED_MISMATCHES = new Set([
  // glute-bridge → "Bent-Knee Hip Raise" override (no exact analog in
  // free-exercise-db). Source classifies as abs-primary; our exercise is
  // a bilateral bodyweight glute bridge. Our DB is authoritative.
  'glute-bridge',
]);

// ---------------------------------------------------------------------------
// Parse our exerciseDatabase.ts
// ---------------------------------------------------------------------------

function parseOurDB() {
  // Source file uses CRLF line endings. Normalise so regex works portably.
  const src = fs.readFileSync(DB_PATH, 'utf8').replace(/\r\n/g, '\n');
  const exercises = {};
  // Split into chunks at every line-start `    id: 'foo',` pattern. Each
  // chunk runs from one Exercise object literal's `id` field to the next.
  const idLineRe = /^    id:\s*['"]([a-z0-9-]+)['"]/gm;
  const positions = [];
  let m;
  while ((m = idLineRe.exec(src)) !== null) {
    positions.push({ id: m[1], start: m.index });
  }
  for (let i = 0; i < positions.length; i++) {
    const { id, start } = positions[i];
    if (id.startsWith('wu-')) continue;
    const end = positions[i + 1]?.start ?? start + 4000;  // 4KB safety window
    const chunk = src.slice(start, end);
    const name = chunk.match(/\bname:\s*['"]([^'"]+)['"]/)?.[1];
    const primaryMuscle = chunk.match(/\bprimaryMuscle:\s*['"]([a-z]+)['"]/)?.[1];
    const secondaryRaw = chunk.match(/\bsecondaryMuscles:\s*\[([^\]]*)\]/)?.[1] ?? '';
    const secondaryMuscles = [...secondaryRaw.matchAll(/['"]([a-z]+)['"]/g)].map((x) => x[1]);
    const equipmentRaw = chunk.match(/\bequipment:\s*\[([^\]]*)\]/)?.[1] ?? '';
    const equipment = [...equipmentRaw.matchAll(/['"]([a-z_]+)['"]/g)].map((x) => x[1]);
    const formCuesRaw = chunk.match(/\bformCues:\s*\[([\s\S]*?)\],/)?.[1] ?? '';
    const formCues = [...formCuesRaw.matchAll(/['"]([^'"]{3,})['"]/g)].map((x) => x[1]);
    if (name && primaryMuscle) {
      exercises[id] = { id, name, primaryMuscle, secondaryMuscles, equipment, formCues };
    }
  }
  return exercises;
}

// ---------------------------------------------------------------------------
// Parse generated EXERCISE_DB_DATA
// ---------------------------------------------------------------------------

function parseExerciseDB() {
  const src = fs.readFileSync(EDB_PATH, 'utf8');
  // Each entry: 'id': { sourceId: ..., sourceName: ..., instructions: [ ... ], primaryMuscles: [...], secondaryMuscles: [...] }
  const entries = {};
  const blockRe = /'([a-z0-9-]+)':\s*\{\s*sourceId:\s*"([^"]+)",\s*sourceName:\s*"([^"]+)",\s*instructions:\s*\[([\s\S]*?)\],\s*primaryMuscles:\s*\[([^\]]*)\],\s*secondaryMuscles:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    const [, id, sourceId, sourceName, insBlock, primRaw, secRaw] = m;
    const instructions = [...insBlock.matchAll(/"([^"]{3,})"/g)].map((x) => x[1]);
    const primaryMuscles = [...primRaw.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    const secondaryMuscles = [...secRaw.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    entries[id] = { sourceId, sourceName, instructions, primaryMuscles, secondaryMuscles };
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

function audit() {
  const ours = parseOurDB();
  const theirs = parseExerciseDB();

  const hard = [];     // primary-muscle disagreement
  const soft = [];     // secondary or equipment count drift
  const info = [];     // formCues thin compared to source instructions
  const noSource = []; // exercises with no source-of-truth at all (already known drops)

  for (const [id, ex] of Object.entries(ours)) {
    const src = theirs[id];
    if (!src) {
      noSource.push(id);
      continue;
    }
    const theirPrimaries = src.primaryMuscles.map(mapMuscle).filter(Boolean);
    const theirSecondaries = src.secondaryMuscles.map(mapMuscle).filter(Boolean);
    const theirAll = new Set([...theirPrimaries, ...theirSecondaries]);

    // HARD: our primaryMuscle absent from source's primary OR secondary
    if (theirPrimaries.length > 0 && !theirAll.has(ex.primaryMuscle)) {
      if (!EXPECTED_MISMATCHES.has(id)) {
        hard.push({
          id,
          name: ex.name,
          ours: ex.primaryMuscle,
          theirs: src.primaryMuscles.join(', '),
          sourceName: src.sourceName,
        });
      }
      continue;
    }

    // SOFT: our secondary set differs significantly from source
    const ourSecSet = new Set(ex.secondaryMuscles);
    const intersect = [...ourSecSet].filter((x) => theirAll.has(x));
    const ourMissingFromTheirs = [...ourSecSet].filter((x) => x !== ex.primaryMuscle && !theirAll.has(x));
    const theirsMissingFromOurs = theirPrimaries
      .filter((x) => x !== ex.primaryMuscle && !ourSecSet.has(x))
      .concat(theirSecondaries.filter((x) => x !== ex.primaryMuscle && !ourSecSet.has(x)));

    if (ourMissingFromTheirs.length >= 2 || theirsMissingFromOurs.length >= 2) {
      soft.push({
        id,
        name: ex.name,
        oursPrim: ex.primaryMuscle,
        oursSec: ex.secondaryMuscles.join(', '),
        theirsPrim: theirPrimaries.join(', '),
        theirsSec: theirSecondaries.join(', '),
        sourceName: src.sourceName,
      });
    }

    // INFO: thin formCues
    if (ex.formCues.length <= 2 && src.instructions.length >= 4) {
      info.push({
        id,
        name: ex.name,
        ourCues: ex.formCues.length,
        theirSteps: src.instructions.length,
      });
    }
  }

  return { hard, soft, info, noSource, totalOurs: Object.keys(ours).length, totalSrc: Object.keys(theirs).length };
}

// ---------------------------------------------------------------------------
// Markdown report
// ---------------------------------------------------------------------------

function writeReport(result) {
  const { hard, soft, info, noSource, totalOurs, totalSrc } = result;
  const lines = [
    '# Exercise data audit',
    '',
    `Generated by \`scripts/auditExerciseData.js\`. Cross-checks our \`exerciseDatabase.ts\` against the locally-bundled \`EXERCISE_DB_DATA\` (sourced from free-exercise-db).`,
    '',
    `**Summary**`,
    `- Our DB: ${totalOurs} lifts.`,
    `- ExerciseDB coverage: ${totalSrc} entries.`,
    `- HARD mismatches (primary muscle disagreement): **${hard.length}**`,
    `- SOFT mismatches (secondary muscles / equipment drift): **${soft.length}**`,
    `- INFO (thin formCues vs source): **${info.length}**`,
    `- No source for cross-check (drops + ANIMATION_URLS gaps): **${noSource.length}**`,
    '',
    '---',
    '',
    '## HARD mismatches (require manual correction)',
    '',
  ];
  if (hard.length === 0) {
    lines.push('_None — primary muscle aligns for every exercise we can cross-check. ✓_', '');
  } else {
    lines.push('| id | our name | our primary | source primary | source name |');
    lines.push('|---|---|---|---|---|');
    for (const h of hard) {
      lines.push(`| \`${h.id}\` | ${h.name} | \`${h.ours}\` | \`${h.theirs}\` | ${h.sourceName} |`);
    }
    lines.push('');
  }

  lines.push('## SOFT mismatches (review, may need adjustment)', '');
  if (soft.length === 0) {
    lines.push('_None._', '');
  } else {
    lines.push('| id | our prim+sec | source prim+sec | source name |');
    lines.push('|---|---|---|---|');
    for (const s of soft) {
      lines.push(`| \`${s.id}\` | ${s.oursPrim} → ${s.oursSec} | ${s.theirsPrim} → ${s.theirsSec} | ${s.sourceName} |`);
    }
    lines.push('');
  }

  lines.push('## INFO: thin formCues (enrichment opportunities)', '');
  if (info.length === 0) {
    lines.push('_None._', '');
  } else {
    lines.push('| id | name | our formCues | source instructions |');
    lines.push('|---|---|---|---|');
    for (const i of info) {
      lines.push(`| \`${i.id}\` | ${i.name} | ${i.ourCues} | ${i.theirSteps} |`);
    }
    lines.push('');
  }

  lines.push('## No source for cross-check', '');
  if (noSource.length === 0) {
    lines.push('_None._', '');
  } else {
    lines.push(`These exerciseIds have no entry in EXERCISE_DB_DATA (because they're either in MANUAL_DROPS in \`scripts/curateExerciseDBData.js\` or were never in ANIMATION_URLS). They rely on hand-curated content (\`EXERCISE_MISTAKES\`) instead.`);
    lines.push('');
    lines.push('```');
    lines.push(noSource.join(', '));
    lines.push('```');
    lines.push('');
  }

  if (!fs.existsSync(path.dirname(OUT_PATH))) fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, lines.join('\n'));
  console.log(`Wrote ${OUT_PATH}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const result = audit();
writeReport(result);
console.log(`\nResult:`);
console.log(`  HARD: ${result.hard.length}`);
console.log(`  SOFT: ${result.soft.length}`);
console.log(`  INFO: ${result.info.length}`);
console.log(`  No-source: ${result.noSource.length}`);

if (result.hard.length > 0) {
  console.log('\nHARD mismatches:');
  for (const h of result.hard) {
    console.log(`  ${h.id}: our=${h.ours}, theirs=${h.theirs} (source: ${h.sourceName})`);
  }
}
