import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const brandDir = path.resolve(__dirname, '../public/brand');

// Copy main-logo.svg to logo.svg if not present
if (fs.existsSync(path.join(brandDir, 'main-logo.svg'))) {
  fs.copyFileSync(path.join(brandDir, 'main-logo.svg'), path.join(brandDir, 'logo.svg'));
}
if (fs.existsSync(path.join(brandDir, 'main-logo-light.svg'))) {
  fs.copyFileSync(path.join(brandDir, 'main-logo-light.svg'), path.join(brandDir, 'logo-light.svg'));
}

const assets = [
  { svg: 'symbol.svg', png: 'symbol.png', width: 400 },
  { svg: 'logo.svg', png: 'logo.png', width: 1040 },
  { svg: 'logo-light.svg', png: 'logo-light.png', width: 1040 },
  { svg: 'app-icon.svg', png: 'app-icon.png', width: 512 },
  { svg: 'favicon.svg', png: 'favicon.png', width: 64 },
  { svg: 'favicon.svg', png: 'favicon-32.png', width: 32 },
  { svg: 'favicon.svg', png: 'favicon-16.png', width: 16 },
  { svg: 'login-logo.svg', png: 'login-logo.png', width: 800 },
  { svg: 'student-dashboard-logo.svg', png: 'student-dashboard-logo.png', width: 680 },
  { svg: 'admin-dashboard-logo.svg', png: 'admin-dashboard-logo.png', width: 700 },
  { svg: 'loading-logo.svg', png: 'loading-logo.png', width: 400 },
  { svg: 'mobile-icon.svg', png: 'mobile-icon.png', width: 192 },
];

for (const asset of assets) {
  const svgPath = path.join(brandDir, asset.svg);
  const pngPath = path.join(brandDir, asset.png);
  if (fs.existsSync(svgPath)) {
    const svg = fs.readFileSync(svgPath, 'utf8');
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: asset.width },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    fs.writeFileSync(pngPath, pngBuffer);
    console.log(`Generated: ${asset.png} (${asset.width}px)`);
  }
}
console.log('All brand PNG assets generated successfully!');
