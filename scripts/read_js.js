const fs = require('fs');
let code = fs.readFileSync('frontend/app.js', 'utf8');

const i1 = code.indexOf('document.getElementById("modal-title").textContent');
console.log("MODAL TITLE: " + code.substring(i1, i1 + 100));

const i2 = code.indexOf('btnDownloadLaws.addEventListener');
console.log("DOWNLOAD LAWS: " + code.substring(i2, i2 + 150));

const i3 = code.indexOf('btnViewMvAct.addEventListener');
console.log("MV ACT: " + code.substring(i3, i3 + 150));

const i4 = code.indexOf('btnDownloadAnalytics.addEventListener');
console.log("DOWNLOAD ANALYTICS: " + code.substring(i4, i4 + 150));
