/* ==========================================================================
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

  __def("schemas-core", function (module, require) {
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
    
  });

  __def("common", function (module, require) {
    // Éléments communs aux familles d'exercices.
    const S = require('../schemas-core');
    const { E, box, slab, GREY, BENCH, MAT, mk, C } = S;
    
    const STAND = { x: ['ankle', 100], y: ['ankle', 224] };          // pieds posés, sol à y = 230
    const UP = { torso: -90, thigh: 90, shin: 90, foot: 0 };          // debout, de profil
    const LIE = { torso: 180, thigh: 5, shin: 100, foot: 0 };         // allongé sur un banc, pieds au sol
    const LIE_ANCHOR = { x: ['hip', 135], y: ['ankle', 226] };
    
    const bar = (half = 62) => ({ P }) => E.barbell([P.wrist[0], P.wrist[1]], half);
    const dbs = (axis = 'z') => ({ S: sd }) => [...E.dumbbell(sd[1].wrist, axis), ...E.dumbbell(sd[-1].wrist, axis)];
    const both = (...fns) => ctx => fns.flatMap(f => f(ctx));
    const pose = (label, a, extra = {}) => ({ label, a, ...extra });
    
    // appareil à poulie haute pour le tirage vertical (siège, cale-cuisses, montant, poulie, câble, barre)
    const pulldown = (bw = 46, opts = {}) => ({ S: sd }) => {
      const out = [], w = sd[1].wrist, top = 200;
      out.push(...box(-22, 14, 0, 38, -22, 22, BENCH, -40));
      out.push(...box(26, 52, 36, 44, -28, 28, BENCH, -39));
      out.push(...box(70, 78, 0, top, -4, 4, GREY, -30, true), ...box(10, 78, top - 6, top, -4, 4, GREY, -29, true));
      out.push(...box(54, 98, 0, 6, -30, 30, GREY, -45));
      if (opts.stack) out.push(...box(84, 108, 0, 120, -18, 18, GREY, -46, true));
      out.push(...E.pulley([14, top - 3, 0]));
      for (const s of [-1, 1]) out.push(...E.cable([14, top - 3, 0], [w[0], w[1], s * bw * 0.5]));
      out.push(mk.line([w[0], w[1], -bw], [w[0], w[1], bw], 5, C.metal, { bias: 0.9 }));
      return out;
    };
    
    module.exports = { S, E, box, slab, GREY, BENCH, MAT, mk, C, STAND, UP, LIE, LIE_ANCHOR, bar, dbs, both, pose, pulldown };
    
  });

  __def("base", function (module, require) {
    // Définitions d'exercices : poses (angles en degrés, repère écran : 0 = avant, 90 = bas, -90 = haut) + matériel.
    // Les ids sont ceux de EXERCISE_LIBRARY (app.js) et ne changent jamais.
    const S = require('../schemas-core');
    const { E, box, GREY, BENCH, mk } = S;
    
    const STAND = { x: ['ankle', 100], y: ['ankle', 224] };   // pieds posés, sol à y = 230
    const bothDumbbells = ({ S: sd }) => [...E.dumbbell(sd[1].wrist), ...E.dumbbell(sd[-1].wrist)];
    
    const EXERCISES = [
      // ---------------------------------------------------------------- repris des prototypes
      { id: 'q-squat', name: 'Squat barre dos', meta: 'Quadriceps · Fessiers — barre',
        anchor: STAND, floor: 230, opt: { stance: 14, grip: 30, flare: -8 },
        poses: [
          { label: 'Debout', a: { torso: -88, thigh: 92, shin: 90, foot: 0, upper: 100, fore: -80 } },
          { label: 'Bas (cuisses parallèles)', a: { torso: -52, thigh: 8, shin: 108, foot: 0, upper: 110, fore: -70 } },
        ],
        equip: ({ P }) => E.barbell([P.shoulder[0] - 3, P.shoulder[1] + 2], 64), arrowRef: 'shoulder' },
    
      { id: 'dos-sdt', name: 'Soulevé de terre conventionnel', meta: 'Dorsaux · Ischios · Fessiers — barre',
        anchor: STAND, floor: 230, opt: { stance: 6, grip: 24 },
        poses: [
          { label: 'Départ', a: { torso: -35, thigh: 10, shin: 100, foot: 0, upper: 98, fore: 98, head: -45 } },
          { label: 'Mi-course', a: { torso: -50, thigh: 40, shin: 98, foot: 0, upper: 95, fore: 93, head: -60 } },
          { label: 'Verrouillé', a: { torso: -92, thigh: 90, shin: 90, foot: 0, upper: 82, fore: 82 } },
        ],
        equip: ({ P }) => E.barbell([P.wrist[0], P.wrist[1]], 64), arrowRef: 'wrist' },
    
      { id: 'pec-dc-barre', name: 'Développé couché barre', meta: 'Pectoraux · Triceps — barre + banc',
        anchor: { x: ['hip', 135], y: ['ankle', 226] }, floor: 230, opt: { stance: 18, grip: 32, flare: 4 },
        poses: [
          { label: 'Barre tendue', a: { torso: 180, thigh: 5, shin: 100, foot: 0, upper: -80, fore: -90 } },
          { label: 'Barre à la poitrine', a: { torso: 180, thigh: 5, shin: 100, foot: 0, upper: 35, fore: -100 } },
        ],
        equip: ({ P }) => [...E.bench(P.shoulder[0] - 34, P.hip[0] + 36, P.hip[1] - 12), ...E.barbell([P.wrist[0], P.wrist[1]], 64)], arrowRef: 'wrist' },
    
      { id: 'dos-tractions', name: 'Tractions prise pronation', meta: 'Dorsaux · Biceps — barre fixe, poids du corps',
        anchor: { x: ['wrist', 118], y: ['wrist', 50] }, floor: 270, opt: { stance: 6, grip: 26 }, iconCam: 'front',
        poses: [
          { label: 'Suspendu, bras tendus', a: { torso: -90, thigh: 92, shin: 98, foot: 60, upper: -90, fore: -90 } },
          { label: 'Menton au-dessus de la barre', a: { torso: -95, thigh: 100, shin: 108, foot: 60, upper: 80, fore: -80, head: -95 } },
        ],
        equip: ({ P }) => E.pullupBar(P.wrist[0], P.wrist[1]), arrowRef: 'hip' },
    
      { id: 'cal-lsit', name: 'L-sit', meta: 'Abdos · Triceps — maintien statique',
        anchor: { x: ['wrist', 90], y: ['wrist', 150] }, floor: 174, opt: { stance: 2, grip: 17 },
        poses: [{ label: 'Maintien', a: { torso: -90, thigh: 0, shin: 0, foot: -10, upper: 90, fore: 90 } }],
        equip: ({ P }) => E.blocks(P.wrist[0], P.wrist[1] - 4) },
    
      // ---------------------------------------------------------------- épaules, bras
      { id: 'ep-dm-barre', name: 'Développé militaire barre debout', meta: 'Épaules · Triceps — barre',
        anchor: STAND, floor: 230, opt: { stance: 8, grip: 26 },
        poses: [
          { label: 'Barre aux épaules', a: { torso: -90, thigh: 90, shin: 90, foot: 0, upper: 70, fore: -95 } },
          { label: 'Bras tendus au-dessus de la tête', a: { torso: -90, thigh: 90, shin: 90, foot: 0, upper: -80, fore: -85 } },
        ],
        equip: ({ P }) => E.barbell([P.wrist[0], P.wrist[1]], 62), arrowRef: 'wrist' },
    
      { id: 'bi-curl-barre', name: 'Curl barre droite', meta: 'Biceps — barre',
        anchor: STAND, floor: 230, opt: { stance: 8, grip: 24 },
        poses: [
          { label: 'Bras tendus', a: { torso: -90, thigh: 90, shin: 90, foot: 0, upper: 92, fore: 92 } },
          { label: 'Mi-course', a: { torso: -90, thigh: 90, shin: 90, foot: 0, upper: 92, fore: 10 } },
          { label: 'Contraction', a: { torso: -90, thigh: 90, shin: 90, foot: 0, upper: 92, fore: -62 } },
        ],
        equip: ({ P }) => E.barbell([P.wrist[0], P.wrist[1]], 56), arrowRef: 'wrist' },
    
      { id: 'ep-elev-lat', name: 'Élévations latérales haltères', meta: 'Épaules — haltères (vue de face)',
        anchor: STAND, floor: 230, opt: { stance: 8, grip: 22 }, iconCam: 'front', cams: { iso: { psi: 62, phi: 25 } },
        poses: [
          { label: 'Bras le long du corps', a: { torso: -90, thigh: 90, shin: 90, foot: 0, upper: 90, fore: 90 }, abd: { u: 6, fo: 6 } },
          { label: 'Bras à l\'horizontale', a: { torso: -90, thigh: 90, shin: 90, foot: 0, upper: 90, fore: 90 }, abd: { u: 86, fo: 74 } },
        ],
        equip: bothDumbbells, arrowRef: 'wrist' },
    
      { id: 'tri-dips', name: 'Dips parallèles', meta: 'Triceps · Pectoraux — barres parallèles',
        anchor: { x: ['wrist', 120], y: ['wrist', 120] }, floor: 230, opt: { stance: 4, grip: 24 }, cams: { iso: { psi: 50, phi: 32 } },
        poses: [
          { label: 'Bras tendus', a: { torso: -84, thigh: 100, shin: 160, foot: 90, upper: 90, fore: 90 } },
          { label: 'Coudes fléchis', a: { torso: -72, thigh: 105, shin: 165, foot: 90, upper: 140, fore: 45 } },
        ],
        equip: ({ P }) => E.parallelBars(P.wrist[0], P.wrist[1], 80, 24), arrowRef: 'shoulder' },
    
      // ---------------------------------------------------------------- dos
      { id: 'dos-rowing-barre', name: 'Rowing barre buste penché', meta: 'Dorsaux · Biceps · Trapèzes — barre',
        anchor: STAND, floor: 230, opt: { stance: 8, grip: 28 },
        poses: [
          { label: 'Bras tendus', a: { torso: -35, thigh: 55, shin: 105, foot: 0, upper: 90, fore: 90, head: -45 } },
          { label: 'Barre au ventre', a: { torso: -35, thigh: 55, shin: 105, foot: 0, upper: 150, fore: 80, head: -45 } },
        ],
        equip: ({ P }) => E.barbell([P.wrist[0], P.wrist[1]], 60), arrowRef: 'wrist' },
    
      { id: 'dos-tirage-v-large', name: 'Tirage vertical prise large', meta: 'Dorsaux · Biceps — poulie haute',
        anchor: { x: ['hip', 120], y: ['hip', 184] }, floor: 230, opt: { stance: 10, grip: 38, flare: 6 },
        poses: [
          { label: 'Bras tendus', a: { torso: -96, thigh: 4, shin: 90, foot: 0, upper: -78, fore: -82 } },
          { label: 'Barre au sternum', a: { torso: -108, thigh: 4, shin: 90, foot: 0, upper: 105, fore: -62 } },
        ],
        equip: ({ P, S: sd }) => {
          const out = [], bw = 46, w = sd[1].wrist, top = 200;
          out.push(...box(-22, 14, 0, 38, -22, 22, BENCH, -40));                          // siège
          out.push(...box(26, 52, 36, 44, -28, 28, BENCH, -39));                          // cale-cuisses
          out.push(...box(70, 78, 0, top, -4, 4, GREY, -30), ...box(10, 78, top - 6, top, -4, 4, GREY, -29)); // montant + bras
          out.push(...box(54, 98, 0, 6, -30, 30, GREY, -45));                              // base
          out.push(mk.circle([14, top - 3, 0], 7, '#2f3743', S.C.metal, { sw: 2, bias: 5 }));  // poulie
          for (const s of [-1, 1]) out.push(mk.line([14, top - 3, 0], [w[0], w[1], s * bw * 0.5], 1.6, S.C.dim, { bias: 4 }));
          out.push(mk.line([w[0], w[1], -bw], [w[0], w[1], bw], 5, S.C.metal, { bias: 0.9 }));  // barre de tirage
          return out;
        }, arrowRef: 'wrist' },
    
      { id: 'dos-rowing-halt', name: 'Rowing haltère unilatéral', meta: 'Dorsaux · Biceps — haltère + banc',
        anchor: { x: ['ankle', 100], y: ['ankle', 224] }, floor: 230, opt: { stance: 16, grip: 14 }, cams: { iso: { psi: 55, phi: 32 } },
        poses: [
          { label: 'Bras tendu', a: { torso: -12, thigh: 75, shin: 98, foot: 0, head: -25 }, n: { upper: 90, fore: 90 }, f: { upper: 88, fore: 92, thigh: 100, shin: 80 } },
          { label: 'Haltère à la hanche', a: { torso: -12, thigh: 75, shin: 98, foot: 0, head: -25 }, n: { upper: 150, fore: 80 }, f: { upper: 88, fore: 92, thigh: 100, shin: 80 } },
        ],
        equip: ({ S: sd }) => {
          const fw = sd[-1].wrist;
          return [...E.bench(fw[0] - 34, fw[0] + 34, fw[1] - 1), ...E.dumbbell(sd[1].wrist)];
        }, arrowRef: 'wrist' },
    
      // ---------------------------------------------------------------- pectoraux, poids du corps
      { id: 'pec-dc-halt', name: 'Développé couché haltères', meta: 'Pectoraux · Triceps — haltères + banc',
        anchor: { x: ['hip', 135], y: ['ankle', 226] }, floor: 230, opt: { stance: 18, grip: 26, flare: 8 },
        poses: [
          { label: 'Haltères tendus', a: { torso: 180, thigh: 5, shin: 100, foot: 0, upper: -80, fore: -90 } },
          { label: 'Haltères à la poitrine', a: { torso: 180, thigh: 5, shin: 100, foot: 0, upper: 40, fore: -100 } },
        ],
        equip: ({ P, S: sd }) => [...E.bench(P.shoulder[0] - 34, P.hip[0] + 36, P.hip[1] - 12), ...bothDumbbells({ S: sd })], arrowRef: 'wrist' },
    
      { id: 'pec-pompes', name: 'Pompes', meta: 'Pectoraux · Triceps · Épaules — poids du corps',
        anchor: { x: ['wrist', 130], y: ['wrist', 226] }, floor: 230, opt: { stance: 2, grip: 22, flare: 8 }, cams: { iso: { psi: 62, phi: 32 } },
        poses: [
          { label: 'Bras tendus', ground: ['wrist', 'toe'], a: { foot: 80, upper: 90, fore: 90 } },
          { label: 'Poitrine près du sol', ground: ['wrist', 'toe'], a: { foot: 80, upper: 128, fore: 62 } },
        ],
        equip: () => [], arrowRef: 'shoulder', icon: 0 },
    
      // ---------------------------------------------------------------- jambes, fessiers
      { id: 'q-fentes-halt', name: 'Fentes haltères', meta: 'Quadriceps · Fessiers · Ischios — haltères',
        anchor: STAND, floor: 230, opt: { stance: 14, grip: 24 },
        poses: [
          { label: 'Debout', a: { torso: -90, thigh: 90, shin: 90, foot: 0, upper: 90, fore: 90 } },
          { label: 'Fente basse', hip: [62, 182], a: { torso: -90, foot: 0, upper: 90, fore: 90 },
            ik: { n: { ankle: [100, 224] }, f: { ankle: [8, 209] } }, f: { foot: 100 } },
        ],
        equip: bothDumbbells, arrowRef: 'hip' },
    
      { id: 'fess-hip-thrust', name: 'Hip thrust barre', meta: 'Fessiers · Ischios — barre + banc',
        anchor: { x: ['ankle', 150], y: ['ankle', 224] }, floor: 230, opt: { stance: 10, grip: 26 },
        poses: [
          { label: 'Hanches basses', a: { torso: -160, thigh: -50, shin: 85, foot: 0, upper: 25, fore: 15, head: -172 } },
          { label: 'Hanches hautes', a: { torso: 170, thigh: 0, shin: 90, foot: 0, upper: 25, fore: 15, head: 160 } },
        ],
        equip: ({ P }) => [...E.bench(-132, -78, 31), ...E.barbell([P.hip[0] + 4, P.hip[1] + 8], 60)], arrowRef: 'hip' },
    
      { id: 'fn-kb-swing', name: 'Kettlebell swing', meta: 'Fessiers · Ischios · Dorsaux — kettlebell',
        anchor: STAND, floor: 230, opt: { stance: 12, grip: 8 },
        poses: [
          { label: 'Départ, hanches en arrière', a: { torso: -38, thigh: 58, shin: 102, foot: 0, upper: 115, fore: 118, head: -48 } },
          { label: 'Haut, bras à l\'horizontale', a: { torso: -90, thigh: 90, shin: 90, foot: 0, upper: 6, fore: 4 } },
        ],
        equip: ({ P }) => E.kettlebell([P.wrist[0], P.wrist[1], 0]), arrowRef: 'wrist' },
    
      // ---------------------------------------------------------------- abdos
      { id: 'ab-plank', name: 'Gainage frontal (planche)', meta: 'Abdos · Lombaires — poids du corps, maintien',
        anchor: { x: ['elbow', 120], y: ['wrist', 226] }, floor: 230, opt: { stance: 2, grip: 14 }, cams: { iso: { psi: 62, phi: 32 } },
        poses: [{ label: 'Maintien', ground: ['wrist', 'toe'], a: { foot: 80, upper: 90, fore: 0 } }],
        equip: () => [] },
    
      { id: 'ab-crunch', name: 'Crunch', meta: 'Abdos — poids du corps',
        anchor: { x: ['hip', 150], y: ['hip', 220] }, floor: 230, opt: { stance: 12, grip: 20 }, cams: { iso: { psi: 62, phi: 32 } },
        poses: [
          { label: 'Allongé', a: { torso: 180, thigh: -60, shin: 75, foot: 0, upper: -80, fore: 160, head: 180 } },
          { label: 'Épaules décollées', a: { torso: -158, thigh: -60, shin: 75, foot: 0, upper: -80, fore: 160, head: -150 } },
        ],
        equip: () => [], arrowRef: 'shoulder' },
    
      { id: 'ab-leg-raise-susp', name: 'Relevé de jambes suspendu', meta: 'Abdos — barre fixe',
        anchor: { x: ['wrist', 118], y: ['wrist', 50] }, floor: 270, opt: { stance: 4, grip: 26 },
        poses: [
          { label: 'Suspendu', a: { torso: -90, thigh: 92, shin: 92, foot: 60, upper: -90, fore: -90 } },
          { label: 'Jambes à l\'horizontale', a: { torso: -98, thigh: 6, shin: 4, foot: -20, upper: -90, fore: -90 } },
        ],
        equip: ({ P }) => E.pullupBar(P.wrist[0], P.wrist[1]), arrowRef: 'ankle' },
    ];
    
    module.exports = { EXERCISES };
    
  });

  __def("pec", function (module, require) {
    // Pectoraux (hors développé couché barre / haltères et pompes, dans base.js)
    const { E, box, slab, GREY, BENCH, MAT, mk, C, STAND, UP, LIE, LIE_ANCHOR, bar, dbs, both, pose } = require('./common');
    
    // banc incliné (+) ou décliné (-) sous un corps couché : les points viennent de la pose
    const NOMAT = () => [];   // pas de tapis sous les pompes : il encombre la vue isométrique
    const inclined = (deg, back = 80) => ({ P }) => E.adjBench(P.hip[0], P.hip[1] - 8, deg, { back });
    const INC = (deg, up, down, opt, tail = []) => ({
      anchor: LIE_ANCHOR, floor: 230, opt,
      poses: [
        pose('Départ, bras tendus', { torso: -(180 - deg), thigh: 5, shin: 100, foot: 0, upper: up[0], fore: up[1] }),
        pose('Bas du mouvement', { torso: -(180 - deg), thigh: 5, shin: 100, foot: 0, upper: down[0], fore: down[1] }),
      ], ...tail,
    });
    // banc décliné : une planche qui descend vers la tête, pieds calés sous les rouleaux
    const declineBench = ({ P }) => {
      const hx = P.hip[0], top = P.hip[1] - 12, out = [];
      out.push(...slab([hx + 52, top + 17], [hx - 82, top - 31], 9, 15, BENCH, -40));
      out.push(...box(hx + 38, hx + 44, 0, top + 6, -12, 12, BENCH, -45), ...box(hx - 70, hx - 64, 0, top - 36, -12, 12, BENCH, -45));
      for (const s of [-1, 1]) out.push(mk.circle([P.ankle[0] + 3, P.ankle[1] + 8, s * 14], 5, '#3a4350', C.metal, { sw: 2, bias: 0.3 }));
      return out;
    };
    
    const EXERCISES = [
      { id: 'pec-di-barre', anchor: LIE_ANCHOR, floor: 230, opt: { stance: 18, grip: 32, flare: 4 },
        poses: [
          pose('Barre tendue', { torso: -145, thigh: 5, shin: 100, foot: 0, upper: -82, fore: -90 }),
          pose('Barre en haut de la poitrine', { torso: -145, thigh: 5, shin: 100, foot: 0, upper: 52, fore: -100 }),
        ], equip: both(inclined(35), bar(64)), arrowRef: 'wrist' },
    
      { id: 'pec-di-halt', anchor: LIE_ANCHOR, floor: 230, opt: { stance: 18, grip: 26, flare: 8 },
        poses: [
          pose('Haltères tendus', { torso: -145, thigh: 5, shin: 100, foot: 0, upper: -82, fore: -90 }),
          pose('Haltères en haut de la poitrine', { torso: -145, thigh: 5, shin: 100, foot: 0, upper: 55, fore: -100 }),
        ], equip: both(inclined(35), dbs()), arrowRef: 'wrist' },
    
      { id: 'pec-dd-barre', anchor: { x: ['hip', 135], y: ['hip', 150] }, floor: 230, opt: { stance: 16, grip: 32, flare: 4 },
        poses: [
          pose('Barre tendue', { torso: 160, thigh: -22, shin: 55, foot: 0, upper: -78, fore: -90 }),
          pose('Barre au bas de la poitrine', { torso: 160, thigh: -22, shin: 55, foot: 0, upper: 40, fore: -100 }),
        ], equip: both(declineBench, bar(64)), arrowRef: 'wrist' },
    
      { id: 'pec-dd-halt', anchor: { x: ['hip', 135], y: ['hip', 150] }, floor: 230, opt: { stance: 16, grip: 26, flare: 8 },
        poses: [
          pose('Haltères tendus', { torso: 160, thigh: -22, shin: 55, foot: 0, upper: -78, fore: -90 }),
          pose('Haltères au bas de la poitrine', { torso: 160, thigh: -22, shin: 55, foot: 0, upper: 45, fore: -100 }),
        ], equip: both(declineBench, dbs()), arrowRef: 'wrist' },
    
      // écarté : bras dans le plan frontal -> vue de face
      { id: 'pec-ecart-plat', anchor: LIE_ANCHOR, floor: 230, opt: { stance: 18, grip: 22 }, iconCam: 'front', cams: { iso: { psi: 62, phi: 28 } },
        poses: [
          pose('Haltères au-dessus de la poitrine', { ...LIE, upper: -90, fore: -90 }, { abd: { u: 5, fo: 5 } }),
          pose('Bras ouverts, coudes légèrement fléchis', { ...LIE, upper: -90, fore: -90 }, { abd: { u: 102, fo: 92 } }),
        ], equip: both(({ P }) => E.bench(P.shoulder[0] - 34, P.hip[0] + 36, P.hip[1] - 12), dbs('x')), arrowRef: 'wrist' },
    
      { id: 'pec-ecart-inc', anchor: LIE_ANCHOR, floor: 230, opt: { stance: 18, grip: 22 }, iconCam: 'front', cams: { iso: { psi: 62, phi: 28 } },
        poses: [
          pose('Haltères au-dessus de la poitrine', { torso: -145, thigh: 5, shin: 100, foot: 0, upper: -90, fore: -90 }, { abd: { u: 5, fo: 5 } }),
          pose('Bras ouverts, coudes légèrement fléchis', { torso: -145, thigh: 5, shin: 100, foot: 0, upper: -90, fore: -90 }, { abd: { u: 102, fo: 92 } }),
        ], equip: both(inclined(30), dbs('x')), arrowRef: 'wrist' },
    
      // vis-à-vis : poulies hautes de chaque côté
      { id: 'pec-poulie-haute', anchor: STAND, floor: 230, opt: { stance: 14, grip: 24 }, iconCam: 'front', cams: { iso: { psi: 60, phi: 22 } },
        poses: [
          pose('Bras ouverts', { torso: -82, thigh: 92, shin: 88, foot: 0, upper: -20, fore: -10 }, { abd: { u: 66, fo: 58 } }),
          pose('Mains jointes devant', { torso: -78, thigh: 92, shin: 88, foot: 0, upper: 58, fore: 40 }, { abd: { u: 8, fo: 4 } }),
        ],
        equip: ({ S: sd }) => {
          const out = [];
          for (const s of [-1, 1]) {
            const w = sd[s].wrist, top = [0, 205, s * 78];
            out.push(...E.post(0, 205, { z: s * 82 }), ...E.pulley(top), ...E.cable(top, w), ...E.handle(w, 4));
          }
          out.push(mk.line([0, 208, -82], [0, 208, 82], 4, C.metal, { back: true }));
          return out;
        }, arrowRef: 'wrist' },
    
      { id: 'pec-poulie-basse', anchor: STAND, floor: 230, opt: { stance: 14, grip: 24 }, iconCam: 'front', cams: { iso: { psi: 60, phi: 22 } },
        poses: [
          pose('Mains en bas, bras ouverts', { torso: -84, thigh: 92, shin: 88, foot: 0, upper: 80, fore: 85 }, { abd: { u: 40, fo: 34 } }),
          pose('Mains jointes à hauteur de poitrine', { torso: -84, thigh: 92, shin: 88, foot: 0, upper: 25, fore: -45 }, { abd: { u: 14, fo: 6 } }),
        ],
        equip: ({ S: sd }) => {
          const out = [];
          for (const s of [-1, 1]) {
            const w = sd[s].wrist, low = [0, 12, s * 78];
            out.push(...E.post(0, 40, { z: s * 82 }), ...E.pulley(low), ...E.cable(low, w), ...E.handle(w, 4));
          }
          return out;
        }, arrowRef: 'wrist' },
    
      { id: 'pec-pec-deck', anchor: { x: ['hip', 100], y: ['hip', 184] }, floor: 230, opt: { stance: 10, grip: 20 }, iconCam: 'front', cams: { iso: { psi: 55, phi: 24 } },
        poses: [
          pose('Bras ouverts', { torso: -90, thigh: 3, shin: 90, foot: 0, upper: 0, fore: -80 }, { abd: { u: 80, fo: 22 } }),
          pose('Bras fermés devant la poitrine', { torso: -90, thigh: 3, shin: 90, foot: 0, upper: 0, fore: -80 }, { abd: { u: 14, fo: 0 } }),
        ],
        equip: ({ P, S: sd }) => {
          const out = [...E.seat(P.hip[0] - 26, P.hip[0] + 22, P.hip[1] - 6)];
          out.push(...slab([P.hip[0] - 20, P.hip[1] - 2], [P.hip[0] - 20, P.hip[1] + 86], 8, 17, BENCH, -39));
          out.push(...box(P.hip[0] - 40, P.hip[0] - 30, 0, 160, -6, 6, GREY, -46, true), ...box(P.hip[0] - 40, P.hip[0] + 40, 0, 6, -26, 26, GREY, -47));
          for (const s of [-1, 1]) { const w = sd[s].wrist; out.push(mk.line([w[0], w[1] - 22, w[2]], [w[0], w[1] + 16, w[2]], 7, '#c9d2de', { bias: 0.7 })); }
          return out;
        }, arrowRef: 'wrist' },
    
      { id: 'pec-pullover', anchor: LIE_ANCHOR, floor: 230, opt: { stance: 18, grip: 6 },
        poses: [
          pose('Haltère au-dessus de la poitrine', { ...LIE, upper: -90, fore: -90 }),
          pose('Haltère derrière la tête', { ...LIE, upper: -168, fore: -172 }),
        ],
        equip: both(({ P }) => E.bench(P.shoulder[0] - 40, P.hip[0] + 36, P.hip[1] - 12), ({ S: sd }) => E.dumbbell([sd[1].wrist[0], sd[1].wrist[1], 0])), arrowRef: 'wrist' },
    
      // ---------------------------------------------------------------- variantes de pompes
      { id: 'pec-pompes-inc', anchor: { x: ['wrist', 130], y: ['wrist', 226] }, floor: 230, opt: { stance: 2, grip: 22, flare: 8 }, cams: { iso: { psi: 62, phi: 32 } },
        poses: [
          pose('Bras tendus, pieds en hauteur', { foot: 80, upper: 90, fore: 90 }, { ground: ['wrist', 'toe', -38] }),
          pose('Poitrine près du sol', { foot: 80, upper: 128, fore: 62 }, { ground: ['wrist', 'toe', -38] }),
        ],
        equip: both(() => NOMAT(-135, 50), ({ P }) => E.crate(P.toe[0] - 26, P.toe[0] + 38, 36, 22)), arrowRef: 'shoulder', icon: 0 },
    
      { id: 'pec-pompes-dec', anchor: { x: ['wrist', 130], y: ['wrist', 188] }, floor: 230, opt: { stance: 2, grip: 22, flare: 8 }, cams: { iso: { psi: 62, phi: 32 } },
        poses: [
          pose('Bras tendus, mains en hauteur', { foot: 80, upper: 90, fore: 90 }, { ground: ['wrist', 'toe', 38] }),
          pose('Poitrine près du banc', { foot: 80, upper: 128, fore: 62 }, { ground: ['wrist', 'toe', 38] }),
        ],
        equip: both(() => NOMAT(-135, 45), ({ P }) => E.crate(P.wrist[0] - 24, P.wrist[0] + 26, 34, 22)), arrowRef: 'shoulder', icon: 0 },
    
      { id: 'pec-pompes-dia', anchor: { x: ['wrist', 130], y: ['wrist', 226] }, floor: 230, opt: { stance: 2, grip: 5, flare: 0 }, cams: { iso: { psi: 62, phi: 32 } },
        poses: [
          pose('Bras tendus, mains en diamant', { foot: 80, upper: 90, fore: 90 }, { ground: ['wrist', 'toe'] }),
          pose('Poitrine sur les mains', { foot: 80, upper: 128, fore: 62 }, { ground: ['wrist', 'toe'] }),
        ], equip: () => NOMAT(-135, 45), arrowRef: 'shoulder', icon: 0 },
    
      { id: 'pec-pompes-lest', anchor: { x: ['wrist', 130], y: ['wrist', 226] }, floor: 230, opt: { stance: 2, grip: 22, flare: 8 }, cams: { iso: { psi: 62, phi: 32 } },
        poses: [
          pose('Bras tendus, disque sur le dos', { foot: 80, upper: 90, fore: 90 }, { ground: ['wrist', 'toe'] }),
          pose('Poitrine près du sol', { foot: 80, upper: 128, fore: 62 }, { ground: ['wrist', 'toe'] }),
        ],
        equip: both(() => NOMAT(-135, 45), ({ P }) => E.flatDisc([P.hip[0] + (P.shoulder[0] - P.hip[0]) * 0.55, P.hip[1] + (P.shoulder[1] - P.hip[1]) * 0.55 + 9, 0], 19)), arrowRef: 'shoulder', icon: 0 },
    
      // ---------------------------------------------------------------- dips orientés pectoraux (buste penché)
      { id: 'pec-dips-pec', anchor: { x: ['wrist', 120], y: ['wrist', 120] }, floor: 230, opt: { stance: 4, grip: 24 }, cams: { iso: { psi: 50, phi: 32 } },
        poses: [
          pose('Bras tendus, buste penché', { torso: -62, thigh: 100, shin: 150, foot: 90, upper: 90, fore: 90 }),
          pose('Coudes fléchis, buste penché', { torso: -46, thigh: 105, shin: 155, foot: 90, upper: 130, fore: 50 }),
        ], equip: ({ P }) => E.parallelBars(P.wrist[0], P.wrist[1], 80, 24), arrowRef: 'shoulder' },
    
      { id: 'pec-dips-pec-lest', anchor: { x: ['wrist', 120], y: ['wrist', 120] }, floor: 230, opt: { stance: 4, grip: 24 }, cams: { iso: { psi: 50, phi: 32 } },
        poses: [
          pose('Bras tendus, ceinture lestée', { torso: -62, thigh: 100, shin: 150, foot: 90, upper: 90, fore: 90 }),
          pose('Coudes fléchis, ceinture lestée', { torso: -46, thigh: 105, shin: 155, foot: 90, upper: 130, fore: 50 }),
        ],
        equip: both(({ P }) => E.parallelBars(P.wrist[0], P.wrist[1], 80, 24),
          ({ P }) => [...E.cable([P.hip[0], P.hip[1] - 2, 0], [P.hip[0] + 6, P.hip[1] - 30, 0], 2), ...E.plateHeld([P.hip[0] + 6, P.hip[1] - 44, 0], 15)]), arrowRef: 'shoulder' },
    ];
    
    module.exports = { EXERCISES };
    
  });

  __def("dos", function (module, require) {
    // Dos (hors rowing barre, rowing haltère, soulevé de terre, tractions pronation et tirage prise large, dans base.js)
    const { E, box, slab, GREY, BENCH, mk, C, STAND, UP, bar, dbs, both, pose, pulldown } = require('./common');
    
    // ---- rowings -----------------------------------------------------------------------------------------
    const BENT = { torso: -35, thigh: 55, shin: 105, foot: 0, head: -45 };
    function ringFlat(x, y, R) { const pts = []; for (let i = 0; i < 28; i++) { const t = i / 28 * Math.PI * 2; pts.push([x + R * Math.cos(t), y + R * Math.sin(t), 0]); } return pts; }
    
    // ---- tractions : même mouvement, prise et accessoires différents -----------------------------------
    const pullup = (grip, half, equip, a1 = {}, a2 = {}, extra = {}) => ({
      anchor: { x: ['wrist', 118], y: ['wrist', 50] }, floor: 270, opt: { stance: 6, grip }, iconCam: 'front',
      poses: [
        pose('Suspendu, bras tendus', { torso: -90, thigh: 92, shin: 98, foot: 60, upper: -90, fore: -90, ...a1 }),
        pose('Menton au-dessus de la barre', { torso: -95, thigh: 100, shin: 108, foot: 60, upper: 80, fore: -80, head: -95, ...a2 }),
      ], equip: equip || (({ P }) => E.pullupBar(P.wrist[0], P.wrist[1], half)), arrowRef: 'hip', ...extra,
    });
    const beltPlate = ({ P }) => [...E.cable([P.hip[0], P.hip[1] - 2, 0], [P.hip[0] + 4, P.hip[1] - 30, 0], 2), ...E.plateHeld([P.hip[0] + 4, P.hip[1] - 44, 0], 15)];
    
    const EXERCISES = [
      { id: 'dos-rowing-tbar', anchor: STAND, floor: 230, opt: { stance: 16, grip: 10 },
        poses: [pose('Bras tendus', { ...BENT, upper: 90, fore: 90 }), pose('Poignée au ventre', { ...BENT, upper: 150, fore: 80 })],
        equip: ({ P }) => [mk.poly(ringFlat(-6, 24, 21), 'rgba(155,166,179,.22)', C.metal, { sw: 2.5, back: true }), mk.line([P.wrist[0], P.wrist[1], 0], [-6, 24, 0], 4, C.metal, { bias: 0.2 }), ...E.handle([P.wrist[0], P.wrist[1], 0], 9)],
        arrowRef: 'wrist' },
    
      { id: 'dos-rowing-yates', anchor: STAND, floor: 230, opt: { stance: 8, grip: 24 },
        poses: [
          pose('Bras tendus, buste redressé', { torso: -58, thigh: 62, shin: 100, foot: 0, upper: 90, fore: 90, head: -66 }),
          pose('Barre au nombril', { torso: -58, thigh: 62, shin: 100, foot: 0, upper: 138, fore: 78, head: -66 }),
        ], equip: bar(60), arrowRef: 'wrist' },
    
      { id: 'dos-rowing-machine', anchor: { x: ['hip', 100], y: ['hip', 184] }, floor: 230, opt: { stance: 10, grip: 16 },
        poses: [
          pose('Bras tendus', { torso: -84, thigh: 4, shin: 90, foot: 0, upper: 8, fore: 8 }),
          pose('Coudes en arrière', { torso: -88, thigh: 4, shin: 90, foot: 0, upper: 170, fore: 10 }),
        ],
        equip: ({ P, S: sd }) => {
          const out = [...E.seat(P.hip[0] - 24, P.hip[0] + 20, P.hip[1] - 6)], w = sd[1].wrist, px = P.hip[0] + 92;
          out.push(...slab([P.shoulder[0] + 12, P.shoulder[1] - 34], [P.shoulder[0] + 12, P.shoulder[1] + 16], 8, 17, BENCH, -39));
          out.push(...box(px - 4, px + 4, 0, 130, -5, 5, GREY, -46, true), ...box(P.hip[0] - 36, px + 14, 0, 6, -28, 28, GREY, -47));
          for (const s of [-1, 1]) out.push(...E.cable([px, w[1], s * 12], [w[0], w[1], sd[s].wrist[2]], 3));
          return out;
        }, arrowRef: 'wrist' },
    
      { id: 'dos-tirage-h', anchor: { x: ['ankle', 100], y: ['ankle', 224] }, floor: 230, opt: { stance: 12, grip: 8 },
        poses: [
          pose('Buste incliné, bras tendus', { torso: -66, thigh: -10, shin: 80, foot: 0, upper: 6, fore: 4 }),
          pose('Poignée au ventre', { torso: -92, thigh: -10, shin: 80, foot: 0, upper: 168, fore: 8 }),
        ],
        equip: ({ P, S: sd }) => {
          const w = sd[1].wrist, out = [...E.seat(P.hip[0] - 24, P.hip[0] + 14, P.hip[1] - 8)], px = P.toe[0] + 38;
          out.push(...box(P.toe[0] + 2, P.toe[0] + 8, 0, 46, -22, 22, GREY, -44), ...box(P.hip[0] - 36, px + 12, 0, 5, -24, 24, GREY, -47));
          out.push(...E.pulley([px, 26, 0]), ...E.cable([px, 26, 0], [w[0], w[1], 0], 3), ...E.handle([w[0], w[1], 0], 7));
          return out;
        }, arrowRef: 'wrist' },
    
      // tirage vertical : prise serrée / supination / neutre = même geste, écartement des mains
      { id: 'dos-tirage-v-serre', anchor: { x: ['hip', 120], y: ['hip', 184] }, floor: 230, opt: { stance: 10, grip: 12, flare: 2 },
        poses: [
          pose('Bras tendus', { torso: -96, thigh: 4, shin: 90, foot: 0, upper: -78, fore: -82 }),
          pose('Poignée au sternum', { torso: -108, thigh: 4, shin: 90, foot: 0, upper: 100, fore: -62 }),
        ], equip: pulldown(18), arrowRef: 'wrist' },
      { id: 'dos-tirage-v-sup', anchor: { x: ['hip', 120], y: ['hip', 184] }, floor: 230, opt: { stance: 10, grip: 14, flare: 2 },
        poses: [
          pose('Bras tendus', { torso: -96, thigh: 4, shin: 90, foot: 0, upper: -78, fore: -82 }),
          pose('Barre au menton', { torso: -106, thigh: 4, shin: 90, foot: 0, upper: 100, fore: -62 }),
        ], equip: pulldown(26), arrowRef: 'wrist' },
      { id: 'dos-tirage-v-neutre', anchor: { x: ['hip', 120], y: ['hip', 184] }, floor: 230, opt: { stance: 10, grip: 12, flare: 2 },
        poses: [
          pose('Bras tendus', { torso: -96, thigh: 4, shin: 90, foot: 0, upper: -78, fore: -82 }),
          pose('Poignée au sternum', { torso: -108, thigh: 4, shin: 90, foot: 0, upper: 98, fore: -62 }),
        ], equip: pulldown(14), arrowRef: 'wrist' },
    
      // ---- soulevés de terre ----------------------------------------------------------------------------
      { id: 'dos-sdt-sumo', anchor: STAND, floor: 230, opt: { stance: 36, grip: 10 },
        poses: [
          pose('Départ, jambes écartées', { torso: -52, thigh: 22, shin: 100, foot: 0, upper: 92, fore: 92, head: -62 }),
          pose('Mi-course', { torso: -68, thigh: 55, shin: 96, foot: 0, upper: 92, fore: 92, head: -76 }),
          pose('Verrouillé', { ...UP, upper: 88, fore: 88 }),
        ], equip: bar(64), arrowRef: 'wrist' },
    
      { id: 'dos-sdt-roumain', anchor: STAND, floor: 230, opt: { stance: 8, grip: 24 },
        poses: [
          pose('Debout, barre aux cuisses', { ...UP, upper: 94, fore: 92 }),
          pose('Hanches en arrière, barre sous les genoux', { torso: -25, thigh: 76, shin: 93, foot: 0, upper: 96, fore: 94, head: -38 }),
        ], equip: bar(62), arrowRef: 'wrist' },
    
      { id: 'dos-sdt-jt', anchor: STAND, floor: 230, opt: { stance: 8, grip: 24 },
        poses: [
          pose('Debout, barre aux cuisses', { ...UP, upper: 94, fore: 92 }),
          pose('Buste penché, jambes tendues', { torso: -16, thigh: 84, shin: 91, foot: 0, upper: 98, fore: 96, head: -30 }),
        ], equip: bar(62), arrowRef: 'wrist' },
    
      { id: 'dos-sdt-trap', anchor: STAND, floor: 230, opt: { stance: 10, grip: 24 },
        poses: [
          pose('Départ', { torso: -62, thigh: 32, shin: 100, foot: 0, upper: 92, fore: 92, head: -70 }),
          pose('Mi-course', { torso: -75, thigh: 62, shin: 95, foot: 0, upper: 92, fore: 92, head: -82 }),
          pose('Verrouillé', { ...UP, upper: 90, fore: 90 }),
        ], equip: ({ P }) => E.trapbar([P.wrist[0], P.wrist[1]]), arrowRef: 'wrist' },
    
      // ---- trapèzes : haussement d'épaules -----------------------------------------------------------------
      { id: 'dos-shrugs-barre', anchor: STAND, floor: 230, opt: { stance: 8, grip: 24 },
        poses: [pose('Épaules basses', { ...UP, upper: 92, fore: 92 }), pose('Épaules montées', { ...UP, upper: 92, fore: 92 }, { shr: 10 })],
        equip: bar(60), arrowRef: 'shoulder' },
      { id: 'dos-shrugs-halt', anchor: STAND, floor: 230, opt: { stance: 8, grip: 22 },
        poses: [pose('Épaules basses', { ...UP, upper: 92, fore: 92 }), pose('Épaules montées', { ...UP, upper: 92, fore: 92 }, { shr: 10 })],
        equip: dbs('x'), arrowRef: 'shoulder' },
    
      { id: 'dos-pullover-p', anchor: STAND, floor: 230, opt: { stance: 10, grip: 20 },
        poses: [
          pose('Bras tendus au-dessus de la tête', { torso: -82, thigh: 92, shin: 88, foot: 0, upper: -48, fore: -48 }),
          pose('Barre aux cuisses', { torso: -76, thigh: 92, shin: 88, foot: 0, upper: 80, fore: 80 }),
        ],
        equip: ({ S: sd }) => {
          const w = sd[1].wrist, out = [...E.post(58, 214), ...box(26, 62, 208, 214, -4, 4, GREY, -29, true)];
          out.push(...E.pulley([26, 211, 0]), ...E.cable([26, 211, 0], [w[0], w[1], 0], 3), ...E.handle([w[0], w[1], 0], 20));
          return out;
        }, arrowRef: 'wrist' },
    
      // ---- tractions et variantes ---------------------------------------------------------------------
      { id: 'dos-tractions-sup', ...pullup(16, 50) },
      { id: 'dos-tractions-neutre', ...pullup(14, 50) },
      { id: 'dos-tractions-large', ...pullup(46, 72) },
      { id: 'dos-tractions-lest', ...pullup(26, 60, ({ P }) => [...E.pullupBar(P.wrist[0], P.wrist[1], 60), ...beltPlate({ P })]) },
      { id: 'dos-tractions-ass', ...pullup(26, 60, ({ P }) => [
        ...E.pullupBar(P.wrist[0], P.wrist[1], 60), ...E.crate(P.knee[0] - 18, P.knee[0] + 18, Math.max(8, P.knee[1] - 5), 17),
        ...box(P.hip[0] - 78, P.hip[0] - 54, 0, 150, -16, 16, GREY, -46, true)],
        { thigh: 90, shin: 168, foot: 0 }, { thigh: 94, shin: 168, foot: 0 }) },
      { id: 'dos-tirage-v-ass', anchor: { x: ['hip', 120], y: ['hip', 184] }, floor: 230, opt: { stance: 10, grip: 30, flare: 4 },
        poses: [
          pose('Bras tendus', { torso: -96, thigh: 4, shin: 90, foot: 0, upper: -78, fore: -82 }),
          pose('Barre au sternum', { torso: -108, thigh: 4, shin: 90, foot: 0, upper: 105, fore: -62 }),
        ], equip: pulldown(38, { stack: true }), arrowRef: 'wrist' },
    
      { id: 'dos-rowing-aus', anchor: { x: ['wrist', 100], y: ['wrist', 135] }, floor: 230, opt: { stance: 6, grip: 24 }, cams: { iso: { psi: 55, phi: 30 } },
        poses: [
          pose('Bras tendus sous la barre', { foot: -70, upper: -90, fore: -90 }, { ground: ['wrist', 'ankle', 89], range: [-179, -130] }),
          pose('Poitrine à la barre', { foot: -70, upper: 112, fore: -65 }, { ground: ['wrist', 'ankle', 89], range: [-179, -130] }),
        ],
        equip: ({ P }) => E.pullupBar(P.wrist[0], P.wrist[1], 54), arrowRef: 'shoulder' },
    
      // ---- lombaires -----------------------------------------------------------------------------------
      { id: 'dos-hyperext', anchor: { x: ['hip', 100], y: ['hip', 150] }, floor: 230, opt: { stance: 4, grip: 14 }, cams: { iso: { psi: 50, phi: 30 } },
        poses: [
          pose('Buste incliné vers le sol', { torso: 66, thigh: 160, shin: 160, foot: 100, upper: 55, fore: -140 }, { hip: [100, 150] }),
          pose('Corps en ligne', { torso: -20, thigh: 160, shin: 160, foot: 100, upper: 50, fore: 150 }, { hip: [100, 150] }),
        ],
        equip: () => {
          const out = [...slab([-108, 31], [24, 77], 9, 17, BENCH, -40)];
          out.push(...box(-100, -92, 0, 28, -16, 16, BENCH, -45), ...box(14, 22, 0, 66, -16, 16, BENCH, -45));
          for (const s of [-1, 1]) out.push(mk.circle([-80, 42, s * 18], 5, '#3a4350', C.metal, { sw: 2, bias: 0.3 }));
          return out;
        }, arrowRef: 'shoulder' },
    
      { id: 'dos-hyperext-lest', anchor: { x: ['hip', 100], y: ['hip', 150] }, floor: 230, opt: { stance: 4, grip: 12 }, cams: { iso: { psi: 50, phi: 30 } },
        poses: [
          pose('Buste incliné, disque contre la poitrine', { torso: 66, thigh: 160, shin: 160, foot: 100, upper: 62, fore: -140 }, { hip: [100, 150] }),
          pose('Corps en ligne', { torso: -20, thigh: 160, shin: 160, foot: 100, upper: 50, fore: 150 }, { hip: [100, 150] }),
        ],
        equip: ({ S: sd }) => {
          const out = [...slab([-108, 31], [24, 77], 9, 17, BENCH, -40)];
          out.push(...box(-100, -92, 0, 28, -16, 16, BENCH, -45), ...box(14, 22, 0, 66, -16, 16, BENCH, -45));
          for (const s of [-1, 1]) out.push(mk.circle([-80, 42, s * 18], 5, '#3a4350', C.metal, { sw: 2, bias: 0.3 }));
          out.push(...E.plateHeld([sd[1].wrist[0], sd[1].wrist[1], 0], 14));
          return out;
        }, arrowRef: 'shoulder' },
    ];
    
    module.exports = { EXERCISES };
    
  });

  __def("abdos", function (module, require) {
    // Abdos (hors gainage frontal, crunch et relevé de jambes suspendu, dans base.js)
    const { E, box, slab, GREY, BENCH, mk, C, STAND, UP, bar, dbs, both, pose } = require('./common');
    
    const FLOOR_HIP = { x: ['hip', 150], y: ['hip', 220] };           // allongé sur le dos, hanche à 10 du sol
    const KNEEL = { x: ['knee', 100], y: ['knee', 226] };              // à genoux
    const THREE = { cams: { iso: { psi: 55, phi: 30 } } };
    const highPulley = (x = 34, h = 215) => [...E.post(x + 24, h + 6), ...box(x - 8, x + 28, h, h + 6, -4, 4, GREY, -29, true), ...E.pulley([x, h + 3, 0])];
    const mid = (sd) => [(sd[1].wrist[0] + sd[-1].wrist[0]) / 2, (sd[1].wrist[1] + sd[-1].wrist[1]) / 2, (sd[1].wrist[2] + sd[-1].wrist[2]) / 2];
    
    const EXERCISES = [
      // corps couché sur le côté : roulis de 90°, bras le long de l'axe z puis tournés à la verticale
      { id: 'ab-side-plank', anchor: { x: ['hip', 150], y: ['hip', 200] }, floor: 230, opt: { stance: 2, grip: 16 }, ...THREE,
        poses: [pose('Maintien sur l\'avant-bras', { torso: -9, thigh: 171, shin: 171, foot: 90, upper: 90, fore: 0 },
          { roll: 90, rest: true, abd: { n: 90, f: 90, nf: 0 }, ground: ['elbow', 'toe'], range: [-30, 5] })],
        equip: () => [] },
    
      { id: 'ab-hollow', anchor: FLOOR_HIP, floor: 230, opt: { stance: 3, grip: 14 }, ...THREE,
        poses: [pose('Corps en arc : épaules et jambes décollées', { torso: -166, thigh: -14, shin: -14, foot: -20, upper: -166, fore: -166, head: -160 }, { hip: [150, 220] })],
        equip: () => [] },
    
      { id: 'ab-crunch-inv', anchor: FLOOR_HIP, floor: 230, opt: { stance: 6, grip: 14 }, ...THREE,
        poses: [
          pose('Allongé, genoux au-dessus des hanches', { torso: 180, thigh: -90, shin: 2, foot: 0, upper: 12, fore: 8, head: 180 }, { hip: [150, 220] }),
          pose('Bassin décollé vers la poitrine', { torso: 168, thigh: -108, shin: -14, foot: 0, upper: 12, fore: 8, head: 170 }, { hip: [150, 208] }),
        ], equip: () => [], arrowRef: 'knee' },
    
      { id: 'ab-leg-raise', anchor: FLOOR_HIP, floor: 230, opt: { stance: 3, grip: 14 }, ...THREE,
        poses: [
          pose('Allongé, jambes tendues près du sol', { torso: 180, thigh: -7, shin: -7, foot: -10, upper: 14, fore: 8, head: 180 }, { hip: [150, 220] }),
          pose('Jambes à la verticale', { torso: 180, thigh: -88, shin: -88, foot: -90, upper: 14, fore: 8, head: 180 }, { hip: [150, 220] }),
        ], equip: () => [], arrowRef: 'ankle' },
    
      { id: 'ab-russian', anchor: { x: ['hip', 140], y: ['hip', 208] }, floor: 230, opt: { stance: 4, grip: 10 }, ...THREE, iconCam: 'three',
        poses: [
          pose('Assis en V, mains vers la droite', { torso: -122, thigh: -40, shin: 28, foot: 0, upper: 4, fore: 4, head: -118 }, { hip: [140, 208], abd: { n: 58, f: -58 } }),
          pose('Rotation, mains vers la gauche', { torso: -122, thigh: -40, shin: 28, foot: 0, upper: 4, fore: 4, head: -118 }, { hip: [140, 208], abd: { n: -58, f: 58 } }),
        ], equip: () => [], arrowRef: 'wrist' },
    
      { id: 'ab-russian-lest', anchor: { x: ['hip', 140], y: ['hip', 208] }, floor: 230, opt: { stance: 4, grip: 10 }, ...THREE, iconCam: 'three',
        poses: [
          pose('Assis en V, disque vers la droite', { torso: -122, thigh: -40, shin: 28, foot: 0, upper: 4, fore: 4, head: -118 }, { hip: [140, 208], abd: { n: 58, f: -58 } }),
          pose('Rotation, disque vers la gauche', { torso: -122, thigh: -40, shin: 28, foot: 0, upper: 4, fore: 4, head: -118 }, { hip: [140, 208], abd: { n: -58, f: 58 } }),
        ], equip: ({ S: sd }) => E.plateHeld(mid(sd), 14), arrowRef: 'wrist' },
    
      // mountain climbers : position de pompe, un genou ramené vers la poitrine puis l'autre
      { id: 'ab-mountain', anchor: { x: ['wrist', 130], y: ['wrist', 226] }, floor: 230, opt: { stance: 6, grip: 22, flare: 4 }, ...THREE,
        poses: [
          pose('Jambe proche tendue, genou éloigné ramené', { foot: 80, upper: 90, fore: 90 }, { ground: ['wrist', 'toe'], f: { thigh: 6, shin: 112, foot: 20 } }),
          pose('Jambe éloignée tendue, genou proche ramené', { foot: 80, upper: 90, fore: 90 }, { ground: ['wrist', 'f.toe'], n: { thigh: 6, shin: 112, foot: 20 } }),
        ], equip: () => [], arrowRef: 'knee', icon: 0 },
    
      { id: 'ab-wheel', anchor: KNEEL, floor: 230, opt: { stance: 8, grip: 10 },
        poses: [
          pose('À genoux, roue sous les épaules', { torso: -38, thigh: 90, shin: 180, foot: 180, upper: 88, fore: 90, head: -48 }),
          pose('Corps allongé vers l\'avant', { torso: -8, thigh: 90, shin: 180, foot: 180, upper: 38, fore: 34, head: -18 }),
        ], equip: ({ S: sd }) => [...E.crate(-16, 16, 3, 17), ...E.wheel([sd[1].wrist[0], 24, 0])], arrowRef: 'wrist' },
    
      // dragon flag : épaules sur le banc, corps en ligne qui pivote autour des épaules
      { id: 'ab-dragon', anchor: { x: ['shoulder', 100], y: ['shoulder', 196] }, floor: 230, opt: { stance: 3, grip: 14 },
        poses: [
          pose('Corps à la verticale', { torso: 96, thigh: -84, shin: -84, foot: -84, upper: -140, fore: -160, head: 96 }),
          pose('Corps tendu en ligne, descente', { torso: 150, thigh: -30, shin: -30, foot: -30, upper: -140, fore: -160, head: 150 }),
        ], equip: ({ P }) => E.bench(P.shoulder[0] - 44, P.shoulder[0] + 18, P.shoulder[1] - 9), arrowRef: 'ankle' },
    
      { id: 'ab-crunch-poulie', anchor: KNEEL, floor: 230, opt: { stance: 8, grip: 8 },
        poses: [
          pose('À genoux, corde derrière la tête', { torso: -80, thigh: 90, shin: 180, foot: 180, upper: -40, fore: 150, head: -86 }),
          pose('Buste enroulé vers les cuisses', { torso: -28, thigh: 90, shin: 180, foot: 180, upper: 12, fore: -158, head: -20 }),
        ],
        equip: ({ S: sd }) => {
          const w = sd[1].wrist, out = [...E.crate(-16, 16, 3, 17), ...highPulley(30, 215)];
          out.push(...E.cable([30, 218, 0], [w[0], w[1], 0], 2.2), ...E.rope([w[0], w[1], 0]));
          return out;
        }, arrowRef: 'shoulder' },
    
      { id: 'ab-side-bend', anchor: STAND, floor: 230, opt: { stance: 8, grip: 20 }, iconCam: 'front', cams: { iso: { psi: 62, phi: 25 } },
        poses: [
          pose('Debout, haltère le long de la jambe', { ...UP, upper: 92, fore: 92 }),
          pose('Inclinaison latérale', { ...UP, upper: 92, fore: 92 }, { lean: 24 }),
        ], equip: ({ S: sd }) => E.dumbbell(sd[1].wrist), arrowRef: 'shoulder' },
    
      { id: 'ab-wood-chop', anchor: STAND, floor: 230, opt: { stance: 16, grip: 10 }, iconCam: 'three', ...THREE,
        poses: [
          pose('En haut, du côté de la poulie', { torso: -88, thigh: 90, shin: 90, foot: 0, upper: -48, fore: -48 }, { abd: { n: -42, f: 42 } }),
          pose('En bas, du côté opposé', { torso: -84, thigh: 90, shin: 90, foot: 0, upper: 56, fore: 56 }, { abd: { n: 42, f: -42 } }),
        ],
        equip: ({ S: sd }) => {
          const m = mid(sd), pul = [0, 206, -76];
          return [...E.post(0, 206, { z: -80 }), ...E.pulley(pul), ...E.cable(pul, m, 2.2), ...E.rope(m)];
        }, arrowRef: 'wrist' },
    
      { id: 'ab-pallof', anchor: STAND, floor: 230, opt: { stance: 16, grip: 8 }, iconCam: 'three', cams: { iso: { psi: 50, phi: 22 } },
        poses: [
          pose('Mains contre la poitrine', { torso: -90, thigh: 90, shin: 90, foot: 0, upper: 74, fore: -78 }),
          pose('Bras tendus devant soi', { torso: -90, thigh: 90, shin: 90, foot: 0, upper: 2, fore: 2 }),
        ],
        equip: ({ S: sd }) => {
          const m = mid(sd), pul = [8, 150, -84];
          return [...E.post(8, 156, { z: -88 }), ...E.pulley(pul), ...E.cable(pul, m, 2.2), ...E.handle(m, 6)];
        }, arrowRef: 'wrist' },
    
      { id: 'ab-toes-bar', anchor: { x: ['wrist', 118], y: ['wrist', 50] }, floor: 270, opt: { stance: 4, grip: 26 },
        poses: [
          pose('Suspendu', { torso: -90, thigh: 92, shin: 92, foot: 60, upper: -90, fore: -90 }),
          pose('Pieds à la barre', { torso: -80, thigh: -72, shin: -78, foot: -80, upper: -90, fore: -90 }),
        ], equip: ({ P }) => E.pullupBar(P.wrist[0], P.wrist[1], 60), arrowRef: 'ankle' },
    
      { id: 'ab-deadbug', anchor: FLOOR_HIP, floor: 230, opt: { stance: 8, grip: 20 }, ...THREE, iconCam: 'three',
        poses: [
          pose('Bras éloigné et jambe proche tendus', { torso: 180, head: 180 }, { hip: [150, 220],
            n: { upper: -90, fore: -90, thigh: -7, shin: -7, foot: -10 }, f: { upper: -172, fore: -172, thigh: -90, shin: 2, foot: 0 } }),
          pose('Bras proche et jambe éloignée tendus', { torso: 180, head: 180 }, { hip: [150, 220],
            n: { upper: -172, fore: -172, thigh: -90, shin: 2, foot: 0 }, f: { upper: -90, fore: -90, thigh: -7, shin: -7, foot: -10 } }),
        ], equip: () => [], arrowRef: 'wrist' },
    ];
    
    module.exports = { EXERCISES };
    
  });

  __def("calli", function (module, require) {
    // Callisthénie (hors L-sit, dans base.js)
    const { E, box, slab, GREY, BENCH, mk, C, STAND, UP, bar, dbs, both, pose } = require('./common');
    
    const HANG = { x: ['wrist', 118], y: ['wrist', 50] };            // suspendu à la barre, sol à y = 270
    const FLOORED = { x: ['wrist', 150], y: ['wrist', 226] };        // mains au sol
    const BARBELL = ({ P }) => E.pullupBar(P.wrist[0], P.wrist[1], 58);
    const NOEQ = () => [];
    
    // levier / planche : corps horizontal, bras verticaux
    const hold = (anchor, floor, opt, a, extra, equip, more = {}) => ({ anchor, floor, opt, poses: [pose('Maintien', a, extra)], equip, ...more });
    const FL = (thigh, shin, extra = {}, more = {}) => hold(HANG, 270, { stance: 4, grip: 22 }, { torso: 180, thigh, shin, foot: 0, upper: -90, fore: -90, head: 180 }, extra, BARBELL, more);
    const BL = (thigh, shin, extra = {}) => hold(HANG, 270, { stance: 4, grip: 22 }, { torso: 0, thigh, shin, foot: 180, upper: -90, fore: -90, head: 0 }, extra, BARBELL);
    const PL = (thigh, shin, extra = {}, more = {}) => hold(FLOORED, 230, { stance: 5, grip: 20, flare: 4 }, { torso: 0, thigh, shin, foot: 180, upper: 90, fore: 90, head: 0 }, extra, NOEQ, more);
    const FLAG = (thigh, shin) => hold({ x: ['shoulder', 100], y: ['shoulder', 130] }, 230, { stance: 2, grip: 12 },
      { torso: 0, thigh, shin, foot: 180, upper: 90, fore: 90, head: 0 }, { roll: 90, abd: { n: 90, f: 90 } }, ({ P }) => E.post(P.shoulder[0], 255, { w: 4 }));
    
    const EXERCISES = [
      { id: 'cal-mu-barre', anchor: HANG, floor: 270, opt: { stance: 6, grip: 26 }, icon: 2,
        poses: [
          pose('Suspendu', { torso: -90, thigh: 92, shin: 98, foot: 60, upper: -90, fore: -90 }),
          pose('Traction explosive, poitrine à la barre', { torso: -106, thigh: 100, shin: 116, foot: 60, upper: 70, fore: -85, head: -108 }),
          pose('Au-dessus de la barre, bras tendus', { torso: -84, thigh: 100, shin: 150, foot: 90, upper: 90, fore: 90 }),
        ], equip: BARBELL, arrowRef: 'hip' },
    
      { id: 'cal-mu-anneaux', anchor: HANG, floor: 270, opt: { stance: 6, grip: 22 }, icon: 2,
        poses: [
          pose('Suspendu aux anneaux', { torso: -90, thigh: 92, shin: 98, foot: 60, upper: -90, fore: -90 }),
          pose('Traction explosive, poitrine aux anneaux', { torso: -106, thigh: 100, shin: 116, foot: 60, upper: 70, fore: -85, head: -108 }),
          pose('Soutien au-dessus des anneaux', { torso: -84, thigh: 100, shin: 150, foot: 90, upper: 90, fore: 90 }),
        ], equip: ({ P }) => E.rings(P.wrist[0], P.wrist[1], 22, 262), arrowRef: 'hip' },
    
      { id: 'cal-fl-tuck', ...FL(-148, 38) },
      { id: 'cal-fl-adv-tuck', ...FL(-94, 4) },
      { id: 'cal-fl-straddle', ...FL(0, 0, { lsp: { a: 38 } }, { iconCam: 'front', cams: { iso: { psi: 70, phi: 24 } } }) },
      { id: 'cal-fl-full', ...FL(0, 0) },
      { id: 'cal-bl-tuck', ...BL(50, -150) },
      { id: 'cal-bl-full', ...BL(180, 180) },
    
      { id: 'cal-planche-tuck', ...PL(40, -155) },
      { id: 'cal-planche-straddle', ...PL(180, 180, { lsp: { a: 40 } }, { iconCam: 'three', cams: { iso: { psi: 70, phi: 24 } } }) },
      { id: 'cal-planche-full', ...PL(180, 180) },
    
      { id: 'cal-pseudo-planche-pompe', anchor: FLOORED, floor: 230, opt: { stance: 4, grip: 20, flare: 6 }, cams: { iso: { psi: 62, phi: 32 } },
        poses: [
          pose('Bras tendus, mains près des hanches', { foot: 80, upper: 104, fore: 106 }, { ground: ['wrist', 'toe'] }),
          pose('Poitrine vers le sol, épaules en avant', { foot: 80, upper: 140, fore: 66 }, { ground: ['wrist', 'toe'] }),
        ], equip: NOEQ, arrowRef: 'shoulder', icon: 0 },
    
      { id: 'cal-pistol', anchor: STAND, floor: 230, opt: { stance: 12, grip: 18 },
        poses: [
          pose('Sur une jambe, l\'autre tendue devant', { torso: -90, upper: 6, fore: 4 }, { n: { thigh: 90, shin: 90, foot: 0 }, f: { thigh: 4, shin: 2, foot: -70 } }),
          pose('Accroupi sur une jambe', { torso: -62, upper: 6, fore: 4 }, { n: { thigh: 8, shin: 108, foot: 0 }, f: { thigh: 3, shin: 1, foot: -70 } }),
        ], equip: NOEQ, arrowRef: 'hip' },
    
      { id: 'cal-pistol-assiste', anchor: STAND, floor: 230, opt: { stance: 12, grip: 8 },
        poses: [
          pose('Sur une jambe, mains aux sangles', { torso: -90, upper: -40, fore: -40 }, { n: { thigh: 90, shin: 90, foot: 0 }, f: { thigh: 4, shin: 2, foot: -70 } }),
          pose('Accroupi sur une jambe, aidé par les sangles', { torso: -66, upper: -30, fore: -26 }, { n: { thigh: 8, shin: 108, foot: 0 }, f: { thigh: 3, shin: 1, foot: -70 } }),
        ],
        equip: ({ S: sd }) => {
          const out = [mk.line([60, 252, -12], [60, 252, 12], 5, C.metal, { back: true }), ...E.post(60, 252, { w: 3 })];
          for (const s of [-1, 1]) { const w = sd[s].wrist; out.push(...E.cable([60, 250, s * 10], w, 2.4), ...E.handle(w, 3)); }
          return out;
        }, arrowRef: 'hip' },
    
      { id: 'cal-shrimp', anchor: STAND, floor: 230, opt: { stance: 12, grip: 18 },
        poses: [
          pose('Sur une jambe, pied arrière tenu', { torso: -88, upper: 8, fore: 4 }, { n: { thigh: 90, shin: 90, foot: 0 }, f: { thigh: 92, shin: -168, foot: 20 } }),
          pose('Bas, genou arrière près du sol', { torso: -66, foot: 0, upper: 8, fore: 4 }, { hip: [78, 186], ik: { n: { ankle: [100, 224] }, f: { ankle: [16, 192] } }, f: { foot: 30 } }),
        ], equip: NOEQ, arrowRef: 'hip' },
    
      { id: 'cal-vsit', anchor: { x: ['wrist', 90], y: ['wrist', 150] }, floor: 174, opt: { stance: 2, grip: 17 },
        poses: [pose('Maintien en V', { torso: -100, thigh: -42, shin: -42, foot: -50, upper: 90, fore: 90 })],
        equip: ({ P }) => E.blocks(P.wrist[0], P.wrist[1] - 4) },
    
      { id: 'cal-flag-tuck', ...FLAG(40, -155) },
      { id: 'cal-flag-full', ...FLAG(180, 180) },
    
      // tractions archer : un bras tire, l'autre reste tendu le long de la barre (vue de face)
      { id: 'cal-archer-traction', anchor: HANG, floor: 270, opt: { stance: 6, grip: 44 }, iconCam: 'front', cams: { iso: { psi: 62, phi: 24 } },
        poses: [
          pose('Suspendu, prise large', { torso: -90, thigh: 92, shin: 98, foot: 60, upper: -90, fore: -90 }),
          pose('Un bras tire, l\'autre reste tendu', { torso: -95, thigh: 100, shin: 108, foot: 60, upper: 80, fore: -80, head: -95 }, { abd: { f: 88, n: 0 } }),
        ], equip: ({ P }) => E.pullupBar(P.wrist[0], P.wrist[1], 96), arrowRef: 'hip' },
    
      { id: 'cal-archer-pompe', anchor: FLOORED, floor: 230, opt: { stance: 3, grip: 40, flare: 10 }, iconCam: 'three', cams: { iso: { psi: 62, phi: 30 } },
        poses: [
          pose('Bras tendus, mains écartées', { foot: 80, upper: 90, fore: 90 }, { ground: ['wrist', 'toe'] }),
          pose('Un bras fléchi, l\'autre tendu sur le côté', { foot: 80, upper: 128, fore: 62 }, { ground: ['wrist', 'toe'], abd: { f: 88, n: 0 } }),
        ], equip: NOEQ, arrowRef: 'shoulder', icon: 1 },
    
      { id: 'cal-oap-neg', anchor: FLOORED, floor: 230, opt: { stance: 18, grip: 22, flare: 2 }, cams: { iso: { psi: 62, phi: 30 } },
        poses: [
          pose('Un bras tendu, l\'autre derrière le dos', { foot: 80, upper: 90, fore: 90 }, { ground: ['wrist', 'toe'], f: { upper: 168, fore: 172 } }),
          pose('Descente lente sur un bras', { foot: 80, upper: 128, fore: 62 }, { ground: ['wrist', 'toe'], f: { upper: 168, fore: 172 } }),
        ], equip: NOEQ, arrowRef: 'shoulder', icon: 0 },
    
      { id: 'cal-skin-cat', anchor: HANG, floor: 270, opt: { stance: 6, grip: 26 },
        poses: [
          pose('Suspendu', { torso: -90, thigh: 92, shin: 98, foot: 60, upper: -90, fore: -90 }),
          pose('Jambes remontées entre les bras', { torso: -50, thigh: -118, shin: -80, foot: -60, upper: -90, fore: -90, head: -60 }),
          pose('Passage derrière la barre, épaules en arrière', { torso: -100, thigh: 96, shin: 98, foot: 60, upper: -128, fore: -128, head: -104 }),
        ], equip: BARBELL, arrowRef: 'hip' },
    
      { id: 'cal-hs-mur', anchor: { x: ['wrist', 110], y: ['wrist', 226] }, floor: 230, opt: { stance: 3, grip: 20, flare: 4 }, cams: { iso: { psi: 55, phi: 24 } },
        poses: [pose('Maintien contre le mur', { torso: 90, thigh: -90, shin: -90, foot: -10, upper: 90, fore: 90 })],
        equip: ({ P }) => E.wall(P.hip[0] + 16, 250) },
    
      { id: 'cal-hs-libre', anchor: { x: ['wrist', 110], y: ['wrist', 226] }, floor: 230, opt: { stance: 3, grip: 20, flare: 4 }, cams: { iso: { psi: 55, phi: 24 } },
        poses: [pose('Équilibre libre', { torso: 92, thigh: -94, shin: -92, foot: -10, upper: 90, fore: 90 })],
        equip: NOEQ },
    ];
    
    module.exports = { EXERCISES };
    
  });

  __def("jambes", function (module, require) {
    // Jambes : quadriceps, ischios / fessiers, mollets (hors squat barre dos, fentes haltères et hip thrust, dans base.js)
    const { E, box, slab, GREY, BENCH, MAT, mk, C, STAND, UP, LIE, LIE_ANCHOR, bar, dbs, both, pose } = require('./common');
    
    const SEAT = { x: ['hip', 100], y: ['hip', 184] };
    const SEATED = { thigh: 3, shin: 90, foot: 0 };
    const squatBar = ({ P }) => E.barbell([P.shoulder[0] - 3, P.shoulder[1] + 2], 64);
    const BACK_ARMS = { upper: 100, fore: -80 };                 // mains sur la barre, derrière la nuque
    const seatBack = ({ P }) => [
      ...E.seat(P.hip[0] - 24, P.hip[0] + 22, P.hip[1] - 6),
      ...slab([P.hip[0] - 18, P.hip[1] - 2], [P.hip[0] - 18 - 4, P.hip[1] + 88], 8, 17, BENCH, -39),
      ...box(P.hip[0] - 36, P.hip[0] - 28, 0, 150, -6, 6, GREY, -46, true), ...box(P.hip[0] - 40, P.hip[0] + 60, 0, 6, -26, 26, GREY, -47),
    ];
    const step = (h = 12) => ({ P }) => E.crate(P.toe[0] - 12, P.toe[0] + 16, h, 22);
    // plateau d'une presse : planche perpendiculaire à la direction de la jambe, centrée sur le bout du pied
    const legPlate = (P, len = 30) => {
      const dx = P.toe[0] - P.hip[0], dy = P.toe[1] - P.hip[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      return slab([P.toe[0] + 4 * dx / l - nx * len, P.toe[1] + 4 * dy / l - ny * len], [P.toe[0] + 4 * dx / l + nx * len, P.toe[1] + 4 * dy / l + ny * len], 7, 24, GREY, -35);
    };
    const roller = (c, half = 15) => [mk.line([c[0], c[1], -half], [c[0], c[1], half], 8, '#c9d2de', { bias: 0.7 })];
    
    const EXERCISES = [
      // ---------------------------------------------------------------- quadriceps
      { id: 'q-squat-front', anchor: STAND, floor: 230, opt: { stance: 14, grip: 26, flare: -4 },
        poses: [
          pose('Debout, barre sur les épaules', { torso: -88, thigh: 92, shin: 90, foot: 0, upper: -12, fore: 140 }),
          pose('Bas (cuisses parallèles)', { torso: -74, thigh: 8, shin: 108, foot: 0, upper: -5, fore: 135 }),
        ], equip: ({ P }) => E.barbell([P.wrist[0], P.wrist[1] + 8], 64), arrowRef: 'shoulder' },
    
      { id: 'q-squat-gob', anchor: STAND, floor: 230, opt: { stance: 14, grip: 5 },
        poses: [
          pose('Debout, haltère contre la poitrine', { torso: -90, thigh: 92, shin: 90, foot: 0, upper: 70, fore: -82 }),
          pose('Bas, coudes entre les genoux', { torso: -74, thigh: 8, shin: 108, foot: 0, upper: 70, fore: -82 }),
        ], equip: ({ S: sd }) => E.dumbbell([sd[1].wrist[0], sd[1].wrist[1] - 11, 0], 'y'), arrowRef: 'shoulder' },
    
      { id: 'q-hack', anchor: STAND, floor: 230, opt: { stance: 12, grip: 24 },
        poses: [
          pose('Debout, dos contre le dossier', { torso: -126, thigh: 85, shin: 92, foot: 0, upper: 94, fore: 92 }),
          pose('Bas (cuisses parallèles)', { torso: -126, thigh: 12, shin: 105, foot: 0, upper: 94, fore: 92 }),
        ],
        equip: () => {
          const out = [...slab([-72, 4], [16, 116], 9, 18, BENCH, -40), ...box(-4, 74, 0, 6, -26, 26, GREY, -47)];
          out.push(...box(-76, -68, 0, 8, -20, 20, GREY, -45), ...box(14, 22, 100, 118, -22, 22, GREY, -44));
          return out;
        }, arrowRef: 'hip' },
    
      { id: 'q-presse', anchor: { x: ['hip', 100], y: ['hip', 150] }, floor: 230, opt: { stance: 12, grip: 26 }, cams: { iso: { psi: 50, phi: 30 } },
        poses: [
          pose('Genoux fléchis', { torso: -140, thigh: -62, shin: 30, foot: 25, upper: 30, fore: 30 }, { hip: [100, 150] }),
          pose('Jambes presque tendues', { torso: -140, thigh: -44, shin: -40, foot: 40, upper: 30, fore: 30 }, { hip: [100, 150] }),
        ],
        equip: ({ P }) => [
          ...slab([P.hip[0] - 4, P.hip[1] - 6], [P.shoulder[0] - 6, P.shoulder[1] - 8], 8, 17, BENCH, -39),
          ...slab([P.hip[0] - 14, P.hip[1] - 12], [P.hip[0] + 28, P.hip[1] - 12], 7, 17, BENCH, -38),
          ...box(P.hip[0] - 50, P.hip[0] + 120, 0, 6, -30, 30, GREY, -47), ...legPlate(P),
        ], arrowRef: 'ankle' },
    
      { id: 'q-presse-h', anchor: { x: ['hip', 100], y: ['hip', 170] }, floor: 230, opt: { stance: 12, grip: 20 },
        poses: [
          pose('Genoux fléchis', { torso: -100, thigh: -28, shin: 60, foot: 20, upper: 40, fore: 50 }, { hip: [100, 170] }),
          pose('Jambes presque tendues', { torso: -100, thigh: -4, shin: -4, foot: 20, upper: 40, fore: 50 }, { hip: [100, 170] }),
        ],
        equip: ({ P }) => [
          ...E.seat(P.hip[0] - 24, P.hip[0] + 22, P.hip[1] - 6), ...slab([P.hip[0] - 18, P.hip[1] - 2], [P.hip[0] - 28, P.hip[1] + 86], 8, 17, BENCH, -39),
          ...box(P.hip[0] - 40, P.hip[0] + 135, 0, 6, -28, 28, GREY, -47),
          ...slab([P.toe[0] + 4, P.toe[1] - 34], [P.toe[0] + 4, P.toe[1] + 30], 7, 24, GREY, -35),
        ], arrowRef: 'ankle' },
    
      { id: 'q-sissy', anchor: { x: ['toe', 100], y: ['toe', 222] }, floor: 230, opt: { stance: 10, grip: 14 },
        poses: [
          pose('Debout sur la pointe des pieds', { torso: -92, thigh: 92, shin: 90, foot: 70, upper: 10, fore: 6 }),
          pose('Genoux vers l\'avant, buste en arrière', { torso: -138, thigh: 44, shin: 128, foot: 78, upper: 6, fore: 0 }),
        ], equip: () => [], arrowRef: 'hip' },
    
      { id: 'q-leg-ext', anchor: SEAT, floor: 230, opt: { stance: 10, grip: 14 },
        poses: [
          pose('Jambes fléchies', { torso: -92, ...SEATED, upper: 70, fore: 80 }),
          pose('Jambes tendues', { torso: -92, thigh: 3, shin: 2, foot: -10, upper: 70, fore: 80 }),
        ],
        equip: ({ P, S: sd }) => {
          const out = [...seatBack({ P })], a = sd[1].ankle, pv = [P.hip[0] + 46, P.hip[1] - 14, 0];
          out.push(...roller([a[0] + 6, a[1] + 2, 0], 15));
          for (const s of [-1, 1]) out.push(mk.line([pv[0], pv[1], s * 17], [a[0] + 6, a[1] + 2, s * 15], 4, C.metal, { bias: 0.3 }));
          return out;
        }, arrowRef: 'ankle' },
    
      { id: 'q-fentes-barre', anchor: STAND, floor: 230, opt: { stance: 14, grip: 30, flare: -8 },
        poses: [
          pose('Debout, barre sur le dos', { torso: -90, thigh: 90, shin: 90, foot: 0, ...BACK_ARMS }),
          pose('Fente basse', { torso: -90, foot: 0, ...BACK_ARMS }, { hip: [62, 182], ik: { n: { ankle: [100, 224] }, f: { ankle: [8, 209] } }, f: { foot: 100 } }),
        ], equip: squatBar, arrowRef: 'hip' },
    
      { id: 'q-fentes-march', anchor: STAND, floor: 230, opt: { stance: 14, grip: 24 },
        poses: [
          pose('Pas en avant', { torso: -90, foot: 0, upper: 92, fore: 92 }, { hip: [85, 146], ik: { n: { ankle: [118, 224] }, f: { ankle: [52, 224] } }, f: { foot: 0 } }),
          pose('Fente basse', { torso: -90, foot: 0, upper: 92, fore: 92 }, { hip: [76, 182], ik: { n: { ankle: [112, 224] }, f: { ankle: [12, 209] } }, f: { foot: 100 } }),
        ], equip: dbs(), arrowRef: 'hip' },
    
      { id: 'q-fentes-bulg', anchor: STAND, floor: 230, opt: { stance: 14, grip: 24 },
        poses: [
          pose('Haut, pied arrière sur le banc', { torso: -90, foot: 0, upper: 92, fore: 92 }, { hip: [65, 150], ik: { n: { ankle: [100, 224] }, f: { ankle: [-5, 188] } }, f: { foot: 80 } }),
          pose('Fente basse', { torso: -90, foot: 0, upper: 92, fore: 92 }, { hip: [62, 182], ik: { n: { ankle: [100, 224] }, f: { ankle: [-5, 188] } }, f: { foot: 80 } }),
        ], equip: both(() => E.crate(-134, -84, 36, 17), dbs()), arrowRef: 'hip' },
    
      { id: 'q-stepup', anchor: STAND, floor: 230, opt: { stance: 14, grip: 22 },
        poses: [
          pose('Un pied sur la box', { torso: -90, foot: 0, upper: 92, fore: 92 }, { hip: [90, 140], ik: { n: { ankle: [100, 184] }, f: { ankle: [64, 224] } }, f: { foot: 0 } }),
          pose('Debout sur la box, genou levé', { torso: -90, foot: 0, upper: 92, fore: 92 }, { hip: [100, 100], ik: { n: { ankle: [100, 184] }, f: { ankle: [118, 152] } }, f: { foot: 20 } }),
        ], equip: both(() => E.crate(-36, 36, 40, 22), dbs()), arrowRef: 'hip' },
    
      { id: 'q-squat-sumo', anchor: STAND, floor: 230, opt: { stance: 24, grip: 5 }, iconCam: 'front', cams: { iso: { psi: 45, phi: 32 } },
        poses: [
          pose('Debout, jambes écartées', { torso: -90, thigh: 92, shin: 90, foot: 0, upper: 92, fore: 92 }),
          pose('Bas, haltère entre les jambes', { torso: -80, thigh: 14, shin: 98, foot: 0, upper: 92, fore: 92 }),
        ], equip: ({ S: sd }) => E.dumbbell([sd[1].wrist[0], sd[1].wrist[1] - 11, 0], 'y'), arrowRef: 'hip' },
    
      { id: 'q-box', anchor: STAND, floor: 230, opt: { stance: 14, grip: 30, flare: -8 },
        poses: [
          pose('Debout, barre sur le dos', { torso: -88, thigh: 92, shin: 90, foot: 0, upper: 100, fore: -80 }),
          pose('Assis sur la box', { torso: -52, thigh: 8, shin: 108, foot: 0, upper: 110, fore: -70 }),
        ], equip: both(squatBar, () => E.crate(-52, -4, 38, 20)), arrowRef: 'shoulder' },
    
      // ---------------------------------------------------------------- ischios / fessiers
      { id: 'is-leg-curl-a', anchor: { x: ['hip', 100], y: ['hip', 202] }, floor: 230, opt: { stance: 4, grip: 14 }, cams: { iso: { psi: 55, phi: 30 } },
        poses: [
          pose('Jambes tendues', { torso: -3, thigh: 180, shin: 180, foot: 90, upper: 12, fore: 18 }, { hip: [100, 202] }),
          pose('Talons vers les fesses', { torso: -3, thigh: 180, shin: -62, foot: 90, upper: 12, fore: 18 }, { hip: [100, 202] }),
        ],
        equip: ({ S: sd }) => {
          const a = sd[1].ankle, out = [...E.crate(-46, 96, 22, 17)];
          out.push(...box(-52, -44, 0, 36, -12, 12, GREY, -44), ...roller([a[0] + 2, a[1] + 8, 0], 14));
          return out;
        }, arrowRef: 'ankle' },
    
      { id: 'is-leg-curl-as', anchor: SEAT, floor: 230, opt: { stance: 10, grip: 14 },
        poses: [
          pose('Jambes tendues', { torso: -92, thigh: 4, shin: 6, foot: -10, upper: 70, fore: 80 }),
          pose('Talons sous le siège', { torso: -92, thigh: 4, shin: 104, foot: 20, upper: 70, fore: 80 }),
        ],
        equip: ({ P, S: sd }) => {
          const out = [...seatBack({ P })], a = sd[1].ankle;
          out.push(...box(P.hip[0] + 12, P.hip[0] + 48, P.hip[1] + 4, P.hip[1] + 12, -22, 22, BENCH, 0.4));
          out.push(...roller([a[0] - 2, a[1] + 8, 0], 15));
          return out;
        }, arrowRef: 'ankle' },
    
      { id: 'is-leg-curl-d', anchor: STAND, floor: 230, opt: { stance: 12, grip: 18 },
        poses: [
          pose('Jambe tendue', { torso: -80, upper: 40, fore: 36 }, { hip: [100, 140], n: { thigh: 90, shin: 92, foot: 0 }, f: { thigh: 90, shin: 90, foot: 0 } }),
          pose('Talon vers la fesse', { torso: -80, upper: 40, fore: 36 }, { hip: [100, 140], n: { thigh: 92, shin: -152, foot: 20 }, f: { thigh: 90, shin: 90, foot: 0 } }),
        ],
        equip: ({ P, S: sd }) => {
          const out = [], a = sd[1].ankle;
          out.push(...box(P.shoulder[0] + 12, P.shoulder[0] + 24, P.shoulder[1] - 40, P.shoulder[1] + 4, -20, 20, BENCH, -39), ...box(P.shoulder[0] + 12, P.shoulder[0] + 22, 0, P.shoulder[1] - 40, -5, 5, GREY, -46, true));
          out.push(...box(P.hip[0] - 40, P.hip[0] + 60, 0, 6, -26, 26, GREY, -47), ...roller([a[0] - 2, a[1] + 4, 0], 12));
          return out;
        }, arrowRef: 'ankle' },
    
      { id: 'fess-glute-bridge', anchor: { x: ['ankle', 100], y: ['ankle', 224] }, floor: 230, opt: { stance: 12, grip: 20 },
        poses: [
          pose('Allongé, hanches au sol', { torso: 180, thigh: -71, shin: 85, foot: 0, upper: 8, fore: 6, head: 180 }),
          pose('Hanches hautes', { torso: 155, thigh: -22, shin: 90, foot: 0, upper: 8, fore: 6, head: 160 }),
        ], equip: ({ P }) => E.barbell([P.hip[0] + 4, P.hip[1] + 8], 56), arrowRef: 'hip' },
    
      { id: 'fess-good-morning', anchor: STAND, floor: 230, opt: { stance: 8, grip: 30, flare: -8 },
        poses: [
          pose('Debout, barre sur le dos', { ...UP, ...BACK_ARMS }),
          pose('Hanches en arrière, buste penché', { torso: -40, thigh: 78, shin: 92, foot: 0, ...BACK_ARMS, head: -50 }),
        ], equip: squatBar, arrowRef: 'shoulder' },
    
      // nordic curl : à genoux, le corps tombe vers l'avant en ligne droite
      { id: 'is-nordic', anchor: { x: ['knee', 100], y: ['knee', 226] }, floor: 230, opt: { stance: 8, grip: 20 },
        poses: [
          pose('À genoux, buste droit', { torso: -90, thigh: 90, shin: 180, foot: 180, upper: 40, fore: 30 }),
          pose('Le corps tombe vers l\'avant', { torso: -48, thigh: 132, shin: 180, foot: 180, upper: 40, fore: 30 }),
        ], equip: ({ P }) => [...E.crate(-26, 30, 3, 20), ...box(P.ankle[0] - 7, P.ankle[0] + 7, 3, 12, -18, 18, GREY, 0.4)], arrowRef: 'shoulder' },
    
      { id: 'fess-kickback-p', anchor: STAND, floor: 230, opt: { stance: 16, grip: 18 },
        poses: [
          pose('Genou fléchi devant', { torso: -58, upper: 40, fore: 20 }, { hip: [100, 144], n: { thigh: 58, shin: 100, foot: 0 }, f: { thigh: 90, shin: 90, foot: 0 } }),
          pose('Jambe tendue vers l\'arrière', { torso: -58, upper: 40, fore: 20 }, { hip: [100, 144], n: { thigh: 152, shin: 156, foot: 90 }, f: { thigh: 90, shin: 90, foot: 0 } }),
        ],
        equip: ({ P, S: sd }) => {
          const a = sd[1].ankle, low = [78, 12, 0], w = sd[1].wrist;
          return [...E.post(w[0] + 8, 110), ...E.pulley(low), ...E.cable(low, [a[0], a[1], a[2]], 2.4), ...E.post(84, 30)];
        }, arrowRef: 'ankle' },
    
      { id: 'fess-abd', anchor: SEAT, floor: 230, opt: { stance: 6, grip: 14 }, iconCam: 'front', cams: { iso: { psi: 50, phi: 28 } },
        poses: [
          pose('Jambes serrées', { torso: -92, thigh: 6, shin: 90, foot: 0, upper: 70, fore: 80 }, { lsp: { a: 8 } }),
          pose('Jambes écartées', { torso: -92, thigh: 6, shin: 90, foot: 0, upper: 70, fore: 80 }, { lsp: { a: 40 } }),
        ],
        equip: ({ P, S: sd }) => {
          const out = [...seatBack({ P })];
          for (const s of [-1, 1]) { const k = sd[s].knee; out.push(mk.line([k[0], k[1] - 8, k[2] + s * 9], [k[0], k[1] + 12, k[2] + s * 9], 8, '#c9d2de', { bias: 0.7 })); }
          return out;
        }, arrowRef: 'knee' },
    
      { id: 'fess-add', anchor: SEAT, floor: 230, opt: { stance: 6, grip: 14 }, iconCam: 'front', cams: { iso: { psi: 50, phi: 28 } },
        poses: [
          pose('Jambes écartées', { torso: -92, thigh: 6, shin: 90, foot: 0, upper: 70, fore: 80 }, { lsp: { a: 40 } }),
          pose('Jambes serrées', { torso: -92, thigh: 6, shin: 90, foot: 0, upper: 70, fore: 80 }, { lsp: { a: 8 } }),
        ],
        equip: ({ P, S: sd }) => {
          const out = [...seatBack({ P })];
          for (const s of [-1, 1]) { const k = sd[s].knee; out.push(mk.line([k[0], k[1] - 8, k[2] - s * 9], [k[0], k[1] + 12, k[2] - s * 9], 8, '#c9d2de', { bias: 0.7 })); }
          return out;
        }, arrowRef: 'knee' },
    
      // ---------------------------------------------------------------- mollets : le talon monte ou descend, la pointe reste sur la cale
      { id: 'mol-debout', anchor: { x: ['toe', 100], y: ['toe', 218] }, floor: 230, opt: { stance: 10, grip: 26 },
        poses: [
          pose('Talons en bas', { ...UP, foot: -22, upper: 84, fore: 70 }),
          pose('Sur la pointe des pieds', { ...UP, foot: 64, upper: 84, fore: 70 }),
        ],
        equip: ({ P }) => {
          const out = [...step(12)({ P })];
          out.push(...box(P.shoulder[0] - 7, P.shoulder[0] + 9, P.shoulder[1] + 3, P.shoulder[1] + 14, -26, 26, BENCH, 0.6));
          for (const s of [-1, 1]) out.push(...box(P.shoulder[0] - 4, P.shoulder[0] + 4, 0, P.shoulder[1] + 3, s * 28 - 3, s * 28 + 3, GREY, -30, true));
          return out;
        }, arrowRef: 'hip' },
    
      { id: 'mol-assis', anchor: { x: ['toe', 100], y: ['toe', 218] }, floor: 230, opt: { stance: 10, grip: 20 },
        poses: [
          pose('Talons en bas', { torso: -90, thigh: 0, shin: 90, foot: -22, upper: 60, fore: 40 }),
          pose('Sur la pointe des pieds', { torso: -90, thigh: 0, shin: 90, foot: 62, upper: 60, fore: 40 }),
        ],
        equip: ({ P }) => [...step(12)({ P }), ...E.seat(P.hip[0] - 22, P.hip[0] + 12, P.hip[1] - 6),
          ...box(P.knee[0] - 14, P.knee[0] + 8, P.knee[1] + 3, P.knee[1] + 13, -24, 24, BENCH, 0.6), ...box(P.knee[0] - 3, P.knee[0] + 3, 0, P.knee[1] + 3, -28, -22, GREY, -30, true), ...box(P.knee[0] - 3, P.knee[0] + 3, 0, P.knee[1] + 3, 22, 28, GREY, -30, true)],
        arrowRef: 'knee' },
    
      { id: 'mol-presse', anchor: { x: ['hip', 100], y: ['hip', 150] }, floor: 230, opt: { stance: 12, grip: 26 }, cams: { iso: { psi: 50, phi: 30 } },
        poses: [
          pose('Talons étirés', { torso: -140, thigh: -44, shin: -40, foot: 22, upper: 30, fore: 30 }, { hip: [100, 150] }),
          pose('Sur la pointe des pieds', { torso: -140, thigh: -44, shin: -40, foot: -50, upper: 30, fore: 30 }, { hip: [100, 150] }),
        ],
        equip: ({ P }) => [
          ...slab([P.hip[0] - 4, P.hip[1] - 6], [P.shoulder[0] - 6, P.shoulder[1] - 8], 8, 17, BENCH, -39),
          ...slab([P.hip[0] - 14, P.hip[1] - 12], [P.hip[0] + 28, P.hip[1] - 12], 7, 17, BENCH, -38),
          ...box(P.hip[0] - 50, P.hip[0] + 120, 0, 6, -30, 30, GREY, -47), ...legPlate(P),
        ], arrowRef: 'toe' },
    
      { id: 'mol-uni-halt', anchor: { x: ['toe', 100], y: ['toe', 218] }, floor: 230, opt: { stance: 8, grip: 18 },
        poses: [
          pose('Talon en bas', { ...UP, foot: -22, upper: 92, fore: 92 }, { f: { thigh: 90, shin: -160, foot: 20 } }),
          pose('Sur la pointe du pied', { ...UP, foot: 64, upper: 92, fore: 92 }, { f: { thigh: 90, shin: -160, foot: 20 } }),
        ], equip: both(step(12), ({ S: sd }) => E.dumbbell(sd[1].wrist)), arrowRef: 'hip' },
    
      { id: 'mol-ane', anchor: { x: ['toe', 100], y: ['toe', 218] }, floor: 230, opt: { stance: 12, grip: 22 },
        poses: [
          pose('Talons en bas', { torso: -8, thigh: 90, shin: 90, foot: -22, upper: 70, fore: 60, head: -18 }),
          pose('Sur la pointe des pieds', { torso: -8, thigh: 90, shin: 90, foot: 64, upper: 70, fore: 60, head: -18 }),
        ],
        equip: ({ P }) => [...step(12)({ P }), ...E.crate(P.wrist[0] - 14, P.wrist[0] + 16, Math.max(6, P.wrist[1] - 3), 20), ...box(P.hip[0] - 16, P.hip[0] + 14, P.hip[1] + 8, P.hip[1] + 24, -22, 22, GREY, 0.6)],
        arrowRef: 'hip' },
    ];
    
    module.exports = { EXERCISES };
    
  });

  __def("adastra", function (module, require) {
    // Exercices propres à Ad-astra (absents de la bibliothèque Muscu). Poses : angles en degrés, 0 = avant, 90 = bas, -90 = haut.
    const { E, box, mk, C, STAND, pose } = require('./common');
    
    const HANG = { x: ['wrist', 118], y: ['wrist', 50] };
    const FLOORED = { x: ['wrist', 150], y: ['wrist', 226] };
    const THREE = { cams: { iso: { psi: 55, phi: 30 } } };
    const BAR = ({ P }) => E.pullupBar(P.wrist[0], P.wrist[1]);
    const NOEQ = () => [];
    
    // corde à sauter : arc de la main au sol, devant puis derrière le corps
    const rope = ({ P }) => {
      const w = P.wrist, pts = [];
      for (let i = 0; i <= 10; i++) { const t = Math.PI * i / 10; pts.push([w[0] + 8 + Math.sin(t) * 38, w[1] - 4 - Math.sin(t / 2) * 0 - (1 - Math.cos(t)) * 0 + (Math.cos(t) - 1) * 40, 0]); }
      const out = [];
      for (let i = 0; i < pts.length - 1; i++) out.push(mk.line(pts[i], pts[i + 1], 2, C.dim, { bias: 0.5 }));
      return out;
    };
    
    const EXERCISES = [
      { id: 'aa-negative', anchor: HANG, floor: 270, opt: { stance: 6, grip: 26 }, iconCam: 'front',
        poses: [
          pose('Départ : menton au-dessus de la barre', { torso: -95, thigh: 100, shin: 108, foot: 60, upper: 80, fore: -80, head: -95 }),
          pose('Descente lente, 4 à 5 secondes', { torso: -92, thigh: 96, shin: 102, foot: 60, upper: 20, fore: -75 }),
          pose('Arrivée : bras tendus', { torso: -90, thigh: 92, shin: 98, foot: 60, upper: -90, fore: -90 }),
        ], equip: BAR, arrowRef: 'hip' },
    
      { id: 'aa-releve-genoux', anchor: HANG, floor: 270, opt: { stance: 6, grip: 26 }, ...THREE,
        poses: [
          pose('Suspendu, corps gainé', { torso: -90, thigh: 92, shin: 94, foot: 60, upper: -90, fore: -90 }),
          pose('Genoux montés au-dessus des hanches', { torso: -80, thigh: -25, shin: 85, foot: 40, upper: -90, fore: -90 }),
        ], equip: BAR, arrowRef: 'knee', icon: 1 },
    
      { id: 'aa-suspension', anchor: HANG, floor: 270, opt: { stance: 6, grip: 26 }, iconCam: 'front',
        poses: [pose('Suspension passive, épaules relâchées', { torso: -90, thigh: 92, shin: 98, foot: 60, upper: -90, fore: -90 })],
        equip: BAR, arrowRef: 'hip' },
    
      { id: 'aa-squat-pc', anchor: STAND, floor: 230, opt: { stance: 14, grip: 30 },
        poses: [
          pose('Debout, bras devant', { torso: -88, thigh: 92, shin: 90, foot: 0, upper: 0, fore: 0 }),
          pose('Bas, cuisses parallèles', { torso: -52, thigh: 8, shin: 108, foot: 0, upper: 0, fore: 0 }),
        ], equip: NOEQ, arrowRef: 'shoulder' },
    
      { id: 'aa-squat-profond', anchor: STAND, floor: 230, opt: { stance: 18, grip: 26 },
        poses: [pose('Accroupi, talons au sol, dos droit', { torso: -58, thigh: -8, shin: 118, foot: 0, upper: 60, fore: -60 })],
        equip: NOEQ, arrowRef: 'hip' },
    
      { id: 'aa-squat-saute', anchor: STAND, floor: 230, opt: { stance: 14, grip: 30 },
        poses: [
          pose('Accroupi, bras en arrière', { torso: -52, thigh: 8, shin: 108, foot: 0, upper: 140, fore: 150 }),
          pose('Extension complète, pieds décollés', { torso: -92, thigh: 92, shin: 92, foot: 65, upper: -80, fore: -80 }, { hip: [100, 118] }),
        ], equip: NOEQ, arrowRef: 'hip', icon: 0 },
    
      { id: 'aa-fente-arriere', anchor: STAND, floor: 230, opt: { stance: 14, grip: 24 },
        poses: [
          pose('Debout', { torso: -90, thigh: 90, shin: 90, foot: 0, upper: 90, fore: 90 }),
          pose('Pied reculé, genou arrière près du sol', { torso: -90, foot: 0, upper: 90, fore: 90 },
            { hip: [62, 182], ik: { n: { ankle: [100, 224] }, f: { ankle: [8, 209] } }, f: { foot: 100 } }),
        ], equip: NOEQ, arrowRef: 'hip' },
    
      { id: 'aa-fente-basse', anchor: STAND, floor: 230, opt: { stance: 14, grip: 24 },
        poses: [pose('Genou arrière au sol, bassin avancé', { torso: -90, foot: 0, upper: -60, fore: -60 },
          { hip: [60, 168], ik: { n: { ankle: [104, 224] }, f: { ankle: [-20, 224] } }, f: { foot: 90 } })],
        equip: NOEQ, arrowRef: 'hip' },
    
      { id: 'aa-body-saw', anchor: { x: ['wrist', 130], y: ['wrist', 226] }, floor: 230, opt: { stance: 2, grip: 14 }, cams: { iso: { psi: 62, phi: 32 } },
        poses: [
          { label: 'Planche sur les avant-bras, pieds sur une serviette', ground: ['wrist', 'toe'], a: { foot: 80, upper: 90, fore: 0 } },
          { label: 'Glissement vers l\'avant, épaules au-delà des coudes', ground: ['wrist', 'toe'], a: { foot: 80, upper: 118, fore: 0 } },
        ], equip: () => [], arrowRef: 'shoulder' },
    
      { id: 'aa-bird-dog', anchor: { x: ['hip', 120], y: ['hip', 188] }, floor: 230, opt: { stance: 4, grip: 14 }, ...THREE,
        poses: [
          pose('À quatre pattes, dos plat', { torso: -20, thigh: 90, shin: 180, foot: 180, upper: 90, fore: 90, head: -20 }, { hip: [120, 188] }),
          pose('Bras opposé et jambe tendus, bassin stable', { torso: -20, thigh: 90, shin: 180, foot: 180, upper: 90, fore: 90, head: -20 },
            { hip: [120, 188], n: { thigh: 160, shin: 160, foot: 160 }, f: { upper: -20, fore: -20 } }),
        ], equip: () => [], arrowRef: 'wrist' },
    
      { id: 'aa-corde', anchor: STAND, floor: 230, opt: { stance: 8, grip: 30 },
        poses: [
          pose('Debout, poignets en rotation', { torso: -90, thigh: 90, shin: 90, foot: 0, upper: 75, fore: 20 }),
          pose('Petit saut, pieds à peine décollés', { torso: -90, thigh: 90, shin: 100, foot: 50, upper: 75, fore: 20 }, { hip: [100, 150] }),
        ], equip: rope, arrowRef: 'hip' },
    
      { id: 'aa-pompes-claquees', anchor: { x: ['wrist', 130], y: ['wrist', 226] }, floor: 230, opt: { stance: 2, grip: 22, flare: 8 }, cams: { iso: { psi: 62, phi: 32 } },
        poses: [
          { label: 'Poitrine près du sol', ground: ['wrist', 'toe'], a: { foot: 80, upper: 128, fore: 62 } },
          { label: 'Poussée explosive, mains décollées', ground: ['wrist', 'toe', 30], anchor: { x: ['wrist', 130], y: ['toe', 226] }, a: { foot: 80, upper: 90, fore: 90 } },
        ], equip: () => [], arrowRef: 'shoulder', icon: 1 },
    
      { id: 'aa-course', anchor: STAND, floor: 230, opt: { stance: 8, grip: 26 },
        poses: [
          pose('Appui : genou avant levé, bras opposé en avant', { torso: -84, head: -84 }, { hip: [100, 126],
            n: { thigh: 25, shin: 100, foot: 40, upper: 95, fore: 20 }, f: { thigh: 140, shin: 105, foot: 90, upper: 150, fore: 170 } }),
          pose('Foulée : jambe arrière poussée', { torso: -84, head: -84 }, { hip: [100, 128],
            n: { thigh: 120, shin: 175, foot: 100, upper: 150, fore: 175 }, f: { thigh: 35, shin: 95, foot: 20, upper: 90, fore: 20 } }),
        ], equip: NOEQ, arrowRef: 'hip' },
    ];
    
    module.exports = { EXERCISES };
    
  });

  var S = __m['schemas-core'], EX = {}, cache = { icon: {}, poses: {} };
  ["base","pec","dos","abdos","calli","jambes","adastra"].forEach(function (f) { __m[f].EXERCISES.forEach(function (e) { EX[e.id] = e; }); });

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
