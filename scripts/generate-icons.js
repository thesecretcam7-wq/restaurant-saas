#!/usr/bin/env node

const sharp = require('sharp');
const path = require('path');

const logoPath = path.join(__dirname, '../public/eccofood-logo.png');
const outputDir = path.join(__dirname, '../public/icons');
const publicDir = path.join(__dirname, '../public');

const iconTargets = [
  { size: 32, file: path.join(publicDir, 'favicon.ico'), label: 'favicon.ico' },
  { size: 180, file: path.join(outputDir, 'apple-touch-icon.png'), label: 'apple-touch-icon.png' },
  { size: 192, file: path.join(outputDir, 'icon-192.png'), label: 'icon-192.png' },
  { size: 512, file: path.join(outputDir, 'icon-512.png'), label: 'icon-512.png' },
];

async function renderIcon(size, file) {
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp(logoPath)
          .resize(Math.round(size * 0.92), Math.round(size * 0.92), {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer(),
        gravity: 'center',
      },
    ])
    .resize(size, size, {
      fit: 'cover',
      background: { r: 0, g: 0, b: 0, alpha: 1 },
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
