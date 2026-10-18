// Voice notes: speech-to-text into a text field using the browser's own speech recognition
// (Safari on iPhone/iPad/Mac, Chrome, Edge). Where it isn't available the mic button is hidden and the
// keyboard's dictation key still works.
//
// iOS notes: each tap gets a fresh recognizer, and the previous one is shut down completely first (a
// recognizer that never finished can leave the next one hearing nothing). If a session ends without any
// words, the status line lists what the browser reported, to help track down device-specific problems.

const Recognition = () => window.SpeechRecognition || window.webkitSpeechRecognition;

export const canDictate = () => Boolean(Recognition());

const ERRORS = {
  'not-allowed': 'Microphone access is off. Allow it when asked, or use the mic key on your keyboard.',
  'service-not-allowed': 'Voice input isn’t available here. Use the mic key on your keyboard instead.',
  'audio-capture': 'The microphone is busy or missing. Try again, or use the mic key on your keyboard.',
  network: 'Voice input needs an internet connection. The mic key on your keyboard may work offline.',
  'no-speech': 'Didn’t catch that — tap the mic and try again.',
};

const EVENTS = ['start', 'audiostart', 'soundstart', 'speechstart', 'speechend', 'soundend', 'audioend', 'nomatch'];
const SHORT = { start: 'start', audiostart: 'audio', soundstart: 'sound', speechstart: 'speech', speechend: 'speech-end', soundend: 'sound-end', audioend: 'audio-end', nomatch: 'no-match' };

let live = null; // the recognizer that is currently running, if any

// Shut a recognizer down for good: ask it to stop, and abort it if it hasn't ended shortly after.
function shutDown(r) {
  if (!r) return;
  try {
    r.stop();
  } catch {}
  setTimeout(() => {
    if (!r.ended) {
      try {
        r.abort();
      } catch {}
    }
  }, 800);
}

// Wires `button` to dictate into `field`. Speech is added after whatever is already typed.
// `status` (optional) shows what's happening. Returns stop(), to call when the field goes away.
export function attachDictation(button, field, status) {
  let rec = null; // this field's recognizer while listening

  const show = (listening, msg = '') => {
    button.classList.toggle('listening', listening);
    button.setAttribute('aria-pressed', String(listening));
    button.setAttribute('aria-label', listening ? 'Stop voice input' : 'Speak your note');
    if (status) status.textContent = msg;
  };

  const stop = () => {
    if (!rec) return;
    const r = rec;
    rec = null;
    shutDown(r);
    show(false); // if no words came back, onend explains
  };

  button.addEventListener('click', (e) => {
    e.preventDefault();
    if (rec) return stop();
    const R = Recognition();
    if (!R) return;
    if (live && !live.ended) {
      // A previous recognizer is still running somewhere — end it before starting a new one.
      try {
        live.abort();
      } catch {}
    }

    const r = new R();
    r.lang = navigator.language || 'en-US';
    r.interimResults = true;
    r.continuous = true;
    r.heard = false;
    r.ended = false;
    r.trail = [];
    rec = r;
    live = r;
    const base = field.value.replace(/\s+$/, '');

    for (const ev of EVENTS) r.addEventListener(ev, () => r.trail.push(SHORT[ev]));
    r.onresult = (ev) => {
      if (!r.trail.includes('text')) r.trail.push('text');
      let text = '';
      for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
      text = text.trim();
      if (!text) return;
      r.heard = true;
      if (!base || /[.!?]$/.test(base)) text = text[0].toUpperCase() + text.slice(1); // new sentence
      field.value = base ? `${base} ${text}` : text;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    };
    r.onerror = (ev) => {
      r.trail.push(`error:${ev.error}`);
      if (ev.error === 'aborted' || rec !== r) return;
      rec = null;
      show(false, ERRORS[ev.error] || `Voice input stopped (${ev.error}).`);
    };
    r.onend = () => {
      r.ended = true;
      r.trail.push('end');
      if (live === r) live = null;
      // No words came back: say so, with what the browser reported.
      const msg = r.heard ? '' : `No words came back. Try again, or use the mic key on your keyboard. [${r.trail.join(' · ')}]`;
      if (rec === r) {
        rec = null;
        show(false, msg);
      } else if (!r.heard && status && !button.classList.contains('listening')) {
        status.textContent = msg;
      }
    };

    try {
      r.start();
      show(true, 'Listening… tap the mic again to stop.');
    } catch (err) {
      rec = null;
      live = null;
      show(false, `Voice input couldn’t start (${err?.name || 'error'}). Try again in a moment.`);
    }
  });

  return stop;
}
