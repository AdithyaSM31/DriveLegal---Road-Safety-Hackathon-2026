const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

const sidebarUserRegex = /<div class="sidebar-user">([\s\S]*?)<\/div>\s*<\/div>\s*<\/aside>/;
const sidebarMatch = html.match(sidebarUserRegex);
if (sidebarMatch) {
  // Add theme toggle button before closing the sidebar-user div
  const newSidebarUser = sidebarMatch[0].replace('</div></div>\n    </div>\n  </aside>', '<button class="icon-btn" id="btn-theme-desktop" style="margin-left:auto;"><i class="fas fa-moon"></i></button></div></div>\n    </div>\n  </aside>');
  html = html.replace(sidebarMatch[0], newSidebarUser);
}

const mhRightRegex = /<div class="mh-right">\s*<div class="mh-noti-wrap"/;
if (regexTest = html.match(mhRightRegex)) {
  html = html.replace(mhRightRegex, '<div class="mh-right">\n          <button class="icon-btn" id="btn-theme-mobile" style="margin-right: 8px;"><i class="fas fa-moon"></i></button>\n          <div class="mh-noti-wrap"');
}

fs.writeFileSync('frontend/index.html', html);
console.log('Injected theme toggle buttons into index.html');
