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
