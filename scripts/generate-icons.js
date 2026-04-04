#!/usr/bin/env node

const sharp = require('sharp');
const path = require('path');

const svgPath = path.join(__dirname, '../public/icons/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

const sizes = [192, 512];

async function generateIcons() {
  try {
    for (const size of sizes) {
      await sharp(svgPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 59, g: 130, b: 246, alpha: 1 },
        })
        .png()
        .toFile(path.join(outputDir, `icon-${size}.png`));

      console.log(`✓ Generated icon-${size}.png`);
    }

    // Generate shortcut icons (same as main icons for now)
    const shortcuts = ['shortcut-pedidos', 'shortcut-producto'];

    for (const shortcut of shortcuts) {
      await sharp(svgPath)
        .resize(192, 192, {
          fit: 'contain',
          background: { r: 59, g: 130, b: 246, alpha: 1 },
        })
        .png()
        .toFile(path.join(outputDir, `${shortcut}.png`));

      console.log(`✓ Generated ${shortcut}.png`);
    }

    console.log('\nAll icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
