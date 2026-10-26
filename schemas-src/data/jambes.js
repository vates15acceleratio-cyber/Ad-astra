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
