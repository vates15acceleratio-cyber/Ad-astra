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
