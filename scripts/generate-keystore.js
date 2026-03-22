#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// generate-keystore.js
//
// Generates a release keystore for signing production APKs and prints the
// GitHub secrets you need to add.
//
// Usage:
//   node scripts/generate-keystore.js
//
// Requirements: keytool (ships with every JDK)
// ─────────────────────────────────────────────────────────────────────────────

const { execSync, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KEYSTORE_FILE = path.join('android', 'app', 'release.keystore');
const KEY_ALIAS = 'dungeonfit-release';

// Generate cryptographically random passwords (no external tools needed)
function randomPassword(length = 24) {
  return crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, length);
}

const STORE_PASS = randomPassword(24);
const KEY_PASS = randomPassword(24);

console.log('');
console.log('⚔️  DungeonFit — Release Keystore Generator');
console.log('─────────────────────────────────────────────');
console.log('');

// Find keytool — check JAVA_HOME first, then PATH
function findKeytool() {
  // Try PATH first
  const fromPath = spawnSync('keytool', ['-help'], { encoding: 'utf8' });
  if (fromPath.status !== null && fromPath.error === undefined) return 'keytool';

  // Try JAVA_HOME
  const javaHome = process.env.JAVA_HOME;
  if (javaHome) {
    const kt = path.join(javaHome, 'bin', 'keytool');
    const result = spawnSync(kt, ['-help'], { encoding: 'utf8' });
    if (result.status !== null && result.error === undefined) return kt;
  }

  // Try well-known Windows JDK locations
  const candidates = [
    'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.2.8-hotspot\\bin\\keytool.exe',
    'C:\\Program Files\\Java\\jdk-17.0.1\\bin\\keytool.exe',
    'C:\\Program Files\\Microsoft\\jdk-17.0.3.7-hotspot\\bin\\keytool.exe',
  ];
  for (const kt of candidates) {
    if (fs.existsSync(kt)) return kt;
  }

  return null;
}

const keytool = findKeytool();
if (!keytool) {
  console.error('❌  keytool not found. Make sure a JDK is installed and JAVA_HOME is set.');
  process.exit(1);
}

// Ensure output directory exists
fs.mkdirSync(path.dirname(KEYSTORE_FILE), { recursive: true });

// Delete existing keystore so keytool doesn't prompt
if (fs.existsSync(KEYSTORE_FILE)) {
  fs.unlinkSync(KEYSTORE_FILE);
}

console.log('Generating keystore...');

const result = spawnSync(
  keytool,
  [
    '-genkeypair',
    '-v',
    '-keystore', KEYSTORE_FILE,
    '-alias', KEY_ALIAS,
    '-keyalg', 'RSA',
    '-keysize', '2048',
    '-validity', '10000',
    '-storepass', STORE_PASS,
    '-keypass', KEY_PASS,
    '-dname', 'CN=DungeonFit, OU=Mobile, O=DungeonFit, L=Unknown, S=Unknown, C=US',
  ],
  { encoding: 'utf8', stdio: 'inherit' }
);

if (result.status !== 0) {
  console.error('❌  keytool failed. See error above.');
  process.exit(1);
}

console.log('');
console.log(`✅  Keystore created at ${KEYSTORE_FILE}`);
console.log('');

// Base64 encode the keystore
const keystoreBase64 = fs.readFileSync(KEYSTORE_FILE).toString('base64');

console.log('─────────────────────────────────────────────');
console.log('Add these secrets to GitHub:');
console.log('  Settings → Secrets and variables → Actions → New repository secret');
console.log('─────────────────────────────────────────────');
console.log('');
console.log('ANDROID_KEYSTORE_BASE64');
console.log(' ', keystoreBase64);
console.log('');
console.log('ANDROID_KEY_ALIAS');
console.log(' ', KEY_ALIAS);
console.log('');
console.log('ANDROID_STORE_PASSWORD');
console.log(' ', STORE_PASS);
console.log('');
console.log('ANDROID_KEY_PASSWORD');
console.log(' ', KEY_PASS);
console.log('');
console.log('─────────────────────────────────────────────');
console.log('⚠️  Save these values somewhere safe — the passwords cannot be recovered.');
console.log('⚠️  Add release.keystore to .gitignore (already done).');
console.log('');
