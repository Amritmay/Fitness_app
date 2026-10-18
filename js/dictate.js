// Voice notes: speech-to-text into a text field using the browser's own speech recognition
// (Safari on iPhone/iPad/Mac, Chrome, Edge). Where it isn't available the mic button is hidden and the
// keyboard's dictation key still works.

const Recognition = () => window.SpeechRecognition || window.webkitSpeechRecognition;

export const canDictate = () => Boolean(Recognition());

const ERRORS = {
  'not-allowed': 'Microphone access is off. Allow it in your browser settings, or use the mic key on your keyboard.',
  'service-not-allowed': 'Voice input isn’t available here. Use the mic key on your keyboard instead.',
  'audio-capture': 'No microphone found.',
  network: 'Voice input needs an internet connection. The mic key on your keyboard may work offline.',
  'no-speech': 'Didn’t catch that — tap the mic and try again.',
};

// Wires `button` to dictate into `field`. Speech is added after whatever is already typed.
// `status` (optional) shows what's happening. Returns stop(), to call when the field goes away.
export function attachDictation(button, field, status) {
  let rec = null;
  let base = '';

  const setState = (listening, msg = '') => {
    button.classList.toggle('listening', listening);
    button.setAttribute('aria-pressed', String(listening));
    button.setAttribute('aria-label', listening ? 'Stop voice input' : 'Speak your note');
    if (status) status.textContent = msg;
  };

  const stop = () => {
    if (!rec) return;
    const r = rec;
    rec = null;
    try {
      r.stop();
    } catch {}
    setState(false);
  };

  button.addEventListener('click', (e) => {
    e.preventDefault();
    if (rec) return stop();
    const R = Recognition();
    if (!R) return;
    rec = new R();
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = true;
    rec.continuous = true;
    base = field.value.replace(/\s+$/, '');
    const r = rec;

    r.onresult = (ev) => {
      if (r !== rec) return;
      let text = '';
      for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
      text = text.trim();
      if (!text) return;
      if (!base || /[.!?]$/.test(base)) text = text[0].toUpperCase() + text.slice(1); // new sentence
      field.value = base ? `${base} ${text}` : text;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    };
    r.onerror = (ev) => {
      if (r !== rec && ev.error !== 'not-allowed') return;
      rec = null;
      setState(false, ERRORS[ev.error] || 'Voice input stopped.');
    };
    r.onend = () => {
      if (r !== rec) return;
      rec = null;
      setState(false);
    };
    try {
      r.start();
      setState(true, 'Listening… tap the mic again to stop.');
    } catch {
      rec = null;
      setState(false, ERRORS['service-not-allowed']);
    }
  });

  return stop;
}
