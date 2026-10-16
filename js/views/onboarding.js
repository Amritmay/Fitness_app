// First-run setup. The starting-point fields are reused by the profile page.
import { SKILL_TREES, BENCHMARKS } from '../data.js';
import { state, update, uid, today, applyStartingPoint, requestPersistence } from '../store.js';
import { suggestStart, generatePlan } from '../engine.js';
import { esc, fmtTarget, toast, catColor } from '../ui.js';

export function startingPointFields(start = { trees: {} }) {
  return SKILL_TREES.map((tree) => {
    const cur = start.trees?.[tree.id] || 0;
    return `<div class="field">
      <label for="start-${tree.id}"><span class="dot" style="background:${catColor(tree.category)}"></span>${esc(tree.name)}</label>
      <select class="input" id="start-${tree.id}" name="start-${tree.id}">
        ${tree.steps
          .map((st, i) => `<option value="${i}" ${i === cur ? 'selected' : ''}>${i === 0 ? 'Just starting · ' : ''}Step ${i + 1}: ${esc(st.name)} (${fmtTarget(st)})${st.base ? ' · foundation' : ''}</option>`)
          .join('')}
        <option value="${tree.steps.length}" ${cur === tree.steps.length ? 'selected' : ''}>Already mastered the whole chain</option>
      </select>
    </div>`;
  }).join('');
}

export function readStartingPoint(form) {
  const trees = {};
  for (const tree of SKILL_TREES) trees[tree.id] = Number(form.querySelector(`[name="start-${tree.id}"]`).value) || 0;
  return { trees };
}

export function fillStartingPoint(form, start) {
  for (const tree of SKILL_TREES) form.querySelector(`[name="start-${tree.id}"]`).value = String(start.trees[tree.id] || 0);
}

export function prefsFields(p = {}) {
  const focus = new Set(p.focus || []);
  return `
    <div class="row gap">
      <div class="field grow">
        <label for="days">Training days / week</label>
        <select class="input" id="days" name="daysPerWeek">${[2, 3, 4, 5, 6, 7].map((d) => `<option ${d === (p.daysPerWeek || 4) ? 'selected' : ''}>${d}</option>`).join('')}</select>
      </div>
      <div class="field grow">
        <label for="mins">Session length</label>
        <select class="input" id="mins" name="sessionMinutes">${[20, 30, 45, 60, 90].map((m) => `<option value="${m}" ${m === (p.sessionMinutes || 45) ? 'selected' : ''}>${m} min</option>`).join('')}</select>
      </div>
    </div>
    <div class="field">
      <label for="restd">Default rest between sets</label>
      <select class="input" id="restd" name="restSeconds">${[60, 90, 120, 180].map((r) => `<option value="${r}" ${r === (p.restSeconds || 90) ? 'selected' : ''}>${r} s</option>`).join('')}</select>
    </div>
    <div class="field">
      <label>Focus skills (up to 3) — prioritised in daily plans</label>
      <div class="chips wrap">${SKILL_TREES.map(
        (t) => `<label class="chip toggle"><input type="checkbox" name="focus" value="${t.id}" ${focus.has(t.id) ? 'checked' : ''}><span>${esc(t.name)}</span></label>`
      ).join('')}</div>
    </div>`;
}

export function readPrefs(form) {
  return {
    daysPerWeek: Number(form.daysPerWeek.value),
    sessionMinutes: Number(form.sessionMinutes.value),
    restSeconds: Number(form.restSeconds.value),
    focus: [...form.querySelectorAll('[name="focus"]:checked')].map((i) => i.value).slice(0, 3),
  };
}

export function limitFocus(e) {
  if (e.target.name !== 'focus') return;
  const checked = e.target.form.querySelectorAll('[name="focus"]:checked');
  if (checked.length > 3) {
    e.target.checked = false;
    toast('Pick up to 3 focus skills');
  }
}

export function benchmarkFields(b = {}) {
  return `<div class="bench-grid">${BENCHMARKS.map(
    (m) => `<div class="field"><label for="b-${m.key}">${esc(m.label)} <small>(${m.unit})</small></label>
      <input class="input" type="number" inputmode="decimal" min="0" step="any" id="b-${m.key}" name="b-${m.key}" value="${b[m.key] ?? ''}"></div>`
  ).join('')}</div>`;
}

export function readBenchmarks(form) {
  const out = {};
  for (const m of BENCHMARKS) {
    const v = form.querySelector(`[name="b-${m.key}"]`).value;
    if (v !== '') out[m.key] = Number(v);
  }
  return out;
}

export function render() {
  return `<main class="page onboarding">
    <header class="hero">
      <div class="logo-mark">${logo()}</div>
      <span class="eyebrow" style="color:var(--accent-text)">Skill trees</span>
      <h1>Your roadmap to<br>calisthenics <span>skills</span></h1>
      <p class="muted">${SKILL_TREES.length} skill chains that grow with you. Set your starting point once — everything is saved on this device.</p>
    </header>
    <form id="onboard" class="stack" autocomplete="off">
      <section class="card">
        <h2 class="card-title">1 · About you</h2>
        <div class="field"><label for="name">Name</label><input class="input" id="name" name="name" required maxlength="40" placeholder="Your name"></div>
        <div class="row gap">
          <div class="field grow"><label for="height">Height <small>(cm)</small></label><input class="input" type="number" inputmode="decimal" id="height" name="height"></div>
          <div class="field grow"><label for="age">Age</label><input class="input" type="number" inputmode="numeric" id="age" name="age"></div>
        </div>
      </section>
      <section class="card">
        <h2 class="card-title">2 · Quick test <small class="muted">optional</small></h2>
        <p class="muted small">Do each to failure with good form (or fill what you know). These become your baseline on the profile page.</p>
        ${benchmarkFields()}
        <button type="button" class="btn ghost" data-act="suggest">Suggest my starting point</button>
      </section>
      <section class="card">
        <h2 class="card-title">3 · Starting point</h2>
        <p class="muted small">Each skill starts from its own foundation exercises. Pick the step you're currently <em>working on</em> in each chain — earlier steps count as mastered. Not sure? Leave it: the app opens jumps where your other skills already cover the early steps.</p>
        ${startingPointFields()}
      </section>
      <section class="card">
        <h2 class="card-title">4 · Training plan</h2>
        ${prefsFields()}
      </section>
      <button class="btn primary big" type="submit">Start training</button>
    </form>
  </main>`;
}

export function mount(root) {
  const form = root.querySelector('#onboard');
  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="suggest"]')) {
      fillStartingPoint(form, suggestStart(readBenchmarks(form)));
      toast('Starting point suggested — adjust anything that looks off');
      form.querySelector('#start-pullup').closest('.card').scrollIntoView({ behavior: 'smooth' });
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bench = readBenchmarks(form);
    const date = today();
    update((s) => {
      s.profile = {
        name: form.name.value.trim() || 'Athlete',
        height: Number(form.height.value) || null,
        age: Number(form.age.value) || null,
        createdAt: Date.now(),
        startDate: date,
        start: readStartingPoint(form),
        ...readPrefs(form),
      };
      if (Object.keys(bench).length) s.benchmarks.push({ id: uid(), date, baseline: true, ...bench });
      applyStartingPoint(s);
      s.plans[date] = generatePlan(s, date);
    });
    requestPersistence();
    location.hash = '#/today';
  });
}

export function logo() {
  return `<svg viewBox="0 0 64 64" width="60" height="60" aria-hidden="true">
    <rect width="64" height="64" rx="16" fill="#141418" stroke="#26262d"/>
    <g stroke="#4ade80" stroke-width="3.2" stroke-linecap="round" fill="none"><path d="M32 50V31M32 31 21 20"/></g>
    <g stroke="#5b8cff" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="2 3" fill="none"><path d="M32 31l11-11"/></g>
    <g fill="#4ade80"><circle cx="32" cy="50" r="4.5"/><circle cx="32" cy="31" r="3.6"/><circle cx="20" cy="19" r="4"/></g>
    <circle cx="44" cy="19" r="8" fill="#5b8cff" opacity="0.22"/><circle cx="44" cy="19" r="4.4" fill="#5b8cff"/>
  </svg>`;
}

