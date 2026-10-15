// Full-screen celebrations: "Workout complete" (all of today's plan done) and "Step mastered" level-up cards.
import { STEP, TREE } from './data.js';
import { state, today } from './store.js';
import { sessionXp, currentStep } from './engine.js';
import { esc, fmtShort, icon } from './ui.js';
import { beep } from './timer.js';

const COLORS = ['var(--accent)', 'var(--ok)', 'var(--warn)', '#ffffff'];

function confetti() {
  const pieces = Array.from({ length: 34 }, (_, i) => {
    const left = (i * 37) % 100;
    const delay = ((i * 13) % 10) / 10;
    const dur = 2.4 + ((i * 7) % 10) / 6;
    const rot = (i * 47) % 360;
    return `<i style="left:${left}%;background:${COLORS[i % COLORS.length]};animation-duration:${dur}s;animation-delay:${delay}s;transform:rotate(${rot}deg)"></i>`;
  });
  return `<div class="confetti" aria-hidden="true">${pieces.join('')}</div>`;
}

function levelUpCard(st, jumped = []) {
  const tree = TREE[st.treeId];
  const next = currentStep(state, tree);
  const unit = st.kind === 'hold' ? 's' : '';
  return `<div class="levelup">
    <span class="lu-tag">${icon('bolt')} ${jumped.length ? `Jumped ${jumped.length} step${jumped.length > 1 ? 's' : ''}` : 'Level up'}</span>
    <h3>${esc(st.name)}</h3>
    <div class="lu-target">${st.sets} × <b>${st.target}${unit}</b></div>
    <p>${next && next.treeId === st.treeId
      ? `You hit ${st.sets} × ${st.target}${unit}. Next up in ${esc(tree.name)}: <strong style="color:var(--text)">${esc(next.name)}</strong> (${fmtShort(next)}).`
      : `You hit ${st.sets} × ${st.target}${unit}. ${esc(tree.name)} tree complete!`}</p>
    ${jumped.length ? `<p>Strength carried over — credited: <strong style="color:var(--text)">${esc(jumped.map((x) => x.name).join(', '))}</strong>.</p>` : ''}
  </div>`;
}

export function celebrate({ dayComplete = false, mastered = null, jumped = [], level = null } = {}) {
  const el = document.getElementById('celebrate');
  const d = today();
  const todays = state.sessions.filter((x) => x.date === d).sort((a, b) => a.ts - b.ts);
  const sets = todays.reduce((n, x) => n + x.sets.length, 0);
  const exercises = new Set(todays.map((x) => x.stepId)).size;
  const xp = todays.reduce((n, x) => n + sessionXp(x), 0);
  const time = new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  el.innerHTML = `${confetti()}<div class="cele-inner">
    <div class="cele-progress"></div>
    <div class="cele-check">${icon('check')}</div>
    <h2>${dayComplete ? 'Workout complete' : jumped.length ? 'Jump complete' : 'Step mastered'}</h2>
    <div class="muted small">Today · ${esc(time)}${level ? ` · Level ${level.level} ${esc(level.title)}` : ''}</div>
    ${dayComplete ? `<div class="cele-stats">
        <div><strong>${sets}</strong><span>Sets</span></div>
        <div><strong>${exercises}</strong><span>Exercises</span></div>
        <div><strong>${xp}</strong><span>XP</span></div>
      </div>
      <ul class="cele-list">${todays.map((x) => {
        const st = STEP[x.stepId];
        return `<li>${esc(st.name)}<span>${x.sets.map((v) => `${v}${st.kind === 'hold' ? 's' : ''}`).join(' · ')}</span></li>`;
      }).join('')}</ul>` : ''}
    ${mastered ? levelUpCard(mastered, jumped) : ''}
    <button class="btn white big" data-cele-close>Continue</button>
  </div>`;
  el.classList.add('show');
  beep(784, 120);
  setTimeout(() => beep(1175, 180), 140);
  el.onclick = (e) => {
    if (e.target.closest('[data-cele-close]')) close();
  };
  el.querySelector('[data-cele-close]').focus({ preventScroll: true });
  el.scrollTop = 0;
}

function close() {
  const el = document.getElementById('celebrate');
  el.classList.remove('show');
  el.innerHTML = '';
  el.onclick = null;
}

export const celebrationOpen = () => document.getElementById('celebrate').classList.contains('show');
export { close as closeCelebration };
