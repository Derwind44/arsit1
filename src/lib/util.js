export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const span = (p, a, b) => clamp((p - a) / (b - a));
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
export const narrowQuery = matchMedia('(max-width: 759px)');

export const onIdle = (fn, timeout = 1200) =>
  'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 120);

export function whenNear(el, fn, rootMargin = '600px 0px') {
  if (!el) return;
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      fn();
    }
  }, { rootMargin });
  io.observe(el);
}

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v);
  }
  el.append(...children.flat().filter(Boolean));
  return el;
}

const nf = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const m2 = (v) => `${nf.format(v)} m²`;
export const meters = (v) => `${nf2.format(v)} m`;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function roomRects(room) {
  return room.rects ?? [room.rect];
}

export function roomArea(room) {
  return roomRects(room).reduce((a, [, , w, d]) => a + w * d, 0);
}

export function roomCenter(room) {
  const [x, z, w, d] = roomRects(room).reduce((best, r) => (r[2] * r[3] > best[2] * best[3] ? r : best));
  return [x + w / 2, z + d / 2];
}

export function roomBounds(room) {
  const rs = roomRects(room);
  const x0 = Math.min(...rs.map((r) => r[0]));
  const z0 = Math.min(...rs.map((r) => r[1]));
  const x1 = Math.max(...rs.map((r) => r[0] + r[2]));
  const z1 = Math.max(...rs.map((r) => r[1] + r[3]));
  return { x0, z0, x1, z1, w: x1 - x0, d: z1 - z0, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
}

export const totalArea = (plan) => plan.rooms.reduce((a, r) => a + roomArea(r), 0);
