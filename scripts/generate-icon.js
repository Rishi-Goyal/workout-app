/**
 * DungeonFit Icon Generator
 * Generates all required icon assets using jimp-compact pixel drawing.
 *
 * Run from project root:
 *   node scripts/generate-icon.js
 */

'use strict';

const Jimp = require('jimp-compact');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const PROJECT_ROOT = path.resolve(__dirname, '..');
const WORKTREE_ROOT = path.join(
  PROJECT_ROOT,
  '.claude', 'worktrees', 'ecstatic-yalow'
);
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets');
const ANDROID_RES_DIR = path.join(
  WORKTREE_ROOT,
  'android', 'app', 'src', 'main', 'res'
);

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------
const C = {
  BG:     Jimp.rgbaToInt(13,  10,  14,  255),  // #0d0a0e
  GOLD:   Jimp.rgbaToInt(245, 158, 11,  255),  // #f59e0b
  GOLD_D: Jimp.rgbaToInt(217, 119, 6,   255),  // #d97706
  BLACK:  Jimp.rgbaToInt(0,   0,   0,   255),
  WHITE:  Jimp.rgbaToInt(255, 255, 255, 255),
};

// ---------------------------------------------------------------------------
// Core drawing helper – draws the DungeonFit sword on an existing Jimp image.
// `scale` is the ratio relative to 1024 (e.g. 0.5 for 512, 1.0 for 1024).
// ---------------------------------------------------------------------------
function drawSword(img, W, H, opts = {}) {
  const goldColor  = opts.gold  ?? C.GOLD;
  const goldD      = opts.goldD ?? C.GOLD_D;
  const glowColor  = opts.glow  ?? { r: 45, g: 27, b: 105 }; // #2d1b69
  const drawGlow   = opts.drawGlow !== false;

  const cx = Math.floor(W / 2);
  const cy = Math.floor(H / 2);
  const s  = W / 1024;  // uniform scale

  // Scaled geometry
  const bladeX1 = Math.round(cx - 12 * s);
  const bladeX2 = Math.round(cx + 12 * s);
  const bladeY1 = Math.round(150 * s);
  const bladeY2 = Math.round(550 * s);

  const guardX1 = Math.round(cx - 132 * s);
  const guardX2 = Math.round(cx + 132 * s);
  const guardY1 = Math.round(480 * s);
  const guardY2 = Math.round(520 * s);

  const handleX1 = Math.round(cx - 10 * s);
  const handleX2 = Math.round(cx + 10 * s);
  const handleY1 = Math.round(520 * s);
  const handleY2 = Math.round(680 * s);

  const pommelCY  = Math.round(710 * s);
  const pommelR   = Math.round(30  * s);

  // Glow centre is slightly above canvas centre (near top of blade)
  const glowCX = cx;
  const glowCY = Math.round(380 * s);
  const glowR  = Math.round(280 * s);

  // ---- 1. Purple glow ----
  if (drawGlow) {
    img.scan(0, 0, W, H, function (x, y, idx) {
      const dist = Math.sqrt((x - glowCX) ** 2 + (y - glowCY) ** 2);
      if (dist < glowR) {
        const t = (1 - dist / glowR) ** 2 * 0.6; // 0..0.6
        // Read existing BG pixel
        const r0 = this.bitmap.data[idx];
        const g0 = this.bitmap.data[idx + 1];
        const b0 = this.bitmap.data[idx + 2];
        this.bitmap.data[idx]     = Math.round(r0 + (glowColor.r - r0) * t);
        this.bitmap.data[idx + 1] = Math.round(g0 + (glowColor.g - g0) * t);
        this.bitmap.data[idx + 2] = Math.round(b0 + (glowColor.b - b0) * t);
      }
    });
  }

  // ---- 2. Blade tip triangle ----
  // Blade tip: pixels with y < bladeY1 and |x - cx| < (bladeY1 - y) * 0.25
  img.scan(0, 0, W, bladeY1 + 1, function (x, y, idx) {
    if (y < bladeY1) {
      const halfWidth = (bladeY1 - y) * 0.25 * s;
      if (Math.abs(x - cx) < halfWidth) {
        this.bitmap.data[idx]     = 245;
        this.bitmap.data[idx + 1] = 158;
        this.bitmap.data[idx + 2] = 11;
        this.bitmap.data[idx + 3] = 255;
      }
    }
  });

  // ---- 3. Blade body ----
  img.scan(bladeX1, bladeY1, bladeX2 - bladeX1, bladeY2 - bladeY1, function (x, y, idx) {
    this.bitmap.data[idx]     = 245;
    this.bitmap.data[idx + 1] = 158;
    this.bitmap.data[idx + 2] = 11;
    this.bitmap.data[idx + 3] = 255;
  });

  // ---- 4. Crossguard ----
  img.scan(guardX1, guardY1, guardX2 - guardX1, guardY2 - guardY1, function (x, y, idx) {
    this.bitmap.data[idx]     = 245;
    this.bitmap.data[idx + 1] = 158;
    this.bitmap.data[idx + 2] = 11;
    this.bitmap.data[idx + 3] = 255;
  });

  // ---- 5. Handle ----
  img.scan(handleX1, handleY1, handleX2 - handleX1, handleY2 - handleY1, function (x, y, idx) {
    this.bitmap.data[idx]     = 217;
    this.bitmap.data[idx + 1] = 119;
    this.bitmap.data[idx + 2] = 6;
    this.bitmap.data[idx + 3] = 255;
  });

  // ---- 6. Pommel circle ----
  img.scan(0, 0, W, H, function (x, y, idx) {
    const dist = Math.sqrt((x - cx) ** 2 + (y - pommelCY) ** 2);
    if (dist <= pommelR) {
      this.bitmap.data[idx]     = 245;
      this.bitmap.data[idx + 1] = 158;
      this.bitmap.data[idx + 2] = 11;
      this.bitmap.data[idx + 3] = 255;
    }
  });
}

// ---------------------------------------------------------------------------
// Save helper (promisified)
// ---------------------------------------------------------------------------
function save(img, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  return new Promise((resolve, reject) => {
    img.write(filePath, (err) => (err ? reject(err) : resolve(filePath)));
  });
}

// ---------------------------------------------------------------------------
// Build a full-colour icon at the given size
// ---------------------------------------------------------------------------
async function buildIcon(size, opts = {}) {
  const bgColor = opts.mono ? C.BLACK : C.BG;
  const img = await new Promise((resolve, reject) => {
    new Jimp(size, size, bgColor, (err, i) => (err ? reject(err) : resolve(i)));
  });

  if (opts.mono) {
    // Monochrome: white sword, no glow
    drawSword(img, size, size, {
      gold:     C.WHITE,
      goldD:    C.WHITE,
      drawGlow: false,
    });
  } else {
    drawSword(img, size, size);
  }

  return img;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Generating DungeonFit icons…\n');

  // 1. Main 1024×1024 icon
  const icon1024 = await buildIcon(1024);
  await save(icon1024, path.join(ASSETS_DIR, 'icon.png'));
  console.log('  assets/icon.png');

  // 2. Android adaptive foreground (dark bg, sword)
  const fgIcon = await buildIcon(1024);
  await save(fgIcon, path.join(ASSETS_DIR, 'android-icon-foreground.png'));
  console.log('  assets/android-icon-foreground.png');

  // 3. Android background – solid dark fill
  const bgImg = await new Promise((resolve, reject) => {
    new Jimp(1024, 1024, C.BG, (err, i) => (err ? reject(err) : resolve(i)));
  });
  await save(bgImg, path.join(ASSETS_DIR, 'android-icon-background.png'));
  console.log('  assets/android-icon-background.png');

  // 4. Monochrome
  const monoIcon = await buildIcon(1024, { mono: true });
  await save(monoIcon, path.join(ASSETS_DIR, 'android-icon-monochrome.png'));
  console.log('  assets/android-icon-monochrome.png');

  // 5. Splash icon 512×512
  const splash = await buildIcon(512);
  await save(splash, path.join(ASSETS_DIR, 'splash-icon.png'));
  console.log('  assets/splash-icon.png');

  // 6. Android mipmap sizes
  const mipmapSizes = [
    { dir: 'mipmap-mdpi',    size: 48  },
    { dir: 'mipmap-hdpi',    size: 72  },
    { dir: 'mipmap-xhdpi',   size: 96  },
    { dir: 'mipmap-xxhdpi',  size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const { dir, size } of mipmapSizes) {
    const resDir = path.join(ANDROID_RES_DIR, dir);

    // Resize the 1024 icon down
    const regular = icon1024.clone().resize(size, size, Jimp.RESIZE_LANCZOS3);
    const fgSmall  = fgIcon.clone().resize(size, size, Jimp.RESIZE_LANCZOS3);

    await save(regular, path.join(resDir, 'ic_launcher.png'));
    await save(regular.clone(), path.join(resDir, 'ic_launcher_round.png'));
    await save(fgSmall,  path.join(resDir, 'ic_launcher_foreground.png'));
    console.log(`  ${dir}/ic_launcher*.png  (${size}×${size})`);
  }

  console.log('\nAll icons generated successfully!');
}

main().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
