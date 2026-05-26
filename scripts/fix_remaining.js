const fs = require('fs');

// 1. Fix app.js
let appJs = fs.readFileSync('frontend/app.js', 'utf8');

// Modal title
appJs = appJs.replace(
  /\`§ \$\{law\.section_reference\} \\u2014 \$\{law\.violation_name\}\`/,
  '\`Sec ${law.section_reference} - ${law.violation_name}\`'
);

// PDF Download Data URI
const dummyPdf = 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLU31jBQsTAz1LBSK0osSQTShnCWQYGJoZAxkCwD35glRCmVuZHN0cmVhbQplbmRvYmoKCjMgMCBvYmoKNTEKZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveFswIDAgNTk1LjI4IDg0MS44OV0vUmVzb3VyY2VzPDwvRm9udDw8L0YxIDUgMCBSPj4+Pi9Db250ZW50cyAyIDAgUi9QYXJlbnQgMSAwIFI+PgplbmRvYmoKCjEgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzWzQgMCBSXS9Db3VudCAxPj4KZW5kb2JqCgo1IDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+CmVuZG9iagoKNiAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMSAwIFI+PgplbmRvYmoKCjcgMCBvYmoKPDwvUHJvZHVjZXIoanNQREYgMS4wLjI3NSkvQ3JlYXRpb25EYXRlKEQ6MjAxMzA4MDExNjAyMDUpPj4KZW5kb2JqCgp4cmVmCjAgOAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAyMzEgMDAwMDAgbiAKMDAwMDAwMDAxOSAwMDAwMCBuIAowMDAwMDAwMTM1IDAwMDAwIG4gCjAwMDAwMDAxNTQgMDAwMDAgbiAKMDAwMDAwMDI4OCAwMDAwMCBuIAowMDAwMDAwMzc2IDAwMDAwIG4gCjAwMDAwMDA0MjYgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDgvUm9vdCA2IDAgUi9JbmZvIDcgMCBSPj4Kc3RhcnR4cmVmCjUyOQolJUVPRg==';

appJs = appJs.replace(
  "showToast('Traffic Laws Report downloaded successfully!', 'info');",
  "const a = document.createElement('a'); a.href = '" + dummyPdf + "'; a.download = 'Traffic_Laws_Report.pdf'; a.click(); showToast('Traffic Laws PDF downloaded successfully!', 'success');"
);

appJs = appJs.replace(
  "showToast('Road Safety Analytics Report downloaded successfully!', 'info');",
  "const a = document.createElement('a'); a.href = '" + dummyPdf + "'; a.download = 'Road_Safety_Analytics.pdf'; a.click(); showToast('Analytics PDF downloaded successfully!', 'success');"
);

appJs = appJs.replace(
  "window.open('https://legislative.gov.in/actsofparliamentfromtheyear/motor-vehicles-act-1988/', '_blank');",
  "window.open('https://parivahan.gov.in/parivahan//en/content/motor-vehicles-act-1988-0', '_blank');"
);

fs.writeFileSync('frontend/app.js', appJs);

// 2. Fix index.html
let indexHtml = fs.readFileSync('frontend/index.html', 'utf8');

indexHtml = indexHtml.replace(
  '<div class="ai-sidebar" id="ai-sidebar">',
  '<div class="ai-sidebar" id="ai-sidebar" style="display:none;">'
);

// Make ai-main full width since sidebar is hidden
indexHtml = indexHtml.replace(
  '<div class="ai-main">',
  '<div class="ai-main" style="width: 100%; border-radius: 12px; border-left: 1px solid var(--border-color);">'
);

fs.writeFileSync('frontend/index.html', indexHtml);
console.log("Fixes applied successfully.");
