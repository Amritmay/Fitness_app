// Time estimates: how long each remaining step of a skill is likely to take at a steady, sustainable pace.
//
// Estimates are in training sessions, converted to weeks with the number of sessions a week your
// schedule gives the skill's movement group.
//   • Current step: the trend of your logged sets (weakest of the sets mastery needs), blended with
//     the typical time while there's little data.
//   • Later steps: a typical number of sessions from how big a jump in difficulty each step is
//     (biomech.js demands), scaled by your personal pace on steps you've already mastered.
// The range starts at the steady-pace estimate and widens with uncertainty — it never assumes rushing.
//
// Calibration: every step you've mastered through training is replayed — what would the estimate have
// said after 0, 1, 2… sessions, and how many sessions did it really take? The average miss becomes a
// correction factor for all your estimates, and the size of the misses sets how wide your ranges are.
// Until CALIBRATION_STEPS steps are in, estimates are shown as rough.
import { TREE, STEP, ALL_STEPS } from './data.js';
import { today, daysBetween } from './store.js';
import { isMastered, currentStep, sessionsFor, capacity, scheduleFor, DAY_TYPES } from './engine.js';
import { DEMANDS, GATES, stepLevel } from './biomech.js';

const NEW_PATTERN_CLIMB = 2; // a pattern the chain hasn't trained yet counts as at most this big a jump
const MAX_CLIMB = 3.5; // a step that leaps far past the chain's earlier steps (e.g. pull-ups 3×8 after a hang)
const PACE_DRIFT = 0.15; // personal pace can drift over a long chain, so far-off steps get a wider range
const ADHERENCE = 0.9; // the odd missed session, lighter weeks
const MIN_PACE = 0.75; // never assume you're much faster than typical…
const MIN_PACE_CALIBRATED = 0.6; // …unless your own history shows it
const MAX_PACE = 2;
export const CALIBRATION_STEPS = 3;

// ---- typical sessions to master a step ----

function climb(st, cap) {
  const tree = TREE[st.treeId];
  const before = {};
  for (const prev of tree.steps.slice(0, st.index)) {
    for (const [p, v] of Object.entries(DEMANDS[prev.id] || {})) before[p] = Math.max(before[p] || 0, v);
  }
  const climbs = Object.entries(DEMANDS[st.id] || {}).map(([p, v]) => {
    const baseP = Math.max(before[p] || 0, cap?.[p]?.value || 0);
    const c = Math.min(MAX_CLIMB, Math.max(0, v - baseP));
    return baseP ? c : Math.min(c, NEW_PATTERN_CLIMB);
  }).sort((a, b) => b - a);
  // The biggest jump drives it; the others add a little.
  return (climbs[0] || 0) + 0.5 * climbs.slice(1).reduce((a, b) => a + b, 0);
}

// Typical sessions to master `st`, ignoring your personal pace. `cap` (capacity from other chains)
// shortens steps you're already strong enough for.
export function typicalSessions(st, cap = null) {
  const L = stepLevel(st.id);
  // Harder levels take longer per unit of strength gained; foundation exercises come quicker.
  const perPoint = (1.5 + 0.25 * L * L) * (st.base ? 0.6 : 1);
  let n = (st.base ? 2 : 3) + climb(st, cap) * perPoint;
  const d = DEMANDS[st.id] || {};
  const top = Object.entries(d).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (top === 'sapull' || top === 'sapush') n *= 1.3; // straight-arm: tendons adapt slower than muscle
  const gate = GATES[st.id];
  if (gate === 'technique') n = Math.max(n, 4 + 2 * L); // balance / skill work needs practice time
  if (gate === 'tendon') n *= 1.2;
  if (gate === 'mobility') n = Math.max(n, 8);
  return n;
}

// How each step's uncertainty widens the range (high = low × spread). Once calibrated, the spread comes
// from how far off your past estimates actually were.
function spreadFor(st, cal) {
  const gate = GATES[st.id];
  const extra = gate === 'technique' ? 0.25 : gate === 'tendon' ? 0.05 : 0;
  if (cal.calibrated) return 1 + Math.min(0.6, Math.max(0.15, cal.error * 1.2)) + extra;
  return 1.45 + extra;
}

// ---- your data ----

// Sessions that were deliberate volume blocks (lighter sets on purpose) don't count toward the trend.
function isVolumeBlock(s, x) {
  return Boolean(s.plans[x.date]?.items.some((it) => it.stepId === x.stepId && it.reason.startsWith('Plateau')));
}

// A session's score: the weakest of the best N sets, where N is the sets mastery needs.
function sessionScore(st, x) {
  if (x.sets.length < st.sets) return null;
  return [...x.sets].sort((a, b) => b - a)[st.sets - 1];
}

// Steps you mastered by training them over more than one session — the ones that say something about pace.
function trainedSteps(s) {
  const out = [];
  for (const st of ALL_STEPS) {
    const m = s.mastered[st.id];
    if (!m || m.source !== 'logged' || m.jump) continue;
    const list = sessionsFor(s, st.id).filter((x) => x.date <= m.date);
    // Mastered on the first try: you could already do it, it says nothing about pace.
    if (list.length > 1) out.push({ st, list });
  }
  return out;
}

// Personal pace: sessions you actually needed ÷ typical, shrunk toward typical until a few steps are in.
function paceFrom(samples, excludeId, minPace) {
  let sum = 0;
  let w = 0;
  for (const x of samples) {
    if (x.st.id === excludeId) continue;
    sum += Math.log(Math.min(MAX_PACE, Math.max(0.5, x.list.length / typicalSessions(x.st))));
    w += 1;
  }
  return { pace: Math.min(MAX_PACE, Math.max(minPace, Math.exp(sum / (w + 3)))), samples: w };
}

export function personalPace(s, minPace = MIN_PACE) {
  return paceFrom(trainedSteps(s), null, minPace);
}

// Theil–Sen slope: the median of pairwise slopes, so one bad or great day doesn't swing it.
function robustSlope(ys) {
  const slopes = [];
  for (let i = 0; i < ys.length; i++) for (let j = i + 1; j < ys.length; j++) slopes.push((ys[j] - ys[i]) / (j - i));
  slopes.sort((a, b) => a - b);
  return slopes.length ? slopes[Math.floor(slopes.length / 2)] : 0;
}

function median(xs) {
  const a = [...xs].sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : 0;
}

// The sessions the trend is fitted to: no volume blocks, and nothing from before a break of 3+ weeks
// (older sessions say little about where you are now).
function trendSessions(s, list) {
  let out = list.filter((x) => !isVolumeBlock(s, x));
  for (let i = out.length - 1; i > 0; i--) {
    if (daysBetween(out[i - 1].date, out[i].date) > 21) {
      out = out.slice(i);
      break;
    }
  }
  return out;
}

// Sessions left on a step, given the sessions logged on it so far (`done` counts all of them).
function estimateStep(st, list, typical, done, maxDataWeight) {
  const scored = list.map((x) => sessionScore(st, x)).filter((v) => v != null && v > 0).slice(-8);
  const best = scored.length ? median(scored.slice(-3)) : 0;
  const progress = best ? Math.min(0.99, best / st.target) : null;

  // Typical sessions left: by how far from the target you are (a step usually starts around half of it),
  // or by sessions already put in when there's nothing to measure yet.
  const gapFrac = progress ? Math.min(1.5, Math.max(0.15, Math.log(1 / progress) / Math.log(2))) : null;
  const prior = Math.max(1, gapFrac != null ? typical * gapFrac : typical - done);

  let sessions = prior;
  let basis = 'typical';
  let stalled = false;
  if (scored.length >= 3) {
    const slope = robustSlope(scored.map((v) => Math.log(v)));
    const w = Math.min(maxDataWeight, (scored.length - 2) / 4);
    if (slope > 0.005) {
      // Don't let early fast gains promise more than ~2.5× the typical speed.
      const data = Math.max(prior * 0.4, Math.log(st.target / best) / slope);
      sessions = Math.exp(w * Math.log(Math.max(1, data)) + (1 - w) * Math.log(prior));
      basis = w >= 0.5 ? 'data' : 'mixed';
    } else if (scored.length >= 4) {
      stalled = true;
    }
  }
  return { sessions: Math.max(1, sessions), basis, stalled, progress };
}

// ---- calibration: replay your history ----

// For every step you mastered by training: after 0, 1, 2… sessions, what would the estimate have said,
// and how many sessions did it really take from there? factor = how much longer (>1) or shorter (<1)
// things really took on average; error = how far off a typical estimate was, after that correction.
export function calibration(s) {
  const samples = trainedSteps(s);
  const misses = samples.map(({ st, list }) => {
    const typical = typicalSessions(st, null) * paceFrom(samples, st.id, MIN_PACE).pace;
    const n = list.length;
    let sum = 0;
    for (let k = 0; k < n; k++) {
      const predicted = estimateStep(st, trendSessions(s, list.slice(0, k)), typical, k, 0.8).sessions;
      sum += Math.log((n - k) / predicted);
    }
    return sum / n;
  });
  const N = misses.length;
  // Shrink toward "no correction" while there are only a few steps to learn from.
  const logFactor = misses.reduce((a, b) => a + b, 0) / (N + 2);
  const factor = Math.min(2, Math.max(0.5, Math.exp(logFactor)));
  const error = N ? median(misses.map((m) => Math.abs(Math.exp(m - Math.log(factor)) - 1))) : null;
  return { samples: N, factor, error, calibrated: N >= CALIBRATION_STEPS, needed: Math.max(0, CALIBRATION_STEPS - N) };
}

// ---- schedule ----

// Sessions a week the skill's movement group gets in your schedule (as it would as a focus skill).
export function sessionsPerWeek(s, tree) {
  const sched = scheduleFor(s);
  return sched.types.filter((t) => t !== 'light' && DAY_TYPES[t].cats.includes(tree.category)).length;
}

// ---- the estimate ----

export function skillEta(s, tree, date = today()) {
  const cur = currentStep(s, tree);
  if (!cur) return null;
  const perWeek = sessionsPerWeek(s, tree);
  const cal = calibration(s);
  const { pace, samples } = personalPace(s, cal.calibrated ? MIN_PACE_CALIBRATED : MIN_PACE);
  const cap = capacity(s);
  // The correction only applies once calibration is complete; until then estimates stay rough (typical × pace).
  // Even then, never assume more than twice the typical speed.
  const factor = cal.calibrated ? Math.max(cal.factor, 0.5 / pace) : 1;
  const steps = [];
  let low = 0;
  let varSum = 0;
  let first = 0;
  let stalled = false;
  for (const st of tree.steps.slice(cur.index)) {
    if (isMastered(s, st.id)) continue;
    // Strength from other chains shortens a step; this chain's own earlier steps are counted by climb().
    const typical = typicalSessions(st, cap) * pace;
    let sessions = typical;
    let basis = samples ? 'pace' : 'typical';
    let progress = null;
    let spread = spreadFor(st, cal);
    if (st.id === cur.id) {
      const all = sessionsFor(s, st.id).filter((x) => x.date <= date);
      const c = estimateStep(st, trendSessions(s, all), typical, all.length, cal.calibrated ? 0.9 : 0.8);
      sessions = c.sessions;
      progress = c.progress;
      stalled = c.stalled;
      if (c.basis !== 'typical') {
        basis = c.basis;
        if (!cal.calibrated) spread = c.basis === 'data' ? 1.25 : 1.35;
      }
    }
    sessions *= factor;
    low += sessions;
    first ||= sessions;
    varSum += (sessions * (spread - 1)) ** 2;
    // Steps' uncertainties partly cancel out, so the range grows slower than the sum, plus a little for pace drift.
    const high = low + Math.sqrt(varSum) + PACE_DRIFT * (low - first);
    steps.push({
      st,
      sessions,
      basis,
      progress,
      weeks: [toWeeks(low, perWeek), toWeeks(high, perWeek)],
    });
  }
  return {
    tree,
    perWeek,
    pace,
    paceSamples: samples,
    calibration: cal,
    stalled,
    focus: (s.profile?.focus || []).includes(tree.id),
    steps,
    next: steps[0],
    total: steps[steps.length - 1].weeks,
  };
}

const toWeeks = (sessions, perWeek) => sessions / Math.max(1, perWeek * ADHERENCE);

// ---- formatting ----

// A friendly range: "~1 week", "3–5 weeks", "4–6 months", "1.5–2 years".
export function fmtRange([lo, hi]) {
  if (hi < 1.5) return '~1 week';
  if (hi < 10) {
    const a = Math.max(1, Math.round(lo));
    const b = Math.max(a + 1, Math.round(hi));
    return `${a}–${b} weeks`;
  }
  const mo = (w) => w / 4.35;
  if (mo(hi) < 18) {
    const a = Math.max(1, Math.round(mo(lo)));
    const b = Math.max(a + 1, Math.round(mo(hi)));
    return `${a}–${b} months`;
  }
  const yr = (w) => Math.round((w / 52) * 2) / 2;
  const a = Math.max(1, yr(lo));
  const b = Math.max(a + 0.5, yr(hi));
  return `${a}–${b} years`;
}

// Short form for the step list: "~2 wk", "~3 mo", "~1.5 yr".
export function fmtShortWeeks(w) {
  if (w < 1.5) return '~1 wk';
  if (w < 10) return `~${Math.round(w)} wk`;
  if (w / 4.35 < 18) return `~${Math.round(w / 4.35)} mo`;
  return `~${Math.round((w / 52) * 2) / 2} yr`;
}
