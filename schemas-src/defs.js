// Agrège les familles de poses (repris de l'appli Muscu) et les exercices propres à Ad-astra.
const fs = require('fs'), path = require('path');
const FAMILIES = ['base', 'pec', 'dos', 'abdos', 'calli', 'jambes', 'adastra'];
const EXERCISES = [];
for (const f of FAMILIES) {
  const file = path.join(__dirname, 'data', f + '.js');
  if (fs.existsSync(file)) EXERCISES.push(...require(file).EXERCISES);
}
module.exports = { EXERCISES, FAMILIES };
