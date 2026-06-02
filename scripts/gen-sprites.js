// Regenerates src/assets/sprites/svg/spriteData.ts by inlining each .svg as a string.
// Run with: node scripts/gen-sprites.js
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'assets', 'sprites', 'svg');

const map = {
  bodyS1H1: 'body-skin1-hair1.svg',
  bodyS1H2: 'body-skin1-hair2.svg',
  bodyS2H1: 'body-skin2-hair1.svg',
  bodyS2H2: 'body-skin2-hair2.svg',
  armorCuirass: 'armor-cuirass.svg',
  chainmailS1: 'armor-chainmail-skin1.svg',
  chainmailS2: 'armor-chainmail-skin2.svg',
  shieldMedium: 'shield-medium.svg',
  shieldLarge: 'shield-large.svg',
  helmet1: 'helmet-1.svg',
  helmet2: 'helmet-2.svg',
  helmetChristian: 'helmet-christian.svg',
  weaponShortsword: 'weapon-shortsword.svg',
};

let out =
  '// AUTO-GENERATED from src/assets/sprites/svg/*.svg — do not edit by hand.\n' +
  '// Regenerate with: node scripts/gen-sprites.js\n\n';

for (const [key, file] of Object.entries(map)) {
  let s = fs.readFileSync(path.join(dir, file), 'utf8');
  s = s.replace(/<\?xml[^>]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  out += `export const ${key} = ${JSON.stringify(s)};\n\n`;
}

fs.writeFileSync(path.join(dir, 'spriteData.ts'), out);
const kb = Math.round(fs.statSync(path.join(dir, 'spriteData.ts')).size / 1024);
console.log('spriteData.ts généré:', kb, 'KB');
