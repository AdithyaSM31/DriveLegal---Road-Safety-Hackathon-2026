const fs = require('fs');
let code = fs.readFileSync('frontend/app.js', 'utf8');

const themeLogic = `
document.addEventListener('DOMContentLoaded', () => {
  const btnDesktop = document.getElementById('btn-theme-desktop');
  const btnMobile = document.getElementById('btn-theme-mobile');
  
  const savedTheme = localStorage.getItem('drivelegal_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcons(savedTheme);

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('drivelegal_theme', newTheme);
    updateThemeIcons(newTheme);
  }

  function updateThemeIcons(theme) {
    const iconClass = theme === 'dark' ? 'fa-sun' : 'fa-moon';
    if (btnDesktop) btnDesktop.innerHTML = \`<i class="fas \${iconClass}"></i>\`;
    if (btnMobile) btnMobile.innerHTML = \`<i class="fas \${iconClass}"></i>\`;
  }

  if (btnDesktop) btnDesktop.addEventListener('click', toggleTheme);
  if (btnMobile) btnMobile.addEventListener('click', toggleTheme);
});
`;

if (!code.includes('drivelegal_theme')) {
  code += themeLogic;
  fs.writeFileSync('frontend/app.js', code);
  console.log('Appended theme toggle logic to app.js');
}
