// Radial skill wheel, plus the horizontal tracks on tree rows and tree pages.
//
// • The edge of the wheel is split into major muscle groups (Back, Core, Legs, Shoulders & Arms).
// • Each skill is a straight chain from the centre. Its angle comes from the muscles it uses: it sits in
//   its main group, leaning toward a neighbouring group it also loads (front lever: Back → Core).
//   Each group's slice of the ring is sized by how many skills live in it.
// • Steps are evenly spaced, so short (easier) chains finish near the middle and long, hard ones reach
//   the edge. The skill's name sits at the tip of its branch.
// • BRIDGES between nearby skills are straight jump branches styled like the chains: grey untrained,
//   green when both ends are mastered, blue dotted when they lead into an open jump.
import { TREE, STEP, TREES } from './data.js';
import { state } from './store.js';
import { stepStatus, currentStep, treeState, isMastered, allJumps } from './engine.js';
import { BRIDGES, GROUPS, muscleShare } from './biomech.js';
import { esc } from './ui.js';

const C = 180; // centre of the drawing
const R_HUB = 9; // where chains leave the hub
const R_FIRST = 22; // radius of every chain's first step
const R_MAX = 120; // radius of the last step of the longest chain
const R_BAND = 192; // muscle-group ring (outside the skill names)
const MAX_STEPS = Math.max(...TREES.map((t) => t.steps.length));
const GAP = (R_MAX - R_FIRST) / (MAX_STEPS - 1); // same spacing on every chain
const SLOT = 360 / TREES.length; // average angle per skill (sets the tap area)

const rad = (deg) => (deg * Math.PI) / 180;
const pt = (r, a) => [C + r * Math.cos(rad(a)), C + r * Math.sin(rad(a))];
const f = (n) => n.toFixed(1);
const norm = (a) => ((((a + 180) % 360) + 360) % 360) - 180;

const mainGroup = (tree) => Object.entries(muscleShare(tree.steps)).sort((a, b) => b[1] - a[1])[0][0];

// Each muscle group gets a slice of the ring in proportion to how many skills live in it,
// with Back centred at the top and the others following clockwise.
const GEOM = (() => {
  const counts = Object.fromEntries(GROUPS.map((g) => [g.id, 0]));
  TREES.forEach((t) => counts[mainGroup(t)]++);
  const weights = GROUPS.map((g) => counts[g.id] + 0.6);
  const total = weights.reduce((x, y) => x + y, 0);
  const spans = weights.map((w) => (360 * w) / total);
  let start = -90 - spans[0] / 2;
  const out = {};
  GROUPS.forEach((g, i) => {
    out[g.id] = { start, end: start + spans[i], center: start + spans[i] / 2, span: spans[i], i };
    start += spans[i];
  });
  return out;
})();

// Ideal angle: the centre of the skill's main group, leaning toward a neighbouring group it also uses.
function idealAngle(tree) {
  const share = muscleShare(tree.steps);
  const main = mainGroup(tree);
  const g = GEOM[main];
  const n = GROUPS.length;
  const prev = GROUPS[(g.i - 1 + n) % n].id;
  const next = GROUPS[(g.i + 1) % n].id;
  const half = (g.span / 2) * 0.85;
  const lean = (share[next] - share[prev]) / (share[main] + Math.max(share[next], share[prev]) || 1);
  return g.center + Math.max(-half, Math.min(half, lean * half));
}

// Spread each group's skills evenly across its slice, ordered by their ideal angle, so every skill
// stays inside its own muscle group and chains never crowd each other.
function placeAngles() {
  const out = {};
  for (const g of GROUPS) {
    const { start, span } = GEOM[g.id];
    const members = TREES.filter((t) => mainGroup(t) === g.id)
      .map((t) => ({ id: t.id, ideal: idealAngle(t) }))
      .sort((x, y) => x.ideal - y.ideal);
    members.forEach((m, i) => (out[m.id] = norm(start + (span * (i + 0.5)) / members.length)));
  }
  return out;
}

const ANGLES = placeAngles();
const LAYOUT = Object.fromEntries(
  TREES.map((t) => [t.id, { a: ANGLES[t.id], radii: t.steps.map((_, i) => R_FIRST + i * GAP), start: pt(R_HUB, ANGLES[t.id]) }])
);

const posOf = (stepId) => {
  const st = STEP[stepId];
  const l = LAYOUT[st.treeId];
  return l ? pt(l.radii[st.index], l.a) : [C, C];
};

const near = (t1, t2) => Math.abs(norm(LAYOUT[t1].a - LAYOUT[t2].a)) <= 75;

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

// Style for a link between two steps, matching how the chains themselves are drawn.
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

function groupRing() {
  return GROUPS.map((g) => {
    const { start, end, center } = GEOM[g.id];
    const a1 = start + 1.5;
    const a2 = end - 1.5;
    const bottom = Math.sin(rad(center)) > 0.15;
    const label = bottom ? arc(R_BAND + 13, a2 - 3, a1 + 3, 0) : arc(R_BAND + 7, a1 + 3, a2 - 3, 1);
    const [dx1, dy1] = pt(R_FIRST, start);
    const [dx2, dy2] = pt(R_BAND - 4, start);
    return `<line class="wh-divider" x1="${f(dx1)}" y1="${f(dy1)}" x2="${f(dx2)}" y2="${f(dy2)}"/>
      <path class="wh-band" d="${arc(R_BAND, a1, a2, 1)}" style="stroke:${g.color}"/>
      <path id="wg-${g.id}" d="${label}" fill="none"/>
      <text class="wh-group" style="fill:${g.color}"><textPath href="#wg-${g.id}" startOffset="50%" text-anchor="middle">${esc(g.name.toUpperCase())}</textPath></text>`;
  }).join('');
}

export function skillWheel() {
  const jumpTargets = new Set(allJumps(state).map((j) => j.target.id));
  const inJump = jumpSteps();

  let rings = '';
  for (let i = 1; i < MAX_STEPS; i += 2) rings += `<circle class="wh-ring" cx="${C}" cy="${C}" r="${f(R_FIRST + i * GAP)}"/>`;

  // Faint constellation texture.
  let ghosts = '';
  for (let k = 0; k < 24; k++) {
    for (let lv = 1.5; lv < 10; lv += 2) {
      const [x, y] = pt(R_FIRST + ((lv + (k % 2)) / 10.4) * (R_MAX - R_FIRST), k * 15 + 7);
      ghosts += `<circle class="wh-ghost" cx="${f(x)}" cy="${f(y)}" r="1"/>`;
    }
  }

  // Jump branches between nearby skills.
  const links = BRIDGES.filter((b) => near(STEP[b.a].treeId, STEP[b.b].treeId))
    .map((b) => line(`${linkClass(b.a, b.b, inJump)} wh-branch`, posOf(b.a), posOf(b.b)))
    .join('');

  const chains = TREES.map((tree) => {
    const { a, radii, start } = LAYOUT[tree.id];
    const { ts, cur, lead, dots } = treeDots(tree, jumpTargets);
    const pts = [start, ...radii.map((r) => pt(r, a))];
    let paths = poly('wh-guide', pts);
    if (lead > 0) paths += poly('wh-path', pts.slice(0, lead + 1));
    if (cur) paths += line('wh-next', pts[lead], pts[cur.index + 1]);
    const circles = dots.map(({ kind }, i) => dot(kind, pts[i + 1])).join('');

    // Skill name at the tip of its branch, written outward along the branch (flipped on the left
    // half so it always reads left to right). Grey until the skill is mastered, then neon blue.
    const endR = radii[radii.length - 1];
    const left = Math.cos(rad(a)) < 0;
    const [lx, ly] = pt(endR + 7, a);
    const label = `<text class="wh-skill ${ts}" x="${f(lx)}" y="${f(ly)}" dy="2.8" text-anchor="${left ? 'end' : 'start'}"
      transform="rotate(${f(left ? a + 180 : a)} ${f(lx)} ${f(ly)})">${esc((tree.short || tree.name).toUpperCase())}</text>`;
    const tick = '';
    const hit = `<path class="wh-hit" d="${sector(R_HUB, endR + 70, a - SLOT / 2 + 1, a + SLOT / 2 - 1)}"/>`;
    const title = `${tree.name}: ${ts === 'complete' ? 'mastered' : `now ${cur?.name || ''}`}`;

    return `<a class="wh-spoke" href="#/tree/${tree.id}" aria-label="${esc(title)}"><title>${esc(title)}</title>${hit}${tick}${paths}${circles}${label}</a>`;
  }).join('');

  const hub = `<circle class="wh-core" cx="${C}" cy="${C}" r="5"/>`;

  return `<svg class="wheel" viewBox="-42 -42 444 444" role="img" aria-label="Skill wheel">${groupRing()}${rings}${ghosts}<g class="wh-links">${links}</g>${chains}${hub}</svg>`;
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
