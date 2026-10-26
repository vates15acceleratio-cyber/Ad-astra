// Génère illustrations.js (registre) et la liste de pré-cache du service worker à partir du dossier img/exo/.
// Convention de nommage : img/exo/<id>-<n>.<ext>  (n = 1, 2, 3 ; ext = webp, png, jpg ou svg), ex. dos-tractions-1.webp.
// Usage : node tools/build-illus.js   (puis incrémenter la version : voir CLAUDE.md)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const dir = path.join(root, 'img', 'exo');
const EXT = ['webp', 'png', 'jpg', 'jpeg', 'svg'];
const reg = {}, files = [];
if (fs.existsSync(dir)) {
  for (const f of fs.readdirSync(dir).sort()) {
    const m = /^([a-z0-9-]+)-(\d)\.([a-z]+)$/.exec(f);
    if (!m || !EXT.includes(m[3])) { if (!f.startsWith('.')) console.warn('ignoré (nom inattendu) : ' + f); continue; }
    const [, id, n, ext] = m;
    const r = reg[id] || (reg[id] = { n: 0, ext });
    if (r.ext !== ext) { console.warn(`${id} : extensions mélangées (${r.ext}/${ext}), gardez la même pour toutes les images d'un exercice`); continue; }
    r.n = Math.max(r.n, +n); files.push('./img/exo/' + f);
  }
}
for (const [id, r] of Object.entries(reg)) {
  for (let i = 1; i <= r.n; i++) if (!files.includes(`./img/exo/${id}-${i}.${r.ext}`)) console.warn(`${id} : image ${i} manquante`);
}
const out = `/* GÉNÉRÉ par tools/build-illus.js : ne pas modifier à la main. Illustrations disponibles : id -> nombre d'images et extension. */\nwindow.ILLUS = ${JSON.stringify(reg)};\n`;
fs.writeFileSync(path.join(root, 'illustrations.js'), out);
const swp = path.join(root, 'sw.js');
let sw = fs.readFileSync(swp, 'utf8');
sw = sw.replace(/const ILLUS_FILES = \[[\s\S]*?\];/, `const ILLUS_FILES = ${JSON.stringify(files)};`);
fs.writeFileSync(swp, sw);
console.log(`${Object.keys(reg).length} exercice(s) illustré(s), ${files.length} image(s).`);
