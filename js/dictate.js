// Voice notes: speech-to-text into a text field using the browser's own speech recognition
// (Safari on iPhone/iPad/Mac, Chrome, Edge). Where it isn't available the mic button is hidden and the
// keyboard's dictation key still works.
//
// iOS quirks this works around:
//   • A new recognizer after the first one often hears nothing, so one recognizer is reused all session.
//   • Speech recognition gets no audio while a Web Audio context (the timer beeps) is running, so the
//     sound engine is closed while dictating and reopened afterwards if a rest timer still needs it.
//   • Continuous mode is unreliable, so on iOS each tap takes one phrase (tap again to add more).
import { releaseAudio, unlockAudio, restRunning } from './timer.js';

const Recognition = () => window.SpeechRecognition || window.webkitSpeechRecognition;

export const canDictate = () => Boolean(Recognition());

const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const ERRORS = {
  'not-allowed': 'Microphone access is off. Allow it when asked, or use the mic key on your keyboard.',
  'service-not-allowed': 'Voice input isn’t available here. Use the mic key on your keyboard instead.',
  'audio-capture': 'The microphone is busy or missing. Try again, or use the mic key on your keyboard.',
  network: 'Voice input needs an internet connection. The mic key on your keyboard may work offline.',
  'no-speech': 'Didn’t catch that — tap the mic and try again.',
};
const NO_AUDIO = 'Voice input didn’t start. Try again, or use the mic key on your keyboard.';

let rec = null; // the one recognizer, created on first use
let session = null; // what the recognizer is currently writing into

function recognizer() {
  if (rec) return rec;
  const R = Recognition();
  rec = new R();
  rec.lang = navigator.language || 'en-US';
  rec.interimResults = true;
  rec.continuous = !IOS;
  rec.onresult = (ev) => session?.onresult(ev);
  rec.onerror = (ev) => session?.onerror(ev);
  rec.onend = () => session?.onend();
  return rec;
}

// Wires `button` to dictate into `field`. Speech is added after whatever is already typed.
// `status` (optional) shows what's happening. Returns stop(), to call when the field goes away.
export function attachDictation(button, field, status) {
  let mine = null; // this field's session, while it's listening

  const show = (listening, msg = '') => {
    button.classList.toggle('listening', listening);
    button.setAttribute('aria-pressed', String(listening));
    button.setAttribute('aria-label', listening ? 'Stop voice input' : 'Speak your note');
    if (status) status.textContent = msg;
  };

  // Ends this field's session. `byUser` = from a tap, when iOS lets us turn the timer sound back on.
  const finish = (msg = '', byUser = false) => {
    if (!mine) return;
    if (session === mine) session = null;
    mine = null;
    show(false, msg);
    if (byUser && restRunning()) unlockAudio();
  };

  const stop = (byUser = true) => {
    if (!mine) return;
    try {
      rec.stop();
    } catch {}
    finish('', byUser);
  };

  button.addEventListener('click', (e) => {
    e.preventDefault();
    if (mine) return stop(true);
    if (!Recognition()) return;
    const r = recognizer();
    session?.cancel(); // another field was listening
    releaseAudio();

    const base = field.value.replace(/\s+$/, '');
    const started = Date.now();
    let heard = false;
    mine = {
      onresult(ev) {
        let text = '';
        for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
        text = text.trim();
        if (!text) return;
        heard = true;
        if (!base || /[.!?]$/.test(base)) text = text[0].toUpperCase() + text.slice(1); // new sentence
        field.value = base ? `${base} ${text}` : text;
        field.dispatchEvent(new Event('input', { bubbles: true }));
      },
      onerror(ev) {
        if (ev.error === 'aborted') return;
        finish(ERRORS[ev.error] || NO_AUDIO);
      },
      onend() {
        // Ended almost at once with nothing heard: the microphone never really started.
        if (!heard && Date.now() - started < 1500) return finish(NO_AUDIO);
        finish(heard && IOS ? 'Tap the mic to add more.' : '');
      },
      cancel: () => finish(),
    };
    session = mine;
    try {
      r.start();
      show(true, IOS ? 'Listening… pause when you’re done.' : 'Listening… tap the mic again to stop.');
    } catch {
      // Still finishing the last phrase — stop it and ask for another tap.
      try {
        r.abort();
      } catch {}
      finish('One moment — tap the mic again.');
    }
  });

  return () => stop(true);
}
