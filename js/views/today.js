// Today: daily plan, custom goals, week strip, plateau alerts, today's log.
import { STEP, TREE, TREES } from '../data.js';
import { state, update, today, uid } from '../store.js';
import {
  generatePlan, itemDone, planComplete, restSuggested, weekDays, trainedThisWeek, weekStreak,
  levelInfo, totalXp, allPlateaus, plateauTips, stepStatus, makeItem, sessionXp, DAY_COMPLETE_XP,
} from '../engine.js';
import { esc, fmtShort, fmtDate, treeColor, icon, openSheet, closeSheet, toast } from '../ui.js';
import { openLogSheet } from './log.js';
import { startRest, holdStopwatch } from '../timer.js';

export function ensurePlan() {
  const d = today();
  if (state.profile && !state.plans[d]) update((s) => (s.plans[d] = generatePlan(s, d)), { silent: true });
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function render() {
  const s = state;
  const d = today();
  const plan = s.plans[d];
  const lv = levelInfo(totalXp(s));
  const week = weekDays(s, d);
  const target = s.profile.daysPerWeek;
  const done = trainedThisWeek(s, d);
  const streak = weekStreak(s, d);
  const rest = restSuggested(s, d) && !plan.restAck;
  const complete = planComplete(s, d);
  const plateaus = allPlateaus(s, d).slice(0, 2);
  const todays = s.sessions.filter((x) => x.date === d).sort((a, b) => b.ts - a.ts);

  return `<main class="page">
    <header class="page-head">
      <div>
        <span class="eyebrow">${fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <h1>${greeting()},<br>${esc(s.profile.name)}</h1>
      </div>
      <a class="level-chip" href="#/profile" title="Level ${lv.level}">
        <span>Lv ${lv.level}</span>
        <span class="bar"><span style="width:${(lv.pct * 100).toFixed(0)}%"></span></span>
      </a>
    </header>

    <section class="card week">
      <div class="row between">
        <h2 class="card-title">This week</h2>
        <span class="pill ${streak ? 'ok' : ''}"><i></i>${streak} wk streak</span>
      </div>
      <div class="big-stat">${done}<small> / ${target} training days</small></div>
      <div class="week-strip">
        ${week.map((w) => `<div class="wd ${w.trained ? 'on' : ''} ${w.isToday ? 'today' : ''} ${w.future ? 'future' : ''}">
          <span>${fmtDate(w.date, { weekday: 'narrow' })}</span><i></i></div>`).join('')}
      </div>
    </section>

    ${rest ? `<section class="card banner rest">
      <div><strong>Rest day recommended</strong><div class="muted small">You've hit ${target} sessions this week. Recovery is when you get stronger.</div></div>
      <button class="btn ghost small" data-act="train-anyway">Train anyway</button>
    </section>` : ''}

    ${complete ? `<section class="card banner success">${icon('check')}<div><strong>Day complete!</strong><div class="small">+${DAY_COMPLETE_XP} XP bonus earned</div></div></section>` : ''}

    <section class="card ${rest ? 'dim' : ''}">
      <div class="row between">
        <div><h2 class="card-title">Today's plan</h2><div class="card-sub" style="margin-top:6px">${plan.items.filter((it) => itemDone(s, d, it)).length}/${plan.items.length} done · tap to log</div></div>
        <div class="row gap-s">
          <button class="icon-btn" data-act="regen" title="Generate a new plan">${icon('refresh')}</button>
          <button class="icon-btn" data-act="add-item" title="Add a skill">${icon('plus')}</button>
        </div>
      </div>
      ${plan.items.length ? `<ul class="plan">${plan.items.map((it) => planItem(it, d)).join('')}</ul>` : `<p class="muted">Nothing planned. Tap + to add a skill.</p>`}
    </section>

    <section class="card">
      <h2 class="card-title">Daily goals</h2>
      <ul class="goals">
        ${plan.goals.map((g) => `<li class="${g.done ? 'done' : ''}">
          <button class="check-btn" data-act="goal-toggle" data-id="${g.id}" aria-label="Toggle goal">${g.done ? icon('check') : ''}</button>
          <span>${esc(g.text)}</span>
          <button class="icon-btn subtle" data-act="goal-del" data-id="${g.id}" aria-label="Delete goal">${icon('x')}</button>
        </li>`).join('')}
      </ul>
      <form class="row gap-s" data-form="goal">
        <input class="input grow" name="text" maxlength="120" placeholder="Add a goal, e.g. 10 min wrist mobility">
        <button class="btn primary small" type="submit">Add</button>
      </form>
    </section>

    ${plateaus.map((p) => {
      const st = STEP[p.stepId];
      return `<section class="card banner plateau">
        <div>
          <div class="eyebrow" style="color:var(--warn)">Plateau detected · ${esc(TREE[st.treeId].name)}</div>
          <strong>${esc(st.name)}</strong> <span class="muted small">stuck at ${p.best}${st.kind === 'hold' ? 's' : ' reps'} for 2 weeks</span>
          <ul class="tips">${plateauTips(st, p).slice(0, 2).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          <a class="small" href="#/tree/${st.treeId}">See all suggestions →</a>
        </div>
      </section>`;
    }).join('')}

    <section class="card">
      <h2 class="card-title">Quick tools</h2>
      <div class="chips">
        ${[60, 90, 120, 180].map((v) => `<button class="chip" data-act="rest" data-v="${v}">${icon('timer')} Rest ${v < 120 ? `${v}s` : `${v / 60}m`}</button>`).join('')}
        <button class="chip" data-act="stopwatch">${icon('play')} Stopwatch</button>
      </div>
    </section>

    ${todays.length ? `<section class="card">
      <h2 class="card-title">Logged today</h2>
      <ul class="log-list">${todays.map((x) => {
        const st = STEP[x.stepId];
        return `<li><span class="dot" style="background:${treeColor(st.treeId)}"></span>
          <div class="grow"><strong>${esc(st.name)}</strong><div class="muted small">${x.sets.map((v) => (st.kind === 'hold' ? `${v}s` : v)).join(' · ')}</div></div>
          <span class="muted small">+${sessionXp(x)} XP</span></li>`;
      }).join('')}</ul>
    </section>` : ''}
  </main>`;
}

function planItem(it, d) {
  const st = STEP[it.stepId];
  const done = itemDone(state, d, it);
  const status = stepStatus(state, st.id);
  return `<li class="plan-item ${done ? 'done' : ''}">
    <button class="check-btn" data-act="item-toggle" data-id="${it.id}" aria-label="Mark done">${done ? icon('check') : ''}</button>
    <button class="plan-main" data-act="log" data-id="${it.id}">
      <span class="pi-top"><span class="pi-name">${esc(st.name)}</span><span class="pi-target">${fmtShort(st, it.sets, it.target)}</span></span>
      <span class="pi-meta"><span style="color:${treeColor(st.treeId)}">${esc(TREE[st.treeId].name)}</span> · <span class="why">${esc(it.reason)}</span>${status === 'mastered' && !done ? ' · practice' : ''}</span>
    </button>
    <button class="icon-btn subtle" data-act="item-del" data-id="${it.id}" aria-label="Remove">${icon('x')}</button>
  </li>`;
}

function openAddItem() {
  const d = today();
  const inPlan = new Set(state.plans[d].items.map((i) => i.stepId));
  const groups = TREES.map((tree) => {
    const steps = tree.steps.filter((st) => !inPlan.has(st.id) && stepStatus(state, st.id) !== 'locked');
    if (!steps.length) return '';
    return `<div class="add-group"><div class="eyebrow" style="color:${treeColor(tree.id)}">${esc(tree.name)}</div>
      ${steps.map((st) => `<button class="add-row" data-add="${st.id}"><span>${esc(st.name)}</span><span class="muted small">${fmtShort(st)}${stepStatus(state, st.id) === 'mastered' ? ' · MASTERED' : ''}</span></button>`).join('')}
    </div>`;
  }).join('');
  const panel = openSheet(`<div class="sheet-head"><h2>Add to today</h2><div class="muted small">Current steps, plus mastered ones for practice.</div></div>${groups}
    <div class="sheet-actions"><button class="btn ghost" data-close>Close</button></div>`);
  panel.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) return closeSheet();
    const b = e.target.closest('[data-add]');
    if (!b) return;
    update((s) => s.plans[d].items.push(makeItem(STEP[b.dataset.add], 'Added by you')));
    closeSheet();
  });
}

export const actions = {
  log: (el) => {
    const it = state.plans[today()].items.find((i) => i.id === el.dataset.id);
    if (it) openLogSheet(it.stepId, { sets: it.sets, target: it.target });
  },
  'item-toggle': (el) =>
    update((s) => {
      const d = today();
      const it = s.plans[d].items.find((i) => i.id === el.dataset.id);
      if (!it) return;
      if (it.manualDone) it.manualDone = false;
      else if (!itemDone(s, d, it)) it.manualDone = true;
      else toast('Logged sets count as done — delete them from Progress to undo');
    }),
  'item-del': (el) => update((s) => (s.plans[today()].items = s.plans[today()].items.filter((i) => i.id !== el.dataset.id))),
  'add-item': () => openAddItem(),
  regen: () => {
    const d = today();
    update((s) => (s.plans[d] = generatePlan(s, d)));
    toast('New plan generated');
  },
  'train-anyway': () => update((s) => (s.plans[today()].restAck = true)),
  'goal-toggle': (el) =>
    update((s) => {
      const g = s.plans[today()].goals.find((x) => x.id === el.dataset.id);
      if (g) g.done = !g.done;
    }),
  'goal-del': (el) => update((s) => (s.plans[today()].goals = s.plans[today()].goals.filter((x) => x.id !== el.dataset.id))),
  rest: (el) => startRest(Number(el.dataset.v)),
  stopwatch: async () => {
    const secs = await holdStopwatch({ title: 'Stopwatch', leadIn: 3 });
    if (secs != null) toast(`Held for ${secs}s`);
  },
};

export const forms = {
  goal: (form) => {
    const text = form.text.value.trim();
    if (!text) return;
    update((s) => s.plans[today()].goals.push({ id: uid(), text, done: false }));
  },
};
