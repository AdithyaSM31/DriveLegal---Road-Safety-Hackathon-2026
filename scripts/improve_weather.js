const fs = require('fs');

let appJs = fs.readFileSync('frontend/app.js', 'utf8');

const oldFetch = 'fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);';
const newFetch = 'fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&models=best_match`);';

if (appJs.includes(oldFetch)) {
  appJs = appJs.replace(oldFetch, newFetch);
  fs.writeFileSync('frontend/app.js', appJs);
  console.log('Updated Open-Meteo URL to use best_match models.');
}
