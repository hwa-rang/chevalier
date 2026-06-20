/* One-off SVG → PNG rasterizer for character sprites (96×96 grid → 384×384).
 * Usage: node scripts/rasterize.cjs <src.svg> <out.png> [size=384] [viewBoxOverride]
 * Example: node scripts/rasterize.cjs in.svg out.png 384 "-3 -9 96 96" */
const fs = require('fs');
const { Resvg } = require('@resvg/resvg-js');

const [, , src, out, sizeArg, vb] = process.argv;
let svg = fs.readFileSync(src, 'utf8');
if (vb) svg = svg.replace(/viewBox="[^"]*"/, `viewBox="${vb}"`);
const size = Number(sizeArg) || 384;
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: size },
  background: 'rgba(0,0,0,0)',
});
const png = resvg.render();
fs.writeFileSync(out, png.asPng());
console.log(`wrote ${out} (${png.width}×${png.height})`);
