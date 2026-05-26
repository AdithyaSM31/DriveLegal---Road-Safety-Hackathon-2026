const fs = require('fs');
let codeStr = fs.readFileSync('frontend/app.js', 'utf8');

const regex = /if\s*\(code\s*>\s*50\)\s*\{\s*statusText\s*=\s*"Rainy[^}]+}\s*else\s*if\s*\(code\s*>\s*0\)\s*\{\s*statusText\s*=\s*"Cloudy[^}]+}/;

const newLogic = `if (code === 45 || code === 48) {
      statusText = "Foggy (Low Visibility)";
      iconClass = "fa-smog";
    } else if (code >= 51 && code <= 57) {
      statusText = "Light Rain / Drizzle";
      iconClass = "fa-cloud-rain";
    } else if (code >= 61 && code <= 67) {
      statusText = "Rainy (Drive Slow)";
      iconClass = "fa-cloud-showers-heavy";
    } else if (code >= 71 && code <= 77) {
      statusText = "Snowy (Drive Slow)";
      iconClass = "fa-snowflake";
    } else if (code >= 80 && code <= 82) {
      statusText = "Showers (Drive Slow)";
      iconClass = "fa-cloud-showers-water";
    } else if (code >= 95) {
      statusText = "Stormy (Hazard)";
      iconClass = "fa-bolt-lightning";
    } else if (code > 0) {
      statusText = "Cloudy";
      iconClass = "fa-cloud";
    }`;

if (regex.test(codeStr)) {
  codeStr = codeStr.replace(regex, newLogic);
  fs.writeFileSync('frontend/app.js', codeStr);
  console.log("Weather logic updated successfully with regex.");
} else {
  console.error("Regex match failed.");
}
