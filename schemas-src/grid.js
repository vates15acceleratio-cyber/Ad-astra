// Planche d'icônes : node schemas-src/grid.js <regex> <sortie.html>   (profil de chaque pose, grand format)
const S = require('./schemas-core'), { EXERCISES } = require('./defs'), fs = require('fs');
const [re = '.', out = 'grid.html'] = process.argv.slice(2), rx = new RegExp(re);
let b = '';
for (const ex of EXERCISES.filter(e => rx.test(e.id))) {
  b += `<div class="c"><b>${ex.id}</b><div class="r">` + ex.poses.map((p, i) => `<figure>${S.renderPose(ex, i, ex.iconCam && ex.iconCam !== 'front' ? ex.iconCam : 'profile', { badge: false, arrow: false, w: 230, h: 230, margin: 6 })}<small>${i + 1}</small></figure>`).join('') + `<figure>${S.renderIcon(ex)}<small>icône</small></figure></div></div>`;
}
fs.writeFileSync(out, `<!doctype html><meta charset="utf-8"><style>body{background:${S.C.bg};color:${S.C.text};font:12px system-ui;margin:8px}.c{margin:0 0 8px}.r{display:flex;gap:6px;flex-wrap:wrap}figure{margin:0;width:170px}svg{width:170px;height:170px;background:${S.C.surface};border-radius:8px}small{color:${S.C.dim}}</style>${b}`);
