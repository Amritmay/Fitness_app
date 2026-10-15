// Profile: identity, starting point, benchmarks, training preferences, backup.
import { SKILL_TREES, BENCHMARKS } from '../data.js';
import { state, update, uid, today, applyStartingPoint, exportJSON, replaceState, resetAll } from '../store.js';
import { levelInfo, totalXp, generatePlan } from '../engine.js';
import { esc, fmtDate, catColor, icon, openSheet, closeSheet, toast } from '../ui.js';
import {
  startingPointFields, readStartingPoint, prefsFields, readPrefs, benchmarkFields, readBenchmarks,
} from './onboarding.js';

function latest(key) {
  const list = state.benchmarks.filter((b) => b[key] != null).sort((a, b) => (a.date < b.date ? -1 : 1));
  return { first: list.find((b) => b.baseline) || list[0], last: list[list.length - 1] };
}

export function render() {
  const p = state.profile;
  const lv = levelInfo(totalXp(state));
  const start = p.start || { trees: {}, foundation: [] };
  const initials = p.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const bw = latest('bodyweight').last?.bodyweight;

  return `<main class="page">
    <header class="profile-hero card">
      <div class="avatar">${esc(initials)}</div>
      <div class="grow">
        <h1>${esc(p.name)}</h1>
        <div class="muted small">Level ${lv.level} ${esc(lv.title)} · training since ${fmtDate(p.startDate, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>
      <button class="icon-btn" data-act="edit-me" title="Edit profile">${icon('user')}</button>
    </header>

    <section class="tiles">
      <div class="tile"><span class="muted small">Bodyweight</span><strong>${bw ? `${bw}<small> kg</small>` : '—'}</strong></div>
      <div class="tile"><span class="muted small">Height</span><strong>${p.height ? `${p.height}<small> cm</small>` : '—'}</strong></div>
      <div class="tile"><span class="muted small">Age</span><strong>${p.age || '—'}</strong></div>
      <div class="tile"><span class="muted small">Goal</span><strong>${p.daysPerWeek}<small> days/wk</small></strong></div>
    </section>

    <section class="card">
      <div class="row between"><h2 class="card-title">Starting point</h2><button class="btn ghost small" data-act="edit-start">Edit</button></div>
      <div class="muted small">Set on ${fmtDate(p.startDate, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <ul class="start-list">
        ${SKILL_TREES.map((t) => {
          const i = start.trees?.[t.id] || 0;
          const label = i >= t.steps.length ? 'Whole tree mastered' : `Step ${i + 1}: ${t.steps[i].name}`;
          return `<li><span class="dot" style="background:${catColor(t.category)}"></span><span class="grow">${esc(t.name)}</span><span class="muted small">${esc(label)}</span></li>`;
        }).join('')}
      </ul>
    </section>

    <section class="card">
      <div class="row between"><h2 class="card-title">Benchmarks</h2><button class="btn ghost small" data-act="add-bench">${icon('plus')} Re-test</button></div>
      <table class="bench-table">
        <thead><tr><th></th><th>Start</th><th>Latest</th><th>Change</th></tr></thead>
        <tbody>${BENCHMARKS.map((b) => {
          const { first, last } = latest(b.key);
          if (!first) return `<tr><td>${esc(b.label)}</td><td colspan="3" class="muted">—</td></tr>`;
          const diff = +(last[b.key] - first[b.key]).toFixed(1);
          const good = b.key === 'bodyweight' ? null : diff > 0;
          return `<tr><td>${esc(b.label)}</td><td>${first[b.key]}</td><td>${last[b.key]}</td>
            <td class="${good === true ? 'pos' : good === false && diff < 0 ? 'neg' : ''}">${diff > 0 ? '+' : ''}${diff}${b.unit === 'reps' ? '' : ` ${b.unit}`}</td></tr>`;
        }).join('')}</tbody>
      </table>
      <p class="muted small">Re-test every 4–6 weeks to see how far you've come. Charts live on the Progress tab.</p>
    </section>

    <section class="card">
      <h2 class="card-title">Training preferences</h2>
      <form data-form="prefs" class="stack">
        ${prefsFields(p)}
        <button class="btn primary" type="submit">Save preferences</button>
      </form>
    </section>

    <section class="card">
      <h2 class="card-title">Your data</h2>
      <p class="muted small">Everything is stored only on this device. Export a backup regularly — and before moving to a new phone or browser.</p>
      <div class="row gap wrap">
        <button class="btn ghost" data-act="export">Export backup</button>
        <label class="btn ghost">Import backup<input type="file" accept="application/json,.json" data-change="import" hidden></label>
        <button class="btn danger" data-act="reset">Reset everything</button>
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">Install as an app</h2>
      <div class="muted small"><strong>iPhone / iPad (Safari):</strong> tap <strong>Share</strong> → <strong>Add to Home Screen</strong> and keep “Open as Web App” on.</div>
      <div class="muted small"><strong>Mac Safari:</strong> File → <strong>Add to Dock</strong>. <strong>Chrome / Edge:</strong> click the install icon in the address bar.</div>
      <div class="muted small">Each install keeps its own data — use Export / Import to move it between devices.</div>
    </section>
  </main>`;
}

function editMe() {
  const p = state.profile;
  const panel = openSheet(`<div class="sheet-head"><h2>Edit profile</h2></div>
    <form class="stack" id="me-form">
      <div class="field"><label for="me-name">Name</label><input class="input" id="me-name" name="name" maxlength="40" value="${esc(p.name)}" required></div>
      <div class="row gap">
        <div class="field grow"><label for="me-h">Height <small>(cm)</small></label><input class="input" type="number" inputmode="decimal" id="me-h" name="height" value="${p.height ?? ''}"></div>
        <div class="field grow"><label for="me-a">Age</label><input class="input" type="number" inputmode="numeric" id="me-a" name="age" value="${p.age ?? ''}"></div>
      </div>
      <div class="sheet-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div>
    </form>`);
  panel.querySelector('[data-close]').onclick = closeSheet;
  panel.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    update((s) => {
      s.profile.name = f.name.value.trim() || s.profile.name;
      s.profile.height = Number(f.height.value) || null;
      s.profile.age = Number(f.age.value) || null;
    });
    closeSheet();
  };
}

function editStart() {
  const panel = openSheet(`<div class="sheet-head"><h2>Edit starting point</h2>
      <div class="muted small">Steps before your chosen step count as mastered (baseline). Steps you unlocked by logging stay unlocked.</div></div>
    <form class="stack" id="start-form">${startingPointFields(state.profile.start)}
      <div class="sheet-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save starting point</button></div>
    </form>`);
  panel.querySelector('[data-close]').onclick = closeSheet;
  panel.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const start = readStartingPoint(e.target);
    update((s) => {
      s.profile.start = start;
      applyStartingPoint(s);
    });
    closeSheet();
    toast('Starting point updated');
  };
}

function addBench() {
  const panel = openSheet(`<div class="sheet-head"><h2>Record a re-test</h2><div class="muted small">Fill only what you tested.</div></div>
    <form class="stack" id="bench-form">
      <div class="field"><label for="bdate">Date</label><input class="input" type="date" id="bdate" name="date" value="${today()}" max="${today()}"></div>
      ${benchmarkFields()}
      <div class="sheet-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div>
    </form>`);
  panel.querySelector('[data-close]').onclick = closeSheet;
  panel.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const vals = readBenchmarks(e.target);
    if (!Object.keys(vals).length) return toast('Enter at least one value', 'err');
    update((s) => s.benchmarks.push({ id: uid(), date: e.target.date.value || today(), ...vals }));
    closeSheet();
    toast('Benchmark saved');
  };
}

export const actions = {
  'edit-me': editMe,
  'edit-start': editStart,
  'add-bench': addBench,
  export: async () => {
    const name = `ascend-backup-${today()}.json`;
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    // Home-screen apps on iOS can't download blobs reliably; use the share sheet ("Save to Files") on touch devices.
    const file = new File([blob], name, { type: 'application/json' });
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Ascend backup' });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  reset: () => {
    if (!confirm('Delete ALL data on this device? Export a backup first if you might want it back.')) return;
    if (!confirm('Are you sure? This cannot be undone.')) return;
    resetAll();
    location.hash = '#/';
  },
};

export const forms = {
  prefs: (form) => {
    const prefs = readPrefs(form);
    const d = today();
    update((s) => {
      Object.assign(s.profile, prefs);
      // Refresh today's plan only if nothing has been logged against it yet.
      if (!s.sessions.some((x) => x.date === d)) s.plans[d] = generatePlan(s, d);
    });
    toast('Preferences saved');
  },
};

export const changes = {
  import: async (el) => {
    const file = el.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || !('sessions' in data) || !('mastered' in data)) throw new Error('Not a backup file');
      if (!confirm('Replace all data on this device with this backup?')) return;
      replaceState(data);
      toast('Backup restored');
    } catch (err) {
      toast(`Import failed: ${esc(err.message)}`, 'err');
    }
    el.value = '';
  },
};

