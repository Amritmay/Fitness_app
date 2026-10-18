// Rest timer (floating pill that survives navigation) and hold stopwatch (full-screen overlay).
import { fmtClock, icon } from './ui.js';

// Beeps are short WAV clips played through <audio> elements rather than Web Audio: an AudioContext holds
// the iPhone's audio session even when silent, which stops speech recognition (voice notes) from hearing
// anything. An <audio> element only uses it while a beep is actually playing.

const SAMPLE_RATE = 22050;
const clips = new Map(); // "freq-ms-times" -> blob URL
let players = []; // a few elements unlocked by a tap, so iOS lets them play later
let nextPlayer = 0;

// Mono 16-bit WAV of `times` sine beeps with short gaps and soft edges.
function clip(freq, ms, times) {
  const key = `${freq}-${ms}-${times}`;
  if (clips.has(key)) return clips.get(key);
  const beepN = Math.round((SAMPLE_RATE * ms) / 1000);
  const gapN = Math.round(SAMPLE_RATE * 0.08);
  const n = times * beepN + (times - 1) * gapN;
  const buf = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o, s) => [...s].forEach((c, i) => buf.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); buf.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt ');
  buf.setUint32(16, 16, true); buf.setUint16(20, 1, true); buf.setUint16(22, 1, true);
  buf.setUint32(24, SAMPLE_RATE, true); buf.setUint32(28, SAMPLE_RATE * 2, true);
  buf.setUint16(32, 2, true); buf.setUint16(34, 16, true); str(36, 'data'); buf.setUint32(40, n * 2, true);
  const fade = Math.round(SAMPLE_RATE * 0.01);
  for (let i = 0; i < n; i++) {
    const pos = i % (beepN + gapN);
    let v = 0;
    if (pos < beepN) {
      const env = Math.min(1, pos / fade, (beepN - pos) / fade);
      v = Math.sin((2 * Math.PI * freq * pos) / SAMPLE_RATE) * 0.35 * env;
    }
    buf.setInt16(44 + i * 2, v * 32767, true);
  }
  const url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  clips.set(key, url);
  return url;
}

// Call from a user gesture so iOS allows sound later: plays a silent clip on each player once.
export function unlockAudio() {
  if (players.length || typeof Audio === 'undefined') return;
  const silent = clip(20, 30, 1);
  players = Array.from({ length: 3 }, () => {
    const a = new Audio();
    a.preload = 'auto';
    a.src = silent;
    a.muted = true;
    a.play().then(() => { a.pause(); a.muted = false; }).catch(() => { a.muted = false; });
    return a;
  });
}

export function beep(freq = 880, ms = 160, times = 1) {
  navigator.vibrate?.(times > 1 ? [120, 80, 120] : 120);
  if (!players.length) return;
  const a = players[nextPlayer++ % players.length];
  try {
    a.src = clip(freq, ms, times);
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch {}
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
