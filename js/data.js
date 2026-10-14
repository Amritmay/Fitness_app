// Skill-tree content. Edit this file to change progressions, targets or cues.
//
// Step fields:
//   name   – shown in the UI
//   kind   – 'reps' or 'hold' (hold targets are in seconds)
//   sets   – number of sets needed to master the step
//   target – reps (or seconds) required in EVERY one of those sets
//   side   – optional label such as 'per leg' / 'per side'
//   cues   – short form tips
//
// A tree's `requires` lists step ids that must be mastered before its first step unlocks.
// Within a tree each step unlocks when the previous one is mastered.
// The foundation tree is `parallel`: all of its steps are available from day one.

export const CATEGORIES = {
  foundation: { name: 'Foundation', color: 'var(--c-found)' },
  pull: { name: 'Pull', color: 'var(--c-pull)' },
  push: { name: 'Push', color: 'var(--c-push)' },
  core: { name: 'Core', color: 'var(--c-core)' },
  legs: { name: 'Legs', color: 'var(--c-legs)' },
};

const step = (name, kind, sets, target, cues, extra = {}) => ({ name, kind, sets, target, cues, ...extra });

const RAW_TREES = [
  {
    id: 'foundation',
    name: 'Foundation',
    short: 'FD',
    category: 'foundation',
    parallel: true,
    blurb: 'The shared base every skill branches from. Master these and the trees open up.',
    requires: [],
    steps: [
      step('Dead hang', 'hold', 3, 30, [
        'Full grip, arms straight, shoulders active — not shrugged into your ears',
        'Ribs down, legs together',
        'Breathe slowly; this builds grip endurance',
      ], { id: 'found-hang', cat: 'pull' }),
      step('Scapular pulls', 'reps', 3, 10, [
        'From a dead hang, pull shoulder blades down and back without bending the elbows',
        'Pause 1 s at the top',
        'Lower with control to a full hang',
      ], { id: 'found-scap', cat: 'pull' }),
      step('Push-ups', 'reps', 3, 12, [
        'Hands under shoulders, body in one straight line',
        'Elbows about 45° from the torso',
        'Chest to the floor, full lockout at the top',
      ], { id: 'found-pushup', cat: 'push' }),
      step('Parallel bar dips', 'reps', 3, 8, [
        'Start locked out with shoulders pushed down',
        'Lean slightly forward, lower until shoulders dip below elbows',
        'Press back to full lockout',
      ], { id: 'found-dips', cat: 'push' }),
      step('Bodyweight squats', 'reps', 3, 20, [
        'Feet shoulder-width, toes slightly out',
        'Hips below knees, heels down',
        'Knees track over toes, chest up',
      ], { id: 'found-squat', cat: 'legs' }),
      step('Hollow body hold', 'hold', 3, 30, [
        'Lower back pressed into the floor',
        'Arms overhead, legs straight and low',
        'Raise arms and legs higher to make it easier',
      ], { id: 'found-hollow', cat: 'core' }),
    ],
  },
  {
    id: 'pullup',
    name: 'Pull-up',
    short: 'PU',
    category: 'pull',
    blurb: 'The king of upper-body pulling. Opens the muscle-up, front lever and human flag.',
    requires: ['found-hang', 'found-scap'],
    steps: [
      step('Australian rows', 'reps', 3, 10, [
        'Bar at hip height, body rigid like a plank',
        'Pull chest to the bar and squeeze the shoulder blades',
        'Walk feet forward to make it harder',
      ]),
      step('Pull-up negatives', 'reps', 3, 5, [
        'Jump or step to the top, chin over the bar',
        'Lower over 5 seconds to a full dead hang',
        'Reset between reps — quality over speed',
      ]),
      step('First pull-ups', 'reps', 3, 1, [
        'Start from a dead hang with active shoulders',
        'Drive the elbows down toward your hips',
        'Chin clears the bar — no kicking',
      ]),
      step('Pull-ups', 'reps', 3, 5, [
        'Full range: dead hang to chin over bar',
        'Legs together, slight hollow body',
        'Rest 2–3 min between sets',
      ]),
      step('Pull-ups', 'reps', 3, 8, [
        'Smooth tempo with a 1 s pause at the top',
        'Stalled? Add one rep to one set each session',
        'Control the descent',
      ]),
      step('Pull-ups', 'reps', 3, 12, [
        'Strict reps only',
        'Mastery here makes every pulling skill easier',
        'Try chest-to-bar on the last reps',
      ]),
    ],
  },
  {
    id: 'muscleup',
    name: 'Muscle-up',
    short: 'MU',
    category: 'pull',
    blurb: 'Pull, transition and press over the bar in one move.',
    requires: ['pullup-5', 'found-dips'],
    steps: [
      step('Chest-to-bar pull-ups', 'reps', 3, 5, [
        'Pull until your lower chest touches the bar',
        'Lean back slightly at the top',
        'Drive the elbows behind your body',
      ]),
      step('Straight bar dips', 'reps', 3, 10, [
        'Support on top of a single bar, leaning over it',
        'Lower until the bar touches your upper abs',
        'Press to full lockout — this is the muscle-up finish',
      ]),
      step('Explosive high pull-ups', 'reps', 3, 3, [
        'Pull as fast as possible from a dead hang',
        'Aim to bring the bar to your belly button',
        'Keep the hips close to the bar',
      ]),
      step('Muscle-up negatives', 'reps', 3, 3, [
        'Start in straight-bar support at the top',
        'Lower slowly through the transition, wrists over the bar',
        'Finish in a controlled hang',
      ]),
      step('Kipping muscle-up', 'reps', 3, 1, [
        'Small hollow-to-arch swing',
        'Pull explosively toward the hips, then whip the chest over',
        'Press out to lockout',
      ]),
      step('Strict muscle-up', 'reps', 3, 1, [
        'False grip helps',
        'No swing — pull high, then lean forward fast',
        'Keep the bar close to your body',
      ]),
      step('Muscle-ups', 'reps', 3, 5, [
        'Consistent strict reps',
        'Smooth transition, no chicken-winging',
        'Control every negative',
      ]),
    ],
  },
  {
    id: 'frontlever',
    name: 'Front Lever',
    short: 'FL',
    category: 'pull',
    blurb: 'Hang horizontally under the bar with straight arms.',
    requires: ['pullup-4', 'found-hollow'],
    steps: [
      step('Tuck front lever', 'hold', 3, 10, [
        'Straight arms, pull the bar toward your hips',
        'Knees to chest, back horizontal',
        'Shoulder blades depressed and retracted',
      ]),
      step('Advanced tuck front lever', 'hold', 3, 10, [
        'Open the hips so the back is flat, knees at 90°',
        'Arms locked',
        'Posterior pelvic tilt',
      ]),
      step('One-leg front lever', 'hold', 3, 8, [
        'One leg extended, the other tucked',
        'Alternate legs between sets',
        'Hips level with shoulders',
      ]),
      step('Straddle front lever', 'hold', 3, 8, [
        'Legs wide and straight',
        'Body horizontal, toes pointed',
        'Squeeze the glutes',
      ]),
      step('Full front lever', 'hold', 3, 5, [
        'Legs together, body a straight horizontal line',
        'Lats and core fully engaged',
        "Don't let the hips sag",
      ]),
      step('Full front lever', 'hold', 3, 10, [
        'Long, quality holds',
        'Shallow, steady breathing',
        'Mastery!',
      ]),
    ],
  },
  {
    id: 'handstand',
    name: 'Handstand',
    short: 'HS',
    category: 'push',
    blurb: 'Balance upside down. The base of most overhead skills.',
    requires: ['found-pushup', 'found-hollow'],
    steps: [
      step('Box pike hold', 'hold', 3, 30, [
        'Hands on floor, feet on a box, hips stacked over shoulders',
        'Push the floor away, ears between the arms',
        'Legs straight',
      ]),
      step('Chest-to-wall handstand', 'hold', 3, 30, [
        'Walk the feet up the wall while facing it',
        'Hands 10–20 cm from the wall, body straight',
        'Push tall through the shoulders, squeeze the glutes',
      ]),
      step('Chest-to-wall handstand', 'hold', 3, 60, [
        'Same line, longer hold',
        'Ribs tucked — no banana back',
        'Point the toes',
      ]),
      step('Wall toe-pulls', 'hold', 3, 20, [
        'From chest-to-wall, lift the toes off the wall',
        'Balance with finger and palm pressure',
        'Return the toes gently when needed',
      ]),
      step('Freestanding handstand', 'hold', 3, 5, [
        'Controlled kick-up, balance with the fingertips',
        'Learn to bail safely (cartwheel out)',
        'Count only clean holds',
      ]),
      step('Freestanding handstand', 'hold', 3, 15, [
        'Stack wrists, shoulders, hips and ankles',
        'Small corrections from the fingers',
        'Gaze between your hands',
      ]),
      step('Freestanding handstand', 'hold', 3, 30, [
        'Consistent kick-ups',
        'Tight from toes to fingers',
        'Short daily practice beats long rare sessions',
      ]),
      step('Freestanding handstand', 'hold', 3, 60, [
        'Mastery hold',
        'Relaxed breathing',
        'Try it on parallettes next',
      ]),
    ],
  },
  {
    id: 'planche',
    name: 'Planche',
    short: 'PL',
    category: 'push',
    blurb: 'Hold the body horizontal above the floor on straight arms.',
    requires: ['found-pushup', 'found-dips'],
    steps: [
      step('Planche lean', 'hold', 3, 20, [
        'Push-up position, fingers turned out',
        'Lean the shoulders well past the hands',
        'Protract the shoulders and lock the elbows',
      ]),
      step('Pseudo planche push-ups', 'reps', 3, 8, [
        'Keep the forward lean throughout',
        'Hands near the hips',
        'Protract at the top',
      ]),
      step('Frog stand', 'hold', 3, 30, [
        'Knees rest on the backs of the elbows',
        'Lean forward until the feet lift',
        'Look slightly ahead',
      ]),
      step('Tuck planche', 'hold', 3, 10, [
        'Straight arms, knees tucked, feet off the floor',
        'Hips at shoulder height',
        'Shoulders protracted and depressed',
      ]),
      step('Advanced tuck planche', 'hold', 3, 10, [
        'Flat back, hips open to 90°',
        'Lean further as the lever lengthens',
        'Elbows locked',
      ]),
      step('Straddle planche', 'hold', 3, 5, [
        'Legs wide, body horizontal',
        'Squeeze the glutes, point the toes',
        'Big forward lean',
      ]),
      step('Full planche', 'hold', 3, 5, [
        'Legs together, body parallel to the floor',
        'The peak of pushing strength',
        'Mastery!',
      ]),
    ],
  },
  {
    id: 'lsit',
    name: 'L-Sit',
    short: 'LS',
    category: 'core',
    blurb: 'Support your body with legs held straight out in front.',
    requires: ['found-hollow', 'found-dips'],
    steps: [
      step('Support hold', 'hold', 3, 30, [
        'Arms locked, shoulders pushed down away from the ears',
        'Body straight, legs together',
        'Parallel bars, parallettes or two sturdy chairs',
      ]),
      step('Foot-supported L-sit', 'hold', 3, 20, [
        'Sit with hands beside the hips, heels on the floor',
        'Press up so the hips lift',
        'Shoulders down',
      ]),
      step('Tuck L-sit', 'hold', 3, 15, [
        'Lift both feet, knees to chest',
        'Arms locked, shoulders depressed',
        'Hips level with the hands',
      ]),
      step('One-leg L-sit', 'hold', 3, 15, [
        'One leg straight, the other tucked',
        'Alternate legs each set',
        'Lift the straight leg with the hip flexors',
      ]),
      step('Full L-sit', 'hold', 3, 10, [
        'Both legs straight and parallel to the floor',
        'Point the toes, lock the knees',
        'Lean back slightly if needed',
      ]),
      step('Full L-sit', 'hold', 3, 30, [
        'Long, solid hold',
        'Steady breathing',
        'Next challenge: V-sit',
      ]),
    ],
  },
  {
    id: 'dragonflag',
    name: 'Dragon Flag',
    short: 'DF',
    category: 'core',
    blurb: 'Lower a rigid body from a bench with only the shoulders down.',
    requires: ['found-hollow'],
    steps: [
      step('Lying leg raises', 'reps', 3, 12, [
        'Lower back stays down',
        'Legs straight, slow on the way down',
        'Stop just above the floor',
      ]),
      step('Candlestick hold', 'hold', 3, 20, [
        'Lie on a bench and grip the edge behind your head',
        'Raise the body so only the upper back touches the bench',
        'Body straight, hips extended',
      ]),
      step('Tuck dragon flag hold', 'hold', 3, 10, [
        'From the candlestick, lower with knees tucked',
        'Hold around 45° with hips extended',
        "Don't pike at the hips",
      ]),
      step('Tuck dragon flag negatives', 'reps', 3, 5, [
        'Lower slowly in a tuck over 4–5 s',
        'Only the shoulders touch the bench',
        'Return to the top and repeat',
      ]),
      step('Dragon flag negatives', 'reps', 3, 5, [
        'Legs straight, body rigid as a plank',
        'Lower over 5 s',
        'Stop the rep if the hips bend',
      ]),
      step('Dragon flags', 'reps', 3, 3, [
        'Lower and raise with a straight body',
        'Grip the bench hard',
        'Exhale on the way up',
      ]),
      step('Dragon flags', 'reps', 3, 8, [
        'Smooth, controlled reps',
        'Squeeze the glutes throughout',
        'Mastery!',
      ]),
    ],
  },
  {
    id: 'humanflag',
    name: 'Human Flag',
    short: 'HF',
    category: 'core',
    blurb: 'Hold your body sideways off a vertical pole.',
    requires: ['pullup-4', 'handstand-2'],
    steps: [
      step('Side plank', 'hold', 3, 45, [
        'Elbow under shoulder, hips high',
        'Body in a straight line',
        'Feet stacked',
      ], { side: 'per side' }),
      step('Vertical flag', 'hold', 3, 10, [
        'Grip a pole: top hand pulls, bottom hand pushes',
        'Body vertical, feet off the ground',
        'Arms straight',
      ]),
      step('Tuck human flag', 'hold', 3, 5, [
        'From the vertical flag, tuck the knees and lower toward horizontal',
        'Bottom arm locked and pushing hard',
        'Top arm pulling',
      ]),
      step('One-leg human flag', 'hold', 3, 5, [
        'One leg extended',
        'Hips in line with the shoulders',
        'Alternate legs',
      ]),
      step('Straddle human flag', 'hold', 3, 5, [
        'Legs wide to shorten the lever',
        'Body horizontal',
        'Squeeze the obliques',
      ]),
      step('Human flag', 'hold', 3, 5, [
        'Legs together, body horizontal',
        'Push-pull tension through both arms',
        'Train both sides',
      ]),
      step('Human flag', 'hold', 3, 10, [
        'Long holds',
        'Both sides',
        'Mastery!',
      ]),
    ],
  },
  {
    id: 'pistol',
    name: 'Pistol Squat',
    short: 'PS',
    category: 'legs',
    blurb: 'A full-depth single-leg squat with the other leg held out front.',
    requires: ['found-squat'],
    steps: [
      step('Deep squat hold', 'hold', 3, 30, [
        'Sit all the way down, heels on the floor',
        'Chest up, knees out',
        'Builds ankle and hip mobility',
      ]),
      step('Assisted pistol squat', 'reps', 3, 8, [
        'Hold a pole or door frame for balance',
        'Free leg straight in front',
        'Use the arms as little as possible',
      ], { side: 'per leg' }),
      step('Box pistol squat', 'reps', 3, 8, [
        'Squat on one leg down to a box or bench',
        'Lower the box over time',
        'Stand without rocking',
      ], { side: 'per leg' }),
      step('Pistol negatives', 'reps', 3, 5, [
        'Lower on one leg over 4–5 s to the bottom',
        'Stand up using both legs',
        'Heel stays down',
      ], { side: 'per leg' }),
      step('First pistol squats', 'reps', 3, 1, [
        'Full depth on one leg',
        'Arms forward for balance',
        'Stand up without help',
      ], { side: 'per leg' }),
      step('Pistol squats', 'reps', 3, 5, [
        'Controlled reps',
        'Knee tracks over the toes',
        'Free leg stays off the floor',
      ], { side: 'per leg' }),
      step('Pistol squats', 'reps', 3, 10, [
        'Smooth and balanced',
        'Try holding a weight in front',
        'Mastery!',
      ], { side: 'per leg' }),
    ],
  },
];

// Assign ids/indices and build lookup tables.
export const TREES = RAW_TREES.map((tree) => ({
  ...tree,
  steps: tree.steps.map((s, index) => ({
    ...s,
    id: s.id || `${tree.id}-${index + 1}`,
    index,
    treeId: tree.id,
    cat: s.cat || tree.category,
  })),
}));

export const TREE = Object.fromEntries(TREES.map((t) => [t.id, t]));
export const STEP = Object.fromEntries(TREES.flatMap((t) => t.steps.map((s) => [s.id, s])));
export const SKILL_TREES = TREES.filter((t) => !t.parallel);
export const FOUNDATION = TREE.foundation;
export const ALL_STEPS = Object.values(STEP);

// Benchmarks recorded on the profile page.
export const BENCHMARKS = [
  { key: 'pullups', label: 'Max pull-ups', unit: 'reps' },
  { key: 'pushups', label: 'Max push-ups', unit: 'reps' },
  { key: 'dips', label: 'Max dips', unit: 'reps' },
  { key: 'squats', label: 'Max squats', unit: 'reps' },
  { key: 'hollow', label: 'Hollow hold', unit: 's' },
  { key: 'wallHS', label: 'Wall handstand', unit: 's' },
  { key: 'bodyweight', label: 'Bodyweight', unit: 'kg' },
];
