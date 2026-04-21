/**
 * DungeonFit v4 Icon Generator — Solo Leveling visual identity.
 *
 * Draws a modern angular/faceted sword on an obsidian background with a
 * violet nebula radial glow. Gold accents: base #F5A623, highlight #FFC857.
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
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets');
const ANDROID_RES_DIR = path.join(
  PROJECT_ROOT,
  'android', 'app', 'src', 'main', 'res'
);

// ---------------------------------------------------------------------------
// v4 Palette (from design tokens in src/lib/constants.ts)
// ---------------------------------------------------------------------------
const BG_R = 0x07, BG_G = 0x06, BG_B = 0x1A;       // #07061A obsidian
const GOLD_R = 0xF5, GOLD_G = 0xA6, GOLD_B = 0x23; // #F5A623
const HILITE_R = 0xFF, HILITE_G = 0xC8, HILITE_B = 0x57; // #FFC857
const HILT_R = 0xB2, HILT_G = 0x77, HILT_B = 0x12;       // #B27712 dim gold
const VIOLET_R = 0x63, VIOLET_G = 0x66, VIOLET_B = 0xF1; // #6366F1

const C = {
  BG:     Jimp.rgbaToInt(BG_R, BG_G, BG_B, 255),
  BLACK:  Jimp.rgbaToInt(0,    0,    0,    255),
  WHITE:  Jimp.rgbaToInt(255,  255,  255,  255),
};

// ---------------------------------------------------------------------------
// Paint a pixel (write RGBA at a given index)
// ---------------------------------------------------------------------------
function paint(data, idx, r, g, b, a = 255) {
  data[idx]     = r;
  data[idx + 1] = g;
  data[idx + 2] = b;
  data[idx + 3] = a;
}

// ---------------------------------------------------------------------------
// Core drawing — modern angular sword + violet nebula glow.
//
// Geometry references a 1024px canvas; scales linearly for any W.
// The blade is rendered with a chamfered diamond cross-section: bright
// highlight on one edge, base gold fill, dim shadow on the other edge —
// giving the faceted "tech sword" look from the design bundle.
// ---------------------------------------------------------------------------
function drawSword(img, W, H, opts = {}) {
  const drawGlow   = opts.drawGlow !== false;
  const mono       = opts.mono === true;
  const data = img.bitmap.data;

  const cx = Math.floor(W / 2);
  const s  = W / 1024;  // uniform scale factor

  // ---- 1. Violet nebula radial glow (centered upper-middle) ----
  if (drawGlow) {
    const glowCX = cx;
    const glowCY = Math.round(420 * s);
    const glowR  = Math.round(480 * s);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x - glowCX;
        const dy = y - glowCY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < glowR) {
          const t = Math.pow(1 - dist / glowR, 2) * 0.55; // 0..0.55
          const idx = (y * W + x) * 4;
          const r0 = data[idx];
          const g0 = data[idx + 1];
          const b0 = data[idx + 2];
          paint(data, idx,
            Math.round(r0 + (VIOLET_R - r0) * t),
            Math.round(g0 + (VIOLET_G - g0) * t),
            Math.round(b0 + (VIOLET_B - b0) * t),
          );
        }
      }
    }
  }

  // ---- 2. Blade — faceted chamfered diamond ----
  //
  // The blade tapers from a sharp point at top to a wide mid, then chamfered
  // cut near the guard. Rendered column-by-column via row bands for the
  // highlight (left chamfer), body (gold fill), and shadow (right chamfer).
  //
  // Blade spans y ∈ [100, 560] at x = cx. Half-width profile:
  //   y=100:  1px (tip)
  //   y=260: 18px (shoulder)
  //   y=480: 32px (widest before guard)
  //   y=560: 26px (cut into guard)

  function bladeHalfWidth(y) {
    // Piecewise linear profile, in canvas units (before * s).
    const yU = y / s;
    if (yU < 100)  return 0;
    if (yU < 260)  return 1 + (yU - 100) / 160 * 17;   // 1 → 18
    if (yU < 480)  return 18 + (yU - 260) / 220 * 14;  // 18 → 32
    if (yU < 560)  return 32 - (yU - 480) / 80  * 6;   // 32 → 26
    return 0;
  }

  const bladeYTop = Math.round(100 * s);
  const bladeYBot = Math.round(560 * s);

  for (let y = bladeYTop; y < bladeYBot; y++) {
    const halfW = Math.round(bladeHalfWidth(y) * s);
    if (halfW <= 0) continue;
    const xL = cx - halfW;
    const xR = cx + halfW;
    const chamfer = Math.max(1, Math.round(halfW * 0.35));

    for (let x = xL; x <= xR; x++) {
      const idx = (y * W + x) * 4;
      let r, g, b;
      if (mono) {
        r = g = b = 255;
      } else if (x < xL + chamfer) {
        // Left highlight chamfer
        r = HILITE_R; g = HILITE_G; b = HILITE_B;
      } else if (x > xR - chamfer) {
        // Right shadow chamfer
        r = HILT_R; g = HILT_G; b = HILT_B;
      } else {
        // Middle body
        r = GOLD_R; g = GOLD_G; b = GOLD_B;
      }
      paint(data, idx, r, g, b);
    }
  }

  // ---- 3. Crossguard — two stacked horizontal bars (modular tech-look) ----
  const guardTopY = Math.round(560 * s);
  const guardBotY = Math.round(610 * s);
  const guardXL = Math.round(cx - 150 * s);
  const guardXR = Math.round(cx + 150 * s);
  // Main guard bar
  for (let y = guardTopY; y < guardBotY; y++) {
    for (let x = guardXL; x < guardXR; x++) {
      // Chamfer the outer corners (+/-20px triangle cuts)
      const distFromEdge = Math.min(x - guardXL, guardXR - x);
      const yOffset = y - guardTopY;
      if (distFromEdge < 18 * s - yOffset * 0.4) continue;
      const idx = (y * W + x) * 4;
      if (mono) { paint(data, idx, 255, 255, 255); continue; }
      // Gold with horizontal gradient (highlight near middle)
      const midDist = Math.abs(x - cx);
      if (midDist < 60 * s) {
        paint(data, idx, HILITE_R, HILITE_G, HILITE_B);
      } else {
        paint(data, idx, GOLD_R, GOLD_G, GOLD_B);
      }
    }
  }

  // Accent — thin violet tech-line beneath the guard (only when not mono)
  if (!mono) {
    const lineY = Math.round(615 * s);
    const lineH = Math.max(1, Math.round(4 * s));
    const lineXL = Math.round(cx - 90 * s);
    const lineXR = Math.round(cx + 90 * s);
    for (let y = lineY; y < lineY + lineH; y++) {
      for (let x = lineXL; x < lineXR; x++) {
        const idx = (y * W + x) * 4;
        paint(data, idx, VIOLET_R, VIOLET_G, VIOLET_B);
      }
    }
  }

  // ---- 4. Handle — tapered with segmented grip ridges ----
  const handleTopY = Math.round(625 * s);
  const handleBotY = Math.round(810 * s);
  const handleHalfW = Math.round(14 * s);
  for (let y = handleTopY; y < handleBotY; y++) {
    for (let x = cx - handleHalfW; x < cx + handleHalfW; x++) {
      const idx = (y * W + x) * 4;
      // Every ~18px add a darker ring for grip ridges
      const inRidge = Math.floor((y - handleTopY) / (18 * s)) % 2 === 0;
      if (mono) {
        paint(data, idx, 255, 255, 255);
      } else if (inRidge) {
        paint(data, idx, HILT_R, HILT_G, HILT_B);
      } else {
        paint(data, idx, GOLD_R, GOLD_G, GOLD_B);
      }
    }
  }

  // ---- 5. Pommel — chamfered diamond (not a plain circle) ----
  const pommelCY = Math.round(845 * s);
  const pommelR  = Math.round(36  * s);
  for (let y = pommelCY - pommelR; y <= pommelCY + pommelR; y++) {
    for (let x = cx - pommelR; x <= cx + pommelR; x++) {
      // Diamond: |dx| + |dy| <= R
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - pommelCY);
      if (dx + dy > pommelR) continue;
      const idx = (y * W + x) * 4;
      if (mono) {
        paint(data, idx, 255, 255, 255);
      } else if (dx + dy < pommelR * 0.5) {
        paint(data, idx, HILITE_R, HILITE_G, HILITE_B);
      } else {
        paint(data, idx, GOLD_R, GOLD_G, GOLD_B);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Save helper
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
  const bgColor = opts.mono ? C.BLACK : (opts.transparentBg ? 0x00000000 : C.BG);
  const img = await new Promise((resolve, reject) => {
    new Jimp(size, size, bgColor, (err, i) => (err ? reject(err) : resolve(i)));
  });

  drawSword(img, size, size, {
    mono:     opts.mono,
    drawGlow: opts.drawGlow !== false && !opts.mono,
  });

  return img;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Generating DungeonFit v4 icons…\n');

  // 1. Main 1024×1024 icon (obsidian bg + violet glow + gold angular sword)
  const icon1024 = await buildIcon(1024);
  await save(icon1024, path.join(ASSETS_DIR, 'icon.png'));
  console.log('  assets/icon.png');

  // 2. Android adaptive foreground (sword on obsidian — full composition)
  const fgIcon = await buildIcon(1024);
  await save(fgIcon, path.join(ASSETS_DIR, 'android-icon-foreground.png'));
  console.log('  assets/android-icon-foreground.png');

  // 3. Android adaptive background (obsidian + violet nebula only, no sword)
  const bgImg = await new Promise((resolve, reject) => {
    new Jimp(1024, 1024, C.BG, (err, i) => (err ? reject(err) : resolve(i)));
  });
  // Reuse the glow painter — pass drawGlow via a fake call with 0-sized sword
  // geometry. Simplest: call drawSword but then mask blade pixels back to bg.
  // Easier: inline just the glow here.
  {
    const data = bgImg.bitmap.data;
    const glowCX = 512, glowCY = 420, glowR = 480;
    for (let y = 0; y < 1024; y++) {
      for (let x = 0; x < 1024; x++) {
        const dx = x - glowCX, dy = y - glowCY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < glowR) {
          const t = Math.pow(1 - dist / glowR, 2) * 0.55;
          const idx = (y * 1024 + x) * 4;
          const r0 = data[idx], g0 = data[idx + 1], b0 = data[idx + 2];
          paint(data, idx,
            Math.round(r0 + (VIOLET_R - r0) * t),
            Math.round(g0 + (VIOLET_G - g0) * t),
            Math.round(b0 + (VIOLET_B - b0) * t),
          );
        }
      }
    }
  }
  await save(bgImg, path.join(ASSETS_DIR, 'android-icon-background.png'));
  console.log('  assets/android-icon-background.png');

  // 4. Monochrome (white sword on black, no glow)
  const monoIcon = await buildIcon(1024, { mono: true });
  await save(monoIcon, path.join(ASSETS_DIR, 'android-icon-monochrome.png'));
  console.log('  assets/android-icon-monochrome.png');

  // 5. Splash icon 512×512
  const splash = await buildIcon(512);
  await save(splash, path.join(ASSETS_DIR, 'splash-icon.png'));
  console.log('  assets/splash-icon.png');

  // 6. Favicon 64×64 (scaled copy of main icon — matches web bundler expectations)
  const favicon = icon1024.clone().resize(64, 64, Jimp.RESIZE_LANCZOS3);
  await save(favicon, path.join(ASSETS_DIR, 'favicon.png'));
  console.log('  assets/favicon.png');

  // 7. Android mipmap sizes
  const mipmapSizes = [
    { dir: 'mipmap-mdpi',    size: 48  },
    { dir: 'mipmap-hdpi',    size: 72  },
    { dir: 'mipmap-xhdpi',   size: 96  },
    { dir: 'mipmap-xxhdpi',  size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const { dir, size } of mipmapSizes) {
    const resDir = path.join(ANDROID_RES_DIR, dir);
    if (!fs.existsSync(resDir)) continue;

    const regular = icon1024.clone().resize(size, size, Jimp.RESIZE_LANCZOS3);
    const fgSmall = fgIcon.clone().resize(size, size, Jimp.RESIZE_LANCZOS3);

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
