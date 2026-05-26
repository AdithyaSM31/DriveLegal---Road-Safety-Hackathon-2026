const fs = require('fs');
let css = fs.readFileSync('frontend/styles.css', 'utf8');

const target1 = `background: rgba(13, 17, 23, 0.95);`;
const replacement1 = `background: var(--bg-card);`;

const target2 = `.mh-dropdown button:hover {\n    background: rgba(255, 255, 255, 0.1);\n  }`;
const replacement2 = `.mh-dropdown button:hover {\n    background: var(--bg-hover);\n  }`;

let modified = false;

if (css.includes(target1)) {
  css = css.replace(target1, replacement1);
  modified = true;
} else {
  console.log("Could not find target1");
}

if (css.includes(target2)) {
  css = css.replace(target2, replacement2);
  modified = true;
} else {
  console.log("Could not find target2, trying fallback regex");
  const regex = /\.mh-dropdown\s*button:hover\s*\{\s*background:\s*rgba\(255,\s*255,\s*255,\s*0\.1\);\s*\}/;
  if (regex.test(css)) {
    css = css.replace(regex, `.mh-dropdown button:hover {\n    background: var(--bg-hover);\n  }`);
    modified = true;
  }
}

if (modified) {
  fs.writeFileSync('frontend/styles.css', css);
  console.log('Fixed mh-dropdown CSS for light theme compatibility');
}
