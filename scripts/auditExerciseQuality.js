#!/usr/bin/env node
/**
 * auditExerciseQuality — v4.6.0 content-quality audit.
 *
 * Sister script to auditExerciseData.js (the data-correctness audit from
 * #47). This one looks at how *useful* an exercise's content is — does
 * the user have enough information to perform it correctly?
 *
 * Checks per entry:
 *   1. NAME_DRIFT       — source-name fuzzy match score < 0.8 vs our name
 *   2. THIN_DB          — < 3 EXERCISE_DB_DATA instructions
 *   3. DURATION_CLASH   — warmup durationSec vs an instruction's "X seconds"
 *   4. STILL_FOR_DYNAMIC — kind: 'dynamic' warmup whose bundled visual is .jpg
 *   5. TERSE_CUE        — warmup cue < 30 chars
 *   6. NO_TEMPO_KEYWORD — dynamic warmup with no breathing/tempo/alternation hint
 *
 * Output: docs/exercise-quality-audit.md, sorted by severity. Each row
 * lists which checks failed plus a suggested fix tier so PRs 2-4 know
 * what to prioritise. Zero dependencies; reads files directly.
 *
 * Usage:
 *   node scripts/auditExerciseQuality.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LIFT_PATH = path.join(ROOT, 'src', 'lib', 'exerciseDatabase.ts');
const WARMUP_PATH = path.join(ROOT, 'src', 'lib', 'warmupDatabase.ts');
const DB_PATH = path.join(ROOT, 'src', 'lib', 'exerciseDBData.ts');
const MANIFEST_PATH = path.join(ROOT, 'src', 'lib', 'localGifManifest.ts');
const MISTAKES_PATH = path.join(ROOT, 'src', 'lib', 'exerciseMistakes.ts');
const ASSET_DIR = path.join(ROOT, 'assets', 'exercises');
const OUT_PATH = path.join(ROOT, 'docs', 'exercise-quality-audit.md');

// ---------------------------------------------------------------------------
// Parsers — all regex-based, same approach as the existing curation scripts
// ---------------------------------------------------------------------------

function loadLifts() {
  const src = fs.readFileSync(LIFT_PATH, 'utf8');
  const re = /\bid:\s*['"]([a-z0-9-]+)['"][\s\S]{0,400}?\bname:\s*['"]([^'"]+)['"]/g;
  const out = {};
  let m;
  while ((m = re.exec(src)) !== null) {
    out[m[1]] = { name: m[2], kind: 'lift' };
  }
  return out;
}

function loadWarmups() {
  const src = fs.readFileSync(WARMUP_PATH, 'utf8');
  // v4.6.0 — accept both ' and " quote styles. Some warmup names contain
  // an apostrophe (e.g. "Child's Pose") and have to be double-quoted in
  // the TS source; the single-quote-only regex silently dropped them
  // (Codex flagged wu-childs-pose missing from the audit).
  const q = `(?:'([^']+)'|"([^"]+)")`;
  const re = new RegExp(
    `id:\\s*'(wu-[a-z0-9-]+)'[^}]*?name:\\s*${q}[^}]*?durationSec:\\s*(\\d+)[^}]*?kind:\\s*${q}[^}]*?cue:\\s*${q}`,
    'g',
  );
  const out = {};
  let m;
  while ((m = re.exec(src)) !== null) {
    // Each `q` capture group produces 2 slots (single or double quoted);
    // pick whichever isn't undefined.
    const name = m[2] ?? m[3];
    const durationSec = parseInt(m[4], 10);
    const kind = m[5] ?? m[6];
    const cue = m[7] ?? m[8];
    out[m[1]] = { name, durationSec, kind, cue };
  }
  return out;
}

function loadDBData() {
  const src = fs.readFileSync(DB_PATH, 'utf8');
  const re = /'([a-z0-9-]+)':\s*\{[\s\S]*?sourceName:\s*"([^"]+)"[\s\S]*?instructions:\s*\[([\s\S]*?)\]/g;
  const out = {};
  let m;
  while ((m = re.exec(src)) !== null) {
    const instrs = (m[3].match(/"((?:\\"|[^"])*)"/g) || []).map((s) =>
      s.slice(1, -1).replace(/\\"/g, '"'),
    );
    out[m[1]] = { sourceName: m[2], instructions: instrs };
  }
  return out;
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return {};
  const src = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const re = /'([a-z0-9-]+)':\s*require\(['"]([^'"]+)['"]\)/g;
  const out = {};
  let m;
  while ((m = re.exec(src)) !== null) {
    out[m[1]] = m[2];
  }
  return out;
}

function loadCuratedMistakes() {
  if (!fs.existsSync(MISTAKES_PATH)) return new Set();
  const src = fs.readFileSync(MISTAKES_PATH, 'utf8');
  // Pull keys out of the EXERCISE_MISTAKES + WARMUP_CURATED_INSTRUCTIONS maps.
  // Naive: any single-quoted key followed by ': [' inside the file. False
  // positives are harmless — they just mean "we have content for this id".
  const re = /'([a-z0-9-]+)':\s*\[/g;
  const out = new Set();
  let m;
  while ((m = re.exec(src)) !== null) out.add(m[1]);
  return out;
}

// ---------------------------------------------------------------------------
// Fuzzy name match (Jaro–Winkler-style, simplified)
// ---------------------------------------------------------------------------

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function nameMatchScore(a, b) {
  const sa = slugify(a);
  const sb = slugify(b);
  if (!sa || !sb) return 0;
  if (sa === sb) return 1;
  // Substring match — covers "Barbell Bench Press" inside
  // "Barbell Bench Press - Medium Grip" and similar.
  if (sa.includes(sb) || sb.includes(sa)) return 0.95;
  // Word-overlap precision: what fraction of the SHORTER name's words
  // appear in the LONGER name. More forgiving than Jaccard for cases
  // where one side has extra qualifiers (e.g. " - Medium Grip").
  const wa = new Set(sa.split(' ').filter((w) => w));
  const wb = new Set(sb.split(' ').filter((w) => w));
  const smaller = wa.size <= wb.size ? wa : wb;
  const larger = wa.size <= wb.size ? wb : wa;
  let overlap = 0;
  for (const w of smaller) if (larger.has(w)) overlap++;
  return smaller.size === 0 ? 0 : overlap / smaller.size;
}

// Manual overrides parsed directly from scripts/curateExerciseDBData.js
// at runtime. These mappings were vetted at curation time even if the
// source name doesn't match ours (e.g. our 'lateral-raise' →
// 'Side_Lateral_Raise'). Don't flag NAME_DRIFT for these IDs.
//
// v4.6.0 — Codex flagged that a hardcoded copy of the override IDs went
// stale (we had 41, the real map had 44). Parsing once at startup keeps
// the single source of truth in curateExerciseDBData.js.
function loadCuratedOverrideIds() {
  const curationScriptPath = path.join(ROOT, 'scripts', 'curateExerciseDBData.js');
  if (!fs.existsSync(curationScriptPath)) return new Set();
  const src = fs.readFileSync(curationScriptPath, 'utf8');
  // Match the MANUAL_OVERRIDES object literal block and pull its keys.
  const block = src.match(/const\s+MANUAL_OVERRIDES\s*=\s*\{([\s\S]*?)\n\};/);
  if (!block) return new Set();
  const out = new Set();
  const re = /['"]([a-z0-9-]+)['"]\s*:\s*['"]/g;
  let m;
  while ((m = re.exec(block[1])) !== null) out.add(m[1]);
  return out;
}

const CURATED_OVERRIDE_IDS = loadCuratedOverrideIds();

// ---------------------------------------------------------------------------
// Tempo / breathing / alternation keyword list — for dynamic warmups
// ---------------------------------------------------------------------------

const TEMPO_KEYWORDS = [
  'inhale', 'exhale', 'breath', 'breathe',
  'alternate', 'alternating',
  'tempo', 'rhythm', 'pace',
  'count', 'reps', 'cycle', 'cycles',
  'second', 'seconds',
  'slowly', 'slow',
  'each side', 'each leg', 'each arm',
];

function hasTempoCue(text) {
  const lower = text.toLowerCase();
  return TEMPO_KEYWORDS.some((k) => lower.includes(k));
}

// ---------------------------------------------------------------------------
// Audit each entry
// ---------------------------------------------------------------------------

function auditEntry(id, meta, dbEntry, manifestPath, curatedSet) {
  const flags = [];

  // NAME_DRIFT — only meaningful if we have a DB source to compare against,
  // AND the mapping wasn't already manually vetted in
  // scripts/curateExerciseDBData.js's override list. Curated overrides
  // intentionally point at a differently-named source.
  if (dbEntry && !CURATED_OVERRIDE_IDS.has(id)) {
    const score = nameMatchScore(meta.name, dbEntry.sourceName);
    if (score < 0.7) {
      flags.push({
        code: 'NAME_DRIFT',
        severity: 'HIGH',
        detail: `our "${meta.name}" vs source "${dbEntry.sourceName}" — match ${score.toFixed(2)}`,
      });
    }
  }

  // THIN_DB — DB exists but has few instructions; only flag if curated
  // doesn't already cover the entry
  if (dbEntry && dbEntry.instructions.length < 3 && !curatedSet.has(id)) {
    flags.push({
      code: 'THIN_DB',
      severity: 'MEDIUM',
      detail: `only ${dbEntry.instructions.length} instructions and no curated override`,
    });
  }

  // Warmup-specific checks
  if (meta.kind && meta.kind !== 'lift') {
    // DURATION_CLASH — durationSec vs source instructions' "X seconds"
    if (dbEntry && meta.durationSec) {
      const m = dbEntry.instructions.join(' ').match(/(\d+)\s*seconds?/i);
      if (m) {
        const sourceSecs = parseInt(m[1], 10);
        if (Math.abs(sourceSecs - meta.durationSec) > 10) {
          flags.push({
            code: 'DURATION_CLASH',
            severity: 'HIGH',
            detail: `our timer ${meta.durationSec}s, source instruction says ${sourceSecs}s`,
          });
        }
      }
    }

    // STILL_FOR_DYNAMIC — dynamic warmup served as .jpg still
    if (meta.kind === 'dynamic' && manifestPath && manifestPath.endsWith('.jpg')) {
      flags.push({
        code: 'STILL_FOR_DYNAMIC',
        severity: 'MEDIUM',
        detail: `kind: dynamic but visual is ${path.basename(manifestPath)} (still image)`,
      });
    }

    // TERSE_CUE
    if (meta.cue && meta.cue.length < 30) {
      flags.push({
        code: 'TERSE_CUE',
        severity: 'LOW',
        detail: `cue is only ${meta.cue.length} chars — beginner-unfriendly`,
      });
    }

    // NO_TEMPO_KEYWORD — dynamic exercise with no tempo guidance anywhere
    if (meta.kind === 'dynamic') {
      const combined = `${meta.cue} ${dbEntry ? dbEntry.instructions.join(' ') : ''}`;
      if (!hasTempoCue(combined) && !curatedSet.has(id)) {
        flags.push({
          code: 'NO_TEMPO_KEYWORD',
          severity: 'HIGH',
          detail: 'dynamic exercise with no breath/tempo/alternation hint in cue or instructions',
        });
      }
    }
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function severityRank(s) {
  return s === 'HIGH' ? 0 : s === 'MEDIUM' ? 1 : 2;
}

function maxSeverity(flags) {
  if (flags.length === 0) return null;
  return flags.map((f) => f.severity).sort((a, b) => severityRank(a) - severityRank(b))[0];
}

function suggestFixTier(flags) {
  const codes = new Set(flags.map((f) => f.code));
  if (codes.has('NAME_DRIFT') || codes.has('DURATION_CLASH')) {
    return 'HIGH — wrong source mapping; hand-rewrite instructions, optionally drop the DB mapping';
  }
  if (codes.has('NO_TEMPO_KEYWORD') || codes.has('STILL_FOR_DYNAMIC')) {
    return 'MEDIUM — needs hand-authored multi-step instructions with tempo cues';
  }
  if (codes.has('THIN_DB') || codes.has('TERSE_CUE')) {
    return 'LOW — expand existing content';
  }
  return 'LOW';
}

function main() {
  const lifts = loadLifts();
  const warmups = loadWarmups();
  const dbData = loadDBData();
  const manifest = loadManifest();
  const curated = loadCuratedMistakes();

  const all = { ...lifts, ...warmups };
  const ids = Object.keys(all).sort();

  const results = [];
  for (const id of ids) {
    const meta = all[id];
    const dbEntry = dbData[id];
    const manifestPath = manifest[id];
    const flags = auditEntry(id, meta, dbEntry, manifestPath, curated);
    if (flags.length > 0) {
      results.push({
        id,
        name: meta.name,
        kind: meta.kind ?? 'lift',
        flags,
        severity: maxSeverity(flags),
        suggestedFix: suggestFixTier(flags),
      });
    }
  }

  results.sort(
    (a, b) =>
      severityRank(a.severity) - severityRank(b.severity) || a.id.localeCompare(b.id),
  );

  // Build the markdown report
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const r of results) counts[r.severity]++;

  const lines = [
    '# Exercise content-quality audit',
    '',
    `Generated by \`scripts/auditExerciseQuality.js\`. **${results.length}** of ${ids.length} exercise IDs have at least one quality flag.`,
    '',
    '| Severity | Count |',
    '|---|---|',
    `| 🔴 HIGH | ${counts.HIGH} |`,
    `| 🟡 MEDIUM | ${counts.MEDIUM} |`,
    `| 🟢 LOW | ${counts.LOW} |`,
    '',
    '## Flag definitions',
    '',
    '- **NAME_DRIFT** — our display name doesn\'t match the source-of-truth (ExerciseDB / wger) closely enough; instructions may be for a different movement.',
    '- **THIN_DB** — fewer than 3 instructions in the database source; user gets very thin guidance.',
    '- **DURATION_CLASH** — the warmup\'s `durationSec` and the source instructions\' "X seconds" disagree by >10 seconds.',
    '- **STILL_FOR_DYNAMIC** — a `kind: \'dynamic\'` warmup is served via a `.jpg` still image, which can\'t convey alternation.',
    '- **TERSE_CUE** — warmup `cue` is < 30 characters; not enough for a beginner.',
    '- **NO_TEMPO_KEYWORD** — a dynamic warmup whose cue + source instructions mention no tempo / breath / alternation guidance.',
    '',
    '## Findings, sorted by severity',
    '',
  ];

  for (const r of results) {
    lines.push(`### ${r.severity === 'HIGH' ? '🔴' : r.severity === 'MEDIUM' ? '🟡' : '🟢'} \`${r.id}\` — ${r.name} (${r.kind})`);
    lines.push('');
    for (const f of r.flags) {
      lines.push(`- **${f.code}** (${f.severity}): ${f.detail}`);
    }
    lines.push('');
    lines.push(`Suggested fix: _${r.suggestedFix}_`);
    lines.push('');
  }

  fs.writeFileSync(OUT_PATH, lines.join('\n'));
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  ${results.length} entries flagged out of ${ids.length}`);
  console.log(`  ${counts.HIGH} HIGH, ${counts.MEDIUM} MEDIUM, ${counts.LOW} LOW`);
}

main();
