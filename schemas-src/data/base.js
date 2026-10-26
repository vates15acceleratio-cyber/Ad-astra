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
