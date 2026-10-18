// Bottom sheet for logging sets of a step, with hold stopwatch and rest timer.
import { STEP, TREE } from '../data.js';
import { state, update, today } from '../store.js';
import { stepStatus, bestFor, logSession, meetsTarget, levelInfo, totalXp, planComplete, jumpFor } from '../engine.js';
import { celebrate } from '../celebrate.js';
import { esc, fmtShort, openSheet, closeSheet, toast, treeColor, icon, tutorialUrl } from '../ui.js';
import { holdStopwatch, startRest, unlockAudio } from '../timer.js';

export function openLogSheet(stepId, { sets, target, support = false } = {}) {
  const st = STEP[stepId];
  const tree = TREE[st.treeId];
  const status = stepStatus(state, stepId);
  const nSets = sets || st.sets;
  const goal = target || st.target;
  const best = bestFor(state, stepId);
  const restDefault = state.profile?.restSeconds || 90;
  const hold = st.kind === 'hold';
  const jump = jumpFor(state, tree);
  const isJump = jump?.target.id === stepId;

  const row = (i) => `<div class="set-row" data-row>
      <span class="set-n">Set ${i + 1}</span>
      <input class="input set-input" type="number" inputmode="numeric" min="0" max="999" placeholder="${goal}" aria-label="Set ${i + 1} ${hold ? 'seconds' : 'reps'}">
      <span class="set-unit">${hold ? 's' : 'reps'}</span>
      ${hold ? `<button class="icon-btn" data-act="time" title="Time this hold">${icon('timer')}</button>` : ''}
      <button class="icon-btn" data-act="rest" title="Start rest timer">${icon('play')}</button>
    </div>`;

  const panel = openSheet(`
    <div class="sheet-head">
      <div class="eyebrow" style="color:${treeColor(tree.id)}">${esc(tree.name)} · step ${st.index + 1}</div>
      <h2>${esc(st.name)}</h2>
      <div class="row gap-s wrap">
        <span class="pill"><i></i>Goal ${fmtShort(st, nSets, goal)}</span>
        ${support ? `<span class="pill"><i></i>Support · keep building</span>`
          : goal !== st.target || nSets !== st.sets ? `<span class="pill warn"><i></i>Unlock ${fmtShort(st)}</span>` : ''}
        <span class="pill ok"><i></i>Best ${best ? `${best}${hold ? 'S' : ' REPS'}` : '—'}</span>
        ${isJump ? `<span class="pill"><i></i>⤴ Jump test · skips ${jump.skipped.length}</span>` : ''}
      </div>
      ${isJump ? `<span class="muted small">Hit ${fmtShort(st)} to also credit ${esc(jump.skipped.map((x) => x.name).join(' + '))}.</span>` : ''}
      ${support ? `<span class="muted small">Support work: you've mastered this — now take it past ${fmtShort(st)}. The target rises a little each time you hit it. It doesn't affect unlocking.</span>`
        : status === 'mastered' ? `<span class="muted small">Already mastered — this logs as practice.</span>` : ''}
      ${status === 'locked' && !isJump ? `<span class="muted small">Still locked — this logs as practice.</span>` : ''}
      <a class="small" href="${tutorialUrl(st)}" target="_blank" rel="noopener">${icon('video')} Watch tutorials</a>
    </div>
    <details class="cues"><summary>Form cues</summary><ul>${st.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></details>
    <div id="sets">${Array.from({ length: nSets }, (_, i) => row(i)).join('')}</div>
    <div class="row gap">
      <button class="btn ghost small" data-act="add">${icon('plus')} Add set</button>
      <button class="btn ghost small" data-act="remove">Remove set</button>
    </div>
    <div class="field">
      <label>Rest between sets</label>
      <div class="chips" id="rest-chips">${[60, 90, 120, 180]
        .map((v) => `<button class="chip ${v === restDefault ? 'on' : ''}" data-restv="${v}">${v < 120 ? `${v}s` : `${v / 60} min`}</button>`)
        .join('')}</div>
    </div>
    <div class="row gap">
      <div class="field grow"><label for="log-date">Date</label><input class="input" type="date" id="log-date" value="${today()}" max="${today()}"></div>
    </div>
    <div class="field"><label for="log-note">Note</label><textarea class="input" id="log-note" rows="2" placeholder="How did it feel?"></textarea></div>
    <div class="sheet-actions">
      <button class="btn ghost" data-act="cancel">Cancel</button>
      <button class="btn primary" data-act="save">Save workout</button>
    </div>`);

  let restSecs = restDefault;
  const setsEl = panel.querySelector('#sets');

  panel.addEventListener('click', async (e) => {
    const chip = e.target.closest('[data-restv]');
    if (chip) {
      restSecs = Number(chip.dataset.restv);
      panel.querySelectorAll('[data-restv]').forEach((c) => c.classList.toggle('on', c === chip));
      return;
    }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    unlockAudio();
    const act = b.dataset.act;
    if (act === 'cancel') return closeSheet();
    if (act === 'add') {
      setsEl.insertAdjacentHTML('beforeend', row(setsEl.children.length));
      return;
    }
    if (act === 'remove') {
      if (setsEl.children.length > 1) setsEl.lastElementChild.remove();
      return;
    }
    if (act === 'rest') return startRest(restSecs);
    if (act === 'time') {
      const input = b.closest('[data-row]').querySelector('input');
      const secs = await holdStopwatch({ title: st.name, target: goal });
      if (secs != null) {
        input.value = secs;
        startRest(restSecs);
      }
      return;
    }
    if (act === 'save') save();
  });

  function save() {
    const values = [...setsEl.querySelectorAll('input')].map((i) => Math.round(Number(i.value))).filter((v) => v > 0);
    if (!values.length) return toast('Enter at least one set', 'err');
    const date = panel.querySelector('#log-date').value || today();
    const note = panel.querySelector('#log-note').value.trim();
    const levelBefore = levelInfo(totalXp(state)).level;
    const dayBefore = planComplete(state, today());
    let res;
    update((s) => {
      res = logSession(s, { stepId, sets: values, note, date });
    });
    // The same exercise in other chains is ticked off too (store.syncShared).
    const sharedTo = res.mastered
      ? Object.entries(state.mastered).filter(([, m]) => m.source === 'shared' && m.from === stepId).map(([id]) => TREE[STEP[id].treeId].name)
      : [];
    if (sharedTo.length) toast(`Also ticked off in ${esc([...new Set(sharedTo)].join(', '))} — same exercise`);
    closeSheet();
    const lv = levelInfo(totalXp(state));
    const dayComplete = !dayBefore && planComplete(state, today());
    if (dayComplete || res.mastered) {
      celebrate({ dayComplete, mastered: res.mastered, jumped: res.jumped, level: lv.level > levelBefore ? lv : null });
      const others = res.unlocked.filter((x) => x.treeId !== st.treeId);
      if (others.length) toast(`New tree unlocked: ${esc(others.map((x) => TREE[x.treeId].name).join(', '))}`, 'big');
      return;
    }
    toast(`${icon('bolt')} +${res.xp} XP`);
    if (support) {
      if (values.filter((v) => v >= goal).length >= nSets) toast('Support target hit — it goes up next time');
    } else if (isJump) toast('Jump test not passed — logged as practice. Keep building!');
    else if (stepStatus(state, stepId) === 'available' && !meetsTarget(st, values)) {
      const hit = values.filter((v) => v >= st.target).length;
      if (hit) toast(`${hit}/${st.sets} sets at target — close!`);
    }
    if (lv.level > levelBefore) toast(`<strong>Level ${lv.level}</strong> · ${esc(lv.title)}`, 'big');
  }
}
