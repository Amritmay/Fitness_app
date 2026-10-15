// Skill wheel (all trees) and the single-tree detail page.
import { TREE, SKILL_TREES, CATEGORIES, STEP, ALL_STEPS } from '../data.js';
import { state, update, refresh, today } from '../store.js';
import {
  stepStatus, currentStep, treeProgress, treeState, sessionsFor, bestOf, bestFor, plateau, plateauTips, isMastered,
  levelInfo, totalXp, performance, allJumps, jumpFor, alsoBuilds,
} from '../engine.js';
import { DEMANDS, PATTERN, GATES, GATE_INFO, BRIDGES } from '../biomech.js';
import { esc, fmtTarget, fmtShort, fmtDate, icon, lineChart, tutorialUrl, toast } from '../ui.js';
import { skillWheel, treeTrack } from '../wheel.js';
import { openLogSheet } from './log.js';

// ---- wheel page ----

export function evidenceText(ev) {
  return ev.map((f) => (f.benchmark ? 'your benchmark tests' : `${STEP[f.stepId].name} ${fmtShort(STEP[f.stepId])}${f.partial ? ' (practice)' : ''}`));
}

export function jumpsCard() {
  const jumps = allJumps(state);
  if (!jumps.length) return '';
  return `<section class="card jumps">
    <h2 class="card-title" style="color:var(--accent-text)">⤴ Jumps available</h2>
    <div class="card-sub">Strength from other trees covers these — pass one test to skip ahead</div>
    <ul class="jump-list">${jumps.map((j) => `<li><a href="#/tree/${j.tree.id}">
      <div class="row between"><span class="tr-name">${esc(j.tree.name)}</span><span class="delta">SKIPS ${j.skipped.length}</span></div>
      <div class="tr-sub">Test: <strong>${esc(j.target.name)}</strong> <span class="mono">${fmtShort(j.target)}</span></div>
      <div class="jump-from">Covered by ${esc(evidenceText(j.evidence).join(' · '))}</div>
    </a></li>`).join('')}</ul>
  </section>`;
}

function reqLabel(tree) {
  return tree.requires
    .filter((id) => !isMastered(state, id))
    .map((id) => `${STEP[id].name}${STEP[id].treeId !== 'foundation' ? ` ${fmtShort(STEP[id])}` : ''}`)
    .join(', ');
}

function treeRow(tree) {
  const prog = treeProgress(state, tree);
  const ts = treeState(state, tree);
  const cur = currentStep(state, tree);
  const sub =
    ts === 'complete' ? 'Tree mastered'
    : ts === 'locked' ? `Needs ${reqLabel(tree)}`
    : `Next up: ${cur.name}`;
  return `<a class="tree-row ${ts}" href="#/tree/${tree.id}">
    <div class="grow">
      <div class="row between"><span class="tr-name">${ts === 'locked' ? `${icon('lock')} ` : ''}${esc(tree.name)}</span><span class="tr-count">${prog.done}/${prog.total}</span></div>
      <div class="tr-sub">${esc(sub)}</div>
    </div>
    <div class="tr-mini">${treeTrack(tree)}</div>
  </a>`;
}

export function performanceCard(limit = 5) {
  const perf = performance(state, today(), limit);
  return `<section class="card">
    <h2 class="card-title">My performance</h2>
    <div class="card-sub">Last 14 days vs prev. 14 days</div>
    ${perf.length ? `<ul class="perf">${perf.map((p) => {
      const st = STEP[p.stepId];
      const unit = st.kind === 'hold' ? 'S' : 'REPS';
      const d = p.delta;
      const cls = d == null ? 'new' : d > 0 ? '' : d < 0 ? 'down' : 'flat';
      const txt = d == null ? `${p.recent} ${unit} · NEW` : `${d > 0 ? '↗ +' : d < 0 ? '↘ ' : ''}${d} ${unit}`;
      return `<li><a class="grow" href="#/tree/${st.treeId}"><strong style="color:var(--text)">${esc(st.name)}</strong></a><span class="delta ${cls}">${txt}</span></li>`;
    }).join('')}</ul>` : `<p class="muted small">Log a few workouts and your best-set changes show up here.</p>`}
  </section>`;
}

export function renderMap() {
  const total = ALL_STEPS.length;
  const mastered = ALL_STEPS.filter((st) => isMastered(state, st.id)).length;
  const lv = levelInfo(totalXp(state));
  const cats = ['pull', 'push', 'core', 'legs'];
  const bases = ALL_STEPS.filter((st) => st.base);
  const basesDone = bases.filter((st) => isMastered(state, st.id)).length;

  return `<main class="page wide">
    <header class="page-head"><div><span class="eyebrow">Level ${lv.level} · ${esc(lv.title)}</span><h1>Skill Trees</h1></div></header>
    <div class="skills-grid">
      <div class="wheel-col">
        <div class="wheel-pills">
          <span class="pill"><i></i>${mastered}/${total} unlocked</span>
          <span class="pill ok"><i></i>Foundations ${basesDone}/${bases.length}</span>
        </div>
        <div class="wheel-wrap">${skillWheel()}</div>
      </div>
      <div class="stack">
        ${jumpsCard()}
        ${performanceCard()}
        ${cats.map((c) => `<section class="card">
          <h2 class="card-title" style="color:${CATEGORIES[c].color}">${CATEGORIES[c].name}</h2>
          <div class="tree-list">${SKILL_TREES.filter((t) => t.category === c).map(treeRow).join('')}</div>
        </section>`).join('')}
      </div>
    </div>
  </main>`;
}

// ---- tree detail ----

let expanded = {}; // treeId -> stepId ('' = all closed)

function defaultOpen(tree) {
  if (tree.parallel) return null;
  return jumpFor(state, tree)?.target.id || currentStep(state, tree)?.id;
}

function patternChips(st) {
  const d = Object.entries(DEMANDS[st.id] || {}).sort((a, b) => b[1] - a[1]);
  if (!d.length) return '';
  const builds = alsoBuilds(st.id);
  return `<div class="bio">
    <div class="bio-row"><span class="label">Works</span><div class="chips wrap">${d.map(([p, v]) => `<span class="chip pat" title="${esc(PATTERN[p].muscles)}">${esc(PATTERN[p].short)} <small>${v}</small></span>`).join('')}</div></div>
    ${builds.length ? `<div class="bio-row"><span class="label">Also builds</span><div class="chips wrap">${builds.map((t) => `<a class="chip" href="#/tree/${t.id}">${esc(t.name)}</a>`).join('')}</div></div>` : ''}
  </div>`;
}

function stepBlock(tree, st, jump) {
  const status = stepStatus(state, st.id);
  const isCur = status === 'available' && !tree.parallel;
  const isJump = jump?.target.id === st.id;
  const skippable = Boolean(jump?.skipped.some((x) => x.id === st.id));
  const gate = !isMastered(state, st.id) && GATES[st.id];
  const open = (expanded[tree.id] ?? defaultOpen(tree)) === st.id;
  const list = sessionsFor(state, st.id);
  const best = bestFor(state, st.id);
  const m = state.mastered[st.id];
  const pl = plateau(state, st.id);
  const unit = st.kind === 'hold' ? 's' : '';
  const points = list.map((x) => ({ label: fmtDate(x.date, { day: 'numeric', month: 'numeric' }), y: bestOf(x.sets) }));
  const cls = `${status === 'mastered' ? 'mastered' : isCur ? 'current' : status === 'available' ? 'avail' : 'locked'}${isJump ? ' jump' : ''}`;
  const ic = status === 'mastered' ? icon('check') : status === 'locked' ? icon('lock') : '<i></i>';

  return `<li class="step ${cls} ${open ? 'open' : ''}">
    <button class="step-row" data-act="expand" data-tree="${tree.id}" data-step="${st.id}" aria-expanded="${open}">
      <span class="st-ic">${ic}</span>
      <span class="st-name">${esc(st.name)}</span>
      ${m && m.source === 'baseline' ? '<span class="badge ok">Baseline</span>' : ''}
      ${m && m.source === 'transfer' ? '<span class="badge cur">Transfer</span>' : ''}
      ${isJump ? '<span class="badge cur">⤴ Jump</span>' : ''}
      ${skippable ? '<span class="tag dimtag">Skippable</span>' : ''}
      ${gate && !isJump ? `<span class="tag dimtag" title="${esc(GATE_INFO[gate].why)}">${GATE_INFO[gate].label}</span>` : ''}
      <span class="st-target">${fmtShort(st)}</span>
    </button>
    ${open ? `<div class="step-body">
      ${pl ? `<div class="banner plateau inner"><span class="eyebrow" style="color:var(--warn)">Plateau detected</span><ul class="tips">${plateauTips(st, pl).map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      ${isJump ? `<div class="banner jump inner">
        <span class="eyebrow" style="color:var(--accent-text)">⤴ Jump test</span>
        <p>Hit <strong>${fmtTarget(st)}</strong> to master this and skip <strong>${esc(jump.skipped.map((x) => x.name).join(' + '))}</strong>.</p>
        <p class="muted small">Covered by ${esc(evidenceText(jump.evidence).join(' · '))}. Fail it and nothing changes — it just counts as practice.</p>
      </div>` : ''}
      <ul class="cue-list">${st.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      ${patternChips(st)}
      ${gate ? `<p class="muted small">${icon('lock')} ${esc(GATE_INFO[gate].why)}</p>` : ''}
      <div class="stats">
        <div><span>Best set</span><strong>${best ? `${best}${unit}` : '—'}</strong></div>
        <div><span>Sessions</span><strong>${list.length}</strong></div>
        <div><span>${m ? 'Mastered' : 'Last'}</span><strong>${m ? fmtDate(m.date, { day: 'numeric', month: 'short' }) : list.length ? fmtDate(list[list.length - 1].date, { day: 'numeric', month: 'short' }) : '—'}</strong></div>
      </div>
      ${list.length ? lineChart(points, { color: status === 'mastered' ? 'var(--ok)' : 'var(--accent)', unit, target: st.target, height: 130 }) : ''}
      <div class="row gap wrap">
        <button class="btn primary" data-act="log-step" data-step="${st.id}">${isJump ? '⤴ Take jump test' : `${icon('plus')} Log workout`}</button>
        <a class="btn ghost small" href="${tutorialUrl(st)}" target="_blank" rel="noopener">${icon('video')} Tutorials</a>
        ${status === 'available' ? `<button class="btn ghost small" data-act="master" data-step="${st.id}">I can already do this</button>` : ''}
        ${m && m.source !== 'logged' ? `<button class="btn ghost small" data-act="unmaster" data-step="${st.id}">Unmark</button>` : ''}
      </div>
      ${status === 'locked' && !isJump ? `<p class="muted small">Master the previous step to unlock this one. You can still log practice.</p>` : ''}
    </div>` : ''}
  </li>`;
}

function connectionsCard(tree) {
  const links = BRIDGES.filter((b) => STEP[b.a].treeId === tree.id || STEP[b.b].treeId === tree.id).map((b) => {
    const here = STEP[b.a].treeId === tree.id ? STEP[b.a] : STEP[b.b];
    const there = here === STEP[b.a] ? STEP[b.b] : STEP[b.a];
    return { here, there, why: b.why, done: isMastered(state, here.id) && isMastered(state, there.id) };
  });
  if (!links.length) return '';
  return `<section class="card">
    <h2 class="card-title">Cross-connections</h2>
    <div class="card-sub">Steps in other trees that train the same muscles</div>
    <ul class="bridge-list">${links.map((l) => `<li>
      <div class="br-head"><span class="br-dot ${l.done ? 'done' : ''}"></span>${esc(l.here.name)} <span class="muted">↔</span> <a href="#/tree/${l.there.treeId}">${esc(TREE[l.there.treeId].name)}: ${esc(l.there.name)} <span class="mono muted small">${fmtShort(l.there)}</span></a></div>
      <div class="br-why">${esc(l.why)}</div>
    </li>`).join('')}</ul>
  </section>`;
}

export function renderTree(id) {
  const tree = TREE[id];
  if (!tree) return `<main class="page"><p>Unknown skill.</p><a href="#/skills">Back</a></main>`;
  const prog = treeProgress(state, tree);
  const ts = treeState(state, tree);
  const cur = currentStep(state, tree);
  const jump = jumpFor(state, tree);
  const next =
    ts === 'complete' ? `<span class="pill ok next"><i></i>Tree mastered</span>`
    : ts === 'locked' ? `<span class="pill warn next"><i></i>Locked</span>`
    : `<span class="pill next"><i></i>Next up: ${esc(cur.name)}</span>`;

  return `<main class="page">
    <header class="tree-title">
      <a class="back" href="#/skills" aria-label="Back to skill trees">${icon('back')}</a>
      <h1>${esc(tree.name)}</h1>
    </header>
    <p class="muted">${esc(tree.blurb)}</p>
    <div class="track-wrap">
      <div class="track-pills">
        ${tree.parallel ? '' : next}
        <span class="pill ${ts === 'complete' ? 'ok' : ''}"><i></i>${prog.done}/${prog.total} unlocked</span>
        ${jump ? `<span class="pill"><i></i>⤴ Jump: skip ${jump.skipped.length}</span>` : ''}
      </div>
      ${treeTrack(tree, { big: true })}
    </div>
    ${tree.requires.length ? `<section class="card reqs">
      <h2 class="card-title">Requires</h2>
      <div class="chips wrap">${tree.requires.map((r) => `<a class="chip ${isMastered(state, r) ? 'done' : ''}" href="#/tree/${STEP[r].treeId}">${isMastered(state, r) ? icon('check') : icon('lock')} ${esc(STEP[r].name)} ${STEP[r].treeId !== 'foundation' ? `<small>${fmtShort(STEP[r])}</small>` : ''}</a>`).join('')}</div>
    </section>` : ''}
    ${connectionsCard(tree)}
    <ol class="steps">${tree.steps.map((st) => stepBlock(tree, st, jump)).join('')}</ol>
  </main>`;
}

export const actions = {
  expand: (el) => {
    const { tree, step } = el.dataset;
    const cur = expanded[tree] ?? defaultOpen(TREE[tree]);
    expanded[tree] = cur === step ? '' : step;
    refresh();
  },
  'log-step': (el) => openLogSheet(el.dataset.step),
  master: (el) => {
    const st = STEP[el.dataset.step];
    if (!confirm(`Mark "${st.name}" (${fmtTarget(st)}) as mastered?`)) return;
    update((s) => (s.mastered[st.id] = { date: today(), source: 'manual' }));
    expanded[st.treeId] = undefined;
    toast(`Marked ${esc(st.name)} as mastered`);
  },
  unmaster: (el) => {
    const st = STEP[el.dataset.step];
    update((s) => delete s.mastered[st.id]);
  },
};

