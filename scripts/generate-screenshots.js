#!/usr/bin/env node

const sharp = require('sharp');
const path = require('path');

const outputDir = path.join(__dirname, '../public/screenshots');

async function generateScreenshots() {
  try {
    // Create placeholder for mobile (narrow)
    const mobileWidth = 540;
    const mobileHeight = 720;

    const mobileSvg = `<svg width="${mobileWidth}" height="${mobileHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${mobileWidth}" height="${mobileHeight}" fill="#f8fafc"/>
      <rect x="20" y="20" width="${mobileWidth - 40}" height="80" fill="#3b82f6" rx="8"/>
      <text x="${mobileWidth / 2}" y="70" font-size="24" text-anchor="middle" fill="white" font-weight="bold">Restaurant SaaS</text>
      <rect x="20" y="120" width="${mobileWidth - 40}" height="200" fill="#e0e7ff" rx="8"/>
      <text x="${mobileWidth / 2}" y="230" font-size="18" text-anchor="middle" fill="#3b82f6">Admin Dashboard</text>
      <rect x="20" y="340" width="${mobileWidth - 40}" height="100" fill="#dbeafe" rx="8"/>
      <rect x="20" y="460" width="${mobileWidth - 40}" height="100" fill="#dbeafe" rx="8"/>
      <rect x="20" y="580" width="${mobileWidth - 40}" height="100" fill="#dbeafe" rx="8"/>
    </svg>`;

    await sharp(Buffer.from(mobileSvg))
      .png()
      .toFile(path.join(outputDir, 'admin-dashboard.png'));

    console.log(`✓ Generated admin-dashboard.png (${mobileWidth}x${mobileHeight})`);

    // Create placeholder for desktop (wide)
    const desktopWidth = 1280;
    const desktopHeight = 720;

    const desktopSvg = `<svg width="${desktopWidth}" height="${desktopHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${desktopWidth}" height="${desktopHeight}" fill="#f8fafc"/>
      <rect x="0" y="0" width="250" height="${desktopHeight}" fill="#1e293b"/>
      <rect x="250" y="0" width="${desktopWidth - 250}" height="60" fill="#3b82f6"/>
      <text x="${desktopWidth / 2}" y="40" font-size="24" text-anchor="middle" fill="white" font-weight="bold">Restaurant SaaS</text>
      <rect x="270" y="100" width="${desktopWidth - 540}" height="200" fill="#e0e7ff" rx="8"/>
      <rect x="270" y="330" width="${desktopWidth - 540}" height="200" fill="#dbeafe" rx="8"/>
      <rect x="${desktopWidth - 270}" y="100" width="250" height="430" fill="#e2e8f0" rx="8"/>
    </svg>`;

    await sharp(Buffer.from(desktopSvg))
      .png()
      .toFile(path.join(outputDir, 'admin-desktop.png'));

    console.log(`✓ Generated admin-desktop.png (${desktopWidth}x${desktopHeight})`);
    console.log('\nScreenshot placeholders created. Replace with actual app screenshots for production.');
  } catch (error) {
    console.error('Error generating screenshots:', error);
    process.exit(1);
  }
}

generateScreenshots();
