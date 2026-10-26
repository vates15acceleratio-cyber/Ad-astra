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
