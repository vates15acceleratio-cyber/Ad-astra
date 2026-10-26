// Tests de l'appli Ad astra : données, import strict, migration, PWA, programme, agents.
// Usage : cd tests && npm install && npm test   (code 0 = tout passe)
const fs = require('fs'), path = require('path'), vm = require('vm');
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = p => fs.existsSync(path.join(ROOT, p));
const KEY = 'reprise-sport-v1';
const EXAMPLE = JSON.parse(read('data/exemples/journal-exemple.json'));
const V1 = read('tests/fixtures/journal-v1.json');

let passed = 0, failed = 0;
function t(name, fn){
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch(e){ failed++; console.log('  FAIL ' + name + '\n         ' + (e && e.message || e)); }
}
function eq(a, b, msg){ if(JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg||'') + ' attendu ' + JSON.stringify(b) + ', obtenu ' + JSON.stringify(a)); }
function ok(c, msg){ if(!c) throw new Error(msg || 'condition fausse'); }

function load({ seed, search } = {}){
  const html = read('index.html').replace('<script src="app.js"></script>', '');
  const alerts = [];
  const dom = new JSDOM(html, {
    url: 'http://localhost/' + (search || ''), runScripts: 'outside-only', pretendToBeVisual: true,
    beforeParse(w){ if(seed) for(const [k, v] of Object.entries(seed)) w.localStorage.setItem(k, v); w.confirm = () => true; w.alert = m => alerts.push(m); }
  });
  new vm.Script(read('app.js'), { filename: 'app.js' }).runInContext(dom.getInternalVMContext());
  const w = dom.window; w.__alerts = alerts; return w;
}
const clone = o => JSON.parse(JSON.stringify(o));
const tabs = ['today', 'morning', 'log', 'progress', 'plan', 'body', 'data'];
const go = (w, tab) => { w.document.querySelector(`[data-tab="${tab}"]`).click(); return w.document.querySelector('#view').innerHTML; };

console.log('\nPWA et dépôt');
t('versions synchronisées (app.js, sw.js, README)', () => {
  const app = /APP_VERSION = "([\d.]+)"/.exec(read('app.js'))[1];
  const sw = /CACHE_VERSION = 'ad-astra-v([\d.]+)'/.exec(read('sw.js'))[1];
  const rd = /^# .*? — v([\d.]+)/m.exec(read('README.md'));
  ok(rd, 'titre du README sans version'); eq([sw, rd[1]], [app, app], 'versions');
});
t('manifest : icônes présentes, raccourcis valides', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  m.icons.forEach(i => ok(exists(i.src), 'icône absente : ' + i.src));
  ok(m.icons.some(i => i.purpose === 'maskable') && m.icons.some(i => i.sizes === '512x512' && i.purpose === 'any'));
  m.shortcuts.forEach(s => ok(tabs.includes(new URL(s.url, 'http://x/').searchParams.get('tab')), 'raccourci : ' + s.url));
});
t('service worker : tous les fichiers du shell existent', () => {
  const list = /APP_SHELL = \[([\s\S]*?)\]/.exec(read('sw.js'))[1].match(/'\.\/([^']*)'/g).map(s => s.slice(3, -1)).filter(Boolean);
  ok(list.length >= 6); list.forEach(f => ok(exists(f), 'absent du dépôt : ' + f));
});
t('CSP stricte : aucun script ni gestionnaire en ligne', () => {
  const h = read('index.html');
  ok(/script-src 'self';/.test(h)); ok(!/<script>/.test(h)); ok(!/\son\w+=/.test(h));
});
t('.gitignore protège les données personnelles', () => {
  const g = read('.gitignore');
  ['data/journal.json', 'data/coach-notes.json', 'data/rapports/*'].forEach(p => ok(g.includes(p), 'manque : ' + p));
});
t('agents et commande : en-têtes valides', () => {
  ['audit-programme', 'recherche-sport', 'suivi-progression'].forEach(a => {
    const m = /^---\n([\s\S]*?)\n---\n/.exec(read(`.claude/agents/${a}.md`)); ok(m, a);
    ['name', 'description', 'tools', 'model'].forEach(k => ok(new RegExp('^' + k + ':', 'm').test(m[1]), `${a} : ${k}`));
  });
  ok(exists('.claude/commands/bilan-hebdo.md'));
});

console.log('\nAffichage');
t('départ à vide : les 7 onglets s\'affichent sans erreur', () => {
  const w = load();
  tabs.forEach(tb => { const h = go(w, tb); ok(h.length > 50, tb); ok(!h.includes('Erreur d’affichage'), tb); });
});
t('paramètre ?tab= ouvre le bon onglet', () => {
  const w = load({ search: '?tab=morning' });
  ok(w.document.querySelector('#view').textContent.includes('Routine du matin'));
  eq(w.document.querySelector('[aria-selected="true"]').dataset.tab, 'morning');
});
t('journal d\'exemple : tous les onglets s\'affichent', () => {
  const w = load({ seed: { [KEY]: JSON.stringify(EXAMPLE) } });
  tabs.forEach(tb => ok(!go(w, tb).includes('Erreur d’affichage'), tb));
});
t('étiquettes liées aux champs (accessibilité)', () => {
  const w = load(); go(w, 'log');
  const labels = [...w.document.querySelectorAll('#view label')];
  ok(labels.length > 8); labels.forEach(l => ok(l.htmlFor && w.document.getElementById(l.htmlFor), 'label sans champ : ' + l.textContent));
});
t('boutons × avec nom accessible', () => {
  const w = load({ seed: { [KEY]: JSON.stringify(EXAMPLE) } });
  ['log', 'body'].forEach(tb => { go(w, tb); w.document.querySelectorAll('#view button').forEach(b => { if(b.textContent.trim() === '×') ok(b.getAttribute('aria-label'), tb); }); });
});

console.log('\nDonnées : migration et sécurité');
t('migration v1 → v2 : rien n\'est perdu, champs ajoutés', () => {
  const w = load({ seed: { [KEY]: V1 } });
  const db = JSON.parse(w.eval('JSON.stringify(db)')), old = JSON.parse(V1);
  eq(db.sessions.length, old.sessions.length); eq(db.version, 2);
  eq(db.customField, 'doit survivre'); eq(db.sessions[0].champInconnu, 42);
  eq(db.morning, {}); eq(db.mobility, []); eq(db.profile.start, old.profile.start);
});
t('données illisibles : copie brute conservée, alerte affichée', () => {
  const w = load({ seed: { [KEY]: '{pas du json' } });
  eq(w.localStorage.getItem(KEY + '.illisible'), '{pas du json');
  ok(go(w, 'today').includes('illisibles'));
});
t('export complet et date de sauvegarde enregistrée', () => {
  const w = load({ seed: { [KEY]: JSON.stringify(EXAMPLE) } });
  const out = JSON.parse(w.eval('buildExport()'));
  ['version', 'profile', 'sessions', 'body', 'tests', 'coachNotes', 'morning', 'mobility', 'lastExport'].forEach(k => ok(k in out, k));
  eq(out.sessions.length, EXAMPLE.sessions.length); ok(/^\d{4}-\d{2}-\d{2}$/.test(out.lastExport));
});
t('rappel de sauvegarde si jamais exporté (3 séances ou plus)', () => {
  const w = load({ seed: { [KEY]: JSON.stringify(EXAMPLE) } });
  ok(go(w, 'today').includes('Aucune sauvegarde exportée'));
  w.eval('buildExport()'); ok(!go(w, 'data') || !go(w, 'today').includes('Aucune sauvegarde exportée'));
});

console.log('\nImport strict');
const bad = {
  'JSON invalide': '{oups',
  'tableau à la racine': '[1,2]',
  'date de séance invalide': m => { m.sessions[0].date = '2026-13-45'; },
  'type de séance absent': m => { delete m.sessions[0].type; },
  'valeur non numérique (genou)': m => { m.sessions[0].knee = 'beaucoup'; },
  'cardio invalide': m => { m.sessions[1].cardio = 'oui'; },
  'test sans distance': m => { m.tests[0].distance = 'abc'; },
  'routine du matin inconnue': m => { m.morning['2026-10-13'] = 'zumba'; },
  'souplesse invalide': m => { m.mobility[0].reach = {}; },
  'début de cycle invalide': m => { m.profile.start = 'hier'; }
};
Object.entries(bad).forEach(([name, mut]) => t('rejeté : ' + name, () => {
  const w = load({ seed: { [KEY]: JSON.stringify(EXAMPLE) } });
  const before = w.eval('JSON.stringify(db)');
  let text = mut; if(typeof mut === 'function'){ const m = clone(EXAMPLE); mut(m); text = JSON.stringify(m); }
  const r = w.eval('importText')(text, () => true);
  ok(!r.ok, 'aurait dû être rejeté'); eq(w.eval('JSON.stringify(db)'), before, 'données modifiées');
}));
t('journal valide accepté, textes numériques normalisés, copie de sécurité gardée', () => {
  const w = load(); const m = clone(EXAMPLE); m.sessions[0].knee = '2,5'; m.sessions[1].id = m.sessions[0].id;
  const r = w.eval('importText')(JSON.stringify(m), () => true);
  ok(r.ok, r.error); const db = JSON.parse(w.eval('JSON.stringify(db)'));
  eq(db.sessions.length, EXAMPLE.sessions.length); eq(db.sessions[0].knee, 2.5);
  eq(new Set(db.sessions.map(s => s.id)).size, db.sessions.length, 'identifiants en double');
  ok(w.localStorage.getItem(KEY + '.avant-import'));
});
t('import annulé : rien ne change', () => {
  const w = load({ seed: { [KEY]: JSON.stringify(EXAMPLE) } }); const before = w.eval('JSON.stringify(db)');
  const r = w.eval('importText')(JSON.stringify(EXAMPLE), () => false); ok(r.cancelled); eq(w.eval('JSON.stringify(db)'), before);
});
t('notes du coach : fusionnées sans doublon, invalides refusées', () => {
  const w = load(); const notes = { coachNotes: [{ date: '2026-10-26', from: 'Suivi', text: 'Allégez le genou.' }] };
  eq(w.eval('importText')(JSON.stringify(notes), null).added, 1);
  eq(w.eval('importText')(JSON.stringify(notes), null).added, 0);
  ok(!w.eval('importText')(JSON.stringify({ coachNotes: [{ date: 'x', text: 1 }] }), null).ok);
  eq(w.eval('db.coachNotes.length'), 1);
});

console.log('\nProgramme');
t('12 semaines : abdos dans A et C, séance M, semaines allégées signalées', () => {
  const w = load();
  for(let k = 1; k <= 12; k++){
    const P = w.eval(`plan(${k})`);
    ok(P.A.items.some(i => i.startsWith('Bloc abdos (anti')), `S${k} bloc abdos A`);
    ok(P.C.items.some(i => i.startsWith('Bloc abdos (rotation')), `S${k} bloc abdos C`);
    ok(P.B.items.length >= 2 && P.M.items.length >= 8, `S${k} B/M`);
    ok(P.C.items.some(i => i.includes('Genou gauche')), `S${k} consigne genou`);
    eq(!!P.A.note, [4, 8, 12].includes(k), `S${k} note d'allègement`);
  }
});
t('routine du matin : marquage et série', () => {
  const w = load(); go(w, 'morning');
  w.document.querySelector('[data-mark="express"]').click();
  eq(w.eval('streak()'), 1); eq(Object.values(JSON.parse(w.eval('JSON.stringify(db.morning)'))), ['express']);
  w.document.querySelector('[data-mark=""]').click(); eq(w.eval('streak()'), 0);
});

console.log(`\n${passed} réussis, ${failed} échoués`);
process.exit(failed ? 1 : 0);
