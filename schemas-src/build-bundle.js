// Génère ../croquis.js : moteur + poses en UN fichier navigateur (rendu SVG à la volée).
// Usage : node schemas-src/build-bundle.js   (à relancer après toute modification de schemas-core.js ou data/*.js)
const fs = require('fs'), path = require('path');
const root = __dirname;
const read = f => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
const { FAMILIES } = require('./defs');
const families = FAMILIES.filter(f => fs.existsSync(path.join(root, 'data', f + '.js')));

let out = `/* ==========================================================================
   Ad-astra — Croquis d'exercices (rendu SVG à la volée)
   FICHIER GÉNÉRÉ par schemas-src/build-bundle.js : ne pas le modifier à la main.
   Moteur et poses repris de l'appli Muscu (schemas-core.js, data/*.js) + exercices propres (data/adastra.js).
   API : AdAstraCroquis.has(id) · .icon(id) · .poses(id) -> [{ label, svg }]
   ========================================================================== */
(function () {
  'use strict';
  var __m = {};
  function __req(p) { return __m[p.split('/').pop().replace('.js', '')]; }
  function __def(name, src) { var module = { exports: {} }; src(module, __req); __m[name] = module.exports; }

`;
const wrap = (name, code) => `  __def(${JSON.stringify(name)}, function (module, require) {\n${code.split('\n').map(l => '    ' + l).join('\n')}\n  });\n\n`;
out += wrap('schemas-core', read('schemas-core.js'));
out += wrap('common', read('data/common.js'));
for (const f of families) out += wrap(f, read(`data/${f}.js`));
out += `  var S = __m['schemas-core'], EX = {}, cache = { icon: {}, poses: {} };
  ${JSON.stringify(families)}.forEach(function (f) { __m[f].EXERCISES.forEach(function (e) { EX[e.id] = e; }); });

  window.AdAstraCroquis = {
    has: function (id) { return Object.prototype.hasOwnProperty.call(EX, id); },
    icon: function (id) {
      if (!this.has(id)) return '';
      return cache.icon[id] || (cache.icon[id] = S.renderIcon(EX[id], { decorative: true }));
    },
    poses: function (id) {
      if (!this.has(id)) return [];
      var ex = EX[id];
      return ex.poses.map(function (p, i) {
        var key = id + ':' + i;
        return { label: p.label, svg: cache.poses[key] || (cache.poses[key] = S.renderDetail(ex, i, { label: p.label })) };
      });
    },
    count: Object.keys(EX).length
  };
})();
`;
fs.writeFileSync(path.join(root, '..', 'croquis.js'), out);
console.log(`croquis.js : ${(Buffer.byteLength(out) / 1024).toFixed(0)} Ko, ${families.length} familles`);
