#!/usr/bin/env node
/**
 * Generate SEO assets (OG image PNG, favicon PNGs) from SVG sources.
 * Uses sharp for image conversion.
 *
 * Usage: node scripts/generate-seo-assets.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../client/public');

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('sharp not found. Installing...');
    const { execSync } = await import('child_process');
    execSync('npm install sharp', { cwd: resolve(__dirname, '..'), stdio: 'inherit' });
    sharp = (await import('sharp')).default;
  }

  // Generate OG image (1200x630 PNG from SVG)
  console.log('Generating og-image.png (1200x630)...');
  const ogSvg = readFileSync(resolve(publicDir, 'og-image.svg'));
  await sharp(ogSvg)
    .resize(1200, 630)
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(resolve(publicDir, 'og-image.png'));
  console.log('  -> og-image.png created');

  // Generate favicons from smar-ai.svg
  const faviconSvg = readFileSync(resolve(publicDir, 'smar-ai.svg'));

  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512x512.png', size: 512 },
  ];

  for (const { name, size } of sizes) {
    console.log(`Generating ${name} (${size}x${size})...`);
    await sharp(faviconSvg)
      .resize(size, size)
      .png()
      .toFile(resolve(publicDir, name));
    console.log(`  -> ${name} created`);
  }

  console.log('\nAll SEO assets generated successfully!');
}

main().catch(console.error);
