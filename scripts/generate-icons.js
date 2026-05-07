#!/usr/bin/env node

const sharp = require('sharp');
const path = require('path');

const svgPath = path.join(__dirname, '../public/icons/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');
const publicDir = path.join(__dirname, '../public');

const iconTargets = [
  { size: 32, file: path.join(publicDir, 'favicon.ico'), label: 'favicon.ico' },
  { size: 180, file: path.join(outputDir, 'apple-touch-icon.png'), label: 'apple-touch-icon.png' },
  { size: 192, file: path.join(outputDir, 'icon-192.png'), label: 'icon-192.png' },
  { size: 512, file: path.join(outputDir, 'icon-512.png'), label: 'icon-512.png' },
];

async function renderIcon(size, file) {
  await sharp(svgPath)
    .resize(size, size, {
      fit: 'cover',
      background: { r: 21, g: 19, b: 15, alpha: 1 },
    })
    .png()
    .toFile(file);
}

async function generateIcons() {
  try {
    for (const target of iconTargets) {
      await renderIcon(target.size, target.file);
      console.log(`Generated ${target.label}`);
    }

    const shortcuts = ['shortcut-pedidos', 'shortcut-producto'];
    for (const shortcut of shortcuts) {
      await renderIcon(192, path.join(outputDir, `${shortcut}.png`));
      console.log(`Generated ${shortcut}.png`);
    }

    console.log('\nAll icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
