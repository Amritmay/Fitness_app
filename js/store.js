// App state, persisted to localStorage. Everything else is derived from this.
import { TREES, SKILL_TREES } from './data.js';

const KEY = 'ascend.v1';
const listeners = new Set();

export const VERSION = 1;

function blank() {
  return {
    version: VERSION,
    profile: null, // set by onboarding
    benchmarks: [], // [{ id, date, pullups, pushups, ... }]
    mastered: {}, // stepId -> { date, source: 'baseline' | 'logged' | 'manual' }
    sessions: [], // [{ id, date, ts, stepId, sets: [n], note }]
    plans: {}, // 'YYYY-MM-DD' -> { items, goals, restAck, seed }
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...blank(), ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Could not read saved data', e);
  }
  return blank();
}

export let state = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Could not save', e);
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function update(mutator, { silent = false } = {}) {
  mutator(state);
  save();
  if (!silent) listeners.forEach((fn) => fn());
}

// Re-render without changing data (UI-only state changed).
export function refresh() {
  listeners.forEach((fn) => fn());
}

export function replaceState(next) {
  state = { ...blank(), ...next };
  save();
  listeners.forEach((fn) => fn());
}

export function resetAll() {
  replaceState(blank());
}

export function exportJSON() {
  return JSON.stringify(state, null, 2);
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Ask the browser not to evict our storage (best effort).
export function requestPersistence() {
  try {
    navigator.storage?.persist?.();
  } catch {}
}

// ---- dates (local time, 'YYYY-MM-DD') ----

export function toKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const today = () => toKey(new Date());

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function daysBetween(a, b) {
  return Math.round((fromKey(b) - fromKey(a)) / 86400000);
}

// Monday of the week containing `key`.
export function weekStart(key) {
  const d = fromKey(key);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return toKey(d);
}

// ---- starting point ----

// profile.start = { trees: { treeId: currentStepIndex }, foundation: [stepIds] }
// Steps before the chosen index are marked mastered with source 'baseline'.
export function applyStartingPoint(s) {
  const start = s.profile?.start;
  if (!start) return;
  const date = s.profile.startDate || today();
  for (const [id, m] of Object.entries(s.mastered)) {
    if (m.source === 'baseline') delete s.mastered[id];
  }
  const mark = (id) => {
    if (!s.mastered[id]) s.mastered[id] = { date, source: 'baseline' };
  };
  (start.foundation || []).forEach(mark);
  for (const tree of SKILL_TREES) {
    const idx = start.trees?.[tree.id] || 0;
    tree.steps.slice(0, idx).forEach((st) => mark(st.id));
  }
}

export function treeIds() {
  return TREES.map((t) => t.id);
}
