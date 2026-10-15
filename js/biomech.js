// Biomechanics model: movement patterns, what each step demands of them, and which steps can't be skipped.
//
// Demands use a rough 0–10 scale: how strong you need to be in that pattern to pass the step.
// They are coaching estimates grounded in shared prime movers (e.g. lats + biceps drive both the
// pull-up and the muscle-up pull phase), not measured values — tune them freely.
//
// Rules the engine applies (see jumpFor in engine.js):
//   • Your capacity in a pattern = the highest demand among steps you've mastered (any tree),
//     plus partial credit for steps you're logging and your latest benchmark tests.
//   • A step is "covered" when every pattern it demands is within JUMP_TOLERANCE of your capacity.
//   • A jump can skip at most MAX_SKIP steps, and never skips a gated step.
//   • Each chain starts with its own foundation exercises, so strength from a neighbouring chain
//     typically lets you jump past those first.
//   • You still have to pass a test session of the target step; only then are skipped steps credited.

export const JUMP_TOLERANCE = 0.5;
export const MAX_SKIP = 3;

export const PATTERNS = [
  { id: 'vpull', name: 'Vertical pull', short: 'V-pull', muscles: 'Lats, biceps, brachialis' },
  { id: 'expl', name: 'Explosive pull', short: 'Explosive', muscles: 'Lats, rear delts, fast pulling power' },
  { id: 'sapull', name: 'Straight-arm pull', short: 'SA pull', muscles: 'Lats, teres major, lower traps (scapular depression)' },
  { id: 'press', name: 'Bent-arm press', short: 'Press', muscles: 'Triceps, chest, front delts' },
  { id: 'sapush', name: 'Straight-arm push', short: 'SA push', muscles: 'Front delts, serratus (protraction), biceps tendon' },
  { id: 'overhead', name: 'Overhead & hand balance', short: 'Overhead', muscles: 'Delts, upper traps, wrists, balance' },
  { id: 'core', name: 'Front core / body line', short: 'Core', muscles: 'Abs, hip flexors, glutes (hollow body)' },
  { id: 'compress', name: 'Compression', short: 'Compress', muscles: 'Hip flexors, quads, lower abs' },
  { id: 'lateral', name: 'Side core', short: 'Lateral', muscles: 'Obliques, QL, lateral chain' },
  { id: 'legs', name: 'Single-leg strength', short: 'Legs', muscles: 'Quads, glutes, ankle mobility' },
];
export const PATTERN = Object.fromEntries(PATTERNS.map((p) => [p.id, p]));

export const DEMANDS = {
  'pullup-hang': { sapull: 2 },
  'pullup-scap': { sapull: 2, vpull: 1 },
  'pullup-rows': { vpull: 2 },
  'pullup-negatives': { vpull: 3 },
  'pullup-first': { vpull: 4 },
  'pullup-5': { vpull: 5, expl: 1 },
  'pullup-8': { vpull: 6, expl: 2 },
  'pullup-12': { vpull: 7, expl: 3.5 },

  'muscleup-fghang': { sapull: 2, vpull: 1 },
  'muscleup-dips': { press: 4, sapush: 1.5 },
  'muscleup-pullups': { vpull: 6, expl: 2 },
  'muscleup-c2b': { vpull: 7, expl: 3 },
  'muscleup-sbd': { press: 4.5, sapush: 1.5 },
  'muscleup-highpull': { vpull: 7, expl: 4 },
  'muscleup-negatives': { vpull: 6, press: 5 },
  'muscleup-kipping': { expl: 6, press: 5 },
  'muscleup-strict': { vpull: 8, expl: 6, press: 6 },
  'muscleup-5': { vpull: 9, expl: 7, press: 7 },

  'frontlever-hollow': { core: 3, compress: 1 },
  'frontlever-scap': { sapull: 2, vpull: 1 },
  'frontlever-tuck': { sapull: 4, core: 3 },
  'frontlever-advtuck': { sapull: 5, core: 4.5 },
  'frontlever-oneleg': { sapull: 6, core: 5 },
  'frontlever-straddle': { sapull: 7, core: 6 },
  'frontlever-full5': { sapull: 8, core: 7 },
  'frontlever-full10': { sapull: 9, core: 8 },

  'handstand-pushups': { press: 2, core: 1 },
  'handstand-pike': { overhead: 3, press: 2 },
  'handstand-pikehold': { overhead: 3, core: 2 },
  'handstand-ctw30': { overhead: 4, core: 3 },
  'handstand-ctw60': { overhead: 5, core: 3 },
  'handstand-toepulls': { overhead: 5 },
  'handstand-free5': { overhead: 6 },
  'handstand-free15': { overhead: 6 },
  'handstand-free30': { overhead: 7 },
  'handstand-free60': { overhead: 8 },

  'planche-pushups': { press: 2, core: 1 },
  'planche-scappush': { sapush: 2 },
  'planche-lean': { sapush: 3 },
  'planche-pppu': { sapush: 4, press: 4 },
  'planche-frog': { sapush: 3, overhead: 2, press: 2 },
  'planche-tuck': { sapush: 5, core: 3 },
  'planche-advtuck': { sapush: 6, core: 4 },
  'planche-straddle': { sapush: 8, core: 5 },
  'planche-full': { sapush: 9, core: 6 },

  'lsit-hollow': { core: 3, compress: 1 },
  'lsit-legLifts': { compress: 1.5 },
  'lsit-support': { sapush: 2 },
  'lsit-footsupported': { sapush: 2, compress: 2 },
  'lsit-tuck': { sapush: 3, compress: 3, core: 3.5 },
  'lsit-oneleg': { sapush: 3, compress: 4, core: 3.5 },
  'lsit-full10': { sapush: 3, compress: 5, core: 4 },
  'lsit-full30': { sapush: 4, compress: 6, core: 5 },

  'dragonflag-hollow': { core: 3, compress: 1 },
  'dragonflag-legraises': { compress: 1.5, core: 3 },
  'dragonflag-candlestick': { core: 4, sapull: 2 },
  'dragonflag-tuckhold': { core: 5, sapull: 3 },
  'dragonflag-tucknegatives': { core: 5, sapull: 3 },
  'dragonflag-negatives': { core: 6, sapull: 4, lateral: 2.5 },
  'dragonflag-3': { core: 7, sapull: 5, lateral: 3 },
  'dragonflag-8': { core: 8, sapull: 6, lateral: 3.5 },

  'humanflag-sideplank': { lateral: 2 },
  'humanflag-pullups': { vpull: 5, expl: 1 },
  'humanflag-pike': { overhead: 3, press: 2 },
  'humanflag-vertical': { lateral: 3, vpull: 4, overhead: 4 },
  'humanflag-tuck': { lateral: 5, vpull: 5, overhead: 4, sapull: 4 },
  'humanflag-oneleg': { lateral: 6, vpull: 5, overhead: 5, sapull: 5 },
  'humanflag-straddle': { lateral: 7, vpull: 6, overhead: 5, sapull: 5 },
  'humanflag-full5': { lateral: 8, vpull: 6, overhead: 6, sapull: 6 },
  'humanflag-full10': { lateral: 9, vpull: 7, overhead: 6, sapull: 6 },

  'pistol-squats': { legs: 2 },
  'pistol-deepsquat': { legs: 2 },
  'pistol-assisted': { legs: 3, compress: 1 },
  'pistol-box': { legs: 4, compress: 2 },
  'pistol-negatives': { legs: 5, compress: 3 },
  'pistol-first': { legs: 6, compress: 4 },
  'pistol-5': { legs: 7, compress: 4 },
  'pistol-10': { legs: 8, compress: 5 },
};

// Steps that must be done in order, whatever your strength elsewhere.
export const GATES = {
  'muscleup-negatives': 'technique', // transition
  'muscleup-kipping': 'technique',
  'muscleup-strict': 'technique',
  'handstand-toepulls': 'technique', // balance
  'handstand-free5': 'technique',
  'handstand-free15': 'technique',
  'frontlever-tuck': 'tendon', // first straight-arm loading
  'planche-lean': 'tendon',
  'planche-tuck': 'tendon',
  'humanflag-vertical': 'tendon',
  'pistol-deepsquat': 'mobility', // ankle/hip range
};

export const GATE_INFO = {
  technique: { label: 'Technique', why: 'A skill/balance step — strength from other trees does not replace practice.' },
  tendon: { label: 'Tendon', why: 'Straight-arm conditioning — tendons adapt slower than muscle, so this is never skipped.' },
  mobility: { label: 'Mobility', why: 'Needs joint range that strength elsewhere does not build.' },
};

// Jump branches: pairs of steps in different chains that load the same muscles the same way.
// On the skill wheel they are drawn as branches between neighbouring chains; tree pages list them all.
export const BRIDGES = [
  { a: 'pullup-8', b: 'muscleup-pullups', why: 'The same exercise — pull-ups 3×8' },
  { a: 'pullup-12', b: 'muscleup-highpull', why: 'High-rep pulling power feeds the explosive pull to the hips' },
  { a: 'pullup-5', b: 'humanflag-pullups', why: 'The same exercise — the top arm of a flag pulls' },
  { a: 'pullup-scap', b: 'frontlever-scap', why: 'The same exercise — scapular depression for straight-arm pulling' },
  { a: 'muscleup-dips', b: 'lsit-support', why: 'Locked-out support with the shoulders pushed down' },
  { a: 'muscleup-sbd', b: 'planche-pppu', why: 'Bent-arm pressing — triceps, chest, front delts' },
  { a: 'frontlever-hollow', b: 'dragonflag-hollow', why: 'The same exercise — hollow body line' },
  { a: 'frontlever-advtuck', b: 'dragonflag-tuckhold', why: 'Rigid body line with lats anchoring and pelvis tucked' },
  { a: 'frontlever-straddle', b: 'dragonflag-3', why: 'Long-lever body tension at high level' },
  { a: 'frontlever-tuck', b: 'humanflag-tuck', why: 'Straight-arm lat strength holds the body out horizontally' },
  { a: 'lsit-hollow', b: 'dragonflag-hollow', why: 'The same exercise — hollow body line' },
  { a: 'lsit-tuck', b: 'dragonflag-legraises', why: 'Hip-flexor compression and front core' },
  { a: 'lsit-full10', b: 'pistol-first', why: 'Compression keeps the free leg up in a pistol' },
  { a: 'lsit-support', b: 'planche-lean', why: 'Straight-arm pushing and shoulder protraction' },
  { a: 'handstand-pushups', b: 'planche-pushups', why: 'The same exercise — push-ups' },
  { a: 'handstand-toepulls', b: 'planche-frog', why: 'Balancing on the hands — wrists and fingertip control' },
  { a: 'handstand-pike', b: 'humanflag-pike', why: 'The same exercise — the bottom arm of a flag presses overhead' },
  { a: 'handstand-ctw60', b: 'humanflag-vertical', why: 'Overhead pressing strength for the bottom arm' },
  { a: 'dragonflag-negatives', b: 'humanflag-vertical', why: 'Obliques stabilise the body in both' },
];

// Spoke order around the wheel, chosen so chains with the most jump branches sit side by side.
export const WHEEL_ORDER = ['pullup', 'muscleup', 'planche', 'handstand', 'humanflag', 'pistol', 'lsit', 'dragonflag', 'frontlever'];

// Latest benchmark tests → capacity. Conservative: max reps are converted to what you could do for 3 sets.
export function benchmarkCapacity(b = {}) {
  const n = (k) => Number(b[k]) || 0;
  const pu = n('pullups');
  const dips = n('dips');
  return {
    vpull: pu >= 17 ? 7 : pu >= 12 ? 6 : pu >= 8 ? 5 : pu >= 3 ? 4 : pu >= 1 ? 3.5 : 0,
    expl: pu >= 17 ? 3.5 : pu >= 12 ? 2.5 : 0,
    press: Math.max(dips >= 20 ? 5 : dips >= 12 ? 4.5 : dips >= 8 ? 4 : dips >= 3 ? 3 : 0, n('pushups') >= 40 ? 3 : n('pushups') >= 25 ? 2.5 : n('pushups') >= 12 ? 2 : 0),
    sapush: dips >= 8 ? 1.5 : 0,
    legs: n('squats') >= 50 ? 3.5 : n('squats') >= 30 ? 3 : n('squats') >= 20 ? 2 : 0,
    core: n('hollow') >= 60 ? 4 : n('hollow') >= 30 ? 3 : n('hollow') >= 15 ? 2 : 0,
    overhead: n('wallHS') >= 60 ? 5 : n('wallHS') >= 30 ? 4 : n('wallHS') >= 10 ? 3 : 0,
  };
}
