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
