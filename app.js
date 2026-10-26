"use strict";
/* ===== Utilitaires ===== */
const KEY = "reprise-sport-v1";
const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2,"0");
const todayISO = () => { const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const parseISO = s => { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
const daysBetween = (a,b) => Math.round((parseISO(b)-parseISO(a))/864e5);
const num = v => { const n = parseFloat(String(v).replace(",",".")); return Number.isFinite(n) ? n : null; };
const fmtDate = s => parseISO(s).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"});

/* ===== Données ===== */
const APP_VERSION = "1.2.0";   // identique à CACHE_VERSION (sw.js) et au titre du README
const DATA_VERSION = 3;        // 1 = avant la routine du matin et les tests de souplesse ; 2 = avant le test de calage des jambes (legReps)
function defaultDB(){
  return {
    version: DATA_VERSION, lastExport: null,
    profile: { start: todayISO(), goalPullups: 10, goalPushups: 40, maxRunMin: 75 },
    sessions: [], body: [], tests: [], coachNotes: [], morning: {}, mobility: []
  };
}
// Migration : complète les champs manquants et ne supprime jamais rien.
function migrate(d){
  if(!d || typeof d!=="object" || Array.isArray(d)) throw new Error("structure");
  const out = Object.assign(defaultDB(), d);
  out.profile = Object.assign(defaultDB().profile, d.profile && typeof d.profile==="object" ? d.profile : {});
  ["sessions","body","tests","coachNotes","mobility"].forEach(k=>{ if(!Array.isArray(out[k])) out[k] = []; });
  if(!out.morning || typeof out.morning!=="object" || Array.isArray(out.morning)) out.morning = {};
  out.version = DATA_VERSION;
  return out;
}
let loadProblem = false;
function loadDB(){
  let raw = null;
  try{ raw = localStorage.getItem(KEY); }catch(e){}
  if(raw){
    try{ return migrate(JSON.parse(raw)); }
    catch(e){
      loadProblem = true;
      try{ localStorage.setItem(KEY + ".illisible", raw); }catch(e2){}   // copie brute conservée
    }
  }
  return defaultDB();
}
let db = loadDB();
let persistAsked = false;
function askPersist(){
  if(persistAsked) return; persistAsked = true;
  try{ if(navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{}); }catch(e){}
}
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(db)); askPersist(); }
  catch(e){ alert("Sauvegarde locale impossible : exportez vos données."); }
}

/* ===== Validation stricte à l'import ===== */
const isDay = s => {
  if(typeof s!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseISO(s);
  return !Number.isNaN(d.getTime()) && `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`===s;
};
// null/absent -> null ; nombre ou texte numérique -> nombre ; sinon NaN
function nn(v){
  if(v==null || v==="") return null;
  if(typeof v==="number") return Number.isFinite(v) ? v : NaN;
  if(typeof v==="string" && /^-?\d+([.,]\d+)?$/.test(v.trim())) return parseFloat(v.replace(",","."));
  return NaN;
}
function cleanJournal(src){
  let d;
  try{ d = migrate(JSON.parse(JSON.stringify(src))); }catch(e){ return {error:"structure"}; }
  const p = d.profile;
  if(!isDay(p.start)) return {error:"profil"};
  for(const k of ["goalPullups","goalPushups","maxRunMin"]){
    const v = nn(p[k]); if(v==null || Number.isNaN(v) || v<=0) return {error:"profil"}; p[k] = v;
  }
  const ids = new Set();
  const uid = (o,pre) => { if(typeof o.id!=="string" || !o.id || ids.has(o.id)) o.id = pre + Date.now().toString(36) + Math.random().toString(36).slice(2,6); ids.add(o.id); };
  const numFields = (o, keys) => { for(const k of keys){ const v = nn(o[k]); if(Number.isNaN(v)) return false; o[k] = v; } return true; };
  for(const x of d.sessions){
    if(!x || typeof x!=="object" || !isDay(x.date) || typeof x.type!=="string" || x.type.length<1 || x.type.length>10) return {error:"séances"};
    if(!numFields(x, ["rpe","knee","sleep","pullups","pushups","legReps"])) return {error:"séances"};
    if(x.cardio!=null){ if(typeof x.cardio!=="object" || !numFields(x.cardio, ["minutes","km","hrAvg","hrMax"])) return {error:"séances"}; }
    if(x.exercises!=null && typeof x.exercises!=="string") return {error:"séances"};
    uid(x,"s");
  }
  for(const x of d.body){
    if(!x || typeof x!=="object" || !isDay(x.date) || !numFields(x, ["weight","waist"])) return {error:"poids et mesures"};
    uid(x,"b");
  }
  for(const x of d.tests){
    if(!x || typeof x!=="object" || !isDay(x.date) || !numFields(x, ["distance","maxHr"]) || x.distance==null || x.distance<=0) return {error:"tests de 6 min"};
    uid(x,"t");
  }
  for(const x of d.mobility){
    if(!x || typeof x!=="object" || !isDay(x.date) || !numFields(x, ["reach","kneeWall","squatHold"])) return {error:"souplesse"};
    uid(x,"m");
  }
  for(const k of Object.keys(d.morning)){
    if(!isDay(k) || (d.morning[k]!=="express" && d.morning[k]!=="full")) return {error:"routine du matin"};
  }
  for(const n of d.coachNotes){ if(!n || typeof n!=="object" || !isDay(n.date) || typeof n.text!=="string") return {error:"notes du coach"}; }
  if(d.lastExport!=null && !isDay(d.lastExport)) d.lastExport = null;
  return {data:d};
}
function importText(text, confirmFn){
  let d;
  try{ d = JSON.parse(text); }catch(e){ return {ok:false, error:"Fichier JSON invalide"}; }
  if(!d || typeof d!=="object" || Array.isArray(d)) return {ok:false, error:"Fichier non reconnu"};
  if(Array.isArray(d.sessions)){
    const r = cleanJournal(d);
    if(r.error) return {ok:false, error:"Fichier invalide ("+r.error+")"};
    if(confirmFn && !confirmFn(`Remplacer les données locales par ce journal (${r.data.sessions.length} séance(s)) ?`)) return {ok:false, cancelled:true};
    try{ localStorage.setItem(KEY + ".avant-import", JSON.stringify(db)); }catch(e){}   // filet de sécurité
    db = r.data; save();
    return {ok:true, kind:"journal"};
  }
  if(Array.isArray(d.coachNotes)){
    for(const n of d.coachNotes){ if(!n || typeof n!=="object" || !isDay(n.date) || typeof n.text!=="string") return {ok:false, error:"Fichier invalide (notes du coach)"}; }
    const seen = new Set(db.coachNotes.map(n=>n.date+"|"+n.text)); let added = 0;
    d.coachNotes.forEach(n=>{ const k = n.date+"|"+n.text; if(!seen.has(k)){ db.coachNotes.push(n); seen.add(k); added++; } });
    save();
    return {ok:true, kind:"notes", added};
  }
  return {ok:false, error:"Fichier non reconnu"};
}
function buildExport(){ db.lastExport = todayISO(); save(); return JSON.stringify(db, null, 2); }
function downloadExport(){
  const blob = new Blob([buildExport()], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "journal.json"; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}

/* ===== Programme 12 semaines (3 séances / semaine) ===== */
const DELOAD = [4,8,12];
const REPS_TEST = [1,4,8,12];   // semaines de bilan : tests de force, de 6 min, de souplesse, poids
const BILAN = REPS_TEST;
const CARDIO = {
  1:"Test de 6 minutes : échauffement 10 min, distance maximale en 6 min, retour au calme. Noter distance et FC pic.",
  2:"Endurance facile 30–40 min (allure de conversation).",
  3:"4×4 nordique : 4 × 4 min à 85–95 % FCmax, récupération 3 min à 60–70 %.",
  4:"Test de 6 minutes (bilan) : échauffement 10 min, distance maximale en 6 min, retour au calme. Puis 10 min facile (semaine allégée).",
  5:"4×4 nordique.",
  6:"30/30 : 2 séries de 10 × (30 s à VMA / 30 s facile), 4 min entre les séries.",
  7:"4×4 nordique.",
  8:"Test de 6 minutes (bilan) : échauffement 10 min, distance maximale en 6 min, retour au calme. Puis 10 min facile (semaine allégée).",
  9:"4×4 nordique.",
  10:"30/30 : 2 séries de 12 × (30 s à VMA / 30 s facile).",
  11:"4×4 nordique.",
  12:"Test de 6 minutes final (comparer à la semaine 1), puis bilan."
};
const phaseOf = w => w<=2 ? "Adaptation" : w<=6 ? "Construction" : "Intensification";
function pullSets(w){ return w<=2 ? "5 × 2–3, sous‑maximal, jamais à l’échec" : w<=6 ? "5 × 3–4" : "4 × 4–6"; }
function pushSets(w){
  if(w<=2) return "3 × 12–14, descente 3 s";
  if(w<=6) return "4 × 12–15 (2 séries pieds surélevés)";
  return "4 × 10–12 en variantes (archer, mains rapprochées)";
}
function absA(w){
  if(w<=2) return ["Bloc abdos (anti‑extension et flexion) : planche 3 × 30–45 s","Dead bug : 3 × 8 par côté, lombaires plaquées au sol","Relevés de genoux, au sol ou suspendus : 3 × 8–10"];
  if(w<=6) return ["Bloc abdos (anti‑extension et flexion) : planche 3 × 45–60 s","Body saw (pieds sur une serviette, glissement avant‑arrière) : 3 × 8–10","Relevés de genoux suspendus, genoux au‑dessus des hanches : 3 × 8–10"];
  return ["Bloc abdos (anti‑extension et flexion) : hollow body 3 × 20–30 s","Body saw ou roulette : 3 × 10–12","Relevés de jambes tendues suspendus : 4 × 8–10, puis pieds vers la barre en progression"];
}
function absC(w){
  if(w<=2) return ["Bloc abdos (rotation et latéral) : gainage latéral 3 × 25 s par côté","Bird‑dog : 3 × 8 par côté, pause de 2 s","Crunch oblique : 3 × 10 par côté"];
  if(w<=6) return ["Bloc abdos (rotation et latéral) : gainage latéral 3 × 30–40 s par côté","Hollow body : 3 × 20 s","Russian twist lesté (sac ou bouteille) : 3 × 10 par côté"];
  return ["Bloc abdos (rotation et latéral) : gainage latéral 3 × 40–45 s par côté","Hollow rocks : 3 × 12","L‑sit au sol ou sur barres (jambes pliées si besoin) : 4 × 10–15 s","Dragon flag en progression (genoux groupés, descente lente, dos en bloc) : 3 × 3–5"];
}
function mobItems(w){
  const it = [
    "Échauffement 3 min : cercles articulaires, marche sur place, cat‑cow",
    "Ischio‑jambiers : flexion avant jambes tendues, 2 × 45 s par jambe (contracter 5 s, relâcher, aller plus loin)",
    "Fléchisseurs de hanche : fente basse, 2 × 45 s par côté",
    "Fessiers et rotation de hanche : pigeon ou 90/90, 2 × 45 s par côté",
    "Adducteurs : grenouille ou papillon, 2 × 45–60 s",
    "Chevilles : genou vers le mur, talon au sol, 2 × 10 par côté",
    "Colonne thoracique : rotations à quatre pattes, 2 × 8 par côté",
    "Épaules : suspension passive à la barre 3 × 20–30 s, étirement des pectoraux au mur 2 × 30 s",
    "Poignets : flexions et extensions en appui, 2 × 10",
    "Retour au calme : respiration lente allongé, 2 min"
  ];
  if(w>=7) it.splice(5,0,"Progression : grand écart facial ou latéral assisté (coussins), 3 × 30–45 s sans forcer");
  it.push("Intensité : tension nette mais jamais de douleur (environ 5–6/10). Pas d’étirement statique long juste avant sauts ou sprints.");
  return it;
}
function plan(w){
  const deload = DELOAD.includes(w);
  const test = REPS_TEST.includes(w);
  const A = [
    `${test?"Test de calage et de bilan":"Test de calage"} (5 min, après échauffement, une série chacun) : maximum de tractions strictes, maximum de pompes propres, en gardant une exécution propre. À noter dans le journal : ils règlent la séance suivante.`,
    `Tractions : ${pullSets(w)}`,
    "Négatives : 3 × 3, descente 4–5 s",
    "Tirages horizontaux (table solide ou anneaux) : 3 × 8–12",
    `Pompes : ${pushSets(w)}`,
    ...absA(w)
  ].filter(Boolean);
  const B = [
    CARDIO[w],
    BILAN.includes(w) ? "Test de calage = le test de 6 minutes ci-dessus." : "Test de calage : à la fin, notez la FC moyenne et l’effort perçu (1–10) dans le journal. Ils règlent la séance suivante.",
    "Genou gauche : course continue limitée à " + db.profile.maxRunMin + " min. Les sorties longues se font à vélo ou en piscine."
  ];
  let C;
  if(w<=2) C = ["Squats bulgares : 3 × 8 par jambe, amplitude confortable","Fentes arrière : 3 × 8 par jambe","Squats au poids du corps, tempo lent : 3 × 10"];
  else if(w<=6) C = ["Squats bulgares : 3 × 8–10 par jambe","Squats sautés : 3 × 6–8","Corde à sauter : 5 × 1 min","Pistol assisté : 3 × 3 par jambe"];
  else C = ["Squats bulgares lestés (sac à dos) : 4 × 8–10 par jambe","Pistol squat en progression : 3 × 3–5 par jambe","Sauts sur box : 4 × 5","Pompes claquées (si 25 pompes propres atteintes) : 3 × 5","Corde à sauter : 6 × 1 min"];
  C.unshift("Test de calage (après échauffement, une série par jambe) : maximum de squats bulgares propres par jambe. Arrêtez si la technique se dégrade ou si le genou atteint 4/10. À noter dans le journal.");
  C.push(...absC(w));
  C.push("Genou gauche : arrêter l’exercice si la douleur atteint 4/10.");
  const O = ["Piscine ou vélo facile, 20–30 min","Mobilité hanches, épaules, chevilles : 10 min"];
  const note = deload ? "Semaine allégée : réduire le nombre de séries d’environ 30 %, garder une exécution propre." : "";
  return {
    A:{name:"A · Force haut du corps", items:A, note},
    B:{name:"B · Moteur aérobie", items:B, note},
    C:{name:"C · Jambes, tronc, explosivité", items:C, note},
    M:{name:"M · Souplesse et mobilité (optionnelle, 25 min)", items:mobItems(w), note:""},
    O:{name:"Option · Récupération active", items:O, note:""}
  };
}
const weekOf = d => Math.min(12, Math.max(1, Math.floor(daysBetween(db.profile.start, d)/7)+1));
const rawWeekOf = d => Math.floor(daysBetween(db.profile.start, d)/7)+1;

/* ===== Calculs ===== */
function lastTest(){ return db.tests.slice().sort((a,b)=>a.date.localeCompare(b.date)).pop() || null; }
function paces(){
  const t = lastTest(); if(!t) return null;
  const vma = t.distance/100; // km/h (6 min)
  const fcmax = t.maxHr || null;
  return {
    vma, fcmax,
    pace: 60/vma, // min/km à VMA
    fc4x4: fcmax ? [Math.round(fcmax*.85), Math.round(fcmax*.95)] : null,
    fcRec: fcmax ? [Math.round(fcmax*.60), Math.round(fcmax*.70)] : null
  };
}
const fmtPace = m => { let mm=Math.floor(m), ss=Math.round((m-mm)*60); if(ss===60){ mm++; ss=0; } return `${mm}:${pad(ss)} /km`; };
function weeklyCounts(){
  const map = {};
  db.sessions.filter(s=>s.type!=="M"&&s.type!=="O").forEach(s=>{ const w = rawWeekOf(s.date); map[w]=(map[w]||0)+1; });
  return map;
}
function alerts(){
  const out = [];
  if(loadProblem) out.push({lvl:"danger", t:"Les données locales étaient illisibles. Une copie brute est conservée dans le navigateur (clé « "+KEY+".illisible »). N’effacez rien avant de l’avoir récupérée."});
  if(db.sessions.length>=3){
    const age = db.lastExport ? daysBetween(db.lastExport, todayISO()) : null;
    if(age===null) out.push({lvl:"warn", t:"Aucune sauvegarde exportée. Exportez votre journal (onglet Données) pour ne rien perdre."});
    else if(age>=14) out.push({lvl:"warn", t:`Dernière sauvegarde il y a ${age} jours. Pensez à exporter votre journal.`});
  }
  const ss = db.sessions.slice().sort((a,b)=>a.date.localeCompare(b.date));
  const last3 = ss.slice(-3).filter(s=>s.knee!=null);
  if(ss.length && ss[ss.length-1].knee>=6) out.push({lvl:"danger", t:"Douleur au genou ≥ 6/10 à la dernière séance : suspendez les impacts (course, sauts) et consultez si cela persiste."});
  else if(last3.length>=2 && last3.reduce((a,s)=>a+s.knee,0)/last3.length>=4) out.push({lvl:"warn", t:"Genou gauche : douleur moyenne ≥ 4/10 sur les dernières séances. Remplacez la course par du vélo ou de la piscine et allégez les sauts."});
  if(ss.length){
    const gap = daysBetween(ss[ss.length-1].date, todayISO());
    if(gap>=7) out.push({lvl:"warn", t:`Aucune séance depuis ${gap} jours. Reprenez avec la séance suivante du plan, sans rattraper.`});
  }
  const rpeHigh = ss.slice(-3).filter(s=>s.rpe>=9).length;
  if(rpeHigh>=2) out.push({lvl:"warn", t:"Plusieurs séances récentes à effort ≥ 9/10 : passez à une séance allégée."});
  return out;
}

/* ===== Calage et bilans ===== */
// Règle pratique de calage : séries de travail = part du dernier maximum. Elle suit les fourchettes déjà écrites dans le
// programme (« sous-maximal ») ; aucune étude validée ne relie un maximum de répétitions en poids du corps à des séries
// de travail : à ajuster selon le ressenti.
const RATIO = w => w<=2 ? .6 : w<=6 ? .7 : .75;
const byDate = (a,b) => a.date.localeCompare(b.date);
const withKey = k => db.sessions.filter(s=>s[k]!=null).sort(byDate);
const lastOf = k => { const a = withKey(k); return a.length ? a[a.length-1] : null; };
const firstOf = k => withKey(k)[0] || null;
const workReps = (max, w) => Math.max(1, Math.round(max*RATIO(w)));
// Fourchettes du programme (mêmes valeurs que pullSets, pushSets et la liste C de plan()) : le calage ne choisit qu'à l'intérieur.
const RANGE = {
  pull:w => w<=2 ? {sets:5,lo:2,hi:3} : w<=6 ? {sets:5,lo:3,hi:4} : {sets:4,lo:4,hi:6},
  push:w => w<=2 ? {sets:3,lo:12,hi:14} : w<=6 ? {sets:4,lo:12,hi:15} : {sets:4,lo:10,hi:12},
  leg:w => w<=2 ? {sets:3,lo:8,hi:8} : w<=6 ? {sets:3,lo:8,hi:10} : {sets:4,lo:8,hi:10}
};
function targetText(max, w, rg, harder){
  const r = workReps(max, w), span = rg.lo===rg.hi ? `${rg.lo}` : `${rg.lo}–${rg.hi}`;
  if(r<rg.lo) return `<b>${rg.sets} × ${r}</b> (le programme indique ${span} : votre maximum est encore bas, restez sous-maximal et ajoutez des négatives ou des séries courtes)`;
  if(r>rg.hi) return `<b>${rg.sets} × ${rg.hi}</b> (haut de la fourchette ${span}${harder?` : passez à une variante plus difficile (${harder})`:""})`;
  return `<b>${rg.sets} × ${r}</b> (dans la fourchette ${span} du programme)`;
}
function kneeFlag(){
  const ss = db.sessions.slice().sort(byDate); if(!ss.length) return false;
  if(ss[ss.length-1].knee>=6) return true;
  const l = ss.slice(-3).filter(x=>x.knee!=null);
  return l.length>=2 && l.reduce((a,x)=>a+x.knee,0)/l.length>=4;
}
const CALAGE = {
  A:"Après l’échauffement : une série de tractions strictes au maximum, repos 3 min, une série de pompes propres au maximum. Arrêtez dès que la technique se dégrade.",
  B:"Pas de test avant l’effort : à la fin de la séance, notez la FC moyenne et l’effort perçu (1–10). Pendant les semaines de bilan, le test de 6 minutes remplace la séance.",
  C:"Après l’échauffement : une série de squats bulgares propres au maximum par jambe, la plus faible d’abord. Arrêtez si la technique se dégrade ou si le genou atteint 4/10."
};
function calageRefs(type, w){
  const out = [];
  if(type==="A"){
    const p = lastOf("pullups"), u = lastOf("pushups");
    out.push(p ? `Tractions : dernier maximum <b>${p.pullups}</b> (${esc(fmtDate(p.date))}) → séries de travail ${targetText(p.pullups,w,RANGE.pull(w),"tractions lestées ou archer")}` : "Tractions : pas encore de référence. Faites le test.");
    out.push(u ? `Pompes : dernier maximum <b>${u.pushups}</b> (${esc(fmtDate(u.date))}) → séries de travail ${targetText(u.pushups,w,RANGE.push(w),"archer, mains rapprochées, pieds surélevés")}` : "Pompes : pas encore de référence. Faites le test.");
  } else if(type==="C"){
    const l = lastOf("legReps");
    if(kneeFlag()) out.push("<b>Test reporté</b> : le genou gauche est sensible ces derniers jours. Gardez l’amplitude confortable, sans sauts, et refaites le test quand l’alerte a disparu.");
    out.push(l ? `Squats bulgares : dernier maximum <b>${l.legReps}</b> par jambe (${esc(fmtDate(l.date))}) → séries de travail ${targetText(l.legReps,w,RANGE.leg(w),"squats bulgares lestés")} par jambe` : "Squats bulgares : pas encore de référence. Faites le test quand le genou le permet.");
  } else if(type==="B"){
    const b = db.sessions.filter(s=>s.type==="B" && s.rpe!=null).sort(byDate).pop();
    const p = paces();
    if(b){
      const adv = b.rpe>=9 ? "trop dure : restez en bas de la fourchette de FC" : b.rpe<=4 ? "facile : vous pouvez viser le haut de la fourchette de FC" : "dans la bonne zone : gardez le même niveau";
      out.push(`Dernière séance B : effort <b>${b.rpe}/10</b> (${esc(fmtDate(b.date))}), ${adv}.`);
    } else out.push("Pas encore de séance B enregistrée : notez l’effort perçu à la fin.");
    if(p) out.push(`Repères du dernier test de 6 minutes : VMA <b>${p.vma.toFixed(1)} km/h</b>${p.fc4x4?`, FC des 4 min ${p.fc4x4[0]}–${p.fc4x4[1]}, récupération ${p.fcRec[0]}–${p.fcRec[1]}`:""}.`);
    else out.push("Pas encore de test de 6 minutes : il est prévu en semaine 1.");
  }
  return out;
}
function calageCard(type, w){
  const refs = calageRefs(type, w);
  return `<div class="calage"><div class="lbl-up">${ic("play","sm")}Test de calage avant la séance</div><p>${esc(CALAGE[type]||"")}</p>${refs.length?`<ul class="plan">${refs.map(r=>`<li>${r}</li>`).join("")}</ul>`:""}<small>Règle pratique, non validée par la recherche : séries de travail à environ ${Math.round(RATIO(w)*100)} % du dernier maximum. Ajustez selon le ressenti.</small></div>`;
}
// Où en suis-je ? Repère linéaire entre la première mesure et l'objectif à la semaine 12 (ta propre trajectoire, pas une norme).
function whereAmI(key, goal){
  const f = firstOf(key), l = lastOf(key);
  if(!f) return null;
  const w0 = Math.max(1, rawWeekOf(f.date)), wNow = Math.min(12, Math.max(1, rawWeekOf(todayISO())));
  const frac = w0>=12 ? 1 : Math.min(1, Math.max(0, (wNow-w0)/(12-w0)));
  const exp = f[key] + (goal - f[key])*frac;
  const diff = l[key] - exp, tol = Math.max(1, goal*0.05);
  const state = f===l && w0===wNow ? "départ" : diff>=tol ? "en avance" : diff<=-tol ? "en retard" : "dans la trajectoire";
  return {base:f[key], last:l[key], exp:Math.round(exp*10)/10, goal, state, pct:Math.max(0,Math.min(100,Math.round(l[key]/goal*100))), date:l.date};
}
function nextBilan(){
  const rw = rawWeekOf(todayISO());
  const wk = BILAN.find(b=>b>=Math.max(1,rw));
  if(!wk) return null;
  const d = parseISO(db.profile.start); d.setDate(d.getDate()+(wk-1)*7);
  return {week:wk, date:dayKey(d)};
}
function bilanStatus(){
  const rw = rawWeekOf(todayISO()), inWeek = d => rawWeekOf(d)===rw;
  return [
    {k:"A", t:"Tractions et pompes au maximum (séance A)", ok:db.sessions.some(s=>inWeek(s.date) && (s.pullups!=null || s.pushups!=null)), tab:"log", type:"A"},
    {k:"B", t:"Test de 6 minutes", ok:db.tests.some(t=>inWeek(t.date)), tab:"body", held:kneeFlag()},
    {k:"S", t:"Tests de souplesse", ok:db.mobility.some(m=>inWeek(m.date)), tab:"body"},
    {k:"P", t:"Poids et tour de taille", ok:db.body.some(b=>inWeek(b.date)), tab:"body"}
  ];
}
function levelCard(){
  const rows = [["Tractions max","pullups",db.profile.goalPullups],["Pompes max","pushups",db.profile.goalPushups]]
    .map(([t,k,g])=>({t, w:whereAmI(k,g)}));
  const tests = db.tests.slice().sort(byDate), vma = tests.length ? tests : null;
  const nb = nextBilan();
  const row = r => r.w ? `<div class="lvl"><div class="lvl-h"><b>${esc(r.t)}</b><span class="tag ${r.w.state==="en retard"?"warn":r.w.state==="départ"?"":"ok"}">${esc(r.w.state)}</span></div>
      <div class="lvl-n">${r.w.base} → <b>${r.w.last}</b> <span>/ objectif ${r.w.goal}</span></div>
      <div class="bar" role="img" aria-label="${r.w.pct} % de l’objectif"><i style="width:${r.w.pct}%"></i></div>
      <small style="margin-top:2px">Repère de la trajectoire aujourd’hui : environ ${r.w.exp}.</small></div>`
    : `<div class="lvl"><div class="lvl-h"><b>${esc(r.t)}</b><span class="tag">pas de mesure</span></div><small>Faites le test de calage en séance A pour vous situer.</small></div>`;
  const v = vma ? `<div class="lvl"><div class="lvl-h"><b>VMA</b></div><div class="lvl-n">${(vma[0].distance/100).toFixed(1)} → <b>${(vma[vma.length-1].distance/100).toFixed(1)}</b> <span>km/h</span></div></div>` : "";
  return `<div class="card"><h2>${ic("chart")}Où j’en suis</h2>${rows.map(row).join("")}${v}
    ${nb?`<small>Prochain bilan : semaine ${nb.week} (${esc(fmtDate(nb.date))}) : tractions, pompes, test de 6 minutes, souplesse, poids.</small>`:`<small>Cycle de 12 semaines terminé.</small>`}</div>`;
}
function bilanCard(){
  const w = weekOf(todayISO());
  if(!BILAN.includes(w) || rawWeekOf(todayISO())>12) return "";
  const st = bilanStatus(), left = st.filter(x=>!x.ok && !x.held).length;
  return `<div class="card bilan"><h2>${ic("shield")}Semaine de bilan</h2><p>${left?`Cette semaine, faites les mesures qui comparent votre niveau à celui du début (${left} restante${left>1?"s":""}).`:"Toutes les mesures du bilan sont faites."}</p>
    <div class="list">${st.map(x=>`<div class="item"><div class="badge ${x.ok?"ok":""}">${x.ok?ic("check","sm"):esc(x.k)}</div><div class="main"><div class="t">${esc(x.t)}</div></div>${x.ok?`<span class="tag ok">fait</span>`:x.held?`<span class="tag warn">reporté (genou)</span>`:`<button class="ghost" data-go="${x.tab}" ${x.type?`data-type="${x.type}"`:""} type="button">Ouvrir</button>`}</div>`).join("")}</div></div>`;
}

/* ===== Icônes ===== */
const ICONS = {
  home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  log:'<path d="M5 3h11l3 3v15H5z"/><path d="M9 9h6M9 13h6M9 17h3"/>',
  chart:'<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
  plan:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  body:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  data:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  coach:'<circle cx="12" cy="12" r="9"/><path d="M12 7.5v.5M12 11v6"/>',
  down:'<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  up:'<path d="M12 15V3M7 8l5-5 5 5M4 20h16"/>',
  play:'<path d="M7 4l13 8-13 8z"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'
};
const ic = (n, cls="") => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||""}</svg>`;
let toastTimer = null;
function toast(msg){
  const t = $("#toast"); if(!t) return;
  t.innerHTML = ic("check") + `<span>${esc(msg)}</span>`;
  t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.remove("show"), 2200);
}
const toTop = () => { document.documentElement.scrollTop = 0; document.body.scrollTop = 0; };
const delBtn = (attr, id, label) => `<button class="icon-btn" ${attr}="${esc(id)}" aria-label="${esc(label)}" type="button">${ic("trash","sm")}</button>`;

/* ===== Graphiques SVG ===== */
let chartN = 0;
function lineChart(points, opt={}){
  const W=640,H=230,L=46,R=14,T=22,B=34;
  if(!points.length) return `<p class="empty">Pas encore de données.</p>`;
  const id = "cg" + (++chartN);
  const xs = points.map(p=>daysBetween(db.profile.start,p.x));
  const ys = points.map(p=>p.y).concat(opt.goal!=null?[opt.goal]:[]);
  let x0=Math.min(0,...xs), x1=Math.max(7,...xs);
  let y0=opt.min!=null?opt.min:Math.min(...ys), y1=Math.max(...ys);
  if(y0===y1){ y0-=1; y1+=1; }
  const pad_=(y1-y0)*.12; y0 = opt.min!=null?opt.min:y0-pad_; y1+=pad_;
  const sx = v => L+(v-x0)/(x1-x0||1)*(W-L-R);
  const sy = v => H-B-(v-y0)/(y1-y0||1)*(H-T-B);
  let g="";
  for(let i=0;i<=3;i++){
    const v=y0+(y1-y0)*i/3, y=sy(v);
    g+=`<line x1="${L}" x2="${W-R}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-dasharray="2 4"/><text x="${L-8}" y="${(y+4).toFixed(1)}" text-anchor="end">${Math.round(v*10)/10}</text>`;
  }
  const color = opt.color||"var(--c1)";
  const pts = points.map((p,i)=>[sx(xs[i]),sy(p.y)]);
  const path = pts.map((p,i)=>`${i?"L":"M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L${pts[pts.length-1][0].toFixed(1)},${H-B} L${pts[0][0].toFixed(1)},${H-B} Z`;
  const dots = points.map((p,i)=>`<circle cx="${pts[i][0].toFixed(1)}" cy="${pts[i][1].toFixed(1)}" r="${i===points.length-1?5:3.5}" fill="${i===points.length-1?color:"var(--surface)"}" stroke="${color}" stroke-width="2"><title>${esc(fmtDate(p.x))} : ${p.y}</title></circle>`).join("");
  const goal = opt.goal!=null ? `<line x1="${L}" x2="${W-R}" y1="${sy(opt.goal).toFixed(1)}" y2="${sy(opt.goal).toFixed(1)}" stroke="var(--c4)" stroke-width="1.5" stroke-dasharray="6 5"/><text x="${W-R}" y="${(sy(opt.goal)-6).toFixed(1)}" text-anchor="end" style="fill:var(--c4)">objectif ${opt.goal}</text>` : "";
  const first = points[0].x, lastP = points[points.length-1].x;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.label||"graphique")}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${color};stop-opacity:.32"/><stop offset="1" style="stop-color:${color};stop-opacity:0"/></linearGradient></defs>${g}${goal}<path d="${area}" fill="url(#${id})"/><path d="${path}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>${dots}<text x="${L}" y="${H-9}">${esc(fmtDate(first))}</text><text x="${W-R}" y="${H-9}" text-anchor="end">${esc(fmtDate(lastP))}</text></svg>`;
}
function barChart(map){
  const W=640,H=190,L=34,R=10,T=16,B=34;
  const weeks = Array.from({length:12},(_,i)=>i+1);
  const max = Math.max(4, ...Object.values(map));
  const bw = (W-L-R)/12, cur = rawWeekOf(todayISO());
  let out="";
  weeks.forEach((w,i)=>{
    const v = map[w]||0, h=(H-T-B)*v/max, x=L+i*bw+5;
    const fill = v>=3 ? "var(--c1)" : v>0 ? "var(--accent-dim)" : "var(--surface-3)";
    out+=`<rect x="${x.toFixed(1)}" y="${(H-B-Math.max(h,3)).toFixed(1)}" width="${(bw-10).toFixed(1)}" height="${Math.max(h,3).toFixed(1)}" rx="4" fill="${fill}"><title>S${w} : ${v} séance(s)</title></rect><text x="${(x+(bw-10)/2).toFixed(1)}" y="${H-9}" text-anchor="middle"${w===cur?' style="fill:var(--accent)"':""}>${w}</text>`;
  });
  const y3 = H-B-(H-T-B)*3/max;
  out+=`<line x1="${L}" x2="${W-R}" y1="${y3.toFixed(1)}" y2="${y3.toFixed(1)}" stroke="var(--c4)" stroke-dasharray="6 5"/><text x="${L-6}" y="${(y3+4).toFixed(1)}" text-anchor="end" style="fill:var(--c4)">3</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Séances par semaine">${out}</svg>`;
}

/* ===== Vues ===== */
let tab = "today";
const TABS = [["today","Accueil","home"],["morning","Matin","sun"],["log","Journal","log"],["progress","Progrès","chart"],["plan","Plan","plan"],["body","Corps","body"],["data","Données","data"]];
{ try{ const t = new URLSearchParams(location.search).get("tab"); if(TABS.some(x=>x[0]===t)) tab = t; }catch(e){} }
let prefill = null, tabChanged = false;

function renderTabs(){
  $("#tabs").innerHTML = TABS.map(([k,l,i])=>`<button role="tab" aria-selected="${k===tab}" aria-label="${esc(l)}" data-tab="${k}">${ic(i)}<span>${esc(l)}</span></button>`).join("");
  $("#tabs").querySelectorAll("button").forEach(b=>b.onclick=()=>{ if(tab!==b.dataset.tab) tabChanged = true; tab=b.dataset.tab; render(); toTop(); });
}
function renderInner(){
  const w = weekOf(todayISO());
  $("#subtitle").textContent = `Semaine ${w}/12 · ${phaseOf(w)}${DELOAD.includes(w)?" · allégée":""}`;
  renderTabs();
  const v = {today:viewToday, morning:viewMorning, log:viewLog, progress:viewProgress, plan:viewPlan, body:viewBody, data:viewData}[tab];
  const view = $("#view");
  view.innerHTML = v();
  view.classList.remove("view-enter");
  if(tabChanged){ void view.offsetWidth; view.classList.add("view-enter"); tabChanged = false; }
  const after = {today:afterToday, morning:afterMorning, log:afterLog, body:afterBody, data:afterData, plan:afterPlan}[tab];
  if(after) after();
}
function linkLabels(){
  let n = 0;
  document.querySelectorAll("#view label").forEach(l=>{
    if(l.htmlFor) return;
    const c = l.nextElementSibling;
    if(c && /^(INPUT|SELECT|TEXTAREA)$/.test(c.tagName)){ if(!c.id) c.id = "f" + (++n); l.htmlFor = c.id; }
  });
}
function render(){
  try{ renderInner(); linkLabels(); }
  catch(err){
    console.error(err);
    $("#view").innerHTML = `<div class="card"><h2>${ic("alert")}Erreur d’affichage</h2><p>${esc(err && err.message || err)}</p><p>Vos données ne sont pas touchées.</p><div class="actions"><button class="ghost" id="err-exp">Exporter mes données</button><button class="ghost" id="err-home">Retour à l’accueil</button></div></div>`;
    $("#err-exp").onclick = downloadExport;
    $("#err-home").onclick = () => { tab = "today"; render(); };
  }
}
const CROQUIS_MAP = [
  [/^Test de calage/i, null], [/^Test /i, null], [/^Genou gauche/i, null], [/^Intensité/i, null],
  [/sauts sur box/i, "box-jump"], [/ischio/i, "etir-ischios"], [/pigeon/i, "etir-pigeon"], [/adducteurs|grenouille/i, "etir-grenouille"],
  [/chevilles/i, "mob-chevilles"], [/colonne thoracique|rotation thoracique/i, "mob-thoracique"], [/poignets/i, "mob-poignets"], [/grand écart/i, "etir-grand-ecart"],
  [/cat.cow/i, "cat-cow"], [/world.s greatest/i, "world-greatest-stretch"], [/cercles d.épaules/i, "mob-epaules"],
  [/négatives/i, "aa-negative"], [/^Tractions/i, "dos-tractions"], [/tirages horizontaux/i, "dos-rowing-aus"],
  [/pompes claquées/i, "aa-pompes-claquees"], [/^Pompes/i, "pec-pompes"],
  [/gainage latéral/i, "ab-side-plank"], [/body saw/i, "aa-body-saw"], [/planche 3/i, "ab-plank"], [/dead bug/i, "ab-deadbug"],
  [/relevés de genoux/i, "aa-releve-genoux"], [/relevés de jambes/i, "ab-leg-raise-susp"], [/hollow/i, "ab-hollow"],
  [/bird/i, "aa-bird-dog"], [/crunch/i, "ab-crunch"], [/russian/i, "ab-russian"], [/l.sit/i, "cal-lsit"], [/dragon flag/i, "ab-dragon"],
  [/squats bulgares/i, "q-fentes-bulg"], [/fentes arrière/i, "aa-fente-arriere"], [/squats sautés/i, "aa-squat-saute"],
  [/squats? au poids du corps/i, "aa-squat-pc"], [/corde à sauter/i, "aa-corde"], [/pistol assisté/i, "cal-pistol-assiste"], [/pistol/i, "cal-pistol"],
  [/fléchisseurs? de hanche|fente basse/i, "aa-fente-basse"], [/suspension passive/i, "aa-suspension"], [/squat profond/i, "aa-squat-profond"],
  [/endurance|4×4|30\/30|course/i, "aa-course"]
];
const illus = id => (typeof ILLUS!=="undefined" && ILLUS[id]) || null;   // { n, ext } si des images existent (img/exo/<id>-<n>.<ext>)
const illusSrc = (id, i) => `img/exo/${id}-${i}.${ILLUS[id].ext}`;
const hasCroquis = id => typeof AdAstraCroquis!=="undefined" && AdAstraCroquis.has(id);
const thumbHTML = id => illus(id) ? `<img src="${esc(illusSrc(id,1))}" alt="" width="64" height="64" loading="lazy">` : AdAstraCroquis.icon(id);
function croquisFor(text){
  for(const [rx,id] of CROQUIS_MAP) if(rx.test(text)) return id && (hasCroquis(id) || illus(id)) ? id : null;
  return null;
}
function exLabel(text){ return text.split(/[:(]/)[0].trim().slice(0,60); }
function planItem(text){
  const id = croquisFor(text);
  if(!id) return `<li>${esc(text)}</li>`;
  return `<li class="ex"><button type="button" class="ex-btn" data-croquis="${esc(id)}" data-title="${esc(exLabel(text))}" aria-label="Voir la démonstration : ${esc(exLabel(text))}"><span class="thumb">${thumbHTML(id)}</span><span class="ex-t">${esc(text)}</span></button></li>`;
}
function demoBody(id){
  const il = illus(id);
  if(!il){ const poses = AdAstraCroquis.poses(id);
    return `<div class="poses">${poses.map(p=>`<figure><div class="pose-svg">${p.svg}</div><figcaption>${esc(p.label)}</figcaption></figure>`).join("")}</div><small>Croquis schématique du mouvement : il montre les positions clés, pas la prise exacte des mains.</small>`; }
  const labels = hasCroquis(id) ? AdAstraCroquis.poses(id).map(p=>p.label) : [];
  const imgs = Array.from({length:il.n},(_,i)=>`<img src="${esc(illusSrc(id,i+1))}" alt="Position ${i+1}${labels[i]?" : "+esc(labels[i]):""}">`).join("");
  const anim = il.n>=2 && il.n<=3;
  return `${anim?`<div class="demo"><div class="demo-view"><div class="demo-track n${il.n}" style="--n:${il.n}" id="demo-track">${imgs}</div></div><div class="demo-ctl"><button class="ghost" type="button" id="demo-pause" aria-pressed="false">Pause</button></div></div>`:""}
    <div class="demo-strip">${Array.from({length:il.n},(_,i)=>`<figure><img src="${esc(illusSrc(id,i+1))}" alt=""><figcaption>${i+1}${labels[i]?" · "+esc(labels[i]):""}</figcaption></figure>`).join("")}</div>`;
}
function openCroquis(id, title){
  const el = document.createElement("div");
  el.className = "sheet-back"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-label", "Croquis : "+title);
  el.innerHTML = `<div class="sheet"><div class="sheet-h"><h2>${esc(title)}</h2><button class="icon-btn" type="button" aria-label="Fermer">×</button></div>
    ${demoBody(id)}</div>`;
  const opener = document.activeElement;
  const onKey = e => { if(e.key==="Escape") close(); };
  const close = () => { el.remove(); document.removeEventListener("keydown", onKey); if(opener && opener.focus) opener.focus(); };
  el.addEventListener("click", e => { if(e.target===el) close(); });
  el.querySelector("button").onclick = close;
  const pz = el.querySelector("#demo-pause");
  if(pz) pz.onclick = () => { const t = el.querySelector("#demo-track"), on = t.classList.toggle("paused"); pz.setAttribute("aria-pressed", String(on)); pz.textContent = on ? "Lecture" : "Pause"; };
  document.addEventListener("keydown", onKey);
  document.body.appendChild(el);
  el.querySelector("button").focus();
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-croquis]");
  if(b) openCroquis(b.dataset.croquis, b.dataset.title);
});
const planCard = (key, p) => `<div class="card"><div class="session-head"><div class="letter">${esc(key)}</div><div><h2>${esc(p.name.replace(/^[A-Z]\s·\s/,""))}</h2>${p.note?`<div class="meta"><span class="tag info">${esc(p.note)}</span></div>`:""}</div></div><ul class="plan">${p.items.map(planItem).join("")}</ul></div>`;
const SESSION_LABEL = {A:"Force haut du corps",B:"Moteur aérobie",C:"Jambes, tronc, explosivité"};

function weeksBar(w){
  const cells = Array.from({length:12},(_,i)=>{ const k=i+1; return `<span class="${k<w?"done":k===w?"now":""} ${DELOAD.includes(k)?"lite":""}" title="Semaine ${k}"></span>`; }).join("");
  return `<div class="weeks" aria-hidden="true">${cells}</div><div class="weeks-legend"><span>S1</span><span>● semaine allégée</span><span>S12</span></div>`;
}

function viewToday(){
  const w = weekOf(todayISO()), P = plan(w);
  const rw = rawWeekOf(todayISO());
  const doneTypes = db.sessions.filter(s=>rawWeekOf(s.date)===rw).map(s=>s.type);
  const next = ["A","B","C"].find(k=>!doneTypes.includes(k)) || null;
  const al = alerts().map(a=>`<div class="banner ${a.lvl==="danger"?"danger":""}">${ic("alert")}<span>${esc(a.t)}</span></div>`).join("");
  const notes = db.coachNotes.slice(-2).reverse().map(n=>`<div class="banner note">${ic("coach")}<span><b>${esc(n.from||"Coach")} · ${esc(fmtDate(n.date))}</b><br>${esc(n.text)}</span></div>`).join("");
  const p = paces();
  const last = db.sessions.slice().sort((a,b)=>a.date.localeCompare(b.date)).pop();
  const chip = k => { const d = doneTypes.includes(k); return `<div class="wk ${d?"ok":k===next?"next":""}"><b>${k}</b><span>${d?"faite":k==="M"?"option":k===next?"prochaine":"à faire"}</span></div>`; };
  return `${al}${notes}
  <section class="hero">
    <div class="eyebrow">${esc(phaseOf(w))}${DELOAD.includes(w)?" · semaine allégée":""}</div>
    <h1>Semaine ${w} sur 12</h1>
    <div class="phase">${doneTypes.filter(t=>["A","B","C"].includes(t)).length}/3 séances cette semaine</div>
    ${weeksBar(w)}
  </section>
  ${rw>12?`<div class="banner">${ic("alert")}<span>Le cycle de 12 semaines est terminé. Faites le bilan avec l’agent de suivi, puis ajustez la date de départ (onglet Données) pour un nouveau cycle.</span></div>`:""}
  <div class="card"><h2>${ic("star")}Cette semaine</h2>
    <div class="week-row">${["A","B","C","M"].map(chip).join("")}</div>
    <small>Objectif : 3 séances (A, B, C), au moins 48 h entre deux séances intenses. M est optionnelle.</small>
  </div>
  ${next?`<div class="card"><div class="session-head"><div class="letter">${next}</div><div><h2>Prochaine séance</h2><div class="meta">${esc(SESSION_LABEL[next])}</div></div></div>
    ${calageCard(next,w)}
    <button class="btn primary block" id="go-log" data-type="${next}" style="margin-top:14px">${ic("play","sm")}Commencer la séance ${next}</button></div>${planCard(next,P[next])}`
  :`<div class="banner good">${ic("check")}<span>Semaine complète : les trois séances sont faites. Récupération active en option.</span></div>`}
  ${bilanCard()}
  ${levelCard()}
  ${morningCard()}
  <div class="stats">
    <div class="stat"><b>${db.sessions.length}</b><span>séances enregistrées</span></div>
    <div class="stat"><b>${last?esc(fmtDate(last.date)):"—"}</b><span>dernière séance</span></div>
    <div class="stat"><b>${p?p.vma.toFixed(1):"—"}${p?"<em>km/h</em>":""}</b><span>VMA (test 6 min)</span></div>
    <div class="stat"><b>${p&&p.fcmax?p.fcmax:"—"}${p&&p.fcmax?"<em>bpm</em>":""}</b><span>FCmax mesurée</span></div>
  </div>`;
}
function afterToday(){ document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{ if(b.dataset.type) prefill={type:b.dataset.type}; tab=b.dataset.go; tabChanged=true; render(); toTop(); }); const m=$("#go-morning"); if(m) m.onclick=()=>{ tab="morning"; tabChanged=true; render(); toTop(); }; const b=$("#go-log"); if(b) b.onclick=()=>startDraft(b.dataset.type); }

/* ===== Routine du matin et souplesse ===== */
const MORNING = {
  express: { name:"Express · 8 à 10 min", steps:[
    "Respiration : 5 grandes respirations nasales, ventre puis côtes (1 min)",
    "Cat‑cow : 10 allers‑retours lents à quatre pattes (1 min)",
    "Rotation thoracique à quatre pattes : 5 par côté (1 min)",
    "World’s greatest stretch : 3 par côté (2 min)",
    "Squat profond tenu, talons au sol ou surélevés : 45 s (1 min)",
    "Fente basse, fléchisseur de hanche : 30 s par côté (1 min)",
    "Cercles d’épaules et passage de bâton ou de serviette : 10 (1 min)",
    "Activation : dead bug 2 × 6 par côté (1 min)"
  ]},
  qigong: { name:"Complète · 20 min = Express + Baduanjin (huit pièces de brocart)",
    note:"Chaque mouvement 6 fois, très lent, respiration nasale, genoux toujours souples et jamais verrouillés. Réduisez l’amplitude des positions basses si le genou gauche proteste. Pratique douce d’équilibre, de mobilité et de détente : ce n’est pas un entraînement de force.",
    steps:[
    "Les deux mains soutiennent le ciel : paumes montées au‑dessus de la tête, étirement vertical, regard vers les mains",
    "Tirer l’arc pour viser l’aigle : demi‑cavalier, un bras tend l’arc, l’autre vise, alterner les côtés",
    "Séparer le ciel et la terre : une paume pousse vers le haut, l’autre vers le bas, alterner",
    "Le hibou regarde en arrière : tourner doucement la tête et le haut du dos, bras relâchés, des deux côtés",
    "Balancer la tête et la queue : cavalier haut, inclinaison du buste en arc d’un côté puis de l’autre",
    "Les deux mains vont vers les pieds : s’enrouler vers l’avant, mains le long des jambes, remonter en passant les paumes dans le bas du dos",
    "Serrer les poings, regard farouche : cavalier, coups de poing lents alternés",
    "Rebonds sur la pointe des pieds : monter sur les orteils, relâcher les talons doucement au sol"
  ]}
};
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
function streak(){
  let n=0; const d=new Date();
  if(!db.morning[dayKey(d)]) d.setDate(d.getDate()-1);
  while(n<400 && db.morning[dayKey(d)]){ n++; d.setDate(d.getDate()-1); }
  return n;
}
function last7(){
  const out=[];
  for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const k=dayKey(d); out.push({k, l:d.toLocaleDateString("fr-FR",{weekday:"short"}).replace(".",""), v:db.morning[k]||null, today:i===0}); }
  return out;
}
const stepList = steps => `<ol class="steps">${steps.map(planItem).join("")}</ol>`;
function morningCard(){
  const cur = db.morning[todayISO()], n = streak();
  return `<div class="card"><h2>${ic("sun")}Routine du matin</h2>
    <div class="streak"><div class="n">${n}</div><div class="l">jour${n>1?"s":""} de suite<br>${cur?`aujourd’hui : <b>${cur==="full"?"complète":"express"}</b> ✓`:"pas encore faite aujourd’hui"}</div></div>
    <div class="actions"><button class="btn ghost" id="go-morning" type="button">Ouvrir la routine</button></div></div>`;
}
function viewMorning(){
  const cur = db.morning[todayISO()], n = streak();
  const dots = last7().map(x=>`<div class="dd ${x.v||""} ${x.today?"today":""}" title="${esc(x.k)}"><i>${x.v?ic("check"):""}</i>${esc(x.l)}</div>`).join("");
  return `<div class="card"><h2>${ic("sun")}Routine du matin</h2>
    <div class="streak"><div class="n">${n}</div><div class="l">jour${n>1?"s":""} de suite<br>${cur?`aujourd’hui : <b>${cur==="full"?"complète":"express"}</b> ✓`:"pas encore faite aujourd’hui"}</div></div>
    <div class="day-dots" aria-label="Sept derniers jours">${dots}</div>
    <div class="actions">
      <button class="btn primary" data-mark="express" type="button">Express faite</button>
      <button class="btn primary" data-mark="full" type="button">Complète faite</button>
      ${cur?`<button class="btn ghost" data-mark="" type="button">Annuler</button>`:""}
    </div>
    <small>Disque plein : complète · disque or terne : express. Une routine express chaque jour vaut mieux qu’une complète de temps en temps. À faire avant le café, sans chercher la performance.</small></div>
  <details class="fold" open><summary>${ic("sun","sm")}${esc(MORNING.express.name)}</summary><div class="body">${stepList(MORNING.express.steps)}</div></details>
  <details class="fold"><summary>${ic("star","sm")}${esc(MORNING.qigong.name)}</summary><div class="body"><p class="small">${esc(MORNING.qigong.note)}</p>${stepList(MORNING.qigong.steps)}</div></details>`;
}
function afterMorning(){
  document.querySelectorAll("[data-mark]").forEach(b=>b.onclick=()=>{
    if(b.dataset.mark){ db.morning[todayISO()] = b.dataset.mark; toast(b.dataset.mark==="full"?"Routine complète enregistrée":"Routine express enregistrée"); }
    else delete db.morning[todayISO()];
    save(); render();
  });
}
function mobilityCard(){
  const rows = db.mobility.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(m=>`<tr><td>${esc(fmtDate(m.date))}</td><td>${m.reach??"—"}</td><td>${m.kneeWall??"—"}</td><td>${m.squatHold??"—"}</td><td>${delBtn("data-delmob", m.id, "Supprimer le test de souplesse du "+fmtDate(m.date))}</td></tr>`).join("");
  return `<div class="card"><h2>${ic("body")}Tests de souplesse</h2>
    <form id="mobform"><div class="row">
      <div><label>Date</label><input type="date" name="date" value="${todayISO()}" required></div>
      <div><label>Flexion avant (cm)</label><input type="text" inputmode="decimal" name="reach"></div>
      <div><label>Genou au mur (cm)</label><input type="text" inputmode="decimal" name="kneeWall"></div>
      <div><label>Squat profond tenu (s)</label><input type="number" name="squatHold" min="0"></div>
    </div><button class="btn primary" type="submit">Ajouter le test</button></form>
    <small>Flexion avant : debout sur une marche, jambes tendues, descendre lentement ; positif si les doigts passent sous le niveau de la marche, négatif sinon. Genou au mur : distance maximale entre orteils et mur en gardant le talon au sol. Mêmes conditions à chaque test (après 5 min d’échauffement).</small>
    ${rows?`<table class="hist-table"><thead><tr><th>Date</th><th>Flexion</th><th>Genou/mur</th><th>Squat (s)</th><th></th></tr></thead><tbody>${rows}</tbody></table>`:""}
  </div>`;
}
function afterMobility(){
  const f = $("#mobform");
  if(f) f.onsubmit = e => { e.preventDefault(); const d=new FormData(e.target);
    db.mobility.push({id:"m"+Date.now(), date:d.get("date"), reach:num(d.get("reach")), kneeWall:num(d.get("kneeWall")), squatHold:num(d.get("squatHold"))}); save(); render(); toast("Test de souplesse ajouté"); };
  document.querySelectorAll("[data-delmob]").forEach(b=>b.onclick=()=>{ if(confirm("Supprimer ce test de souplesse ?")){ db.mobility=db.mobility.filter(m=>m.id!==b.dataset.delmob); save(); render(); } });
}

function viewLog(){
  if(draft) return viewSession();
  const t = (prefill&&prefill.type)||"A";
  const types = {A:"A · Force haut",B:"B · Cardio",C:"C · Jambes",M:"M · Souplesse",O:"Récup active",L:"Libre"};
  return `${guidedStart()}<div class="card"><h2>${ic("log")}Saisie manuelle</h2>
  <form id="logform">
    <label for="lg-date">Date</label><input type="date" id="lg-date" name="date" value="${todayISO()}" required>
    <span class="lbl" id="lg-type-l">Type de séance</span>
    <div class="seg" role="radiogroup" aria-labelledby="lg-type-l">${Object.entries(types).map(([k,l])=>`<input type="radio" name="type" id="ty-${k}" value="${k}" ${k===t?"checked":""}><label for="ty-${k}">${esc(l)}</label>`).join("")}</div>
    <h3>Ressenti</h3>
    <div class="row">
      <div><label>Effort perçu (1–10)</label><input type="number" inputmode="numeric" name="rpe" min="1" max="10" step="1"></div>
      <div><label>Genou gauche (0–10)</label><input type="number" inputmode="numeric" name="knee" min="0" max="10" step="1" value="0"></div>
      <div><label>Sommeil (h, nuit précédente)</label><input type="number" inputmode="decimal" name="sleep" min="0" max="14" step="0.5"></div>
    </div>
    <div id="calage-box">
      <h3>Test de calage (en début de séance)</h3>
      <p class="small" id="calage-txt"></p>
      <div class="row" data-calage="A">
        <div><label>Tractions max (une série)</label><input type="number" inputmode="numeric" name="pullups" min="0"></div>
        <div><label>Pompes max (une série)</label><input type="number" inputmode="numeric" name="pushups" min="0"></div>
      </div>
      <div class="row" data-calage="C">
        <div><label>Squats bulgares max par jambe</label><input type="number" inputmode="numeric" name="legReps" min="0"></div>
      </div>
    </div>
    <h3>Cardio (si concerné)</h3>
    <div class="row">
      <div><label>Activité</label><select name="cardioKind"><option value="">—</option><option>Course</option><option>Vélo</option><option>Piscine</option></select></div>
      <div><label>Durée (min)</label><input type="number" inputmode="numeric" name="minutes" min="0"></div>
      <div><label>Distance (km)</label><input type="text" inputmode="decimal" name="km"></div>
      <div><label>FC moyenne</label><input type="number" inputmode="numeric" name="hrAvg" min="0"></div>
      <div><label>FC max</label><input type="number" inputmode="numeric" name="hrMax" min="0"></div>
    </div>
    <h3>Détails</h3>
    <label>Exercices et séries (libre, ex. « Tractions 5×3, Pompes 4×14 »)</label>
    <textarea name="exercises"></textarea>
    <label>Notes</label>
    <textarea name="notes"></textarea>
    <button class="btn primary block" type="submit">${ic("check","sm")}Enregistrer la séance</button>
  </form></div>
  <div class="card"><h2>${ic("log")}Historique</h2>${historyTable()}</div>`;
}
/* ===== Séance guidée : le journal se remplit avec la séance ===== */
const DRAFT_KEY = KEY + ".seance";
let draft = null;
try{ const r = localStorage.getItem(DRAFT_KEY); if(r){ const d = JSON.parse(r); if(d && typeof d==="object" && ["A","B","C","M","O"].includes(d.type) && isDay(d.date)) draft = {type:d.type, date:d.date, done:Array.isArray(d.done)?d.done.filter(Number.isInteger):[], vals:d.vals&&typeof d.vals==="object"?d.vals:{}}; } }catch(e){}
function saveDraft(){ try{ if(draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); else localStorage.removeItem(DRAFT_KEY); }catch(e){} }
function startDraft(type){
  if(!draft || draft.type!==type) draft = {type, date:todayISO(), done:[], vals:{}};
  saveDraft(); tab = "log"; tabChanged = true; render(); toTop();
}
const INFO_RX = /^(Test|Genou gauche|Intensité|Semaine allégée)/i;
const isCheckable = t => !INFO_RX.test(t);
function shortEx(t){
  let x = t.replace(/^Bloc abdos \([^)]*\)\s*:\s*/i, "");
  if(x.length>80){ const i = x.search(/[(—]/); if(i>10) x = x.slice(0,i).trim(); }
  return x.length>90 ? x.slice(0,88).trim()+"…" : x;
}
function sessionItems(){ return plan(weekOf(draft.date))[draft.type].items; }
function viewSession(){
  const w = weekOf(draft.date), P = plan(w)[draft.type], items = P.items, v = draft.vals;
  const checkable = items.map((t,i)=>isCheckable(t)?i:-1).filter(i=>i>=0);
  const nDone = checkable.filter(i=>draft.done.includes(i)).length, pct = checkable.length ? Math.round(nDone/checkable.length*100) : 0;
  const val = k => esc(v[k]??"");
  const rows = items.map((t,i)=>{
    if(!isCheckable(t)) return `<div class="srow info"><span class="ex-t">${esc(t)}</span></div>`;
    const on = draft.done.includes(i), id = croquisFor(t);
    return `<div class="srow ${on?"done":""}"><button type="button" class="ck" role="checkbox" aria-checked="${on}" data-ck="${i}" aria-label="Fait : ${esc(exLabel(t))}">${on?ic("check","sm"):""}</button>`
      + (id ? `<button type="button" class="thumb thumb-sm" data-croquis="${esc(id)}" data-title="${esc(exLabel(t))}" aria-label="Voir la démonstration : ${esc(exLabel(t))}">${thumbHTML(id)}</button>` : "")
      + `<span class="ex-t">${esc(t)}</span></div>`;
  }).join("");
  const calageFields = draft.type==="A" ? `<div class="row"><div><label>Tractions max (une série)</label><input type="number" inputmode="numeric" data-v="pullups" min="0" value="${val("pullups")}"></div><div><label>Pompes max (une série)</label><input type="number" inputmode="numeric" data-v="pushups" min="0" value="${val("pushups")}"></div></div>`
    : draft.type==="C" ? `<div class="row"><div><label>Squats bulgares max par jambe</label><input type="number" inputmode="numeric" data-v="legReps" min="0" value="${val("legReps")}"></div></div>` : "";
  const cardioFields = draft.type==="B" ? `<h3>Cardio</h3><div class="row">
      <div><label>Activité</label><select data-v="cardioKind">${["","Course","Vélo","Piscine"].map(k=>`<option ${v.cardioKind===k?"selected":""}>${k}</option>`).join("")}</select></div>
      <div><label>Durée (min)</label><input type="number" inputmode="numeric" data-v="minutes" min="0" value="${val("minutes")}"></div>
      <div><label>Distance (km)</label><input type="text" inputmode="decimal" data-v="km" value="${val("km")}"></div>
      <div><label>FC moyenne</label><input type="number" inputmode="numeric" data-v="hrAvg" min="0" value="${val("hrAvg")}"></div>
      <div><label>FC max</label><input type="number" inputmode="numeric" data-v="hrMax" min="0" value="${val("hrMax")}"></div></div>` : "";
  return `<div class="card"><div class="session-head"><div class="letter">${esc(draft.type)}</div><div><h2>Séance ${esc(draft.type)} en cours</h2><div class="meta">Semaine ${w} · ${esc(fmtDate(draft.date))}</div></div></div>
    ${CALAGE[draft.type]?calageCard(draft.type,w):""}${calageFields?`<h3>Résultat du test de calage</h3>${calageFields}`:""}</div>
  <div class="card"><h2>${ic("check")}Exercices</h2>
    <div class="bar" role="img" aria-label="${pct} % fait"><i style="width:${pct}%"></i></div><small style="margin-top:2px">${nDone} sur ${checkable.length} faits. Cochez au fur et à mesure : le journal s’écrit à la fin.</small>
    <div class="slist">${rows}</div></div>
  <div class="card"><h2>${ic("log")}Fin de séance</h2>
    <div class="row">
      <div><label>Effort perçu (1–10)</label><input type="number" inputmode="numeric" data-v="rpe" min="1" max="10" step="1" value="${val("rpe")}"></div>
      <div><label>Genou gauche (0–10)</label><input type="number" inputmode="numeric" data-v="knee" min="0" max="10" step="1" value="${v.knee??0}"></div>
      <div><label>Sommeil (h, nuit précédente)</label><input type="number" inputmode="decimal" data-v="sleep" min="0" max="14" step="0.5" value="${val("sleep")}"></div>
    </div>${cardioFields}
    <label>Notes</label><textarea data-v="notes">${esc(v.notes||"")}</textarea>
    <button class="btn primary block" id="s-finish" type="button">${ic("check","sm")}Terminer et enregistrer</button>
    <div class="actions"><button class="btn ghost" id="s-cancel" type="button">Abandonner cette séance</button></div></div>`;
}
function afterSession(){
  document.querySelectorAll("[data-ck]").forEach(b=>b.onclick=()=>{
    const i = +b.dataset.ck, k = draft.done.indexOf(i);
    if(k>=0) draft.done.splice(k,1); else draft.done.push(i);
    saveDraft(); const y = window.scrollY; render(); window.scrollTo(0,y);
  });
  document.querySelectorAll("[data-v]").forEach(el=>{
    const upd = () => { draft.vals[el.dataset.v] = el.value; saveDraft(); };
    el.addEventListener("input", upd); el.addEventListener("change", upd);
  });
  $("#s-finish").onclick = () => {
    const v = draft.vals, items = sessionItems();
    const s = {
      id:"s"+Date.now(), date:draft.date, type:draft.type,
      rpe:num(v.rpe), knee:num(v.knee) ?? 0, sleep:num(v.sleep),
      pullups:num(v.pullups), pushups:num(v.pushups), legReps:num(v.legReps),
      cardio: v.cardioKind ? {kind:v.cardioKind, minutes:num(v.minutes), km:num(v.km), hrAvg:num(v.hrAvg), hrMax:num(v.hrMax)} : null,
      exercises: draft.done.slice().sort((a,b)=>a-b).map(i=>items[i]).filter(Boolean).map(shortEx).join(" · "),
      notes: String(v.notes||"").trim(), week: weekOf(draft.date)
    };
    db.sessions.push(s); save();
    draft = null; saveDraft(); tab = "today"; tabChanged = true; render(); toTop(); toast("Séance enregistrée dans le journal");
  };
  $("#s-cancel").onclick = () => { if(confirm("Abandonner cette séance en cours ? Rien ne sera enregistré.")){ draft = null; saveDraft(); render(); } };
}
function guidedStart(){
  const t = k => `<button class="btn ghost" data-start="${k}" type="button">${k} · ${{A:"Force haut",B:"Cardio",C:"Jambes"}[k]}</button>`;
  return `<div class="card"><h2>${ic("play")}Séance guidée</h2><p>Démarrez la séance : cochez les exercices, saisissez le test de calage, et le journal s’écrit tout seul à la fin.</p><div class="actions">${["A","B","C"].map(t).join("")}</div></div>`;
}

function historyTable(){
  const ss = db.sessions.slice().sort((a,b)=>b.date.localeCompare(a.date));
  if(!ss.length) return `<p class="empty">Aucune séance pour l’instant.</p>`;
  return `<div class="list">${ss.map(s=>{
    const bits=[];
    if(s.cardio&&s.cardio.kind) bits.push(`${s.cardio.kind} ${s.cardio.minutes||"?"} min${s.cardio.km?`, ${s.cardio.km} km`:""}${s.cardio.hrAvg?`, FC moy ${s.cardio.hrAvg}`:""}`);
    if(s.pullups!=null) bits.push(`tractions max ${s.pullups}`);
    if(s.pushups!=null) bits.push(`pompes max ${s.pushups}`);
    if(s.legReps!=null) bits.push(`squats bulgares max ${s.legReps}/jambe`);
    if(s.rpe!=null) bits.push(`effort ${s.rpe}/10`);
    if(s.knee) bits.push(`genou ${s.knee}/10`);
    if(s.exercises) bits.push(s.exercises);
    return `<div class="item"><div class="badge">${esc(s.type)}</div><div class="main"><div class="t">${esc(fmtDate(s.date))}</div><div class="d">${bits.map(esc).join(" · ")||"—"}</div></div>${delBtn("data-del", s.id, "Supprimer la séance "+s.type+" du "+fmtDate(s.date))}</div>`;
  }).join("")}</div>`;
}
function afterLog(){
  prefill = null;
  if(draft){ afterSession(); return; }
  document.querySelectorAll("[data-start]").forEach(b=>b.onclick=()=>startDraft(b.dataset.start));
  const syncCalage = () => {
    const t = (document.querySelector('input[name="type"]:checked')||{}).value;
    const box = $("#calage-box"); if(!box) return;
    box.classList.toggle("hidden", !CALAGE[t]);
    box.querySelectorAll("[data-calage]").forEach(r=>r.classList.toggle("hidden", r.dataset.calage!==t));
    $("#calage-txt").textContent = CALAGE[t] || "";
  };
  document.querySelectorAll('input[name="type"]').forEach(r=>r.addEventListener("change", syncCalage));
  syncCalage();
  $("#logform").onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target), g = k => f.get(k);
    const s = {
      id: "s"+Date.now(), date: g("date"), type: g("type"),
      rpe: num(g("rpe")), knee: num(g("knee")) ?? 0, sleep: num(g("sleep")),
      pullups: num(g("pullups")), pushups: num(g("pushups")), legReps: num(g("legReps")),
      cardio: g("cardioKind") ? { kind:g("cardioKind"), minutes:num(g("minutes")), km:num(g("km")), hrAvg:num(g("hrAvg")), hrMax:num(g("hrMax")) } : null,
      exercises: g("exercises").trim(), notes: g("notes").trim(), week: weekOf(g("date"))
    };
    db.sessions.push(s); save(); render(); toast("Séance enregistrée");
  };
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{
    if(confirm("Supprimer cette séance ?")){ db.sessions = db.sessions.filter(s=>s.id!==b.dataset.del); save(); render(); }
  });
}

function trend(pts, unit="", lowerBetter=false){
  if(pts.length<2) return "";
  const d = Math.round((pts[pts.length-1].y - pts[0].y)*10)/10;
  if(d===0) return "";
  const good = lowerBetter ? d<0 : d>0;
  return `<span class="delta ${good?"":"neg"}">${d>0?"+":""}${d}${unit?" "+unit:""}</span>`;
}
function metric(title, icon, pts, o={}){
  const last = pts.length ? pts[pts.length-1].y : null;
  const pct = o.goal && last!=null ? Math.max(0, Math.min(100, Math.round(last/o.goal*100))) : null;
  return `<div class="card"><h2>${ic(icon)}${esc(title)}</h2>
    <div class="kpi"><b>${last!=null?last:"—"}</b>${o.unit?`<span>${esc(o.unit)}</span>`:""}${trend(pts,"",o.lowerBetter)}</div>
    ${pct!=null?`<div class="bar" role="img" aria-label="${pct} % de l’objectif"><i style="width:${pct}%"></i></div><small style="margin-top:2px">${pct} % de l’objectif (${o.goal})</small>`:""}
    ${lineChart(pts,{goal:o.goal,min:o.min,color:o.color,label:title})}${o.note?`<small>${esc(o.note)}</small>`:""}</div>`;
}
function viewProgress(){
  const ss = db.sessions.slice().sort((a,b)=>a.date.localeCompare(b.date));
  const pts = k => ss.filter(s=>s[k]!=null).map(s=>({x:s.date,y:s[k]}));
  const knee = ss.filter(s=>s.knee!=null).map(s=>({x:s.date,y:s.knee}));
  const wt = db.body.filter(b=>b.weight!=null).sort((a,b)=>a.date.localeCompare(b.date)).map(b=>({x:b.date,y:b.weight}));
  const vma = db.tests.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(t=>({x:t.date,y:Math.round(t.distance/10)/10}));
  const flex = db.mobility.filter(m=>m.reach!=null).slice().sort((a,b)=>a.date.localeCompare(b.date)).map(m=>({x:m.date,y:m.reach}));
  return `<div class="card"><h2>${ic("star")}Séances par semaine</h2>${barChart(weeklyCounts())}<small>Ligne pointillée : 3 séances. Barres or : objectif atteint.</small></div>
  ${metric("Tractions max","chart",pts("pullups"),{goal:db.profile.goalPullups,min:0,unit:"reps"})}
  ${metric("Pompes max","chart",pts("pushups"),{goal:db.profile.goalPushups,min:0,unit:"reps",color:"var(--c2)"})}
  ${metric("VMA","body",vma,{unit:"km/h",color:"var(--c3)",note:"Estimée par le test de 6 minutes."})}
  ${metric("Souplesse · flexion avant","sun",flex,{unit:"cm",color:"var(--c4)",note:"Valeur positive : doigts sous le niveau de la marche."})}
  ${metric("Genou gauche","alert",knee,{unit:"/ 10",min:0,color:"var(--danger)",lowerBetter:true,note:"Douleur ressentie, de 0 à 10."})}
  ${metric("Poids","body",wt,{unit:"kg",lowerBetter:false})}`;
}

function viewPlan(){
  const w = weekOf(todayISO());
  let opts = ""; for(let i=1;i<=12;i++) opts+=`<button type="button" data-week="${i}" class="${i===w?"cur":""}" aria-pressed="${i===w}"><b>${i}</b><span>${DELOAD.includes(i)?"allégée":["Adapt.","Constr.","Intens."][i<=2?0:i<=6?1:2]}</span></button>`;
  return `<div class="section-title" id="wk-title">Semaine à afficher</div><div class="weekpick" role="group" aria-labelledby="wk-title" id="wsel">${opts}</div><div id="planbox"></div>
  <div class="card"><h2>${ic("shield")}Règles du système</h2><ul class="plan">
    <li>3 séances par semaine : A (force haut), B (cardio), C (jambes et explosivité). Abdos intégrés à A (anti‑extension, flexion) et à C (rotation, latéral).</li>
    <li>Routine du matin chaque jour (express 8–10 min ou complète 20 min) et une séance de souplesse M de 25 min en option, de préférence un jour sans séance intense.</li>
    <li>48 h minimum entre deux séances intenses.</li>
    <li>Semaines 4, 8 et 12 allégées (environ −30 % de séries).</li>
    <li>Genou gauche : pas de course continue au‑delà de ${db.profile.maxRunMin} min ; les sorties longues se font à vélo ou en piscine.</li>
    <li>Objectifs à 3 mois : ${db.profile.goalPullups} tractions strictes, ${db.profile.goalPushups} pompes propres.</li>
  </ul></div>`;
}
function afterPlan(){
  const draw = k => {
    const P = plan(k);
    document.querySelectorAll("#wsel button").forEach(b=>b.setAttribute("aria-pressed", String(+b.dataset.week===k)));
    $("#planbox").innerHTML = `<div class="hero" style="padding:14px 16px"><div class="eyebrow">${esc(phaseOf(k))}</div><h1 style="font-size:20px">Semaine ${k}${DELOAD.includes(k)?" · allégée":""}</h1></div>` + ["A","B","C","M","O"].map(x=>planCard(x,P[x])).join("");
  };
  document.querySelectorAll("#wsel button").forEach(b=>b.onclick=()=>draw(+b.dataset.week));
  draw(weekOf(todayISO()));
  const cur = document.querySelector('#wsel button.cur'); if(cur && cur.scrollIntoView) { try{ cur.scrollIntoView({inline:"center",block:"nearest"}); }catch(e){} }
}

function viewBody(){
  const p = paces();
  const paceBox = p ? `<div class="card"><h2>${ic("play")}Allures calculées</h2><div class="stats" style="margin-bottom:0">
      <div class="stat"><b>${p.vma.toFixed(1)}<em>km/h</em></b><span>VMA · ${fmtPace(p.pace)}</span></div>
      <div class="stat"><b>${p.fcmax?p.fcmax:"—"}${p.fcmax?"<em>bpm</em>":""}</b><span>FCmax mesurée</span></div>
      <div class="stat"><b>${p.fc4x4?p.fc4x4[0]+"–"+p.fc4x4[1]:"—"}</b><span>FC des 4 min (85–95 %)</span></div>
      <div class="stat"><b>${p.fcRec?p.fcRec[0]+"–"+p.fcRec[1]:"—"}</b><span>FC de récupération (60–70 %)</span></div>
    </div><small>VMA estimée par la distance du test de 6 min ÷ 100. La FC lue au poignet peut sous‑estimer le pic de quelques battements.</small></div>` : "";
  const bodyRows = db.body.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(b=>`<tr><td>${esc(fmtDate(b.date))}</td><td>${b.weight??"—"}</td><td>${b.waist??"—"}</td><td>${delBtn("data-delbody", b.id, "Supprimer la mesure du "+fmtDate(b.date))}</td></tr>`).join("");
  const testRows = db.tests.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(t=>`<tr><td>${esc(fmtDate(t.date))}</td><td>${t.distance} m</td><td>${t.maxHr??"—"}</td><td>${delBtn("data-deltest", t.id, "Supprimer le test du "+fmtDate(t.date))}</td></tr>`).join("");
  return `${paceBox}
  <div class="card"><h2>${ic("play")}Test de 6 minutes</h2>
    <form id="testform"><div class="row">
      <div><label>Date</label><input type="date" name="date" value="${todayISO()}" required></div>
      <div><label>Distance (m)</label><input type="number" inputmode="numeric" name="distance" min="500" max="3000" required></div>
      <div><label>FC max relevée</label><input type="number" inputmode="numeric" name="maxHr" min="0"></div>
    </div><button class="btn primary" type="submit">Ajouter le test</button></form>
    ${testRows?`<table class="hist-table"><thead><tr><th>Date</th><th>Distance</th><th>FC max</th><th></th></tr></thead><tbody>${testRows}</tbody></table>`:""}
  </div>
  ${mobilityCard()}
  <div class="card"><h2>${ic("body")}Poids et mesures</h2>
    <form id="bodyform"><div class="row">
      <div><label>Date</label><input type="date" name="date" value="${todayISO()}" required></div>
      <div><label>Poids (kg)</label><input type="text" inputmode="decimal" name="weight"></div>
      <div><label>Tour de taille (cm)</label><input type="text" inputmode="decimal" name="waist"></div>
    </div><button class="btn primary" type="submit">Ajouter la mesure</button></form>
    ${bodyRows?`<table class="hist-table"><thead><tr><th>Date</th><th>Poids</th><th>Taille</th><th></th></tr></thead><tbody>${bodyRows}</tbody></table>`:""}
  </div>`;
}
function afterBody(){ afterMobility();
  $("#testform").onsubmit = e => { e.preventDefault(); const f=new FormData(e.target);
    db.tests.push({id:"t"+Date.now(), date:f.get("date"), distance:num(f.get("distance")), maxHr:num(f.get("maxHr"))}); save(); render(); toast("Test ajouté"); };
  $("#bodyform").onsubmit = e => { e.preventDefault(); const f=new FormData(e.target);
    db.body.push({id:"b"+Date.now(), date:f.get("date"), weight:num(f.get("weight")), waist:num(f.get("waist"))}); save(); render(); toast("Mesure ajoutée"); };
  document.querySelectorAll("[data-deltest]").forEach(b=>b.onclick=()=>{ if(confirm("Supprimer ce test de 6 minutes ?")){ db.tests=db.tests.filter(t=>t.id!==b.dataset.deltest); save(); render(); } });
  document.querySelectorAll("[data-delbody]").forEach(b=>b.onclick=()=>{ if(confirm("Supprimer cette mesure ?")){ db.body=db.body.filter(t=>t.id!==b.dataset.delbody); save(); render(); } });
}

function viewData(){
  return `<div class="card"><h2>${ic("gear")}Paramètres</h2>
    <div class="row">
      <div><label>Date de début du cycle</label><input type="date" id="p-start" value="${esc(db.profile.start)}"></div>
      <div><label>Objectif tractions</label><input type="number" inputmode="numeric" id="p-pull" value="${db.profile.goalPullups}"></div>
      <div><label>Objectif pompes</label><input type="number" inputmode="numeric" id="p-push" value="${db.profile.goalPushups}"></div>
      <div><label>Course continue max (min)</label><input type="number" inputmode="numeric" id="p-run" value="${db.profile.maxRunMin}"></div>
    </div><button class="btn primary" id="p-save" type="button">Enregistrer</button></div>
  <div class="card"><h2>${ic("down")}Sauvegarde et agents</h2>
    <p>Les données sont stockées dans ce navigateur. Pour les agents Claude Code : exportez le journal, placez le fichier dans <code>data/journal.json</code>, lancez <code>/bilan-hebdo</code>, puis importez <code>data/coach-notes.json</code> ici pour afficher les conseils sur l’accueil.</p>
    <div class="actions"><button class="btn ghost" id="exp" type="button">${ic("down","sm")}Exporter le journal</button></div>
    <label for="imp">Importer un fichier (journal.json ou coach-notes.json)</label>
    <input type="file" id="imp" accept="application/json">
    <small>Le fichier est vérifié avant toute modification. Un journal importé remplace les données locales (une copie de sécurité est gardée dans le navigateur). Un fichier de notes du coach s’ajoute aux notes existantes.</small>
  </div>
  <div class="card"><h2>${ic("shield")}À propos</h2>
    <p>Ad‑astra, version <b>${APP_VERSION}</b> · format de données ${DATA_VERSION}</p>
    <small>${esc(Updater.status())}<br>Dernière sauvegarde exportée : ${db.lastExport?esc(fmtDate(db.lastExport)):"jamais"}. Les données restent sur cet appareil, aucun serveur, aucun traceur.</small>
  </div>
  <div class="card"><h2>${ic("alert")}Zone sensible</h2><button class="btn ghost danger" id="reset" type="button">${ic("trash","sm")}Tout effacer</button></div>`;
}
function afterData(){
  $("#p-save").onclick = () => {
    const st = $("#p-start").value;
    if(st && isDay(st)) db.profile.start = st;
    const g = (id, d) => { const v = num($(id).value); return v!=null && v>0 ? v : d; };
    db.profile.goalPullups = g("#p-pull", 10);
    db.profile.goalPushups = g("#p-push", 40);
    db.profile.maxRunMin = g("#p-run", 75);
    save(); render(); toast("Paramètres enregistrés");
  };
  $("#exp").onclick = () => { downloadExport(); setTimeout(render, 50); toast("Journal exporté"); };
  $("#imp").onchange = e => {
    const file = e.target.files[0]; if(!file) return;
    const r = new FileReader();
    r.onload = () => {
      const res = importText(String(r.result), msg => confirm(msg));
      if(res.cancelled) return;
      if(!res.ok){ alert(res.error); return; }
      render(); toast(res.kind==="notes" ? `${res.added} note(s) ajoutée(s)` : "Journal importé");
    };
    r.onerror = () => alert("Lecture du fichier impossible.");
    r.readAsText(file);
  };
  $("#reset").onclick = () => {
    if(confirm("Effacer toutes les données locales ? Pensez à exporter d’abord.")){
      try{ localStorage.setItem(KEY + ".avant-effacement", JSON.stringify(db)); }catch(e){}
      db = defaultDB(); save(); render();
    }
  };
}


/* ===== Mises à jour (service worker) ===== */
const Updater = {
  reg: null, available: false, applying: false, last: 0,
  setup(reg){
    this.reg = reg;
    const watch = w => w.addEventListener("statechange", () => {
      if(w.state==="installed" && navigator.serviceWorker.controller){ this.available = true; this.banner(); }
    });
    if(reg.waiting && navigator.serviceWorker.controller){ this.available = true; this.banner(); }
    reg.addEventListener("updatefound", () => { if(reg.installing) watch(reg.installing); });
    const check = () => {
      const now = Date.now();
      if(now - this.last < 30*60*1000) return;      // au plus une vérification toutes les 30 min
      this.last = now; reg.update().catch(()=>{});
    };
    check();
    document.addEventListener("visibilitychange", () => { if(document.visibilityState==="visible") check(); });
    setInterval(check, 60*60*1000);
  },
  banner(){
    const b = $("#update-banner"); if(!b) return;
    b.classList.remove("hidden");
    $("#update-go").onclick = () => this.apply();
  },
  apply(){
    this.applying = true;
    const w = this.reg && this.reg.waiting;
    if(w) w.postMessage({type:"SKIP_WAITING"}); else location.reload();
  },
  status(){ return this.available ? "Une nouvelle version est prête : relancez l’appli." : "Version à jour (vérification automatique)."; }
};
if("serviceWorker" in navigator && /^https?:$/.test(location.protocol)){
  navigator.serviceWorker.addEventListener("controllerchange", () => { if(Updater.applying) location.reload(); });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then(r => Updater.setup(r)).catch(()=>{});
  });
}

render();
