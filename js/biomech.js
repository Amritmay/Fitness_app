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
  { id: 'legs', name: 'Quads & single-leg', short: 'Legs', muscles: 'Quads, glutes, adductors, balance' },
  { id: 'hams', name: 'Hamstrings & glutes', short: 'Hams', muscles: 'Hamstrings, glutes (posterior chain)' },
  { id: 'calves', name: 'Calves & ankles', short: 'Calves', muscles: 'Gastrocnemius, soleus, Achilles tendon' },
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

  'frogstand-plank': { core: 2, sapush: 1 },
  'frogstand-lean': { overhead: 2, press: 1.5 },
  'frogstand-onefoot': { overhead: 2.5, press: 2 },
  'frogstand-15': { overhead: 3, press: 2.5, sapush: 2 },
  'frogstand-30': { overhead: 3.5, press: 2.5, sapush: 2.5 },
  'frogstand-crow15': { overhead: 4, sapush: 3.5, core: 2 },
  'frogstand-crow30': { overhead: 4.5, sapush: 4, core: 2.5 },

  'tuckplanche-lean': { sapush: 3 },
  'tuckplanche-pppu': { sapush: 4, press: 4 },
  'tuckplanche-safrog': { sapush: 4.5, overhead: 2.5 },
  'tuckplanche-5': { sapush: 5, core: 3 },
  'tuckplanche-10': { sapush: 5.5, core: 3 },
  'tuckplanche-20': { sapush: 6, core: 3.5 },

  'headstand-dolphin': { overhead: 2, core: 1.5 },
  'headstand-tripodtuck': { overhead: 2.5, core: 2 },
  'headstand-wall': { overhead: 3, core: 2.5 },
  'headstand-free15': { overhead: 3.5, core: 2.5 },
  'headstand-free30': { overhead: 4, core: 3 },
  'headstand-free60': { overhead: 4.5, core: 3 },
  'headstand-press': { overhead: 6, core: 3.5, compress: 2 },

  'elbowlever-plank': { core: 2.5 },
  'elbowlever-lean': { core: 2.5, press: 2 },
  'elbowlever-assisted': { core: 3, press: 3 },
  'elbowlever-10': { core: 4, press: 3.5, overhead: 2 },
  'elbowlever-30': { core: 5, press: 4, overhead: 2.5 },
  'elbowlever-onearm5': { core: 6, press: 5, lateral: 3 },
  'elbowlever-onearm15': { core: 7, press: 6, lateral: 4 },

  'dragonsquat-curtsy': { legs: 3 },
  'dragonsquat-skater': { legs: 5 },
  'dragonsquat-assisted': { legs: 6, compress: 3 },
  'dragonsquat-negatives': { legs: 7, compress: 3 },
  'dragonsquat-first': { legs: 8, compress: 4 },
  'dragonsquat-5': { legs: 9, compress: 4 },

  'cossack-lateral': { legs: 2 },
  'cossack-assisted': { legs: 3 },
  'cossack-6': { legs: 4, compress: 2 },
  'cossack-12': { legs: 5, compress: 2 },
  'cossack-deep': { legs: 6, compress: 3 },

  'squat-box': { legs: 1.5 },
  'squat-20': { legs: 2 },
  'squat-tempo': { legs: 2.5 },
  'squat-jump': { legs: 3, calves: 2 },
  'squat-50': { legs: 3.5 },

  'splitsquat-split': { legs: 2.5, hams: 1 },
  'splitsquat-8': { legs: 3.5, hams: 1.5 },
  'splitsquat-12': { legs: 4.5, hams: 2 },
  'splitsquat-tempo': { legs: 5, hams: 2 },
  'splitsquat-20': { legs: 5.5, hams: 2.5 },

  'wallsit-30': { legs: 2 },
  'wallsit-60': { legs: 3 },
  'wallsit-calf15': { legs: 3, calves: 3 },
  'wallsit-calf30': { legs: 3, calves: 4 },
  'wallsit-single': { legs: 5, calves: 2 },

  'calfraise-20': { calves: 1.5 },
  'calfraise-step': { calves: 3 },
  'calfraise-single': { calves: 4 },
  'calfraise-deficit': { calves: 5 },
  'calfraise-25': { calves: 6 },

  'nordic-bridge': { hams: 1.5 },
  'nordic-singlebridge': { hams: 2.5 },
  'nordic-slides': { hams: 3.5 },
  'nordic-partial': { hams: 5 },
  'nordic-negatives': { hams: 6 },
  'nordic-3': { hams: 8 },
  'nordic-8': { hams: 9 },
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
  'dragonsquat-negatives': 'technique', // balance and leg path behind
  'tuckplanche-5': 'tendon', // first straight-arm planche hold
  'headstand-free15': 'technique', // balance away from the wall
  'elbowlever-onearm5': 'technique', // one-arm balance
  'cossack-assisted': 'mobility', // adductor range
  'nordic-negatives': 'tendon', // full-range eccentric hamstring loading
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
  { a: 'frogstand-30', b: 'planche-frog', why: 'The same exercise — frog stand 30s' },
  { a: 'frogstand-crow15', b: 'handstand-toepulls', why: 'Balancing on the hands — wrists and fingertip control' },
  { a: 'tuckplanche-lean', b: 'planche-lean', why: 'The same exercise — planche lean' },
  { a: 'tuckplanche-pppu', b: 'planche-pppu', why: 'The same exercise — pseudo planche push-ups' },
  { a: 'tuckplanche-10', b: 'planche-tuck', why: 'The same exercise — tuck planche 10s' },
  { a: 'tuckplanche-safrog', b: 'frogstand-crow30', why: 'Hand balance moving toward straight arms' },
  { a: 'elbowlever-10', b: 'frogstand-15', why: 'Bent-arm hand balance with the body supported on the arms' },
  { a: 'elbowlever-plank', b: 'dragonflag-hollow', why: 'Front-core bracing and body line' },
  { a: 'headstand-wall', b: 'handstand-pike', why: 'Overhead shoulder strength for inversions' },
  { a: 'headstand-free30', b: 'handstand-ctw30', why: 'Inverted balance with a straight body line' },
  { a: 'headstand-tripodtuck', b: 'frogstand-lean', why: 'Knees on the elbows — the same tuck balance' },
  { a: 'squat-20', b: 'pistol-squats', why: 'The same exercise — bodyweight squats 3×20' },
  { a: 'pistol-box', b: 'splitsquat-8', why: 'Single-leg quad and glute strength' },
  { a: 'pistol-5', b: 'dragonsquat-assisted', why: 'Single-leg squat strength carries into the dragon squat' },
  { a: 'pistol-deepsquat', b: 'cossack-assisted', why: 'Deep hip and ankle range' },
  { a: 'cossack-6', b: 'dragonsquat-skater', why: 'Lateral hip control and single-leg balance' },
  { a: 'squat-tempo', b: 'wallsit-60', why: 'Quad strength-endurance at depth' },
  { a: 'squat-jump', b: 'calfraise-step', why: 'Ankle power for jumping' },
  { a: 'wallsit-calf15', b: 'calfraise-single', why: 'Calf strength — soleus and gastrocnemius' },
  { a: 'splitsquat-split', b: 'nordic-singlebridge', why: 'Single-leg glute strength' },
  { a: 'splitsquat-12', b: 'squat-50', why: 'Quad endurance' },
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

// Major muscle groups: the regions around the edge of the skill wheel. The order matters — Back sits
// between Core (levers, dragon flag) and Shoulders & Arms (muscle-up), so mixed skills land between them.
export const GROUPS = [
  { id: 'back', name: 'Back', color: 'var(--c-pull)', angle: -90 },
  { id: 'core', name: 'Core', color: 'var(--c-core)', angle: 0 },
  { id: 'legs', name: 'Legs', color: 'var(--c-legs)', angle: 90 },
  { id: 'shoulders', name: 'Shoulders & Arms', short: 'Shoulders', color: 'var(--c-push)', angle: 180 },
];
export const GROUP = Object.fromEntries(GROUPS.map((g) => [g.id, g]));

// Which muscle group each movement pattern mainly loads.
export const PATTERN_GROUP = {
  vpull: 'back', expl: 'back', sapull: 'back',
  press: 'shoulders', sapush: 'shoulders', overhead: 'shoulders',
  core: 'core', compress: 'core', lateral: 'core',
  legs: 'legs', hams: 'legs', calves: 'legs',
};

// How hard a step is (0–10): its biggest demand. Sets how far from the centre its dot sits.
export const stepLevel = (stepId) => Math.max(0, ...Object.values(DEMANDS[stepId] || {}));

// Share of each muscle group a skill uses, from the peak demand of each pattern across its chain.
export function muscleShare(steps) {
  const peak = {};
  for (const st of steps) for (const [p, v] of Object.entries(DEMANDS[st.id] || {})) peak[p] = Math.max(peak[p] || 0, v);
  const sum = Object.fromEntries(GROUPS.map((g) => [g.id, 0]));
  for (const [p, v] of Object.entries(peak)) sum[PATTERN_GROUP[p]] += v;
  const total = Object.values(sum).reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(Object.entries(sum).map(([g, v]) => [g, v / total]));
}

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
