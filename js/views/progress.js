// Progress: level, activity heatmap, weekly XP, tree completion, per-step charts, milestones, history.
import { STEP, TREE, TREES, ALL_STEPS, BENCHMARKS } from '../data.js';
import { state, update, refresh, today, addDays, weekStart } from '../store.js';
import { levelInfo, totalXp, sessionXp, treeProgress, sessionsFor, bestOf, weekStreak, deleteSession, isMastered, capacity } from '../engine.js';
import { PATTERNS } from '../biomech.js';
import { esc, fmtDate, fmtTarget, catColor, treeColor, lineChart, barChart, heatmap, icon, radar } from '../ui.js';

let chartStep = null;
let chartBench = 'pullups';
let historyLimit = 30;

// Strength profile: capacity per movement pattern, and where it came from.
function profileCard() {
  const cap = capacity(state);
  const from = (f) => (!f ? '—' : f.benchmark ? 'Benchmark test' : `${STEP[f.stepId].name}${f.partial ? ' (practice)' : ''}`);
  const sorted = [...PATTERNS].sort((a, b) => cap[b.id].value - cap[a.id].value);
  return `<section class="card">
    <h2 class="card-title">Strength profile</h2>
    <div class="card-sub">Capacity per movement pattern · drives cross-tree jumps</div>
    ${radar(PATTERNS.map((p) => ({ label: p.short, value: cap[p.id].value / 10 })))}
    <ul class="cap-list">${sorted.map((p) => `<li title="${esc(p.muscles)}">
      <span class="cap-name">${esc(p.name)}</span>
      <span class="hbar"><span style="width:${cap[p.id].value * 10}%"></span></span>
      <span class="cap-val">${cap[p.id].value ? +cap[p.id].value.toFixed(1) : 0}</span>
      <span class="cap-from">${esc(from(cap[p.id].from))}</span>
    </li>`).join('')}</ul>
  </section>`;
}

export function render() {
  const s = state;
  const lv = levelInfo(totalXp(s));
  const mastered = ALL_STEPS.filter((st) => isMastered(s, st.id)).length;
  const counts = {};
  s.sessions.forEach((x) => (counts[x.date] = (counts[x.date] || 0) + 1));

  // Weekly XP, last 8 weeks.
  const thisWeek = weekStart(today());
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(thisWeek, -7 * (7 - i)));
  const bars = weeks.map((w) => {
    const end = addDays(w, 7);
    const y = s.sessions.filter((x) => x.date >= w && x.date < end).reduce((a, x) => a + sessionXp(x), 0);
    return { label: fmtDate(w, { day: 'numeric', month: 'numeric' }), y, current: w === thisWeek };
  });

  const logged = [...new Set(s.sessions.map((x) => x.stepId))].filter((id) => STEP[id]);
  if (!chartStep || !logged.includes(chartStep)) chartStep = logged[logged.length - 1] || null;
  const cst = chartStep && STEP[chartStep];
  const stepPoints = cst ? sessionsFor(s, cst.id).map((x) => ({ label: fmtDate(x.date, { day: 'numeric', month: 'numeric' }), y: bestOf(x.sets) })) : [];

  const benchDef = BENCHMARKS.find((b) => b.key === chartBench);
  const benchPoints = s.benchmarks
    .filter((b) => b[chartBench] != null)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((b) => ({ label: fmtDate(b.date, { day: 'numeric', month: 'numeric' }), y: b[chartBench] }));

  const milestones = Object.entries(s.mastered)
    .filter(([id, m]) => STEP[id] && m.source !== 'baseline')
    .sort((a, b) => (a[1].date < b[1].date ? 1 : -1))
    .slice(0, 12);

  const history = [...s.sessions].sort((a, b) => b.ts - a.ts);

  return `<main class="page wide">
    <header class="page-head"><div><h1>Progress</h1><div class="muted small">Everything you've logged, in one place</div></div></header>

    <section class="card level-card">
      <div class="row between"><div><div class="eyebrow">Level ${lv.level}</div><h2>${esc(lv.title)}</h2></div><div class="big-num">${lv.xp.toLocaleString()} <small>XP</small></div></div>
      <div class="xp-bar"><span style="width:${(lv.pct * 100).toFixed(1)}%"></span></div>
      <div class="muted small">${lv.span - lv.into} XP to level ${lv.level + 1}</div>
    </section>

    ${profileCard()}

    <section class="tiles">
      <div class="tile"><span class="muted small">Sessions</span><strong>${s.sessions.length}</strong></div>
      <div class="tile"><span class="muted small">Training days</span><strong>${Object.keys(counts).length}</strong></div>
      <div class="tile"><span class="muted small">Steps mastered</span><strong>${mastered}<small>/${ALL_STEPS.length}</small></strong></div>
      <div class="tile"><span class="muted small">Week streak</span><strong>${weekStreak(s)}</strong></div>
    </section>

    <div class="two-col">
    <section class="card"><h2 class="card-title">Activity</h2>${heatmap(counts, 16)}</section>
    <section class="card"><h2 class="card-title">Weekly XP</h2>${barChart(bars)}</section>
    </div>

    <section class="card">
      <h2 class="card-title">Skill trees</h2>
      <ul class="tree-bars">${TREES.map((t) => {
        const p = treeProgress(s, t);
        return `<li><a href="#/tree/${t.id}"><span>${esc(t.name)}</span><span class="muted small">${p.done}/${p.total}</span></a>
          <div class="hbar"><span style="width:${(p.pct * 100).toFixed(0)}%;background:${catColor(t.category)}"></span></div></li>`;
      }).join('')}</ul>
    </section>

    <div class="two-col">
    <section class="card">
      <h2 class="card-title">Exercise progress</h2>
      ${logged.length ? `<select class="input" data-change="chart-step">${logged.map((id) => `<option value="${id}" ${id === chartStep ? 'selected' : ''}>${esc(TREE[STEP[id].treeId].name)} — ${esc(STEP[id].name)} (${fmtTarget(STEP[id])})</option>`).join('')}</select>
        <div class="muted small">Best set per session</div>
        ${lineChart(stepPoints, { color: treeColor(cst.treeId), unit: cst.kind === 'hold' ? 's' : '', target: cst.target })}` : `<p class="muted">Log a workout to see charts here.</p>`}
    </section>

    <section class="card">
      <div class="row between"><h2 class="card-title">Benchmarks</h2><a class="small" href="#/profile">Add a re-test →</a></div>
      <select class="input" data-change="chart-bench">${BENCHMARKS.map((b) => `<option value="${b.key}" ${b.key === chartBench ? 'selected' : ''}>${esc(b.label)}</option>`).join('')}</select>
      ${lineChart(benchPoints, { unit: benchDef.unit === 'reps' ? '' : benchDef.unit })}
    </section>
    </div>

    <section class="card">
      <h2 class="card-title">Milestones</h2>
      ${milestones.length ? `<ul class="milestones">${milestones.map(([id, m]) => `<li><span class="dot" style="background:${treeColor(STEP[id].treeId)}"></span>
        <div class="grow"><strong>${esc(STEP[id].name)}</strong> <span class="muted small">${esc(TREE[STEP[id].treeId].name)} · ${fmtTarget(STEP[id])}</span></div>
        <span class="muted small">${fmtDate(m.date, { day: 'numeric', month: 'short' })}</span></li>`).join('')}</ul>` : '<p class="muted">Master a step to see it here.</p>'}
    </section>

    <section class="card">
      <h2 class="card-title">History</h2>
      ${history.length ? `<ul class="log-list">${history.slice(0, historyLimit).map((x) => {
        const st = STEP[x.stepId];
        if (!st) return '';
        return `<li><span class="dot" style="background:${treeColor(st.treeId)}"></span>
          <div class="grow"><strong>${esc(st.name)}</strong> <span class="muted small">${fmtDate(x.date)}</span>
            <div class="muted small">${x.sets.map((v) => (st.kind === 'hold' ? `${v}s` : v)).join(' · ')}${x.note ? ` — ${esc(x.note)}` : ''}</div></div>
          <button class="icon-btn subtle" data-act="del-session" data-id="${x.id}" aria-label="Delete">${icon('trash')}</button></li>`;
      }).join('')}</ul>
      ${history.length > historyLimit ? `<button class="btn ghost small" data-act="more-history">Show more</button>` : ''}` : '<p class="muted">No workouts yet.</p>'}
    </section>
  </main>`;
}

export const actions = {
  'del-session': (el) => {
    if (!confirm('Delete this workout? Any unlock it earned will be re-checked.')) return;
    update((s) => deleteSession(s, el.dataset.id));
  },
  'more-history': () => {
    historyLimit += 30;
    refresh();
  },
};

export const changes = {
  'chart-step': (el) => {
    chartStep = el.value;
    refresh();
  },
  'chart-bench': (el) => {
    chartBench = el.value;
    refresh();
  },
};
