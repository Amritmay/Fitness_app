// Skill-tree content. Edit this file to change progressions, targets or cues.
//
// Every skill is its own chain from the centre of the wheel (its foundation exercises) out to the
// master skill at the edge. No chain has to be finished before another can start; strength from one
// chain lets you jump ahead in another (see biomech.js).
//
// Step fields:
//   slug   – stable id within the tree (the full id is `${tree.id}-${slug}`; saved data uses it)
//   name   – shown in the UI
//   kind   – 'reps' or 'hold' (hold targets are in seconds)
//   sets   – number of sets needed to master the step
//   target – reps (or seconds) required in EVERY one of those sets
//   side   – optional label such as 'per leg' / 'per side'
//   cues   – short form tips
//   base   – true for the chain's foundation exercises

export const CATEGORIES = {
  pull: { name: 'Pull', color: 'var(--c-pull)' },
  push: { name: 'Push', color: 'var(--c-push)' },
  core: { name: 'Core', color: 'var(--c-core)' },
  legs: { name: 'Legs', color: 'var(--c-legs)' },
};

const step = (slug, name, kind, sets, target, cues, extra = {}) => ({ slug, name, kind, sets, target, cues, ...extra });
const base = { base: true };

// Foundation exercises reused by several chains (each chain still tracks its own copy).
const HOLLOW = (extra = {}) =>
  step('hollow', 'Hollow body hold', 'hold', 3, 30, [
    'Lower back pressed into the floor',
    'Arms overhead, legs straight and low',
    'Raise arms and legs higher to make it easier',
  ], { ...base, ...extra });
const SCAP_PULLS = step('scap', 'Scapular pulls', 'reps', 3, 10, [
  'From a dead hang, pull shoulder blades down and back without bending the elbows',
  'Pause 1 s at the top',
  'Lower with control to a full hang',
], base);
const PUSHUPS = step('pushups', 'Push-ups', 'reps', 3, 12, [
  'Hands under shoulders, body in one straight line',
  'Elbows about 45° from the torso',
  'Chest to the floor, full lockout at the top',
], base);
const PIKE_PUSHUPS = step('pike', 'Pike push-ups', 'reps', 3, 8, [
  'Hips high, body in an upside-down V',
  'Lower the head to a point in front of the hands',
  'Press back up through the shoulders',
], base);
const DIPS = step('dips', 'Parallel bar dips', 'reps', 3, 8, [
  'Start locked out with shoulders pushed down',
  'Lean slightly forward, lower until shoulders dip below elbows',
  'Press back to full lockout',
], base);

const RAW_TREES = [
  {
    id: 'pullup',
    name: 'Pull-up',
    category: 'pull',
    blurb: 'The king of upper-body pulling. From a dead hang to sets of twelve.',
    steps: [
      step('hang', 'Dead hang', 'hold', 3, 30, [
        'Full grip, arms straight, shoulders active — not shrugged into your ears',
        'Ribs down, legs together',
        'Breathe slowly; this builds grip endurance',
      ], base),
      SCAP_PULLS,
      step('rows', 'Australian rows', 'reps', 3, 10, [
        'Bar at hip height, body rigid like a plank',
        'Pull chest to the bar and squeeze the shoulder blades',
        'Walk feet forward to make it harder',
      ], base),
      step('negatives', 'Pull-up negatives', 'reps', 3, 5, [
        'Jump or step to the top, chin over the bar',
        'Lower over 5 seconds to a full dead hang',
        'Reset between reps — quality over speed',
      ]),
      step('first', 'First pull-ups', 'reps', 3, 1, [
        'Start from a dead hang with active shoulders',
        'Drive the elbows down toward your hips',
        'Chin clears the bar — no kicking',
      ]),
      step('5', 'Pull-ups', 'reps', 3, 5, [
        'Full range: dead hang to chin over bar',
        'Legs together, slight hollow body',
        'Rest 2–3 min between sets',
      ]),
      step('8', 'Pull-ups', 'reps', 3, 8, [
        'Smooth tempo with a 1 s pause at the top',
        'Stalled? Add one rep to one set each session',
        'Control the descent',
      ]),
      step('12', 'Pull-ups', 'reps', 3, 12, [
        'Strict reps only',
        'Mastery here makes every pulling skill easier',
        'Try chest-to-bar on the last reps',
      ]),
    ],
  },
  {
    id: 'muscleup',
    name: 'Muscle-up',
    category: 'pull',
    blurb: 'Pull, transition and press over the bar in one move.',
    steps: [
      step('fghang', 'False-grip hang', 'hold', 3, 20, [
        'Wrists over the bar, bar resting in the heel of the palm',
        'Arms straight, shoulders active',
        'This grip makes the transition possible',
      ], base),
      DIPS,
      step('pullups', 'Pull-ups', 'reps', 3, 8, [
        'Full range, chin over the bar',
        'Try them with a false grip as you get stronger',
        'Control the descent',
      ], base),
      step('c2b', 'Chest-to-bar pull-ups', 'reps', 3, 5, [
        'Pull until your lower chest touches the bar',
        'Lean back slightly at the top',
        'Drive the elbows behind your body',
      ]),
      step('sbd', 'Straight bar dips', 'reps', 3, 10, [
        'Support on top of a single bar, leaning over it',
        'Lower until the bar touches your upper abs',
        'Press to full lockout — this is the muscle-up finish',
      ]),
      step('highpull', 'Explosive high pull-ups', 'reps', 3, 3, [
        'Pull as fast as possible from a dead hang',
        'Aim to bring the bar to your belly button',
        'Keep the hips close to the bar',
      ]),
      step('negatives', 'Muscle-up negatives', 'reps', 3, 3, [
        'Start in straight-bar support at the top',
        'Lower slowly through the transition, wrists over the bar',
        'Finish in a controlled hang',
      ]),
      step('kipping', 'Kipping muscle-up', 'reps', 3, 1, [
        'Small hollow-to-arch swing',
        'Pull explosively toward the hips, then whip the chest over',
        'Press out to lockout',
      ]),
      step('strict', 'Strict muscle-up', 'reps', 3, 1, [
        'False grip helps',
        'No swing — pull high, then lean forward fast',
        'Keep the bar close to your body',
      ]),
      step('5', 'Muscle-ups', 'reps', 3, 5, [
        'Consistent strict reps',
        'Smooth transition, no chicken-winging',
        'Control every negative',
      ]),
    ],
  },
  {
    id: 'frontlever',
    name: 'Front Lever',
    category: 'pull',
    blurb: 'Hang horizontally under the bar with straight arms.',
    steps: [
      HOLLOW(),
      SCAP_PULLS,
      step('tuck', 'Tuck front lever', 'hold', 3, 10, [
        'Straight arms, pull the bar toward your hips',
        'Knees to chest, back horizontal',
        'Shoulder blades depressed and retracted',
      ]),
      step('advtuck', 'Advanced tuck front lever', 'hold', 3, 10, [
        'Open the hips so the back is flat, knees at 90°',
        'Arms locked',
        'Posterior pelvic tilt',
      ]),
      step('oneleg', 'One-leg front lever', 'hold', 3, 8, [
        'One leg extended, the other tucked',
        'Alternate legs between sets',
        'Hips level with shoulders',
      ]),
      step('straddle', 'Straddle front lever', 'hold', 3, 8, [
        'Legs wide and straight',
        'Body horizontal, toes pointed',
        'Squeeze the glutes',
      ]),
      step('full5', 'Full front lever', 'hold', 3, 5, [
        'Legs together, body a straight horizontal line',
        'Lats and core fully engaged',
        "Don't let the hips sag",
      ]),
      step('full10', 'Full front lever', 'hold', 3, 10, [
        'Long, quality holds',
        'Shallow, steady breathing',
        'Mastery!',
      ]),
    ],
  },
  {
    id: 'handstand',
    name: 'Handstand',
    category: 'push',
    blurb: 'Balance upside down. The base of most overhead skills.',
    steps: [
      PUSHUPS,
      PIKE_PUSHUPS,
      step('pikehold', 'Box pike hold', 'hold', 3, 30, [
        'Hands on floor, feet on a box, hips stacked over shoulders',
        'Push the floor away, ears between the arms',
        'Legs straight',
      ]),
      step('ctw30', 'Chest-to-wall handstand', 'hold', 3, 30, [
        'Walk the feet up the wall while facing it',
        'Hands 10–20 cm from the wall, body straight',
        'Push tall through the shoulders, squeeze the glutes',
      ]),
      step('ctw60', 'Chest-to-wall handstand', 'hold', 3, 60, [
        'Same line, longer hold',
        'Ribs tucked — no banana back',
        'Point the toes',
      ]),
      step('toepulls', 'Wall toe-pulls', 'hold', 3, 20, [
        'From chest-to-wall, lift the toes off the wall',
        'Balance with finger and palm pressure',
        'Return the toes gently when needed',
      ]),
      step('free5', 'Freestanding handstand', 'hold', 3, 5, [
        'Controlled kick-up, balance with the fingertips',
        'Learn to bail safely (cartwheel out)',
        'Count only clean holds',
      ]),
      step('free15', 'Freestanding handstand', 'hold', 3, 15, [
        'Stack wrists, shoulders, hips and ankles',
        'Small corrections from the fingers',
        'Gaze between your hands',
      ]),
      step('free30', 'Freestanding handstand', 'hold', 3, 30, [
        'Consistent kick-ups',
        'Tight from toes to fingers',
        'Short daily practice beats long rare sessions',
      ]),
      step('free60', 'Freestanding handstand', 'hold', 3, 60, [
        'Mastery hold',
        'Relaxed breathing',
        'Try it on parallettes next',
      ]),
    ],
  },
  {
    id: 'headstand',
    name: 'Headstand',
    category: 'push',
    blurb: 'A tripod headstand — inverted balance with a wide, stable base.',
    steps: [
      step('dolphin', 'Dolphin hold', 'hold', 3, 30, [
        'Forearms down, hips high in an upside-down V',
        'Push the floor away through the forearms',
        'Walk the feet in as you get stronger',
      ], base),
      step('tripodtuck', 'Tripod tuck', 'hold', 3, 15, [
        'Head and hands form a triangle on the floor',
        'Knees rest on the backs of the elbows',
        'Most weight through the hands, not the head',
      ], base),
      step('wall', 'Wall headstand', 'hold', 3, 30, [
        'Tripod base a hand-width from the wall',
        'Legs straight up, heels lightly on the wall',
        'Squeeze the glutes, ribs tucked',
      ]),
      step('free15', 'Freestanding headstand', 'hold', 3, 15, [
        'Tuck up from the tripod, then extend the legs',
        'Push through the hands to take weight off the neck',
        'Learn to roll out safely',
      ]),
      step('free30', 'Freestanding headstand', 'hold', 3, 30, [
        'Straight line from head to toes',
        'Tiny corrections from the hands',
        'Breathe calmly',
      ]),
      step('free60', 'Freestanding headstand', 'hold', 3, 60, [
        'Long, relaxed hold',
        'Keep the neck long and neutral',
        'Point the toes',
      ]),
      step('press', 'Straight-leg press to headstand', 'reps', 3, 3, [
        'Legs straight and wide, lift them up with control',
        'Hips over the head before the legs rise',
        'Mastery!',
      ]),
    ],
  },
  {
    id: 'frogstand',
    name: 'Frog Stand',
    category: 'push',
    blurb: 'Balance on your hands with knees resting on the arms — the gateway to hand balancing.',
    steps: [
      step('plank', 'High plank', 'hold', 3, 30, [
        'Hands under shoulders, arms locked',
        'Body in one straight line',
        'Spread the fingers and grip the floor',
      ], base),
      step('lean', 'Frog lean', 'hold', 3, 15, [
        'Squat with hands planted shoulder-width in front',
        'Knees on the backs of the upper arms, toes on the floor',
        'Shift weight forward onto the hands',
      ], base),
      step('onefoot', 'One-foot frog stand', 'hold', 3, 10, [
        'From the frog lean, lift one foot',
        'Look slightly forward, not down',
        'Alternate feet each set',
      ]),
      step('15', 'Frog stand', 'hold', 3, 15, [
        'Both feet off the floor',
        'Fingertips press to stop tipping forward',
        'Elbows stay bent, knees on the arms',
      ]),
      step('30', 'Frog stand', 'hold', 3, 30, [
        'Long, calm balance',
        'Small corrections from the fingers',
        'Breathe steadily',
      ]),
      step('crow15', 'Crow pose', 'hold', 3, 15, [
        'Knees higher on the triceps, arms straighter',
        'Hips up, feet together',
        'Gaze forward',
      ]),
      step('crow30', 'Crow pose', 'hold', 3, 30, [
        'Straightest arms you can hold',
        'Steady balance',
        'Mastery!',
      ]),
    ],
  },
  {
    id: 'tuckplanche',
    name: 'Tuck Planche',
    category: 'push',
    blurb: 'Straight arms, knees tucked, body floating — the first true planche hold.',
    steps: [
      step('lean', 'Planche lean', 'hold', 3, 20, [
        'Push-up position, fingers turned out',
        'Lean the shoulders well past the hands',
        'Protract the shoulders and lock the elbows',
      ], base),
      step('pppu', 'Pseudo planche push-ups', 'reps', 3, 8, [
        'Keep the forward lean throughout',
        'Hands near the hips',
        'Protract at the top',
      ], base),
      step('safrog', 'Straight-arm frog stand', 'hold', 3, 15, [
        'Frog stand with the arms locked straight',
        'Knees pressing into the outside of the arms',
        'Push the floor away',
      ]),
      step('5', 'Tuck planche', 'hold', 3, 5, [
        'Knees off the arms, tucked to the chest',
        'Hips at shoulder height',
        'Shoulders protracted and depressed',
      ]),
      step('10', 'Tuck planche', 'hold', 3, 10, [
        'Same position, longer hold',
        'Round the upper back',
        'Keep the elbows locked',
      ]),
      step('20', 'Tuck planche', 'hold', 3, 20, [
        'Solid, controlled hold',
        'Next stop: advanced tuck',
        'Mastery!',
      ]),
    ],
  },
  {
    id: 'planche',
    name: 'Planche',
    category: 'push',
    blurb: 'Hold the body horizontal above the floor on straight arms.',
    steps: [
      PUSHUPS,
      step('scappush', 'Scapular push-ups', 'reps', 3, 10, [
        'Push-up position, arms locked',
        'Let the chest sink between the shoulder blades, then push the floor away',
        'Full protraction at the top — this is the planche shoulder position',
      ], base),
      step('lean', 'Planche lean', 'hold', 3, 20, [
        'Push-up position, fingers turned out',
        'Lean the shoulders well past the hands',
        'Protract the shoulders and lock the elbows',
      ]),
      step('pppu', 'Pseudo planche push-ups', 'reps', 3, 8, [
        'Keep the forward lean throughout',
        'Hands near the hips',
        'Protract at the top',
      ]),
      step('frog', 'Frog stand', 'hold', 3, 30, [
        'Knees rest on the backs of the elbows',
        'Lean forward until the feet lift',
        'Look slightly ahead',
      ]),
      step('tuck', 'Tuck planche', 'hold', 3, 10, [
        'Straight arms, knees tucked, feet off the floor',
        'Hips at shoulder height',
        'Shoulders protracted and depressed',
      ]),
      step('advtuck', 'Advanced tuck planche', 'hold', 3, 10, [
        'Flat back, hips open to 90°',
        'Lean further as the lever lengthens',
        'Elbows locked',
      ]),
      step('straddle', 'Straddle planche', 'hold', 3, 5, [
        'Legs wide, body horizontal',
        'Squeeze the glutes, point the toes',
        'Big forward lean',
      ]),
      step('full', 'Full planche', 'hold', 3, 5, [
        'Legs together, body parallel to the floor',
        'The peak of pushing strength',
        'Mastery!',
      ]),
    ],
  },
  {
    id: 'lsit',
    name: 'L-Sit',
    category: 'core',
    blurb: 'Support your body with legs held straight out in front.',
    steps: [
      HOLLOW(),
      step('legLifts', 'Seated leg lifts', 'reps', 3, 10, [
        'Sit with legs straight, hands beside the knees',
        'Lift both heels off the floor and hold 1 s',
        'Builds the hip-flexor compression an L-sit needs',
      ], base),
      step('support', 'Support hold', 'hold', 3, 30, [
        'Arms locked, shoulders pushed down away from the ears',
        'Body straight, legs together',
        'Parallel bars, parallettes or two sturdy chairs',
      ]),
      step('footsupported', 'Foot-supported L-sit', 'hold', 3, 20, [
        'Sit with hands beside the hips, heels on the floor',
        'Press up so the hips lift',
        'Shoulders down',
      ]),
      step('tuck', 'Tuck L-sit', 'hold', 3, 15, [
        'Lift both feet, knees to chest',
        'Arms locked, shoulders depressed',
        'Hips level with the hands',
      ]),
      step('oneleg', 'One-leg L-sit', 'hold', 3, 15, [
        'One leg straight, the other tucked',
        'Alternate legs each set',
        'Lift the straight leg with the hip flexors',
      ]),
      step('full10', 'Full L-sit', 'hold', 3, 10, [
        'Both legs straight and parallel to the floor',
        'Point the toes, lock the knees',
        'Lean back slightly if needed',
      ]),
      step('full30', 'Full L-sit', 'hold', 3, 30, [
        'Long, solid hold',
        'Steady breathing',
        'Next challenge: V-sit',
      ]),
    ],
  },
  {
    id: 'dragonflag',
    name: 'Dragon Flag',
    category: 'core',
    blurb: 'Lower a rigid body from a bench with only the shoulders down.',
    steps: [
      HOLLOW(),
      step('legraises', 'Lying leg raises', 'reps', 3, 12, [
        'Lower back stays down',
        'Legs straight, slow on the way down',
        'Stop just above the floor',
      ], base),
      step('candlestick', 'Candlestick hold', 'hold', 3, 20, [
        'Lie on a bench and grip the edge behind your head',
        'Raise the body so only the upper back touches the bench',
        'Body straight, hips extended',
      ]),
      step('tuckhold', 'Tuck dragon flag hold', 'hold', 3, 10, [
        'From the candlestick, lower with knees tucked',
        'Hold around 45° with hips extended',
        "Don't pike at the hips",
      ]),
      step('tucknegatives', 'Tuck dragon flag negatives', 'reps', 3, 5, [
        'Lower slowly in a tuck over 4–5 s',
        'Only the shoulders touch the bench',
        'Return to the top and repeat',
      ]),
      step('negatives', 'Dragon flag negatives', 'reps', 3, 5, [
        'Legs straight, body rigid as a plank',
        'Lower over 5 s',
        'Stop the rep if the hips bend',
      ]),
      step('3', 'Dragon flags', 'reps', 3, 3, [
        'Lower and raise with a straight body',
        'Grip the bench hard',
        'Exhale on the way up',
      ]),
      step('8', 'Dragon flags', 'reps', 3, 8, [
        'Smooth, controlled reps',
        'Squeeze the glutes throughout',
        'Mastery!',
      ]),
    ],
  },
  {
    id: 'elbowlever',
    name: 'Elbow Lever',
    category: 'core',
    blurb: 'Balance horizontally on your hands with the elbows dug into your hips.',
    steps: [
      step('plank', 'Forearm plank', 'hold', 3, 45, [
        'Elbows under shoulders, body straight',
        'Squeeze the glutes, ribs down',
        'No sagging hips',
      ], base),
      step('lean', 'Elbow lever lean', 'hold', 3, 20, [
        'Hands together, fingers back, elbows into the hips',
        'Lean forward onto the elbows, toes on the floor',
        'Find the balance point',
      ], base),
      step('assisted', 'Feet-assisted elbow lever', 'hold', 3, 15, [
        'Lift until only the toes touch lightly',
        'Body straight and rigid',
        'Balance over the hands',
      ]),
      step('10', 'Elbow lever', 'hold', 3, 10, [
        'Feet off the floor, body horizontal',
        'Elbows locked into the hip bones',
        'Squeeze everything',
      ]),
      step('30', 'Elbow lever', 'hold', 3, 30, [
        'Long, stable hold',
        'Small corrections from the fingers',
        'Steady breathing',
      ]),
      step('onearm5', 'One-arm elbow lever', 'hold', 3, 5, [
        'One elbow into the side of the hip',
        'Free arm out for balance',
        'Train both sides',
      ], { side: 'per side' }),
      step('onearm15', 'One-arm elbow lever', 'hold', 3, 15, [
        'Rigid body, controlled balance',
        'Both sides',
        'Mastery!',
      ], { side: 'per side' }),
    ],
  },
  {
    id: 'humanflag',
    name: 'Human Flag',
    category: 'core',
    blurb: 'Hold your body sideways off a vertical pole.',
    steps: [
      step('sideplank', 'Side plank', 'hold', 3, 45, [
        'Elbow under shoulder, hips high',
        'Body in a straight line',
        'Feet stacked',
      ], { ...base, side: 'per side' }),
      step('pullups', 'Pull-ups', 'reps', 3, 5, [
        'The top arm of a flag pulls — build it here',
        'Full range, controlled',
        'Rest 2 min between sets',
      ], base),
      PIKE_PUSHUPS,
      step('vertical', 'Vertical flag', 'hold', 3, 10, [
        'Grip a pole: top hand pulls, bottom hand pushes',
        'Body vertical, feet off the ground',
        'Arms straight',
      ]),
      step('tuck', 'Tuck human flag', 'hold', 3, 5, [
        'From the vertical flag, tuck the knees and lower toward horizontal',
        'Bottom arm locked and pushing hard',
        'Top arm pulling',
      ]),
      step('oneleg', 'One-leg human flag', 'hold', 3, 5, [
        'One leg extended',
        'Hips in line with the shoulders',
        'Alternate legs',
      ]),
      step('straddle', 'Straddle human flag', 'hold', 3, 5, [
        'Legs wide to shorten the lever',
        'Body horizontal',
        'Squeeze the obliques',
      ]),
      step('full5', 'Human flag', 'hold', 3, 5, [
        'Legs together, body horizontal',
        'Push-pull tension through both arms',
        'Train both sides',
      ]),
      step('full10', 'Human flag', 'hold', 3, 10, [
        'Long holds',
        'Both sides',
        'Mastery!',
      ]),
    ],
  },
  {
    id: 'pistol',
    name: 'Pistol Squat',
    category: 'legs',
    blurb: 'A full-depth single-leg squat with the other leg held out front.',
    steps: [
      step('squats', 'Bodyweight squats', 'reps', 3, 20, [
        'Feet shoulder-width, toes slightly out',
        'Hips below knees, heels down',
        'Knees track over toes, chest up',
      ], base),
      step('deepsquat', 'Deep squat hold', 'hold', 3, 30, [
        'Sit all the way down, heels on the floor',
        'Chest up, knees out',
        'Builds ankle and hip mobility',
      ], base),
      step('assisted', 'Assisted pistol squat', 'reps', 3, 8, [
        'Hold a pole or door frame for balance',
        'Free leg straight in front',
        'Use the arms as little as possible',
      ], { side: 'per leg' }),
      step('box', 'Box pistol squat', 'reps', 3, 8, [
        'Squat on one leg down to a box or bench',
        'Lower the box over time',
        'Stand without rocking',
      ], { side: 'per leg' }),
      step('negatives', 'Pistol negatives', 'reps', 3, 5, [
        'Lower on one leg over 4–5 s to the bottom',
        'Stand up using both legs',
        'Heel stays down',
      ], { side: 'per leg' }),
      step('first', 'First pistol squats', 'reps', 3, 1, [
        'Full depth on one leg',
        'Arms forward for balance',
        'Stand up without help',
      ], { side: 'per leg' }),
      step('5', 'Pistol squats', 'reps', 3, 5, [
        'Controlled reps',
        'Knee tracks over the toes',
        'Free leg stays off the floor',
      ], { side: 'per leg' }),
      step('10', 'Pistol squats', 'reps', 3, 10, [
        'Smooth and balanced',
        'Try holding a weight in front',
        'Mastery!',
      ], { side: 'per leg' }),
    ],
  },
  {
    id: 'dragonsquat',
    name: 'Dragon Squat',
    category: 'legs',
    blurb: 'A single-leg squat with the free leg passing behind the standing leg — balance, mobility and strength.',
    steps: [
      step('curtsy', 'Curtsy lunges', 'reps', 3, 10, [
        'Step one leg diagonally behind the other',
        'Sink until the back knee nearly touches the floor',
        'Front knee tracks over the toes',
      ], { ...base, side: 'per leg' }),
      step('skater', 'Skater squats', 'reps', 3, 6, [
        'Stand on one leg, the other bent behind you',
        'Lower until the back knee touches a pad',
        'Arms forward for balance',
      ], { side: 'per leg' }),
      step('assisted', 'Assisted dragon squats', 'reps', 3, 5, [
        'Hold a pole with one hand',
        'Thread the free leg behind and across the standing leg',
        'Sit down onto the standing heel, then stand',
      ], { side: 'per leg' }),
      step('negatives', 'Dragon squat negatives', 'reps', 3, 3, [
        'Lower over 4–5 s without help',
        'Keep the free leg behind and off the floor',
        'Stand up with support if needed',
      ], { side: 'per leg' }),
      step('first', 'First dragon squats', 'reps', 3, 1, [
        'Full depth, no support',
        'Torso upright, arms forward',
        'Stand up without touching down',
      ], { side: 'per leg' }),
      step('5', 'Dragon squats', 'reps', 3, 5, [
        'Smooth, controlled reps',
        'Hips square, knee tracking out',
        'Mastery!',
      ], { side: 'per leg' }),
    ],
  },
  {
    id: 'cossack',
    name: 'Cossack Squat',
    category: 'legs',
    blurb: 'A deep side-to-side squat for adductor strength and hip mobility.',
    steps: [
      step('lateral', 'Lateral lunges', 'reps', 3, 10, [
        'Wide stance, step and sit into one hip',
        'The other leg stays straight',
        'Chest up, heels down',
      ], { ...base, side: 'per side' }),
      step('assisted', 'Assisted Cossack squats', 'reps', 3, 8, [
        'Hold a pole or door frame',
        'Sit all the way down on one side, the other leg straight with toes up',
        'Shift side to side without standing up fully',
      ], { side: 'per side' }),
      step('6', 'Cossack squats', 'reps', 3, 6, [
        'No support, arms forward',
        'Bottom heel stays down',
        'Straight leg toes point up',
      ], { side: 'per side' }),
      step('12', 'Cossack squats', 'reps', 3, 12, [
        'Controlled tempo through the bottom',
        'Hips low as you shift sides',
        'Breathe out on the way up',
      ], { side: 'per side' }),
      step('deep', 'Deep Cossack squats', 'reps', 3, 12, [
        'Hips to the heel at the bottom',
        'Pause 2 s in the deepest position',
        'Mastery!',
      ], { side: 'per side' }),
    ],
  },
  {
    id: 'squat',
    name: 'Bodyweight Squat',
    short: 'Squat',
    category: 'legs',
    blurb: 'The base of all leg training — depth, control and endurance.',
    steps: [
      step('box', 'Box squats', 'reps', 3, 15, [
        'Sit back to a box or chair, then stand',
        'Feet shoulder-width, knees out',
        'Touch the box lightly — don’t flop',
      ], base),
      step('20', 'Bodyweight squats', 'reps', 3, 20, [
        'Hips below knees, heels down',
        'Knees track over toes, chest up',
        'Stand all the way up',
      ], base),
      step('tempo', 'Tempo squats', 'reps', 3, 15, [
        '3 s down, 1 s pause, 1 s up',
        'Stay tight through the bottom',
        'Builds control and strength at depth',
      ]),
      step('jump', 'Jump squats', 'reps', 3, 12, [
        'Squat to parallel, then jump explosively',
        'Land softly and sink straight into the next rep',
        'Arms drive up',
      ]),
      step('50', 'Bodyweight squats', 'reps', 3, 50, [
        'Steady rhythm, full depth',
        'Breathe every rep',
        'Mastery!',
      ]),
    ],
  },
  {
    id: 'splitsquat',
    name: 'Bulgarian Split Squat',
    short: 'Split Squat',
    category: 'legs',
    blurb: 'Rear-foot-elevated single-leg squats for quads and glutes.',
    steps: [
      step('split', 'Split squats', 'reps', 3, 10, [
        'Long stance, both feet on the floor',
        'Lower the back knee toward the floor',
        'Most of the weight on the front leg',
      ], { ...base, side: 'per leg' }),
      step('8', 'Bulgarian split squats', 'reps', 3, 8, [
        'Back foot on a bench, laces down',
        'Front shin roughly vertical',
        'Drive up through the front heel',
      ], { side: 'per leg' }),
      step('12', 'Bulgarian split squats', 'reps', 3, 12, [
        'Full depth every rep',
        'Hips square to the front',
        'Control the descent',
      ], { side: 'per leg' }),
      step('tempo', 'Tempo Bulgarian split squats', 'reps', 3, 10, [
        '3 s down, 1 s pause at the bottom',
        'Stay balanced over the front foot',
        'No bouncing',
      ], { side: 'per leg' }),
      step('20', 'Bulgarian split squats', 'reps', 3, 20, [
        'High-rep strength endurance',
        'Keep the torso upright',
        'Mastery!',
      ], { side: 'per leg' }),
    ],
  },
  {
    id: 'wallsit',
    name: 'Wall Sit Calf Raises',
    short: 'Wall Sit Calf',
    category: 'legs',
    blurb: 'Static quad strength combined with soleus (lower calf) work.',
    steps: [
      step('30', 'Wall sit', 'hold', 3, 30, [
        'Back flat on the wall, thighs parallel to the floor',
        'Knees over ankles',
        'Arms off the legs',
      ], base),
      step('60', 'Wall sit', 'hold', 3, 60, [
        'Same position, longer hold',
        'Breathe steadily',
        'Push the back into the wall',
      ], base),
      step('calf15', 'Wall sit calf raises', 'reps', 3, 15, [
        'Hold the wall sit and raise both heels',
        'Pause at the top, lower slowly',
        'Keep thighs parallel the whole time',
      ]),
      step('calf30', 'Wall sit calf raises', 'reps', 3, 30, [
        'Same as before, more reps',
        'Full range at the ankle',
        'Don’t let the hips rise',
      ]),
      step('single', 'Single-leg wall sit', 'hold', 3, 20, [
        'Wall sit, then lift one foot off the floor',
        'Hips level, knee over the ankle',
        'Mastery!',
      ], { side: 'per leg' }),
    ],
  },
  {
    id: 'calfraise',
    name: 'Standing Calf Raises',
    short: 'Calf Raises',
    category: 'legs',
    blurb: 'Ankle strength and calf endurance — protects the Achilles and improves jumping.',
    steps: [
      step('20', 'Calf raises', 'reps', 3, 20, [
        'Stand tall, rise onto the balls of the feet',
        'Pause 1 s at the top',
        'Lower all the way down',
      ], base),
      step('step', 'Calf raises off a step', 'reps', 3, 20, [
        'Heels hanging off a step',
        'Full stretch at the bottom, full rise at the top',
        'Hold a wall lightly for balance',
      ]),
      step('single', 'Single-leg calf raises', 'reps', 3, 12, [
        'One foot, flat ground',
        'Rise as high as possible',
        'Slow 2 s lowering',
      ], { side: 'per leg' }),
      step('deficit', 'Single-leg deficit calf raises', 'reps', 3, 15, [
        'One foot, heel hanging off a step',
        'Full range every rep',
        'Keep the knee straight',
      ], { side: 'per leg' }),
      step('25', 'Single-leg calf raises', 'reps', 3, 25, [
        'Off a step, full range',
        'Steady tempo',
        'Mastery!',
      ], { side: 'per leg' }),
    ],
  },
  {
    id: 'nordic',
    name: 'Nordic Curl',
    category: 'legs',
    blurb: 'Eccentric hamstring strength — one of the best exercises for knee and hamstring health.',
    steps: [
      step('bridge', 'Glute bridges', 'reps', 3, 15, [
        'Feet flat, drive the hips up',
        'Squeeze the glutes at the top',
        'Ribs down, no arching',
      ], base),
      step('singlebridge', 'Single-leg glute bridges', 'reps', 3, 12, [
        'One foot on the floor, the other leg straight',
        'Hips level as you rise',
        'Pause at the top',
      ], { ...base, side: 'per leg' }),
      step('slides', 'Sliding leg curls', 'reps', 3, 10, [
        'Heels on a towel or sliders, hips up in a bridge',
        'Slide the heels out and back in',
        'Keep the hips high',
      ]),
      step('partial', 'Partial Nordic negatives', 'reps', 3, 6, [
        'Kneel with ankles anchored',
        'Lower forward as far as you can control, then push back with the hands',
        'Body straight from knees to head',
      ]),
      step('negatives', 'Nordic negatives', 'reps', 3, 5, [
        'Lower all the way to the floor over 4–6 s',
        'Catch yourself with the hands',
        'Hips stay extended',
      ]),
      step('3', 'Nordic curls', 'reps', 3, 3, [
        'Lower under control, then curl back up with the hamstrings',
        'Minimal push from the hands',
        'Keep the body straight',
      ]),
      step('8', 'Nordic curls', 'reps', 3, 8, [
        'Full reps, no hands',
        'Smooth both ways',
        'Mastery!',
      ]),
    ],
  },
];

// Assign ids/indices and build lookup tables.
export const TREES = RAW_TREES.map((tree) => ({
  ...tree,
  requires: [],
  steps: tree.steps.map((s, index) => ({
    ...s,
    id: `${tree.id}-${s.slug}`,
    index,
    treeId: tree.id,
    cat: tree.category,
  })),
}));

export const TREE = Object.fromEntries(TREES.map((t) => [t.id, t]));
export const STEP = Object.fromEntries(TREES.flatMap((t) => t.steps.map((s) => [s.id, s])));
export const SKILL_TREES = TREES;
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

// Saved data from version 1 (shared foundation tree, index-based ids) → version 2 ids.
// A v1 id can map to several v2 steps (e.g. the shared hollow hold now lives in three chains).
const v1 = (tree, slugs) => Object.fromEntries(slugs.map((s, i) => [`${tree}-${i + 1}`, [`${tree}-${s}`]]));
export const MIGRATE_V1 = {
  'found-hang': ['pullup-hang'],
  'found-scap': ['pullup-scap', 'frontlever-scap'],
  'found-pushup': ['handstand-pushups', 'planche-pushups'],
  'found-dips': ['muscleup-dips'],
  'found-squat': ['pistol-squats'],
  'found-hollow': ['frontlever-hollow', 'lsit-hollow', 'dragonflag-hollow'],
  ...v1('pullup', ['rows', 'negatives', 'first', '5', '8', '12']),
  ...v1('muscleup', ['c2b', 'sbd', 'highpull', 'negatives', 'kipping', 'strict', '5']),
  ...v1('frontlever', ['tuck', 'advtuck', 'oneleg', 'straddle', 'full5', 'full10']),
  ...v1('handstand', ['pikehold', 'ctw30', 'ctw60', 'toepulls', 'free5', 'free15', 'free30', 'free60']),
  ...v1('planche', ['lean', 'pppu', 'frog', 'tuck', 'advtuck', 'straddle', 'full']),
  ...v1('lsit', ['support', 'footsupported', 'tuck', 'oneleg', 'full10', 'full30']),
  ...v1('dragonflag', ['legraises', 'candlestick', 'tuckhold', 'tucknegatives', 'negatives', '3', '8']),
  ...v1('humanflag', ['sideplank', 'vertical', 'tuck', 'oneleg', 'straddle', 'full5', 'full10']),
  ...v1('pistol', ['deepsquat', 'assisted', 'box', 'negatives', 'first', '5', '10']),
};
