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
