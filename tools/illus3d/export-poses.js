// Exporte les poses (articulations 3D + matériel) d'exercices du moteur de schémas vers un JSON lu par Blender.
// Usage : node tools/illus3d/export-poses.js <id[,id…]> <sortie.json>
const fs = require('fs'), path = require('path');
const S = require('../../schemas-src/schemas-core');
const { EXERCISES } = require('../../schemas-src/defs');
const [ids = '', out = 'poses.json'] = process.argv.slice(2);
const pt = p => p.map(v => Math.round(v * 100) / 100);
const J = k => { const o = {}; for (const n of ['hip', 'knee', 'ankle', 'toe', 'shoulder', 'elbow', 'wrist']) o[n] = pt(k[n]); return o; };
// type de main : grip = saisit une barre ; flat = posée à plat (appui) ; open = main libre
const HANDS = {
  'dos-tractions': 'grip', 'aa-negative': 'grip', 'aa-releve-genoux': 'grip', 'ab-leg-raise-susp': 'grip', 'ab-toes-bar': 'grip',
  'aa-suspension': 'grip', 'dos-rowing-aus': 'grip', 'ab-dragon': 'grip',
  'pec-pompes': 'flat', 'aa-pompes-claquees': 'flat', 'ab-plank': 'flat', 'ab-side-plank': 'flat', 'aa-body-saw': 'flat',
  'aa-bird-dog': 'flat', 'cal-lsit': 'flat', 'cal-archer-pompe': 'flat', 'pec-pompes-dec': 'flat', 'pec-pompes-dia': 'flat'
};
const res = [];
for (const id of ids.split(',').filter(Boolean)) {
  const ex = EXERCISES.find(e => e.id === id);
  if (!ex) throw new Error('exercice inconnu : ' + id);
  const cam = { psi: 35, phi: 40 };
  const poses = ex.poses.map((def, idx) => {
    const pose = S.buildPose(ex, def);
    const ctx = { P: pose.near, F: pose.far, S: pose.sides, mid: pose.mid, pose, def, cam, idx };
    const prims = ex.equip(ctx).map(p => ({ t: p.t, p: p.p.map(pt), w: p.w, r: p.r, col: p.col, fill: p.fill }));
    return { hands: HANDS[id] || 'open', label: def.label, near: J(pose.sides[1]), far: J(pose.sides[-1]), hipM: pt(pose.mid.hip), shoulderM: pt(pose.mid.shoulder), head: pt(pose.mid.head), prims };
  });
  res.push({ id, poses });
}
fs.writeFileSync(out, JSON.stringify(res));
console.log(`${res.length} exercice(s) -> ${out}`);
