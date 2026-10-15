// Radial skill wheel drawn as a tree, plus the horizontal tracks on tree rows and tree pages.
//
// • Every skill is a straight chain from the centre (its foundation exercises) to the edge (mastery).
// • Spokes follow WHEEL_ORDER so chains that share muscles sit side by side.
// • BRIDGES between neighbouring chains are drawn as straight branches you can jump along, styled like
//   the chains: grey when untrained, green when both ends are mastered, blue dotted to an open jump.
import { TREE, STEP } from './data.js';
import { state } from './store.js';
import { stepStatus, currentStep, treeState, isMastered, allJumps } from './engine.js';
import { BRIDGES, WHEEL_ORDER } from './biomech.js';
import { esc } from './ui.js';

const C = 180; // centre of the 360×360 viewBox
const R_TRUNK = 26; // radius of the first step
const R_MAX = 146; // outermost step radius
const R_START = 9; // where chains leave the hub
const R_LABEL = 160;

const ORDERED = WHEEL_ORDER.map((id) => TREE[id]);
const SPOKE_DEG = 360 / ORDERED.length;
const MAX_STEPS = Math.max(...ORDERED.map((t) => t.steps.length));
const GAP = (R_MAX - R_TRUNK) / (MAX_STEPS - 1); // same spacing on every chain so rings line up

const rad = (deg) => (deg * Math.PI) / 180;
const pt = (r, a) => [C + r * Math.cos(rad(a)), C + r * Math.sin(rad(a))];
const f = (n) => n.toFixed(1);

// Static geometry: angle of each spoke and radius of each step.
const LAYOUT = Object.fromEntries(
  ORDERED.map((tree, k) => {
    const a = -90 + k * SPOKE_DEG;
    return [tree.id, { a, k, radii: tree.steps.map((_, i) => R_TRUNK + i * GAP), angs: tree.steps.map(() => a), start: pt(R_START, a) }];
  })
);

const posOf = (stepId) => {
  const st = STEP[stepId];
  const l = LAYOUT[st.treeId];
  return l ? pt(l.radii[st.index], l.angs[st.index]) : [C, C];
};

const adjacent = (t1, t2) => {
  const d = Math.abs(LAYOUT[t1].k - LAYOUT[t2].k);
  return d === 1 || d === ORDERED.length - 1;
};

const line = (cls, [x1, y1], [x2, y2]) => `<line class="${cls}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
const poly = (cls, pts) => (pts.length > 1 ? `<polyline class="${cls}" points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}"/>` : '');

function arc(r, a1, a2, sweep) {
  const [x1, y1] = pt(r, a1);
  const [x2, y2] = pt(r, a2);
  return `M${f(x1)},${f(y1)} A${r},${r} 0 0 ${sweep} ${f(x2)},${f(y2)}`;
}

function sector(r1, r2, a1, a2) {
  const [ax, ay] = pt(r1, a1);
  const [bx, by] = pt(r2, a1);
  const [cx, cy] = pt(r2, a2);
  const [dx, dy] = pt(r1, a2);
  return `M${f(ax)},${f(ay)} L${f(bx)},${f(by)} A${r2},${r2} 0 0 1 ${f(cx)},${f(cy)} L${f(dx)},${f(dy)} A${r1},${r1} 0 0 0 ${f(ax)},${f(ay)} Z`;
}

function lockBadge(x, y) {
  return `<g class="wh-lockbadge" transform="translate(${f(x)} ${f(y)})">
    <circle r="7"/><rect x="-2.6" y="-0.6" width="5.2" height="4" rx="0.8"/><path d="M-1.6,-0.6 v-1.4 a1.6,1.6 0 0 1 3.2,0 v1.4"/>
  </g>`;
}

// Leading run of mastered steps, the current step (if the tree isn't locked/complete), per-step status.
function treeDots(tree, jumpTargets = new Set()) {
  const ts = treeState(state, tree);
  const cur = ts === 'active' ? currentStep(state, tree) : null;
  let lead = 0;
  while (lead < tree.steps.length && stepStatus(state, tree.steps[lead].id) === 'mastered') lead++;
  const dots = tree.steps.map((st) => ({
    st,
    kind: cur && st.id === cur.id ? 'cur' : stepStatus(state, st.id) === 'mastered' ? 'done' : jumpTargets.has(st.id) ? 'jump' : 'lock',
  }));
  return { ts, cur, lead, dots };
}

function dot(kind, [x, y], scale = 1) {
  if (kind === 'cur') return `<circle class="wh-halo" cx="${f(x)}" cy="${f(y)}" r="${9 * scale}"/><circle class="wh-cur" cx="${f(x)}" cy="${f(y)}" r="${4.6 * scale}"/>`;
  if (kind === 'jump') return `<circle class="wh-cur" cx="${f(x)}" cy="${f(y)}" r="${3.6 * scale}"/>`;
  if (kind === 'done') return `<circle class="wh-done" cx="${f(x)}" cy="${f(y)}" r="${3.4 * scale}"/>`;
  return `<circle class="wh-lock" cx="${f(x)}" cy="${f(y)}" r="${2.4 * scale}"/>`;
}

// Style for a link between two steps, matching how the spokes themselves are drawn.
function linkClass(a, b, jumpTargets) {
  const ma = isMastered(state, a);
  const mb = isMastered(state, b);
  if (ma && mb) return 'wh-path';
  if ((ma && jumpTargets.has(b)) || (mb && jumpTargets.has(a))) return 'wh-next';
  return 'wh-guide';
}

// Steps involved in an open jump (the test step and the steps it would skip).
function jumpSteps() {
  return new Set(allJumps(state).flatMap((j) => [j.target.id, ...j.skipped.map((x) => x.id)]));
}

export function skillWheel() {
  const jumpTargets = new Set(allJumps(state).map((j) => j.target.id));
  const inJump = jumpSteps();

  let rings = '';
  for (let r = R_TRUNK; r <= R_MAX + 1; r += GAP) rings += `<circle class="wh-ring" cx="${C}" cy="${C}" r="${r}"/>`;
  rings += `<circle class="wh-outer" cx="${C}" cy="${C}" r="${R_LABEL - 9}"/>`;

  // Faint "ghost" dots between spokes give the wheel its constellation texture.
  let ghosts = '';
  ORDERED.forEach((_, k) => {
    const a = -90 + k * SPOKE_DEG + SPOKE_DEG / 2;
    for (let r = R_TRUNK + GAP * 1.5; r < R_MAX; r += GAP) {
      const [x, y] = pt(r, a);
      ghosts += `<circle class="wh-ghost" cx="${f(x)}" cy="${f(y)}" r="1.1"/>`;
    }
  });

  // Jump branches between neighbouring chains.
  const links = BRIDGES.filter((b) => adjacent(STEP[b.a].treeId, STEP[b.b].treeId))
    .map((b) => line(`${linkClass(b.a, b.b, inJump)} wh-branch`, posOf(b.a), posOf(b.b)))
    .join('');

  const spokes = ORDERED.map((tree) => {
    const { a, radii, angs, start } = LAYOUT[tree.id];
    const { ts, cur, lead, dots } = treeDots(tree, jumpTargets);
    const pts = [start, ...radii.map((r, i) => pt(r, angs[i]))];
    let paths = poly('wh-guide', pts);
    if (lead > 0) paths += poly('wh-path', pts.slice(0, lead + 1));
    if (cur) paths += line('wh-next', pts[lead], pts[cur.index + 1]);
    const circles = dots.map(({ kind }, i) => dot(kind, pts[i + 1])).join('');

    // Curved label: read left→right on both halves of the wheel.
    const bottom = Math.sin(rad(a)) > 0.15;
    const span = SPOKE_DEG / 2 - 2;
    const labelPath = bottom ? arc(R_LABEL + 7, a + span, a - span, 0) : arc(R_LABEL, a - span, a + span, 1);
    const label = `<path id="wl-${tree.id}" d="${labelPath}" fill="none"/>
      <text class="wh-label ${ts}"><textPath href="#wl-${tree.id}" startOffset="50%" text-anchor="middle">${esc(tree.name.toUpperCase())}</textPath></text>`;
    const lock = ts === 'locked' ? lockBadge(...pt(Math.min(radii[radii.length - 1] + 9, R_LABEL - 9), angs[angs.length - 1])) : '';
    const hit = `<path class="wh-hit" d="${sector(20, R_LABEL + 16, a - SPOKE_DEG / 2, a + SPOKE_DEG / 2)}"/>`;
    const title = `${tree.name}: ${ts === 'complete' ? 'mastered' : ts === 'locked' ? 'locked' : `now ${cur.name}`}`;

    return `<a class="wh-spoke" href="#/tree/${tree.id}" aria-label="${esc(title)}"><title>${esc(title)}</title>${hit}${paths}${circles}${label}${lock}</a>`;
  }).join('');

  const hub = `<circle class="wh-core" cx="${C}" cy="${C}" r="5"/>`;

  return `<svg class="wheel" viewBox="0 0 360 360" role="img" aria-label="Skill wheel">${rings}${ghosts}<g class="wh-links">${links}</g>${spokes}${hub}</svg>`;
}

// Jump branches off a tree: one per related chain (the earliest), at most four.
function treeBranches(tree) {
  const out = [];
  for (const b of BRIDGES) {
    if (STEP[b.a].treeId === tree.id) out.push({ at: STEP[b.a].index, here: b.a, other: STEP[b.b] });
    else if (STEP[b.b].treeId === tree.id) out.push({ at: STEP[b.b].index, here: b.b, other: STEP[b.a] });
  }
  const seen = new Set();
  return out
    .sort((x, y) => x.at - y.at)
    .filter((l) => (seen.has(l.other.treeId) ? false : seen.add(l.other.treeId)))
    .slice(0, 4);
}

// Horizontal dot track for one tree. The big version (tree pages) shows branches to related trees.
export function treeTrack(tree, { big = false } = {}) {
  const jumpTargets = big ? new Set(allJumps(state).map((j) => j.target.id)) : new Set();
  const { cur, lead, dots } = treeDots(tree, jumpTargets);
  const parallel = tree.parallel;
  const branches = big && !parallel ? treeBranches(tree) : [];
  const W = big ? 360 : 92;
  const H = big ? (branches.length ? 132 : 64) : 14;
  const pad = big ? 14 : 5;
  const right = branches.length ? W - 112 : W - pad;
  const y = H / 2;
  const x = (i) => pad + (dots.length === 1 ? 0 : (i * (right - pad)) / (dots.length - 1));
  const p = (i) => [x(i), y];
  const scale = big ? 1.35 : 0.7;

  let deco = '';
  if (big) {
    const count = 16;
    for (let i = 0; i < count; i++) {
      const dx = pad + ((i + 0.5) * (W - 2 * pad)) / count + ((i * 7) % 9) - 4;
      const dy = (i % 2 ? 9 : H - 9) + ((i * 5) % 7) - 3;
      deco += `<circle class="wh-ghost" cx="${f(dx)}" cy="${f(dy)}" r="1.4"/>`;
    }
  }

  // Branches fan out above and below the main track, earliest ones on the outside so they don't cross.
  let branchSvg = '';
  if (branches.length) {
    const up = branches.filter((_, i) => i % 2 === 0);
    const down = branches.filter((_, i) => i % 2 === 1);
    const rows = [
      ...up.map((b, i) => ({ b, ry: y - 26 * (up.length - i) })),
      ...down.map((b, i) => ({ b, ry: y + 26 * (down.length - i) })),
    ];
    branchSvg = rows
      .map(({ b, ry }) => {
        const from = p(b.at);
        const turn = [Math.min(from[0] + 30, right - 6), ry];
        const end = [right + 22, ry];
        // The branch is "next" (blue) when it leads to a step you can train or test right now.
        const ready = jumpTargets.has(b.other.id) || stepStatus(state, b.other.id) === 'available';
        let cls = linkClass(b.here, b.other.id, jumpSteps());
        if (cls === 'wh-guide' && ready && isMastered(state, b.here)) cls = 'wh-next';
        const kind = isMastered(state, b.other.id) ? 'done' : ready ? 'jump' : 'lock';
        const mid = [(turn[0] + end[0]) / 2, ry];
        const other = TREE[b.other.treeId];
        return `<a class="br-branch" href="#/tree/${other.id}"><title>${esc(`${other.name}: ${b.other.name}`)}</title>
          ${poly(cls, [from, turn, end])}${dot(kind, mid, 1.1)}${dot(kind, end, 1.1)}
          <text class="br-label" x="${f(end[0] + 9)}" y="${f(ry + 3.5)}">${esc(other.name)}</text></a>`;
      })
      .join('');
  }

  let lines = parallel ? '' : line('wh-guide', p(0), p(dots.length - 1));
  if (!parallel && lead > 1) lines += line('wh-path', p(0), p(lead - 1));
  if (!parallel && cur && lead > 0) lines += line('wh-next', p(lead - 1), p(cur.index));
  const circles = dots.map(({ kind }, i) => (big ? dot(kind, p(i), scale) : dot(kind === 'jump' ? 'lock' : kind, p(i), scale))).join('');
  return `<svg class="${big ? 'track' : 'mini-track'}" viewBox="0 0 ${W} ${H}" aria-hidden="${big ? 'false' : 'true'}">${deco}${branchSvg}${lines}${circles}</svg>`;
}
