// Derived logic: unlocks, XP/levels, plateau detection, daily plans, streaks.
import { TREES, TREE, STEP, SKILL_TREES, ALL_STEPS } from './data.js';
import { today, addDays, daysBetween, weekStart, uid, fromKey } from './store.js';
import { PATTERNS, DEMANDS, GATES, BRIDGES, JUMP_TOLERANCE, MAX_SKIP, benchmarkCapacity } from './biomech.js';

// ---- status ----

export const isMastered = (s, stepId) => Boolean(s.mastered[stepId]);

export function treeRequiresMet(s, tree) {
  return tree.requires.every((id) => isMastered(s, id));
}

// Steps elsewhere that `st` still waits for (step.needs): an exercise with its own build-up in another
// chain is only opened once you've reached it there.
export function unmetNeeds(s, st) {
  return (st.needs || []).filter((id) => !isMastered(s, id)).map((id) => STEP[id]);
}

// 'mastered' | 'available' | 'locked'
export function stepStatus(s, stepId) {
  if (isMastered(s, stepId)) return 'mastered';
  const st = STEP[stepId];
  const tree = TREE[st.treeId];
  if (unmetNeeds(s, st).length) return 'locked';
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
  // Copies of an exercise mastered in another chain ('shared') don't earn the XP twice.
  for (const [id, m] of Object.entries(s.mastered)) if (STEP[id] && m.source !== 'shared') xp += masteryXp(STEP[id]);
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

// ---- biomechanics: strength profile, cross-tree jumps, carryover ----

export function latestBenchmarks(s) {
  const out = {};
  [...s.benchmarks].sort((a, b) => (a.date < b.date ? -1 : 1)).forEach((b) => {
    for (const [k, v] of Object.entries(b)) if (typeof v === 'number') out[k] = v;
  });
  return out;
}

// Capacity per movement pattern (0–10), with the step/benchmark that set it.
export function capacity(s) {
  const cap = Object.fromEntries(PATTERNS.map((p) => [p.id, { value: 0, from: null }]));
  const bump = (demands, factor, from) => {
    for (const [p, v] of Object.entries(demands || {})) {
      const val = v * factor;
      if (val > cap[p].value) cap[p] = { value: val, from };
    }
  };
  for (const [p, v] of Object.entries(benchmarkCapacity(latestBenchmarks(s)))) {
    if (v > cap[p].value) cap[p] = { value: v, from: { benchmark: true } };
  }
  for (const st of ALL_STEPS) {
    if (isMastered(s, st.id)) {
      // Going past the mastery target (e.g. in support work) adds a little on top: up to +15% at 1.5× the target.
      const over = Math.max(0, bestFor(s, st.id) / st.target - 1);
      bump(DEMANDS[st.id], 1 + Math.min(0.15, over * 0.3), { stepId: st.id });
    }
    else {
      // Partial credit for what you've already shown in practice.
      const best = bestFor(s, st.id);
      if (best) bump(DEMANDS[st.id], Math.min(1, best / st.target) * 0.9, { stepId: st.id, partial: true });
    }
  }
  return cap;
}

export function covers(cap, stepId) {
  return Object.entries(DEMANDS[stepId] || {}).every(([p, v]) => cap[p].value >= v - JUMP_TOLERANCE);
}

// The furthest step (≤ MAX_SKIP ahead) you can test into, or null.
export function jumpFor(s, tree, cap = capacity(s)) {
  if (!tree || tree.parallel) return null;
  const cur = currentStep(s, tree);
  if (!cur || stepStatus(s, cur.id) !== 'available') return null;
  let best = null;
  for (let i = cur.index + 1; i <= Math.min(cur.index + MAX_SKIP, tree.steps.length - 1); i++) {
    const target = tree.steps[i];
    if (isMastered(s, target.id)) continue;
    const skipped = tree.steps.slice(cur.index, i).filter((st) => !isMastered(s, st.id));
    if (skipped.some((st) => GATES[st.id])) break;
    // Never jump into or past a step that's waiting on another chain.
    if ([...skipped, target].some((st) => unmetNeeds(s, st).length)) break;
    if (![...skipped, target].every((st) => covers(cap, st.id))) break;
    best = { tree, target, skipped, evidence: evidenceFor(s, target, cap) };
  }
  return best;
}

export function allJumps(s) {
  const cap = capacity(s);
  return SKILL_TREES.map((t) => jumpFor(s, t, cap)).filter(Boolean);
}

// What earned the capacity a step needs: unique steps/benchmarks, strongest first.
export function evidenceFor(s, target, cap = capacity(s)) {
  const seen = new Set();
  return Object.entries(DEMANDS[target.id] || {})
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => cap[p].from)
    .filter((f) => {
      const key = f ? (f.benchmark ? 'bench' : f.stepId) : 'none';
      if (!f || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

// Max demand per pattern across a tree — what that tree trains.
const TREE_PROFILE = Object.fromEntries(
  SKILL_TREES.map((t) => {
    const prof = {};
    t.steps.forEach((st) => Object.entries(DEMANDS[st.id] || {}).forEach(([p, v]) => (prof[p] = Math.max(prof[p] || 0, v))));
    return [t.id, prof];
  })
);

// Other skill trees this step meaningfully trains for (shared patterns at a real intensity).
export function alsoBuilds(stepId, limit = 3) {
  const st = STEP[stepId];
  const d = DEMANDS[stepId] || {};
  // Only the step's main patterns count (within 75% of its biggest demand).
  const top = Math.max(0, ...Object.values(d));
  const main = Object.entries(d).filter(([, v]) => v >= 2.5 && v > top * 0.75);
  return SKILL_TREES.filter((t) => t.id !== st.treeId)
    .map((t) => {
      let score = 0;
      for (const [p, v] of main) if ((TREE_PROFILE[t.id][p] || 0) >= 2.5) score += Math.min(v, TREE_PROFILE[t.id][p]);
      return { tree: t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.tree);
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
  if (trainingDates(s).has(date)) return false;
  const before = weekDays(s, date).filter((d) => d.trained && d.date < date).length;
  return !dayInfo(s, date).training || before >= target;
}

// ---- weekly schedule: which days you train and what each session focuses on ----

// Training days (Mon = 0) are spread so rest days fall between hard sessions. The split alternates
// movement groups so the same muscles are never trained hard on back-to-back days.
export const SCHEDULES = {
  2: { days: [0, 3], types: ['full', 'full'] },
  3: { days: [0, 2, 4], types: ['full', 'full', 'full'] },
  4: { days: [0, 1, 3, 4], types: ['pull+core', 'push+legs', 'pull+core', 'push+legs'] },
  5: { days: [0, 1, 3, 4, 5], types: ['pull+core', 'push+legs', 'pull+core', 'push+legs', 'full'] },
  6: { days: [0, 1, 2, 3, 4, 5], types: ['pull+core', 'push+legs', 'pull+core', 'push+legs', 'pull+core', 'push+legs'] },
  7: { days: [0, 1, 2, 3, 4, 5, 6], types: ['pull+core', 'push+legs', 'pull+core', 'push+legs', 'pull+core', 'push+legs', 'light'] },
};

export const DAY_TYPES = {
  full: { label: 'Full body', short: ['Full'], cats: ['pull', 'push', 'core', 'legs'] },
  'pull+core': { label: 'Pull + Core', short: ['Pull', 'Core'], cats: ['pull', 'core'] },
  'push+legs': { label: 'Push + Legs', short: ['Push', 'Legs'], cats: ['push', 'legs'] },
  pull: { label: 'Pull', short: ['Pull'], cats: ['pull'] },
  push: { label: 'Push', short: ['Push'], cats: ['push'] },
  'legs+core': { label: 'Legs + Core', short: ['Legs', 'Core'], cats: ['legs', 'core'] },
  light: { label: 'Active recovery', short: ['Light'], cats: ['pull', 'push', 'core', 'legs'] },
};

export function scheduleFor(s) {
  const n = Math.min(7, Math.max(2, s.profile?.daysPerWeek || 3));
  return SCHEDULES[n];
}

export function dayInfo(s, date) {
  const sched = scheduleFor(s);
  const i = sched.days.indexOf((fromKey(date).getDay() + 6) % 7);
  return i >= 0 ? { training: true, type: sched.types[i] } : { training: false, type: null };
}

// A step trains a pattern hard when it's one of the step's main patterns (within 75% of its biggest
// demand) at a real intensity. Minor demands — e.g. the core work in a wall handstand — don't count.
const HARD = 3;

export function mainPatterns(stepId) {
  const d = DEMANDS[stepId] || {};
  const top = Math.max(0, ...Object.values(d));
  return Object.entries(d).filter(([, v]) => v >= HARD && v > top * 0.75).map(([p]) => p);
}

function hardPatterns(stepIds) {
  return new Set(stepIds.flatMap(mainPatterns));
}

// Patterns still recovering on `date`: anything trained hard the day before.
export function recoveringPatterns(s, date) {
  const prev = addDays(date, -1);
  return hardPatterns(s.sessions.filter((x) => x.date === prev).map((x) => x.stepId));
}

function needsRecovery(stepId, recovering) {
  return mainPatterns(stepId).some((p) => recovering.has(p));
}

// Session order: jump tests and balance/technique first (fresh nervous system), then strength, then foundation work.
function orderKey(it) {
  const st = STEP[it.stepId];
  if (it.support) return 4;
  if (it.reason.startsWith('Jump test')) return 0;
  if (GATES[st.id] === 'technique' || st.treeId === 'handstand') return 1;
  return st.base ? 3 : 2;
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

export function makeItem(st, reason, sets = st.sets, target = st.target, extra = {}) {
  return { id: uid(), stepId: st.id, sets, target, reason, manualDone: false, ...extra };
}

// ---- support work ----

// Focus skills also get one exercise you've already mastered — from earlier in the chain or a linked chain —
// for 2 sets, with a target that keeps rising past its mastery target. The foundation keeps growing alongside
// the skill instead of stopping at "good enough to pass". It never affects unlocking.
export const SUPPORT_SETS = 2;
const SUPPORT_CEILING = 1.5; // × the mastery target; after that it's held there as maintenance
const SUPPORT_POOL = 3; // exercises each skill rotates between

export const supportCeiling = (st) => Math.max(st.target + 1, Math.round(st.target * SUPPORT_CEILING));

// Weakest of your best SUPPORT_SETS sets in the last session on the step (0 if never trained).
function lastSupportLevel(s, st) {
  const last = sessionsFor(s, st.id).at(-1);
  if (!last) return 0;
  const top = [...last.sets].sort((a, b) => b - a);
  return top[Math.min(SUPPORT_SETS, top.length) - 1] || 0;
}

// Next target: a bit more than last time (about +10%), between the mastery target and the ceiling.
export function supportTarget(s, st) {
  const base = lastSupportLevel(s, st);
  const inc = st.kind === 'hold' ? Math.max(2, Math.round(base * 0.1)) : Math.max(1, Math.round(base * 0.1));
  return Math.min(supportCeiling(st), Math.max(st.target, base ? base + inc : st.target));
}

// How much of what `cur` demands a support exercise trains.
function supportRelevance(cand, cur) {
  const dc = DEMANDS[cand.id] || {};
  return Object.entries(DEMANDS[cur.id] || {}).reduce((r, [p, v]) => r + Math.min(v, dc[p] || 0), 0);
}

// Mastered exercises that build what the current step needs: earlier steps in the chain, plus mastered
// partners of those steps in linked chains. The same exercise appearing twice (e.g. pull-ups) counts once.
export function supportPool(s, tree, cur = currentStep(s, tree)) {
  if (!cur) return [];
  const byName = new Map();
  const add = (st) => {
    if (!isMastered(s, st.id) || (st.kind === 'reps' && st.target <= 1)) return; // "first rep" steps aren't support work
    const key = st.name.toLowerCase();
    const prev = byName.get(key);
    if (!prev || st.target > prev.target || (st.target === prev.target && st.treeId === tree.id && prev.treeId !== tree.id)) byName.set(key, st);
  };
  tree.steps.slice(0, cur.index).forEach(add);
  for (const b of BRIDGES) {
    for (const [here, there] of [[b.a, b.b], [b.b, b.a]]) {
      if (STEP[here].treeId === tree.id && STEP[here].index <= cur.index) add(STEP[there]);
    }
  }
  const all = [...byName.values()];
  const top = Math.max(0, ...all.map((st) => supportRelevance(st, cur)));
  // Only exercises that train a fair share of what the step needs (e.g. not a grip hang for chest-to-bar pulls).
  const cands = all.filter((st) => supportRelevance(st, cur) > 0 && supportRelevance(st, cur) >= 0.3 * top);
  // One per main pattern of the current step (so a muscle-up gets pulling *and* pressing), then by relevance.
  const d = DEMANDS[cur.id] || {};
  const main = mainPatterns(cur.id).length ? mainPatterns(cur.id) : Object.keys(d).sort((a, b) => d[b] - d[a]).slice(0, 1);
  const pool = [];
  for (const p of main) {
    const best = cands.filter((c) => (DEMANDS[c.id] || {})[p] && !pool.includes(c))
      .sort((a, b) => DEMANDS[b.id][p] - DEMANDS[a.id][p] || b.index - a.index)[0];
    if (best) pool.push(best);
  }
  for (const c of cands.sort((a, b) => supportRelevance(b, cur) - supportRelevance(a, cur) || b.index - a.index)) {
    if (pool.length >= SUPPORT_POOL) break;
    if (!pool.includes(c)) pool.push(c);
  }
  return pool.slice(0, SUPPORT_POOL);
}

// Today's support exercise for a skill: the one in its pool you've gone longest without, so each comes back
// about weekly. Ones already at their ceiling drop behind the rest.
function pickSupport(s, tree, date, recovering, takenNames) {
  const pool = supportPool(s, tree).filter((st) => !takenNames.has(st.name.toLowerCase()) && !needsRecovery(st.id, recovering));
  let best = null;
  for (const st of pool) {
    const last = sessionsFor(s, st.id).filter((x) => x.date < date).at(-1);
    const gap = last ? Math.min(14, daysBetween(last.date, date)) : 14;
    const atCeiling = lastSupportLevel(s, st) >= supportCeiling(st);
    const score = gap - (atCeiling ? 7 : 0) + 0.1 * pool.length - 0.1 * pool.indexOf(st);
    if (!best || score > best.score) best = { st, score };
  }
  return best?.st || null;
}

export function generatePlan(s, date = today(), seed = Math.floor(Math.random() * 1e9), { type: forceType } = {}) {
  const p = s.profile || {};
  const focus = new Set(p.focus || []);
  const rand = rng(seed);
  const old = s.plans[date];
  const info = dayInfo(s, date);
  const type = forceType || info.type || 'full';
  const cats = new Set(DAY_TYPES[type].cats);
  const recovering = recoveringPatterns(s, date);
  // Groups the next training day will focus on — today must leave their main muscles fresh.
  const next = dayInfo(s, addDays(date, 1));
  const protect = new Set(next.training ? DAY_TYPES[next.type].cats : []);
  const protectPatterns = new Set(
    SKILL_TREES.filter((t) => protect.has(t.category) && !cats.has(t.category))
      .map((t) => currentStep(s, t))
      .filter(Boolean)
      .flatMap((st) => mainPatterns(st.id))
  );
  // Regenerating keeps whatever was already done today.
  const kept = old ? old.items.filter((it) => itemDone(s, date, it)) : [];
  const keptSteps = new Set(kept.map((it) => it.stepId));
  const keptTrees = new Set(kept.map((it) => STEP[it.stepId].treeId));
  const candidates = [];

  if (type === 'light') {
    // Active recovery: easy foundation exercises that load nothing hard (practice even if mastered).
    const easy = SKILL_TREES.flatMap((t) => t.steps.filter((st) => st.base && !mainPatterns(st.id).length))
      .filter((st) => !keptSteps.has(st.id))
      .map((st) => ({ st, score: rand() + (lastTrained(s, st.treeId) ? 0 : 0.5) }))
      .sort((a, b) => b.score - a.score);
    const seen = new Set();
    const items = easy.filter(({ st }) => (seen.has(st.treeId) ? false : seen.add(st.treeId))).slice(0, 3)
      .map(({ st }) => makeItem(st, 'Active recovery'));
    return { items: [...kept, ...items], type, goals: old?.goals || [], restAck: old?.restAck || false, seed, createdAt: Date.now() };
  }

  // A focus skill whose next step waits on another chain (e.g. Human Flag's pull-ups on First pull-ups):
  // that chain gets the focus priority instead, so the wait is as short as possible.
  const unlocks = new Map(); // treeId -> name of the focus skill it unlocks
  for (const id of focus) {
    const cur = TREE[id] && currentStep(s, TREE[id]);
    if (cur) for (const n of unmetNeeds(s, cur)) if (!unlocks.has(n.treeId)) unlocks.set(n.treeId, TREE[id].name);
  }

  const cap = capacity(s);
  for (const tree of SKILL_TREES) {
    if (keptTrees.has(tree.id)) continue;
    const jump = jumpFor(s, tree, cap);
    const st = jump ? jump.target : currentStep(s, tree);
    if (!st || (!jump && stepStatus(s, st.id) !== 'available') || keptSteps.has(st.id)) continue;
    // Hard rule: muscles trained hard yesterday get their recovery day.
    if (needsRecovery(st.id, recovering)) continue;
    const inSplit = cats.has(tree.category);
    if (!inSplit && protect.has(tree.category)) continue;
    const tiresTomorrow = mainPatterns(st.id).some((pt) => protectPatterns.has(pt));
    if (!inSplit && tiresTomorrow) continue;
    let score = (inSplit ? 2 : -1.5) - (tiresTomorrow ? 2.5 : 0);
    let reason = st.base ? 'Foundation' : `${DAY_TYPES[type].label} day`;
    if (focus.has(tree.id)) {
      score += 3;
      reason = 'Focus skill';
    } else if (unlocks.has(tree.id)) {
      score += 3;
      reason = `Unlocks ${unlocks.get(tree.id)}`;
    }
    // Two-for-one: exercises that also build your other focus skills rank higher.
    const twoForOne = alsoBuilds(st.id).filter((t) => focus.has(t.id));
    if (twoForOne.length) {
      score += 0.6 * twoForOne.length;
      if (reason !== 'Focus skill' && !unlocks.has(tree.id)) reason = `Also builds ${twoForOne[0].name}`;
    }
    if (jump) {
      score += 0.8;
      reason = `Jump test · skips ${jump.skipped.length}`;
    }
    const best = bestFor(s, st.id);
    if (best >= st.target * 0.8) {
      score += 1;
      if (!focus.has(tree.id) && !unlocks.has(tree.id) && !jump) reason = 'Close to unlock';
    }
    // Rotation: chains you haven't trained for a while move up; never-trained chains get their turn first.
    const last = lastTrained(s, tree.id);
    score += last ? Math.min(3, 0.35 * daysBetween(last, date)) : 5;
    if (!inSplit) reason = 'Extra · recovered muscles';
    candidates.push({ st, tree, score, reason, inSplit });
  }
  candidates.forEach((c) => (c.score += rand() * 0.6));
  candidates.sort((a, b) => b.score - a.score);

  // Fill from the day's split first; only top up with other (recovered) chains if the split runs short.
  // Multi-group days take the best exercise from each group before doubling up on any one group.
  const max = Math.max(0, itemsForMinutes(p.sessionMinutes || 45) - kept.length);
  const inSplit = candidates.filter((c) => c.inSplit);
  const focused = inSplit.filter((c) => focus.has(c.tree.id) || unlocks.has(c.tree.id));
  const covered = new Set(focused.map((c) => c.tree.category));
  const firsts = [...cats].filter((cat) => !covered.has(cat)).map((cat) => inSplit.find((c) => c.tree.category === cat)).filter(Boolean);
  firsts.sort((a, b) => b.score - a.score);
  const head = [...focused, ...firsts];
  const ordered = [...head, ...inSplit.filter((c) => !head.includes(c)), ...candidates.filter((c) => !c.inSplit)];
  // On multi-group days no single group takes more than its share (e.g. 2 of 4 on Push + Legs),
  // so groups with many skills (legs) can't crowd out the rest.
  const capPerCat = cats.size > 1 && cats.size < 4 ? Math.ceil(max / cats.size) : max;
  const perCat = {};
  kept.forEach((it) => (perCat[STEP[it.stepId].cat] = (perCat[STEP[it.stepId].cat] || 0) + 1));
  // The same exercise can sit in several chains (e.g. hollow body hold) — only do it once a day.
  const names = new Set(kept.map((it) => STEP[it.stepId].name.toLowerCase()));
  const picked = [];
  const take = (c) => {
    picked.push(c);
    names.add(c.st.name.toLowerCase());
  };
  for (const c of ordered) {
    if (picked.length >= max) break;
    if (names.has(c.st.name.toLowerCase())) continue;
    if (c.inSplit && (perCat[c.st.cat] || 0) >= capPerCat) continue;
    perCat[c.st.cat] = (perCat[c.st.cat] || 0) + 1;
    take(c);
  }
  // Top up if the caps left empty slots.
  for (const c of ordered) if (picked.length < max && !picked.includes(c) && !names.has(c.st.name.toLowerCase())) take(c);

  const items = picked.map(({ st, reason }) => {
    const pl = plateau(s, st.id, date);
    if (pl) return makeItem(st, 'Plateau — volume block', 5, Math.max(1, Math.round(pl.best * 0.7)));
    return makeItem(st, reason);
  });

  // Support work for the focus skills trained today (2 sets, after the main exercises).
  const supported = new Set(kept.filter((it) => it.support).map((it) => it.support));
  const trainedToday = new Set([...kept, ...items].filter((it) => !it.support).map((it) => STEP[it.stepId].treeId));
  for (const tree of SKILL_TREES) {
    if (!focus.has(tree.id) || !trainedToday.has(tree.id) || supported.has(tree.id)) continue;
    const st = pickSupport(s, tree, date, recovering, names);
    if (!st) continue;
    names.add(st.name.toLowerCase());
    items.push(makeItem(st, 'Support work', SUPPORT_SETS, supportTarget(s, st), { support: tree.id }));
  }
  const all = [...kept, ...items].sort((a, b) => orderKey(a) - orderKey(b));

  return { items: all, type, goals: old?.goals || [], restAck: old?.restAck || false, seed, createdAt: Date.now() };
}

// The whole week (Mon–Sun) containing `date`: past days from your log, today's saved plan, and a preview
// of upcoming sessions simulated as if each planned session gets done.
export function weekPlan(s, date = today()) {
  const sim = JSON.parse(JSON.stringify(s));
  const start = weekStart(date);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    const info = dayInfo(s, d);
    const logged = s.sessions.filter((x) => x.date === d).map((x) => x.stepId);
    let steps = [];
    let items = null;
    let type = info.type;
    if (d < date) steps = [...new Set(logged)];
    else {
      let plan = d === date ? sim.plans[d] : null;
      if (!plan && info.training) plan = generatePlan(sim, d, 7919 * (i + 1));
      if (plan && (info.training || d === date)) {
        type = plan.type || type;
        steps = plan.items.map((it) => it.stepId);
        items = plan.items;
        // Pretend the session happens so the next day's recovery is realistic.
        for (const it of plan.items) {
          if (!sim.sessions.some((x) => x.date === d && x.stepId === it.stepId)) {
            // Support sets are simulated as hit, so later previews show the target climbing.
            sim.sessions.push({ id: `sim-${d}-${it.stepId}`, date: d, ts: fromKey(d).getTime() + 43200000, stepId: it.stepId, sets: Array(it.sets).fill(it.support ? it.target : 0), note: '' });
          }
        }
      }
    }
    days.push({ date: d, training: info.training, type, steps, items, trained: logged.length > 0, isToday: d === date, past: d < date });
  }
  return days;
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
  const jump = jumpFor(s, TREE[st.treeId]);
  const id = uid();
  s.sessions.push({ id, date, ts: Date.now(), stepId, sets, note });
  const result = { xp: sessionXp({ stepId, sets }), mastered: null, jumped: [], unlocked: [] };
  if (stepStatus(s, stepId) === 'available' && meetsTarget(st, sets)) {
    s.mastered[stepId] = { date, source: 'logged' };
    result.mastered = st;
  } else if (jump && jump.target.id === stepId && meetsTarget(st, sets)) {
    // Passed a jump test: master the target and credit the steps it skipped.
    s.mastered[stepId] = { date, source: 'logged', jump: true };
    jump.skipped.forEach((x) => (s.mastered[x.id] = { date, source: 'transfer', via: id }));
    result.mastered = st;
    result.jumped = jump.skipped;
  }
  if (result.mastered) {
    result.xp += [result.mastered, ...result.jumped].reduce((n, x) => n + masteryXp(x), 0);
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
  // If that undid a passed jump test, the steps it credited go too.
  if (x && !s.mastered[x.stepId]) {
    for (const [stepId, m] of Object.entries(s.mastered)) if (m.via === id) delete s.mastered[stepId];
  }
}

// ---- starting-point suggestion from benchmarks ----

// Index of the step you're currently working on in each chain, from benchmark tests.
// Only chains the tests say something direct about move; the rest start at their foundation and
// can jump ahead using strength from neighbouring chains.
export function suggestStart(b = {}) {
  const n = (k) => Number(b[k]) || 0;
  const pu = n('pullups');
  const hs = n('wallHS');
  return {
    trees: {
      pullup: pu >= 16 ? 8 : pu >= 11 ? 7 : pu >= 7 ? 6 : pu >= 3 ? 5 : pu >= 1 ? 4 : 0,
      muscleup: 0,
      frontlever: n('hollow') >= 30 ? 1 : 0,
      handstand: hs >= 60 ? 5 : hs >= 30 ? 4 : hs >= 10 ? 3 : n('pushups') >= 12 ? 1 : 0,
      planche: n('pushups') >= 12 ? 1 : 0,
      lsit: n('hollow') >= 30 ? 1 : 0,
      dragonflag: n('hollow') >= 30 ? 1 : 0,
      humanflag: 0,
      pistol: n('squats') >= 20 ? 1 : 0,
      squat: n('squats') >= 50 ? 4 : n('squats') >= 30 ? 2 : n('squats') >= 20 ? 1 : 0,
    },
  };
}

export { TREES };
