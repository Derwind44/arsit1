import { s } from '../lib/util.js';

// 2D furniture symbols in centimetres, centred on the footprint, front facing +y (plan "down").
const r = (w, h, x = 0, y = 0, cls, rx = 0) => s('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx, class: cls });
const c = (radius, x = 0, y = 0, cls) => s('circle', { cx: x, cy: y, r: radius, class: cls });
const l = (x1, y1, x2, y2, cls) => s('line', { x1, y1, x2, y2, class: cls });
const at = (x, y, rot, ...kids) => s('g', { transform: `translate(${x} ${y}) rotate(${rot})` }, ...kids);

const chair = () => [r(44, 44, 0, 0, null, 4), l(-22, -18, 22, -18)];

function seat(w, d) {
  return [
    r(w, d, 0, 0, null, 8),
    l(-w / 2 + 18, -d / 2 + 20, w / 2 - 18, -d / 2 + 20),
    l(-w / 2 + 18, -d / 2 + 20, -w / 2 + 18, d / 2),
    l(w / 2 - 18, -d / 2 + 20, w / 2 - 18, d / 2),
    ...(w > 140 ? [l(0, -d / 2 + 20, 0, d / 2 - 6, 'fine')] : []),
  ];
}

const SYMBOLS = {
  sofa: (f) => seat((f.w ?? 2.2) * 100, (f.d ?? 0.92) * 100),
  armchair: (f) => seat((f.w ?? 0.86) * 100, (f.d ?? 0.86) * 100),
  bench: (f) => [r((f.w ?? 2) * 100, (f.d ?? 0.55) * 100), l(-(f.w ?? 2) * 50, -(f.d ?? 0.55) * 50 + 10, (f.w ?? 2) * 50, -(f.d ?? 0.55) * 50 + 10)],
  coffee: (f) => (f.round ? [c((f.w ?? 0.9) * 50)] : [r((f.w ?? 1.1) * 100, (f.d ?? 0.6) * 100, 0, 0, null, 4)]),
  rug: (f) => [r((f.w ?? 2) * 100, (f.d ?? 1.4) * 100, 0, 0, 'rug')],
  chair: () => chair(),
  dining(f) {
    const w = (f.w ?? 1.6) * 100;
    const d = (f.d ?? 0.9) * 100;
    const n = f.chairs ?? Math.max(1, Math.round(w / 68));
    const out = [];
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + ((i + 0.5) * w) / n;
      out.push(at(x, -d / 2 - 30, 0, ...chair()), at(x, d / 2 + 30, 180, ...chair()));
    }
    if (f.ends) out.push(at(-w / 2 - 30, 0, -90, ...chair()), at(w / 2 + 30, 0, 90, ...chair()));
    out.push(r(w, d, 0, 0, 'solid', 3));
    return out;
  },
  cafe(f) {
    const rad = (f.r ?? 0.35) * 100;
    const out = (f.chairs ?? [0, 180]).map((a) => {
      const t = (a * Math.PI) / 180;
      return at(Math.sin(t) * (rad + 32), Math.cos(t) * (rad + 32), -(a + 180), ...chair());
    });
    out.push(f.square ? r(rad * 2, rad * 2, 0, 0, 'solid', 3) : c(rad, 0, 0, 'solid'));
    return out;
  },
  bed(f) {
    const w = (f.w ?? 1.8) * 100;
    const d = (f.d ?? 2.05) * 100;
    return [
      r(w, d, 0, 0, null, 4),
      r(w + 10, 8, 0, -d / 2 + 4, 'solid'),
      r(w / 2 - 16, 34, -w / 4, -d / 2 + 34, null, 8),
      r(w / 2 - 16, 34, w / 4, -d / 2 + 34, null, 8),
      l(-w / 2, d / 2 - d * 0.55, w / 2, d / 2 - d * 0.55),
    ];
  },
  nightstand: (f) => [r((f.w ?? 0.48) * 100, (f.d ?? 0.4) * 100), c(9)],
  wardrobe: (f) => [r((f.w ?? 2) * 100, (f.d ?? 0.6) * 100), l(-(f.w ?? 2) * 50, 0, (f.w ?? 2) * 50, 0, 'fine')],
  desk(f) {
    const w = (f.w ?? 1.4) * 100;
    const d = (f.d ?? 0.7) * 100;
    return [r(w, d), ...(f.chair === false ? [] : [c(22, 0, d / 2 + 25)]), ...(f.monitor === false ? [] : [l(-28, -d / 2 + 14, 28, -d / 2 + 14, 'fine')])];
  },
  desks(f) {
    const w = (f.w ?? 2.4) * 100;
    const d = (f.d ?? 1.4) * 100;
    const n = f.n ?? 2;
    const out = [];
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + ((i + 0.5) * w) / n;
      const desk = SYMBOLS.desk({ w: w / n / 100 - 0.04, d: d / 200 });
      out.push(at(x, d / 4, 0, ...desk), at(x, -d / 4, 180, ...desk));
    }
    return out;
  },
  counter(f) {
    const w = (f.w ?? 2.4) * 100;
    const d = (f.d ?? 0.6) * 100;
    const out = [r(w, d)];
    if (f.upper) out.push(r(w - 6, 30, 0, -d / 2 + 18, 'dash'));
    if (f.sink != null) out.push(r(50, 38, f.sink * 100, 2, null, 6), c(4, f.sink * 100, 2));
    if (f.cooktop != null) for (const [dx, dy] of [[-14, -12], [14, -12], [-14, 12], [14, 12]]) out.push(c(9, f.cooktop * 100 + dx, 2 + dy));
    return out;
  },
  island(f) {
    const w = (f.w ?? 2) * 100;
    const d = (f.d ?? 0.9) * 100;
    const n = f.stools ?? 0;
    const out = [r(w + 10, d + 10, 0, 0, 'solid', 3)];
    for (let i = 0; i < n; i++) out.push(c(18, -w / 2 + ((i + 0.5) * w) / n, d / 2 + 38));
    return out;
  },
  fridge: (f) => [r((f.w ?? 0.75) * 100, (f.d ?? 0.7) * 100), l(-(f.w ?? 0.75) * 50, -(f.d ?? 0.7) * 50, (f.w ?? 0.75) * 50, (f.d ?? 0.7) * 50, 'fine')],
  tv: (f) => [r((f.w ?? 1.8) * 100, (f.d ?? 0.42) * 100), r((f.w ?? 1.8) * 72, 4, 0, -(f.d ?? 0.42) * 50 + 3, 'solid')],
  console: (f) => [r((f.w ?? 1.8) * 100, (f.d ?? 0.42) * 100), c(8, (f.w ?? 1.8) * 30, 0)],
  shelf: (f) => [r((f.w ?? 2) * 100, (f.d ?? 0.35) * 100), l(-(f.w ?? 2) * 50, 0, (f.w ?? 2) * 50, 0, 'fine')],
  plant: (f) => [c(30 * (f.s ?? 1), 0, 0, 'leaf'), c(18 * (f.s ?? 1), 6, -5, 'leaf'), c(21 * (f.s ?? 1))],
  lamp: () => [c(18), l(-12, -12, 12, 12, 'fine'), l(-12, 12, 12, -12, 'fine')],
  toilet: () => [r(38, 16, 0, -22), s('ellipse', { cx: 0, cy: 8, rx: 18, ry: 24 })],
  vanity: (f) => [r((f.w ?? 0.9) * 100, (f.d ?? 0.5) * 100), s('ellipse', { cx: 0, cy: 3, rx: 17, ry: 13 })],
  shower(f) {
    const w = (f.w ?? 1) * 100;
    const d = (f.d ?? 1) * 100;
    return [r(w, d), l(-w / 2, -d / 2, w / 2, d / 2, 'fine'), l(-w / 2, d / 2, w / 2, -d / 2, 'fine'), c(4)];
  },
  bathtub: (f) => [r((f.w ?? 1.7) * 100, (f.d ?? 0.75) * 100, 0, 0, null, 10), r((f.w ?? 1.7) * 100 - 16, (f.d ?? 0.75) * 100 - 16, 0, 0, 'fine', 18)],
  bar(f) {
    const w = (f.w ?? 3) * 100;
    const d = (f.d ?? 0.7) * 100;
    const n = f.stools ?? 0;
    const out = [r(w + 5, d + 12, 0, 4, 'solid', 3), r(90, 44, (f.display ?? -w / 200 + 0.65) * 100, 0, 'glass'), r(55, 42, (f.machine ?? w / 200 - 0.55) * 100, -8)];
    for (let i = 0; i < n; i++) out.push(c(18, -w / 2 + ((i + 0.5) * w) / n, d / 2 + 40));
    return out;
  },
  stool: () => [c(18)],
  washer: () => [r(60, 60), c(18)],
  model: (f) => [r((f.w ?? 1) * 100, (f.d ?? 0.7) * 100, 0, 0, 'dash')],
};

export function symbol(f) {
  const make = SYMBOLS[f.t];
  if (!make) return null;
  return at(f.at[0] * 100, f.at[1] * 100, -(f.rot ?? 0), ...make(f));
}
