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
