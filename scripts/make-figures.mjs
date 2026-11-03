/* Draws start/end illustrations for exercises with no usable photo: node scripts/make-figures.mjs <outDir>
   Each pose is a few targets (hip, torso angle, feet, hands); knees and elbows are solved with 2-bone IK. */
import fs from 'node:fs';
import path from 'node:path';

const W = 600, H = 400, FLOOR = 350;
const LEN = { thigh: 76, shin: 76, upper: 56, fore: 52, torso: 100, neck: 14 };
const C = {
  skin: '#d9a383', skinFar: '#b4805f', shirt: '#eef1f6', shirtShade: '#cfd5df',
  pants: '#4b5468', pantsFar: '#363c4d', shoe: '#ff5c39', shoeFar: '#b8432a', hair: '#2e2420',
  db: '#c9ced8', ball: '#3d6f8f', ballHi: '#5a8fb0', mat: '#26324a', floor: '#2f374a',
};

const rad = d => (d * Math.PI) / 180;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const dir = deg => [Math.cos(rad(deg)), Math.sin(rad(deg))];
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

// joint between root and target; bend = +1 / -1 picks which side the knee or elbow points
function ik(root, target, l1, l2, bend) {
  const d = Math.min(dist(root, target), l1 + l2 - 0.01);
  const base = Math.atan2(target[1] - root[1], target[0] - root[0]);
  const a = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
  const ang = base + bend * a;
  const mid = [root[0] + Math.cos(ang) * l1, root[1] + Math.sin(ang) * l1];
  const end = add(root, mul([Math.cos(base), Math.sin(base)], d));
  return [mid, end];
}

const line = (pts, w, color) =>
  `<path d="M${pts.map(p => p.map(n => n.toFixed(1)).join(' ')).join(' L')}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

function figure(p) {
  const t = dir(p.torso), face = [-t[1], t[0]]; // face is the torso direction turned 90° clockwise
  const hip = p.hip, sh = add(hip, mul(t, LEN.torso));
  const head = add(add(sh, mul(t, LEN.neck + 18)), mul(face, p.headFwd ?? 4));
  const leg = (foot, bend) => { const [knee, ankle] = ik(hip, foot, LEN.thigh, LEN.shin, bend); return { knee, ankle }; };
  const arm = (hand, bend) => { const [elbow, wrist] = ik(sh, hand, LEN.upper, LEN.fore, bend); return { elbow, wrist }; };
  const ln = p.legN.knee ? p.legN : leg(p.legN.foot, p.legN.bend ?? -1);
  const lf = p.legF.knee ? p.legF : leg(p.legF.foot, p.legF.bend ?? -1);
  const an = arm(p.armN.hand, p.armN.bend ?? 1), af = arm(p.armF.hand, p.armF.bend ?? 1);
  const shoe = (l, v, c) => line([l.ankle, add(l.ankle, v)], 13, c);
  const limbLeg = (l, pants, sk, shoeC, fv) =>
    line([hip, l.knee], 27, pants) + line([l.knee, l.ankle], 21, pants) + shoe(l, fv, shoeC);
  const limbArm = (a, sk) =>
    line([sh, a.elbow], 15, sk) + line([sh, add(sh, mul([a.elbow[0] - sh[0], a.elbow[1] - sh[1]], 0.45))], 19, C.shirt) + line([a.elbow, a.wrist], 13, sk);
  const back = mul(face, -1);
  let s = `<ellipse cx="${(p.shadowX ?? hip[0]).toFixed(1)}" cy="${FLOOR + 3}" rx="${p.shadowW ?? 70}" ry="7" fill="#000" opacity="0.28"/>`;
  s += p.propsBack ?? '';
  s += limbArm(af, C.skinFar) + (p.dbF ? dumbbell(af.wrist) : '');
  s += limbLeg(lf, C.pantsFar, C.skinFar, C.shoeFar, p.footF);
  s += line([hip, add(hip, mul(t, 18))], 44, C.pants);                 // pelvis / waistband
  s += line([add(hip, mul(t, 22)), sh], 40, C.shirt);                    // torso
  s += line([add(hip, mul(t, 22)), add(sh, mul(t, -6))], 8, C.shirtShade).replace('fill="none"', 'fill="none" opacity="0.55" transform="translate(' + (back[0] * 13).toFixed(1) + ' ' + (back[1] * 13).toFixed(1) + ')"');
  s += line([sh, add(sh, mul(t, LEN.neck))], 14, C.skin);                // neck
  s += `<circle cx="${head[0].toFixed(1)}" cy="${head[1].toFixed(1)}" r="21" fill="${C.hair}"/>`;
  const fc = add(head, mul(face, 4));
  s += `<circle cx="${fc[0].toFixed(1)}" cy="${fc[1].toFixed(1)}" r="17.5" fill="${C.skin}"/>`;
  const bun = add(add(head, mul(back, 17)), mul(t, 6));
  s += `<circle cx="${bun[0].toFixed(1)}" cy="${bun[1].toFixed(1)}" r="9" fill="${C.hair}"/>`;
  s += limbLeg(ln, C.pants, C.skin, C.shoe, p.footN);
  s += p.propsMid ?? '';
  s += limbArm(an, C.skin) + (p.dbN ? dumbbell(an.wrist, p.dbScale) : '');
  s += p.propsFront ?? '';
  return s;
}

function dumbbell([x, y], k = 1) {
  return `<g transform="translate(${x.toFixed(1)} ${(y + 4 * k).toFixed(1)}) scale(${k})"><rect x="-17" y="-4" width="34" height="8" rx="3" fill="#8b94a7"/><rect x="-22" y="-12" width="10" height="24" rx="3" fill="${C.db}"/><rect x="12" y="-12" width="10" height="24" rx="3" fill="${C.db}"/></g>`;
}
const ball = (cx, r = 50) => `<circle cx="${cx}" cy="${FLOOR - r}" r="${r}" fill="${C.ball}"/><path d="M${cx - r * 0.55} ${FLOOR - r * 1.55} A ${r * 0.8} ${r * 0.8} 0 0 1 ${cx + r * 0.2} ${FLOOR - r * 1.85}" stroke="${C.ballHi}" stroke-width="7" stroke-linecap="round" fill="none"/>`;
const BENCH_TOP = FLOOR - 92;
const bench = (x1, x2) => `<rect x="${x1}" y="${BENCH_TOP}" width="${x2 - x1}" height="16" rx="6" fill="#3a4458"/><rect x="${x1 + 20}" y="${BENCH_TOP + 16}" width="12" height="${FLOOR - BENCH_TOP - 16}" fill="#2c3445"/><rect x="${x2 - 32}" y="${BENCH_TOP + 16}" width="12" height="${FLOOR - BENCH_TOP - 16}" fill="#2c3445"/>`;
const mat = (x1, x2) => `<rect x="${x1}" y="${FLOOR - 4}" width="${x2 - x1}" height="8" rx="4" fill="${C.mat}"/>`;

function svg(inner, label, view = `0 0 ${W} ${H}`) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" width="${W}" height="${H}" role="img" aria-label="${label}">
<defs><radialGradient id="bg" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#232a39"/><stop offset="1" stop-color="#141820"/></radialGradient></defs>
<rect x="-100" y="-100" width="${W + 200}" height="${H + 200}" fill="url(#bg)"/>
<line x1="30" y1="${FLOOR + 4}" x2="${W - 30}" y2="${FLOOR + 4}" stroke="${C.floor}" stroke-width="3" stroke-linecap="round"/>
${inner}
</svg>
`;
}

// standing: ankles sit 14 above the floor so the shoe line lands on it
const A = FLOOR - 12, F = [22, 0];
const STAND = '42 32 495 330', LIE = '100 112 390 260';
const lieArmsDown = { armN: { hand: [312, FLOOR - 14], bend: -1 }, armF: { hand: [306, FLOOR - 16], bend: -1 } };
const moves = {
  'b-stance-hinge': {
    label: 'B-stance dumbbell hip hinge', view: STAND,
    a: { hip: [290, A - 150], torso: -90, legN: { foot: [298, A] }, legF: { foot: [256, A - 6] }, footN: F, footF: [14, 11], armN: { hand: [300, A - 47], bend: -1 }, armF: { hand: [296, A - 50], bend: -1 }, dbN: true, shadowW: 55 },
    b: { hip: [252, A - 128], torso: -28, headFwd: 6, legN: { foot: [298, A] }, legF: { foot: [256, A - 6] }, footN: F, footF: [14, 11], armN: { hand: [344, A - 56], bend: -1 }, armF: { hand: [338, A - 58], bend: -1 }, dbN: true, shadowX: 290, shadowW: 75 },
  },
  'suitcase-carry': {
    label: 'Single-arm suitcase carry', view: STAND,
    a: { hip: [300, A - 147], torso: -90, legN: { foot: [340, A] }, legF: { foot: [262, A - 6] }, footN: F, footF: [18, 8], armN: { hand: [298, A - 40], bend: -1 }, armF: { hand: [258, A - 58], bend: 1 }, dbN: true, dbScale: 1.5, shadowW: 70 },
    b: { hip: [300, A - 147], torso: -90, legN: { foot: [262, A - 6] }, legF: { foot: [340, A] }, footN: [18, 8], footF: F, armN: { hand: [298, A - 40], bend: -1 }, armF: { hand: [340, A - 58], bend: -1 }, dbN: true, dbScale: 1.5, shadowW: 70 },
  },
  'psoas-90-90': {
    label: '90/90 psoas relief on a Swiss ball', view: LIE,
    a: { hip: [330, FLOOR - 22], torso: 180, headFwd: 2, legN: { knee: [330, FLOOR - 100], ankle: [404, FLOOR - 100] }, legF: { knee: [336, FLOOR - 98], ankle: [410, FLOOR - 98] }, footN: [0, -20], footF: [0, -20], armN: { hand: [296, FLOOR - 42], bend: -1 }, armF: { hand: [290, FLOOR - 40], bend: -1 }, propsBack: mat(120, 470) + ball(412), shadowX: 260, shadowW: 120 },
    b: { hip: [330, FLOOR - 22], torso: 180, headFwd: 2, legN: { knee: [330, FLOOR - 100], ankle: [404, FLOOR - 100] }, legF: { knee: [336, FLOOR - 98], ankle: [410, FLOOR - 98] }, footN: [0, -20], footF: [0, -20], armN: { hand: [296, FLOOR - 54], bend: -1 }, armF: { hand: [290, FLOOR - 52], bend: -1 }, propsBack: mat(120, 470) + ball(412), shadowX: 260, shadowW: 120 },
  },
  'figure-4': {
    label: 'Supine figure-4 stretch', view: LIE,
    a: { hip: [330, FLOOR - 22], torso: 180, headFwd: 2, legF: { foot: [402, FLOOR - 12], bend: -1 }, legN: { knee: [406, FLOOR - 50], ankle: [368, FLOOR - 80] }, footF: [20, 0], footN: [-4, -18], ...lieArmsDown, propsBack: mat(120, 470), shadowX: 270, shadowW: 130 },
    b: { hip: [330, FLOOR - 22], torso: 180, headFwd: 2, legF: { foot: [392, FLOOR - 128], bend: -1 }, legN: { knee: [394, FLOOR - 80], ankle: [346, FLOOR - 118] }, footF: [14, -14], footN: [-4, -18], armN: { hand: [330, FLOOR - 104], bend: 1 }, armF: { hand: [326, FLOOR - 100], bend: 1 }, propsBack: mat(120, 470), shadowX: 270, shadowW: 130 },
  },
  // lying along the bench (whole back supported), not across it: safer for the lower back
  'db-pullover': {
    label: 'Dumbbell pullover lying along the bench', view: '80 60 450 300',
    a: { hip: [350, BENCH_TOP - 22], torso: 180, headFwd: 2, legN: { foot: [404, A], bend: -1 }, legF: { foot: [396, A - 2], bend: -1 }, footN: F, footF: F, armN: { hand: [252, BENCH_TOP - 128], bend: -1 }, armF: { hand: [248, BENCH_TOP - 126], bend: -1 }, dbN: true, dbScale: 1.2, propsBack: bench(140, 400), shadowX: 290, shadowW: 150 },
    b: { hip: [350, BENCH_TOP - 22], torso: 180, headFwd: 2, legN: { foot: [404, A], bend: -1 }, legF: { foot: [396, A - 2], bend: -1 }, footN: F, footF: F, armN: { hand: [150, BENCH_TOP - 52], bend: 1 }, armF: { hand: [146, BENCH_TOP - 50], bend: 1 }, dbN: true, dbScale: 1.2, propsBack: bench(140, 400), shadowX: 290, shadowW: 150 },
  },
  'plank-shoulder-tap': {
    label: 'Plank shoulder taps', view: '60 130 450 300',
    a: { hip: [250, FLOOR - 71], torso: -23, headFwd: 4, legN: { foot: [110, FLOOR - 12] }, legF: { foot: [104, FLOOR - 13] }, footN: [8, 10], footF: [8, 10], armN: { hand: [346, FLOOR - 6], bend: 1 }, armF: { hand: [338, FLOOR - 6], bend: 1 }, propsBack: mat(80, 420), shadowX: 230, shadowW: 140 },
    b: { hip: [250, FLOOR - 71], torso: -23, headFwd: 4, legN: { foot: [110, FLOOR - 12] }, legF: { foot: [104, FLOOR - 13] }, footN: [8, 10], footF: [8, 10], armN: { hand: [328, FLOOR - 98], bend: 1 }, armF: { hand: [344, FLOOR - 6], bend: 1 }, propsBack: mat(80, 420), shadowX: 230, shadowW: 140 },
  },
};

const out = process.argv[2] || 'public/exercises';
fs.mkdirSync(out, { recursive: true });
for (const [key, m] of Object.entries(moves))
  for (const f of ['a', 'b']) fs.writeFileSync(path.join(out, `${key}-${f}.svg`), svg(figure(m[f]), m.label, m.view));
console.log('drew', Object.keys(moves).length * 2, 'frames into', out);
