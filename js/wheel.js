// Radial skill wheel: one spoke per tree, one dot per step, foundation ring in the middle.
// Also the small horizontal "track" used on tree rows and tree pages.
import { SKILL_TREES, FOUNDATION } from './data.js';
import { state } from './store.js';
import { stepStatus, currentStep, treeState } from './engine.js';
import { esc } from './ui.js';

const C = 180; // centre of the 360×360 viewBox
const R_START = 40; // first step radius
const R_END = 140; // radius of the deepest step
const R_LABEL = 160;
const MAX_STEPS = Math.max(...SKILL_TREES.map((t) => t.steps.length));
const GAP = (R_END - R_START) / (MAX_STEPS - 1);

const rad = (deg) => (deg * Math.PI) / 180;
const pt = (r, a) => [C + r * Math.cos(rad(a)), C + r * Math.sin(rad(a))];
const f = (n) => n.toFixed(1);

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
function treeDots(tree) {
  const ts = treeState(state, tree);
  const cur = ts === 'active' ? currentStep(state, tree) : null;
  let lead = 0;
  while (lead < tree.steps.length && stepStatus(state, tree.steps[lead].id) === 'mastered') lead++;
  const dots = tree.steps.map((st) => ({
    st,
    kind: cur && st.id === cur.id ? 'cur' : stepStatus(state, st.id) === 'mastered' ? 'done' : 'lock',
  }));
  return { ts, cur, lead, dots };
}

export function skillWheel() {
  const n = SKILL_TREES.length;
  const step = 360 / n;
  let rings = '';
  for (let i = 0; i < MAX_STEPS; i++) rings += `<circle class="wh-ring" cx="${C}" cy="${C}" r="${f(R_START + i * GAP)}"/>`;
  rings += `<circle class="wh-outer" cx="${C}" cy="${C}" r="${R_LABEL - 9}"/>`;

  // Faint "ghost" dots between spokes give the wheel its constellation texture.
  let ghosts = '';
  for (let k = 0; k < n; k++) {
    const a = -90 + k * step + step / 2;
    for (let i = 1; i < MAX_STEPS - 1; i += 1) {
      const [x, y] = pt(R_START + i * GAP + GAP / 2, a);
      ghosts += `<circle class="wh-ghost" cx="${f(x)}" cy="${f(y)}" r="1.1"/>`;
    }
  }

  const spokes = SKILL_TREES.map((tree, k) => {
    const a = -90 + k * step;
    const { ts, cur, lead, dots } = treeDots(tree);
    const last = R_START + (tree.steps.length - 1) * GAP;
    const [g1x, g1y] = pt(24, a);
    const [g2x, g2y] = pt(last, a);
    let paths = `<line class="wh-guide" x1="${f(g1x)}" y1="${f(g1y)}" x2="${f(g2x)}" y2="${f(g2y)}"/>`;
    if (lead > 0) {
      const [px, py] = pt(R_START + (lead - 1) * GAP, a);
      paths += `<line class="wh-path" x1="${f(g1x)}" y1="${f(g1y)}" x2="${f(px)}" y2="${f(py)}"/>`;
    }
    if (cur) {
      const [sx, sy] = lead > 0 ? pt(R_START + (lead - 1) * GAP, a) : [g1x, g1y];
      const [cx, cy] = pt(R_START + cur.index * GAP, a);
      paths += `<line class="wh-next" x1="${f(sx)}" y1="${f(sy)}" x2="${f(cx)}" y2="${f(cy)}"/>`;
    }
    const circles = dots
      .map(({ st, kind }) => {
        const [x, y] = pt(R_START + st.index * GAP, a);
        if (kind === 'cur') return `<circle class="wh-halo" cx="${f(x)}" cy="${f(y)}" r="9"/><circle class="wh-cur" cx="${f(x)}" cy="${f(y)}" r="4.6"/>`;
        if (kind === 'done') return `<circle class="wh-done" cx="${f(x)}" cy="${f(y)}" r="3.4"/>`;
        return `<circle class="wh-lock" cx="${f(x)}" cy="${f(y)}" r="2.4"/>`;
      })
      .join('');

    // Curved label: read left→right on both halves of the wheel.
    const bottom = Math.sin(rad(a)) > 0.15;
    const span = step / 2 - 2;
    const labelPath = bottom ? arc(R_LABEL + 7, a + span, a - span, 0) : arc(R_LABEL, a - span, a + span, 1);
    const label = `<path id="wl-${tree.id}" d="${labelPath}" fill="none"/>
      <text class="wh-label ${ts}"><textPath href="#wl-${tree.id}" startOffset="50%" text-anchor="middle">${esc(tree.name.toUpperCase())}</textPath></text>`;
    const lock = ts === 'locked' ? lockBadge(...pt(last + GAP * 0.9, a)) : '';
    const hit = `<path class="wh-hit" d="${sector(20, R_LABEL + 16, a - step / 2, a + step / 2)}"/>`;
    const title = `${tree.name}: ${ts === 'complete' ? 'mastered' : ts === 'locked' ? 'locked' : `now ${cur.name}`}`;

    return `<a class="wh-spoke" href="#/tree/${tree.id}" aria-label="${esc(title)}"><title>${esc(title)}</title>${hit}${paths}${circles}${label}${lock}</a>`;
  }).join('');

  // Foundation: a ring of dots around the core.
  const fDone = FOUNDATION.steps.filter((st) => stepStatus(state, st.id) === 'mastered').length;
  const fDots = FOUNDATION.steps
    .map((st, j) => {
      const [x, y] = pt(16, -90 + j * (360 / FOUNDATION.steps.length) + 30);
      return `<circle class="${stepStatus(state, st.id) === 'mastered' ? 'wh-done' : 'wh-lock'}" cx="${f(x)}" cy="${f(y)}" r="2.6"/>`;
    })
    .join('');
  const core = `<a class="wh-spoke" href="#/tree/foundation" aria-label="Foundation ${fDone}/${FOUNDATION.steps.length}">
    <title>Foundation ${fDone}/${FOUNDATION.steps.length}</title>
    <circle class="wh-hit" cx="${C}" cy="${C}" r="22"/>
    <circle class="${fDone === FOUNDATION.steps.length ? 'wh-core-done' : 'wh-core'}" cx="${C}" cy="${C}" r="5"/>${fDots}
  </a>`;

  return `<svg class="wheel" viewBox="0 0 360 360" role="img" aria-label="Skill wheel">${rings}${ghosts}${spokes}${core}</svg>`;
}

// Horizontal dot track for one tree. `big` is the tree-page header version.
export function treeTrack(tree, { big = false } = {}) {
  const { cur, lead, dots } = treeDots(tree);
  const parallel = tree.parallel;
  const W = big ? 340 : 92;
  const H = big ? 64 : 14;
  const pad = big ? 14 : 5;
  const y = H / 2;
  const x = (i) => pad + (dots.length === 1 ? 0 : (i * (W - 2 * pad)) / (dots.length - 1));
  const r = big ? { cur: 6.5, done: 4.6, lock: 3.2, halo: 13 } : { cur: 3.6, done: 2.6, lock: 1.8, halo: 0 };

  let deco = '';
  if (big) {
    // Sparse background dots for texture.
    const count = 16;
    for (let i = 0; i < count; i++) {
      const dx = pad + ((i + 0.5) * (W - 2 * pad)) / count + ((i * 7) % 9) - 4;
      const dy = (i % 2 ? 9 : H - 9) + ((i * 5) % 7) - 3;
      deco += `<circle class="wh-ghost" cx="${f(dx)}" cy="${f(dy)}" r="1.4"/>`;
    }
  }
  let lines = parallel ? '' : `<line class="wh-guide" x1="${x(0)}" y1="${y}" x2="${x(dots.length - 1)}" y2="${y}"/>`;
  if (!parallel && lead > 1) lines += `<line class="wh-path" x1="${x(0)}" y1="${y}" x2="${x(lead - 1)}" y2="${y}"/>`;
  if (!parallel && cur && lead > 0) lines += `<line class="wh-next" x1="${x(lead - 1)}" y1="${y}" x2="${x(cur.index)}" y2="${y}"/>`;
  const circles = dots
    .map(({ kind }, i) => {
      if (kind === 'cur') return `${r.halo ? `<circle class="wh-halo" cx="${x(i)}" cy="${y}" r="${r.halo}"/>` : ''}<circle class="wh-cur" cx="${x(i)}" cy="${y}" r="${r.cur}"/>`;
      if (kind === 'done') return `<circle class="wh-done" cx="${x(i)}" cy="${y}" r="${r.done}"/>`;
      return `<circle class="wh-lock" cx="${x(i)}" cy="${y}" r="${r.lock}"/>`;
    })
    .join('');
  return `<svg class="${big ? 'track' : 'mini-track'}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${deco}${lines}${circles}</svg>`;
}
