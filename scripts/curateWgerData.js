#!/usr/bin/env node
/**
 * curateWgerData — v4.5.0.
 *
 * Pulls per-exercise narrative descriptions + muscle/equipment metadata from
 * wger.de (https://wger.de/api/v2/exerciseinfo/) for every exerciseId in our
 * database (lifts + warmups). Output: `src/lib/wgerData.ts`.
 *
 * Why wger:
 *   free-exercise-db (already used) has 873 entries with step-by-step
 *   instructions but misses many yoga/stretches and niche exercises. wger
 *   has 841 entries with a different overlap (more international/yoga
 *   coverage) and CC-BY-SA license. Used as a *secondary* source: only
 *   filling gaps where free-ex-db has no entry.
 *
 * Resolution per exerciseId:
 *   1. Manual override (WGER_OVERRIDES below) — for IDs whose canonical
 *      wger name differs from ours.
 *   2. Slug-normalised name match against the wger catalogue.
 *   3. Miss → exerciseId omitted from output.
 *
 * Usage:
 *   node scripts/curateWgerData.js
 *
 * Output:
 *   src/lib/wgerData.ts  — generated TS module with WGER_DATA
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'src', 'lib', 'exerciseDatabase.ts');
const WARMUP_PATH = path.join(ROOT, 'src', 'lib', 'warmupDatabase.ts');
const OUT_PATH = path.join(ROOT, 'src', 'lib', 'wgerData.ts');
const WGER_BASE = 'https://wger.de/api/v2/exerciseinfo/';

// ---------------------------------------------------------------------------
// Manual override map — exerciseIds whose names don't fuzzy-match wger.
// Add as discovered during script runs.
// ---------------------------------------------------------------------------

// wger fuzzy substring matching produces too many false positives (e.g.
// 'nordic-curl' matched "Reverse Nordic Curl" — opposite movement). We
// only use HAND-VERIFIED overrides plus exact slug match. Each entry
// here was visually verified against wger.de by name.
const WGER_OVERRIDES = {
  // Lifts where our name doesn't match wger's exact name verbatim
  'barbell-bench-press':    'Bench Press',
  'arnold-press':           'Arnold Shoulder Press',
  'face-pull':              'Facepull',
  'tricep-pushdown':        'Triceps Pushdown',
  'hanging-leg-raise':      'Hanging Leg Raises',
  'bench-dip':              'Bench Dips',
  'walking-lunge':          'Walking Lunges',
  'step-up':                'Step-ups',
  'good-morning':           'Good Mornings',
  'hack-squat':             'Hack Squats',
  'band-pull-apart':        'Band pull-aparts',
  'ab-wheel-rollout':       'Ab wheel',
  'hollow-body-hold':       'Hollow Hold',
  'single-leg-rdl':         'Single Leg RDL',
  'leg-press-calf-raise':   'Calf Press Using Leg Press Machine',
  'single-leg-hip-thrust':  'Dumbbell Single-leg Hip Thrust',
  'australian-pull-up':     'Inverted Rows',
  'barbell-overhead-press': 'Overhead Press',
  // Warmups — wger has yoga coverage free-ex-db lacks
  'wu-cobra':               'Cobra Stretch',
  'wu-pigeon':              'Pigeon Stretch',
  'wu-deadbug':             'Deadbug',
};

// Explicit drops — wger's catalogue is more variable than free-ex-db, so
// some entries we'd match on by name actually point at unrelated movements
// (e.g. 'Pigeon Pose' might be a different exercise). Drops listed once
// confirmed during a script run.
const WGER_DROPS = new Set([
  // (none yet — populated when audit reveals mismatches)
]);

// ---------------------------------------------------------------------------
// Parse our exerciseIds + names from the TS source files (same regex
// pattern as scripts/curateExerciseDBData.js, kept in sync).
// ---------------------------------------------------------------------------

function loadOurIds() {
  const lifts = fs.readFileSync(DB_PATH, 'utf8');
  const warmups = fs.readFileSync(WARMUP_PATH, 'utf8');
  const nameMap = {};
  const ourIds = new Set();

  // Lifts: walk Exercise object literals
  const objRe = /\bid:\s*['"]([a-z][a-z0-9-]+)['"][\s\S]{0,200}?\bname:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = objRe.exec(lifts)) !== null) {
    const id = m[1];
    if (id.startsWith('wu-')) continue;  // skip warmups in this pass
    ourIds.add(id);
    nameMap[id] = m[2];
  }

  // Warmups: 'wu-*' IDs in warmupDatabase.ts
  const wuRe = /\bid:\s*['"](wu-[a-z0-9-]+)['"][\s\S]{0,200}?\bname:\s*['"]([^'"]+)['"]/g;
  while ((m = wuRe.exec(warmups)) !== null) {
    ourIds.add(m[1]);
    nameMap[m[1]] = m[2];
  }

  return { ourIds: [...ourIds], nameMap };
}

// ---------------------------------------------------------------------------
// Fetch wger catalogue (paginated)
// ---------------------------------------------------------------------------

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function fetchAllWger() {
  const all = [];
  let url = `${WGER_BASE}?language=2&limit=200`;
  while (url) {
    const page = await fetchJson(url);
    all.push(...(page.results || []));
    url = page.next;
    if (all.length >= 5000) break;  // hard safety cap
  }
  return all;
}

// ---------------------------------------------------------------------------
// Slug helpers
// ---------------------------------------------------------------------------

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Pick the English (language=2) translation, fall back to first available.
function getEnglishTranslation(entry) {
  if (!entry.translations || entry.translations.length === 0) return null;
  const en = entry.translations.find((t) => t.language === 2);
  return en || entry.translations[0];
}

// Strip HTML tags from wger's <p>-wrapped descriptions and normalise whitespace.
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Split prose into discrete bullet-ready sentences. Keep ≤6 to avoid an
// overwhelming card. Drop ultra-short fragments and trailing fluff.
function sentencesFrom(prose) {
  if (!prose) return [];
  // First split on hard breaks (paragraphs), then on sentence-end punctuation
  // followed by capital. Avoid splitting inside abbreviations crudely — wger
  // descriptions are simple enough that this works.
  const out = [];
  for (const para of prose.split(/\n+/)) {
    const sents = para.split(/(?<=[.!?])\s+(?=[A-Z])/);
    for (const s of sents) {
      const t = s.trim();
      if (t.length >= 15 && t.length <= 240) out.push(t);
    }
  }
  return out.slice(0, 6);
}

// Reject entries whose only "instruction" is a placeholder stub. Some wger
// contributors leave entries like "View the video to understand the
// exercise" — useless on our card and undermines user trust. We'd rather
// have no card than a placeholder.
const PLACEHOLDER_PATTERNS = [
  /\bview\s+(the\s+)?video\b/i,
  /\bwatch\s+(the\s+)?video\b/i,
  /\bsee\s+(the\s+)?(demonstration|demo|video)\b/i,
  /\bundestand\b/i,           // wger contributor typo, hand-flagged
  /\brefer\s+to\s+(the\s+)?(video|image)\b/i,
];

function isUseful(instructions) {
  if (instructions.length === 0) return false;
  const joined = instructions.join(' ');
  // Any placeholder pattern → reject the whole entry
  if (PLACEHOLDER_PATTERNS.some((re) => re.test(joined))) return false;
  // A single very-short sentence is also too thin to be a useful card
  if (instructions.length === 1 && instructions[0].length < 60) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { ourIds, nameMap } = loadOurIds();
  console.log(`Loaded ${ourIds.length} exerciseIds (lifts + warmups)`);

  console.log('Fetching wger.de catalogue (paginated)…');
  const wger = await fetchAllWger();
  console.log(`  got ${wger.length} entries`);

  // Build name → entry index by slugified English name
  const wgerBySlug = new Map();
  for (const entry of wger) {
    const t = getEnglishTranslation(entry);
    if (!t || !t.name) continue;
    const s = slug(t.name);
    if (!wgerBySlug.has(s)) {
      wgerBySlug.set(s, { entry, translation: t });
    }
  }

  const out = {};
  const matched = [];
  const dropped = [];
  const misses = [];

  for (const ourId of ourIds.sort()) {
    if (WGER_DROPS.has(ourId)) {
      dropped.push(ourId);
      continue;
    }

    let hit = null;
    let how = '';

    // 1. Manual override
    if (WGER_OVERRIDES[ourId]) {
      const s = slug(WGER_OVERRIDES[ourId]);
      if (wgerBySlug.has(s)) {
        hit = wgerBySlug.get(s);
        how = 'override';
      }
    }
    // 2. Slug match on our name
    if (!hit) {
      const s = slug(nameMap[ourId] || ourId);
      if (wgerBySlug.has(s)) {
        hit = wgerBySlug.get(s);
        how = 'slug';
      }
    }

    if (!hit) {
      misses.push(ourId);
      continue;
    }

    const { entry, translation } = hit;
    const description = stripHtml(translation.description || '');
    if (!description) {
      misses.push(ourId);
      continue;
    }

    const instructions = sentencesFrom(description);
    if (!isUseful(instructions)) {
      // Either empty after sentence-split, or a placeholder stub like
      // "View the video to understand the exercise". Don't ship.
      misses.push(ourId);
      continue;
    }
    out[ourId] = {
      sourceId: entry.id,
      sourceName: translation.name,
      sourceUuid: entry.uuid,
      instructions,
      description,
      category: entry.category?.name ?? null,
      muscles: (entry.muscles || []).map((mm) => mm.name_en || mm.name),
      musclesSecondary: (entry.muscles_secondary || []).map((mm) => mm.name_en || mm.name),
      equipment: (entry.equipment || []).map((eq) => eq.name),
      _matchedBy: how,
    };
    matched.push(ourId);
  }

  console.log(`Matched ${matched.length}/${ourIds.length} via wger`);
  console.log(`  Dropped: ${dropped.length} (${dropped.join(', ') || 'none'})`);
  console.log(`  Misses: ${misses.length}`);
  if (misses.length > 0 && misses.length <= 30) {
    console.log(`    ${misses.join(', ')}`);
  }

  // Emit src/lib/wgerData.ts
  const lines = [
    '/**',
    ' * wgerData — v4.5.0.',
    ' *',
    ' * AUTOGENERATED by scripts/curateWgerData.js — DO NOT EDIT.',
    ' *',
    ' * Per-exercise narrative descriptions + muscle/equipment metadata sourced',
    ' * from wger.de (CC-BY-SA 3/4 — see assets/exercises/CREDITS.md). Used as',
    ' * a SECONDARY source by getMistakes() to fill gaps where free-exercise-db',
    ' * has no entry. Never overrides free-ex-db content for the same exerciseId.',
    ' */',
    '',
    'export interface WgerEntry {',
    '  /** Numeric ID in the wger catalogue. */',
    '  sourceId: number;',
    '  /** Display name in wger\'s English translation. */',
    '  sourceName: string;',
    '  /** Stable UUID (preferred for cross-referencing). */',
    '  sourceUuid: string;',
    '  /** Bullet-friendly sentences split from the source description. */',
    '  instructions: string[];',
    '  /** Plain-text description (HTML stripped). Kept for reference. */',
    '  description: string;',
    '  /** wger category, e.g. "Arms", "Legs", "Cardio". */',
    '  category: string | null;',
    '  /** Primary muscles in wger taxonomy. */',
    '  muscles: string[];',
    '  /** Secondary muscles in wger taxonomy. */',
    '  musclesSecondary: string[];',
    '  /** Equipment in wger taxonomy. */',
    '  equipment: string[];',
    '}',
    '',
    `// Generated from ${matched.length}/${ourIds.length} matches.`,
    '',
    'export const WGER_DATA: Record<string, WgerEntry> = {',
  ];
  for (const id of Object.keys(out).sort()) {
    const e = out[id];
    const insLines = e.instructions.map((s) => `      ${JSON.stringify(s)},`).join('\n');
    lines.push(
      `  '${id}': {`,
      `    sourceId: ${e.sourceId},`,
      `    sourceName: ${JSON.stringify(e.sourceName)},`,
      `    sourceUuid: ${JSON.stringify(e.sourceUuid)},`,
      `    instructions: [`,
      insLines,
      `    ],`,
      `    description: ${JSON.stringify(e.description)},`,
      `    category: ${JSON.stringify(e.category)},`,
      `    muscles: ${JSON.stringify(e.muscles)},`,
      `    musclesSecondary: ${JSON.stringify(e.musclesSecondary)},`,
      `    equipment: ${JSON.stringify(e.equipment)},`,
      `  },`,
    );
  }
  lines.push('};', '');

  fs.writeFileSync(OUT_PATH, lines.join('\n'));
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error('curateWgerData failed:', err);
  process.exit(1);
});
