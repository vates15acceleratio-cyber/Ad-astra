// Moteur de schémas d'exercices : un squelette 3D articulé, rendu en SVG sous plusieurs caméras.
//   - 'profile' : vue de profil (icône)   - 'iso' : vue isométrique plongeante (détail)
//   - 'front'   : vue de face (mouvements dans le plan frontal)   - 'three' : trois-quarts à hauteur d'yeux
// Une pose = angles de segments (degrés, repère écran : 0 = vers l'avant/droite, 90 = bas, -90 = haut).
// Le même fichier tourne dans Node (génération) et dans le navigateur (rendu à la volée possible).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MuscuSchemas = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const L = { torso: 58, upper: 32, fore: 30, thigh: 42, shin: 42, foot: 15, head: 11, neck: 10 };
  const C = { bg: '#0a0e14', surface: '#161b22', surface2: '#1f262f', border: '#2d3744', borderStrong: '#404a59',
    text: '#e6edf3', dim: '#9ba6b3', accent: '#f5d76e', accent2: '#ffe38f', accentDim: '#a8924a', accent2Dim: '#c9b66c', metal: '#9ba6b3' };
  const HW = 11, SW = 19;                       // demi-largeur hanches / épaules

  const rad = d => d * Math.PI / 180;
  const CAMS = { profile: { psi: 0, phi: 0 }, front: { psi: 90, phi: 0 }, iso: { psi: 35, phi: 40 }, three: { psi: 50, phi: 12 } };
  const camOf = (ex, name) => ({ ...CAMS[name], ...((ex.cams || {})[name] || {}) });   // ex.cams = { iso: { psi: 60 } }
  const proj = (cam, [x, y, z]) => {
    const p = rad(cam.psi), f = rad(cam.phi);
    return [x * Math.cos(p) - z * Math.sin(p), -y * Math.cos(f) + (x * Math.sin(p) + z * Math.cos(p)) * Math.sin(f)];
  };
  const depthOf = (cam, [x, , z]) => x * Math.sin(rad(cam.psi)) + z * Math.cos(rad(cam.psi));
  const avgDepth = (cam, pts) => pts.reduce((s, p) => s + depthOf(cam, p), 0) / pts.length;

  // ---------- squelette plan (repère écran, y vers le bas) ----------
  const dir = a => [Math.cos(rad(a)), Math.sin(rad(a))];
  const add = (p, d, len) => [p[0] + d[0] * len, p[1] + d[1] * len];
  function planar(a) {
    const hip = [0, 0], shoulder = add(hip, dir(a.torso), L.torso);
    const head = add(shoulder, dir(a.head ?? a.torso), L.neck + L.head);
    const elbow = add(shoulder, dir(a.upper), L.upper), wrist = add(elbow, dir(a.fore), L.fore);
    const knee = add(hip, dir(a.thigh), L.thigh), ankle = add(knee, dir(a.shin), L.shin), toe = add(ankle, dir(a.foot ?? 0), L.foot);
    return { hip, shoulder, head, elbow, wrist, knee, ankle, toe };
  }
  // IK 2 segments : genou entre la hanche et la cheville cible, plié vers l'avant (+x)
  function legIK(hip, ankle) {
    const dx = ankle[0] - hip[0], dy = ankle[1] - hip[1];
    const d = Math.min(Math.hypot(dx, dy), L.thigh + L.shin - 0.01) || 0.01;
    const a = (L.thigh * L.thigh - L.shin * L.shin + d * d) / (2 * d), h = Math.sqrt(Math.max(L.thigh * L.thigh - a * a, 0));
    const ux = dx / Math.hypot(dx, dy), uy = dy / Math.hypot(dx, dy);
    const bx = hip[0] + ux * a, by = hip[1] + uy * a;
    const k1 = [bx - uy * h, by + ux * h], k2 = [bx + uy * h, by - ux * h];
    return k1[0] > k2[0] ? k1 : k2;
  }
  // rotation autour de l'axe x passant par (y0, z = 0) : roulis du corps ou inclinaison latérale
  const rotYZ = (p, y0, deg) => { const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)), dy = p[1] - y0; return [p[0], y0 + dy * c - p[2] * s, p[2] * c + dy * s]; };

  // ---------- pose -> articulations 3D (repère monde : x avant, y haut, z gauche/droite ; sol y = 0) ----------
  function core(ex, def, A) {
    const limb = ['thigh', 'shin', 'foot', 'upper', 'fore'];
    const An = { ...A }, Af = { ...A };
    for (const k of limb) { if (def.n && def.n[k] !== undefined) An[k] = def.n[k]; if (def.f && def.f[k] !== undefined) Af[k] = def.f[k]; }
    const pn = planar(An), pf = planar(Af);
    // placement par ancre (articulation de la jambe/bras proche) ou hanche absolue
    const anchor = { ...ex.anchor, ...(def.anchor || {}) };
    let dx, dy;
    if (def.hip) { dx = def.hip[0]; dy = def.hip[1]; }
    else { dx = anchor.x[1] - pn[anchor.x[0]][0]; dy = anchor.y[1] - pn[anchor.y[0]][1]; }
    const mv = P => { const o = {}; for (const k in P) o[k] = [P[k][0] + dx, P[k][1] + dy]; return o; };
    const N = mv(pn), F = mv(pf);
    if (def.ik) for (const [side, T] of Object.entries(def.ik)) {
      const S = side === 'n' ? N : F, an = T.ankle;
      S.knee = legIK(S.hip, an); S.ankle = an;
      const fa = (side === 'n' ? An : Af).foot ?? 0; S.toe = add(an, dir(fa), L.foot);
    }
    const cx = anchor.x[1], fl = ex.floor;
    const W = P => { const o = {}; for (const k in P) o[k] = [P[k][0] - cx, fl - P[k][1]]; return o; };
    const Nw = W(N), Fw = W(F);
    const o = { stance: 6, grip: SW, flare: 0, ...(ex.opt || {}), ...(def.opt || {}) };
    const sides = {};
    for (const s of [1, -1]) {
      const P = s === 1 ? Nw : Fw, ang = s === 1 ? An : Af, k = {};
      const J = (p, z) => [p[0], p[1], z];
      const v = (th, al) => [Math.cos(rad(th)) * Math.cos(rad(al)), -Math.sin(rad(th)) * Math.cos(rad(al)), s * Math.sin(rad(al))];
      k.hip = J(P.hip, s * HW); k.knee = J(P.knee, s * (HW + o.stance * 0.5)); k.ankle = J(P.ankle, s * (HW + o.stance)); k.toe = J(P.toe, s * (HW + o.stance));
      if (def.lsp) {   // jambes écartées hors du plan sagittal (la hanche est l'ancre)
        const a = (s === 1 ? def.lsp.n : def.lsp.f) ?? def.lsp.a ?? 0, a2 = def.lsp.shin ?? a;
        const t = v(ang.thigh, a), sh = v(ang.shin, a2);
        k.knee = k.hip.map((c, i) => c + t[i] * L.thigh); k.ankle = k.knee.map((c, i) => c + sh[i] * L.shin);
        k.toe = [k.ankle[0] + Math.cos(rad(ang.foot ?? 0)) * L.foot, k.ankle[1] - Math.sin(rad(ang.foot ?? 0)) * L.foot, k.ankle[2]];
      }
      k.shoulder = J(P.shoulder, s * SW);
      if (def.abd) {
        // bras écartés hors du plan sagittal : vecteurs 3D (angle d'abduction en degrés)
        const au = (s === 1 ? def.abd.n ?? def.abd.u : def.abd.f ?? def.abd.u) ?? 0, af = (s === 1 ? def.abd.nf ?? def.abd.fo : def.abd.ff ?? def.abd.fo) ?? au;
        const u = v(ang.upper, au), fo = v(ang.fore, af);
        k.elbow = k.shoulder.map((c, i) => c + u[i] * L.upper); k.wrist = k.elbow.map((c, i) => c + fo[i] * L.fore);
      } else {
        k.wrist = J(P.wrist, s * o.grip); k.elbow = J(P.elbow, s * (SW + (o.grip - SW) * 0.5 + o.flare));
      }
      if (def.shr) for (const j of ['shoulder', 'elbow', 'wrist']) k[j] = [k[j][0], k[j][1] + def.shr, k[j][2]];   // haussement d'épaules
      sides[s] = k;
    }
    const mid = { hip: [Nw.hip[0], Nw.hip[1], 0], shoulder: [Nw.shoulder[0], Nw.shoulder[1], 0], head: [Nw.head[0], Nw.head[1], 0] };
    if (def.lean) {   // inclinaison latérale du haut du corps autour de la hanche
      const y0 = Nw.hip[1];
      for (const s of [1, -1]) for (const j of ['shoulder', 'elbow', 'wrist']) sides[s][j] = rotYZ(sides[s][j], y0, def.lean);
      mid.shoulder = rotYZ(mid.shoulder, y0, def.lean); mid.head = rotYZ(mid.head, y0, def.lean);
    }
    if (def.roll) {   // corps entier tourné autour de son axe (gainage latéral, drapeau)
      const y0 = Nw.hip[1];
      for (const s of [1, -1]) for (const j in sides[s]) sides[s][j] = rotYZ(sides[s][j], y0, def.roll);
      for (const j in mid) mid[j] = rotYZ(mid[j], y0, def.roll);
    }
    if (def.rest) {   // pose « posée » : recale tout le corps pour que son point le plus bas touche le sol
      let low = Infinity;
      for (const s of [1, -1]) for (const j in sides[s]) low = Math.min(low, sides[s][j][1]);
      for (const j in mid) low = Math.min(low, mid[j][1]);
      const dy = 3 - low;
      for (const s of [1, -1]) for (const j in sides[s]) sides[s][j] = [sides[s][j][0], sides[s][j][1] + dy, sides[s][j][2]];
      for (const j in mid) mid[j] = [mid[j][0], mid[j][1] + dy, mid[j][2]];
    }
    // les points « plan » (x, y) du côté proche suivent les transformations, pour le matériel
    const near = {}, far = {};
    for (const j in sides[1]) { near[j] = [sides[1][j][0], sides[1][j][1]]; far[j] = [sides[-1][j][0], sides[-1][j][1]]; }
    near.head = [mid.head[0], mid.head[1]]; far.head = near.head;
    return { sides, near, far, mid, opt: o };
  }

  function buildPose(ex, def) {
    let A0 = { ...def.a };
    if (def.ground) {
      // corps en ligne droite : cherche l'angle du tronc pour que deux articulations atteignent le sol (ou une hauteur donnée)
      const [ja, jb, dyG = 0] = def.ground;
      const pick = (pose, name) => { const [sd, j] = name.includes('.') ? name.split('.') : ['n', name]; return pose.sides[sd === 'f' ? -1 : 1][j][1]; };
      const [lo0, hi0] = def.range || [-88, 45];
      const Aof = t => (def.line === false ? { ...A0, torso: t } : { ...A0, torso: t, thigh: t + 180, shin: t + 180 });
      const f = t => { const P = core(ex, def, Aof(t)); return pick(P, ja) - pick(P, jb) - dyG; };
      let lo = lo0, hi = hi0;
      if (f(lo) * f(hi) <= 0) { for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; (f(lo) * f(m) <= 0) ? hi = m : lo = m; } A0 = Aof((lo + hi) / 2); }
      else A0 = Aof(A0.torso ?? -10);   // pas de solution dans l'intervalle : pose telle que décrite (jamais de NaN)
    }
    return core(ex, def, A0);
  }

  // ---------- primitives 3D ----------
  const mk = {
    line: (a, b, w, col, o = {}) => ({ t: 'line', p: [a, b], w, col, op: o.op ?? 1, bias: o.bias ?? 0, back: o.back }),
    poly: (pts, fill, stroke, o = {}) => ({ t: 'poly', p: pts, fill, stroke, sw: o.sw ?? 1.5, op: o.op ?? 1, bias: o.bias ?? 0, back: o.back }),
    circle: (c, r, fill, stroke, o = {}) => ({ t: 'circle', p: [c], r, fill, stroke, sw: o.sw ?? 3, op: o.op ?? 1, bias: o.bias ?? 0, back: o.back }),
  };
  function box(x0, x1, y0, y1, z0, z1, cols, bias = 0, back = false) {
    const stroke = C.borderStrong;
    const top = [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const fx = [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]];
    const fx0 = [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]];
    const fz = [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    const fz0 = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]];
    return [mk.poly(fz0, cols[2], stroke, { bias, back }), mk.poly(fx0, cols[1], stroke, { bias, back }), mk.poly(fz, cols[2], stroke, { bias: bias + 0.1, back }), mk.poly(fx, cols[1], stroke, { bias: bias + 0.1, back }), mk.poly(top, cols[0], stroke, { bias: bias + 0.2, back })];
  }
  // planche inclinée (banc, dossier, platine) : ligne médiane a → b dans le plan x-y, épaisseur th, demi-largeur w
  function slab(a, b, th, w, cols, bias = 0, back = false) {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, h = th / 2, st = C.borderStrong;
    const p0 = [a[0] + nx * h, a[1] + ny * h], p1 = [b[0] + nx * h, b[1] + ny * h], p2 = [b[0] - nx * h, b[1] - ny * h], p3 = [a[0] - nx * h, a[1] - ny * h];
    const at = (p, z) => [p[0], p[1], z], q = (pts, z) => pts.map(p => at(p, z));
    return [
      mk.poly(q([p0, p1, p2, p3], -w), cols[2], st, { bias, back }), mk.poly(q([p0, p1, p2, p3], w), cols[2], st, { bias: bias + 0.1, back }),
      mk.poly([at(p3, -w), at(p2, -w), at(p2, w), at(p3, w)], cols[1], st, { bias, back }), mk.poly([at(p0, -w), at(p3, -w), at(p3, w), at(p0, w)], cols[1], st, { bias: bias + 0.1, back }),
      mk.poly([at(p1, -w), at(p2, -w), at(p2, w), at(p1, w)], cols[1], st, { bias: bias + 0.1, back }), mk.poly([at(p0, -w), at(p1, -w), at(p1, w), at(p0, w)], cols[0], st, { bias: bias + 0.2, back }),
    ];
  }
  const GREY = ['#3a4350', '#2f3743', '#262d37'], BENCH = ['#2a323d', '#232a33', '#1b2129'], MAT = ['#2b3a4d', '#223041', '#1b2735'];
  // cercle dans un plan : axis = normale ('z' : disque de face, 'x' : vu de côté, 'y' : à plat)
  const ring3 = (c, R, axis, n = 28) => { const pts = []; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2, a = R * Math.cos(t), b = R * Math.sin(t); pts.push(axis === 'z' ? [c[0] + a, c[1] + b, c[2]] : axis === 'x' ? [c[0], c[1] + a, c[2] + b] : [c[0] + a, c[1], c[2] + b]); } return pts; };
  const disc = (c, R, o = {}) => mk.poly(ring3(c, R, o.axis || 'z'), 'rgba(155,166,179,.22)', C.metal, { sw: 2.5, back: true, ...o });
  const along = (c, axis, h) => axis === 'z' ? [[c[0], c[1], c[2] - h], [c[0], c[1], c[2] + h]] : axis === 'x' ? [[c[0] - h, c[1], c[2]], [c[0] + h, c[1], c[2]]] : [[c[0], c[1] - h, c[2]], [c[0], c[1] + h, c[2]]];
  const E = {
    barbell(c, half = 62) {
      const [x, y, z0] = c, z = z0 || 0, out = [];
      out.push(mk.line([x, y, z - half], [x, y, z + half], 4, C.metal));
      for (const s of [-1, 1]) { out.push(disc([x, y, z + s * (half - 8)], 21)); out.push(mk.circle([x, y, z + s * (half - 8)], 3.2, C.text, 'none', { sw: 0, back: true, bias: 0.1 })); }
      return out;
    },
    ezbar(c, half = 40) {   // barre EZ : centre coudé, petits disques
      const [x, y, z0] = c, z = z0 || 0, out = [], k = (zz, xx) => [x + xx, y, z + zz];
      const pts = [k(-half, 0), k(-16, 0), k(-8, -5), k(8, -5), k(16, 0), k(half, 0)];
      for (let i = 0; i < pts.length - 1; i++) out.push(mk.line(pts[i], pts[i + 1], 4, C.metal));
      for (const s of [-1, 1]) out.push(disc([x, y, z + s * (half - 6)], 14));
      return out;
    },
    dumbbell(c, axis = 'z') {   // haltère tenu à la main : axis = direction de la poignée ('z' travers, 'x' marteau, 'y' vertical)
      const out = [], [a, b] = along(c, axis, 9);
      out.push(mk.line(a, b, 4, C.metal, { bias: 0.5 }));
      for (const s of [-1, 1]) out.push(disc(axis === 'z' ? [c[0], c[1], c[2] + s * 11] : axis === 'x' ? [c[0] + s * 11, c[1], c[2]] : [c[0], c[1] + s * 11, c[2]], 8.5, { back: false, bias: 0.5, axis }));
      return out;
    },
    kettlebell(c) {
      const [x, y, z] = c;   // (x, y) = les mains sur la poignée ; le corps pend dessous
      return [mk.circle([x, y - 9, z], 6.5, 'none', C.metal, { sw: 3, bias: 0.55 }), mk.circle([x, y - 21, z], 12, '#3a4350', C.metal, { sw: 2.5, bias: 0.6 })];
    },
    plateHeld(c, R = 14) { return [disc(c, R, { back: false, bias: 0.6 })]; },
    flatDisc(c, R = 20) { return [mk.poly(ring3(c, R, 'y'), 'rgba(155,166,179,.3)', C.metal, { sw: 2.5, bias: 0.4 })]; },
    trapbar(c) {   // barre hexagonale : cadre à plat autour du corps, poignées sur les côtés
      const [x, y] = c, out = [], X = 30, Z = 22;
      const pts = [[x - X, y, -Z + 6], [x - X + 8, y, -Z - 2], [x + X - 8, y, -Z - 2], [x + X, y, -Z + 6], [x + X, y, Z - 6], [x + X - 8, y, Z + 2], [x - X + 8, y, Z + 2], [x - X, y, Z - 6]];
      for (let i = 0; i < pts.length; i++) out.push(mk.line(pts[i], pts[(i + 1) % pts.length], 4, C.metal, { bias: 0.3 }));
      for (const s of [-1, 1]) out.push(mk.line([x - 10, y, s * (Z + 2)], [x + 10, y, s * (Z + 2)], 6, '#c9d2de', { bias: 0.4 }));
      for (const s of [-1, 1]) out.push(...box(x - X - 6, x - X + 2, y - 10, y + 10, -10, 10, GREY, 0.1), ...box(x + X - 2, x + X + 6, y - 10, y + 10, -10, 10, GREY, 0.1));
      return out;
    },
    bench(x0, x1, top, o = {}) {      // banc plat : assise à la hauteur `top`
      const w = o.w ?? 15, th = 8, out = [];
      out.push(...box(x0, x1, top - th, top, -w, w, BENCH, -40));
      out.push(...box(x0 + 6, x0 + 12, 0, top - th, -w + 3, w - 3, BENCH, -45), ...box(x1 - 12, x1 - 6, 0, top - th, -w + 3, w - 3, BENCH, -45));
      return out;
    },
    // banc réglable : assise plate + dossier incliné d'un angle `deg` (par rapport à l'horizontale) ; deg < 0 = banc décliné
    adjBench(hipX, seatTop, deg, o = {}) {
      const w = o.w ?? 15, back = o.back ?? 78, out = [], d = [-Math.cos(rad(deg)), Math.sin(rad(deg))];
      out.push(...slab([hipX - 4, seatTop - 4], [hipX + (o.seat ?? 34), seatTop - 4], 8, w, BENCH, -40));
      out.push(...slab([hipX, seatTop - 2], [hipX + d[0] * back, seatTop - 2 + d[1] * back], 9, w, BENCH, -39));
      out.push(...box(hipX + 12, hipX + 18, 0, seatTop - 8, -w + 3, w - 3, BENCH, -45));
      const bx = hipX + d[0] * back * 0.7, by = seatTop - 2 + d[1] * back * 0.7;
      out.push(...box(bx - 3, bx + 3, 0, Math.max(by - 6, 4), -w + 3, w - 3, BENCH, -45));
      return out;
    },
    seat(x0, x1, top, w = 15) { return [...box(x0, x1, top - 8, top, -w, w, BENCH, -40), ...box((x0 + x1) / 2 - 4, (x0 + x1) / 2 + 4, 0, top - 8, -6, 6, BENCH, -45)]; },
    crate(x0, x1, h, w = 22) { return box(x0, x1, 0, h, -w, w, GREY, -40); },
    post(x, h, o = {}) { const w = o.w ?? 4; return box(x - w, x + w, 0, h, (o.z ?? 0) - w, (o.z ?? 0) + w, GREY, o.bias ?? -30, true); },
    pulley(c, r = 7) { return [mk.circle(c, r, '#2f3743', C.metal, { sw: 2, bias: 5 })]; },
    cable(a, b, w = 1.6) { return [mk.line(a, b, w, C.dim, { bias: 4 })]; },
    rope(c) { const [x, y, z] = c; return [mk.line([x, y, z - 9], [x, y, z + 9], 3, C.dim, { bias: 0.5 }), mk.circle([x, y, z - 9], 3.5, '#c9d2de', 'none', { sw: 0, bias: 0.6 }), mk.circle([x, y, z + 9], 3.5, '#c9d2de', 'none', { sw: 0, bias: 0.6 })]; },
    handle(c, half = 8) { const [x, y, z] = c; return [mk.line([x, y, z - half], [x, y, z + half], 5, '#c9d2de', { bias: 0.5 })]; },
    pullupBar(x, y, half = 60) {
      const out = [mk.line([x, y, -half], [x, y, half], 5, C.metal, { back: true })];
      for (const s of [-1, 1]) out.push(...box(x - 3, x + 3, 0, y + 6, s * half - 3, s * half + 3, GREY, 0, true));
      return out;
    },
    parallelBars(x, y, len = 70, half = 24) {
      const out = [];
      for (const s of [-1, 1]) {
        out.push(mk.line([x - len / 2, y, s * half], [x + len / 2, y, s * half], 5, C.metal, { back: true }));
        out.push(...box(x - len / 2 - 3, x - len / 2 + 3, 0, y, s * half - 3, s * half + 3, GREY, 0, true));
        out.push(...box(x + len / 2 - 3, x + len / 2 + 3, 0, y, s * half - 3, s * half + 3, GREY, 0, true));
      }
      return out;
    },
    rings(x, y, half = 24, top = 250) {   // anneaux : sangles suspendues, un anneau à chaque main (x, y = hauteur des mains)
      const out = [mk.line([x, top, -half], [x, top, half], 5, C.metal, { back: true })];
      for (const s of [-1, 1]) { out.push(mk.line([x, y, s * half], [x, top, s * half], 2.5, C.dim, { back: true })); out.push(mk.circle([x, y - 3, s * half], 7, 'none', '#c9d2de', { sw: 2.5, bias: 0.1 })); }
      return out;
    },
    wheel(c) { const [x, y, z] = c; return [mk.circle([x, y - 12, z], 12, '#3a4350', C.metal, { sw: 2.5, bias: 0.3 }), mk.line([x, y - 12, z - 10], [x, y - 12, z + 10], 4, '#c9d2de', { bias: 0.4 })]; },
    wall(x, h = 260) { return box(x, x + 4, 0, h, -70, 70, ['#232b36', '#1c232d', '#161c25'], -80, true); },
    mat(x0, x1) { return box(x0, x1, 0, 4, -26, 26, MAT, -60); },
    blocks(x, y) { const o = []; for (const s of [-1, 1]) o.push(...box(x - 18, x + 18, 0, y, s * 17 - 3, s * 17 + 3, GREY)); return o; },
  };

  // ---------- corps ----------
  function body(pose, cam) {
    const out = [], { sides, mid } = pose, quad = cam.psi !== 0;
    const col = s => (s < 0 ? C.accentDim : C.accent), col2 = s => (s < 0 ? C.accent2Dim : C.accent2);
    for (const s of [-1, 1]) {
      const k = sides[s];
      out.push(mk.line(k.hip, k.knee, 10, col(s), { bias: 0.1 }), mk.line(k.knee, k.ankle, 9, col(s), { bias: 0.1 }), mk.line(k.ankle, k.toe, 7, col(s), { bias: 0.1 }));
      out.push(mk.line(k.shoulder, k.elbow, 8, col2(s), { bias: 0.6 }), mk.line(k.elbow, k.wrist, 7, col2(s), { bias: 0.6 }));
      out.push(mk.circle(k.wrist, 4.2, col2(s), 'none', { sw: 0, bias: 0.8 }));
    }
    const torso = [sides[-1].shoulder, sides[1].shoulder, sides[1].hip, sides[-1].hip];
    if (quad) out.push(mk.poly(torso, C.accent, C.accentDim, { sw: 2, bias: 0.3, op: 0.96 }));
    out.push(mk.line(mid.shoulder, mid.hip, quad ? 6 : 13, C.accent, { bias: 0.35 }));
    out.push(mk.line(mid.shoulder, mid.head, 6, C.accent, { bias: 0.4 }));
    out.push(mk.circle(mid.head, L.head, C.surface2, C.accent, { sw: 3, bias: 0.5 }));
    for (const s of [-1, 1]) { out.push(mk.circle(sides[s].knee, 2.4, C.bg, 'none', { sw: 0, bias: 0.9 }), mk.circle(sides[s].elbow, 2.4, C.bg, 'none', { sw: 0, bias: 1.2 })); }
    return out;
  }

  function scene(ex, idx, camName) {
    const cam = camOf(ex, camName), def = ex.poses[idx], pose = buildPose(ex, def), out = [];
    const ctx = { P: pose.near, F: pose.far, S: pose.sides, mid: pose.mid, pose, def, cam, idx };
    out.push(...ex.equip(ctx));
    out.push(...body(pose, cam));
    return { prims: out, pose };
  }

  // ---------- rendu SVG ----------
  const f1 = n => n.toFixed(1);
  let gradSeq = 0;   // identifiant de dégradé unique par SVG (plusieurs schémas peuvent cohabiter dans la page)
  function frameFor(ex, camName, W, H, M, only) {
    const cam = camOf(ex, camName), pts = [];
    ex.poses.forEach((_, i) => (only && !only.includes(i)) || scene(ex, i, camName).prims.forEach(p => p.p.forEach(q => {
      const s = proj(cam, q), r = p.t === 'circle' ? p.r : 0; pts.push([s[0] - r, s[1] - r], [s[0] + r, s[1] + r]);
    })));
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.min((W - 2 * M) / (x1 - x0), (H - 2 * M) / (y1 - y0));
    return { k, ox: M + ((W - 2 * M) - (x1 - x0) * k) / 2 - x0 * k, oy: M + ((H - 2 * M) - (y1 - y0) * k) / 2 - y0 * k };
  }

  /** opts : { w, h, margin, badge (numéro), arrow, fitPoses } */
  function renderPose(ex, idx, camName, opts = {}) {
    const W = opts.w ?? 240, H = opts.h ?? 280, M = opts.margin ?? 12, cam = camOf(ex, camName);
    const fr = frameFor(ex, camName, W, H, M, opts.fitPoses);
    const T = q => { const s = proj(cam, q); return [s[0] * fr.k + fr.ox, s[1] * fr.k + fr.oy]; };
    const { prims, pose } = scene(ex, idx, camName);
    let s = '';
    // sol
    const fy = T([0, 0, 0])[1];
    if (cam.phi === 0) s += `<line x1="4" y1="${f1(fy)}" x2="${W - 4}" y2="${f1(fy)}" stroke="${C.borderStrong}" stroke-width="2"/>`;
    else {
      const cx = pose.mid.hip[0], ring = [];   // ombre au sol : un disque qui s'estompe (pas de bord net)
      for (let j = 0; j < 36; j++) { const t = j / 36 * Math.PI * 2; ring.push(T([cx + 74 * Math.cos(t), 0, 74 * Math.sin(t)])); }
      const gid = 'sg' + (++gradSeq);
      s += `<defs><radialGradient id="${gid}"><stop offset="0" stop-color="#2a3a52" stop-opacity=".75"/><stop offset="1" stop-color="#2a3a52" stop-opacity="0"/></radialGradient></defs>`
        + `<polygon points="${ring.map(q => q.map(f1).join(',')).join(' ')}" fill="url(#${gid})"/>`;
    }
    // ordre de dessin : profondeur (algorithme du peintre) ; les disques passent derrière le corps en vue plate
    const flat = cam.phi === 0;
    const key = p => (p.back && flat ? -1e4 + p.bias : avgDepth(cam, p.p) + p.bias);
    prims.sort((a, b) => key(a) - key(b)).forEach(p => {
      if (p.t === 'line') { const a = T(p.p[0]), b = T(p.p[1]); s += `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${p.col}" stroke-width="${f1(p.w * fr.k)}" stroke-linecap="round" opacity="${p.op}"/>`; }
      else if (p.t === 'poly') s += `<polygon points="${p.p.map(q => T(q).map(f1).join(',')).join(' ')}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.sw}" stroke-linejoin="round" opacity="${p.op}"/>`;
      else { const c = T(p.p[0]); s += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(p.r * fr.k)}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.sw}" opacity="${p.op}"/>`; }
    });
    // flèche de mouvement (vers la pose suivante)
    if (opts.arrow && idx < ex.poses.length - 1 && ex.arrowRef) {
      const ref = i => { const sc = scene(ex, i, camName).pose; return T(sc.near[ex.arrowRef].concat(0))[1]; };
      const y1 = ref(idx), y2 = ref(idx + 1);
      if (Math.abs(y2 - y1) > 10) { const x = ex.arrowX ?? 24, h = y2 < y1 ? 7 : -7;
        s += `<g stroke="${C.accentDim}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="${x}" y1="${f1(y1)}" x2="${x}" y2="${f1(y2)}"/><polyline points="${x - 6},${f1(y2 + h)} ${x},${f1(y2)} ${x + 6},${f1(y2 + h)}"/></g>`; }
    }
    if (opts.badge) s += `<g><circle cx="20" cy="20" r="11" fill="${C.accent}"/><text x="20" y="25" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="${C.bg}">${idx + 1}</text></g>`;
    const label = opts.label ?? ((ex.name ? ex.name + ' — ' : '') + ex.poses[idx].label);
    const aria = opts.decorative ? 'aria-hidden="true"' : `role="img" aria-label="${String(label).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`;
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" ${aria}>${s}</svg>`;
  }

  const iconIdx = ex => ex.icon ?? ex.poses.length - 1;
  // l'icône est cadrée sur sa seule pose : la figure remplit la vignette
  const renderIcon = (ex, opts = {}) => renderPose(ex, iconIdx(ex), ex.iconCam ?? 'profile', { w: 160, h: 160, margin: 8, fitPoses: [iconIdx(ex)], ...opts, badge: false, arrow: false });
  const renderDetail = (ex, idx, opts = {}) => renderPose(ex, idx, ex.detailCam ?? 'iso', { w: 240, h: 280, badge: true, arrow: true, ...opts });

  return { L, C, CAMS, E, mk, box, slab, GREY, BENCH, MAT, buildPose, scene, renderPose, renderIcon, renderDetail };
});
