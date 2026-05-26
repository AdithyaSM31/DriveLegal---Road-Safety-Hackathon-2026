const fs = require('fs');

let css = fs.readFileSync('frontend/styles.css', 'utf8');

// 1. Inject into :root
if (!css.includes('--bg-solid:')) {
  css = css.replace('--bg: #05070a;', '--bg: #05070a;\n  --bg-solid: #05070a;\n  --bg-solid-card: #0d1117;');
}

// 2. Inject into [data-theme="light"]
if (!css.includes('--bg-solid: #f8fafc;')) {
  css = css.replace('--bg: #f8fafc;', '--bg: #f8fafc;\n  --bg-solid: #f8fafc;\n  --bg-solid-card: #ffffff;');
}

// 3. Fix .bottom-nav
css = css.replace(/background:\s*var\(--bg-elevated\)\s*!important;/g, 'background: var(--bg-solid) !important;');
css = css.replace(/background:\s*var\(--bg-elevated\);/g, 'background: var(--bg-solid);');

// 4. Fix .mh-dropdown
css = css.replace(/background:\s*var\(--bg-card\);/g, (match, offset) => {
    // Only replace if it's near .mh-dropdown. Let's just do a global replace for mh-dropdown specifically using regex.
    return match;
});

css = css.replace(/\.mh-dropdown\s*\{[^}]*background:\s*var\(--bg-card\);/g, match => {
  return match.replace('background: var(--bg-card);', 'background: var(--bg-solid-card);');
});

fs.writeFileSync('frontend/styles.css', css);
console.log('Fixed opacity for dialogs and bottom nav.');
