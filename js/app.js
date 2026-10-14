// Entry point: hash router, tab bar, global event delegation, service worker.
import { state, subscribe } from './store.js';
import { icon, closeSheet, sheetIsOpen } from './ui.js';
import { initRestPill } from './timer.js';
import { celebrationOpen, closeCelebration } from './celebrate.js';
import { limitFocus, logo } from './views/onboarding.js';
import * as onboarding from './views/onboarding.js';
import * as todayView from './views/today.js';
import * as skills from './views/skills.js';
import * as progress from './views/progress.js';
import * as profile from './views/profile.js';

const app = document.getElementById('app');
const tabbar = document.getElementById('tabbar');

const actions = { ...todayView.actions, ...skills.actions, ...progress.actions, ...profile.actions };
const forms = { ...todayView.forms, ...profile.forms };
const changes = { ...progress.changes, ...profile.changes };

const TABS = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'skills', label: 'Skills', icon: 'tree' },
  { id: 'progress', label: 'Progress', icon: 'chart' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];

function parseRoute() {
  const [name = 'today', arg] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: name || 'today', arg };
}

let lastRoute = '';

function render() {
  const route = parseRoute();
  if (!state.profile) {
    tabbar.hidden = true;
    if (!app.querySelector('#onboard')) {
      app.innerHTML = onboarding.render();
      onboarding.mount(app);
    }
    return;
  }
  if (route.name === 'onboarding') return void (location.hash = '#/today');
  tabbar.hidden = false;

  let html;
  let tab = route.name;
  switch (route.name) {
    case 'skills':
      html = skills.renderMap();
      break;
    case 'tree':
      html = skills.renderTree(route.arg);
      tab = 'skills';
      break;
    case 'progress':
      html = progress.render();
      break;
    case 'profile':
      html = profile.render();
      break;
    default:
      tab = 'today';
      todayView.ensurePlan();
      html = todayView.render();
  }

  // Keep scroll position on in-place re-renders, reset it on navigation.
  const key = location.hash;
  const y = window.scrollY;
  app.innerHTML = html;
  window.scrollTo(0, key === lastRoute ? y : 0);
  lastRoute = key;

  tabbar.innerHTML = `<a class="brand" href="#/today" aria-label="Ascend home">${logo()}<span>Ascend</span></a>` + TABS.map(
    (t) => `<a href="#/${t.id}" class="${t.id === tab ? 'active' : ''}" aria-current="${t.id === tab ? 'page' : 'false'}">${icon(t.icon)}<span>${t.label}</span></a>`
  ).join('');
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-sheet-close]')) return closeSheet();
  const el = e.target.closest('[data-act]');
  if (!el || !app.contains(el)) return;
  const fn = actions[el.dataset.act];
  if (fn) {
    e.preventDefault();
    fn(el, e);
  }
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  forms[form.dataset.form]?.(form, e);
});

document.addEventListener('change', (e) => {
  if (e.target.name === 'focus') limitFocus(e);
  const el = e.target.closest('[data-change]');
  if (el) changes[el.dataset.change]?.(el, e);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && celebrationOpen()) return closeCelebration();
  if (e.key === 'Escape' && sheetIsOpen()) return closeSheet();
  // Desktop shortcuts: 1–4 switch tabs (ignored while typing or with a sheet open).
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
  if (typing || sheetIsOpen() || e.metaKey || e.ctrlKey || e.altKey || !state.profile) return;
  const tab = TABS[Number(e.key) - 1];
  if (tab) location.hash = `#/${tab.id}`;
});

window.addEventListener('hashchange', () => {
  closeSheet();
  render();
});

// Re-render on data changes and when the day rolls over while the app stays open.
subscribe(render);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !sheetIsOpen()) render();
});

initRestPill();
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW registration failed', err));
}
