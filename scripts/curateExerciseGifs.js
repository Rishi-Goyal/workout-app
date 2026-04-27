#!/usr/bin/env node
/**
 * curateExerciseGifs — v4.2.0 Theme B.
 *
 * Downloads every entry in `ANIMATION_URLS` (defined in
 * `src/lib/exerciseDatabase.ts`) into `assets/exercises/{exerciseId}.{ext}`.
 *
 * Why this exists: the runtime `fetchExerciseGif` path is flaky — depends on
 * a free third-party API and CDN. By bundling the assets locally we make
 * the visual layer reliable offline and inside the APK; remote remains the
 * fallback for anything we couldn't resolve at curation time.
 *
 * Usage:
 *   node scripts/curateExerciseGifs.js
 *
 * Outputs:
 *   assets/exercises/{exerciseId}.gif|jpg     — downloaded media
 *   assets/exercises/MISSING.txt              — curation misses (404, network, etc.)
 *   assets/exercises/CREDITS.md               — attribution for sources
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'src', 'lib', 'exerciseDatabase.ts');
const OUT_DIR = path.join(ROOT, 'assets', 'exercises');
const MISSING_PATH = path.join(OUT_DIR, 'MISSING.txt');
const CREDITS_PATH = path.join(OUT_DIR, 'CREDITS.md');

// ---------------------------------------------------------------------------
// Parse ANIMATION_URLS out of the TS source via a tolerant regex.
// We avoid a full TS parser to keep this script zero-dep.
// ---------------------------------------------------------------------------

function loadAnimationUrls() {
  const src = fs.readFileSync(DB_PATH, 'utf8');

  // Pull out the const-prefix declarations: `const JDLV = '...';`
  const constRegex = /const\s+([A-Z_]+)\s*=\s*['"]([^'"]+)['"];/g;
  const consts = {};
  let m;
  while ((m = constRegex.exec(src)) !== null) {
    consts[m[1]] = m[2];
  }

  // Locate the ANIMATION_URLS object body
  const blockMatch = src.match(/ANIMATION_URLS\s*:[^=]*=\s*\{([\s\S]*?)^\};/m);
  if (!blockMatch) throw new Error('Could not locate ANIMATION_URLS block');
  const block = blockMatch[1];

  // Each entry: 'exercise-id': PREFIX + 'tail.ext',
  const entryRegex = /['"]([a-z0-9-]+)['"]\s*:\s*([A-Z_]+)\s*\+\s*['"]([^'"]+)['"]/g;
  const urls = {};
  while ((m = entryRegex.exec(block)) !== null) {
    const [, id, prefix, tail] = m;
    if (!consts[prefix]) {
      console.warn(`  warn: unknown prefix ${prefix} for ${id}`);
      continue;
    }
    urls[id] = consts[prefix] + tail;
  }
  return urls;
}

// ---------------------------------------------------------------------------
// HTTP fetch helper — follows redirects, writes to disk
// ---------------------------------------------------------------------------

function download(url, destPath, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 15000 }, (res) => {
      // Redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        return resolve(download(next, destPath, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const tmp = destPath + '.tmp';
      const file = fs.createWriteStream(tmp);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          fs.renameSync(tmp, destPath);
          resolve();
        });
      });
      file.on('error', (err) => {
        fs.unlink(tmp, () => reject(err));
      });
    });
    req.on('timeout', () => {
      req.destroy(new Error('Timeout'));
    });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const urls = loadAnimationUrls();
  const ids = Object.keys(urls).sort();
  console.log(`curateExerciseGifs: ${ids.length} URLs to fetch`);

  const misses = [];
  const sources = new Set();
  let downloaded = 0;
  let alreadyHave = 0;

  // Process serially with a small per-request delay so we don't hammer the CDN.
  for (const id of ids) {
    const url = urls[id];
    const ext = (url.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1] || 'gif').toLowerCase();
    const dest = path.join(OUT_DIR, `${id}.${ext}`);

    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      alreadyHave++;
      sources.add(new URL(url).hostname);
      continue;
    }

    process.stdout.write(`  ${id}... `);
    try {
      await download(url, dest);
      downloaded++;
      sources.add(new URL(url).hostname);
      process.stdout.write('ok\n');
    } catch (err) {
      misses.push({ id, url, error: err.message });
      process.stdout.write(`miss (${err.message})\n`);
    }
    // Tiny throttle — be polite to free CDNs.
    await new Promise((r) => setTimeout(r, 100));
  }

  // MISSING.txt
  if (misses.length > 0) {
    const lines = [
      `# Exercise GIF curation misses — generated ${new Date().toISOString()}`,
      '',
      `${misses.length} of ${ids.length} could not be downloaded. The runtime`,
      'falls back to fetchExerciseGif() for these — no behavioural regression.',
      '',
      ...misses.map((m) => `${m.id}\t${m.error}\t${m.url}`),
      '',
    ];
    fs.writeFileSync(MISSING_PATH, lines.join('\n'));
    console.log(`Wrote ${MISSING_PATH} (${misses.length} misses)`);
  } else if (fs.existsSync(MISSING_PATH)) {
    fs.unlinkSync(MISSING_PATH);
  }

  // CREDITS.md — only rewrite if we actually downloaded anything new
  if (downloaded > 0 || !fs.existsSync(CREDITS_PATH)) {
    const credits = [
      '# Exercise GIF Credits',
      '',
      'Bundled exercise animations and images sourced from:',
      '',
      '- **ExerciseDB** — https://exercisedb.dev — animated GIFs (CC BY 4.0)',
      '- **Free Exercise DB (yuhonas)** — https://github.com/yuhonas/free-exercise-db — static reference images (Public Domain)',
      '',
      'Hosts touched during curation:',
      '',
      ...Array.from(sources).sort().map((h) => `- ${h}`),
      '',
      `Last regenerated: ${new Date().toISOString()}`,
      '',
    ];
    fs.writeFileSync(CREDITS_PATH, credits.join('\n'));
    console.log(`Wrote ${CREDITS_PATH}`);
  }

  console.log(
    `\nDone. ${downloaded} downloaded, ${alreadyHave} already cached, ` +
    `${misses.length} misses out of ${ids.length}.`,
  );
  console.log(`Run \`node scripts/generateLocalGifManifest.js\` next to regenerate the manifest.`);
}

main().catch((err) => {
  console.error('curateExerciseGifs failed:', err);
  process.exit(1);
});
