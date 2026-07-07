const sharp = require('sharp');
const path = require('path');

const input = path.join(__dirname, 'public', 'logo-original.jpeg');
const outDir = path.join(__dirname, 'public');

async function generate() {
  // Favicon (ICO-style) - 32x32 PNG
  await sharp(input).resize(32, 32).png().toFile(path.join(outDir, 'favicon-32.png'));
  await sharp(input).resize(16, 16).png().toFile(path.join(outDir, 'favicon-16.png'));

  // Apple touch icon - 180x180
  await sharp(input).resize(180, 180).png().toFile(path.join(outDir, 'apple-touch-icon.png'));

  // PWA icons
  await sharp(input).resize(192, 192).png().toFile(path.join(outDir, 'icon-192.png'));
  await sharp(input).resize(512, 512).png().toFile(path.join(outDir, 'icon-512.png'));

  // OG image
  await sharp(input).resize(1200, 630).png().toFile(path.join(outDir, 'og-image.png'));

  console.log('All icons generated!');
}

generate().catch(console.error);
