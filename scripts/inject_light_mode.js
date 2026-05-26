const fs = require('fs');
let css = fs.readFileSync('frontend/styles.css', 'utf8');

const lightMode = `
[data-theme="light"] {
  --primary: #059669;
  --primary-dim: rgba(5,150,105,0.15);
  --primary-bright: #10b981;
  --primary-glow: rgba(5,150,105,0.2);
  --warning: #d97706;
  --danger: #dc2626;
  --orange: #ea580c;
  --bg: #f8fafc;
  --bg-surface: #ffffff;
  --bg-card: #f1f5f9;
  --bg-elevated: #e2e8f0;
  --bg-hover: rgba(0,0,0,0.05);
  --border: rgba(0,0,0,0.1);
  --border-bright: rgba(0,0,0,0.2);
  --text: #0f172a;
  --text-sec: #475569;
  --text-muted: #64748b;
}
`;

if (!css.includes('[data-theme="light"]')) {
  // Find the end of the first :root block
  const rootEndIndex = css.indexOf('}');
  css = css.slice(0, rootEndIndex + 1) + lightMode + css.slice(rootEndIndex + 1);
  fs.writeFileSync('frontend/styles.css', css);
  console.log('Appended light mode CSS variables.');
}
