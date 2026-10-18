// Rest timer (floating pill that survives navigation) and hold stopwatch (full-screen overlay).
import { fmtClock, icon } from './ui.js';

let audio = null;

function ctx() {
  if (!audio) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audio = new AC();
  }
  if (audio?.state === 'suspended') audio.resume();
  return audio;
}

// Call from a user gesture so iOS allows sound later.
export function unlockAudio() {
  ctx();
}

// Close the sound engine so the microphone can have the audio session (iOS won't hand audio to speech
// recognition while a sound context is running). The next beep from a tap creates a fresh one.
export function releaseAudio() {
  if (!audio) return;
  try {
    audio.close();
  } catch {}
  audio = null;
}

export function beep(freq = 880, ms = 160, times = 1) {
  const a = ctx();
  if (!a) return;
  for (let i = 0; i < times; i++) {
    const t = a.currentTime + i * (ms / 1000 + 0.08);
    const o = a.createOscillator();
    const g = a.createGain();
    o.frequency.value = freq;
    o.connect(g);
    g.connect(a.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.start(t);
    o.stop(t + ms / 1000 + 0.02);
  }
  navigator.vibrate?.(times > 1 ? [120, 80, 120] : 120);
}

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {}
}

// ---- rest timer ----

let rest = null; // { end, total, tick }

function pill() {
  return document.getElementById('rest-pill');
}

function renderRest() {
  const el = pill();
  if (!rest) {
    el.classList.remove('show');
    el.innerHTML = '';
    return;
  }
  const left = Math.max(0, (rest.end - Date.now()) / 1000);
  const pct = 1 - left / rest.total;
  el.classList.add('show');
  el.innerHTML = `<div class="rest-bar" style="width:${(pct * 100).toFixed(1)}%"></div>
    <span class="rest-label">${icon('timer')} Rest</span>
    <strong class="rest-time">${fmtClock(left)}</strong>
    <button class="chip" data-rest="-15">−15</button>
    <button class="chip" data-rest="15">+15</button>
    <button class="chip" data-rest="skip">Skip</button>`;
}

export function startRest(seconds) {
  unlockAudio();
  stopRest(false);
  rest = { end: Date.now() + seconds * 1000, total: seconds };
  rest.tick = setInterval(() => {
    if (!rest) return;
    if (Date.now() >= rest.end) {
      beep(988, 180, 3);
      stopRest();
    } else renderRest();
  }, 250);
  renderRest();
}

export function stopRest(render = true) {
  if (rest) clearInterval(rest.tick);
  rest = null;
  if (render) renderRest();
}

export function initRestPill() {
  pill().addEventListener('click', (e) => {
    const b = e.target.closest('[data-rest]');
    if (!b || !rest) return;
    const v = b.dataset.rest;
    if (v === 'skip') return stopRest();
    rest.end += Number(v) * 1000;
    rest.total = Math.max(rest.total, (rest.end - Date.now()) / 1000);
    renderRest();
  });
}

export const restRunning = () => Boolean(rest && rest.end > Date.now());

// ---- hold stopwatch ----

// Opens a full-screen stopwatch with a lead-in countdown. Resolves with seconds held (or null if cancelled).
export function holdStopwatch({ title = 'Hold', target = 0, leadIn = 3 } = {}) {
  unlockAudio();
  keepAwake(true);
  return new Promise((resolve) => {
    const el = document.getElementById('stopwatch');
    el.classList.add('show');
    let phase = leadIn > 0 ? 'lead' : 'run';
    let startAt = Date.now() + leadIn * 1000;
    let hitTarget = false;

    el.innerHTML = `<div class="sw-title">${title}</div>
      <div class="sw-time" id="sw-time">0</div>
      <div class="sw-sub" id="sw-sub"></div>
      <div class="sw-actions">
        <button class="btn ghost" data-sw="cancel">Cancel</button>
        <button class="btn primary big" data-sw="stop">Stop</button>
      </div>`;
    const timeEl = el.querySelector('#sw-time');
    const subEl = el.querySelector('#sw-sub');
    let lastLead = null;

    const frame = () => {
      const now = Date.now();
      if (phase === 'lead') {
        const left = Math.ceil((startAt - now) / 1000);
        if (left !== lastLead) {
          lastLead = left;
          if (left > 0) beep(660, 90);
        }
        if (left <= 0) {
          phase = 'run';
          beep(1046, 220);
        } else {
          timeEl.textContent = left;
          subEl.textContent = 'Get into position…';
          el.dataset.phase = 'lead';
        }
      }
      if (phase === 'run') {
        const secs = (now - startAt) / 1000;
        timeEl.textContent = secs.toFixed(1);
        el.dataset.phase = 'run';
        if (target) {
          if (!hitTarget && secs >= target) {
            hitTarget = true;
            el.dataset.hit = '1';
            beep(1318, 160, 2);
          }
          subEl.textContent = hitTarget ? `Target ${target}s reached — keep going!` : `Target ${target}s`;
        } else subEl.textContent = 'Holding…';
      }
    };
    frame();
    const tick = setInterval(frame, 50);

    const finish = (val) => {
      clearInterval(tick);
      document.removeEventListener('keydown', onKey, true);
      el.classList.remove('show');
      el.removeAttribute('data-hit');
      el.innerHTML = '';
      el.onclick = null;
      keepAwake(false);
      resolve(val);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') finish(null);
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        el.querySelector('[data-sw="stop"]').click();
      }
    };
    document.addEventListener('keydown', onKey, true);

    el.onclick = (e) => {
      const b = e.target.closest('[data-sw]');
      if (!b) return;
      if (b.dataset.sw === 'cancel') return finish(null);
      if (phase === 'lead') return finish(null);
      finish(Math.floor((Date.now() - startAt) / 1000));
    };
  });
}
