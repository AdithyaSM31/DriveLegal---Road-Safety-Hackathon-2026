const fs = require('fs');

let code = fs.readFileSync('frontend/app.js', 'utf8');

const drawIndex = code.indexOf('function draw() {');
const fillRectIndex = code.indexOf('ctx.fillRect(0, 0, width, height);', drawIndex);

if (drawIndex !== -1 && fillRectIndex !== -1) {
  const originalDrawBlock = code.substring(drawIndex, fillRectIndex + 34);
  
  const newDrawBlock = `function draw() {
    ctx.clearRect(0, 0, width, height);

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (!isLight) {
      let bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        10,
        width / 2,
        height / 2,
        Math.max(width, height),
      );
      bgGrad.addColorStop(0, "#090d16");
      bgGrad.addColorStop(1, "#040609");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    }`;

  code = code.replace(originalDrawBlock, newDrawBlock);
  fs.writeFileSync('frontend/app.js', code);
  console.log('Fixed canvas background painting in app.js');
} else {
  console.log('Could not find the target block.');
}
