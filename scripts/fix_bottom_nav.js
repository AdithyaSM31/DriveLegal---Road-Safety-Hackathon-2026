const fs = require('fs');
let css = fs.readFileSync('frontend/styles.css', 'utf8');

const target = '.bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;height:64px;background:#0d1117;border-top:1px solid var(--border);z-index:150;justify-content:space-around;align-items:center;}';
const replacement = '.bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;height:64px;background:var(--bg-elevated);border-top:1px solid var(--border);z-index:150;justify-content:space-around;align-items:center;}';

if (css.includes(target)) {
  css = css.replace(target, replacement);
  fs.writeFileSync('frontend/styles.css', css);
  console.log('Fixed bottom-nav background color');
} else {
  console.log('Could not find the bottom-nav CSS rule');
}
