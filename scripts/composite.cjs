/* Stack 384×384 sprite PNG layers into one composite (for previewing placement).
 * Usage: node scripts/composite.cjs <out.png> <layer1.png> <layer2.png> ... */
const fs = require('fs');
const { Resvg } = require('@resvg/resvg-js');

const [, , out, ...layers] = process.argv;
const imgs = layers
  .map((p) => {
    const b64 = fs.readFileSync(p).toString('base64');
    return `<image href="data:image/png;base64,${b64}" x="0" y="0" width="384" height="384"/>`;
  })
  .join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="384" viewBox="0 0 384 384">${imgs}</svg>`;
const resvg = new Resvg(svg, { background: 'rgba(245,237,214,1)' });
fs.writeFileSync(out, resvg.render().asPng());
console.log('wrote', out);
