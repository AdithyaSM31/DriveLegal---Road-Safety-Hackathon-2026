const fs = require('fs');

let code = fs.readFileSync('frontend/app.js', 'utf8');

// The base64 string used for dummy pdf
const dummyPdfBase64 = 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLU31jBQsTAz1LBSK0osSQTShnCWQYGJoZAxkCwD35glRCmVuZHN0cmVhbQplbmRvYmoKCjMgMCBvYmoKNTEKZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveFswIDAgNTk1LjI4IDg0MS44OV0vUmVzb3VyY2VzPDwvRm9udDw8L0YxIDUgMCBSPj4+Pi9Db250ZW50cyAyIDAgUi9QYXJlbnQgMSAwIFI+PgplbmRvYmoKCjEgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzWzQgMCBSXS9Db3VudCAxPj4KZW5kb2JqCgo1IDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+CmVuZG9iagoKNiAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMSAwIFI+PgplbmRvYmoKCjcgMCBvYmoKPDwvUHJvZHVjZXIoanNQREYgMS4wLjI3NSkvQ3JlYXRpb25EYXRlKEQ6MjAxMzA4MDExNjAyMDUpPj4KZW5kb2JqCgp4cmVmCjAgOAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAyMzEgMDAwMDAgbiAKMDAwMDAwMDAxOSAwMDAwMCBuIAowMDAwMDAwMTM1IDAwMDAwIG4gCjAwMDAwMDAxNTQgMDAwMDAgbiAKMDAwMDAwMDI4OCAwMDAwMCBuIAowMDAwMDAwMzc2IDAwMDAwIG4gCjAwMDAwMDA0MjYgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDgvUm9vdCA2IDAgUi9JbmZvIDcgMCBSPj4Kc3RhcnR4cmVmCjUyOQolJUVPRg==';

code = code.replace(
  "const a = document.createElement('a'); a.href = '" + dummyPdfBase64 + "'; a.download = 'Traffic_Laws_Report.pdf'; a.click(); showToast('Traffic Laws PDF downloaded successfully!', 'success');",
  "const a = document.createElement('a'); a.href = 'assets/Traffic_Laws_Report.pdf'; a.download = 'Traffic_Laws_Report.pdf'; a.click(); showToast('Traffic Laws PDF downloaded successfully!', 'success');"
);

code = code.replace(
  "const a = document.createElement('a'); a.href = '" + dummyPdfBase64 + "'; a.download = 'Road_Safety_Analytics.pdf'; a.click(); showToast('Analytics PDF downloaded successfully!', 'success');",
  "const a = document.createElement('a'); a.href = 'assets/Road_Safety_Analytics.pdf'; a.download = 'Road_Safety_Analytics.pdf'; a.click(); showToast('Analytics PDF downloaded successfully!', 'success');"
);

code = code.replace(
  "window.open('https://parivahan.gov.in/parivahan//en/content/motor-vehicles-act-1988-0', '_blank');",
  "window.open('https://www.indiacode.nic.in/bitstream/123456789/9460/1/a1988-59.pdf', '_blank');"
);

fs.writeFileSync('frontend/app.js', code);
