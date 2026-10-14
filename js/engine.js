// Derived logic: unlocks, XP/levels, plateau detection, daily plans, streaks.
import { TREES, TREE, STEP, SKILL_TREES, FOUNDATION, ALL_STEPS } from './data.js';
import { today, addDays, daysBetween, weekStart, uid } from './store.js';

// ---- status ----

export const isMastered = (s, stepId) => Boolean(s.mastered[stepId]);

export function treeRequiresMet(s, tree) {
  return tree.requires.every((id) => isMastered(s, id));
}

// 'mastered' | 'available' | 'locked'
export function stepStatus(s, stepId) {
  if (isMastered(s, stepId)) return 'mastered';
  const st = STEP[stepId];
  const tree = TREE[st.treeId];
  if (tree.parallel) return 'available';
  if (st.index === 0) return treeRequiresMet(s, tree) ? 'available' : 'locked';
  return isMastered(s, tree.steps[st.index - 1].id) ? 'available' : 'locked';
}

// First non-mastered step of a tree, or null when the tree is complete.
export function currentStep(s, tree) {
  return tree.steps.find((st) => !isMastered(s, st.id)) || null;
}

export function treeProgress(s, tree) {
  const done = tree.steps.filter((st) => isMastered(s, st.id)).length;
  return { done, total: tree.steps.length, pct: done / tree.steps.length };
}

// 'complete' | 'active' | 'locked'
export function treeState(s, tree) {
  const cur = currentStep(s, tree);
  if (!cur) return 'complete';
  return stepStatus(s, cur.id) === 'locked' ? 'locked' : 'active';
}

export function availableSteps(s) {
  return ALL_STEPS.filter((st) => stepStatus(s, st.id) === 'available');
}

// ---- sessions ----

export function sessionsFor(s, stepId) {
  return s.sessions.filter((x) => x.stepId === stepId).sort((a, b) => a.ts - b.ts);
}

export const bestOf = (sets) => (sets.length ? Math.max(...sets) : 0);

export function bestFor(s, stepId) {
  return sessionsFor(s, stepId).reduce((m, x) => Math.max(m, bestOf(x.sets)), 0);
}

export function lastTrained(s, treeId) {
  let last = null;
  for (const x of s.sessions) {
    if (STEP[x.stepId]?.treeId === treeId && (!last || x.date > last)) last = x.date;
  }
  return last;
}

export function meetsTarget(st, sets, nSets = st.sets, target = st.target) {
  return sets.filter((v) => v >= target).length >= nSets;
}

// ---- XP & levels ----

const tierMult = (st) => 1 + 0.15 * (st.treeId === 'foundation' ? 0 : st.index);

export function sessionXp(x) {
  const st = STEP[x.stepId];
  if (!st) return 0;
  const raw = x.sets.reduce((sum, v) => sum + (st.kind === 'hold' ? v : v * 3), 0);
  return Math.round(raw * tierMult(st));
}

export function masteryXp(st) {
  return st.treeId === 'foundation' ? 40 : 40 + 20 * st.index;
}

export const DAY_COMPLETE_XP = 25;

export function totalXp(s) {
  let xp = 0;
  for (const id of Object.keys(s.mastered)) if (STEP[id]) xp += masteryXp(STEP[id]);
  for (const x of s.sessions) xp += sessionXp(x);
  for (const date of Object.keys(s.plans)) if (planComplete(s, date)) xp += DAY_COMPLETE_XP;
  return xp;
}

const xpForLevel = (L) => Math.round(80 * Math.pow(L - 1, 1.7));

const TITLES = [
  [1, 'Novice'],
  [5, 'Apprentice'],
  [10, 'Athlete'],
  [15, 'Adept'],
  [20, 'Master'],
  [30, 'Legend'],
];

export function levelInfo(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const title = TITLES.filter(([l]) => level >= l).pop()[1];
  return { level, title, xp, into: xp - base, span: next - base, pct: (xp - base) / (next - base) };
}

// ---- plateau detection ----

// A step is plateaued when it has been trained for at least 2 weeks (4+ sessions)
// and the best set of the last 14 days is no better than anything before that.
export function plateau(s, stepId, date = today()) {
  if (isMastered(s, stepId)) return null;
  const list = sessionsFor(s, stepId);
  if (list.length < 4) return null;
  if (daysBetween(list[0].date, date) < 14) return null;
  const cutoff = addDays(date, -14);
  const recent = list.filter((x) => x.date > cutoff);
  const older = list.filter((x) => x.date <= cutoff);
  if (recent.length < 2 || !older.length) return null;
  const recentBest = Math.max(...recent.map((x) => bestOf(x.sets)));
  const olderBest = Math.max(...older.map((x) => bestOf(x.sets)));
  if (recentBest > olderBest) return null;
  return { stepId, best: Math.max(recentBest, olderBest), sessions: list.length };
}

export function plateauTips(st, info) {
  const prev = st.index > 0 && !TREE[st.treeId].parallel ? TREE[st.treeId].steps[st.index - 1] : null;
  const vol = Math.max(1, Math.round(info.best * 0.7));
  const unit = st.kind === 'hold' ? 's' : ' reps';
  const tips = [
    `Volume block: switch to 5 × ${vol}${unit} with full rest for 1–2 weeks, then retest.`,
    st.kind === 'hold'
      ? 'Add slow negatives or short "pulses" into the position to build strength at the hardest point.'
      : 'Add slow 5-second negatives after your working sets.',
    'Take a deload: halve your sets for one week, then come back fresh.',
  ];
  if (prev) tips.splice(1, 0, `Finish each session with 2 × max of the previous step (${prev.name}).`);
  tips.push('Re-read the form cues — a small technique fix often breaks a plateau.');
  return tips;
}

export function allPlateaus(s, date = today()) {
  return ALL_STEPS.map((st) => plateau(s, st.id, date)).filter(Boolean);
}

// ---- performance: last 14 days vs the 14 before ----

// Best set per step in each window. delta is null when there's nothing to compare against.
export function performance(s, date = today(), limit = 5) {
  const mid = addDays(date, -14);
  const start = addDays(date, -28);
  const by = {};
  for (const x of s.sessions) {
    if (x.date <= start || x.date > date || !STEP[x.stepId]) continue;
    const b = (by[x.stepId] ||= { recent: null, prev: null });
    const best = bestOf(x.sets);
    if (x.date > mid) b.recent = Math.max(b.recent ?? 0, best);
    else b.prev = Math.max(b.prev ?? 0, best);
  }
  return Object.entries(by)
    .filter(([, b]) => b.recent != null)
    .map(([stepId, b]) => ({ stepId, recent: b.recent, delta: b.prev == null ? null : b.recent - b.prev }))
    .sort((a, b) => (b.delta ?? -0.5) - (a.delta ?? -0.5))
    .slice(0, limit);
}

// ---- week / streak stats ----

export function trainingDates(s) {
  return new Set(s.sessions.map((x) => x.date));
}

export function weekDays(s, date = today()) {
  const start = weekStart(date);
  const dates = trainingDates(s);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    return { date: d, trained: dates.has(d), isToday: d === date, future: d > date };
  });
}

export function trainedThisWeek(s, date = today()) {
  return weekDays(s, date).filter((d) => d.trained).length;
}

// Consecutive weeks (ending with this week or last week) where the weekly target was hit.
export function weekStreak(s, date = today()) {
  const target = s.profile?.daysPerWeek || 3;
  const dates = trainingDates(s);
  const countWeek = (start) => Array.from({ length: 7 }, (_, i) => addDays(start, i)).filter((d) => dates.has(d)).length;
  let start = weekStart(date);
  let streak = 0;
  if (countWeek(start) >= target) streak++;
  start = addDays(start, -7);
  while (countWeek(start) >= target) {
    streak++;
    start = addDays(start, -7);
  }
  return streak;
}

export function restSuggested(s, date = today()) {
  const target = s.profile?.daysPerWeek || 3;
  const before = weekDays(s, date).filter((d) => d.trained && d.date < date).length;
  return before >= target && !trainingDates(s).has(date);
}

// ---- daily plan ----

function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function itemsForMinutes(min) {
  if (min <= 20) return 2;
  if (min <= 30) return 3;
  if (min <= 45) return 4;
  if (min <= 60) return 5;
  return 6;
}

export function makeItem(st, reason, sets = st.sets, target = st.target) {
  return { id: uid(), stepId: st.id, sets, target, reason, manualDone: false };
}

export function generatePlan(s, date = today(), seed = Math.floor(Math.random() * 1e9)) {
  const p = s.profile || {};
  const focus = new Set(p.focus || []);
  const rand = rng(seed);
  const old = s.plans[date];
  // Regenerating keeps whatever was already done today.
  const kept = old ? old.items.filter((it) => itemDone(s, date, it)) : [];
  const keptSteps = new Set(kept.map((it) => it.stepId));
  const candidates = [];

  for (const st of FOUNDATION.steps) {
    if (!isMastered(s, st.id) && !keptSteps.has(st.id)) candidates.push({ st, tree: FOUNDATION, score: 2.5, reason: 'Foundation' });
  }
  for (const tree of SKILL_TREES) {
    const st = currentStep(s, tree);
    if (!st || stepStatus(s, st.id) !== 'available' || keptSteps.has(st.id)) continue;
    let score = 1;
    let reason = 'Keep progressing';
    if (focus.has(tree.id)) {
      score += 3;
      reason = 'Focus skill';
    }
    const best = bestFor(s, st.id);
    if (best >= st.target * 0.8) {
      score += 1;
      if (reason !== 'Focus skill') reason = 'Close to unlock';
    }
    const last = lastTrained(s, tree.id);
    if (last && daysBetween(last, date) <= 1) score -= 2.5;
    candidates.push({ st, tree, score, reason });
  }
  candidates.forEach((c) => (c.score += rand() * 0.8));

  const max = itemsForMinutes(p.sessionMinutes || 45) - kept.length;
  const picked = [];
  const perCat = {};
  kept.forEach((it) => (perCat[STEP[it.stepId].cat] = (perCat[STEP[it.stepId].cat] || 0) + 1));
  while (picked.length < max && candidates.length) {
    candidates.sort((a, b) => b.score - (perCat[b.st.cat] || 0) * 1.2 - (a.score - (perCat[a.st.cat] || 0) * 1.2));
    const idx = candidates.findIndex((c) => (perCat[c.st.cat] || 0) < 2);
    if (idx === -1) break;
    const [c] = candidates.splice(idx, 1);
    perCat[c.st.cat] = (perCat[c.st.cat] || 0) + 1;
    picked.push(c);
  }

  const items = picked.map(({ st, reason }) => {
    const pl = plateau(s, st.id, date);
    if (pl) return makeItem(st, 'Plateau — volume block', 5, Math.max(1, Math.round(pl.best * 0.7)));
    return makeItem(st, reason);
  });

  return { items: [...kept, ...items], goals: old?.goals || [], restAck: old?.restAck || false, seed, createdAt: Date.now() };
}

export function itemDone(s, date, item) {
  if (item.manualDone) return true;
  const sets = s.sessions.filter((x) => x.date === date && x.stepId === item.stepId).flatMap((x) => x.sets);
  return sets.length >= item.sets;
}

export function planComplete(s, date) {
  const plan = s.plans[date];
  if (!plan || !plan.items.length) return false;
  return plan.items.every((it) => itemDone(s, date, it)) && plan.goals.every((g) => g.done);
}

// ---- logging ----

// Adds a session and handles mastery. Returns what changed, for toasts.
export function logSession(s, { stepId, sets, note = '', date = today() }) {
  const st = STEP[stepId];
  const before = new Set(availableSteps(s).map((x) => x.id));
  s.sessions.push({ id: uid(), date, ts: Date.now(), stepId, sets, note });
  const result = { xp: sessionXp({ stepId, sets }), mastered: null, unlocked: [] };
  if (stepStatus(s, stepId) === 'available' && meetsTarget(st, sets)) {
    s.mastered[stepId] = { date, source: 'logged' };
    result.mastered = st;
    result.xp += masteryXp(st);
    result.unlocked = availableSteps(s).filter((x) => !before.has(x.id));
  }
  return result;
}

export function deleteSession(s, id) {
  const x = s.sessions.find((y) => y.id === id);
  s.sessions = s.sessions.filter((y) => y.id !== id);
  // If that session was the one that earned a mastery, re-check it.
  if (x && s.mastered[x.stepId]?.source === 'logged') {
    const st = STEP[x.stepId];
    const still = s.sessions.some((y) => y.stepId === x.stepId && meetsTarget(st, y.sets));
    if (!still) delete s.mastered[x.stepId];
  }
}

// ---- starting-point suggestion from benchmarks ----

export function suggestStart(b = {}) {
  const n = (k) => Number(b[k]) || 0;
  const foundation = [];
  if (n('pullups') >= 1) foundation.push('found-hang', 'found-scap');
  if (n('pushups') >= 12) foundation.push('found-pushup');
  if (n('dips') >= 8) foundation.push('found-dips');
  if (n('squats') >= 20) foundation.push('found-squat');
  if (n('hollow') >= 30) foundation.push('found-hollow');

  const pu = n('pullups');
  const trees = {
    pullup: pu >= 16 ? 6 : pu >= 11 ? 5 : pu >= 7 ? 4 : pu >= 3 ? 3 : pu >= 1 ? 2 : 0,
    handstand: n('wallHS') >= 60 ? 3 : n('wallHS') >= 30 ? 2 : n('wallHS') >= 10 ? 1 : 0,
    pistol: 0,
    muscleup: pu >= 10 && n('dips') >= 8 ? 1 : 0,
    frontlever: 0,
    planche: 0,
    lsit: n('dips') >= 8 ? 1 : 0,
    dragonflag: n('hollow') >= 45 ? 1 : 0,
    humanflag: 0,
  };
  return { foundation, trees };
}

export { TREES };
