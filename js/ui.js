// Small UI helpers: escaping, formatting, toasts, bottom sheet, SVG charts.
import { CATEGORIES, TREE } from './data.js';
import { fromKey, addDays, weekStart, today } from './store.js';

export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const catColor = (cat) => CATEGORIES[cat]?.color || 'var(--accent)';
export const treeColor = (treeId) => catColor(TREE[treeId].category);

export function fmtTarget(st, sets = st.sets, target = st.target) {
  const val = st.kind === 'hold' ? `${target}s hold` : `${target} rep${target === 1 ? '' : 's'}`;
  return `${sets} × ${val}${st.side ? ` ${st.side}` : ''}`;
}

// Compact mono form: "3 × 10S", "3 × 8 /LEG".
export function fmtShort(st, sets = st.sets, target = st.target) {
  const side = st.side ? ` /${st.side.replace(/^per /, '').toUpperCase()}` : '';
  return `${sets} × ${target}${st.kind === 'hold' ? 'S' : ''}${side}`;
}

export const fmtVal = (st, v) => (st.kind === 'hold' ? `${v}s` : `${v}`);

export function fmtDate(key, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return fromKey(key).toLocaleDateString(undefined, opts);
}

export function fmtClock(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const tutorialUrl = (st) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${st.name} calisthenics tutorial`)}`;

// ---- toast ----

export function toast(msg, kind = '') {
  const host = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = msg;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, kind === 'big' ? 4200 : 2600);
}

// ---- bottom sheet ----

let sheetClose = null;

export function openSheet(html, { onClose } = {}) {
  const root = document.getElementById('sheet');
  root.innerHTML = `<div class="sheet-backdrop" data-sheet-close></div>
    <div class="sheet-panel" role="dialog" aria-modal="true"><div class="sheet-grip"></div>${html}</div>`;
  root.classList.add('open');
  document.body.classList.add('sheet-open');
  sheetClose = onClose || null;
  return root.querySelector('.sheet-panel');
}

export function closeSheet() {
  const root = document.getElementById('sheet');
  if (!root.classList.contains('open')) return;
  root.classList.remove('open');
  document.body.classList.remove('sheet-open');
  root.innerHTML = '';
  const fn = sheetClose;
  sheetClose = null;
  fn?.();
}

// Run `fn` when the open sheet closes (e.g. to stop the microphone).
export function setSheetClose(fn) {
  const prev = sheetClose;
  sheetClose = () => {
    fn();
    prev?.();
  };
}

export const sheetIsOpen = () => document.getElementById('sheet').classList.contains('open');

// ---- charts (inline SVG, theme-aware via CSS vars) ----

const W = 320;

export function lineChart(points, { height = 150, color = 'var(--accent)', unit = '', target = null } = {}) {
  if (!points.length) return `<div class="chart-empty">No data yet</div>`;
  const H = height;
  const pad = { l: 30, r: 10, t: 12, b: 22 };
  const ys = points.map((p) => p.y).concat(target ?? []);
  const maxY = Math.max(1, ...ys) * 1.1;
  const minY = 0;
  const x = (i) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (points.length - 1));
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - (v - minY) / (maxY - minY));
  const ticks = [0, maxY / 2, maxY].map((v) => Math.round(v));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const area = `${path} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const labelEvery = Math.ceil(points.length / 5);
  const last = points[points.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Progress chart">
    ${ticks.map((t) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${pad.l - 6}" y="${y(t) + 3}" class="axis" text-anchor="end">${t}</text>`).join('')}
    ${target != null ? `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(target)}" y2="${y(target)}" class="target-line"/><text x="${pad.l + 4}" y="${y(target) - 4}" class="axis">target ${target}${unit}</text>` : ''}
    <path d="${area}" fill="${color}" opacity="0.12"/>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    ${points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.y)}" r="3" fill="${color}"><title>${esc(p.label)}: ${p.y}${unit}</title></circle>`).join('')}
    ${points.map((p, i) => {
      const isLast = i === points.length - 1;
      if (!isLast && (i % labelEvery !== 0 || points.length - 1 - i < labelEvery / 2)) return '';
      const anchor = points.length > 1 && isLast ? 'end' : 'middle';
      return `<text x="${x(i)}" y="${H - 6}" class="axis" text-anchor="${anchor}">${esc(p.label)}</text>`;
    }).join('')}
    <text x="${x(points.length - 1)}" y="${y(last.y) - 8}" class="val" text-anchor="${points.length > 1 ? 'end' : 'middle'}">${last.y}${unit}</text>
  </svg>`;
}

export function barChart(bars, { height = 140, color = 'var(--accent)' } = {}) {
  const H = height;
  const pad = { l: 30, r: 6, t: 14, b: 22 };
  const maxY = Math.max(1, ...bars.map((b) => b.y)) * 1.1;
  const bw = (W - pad.l - pad.r) / bars.length;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / maxY);
  const ticks = [0, maxY / 2, maxY].map((v) => Math.round(v));
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart">
    ${ticks.map((t) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${pad.l - 6}" y="${y(t) + 3}" class="axis" text-anchor="end">${t}</text>`).join('')}
    ${bars
      .map((b, i) => {
        const h = y(0) - y(b.y);
        const bx = pad.l + i * bw + bw * 0.18;
        return `<rect x="${bx}" y="${y(b.y)}" width="${bw * 0.64}" height="${Math.max(0, h)}" rx="3" fill="${color}" opacity="${b.current ? 1 : 0.6}"><title>${esc(b.label)}: ${b.y}</title></rect>
        <text x="${bx + bw * 0.32}" y="${H - 6}" class="axis" text-anchor="middle">${esc(b.label)}</text>`;
      })
      .join('')}
  </svg>`;
}

// GitHub-style activity heatmap. counts: { 'YYYY-MM-DD': n }
export function heatmap(counts, weeks = 16) {
  const end = today();
  const start = addDays(weekStart(end), -7 * (weeks - 1));
  const cell = 14;
  const gap = 3;
  const left = 18;
  const w = left + weeks * (cell + gap);
  const h = 7 * (cell + gap) + 16;
  let rects = '';
  for (let wk = 0; wk < weeks; wk++) {
    for (let d = 0; d < 7; d++) {
      const key = addDays(start, wk * 7 + d);
      if (key > end) continue;
      const n = counts[key] || 0;
      const lvl = n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : 3;
      rects += `<rect x="${left + wk * (cell + gap)}" y="${d * (cell + gap)}" width="${cell}" height="${cell}" rx="3" class="hm hm${lvl}"><title>${fmtDate(key)}: ${n} exercise${n === 1 ? '' : 's'}</title></rect>`;
    }
  }
  const dayLabels = ['M', '', 'W', '', 'F', '', 'S']
    .map((l, d) => (l ? `<text x="0" y="${d * (cell + gap) + 11}" class="axis">${l}</text>` : ''))
    .join('');
  const monthLabels = Array.from({ length: weeks }, (_, wk) => {
    const key = addDays(start, wk * 7);
    const dt = fromKey(key);
    return dt.getDate() <= 7 ? `<text x="${left + wk * (cell + gap)}" y="${h - 2}" class="axis">${dt.toLocaleDateString(undefined, { month: 'short' })}</text>` : '';
  }).join('');
  return `<svg class="heatmap" viewBox="0 0 ${w} ${h}" role="img" aria-label="Training activity">${dayLabels}${rects}${monthLabels}</svg>`;
}

// Radar chart. axes: [{ label, value (0–1) }]
export function radar(axes) {
  const S = 320;
  const c = S / 2;
  const R = 104;
  const n = axes.length;
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (r, i) => [c + r * Math.cos(ang(i)), c + r * Math.sin(ang(i))];
  const poly = (r) => axes.map((_, i) => pt(r, i).map((v) => v.toFixed(1)).join(',')).join(' ');
  const rings = [0.25, 0.5, 0.75, 1].map((f) => `<polygon class="rd-ring" points="${poly(R * f)}"/>`).join('');
  const spokes = axes.map((_, i) => {
    const [x, y] = pt(R, i);
    return `<line class="rd-spoke" x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
  }).join('');
  const shape = axes.map((a, i) => pt(R * Math.max(0.03, Math.min(1, a.value)), i).map((v) => v.toFixed(1)).join(',')).join(' ');
  const dots = axes.map((a, i) => {
    const [x, y] = pt(R * Math.max(0.03, Math.min(1, a.value)), i);
    return `<circle class="rd-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3"><title>${esc(a.label)}: ${Math.round(a.value * 100)}%</title></circle>`;
  }).join('');
  const labels = axes.map((a, i) => {
    const [x, y] = pt(R + 20, i);
    const cos = Math.cos(ang(i));
    const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
    return `<text class="rd-label" x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="${anchor}">${esc(a.label.toUpperCase())}</text>`;
  }).join('');
  return `<svg class="radar" viewBox="-20 0 ${S + 40} ${S}" role="img" aria-label="Strength profile">${rings}${spokes}<polygon class="rd-shape" points="${shape}"/>${dots}${labels}</svg>`;
}

export function ring(pct, { size = 56, stroke = 6, color = 'var(--accent)', label = '' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, pct))}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" class="ring-label">${label}</text>
  </svg>`;
}

export function icon(name) {
  const paths = {
    today: '<path d="M4 7h16M4 7v12h16V7M4 7l1-3h14l1 3M9 12h6"/>',
    tree: '<circle cx="12" cy="19" r="2"/><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="9" r="2"/><path d="M12 17v-6M12 9 7.5 7.2M12 9l4.5-1.8"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    flame: '<path d="M12 22c4 0 7-3 7-7 0-3-2-6-4-8 0 3-2 4-3 4 0-3-1-6-4-9 0 4-5 7-5 13 0 4 4 7 9 7z"/>',
  };
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ''}</svg>`;
}
