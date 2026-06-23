/* Downscale a raster image (png/jpeg) to a square PNG via resvg.
 * Usage: node scripts/resize-img.cjs <src> <out.png> [size=600] */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const [, , src, out, sizeArg] = process.argv;
const size = Number(sizeArg) || 600;
const ext = path.extname(src).toLowerCase();
const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
const b64 = fs.readFileSync(src).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><image href="data:${mime};base64,${b64}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice"/></svg>`;
const png = new Resvg(svg, { background: 'rgba(0,0,0,0)' }).render();
fs.writeFileSync(out, png.asPng());
console.log(`wrote ${out} (${png.width}×${png.height})`);
