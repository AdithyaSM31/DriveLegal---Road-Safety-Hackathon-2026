const fs = require('fs');
let css = fs.readFileSync('frontend/styles.css', 'utf8');

const target = 'background:var(--bg-elevated);';
const replacement = 'background:var(--bg);';

if (css.includes(target)) {
  css = css.replace(target, replacement);
  fs.writeFileSync('frontend/styles.css', css);
  console.log('Fixed bottom-nav translucent background');
} else {
  console.log('Could not find the target string');
}
