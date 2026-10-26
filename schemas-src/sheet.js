// Planche de contrôle : node schemas-src/sheet.js <regex d'ids> <sortie.html>
const fs = require('fs'), path = require('path');
const S = require('./schemas-core');
const { EXERCISES } = require('./defs');
const [re = '.', out = 'sheet.html'] = process.argv.slice(2);
const rx = new RegExp(re), C = S.C;
const css = `body{margin:0;background:${C.bg};color:${C.text};font-family:system-ui,sans-serif;padding:10px}
.card{background:${C.surface};border:1px solid ${C.border};border-radius:10px;padding:8px;margin:0 0 10px;display:flex;gap:8px;flex-wrap:wrap}
.t{flex:0 0 100%;font-size:13px}.p{width:150px;text-align:center;font-size:11px;color:${C.dim}}
.p svg{width:100%;height:auto;display:block;background:${C.bg};border-radius:6px}.i{width:110px}`;
let body = '';
for (const ex of EXERCISES.filter(e => rx.test(e.id))) {
  const poses = ex.poses.map((p, i) => `<div class="p">${S.renderDetail(ex, i)}${i + 1} · ${p.label.replace(/</g, '&lt;')}</div>`).join('');
  const prof = ex.poses.map((p, i) => `<div class="p i">${S.renderPose(ex, i, 'profile', { badge: false, arrow: false, w: 160, h: 160, margin: 6 })}</div>`).join('');
  body += `<div class="card"><div class="t"><b>${ex.id}</b></div><div class="p i">${S.renderIcon(ex)}icône</div>${poses}<div style="flex:0 0 100%;display:flex;gap:6px">${prof}</div></div>`;
}
fs.writeFileSync(out, `<!doctype html><meta charset="utf-8"><style>${css}</style>${body}`);
console.log(EXERCISES.filter(e => rx.test(e.id)).length + ' exercices -> ' + out);
