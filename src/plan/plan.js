import { s, roomRects, roomArea, roomCenter, m2, meters } from '../lib/util.js';
import { analyzeWalls, doorFrame, planBounds } from '../lib/walls.js';
import { symbol } from './symbols.js';

const U = 100;

function wallRect(w, u0, u1, depth = w.t) {
  return w.horiz
    ? { x: u0 * U, y: (w.c - depth / 2) * U, width: (u1 - u0) * U, height: depth * U }
    : { x: (w.c - depth / 2) * U, y: u0 * U, width: depth * U, height: (u1 - u0) * U };
}

function opening(w, o) {
  const g = s('g', { class: `plan__op plan__op--${o.type}` });
  if (o.type === 'window' || o.type === 'glass') {
    g.append(s('rect', { ...wallRect(w, o.s0, o.s1), class: 'plan__sill' }));
    const mid = wallRect(w, o.s0, o.s1, o.type === 'glass' ? 0.035 : 0.02);
    g.append(s('rect', { ...mid, class: 'plan__pane' }));
  } else if (o.type === 'door') {
    const f = doorFrame(w, o);
    const [hx, hz] = f.hinge;
    const cx = (hx + f.closed[0] * o.w) * U;
    const cz = (hz + f.closed[1] * o.w) * U;
    const ox = (hx + f.normal[0] * o.w) * U;
    const oz = (hz + f.normal[1] * o.w) * U;
    const sweep = f.closed[0] * f.normal[1] - f.closed[1] * f.normal[0] > 0 ? 1 : 0;
    g.append(
      s('path', { d: `M${cx} ${cz} A${o.w * U} ${o.w * U} 0 0 ${sweep} ${ox} ${oz}`, class: 'plan__swing' }),
      s('line', { x1: hx * U, y1: hz * U, x2: ox, y2: oz, class: 'plan__leaf' }),
    );
  }
  return g;
}

function dimension(x1, y1, x2, y2, label, vertical) {
  const tick = 9;
  const g = s('g', { class: 'plan__dim' });
  g.append(s('line', { x1, y1, x2, y2 }));
  for (const [x, y] of [[x1, y1], [x2, y2]]) {
    g.append(s('line', { x1: x - tick, y1: y + tick, x2: x + tick, y2: y - tick }));
    g.append(vertical ? s('line', { x1: x - 18, y1: y, x2: x + 18, y2: y }) : s('line', { x1: x, y1: y - 18, x2: x, y2: y + 18 }));
  }
  const tx = (x1 + x2) / 2;
  const ty = (y1 + y2) / 2;
  g.append(s('text', vertical ? { x: tx, y: ty, transform: `rotate(-90 ${tx} ${ty})`, dy: -12, text: label } : { x: tx, y: ty, dy: -12, text: label }));
  return g;
}

// Renders an interactive SVG floor plan. Rooms are focusable buttons that report hover and selection.
export function renderPlan(host, plan, { onHover, onSelect } = {}) {
  const B = planBounds(plan);
  const pad = 110;
  const vb = [B.x0 * U - pad, B.z0 * U - pad, B.w * U + pad * 2, B.d * U + pad * 2];
  const svg = s('svg', { viewBox: vb.join(' '), class: 'plan', role: 'group', 'aria-label': `Denah ${plan.title}. Pilih ruang untuk melihat detail.` });
  const layers = Object.fromEntries(['rooms', 'furniture', 'walls', 'openings', 'labels', 'dims'].map((n) => [n, s('g', { class: `plan__${n}` })]));
  svg.append(...Object.values(layers));

  const rooms = new Map();
  for (const room of plan.rooms) {
    const area = roomArea(room);
    const g = s('g', {
      class: `plan__room plan__room--${room.floor ?? 'wood'}`,
      tabindex: 0,
      role: 'button',
      'aria-pressed': 'false',
      'aria-label': `${room.name}, ${m2(area)}`,
      'data-room': room.id,
    });
    for (const [x, z, w, d] of roomRects(room)) g.append(s('rect', { x: x * U, y: z * U, width: w * U, height: d * U }));
    g.addEventListener('pointerenter', () => onHover?.(room.id));
    g.addEventListener('pointerleave', () => onHover?.(null));
    g.addEventListener('focus', () => onHover?.(room.id));
    g.addEventListener('blur', () => onHover?.(null));
    g.addEventListener('click', () => onSelect?.(room.id));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect?.(room.id);
      }
    });
    layers.rooms.append(g);

    const [cx, cz] = roomCenter(room);
    const name = s('text', { class: 'plan__name', x: cx * U, y: cz * U, text: room.name });
    const sub = s('text', { class: 'plan__area', x: cx * U, y: cz * U, dy: '1.35em', text: m2(area) });
    const label = s('g', { class: 'plan__label', 'data-room': room.id }, name, sub);
    layers.labels.append(label);
    const widest = roomRects(room).reduce((a, r) => (r[2] * r[3] > a[2] * a[3] ? r : a));
    rooms.set(room.id, { g, label, name, sub, room, width: widest[2] * U, height: widest[3] * U });
  }

  for (const f of plan.furniture ?? []) {
    const el = symbol(f);
    if (el) layers.furniture.append(el);
  }

  for (const w of analyzeWalls(plan)) {
    const cls = w.h < 1.5 ? 'plan__wall plan__wall--low' : 'plan__wall';
    for (const [u0, u1] of w.solids) layers.walls.append(s('rect', { ...wallRect(w, u0, u1), class: cls }));
    for (const o of w.ops) layers.openings.append(opening(w, o));
  }

  const top = B.z0 * U - 62;
  const left = B.x0 * U - 62;
  layers.dims.append(
    dimension(B.x0 * U, top, B.x1 * U, top, meters(B.w)),
    dimension(left, B.z0 * U, left, B.z1 * U, meters(B.d), true),
  );
  const nx = B.x1 * U + 40;
  const ny = B.z0 * U - 40;
  layers.dims.append(
    s('g', { class: 'plan__north', transform: `translate(${nx} ${ny})` },
      s('circle', { r: 26 }),
      s('path', { d: 'M0 -20 L9 10 L0 4 L-9 10 Z' }),
      s('text', { y: 50, text: 'U' })),
    s('g', { class: 'plan__scale', transform: `translate(${B.x0 * U} ${B.z1 * U + 58})` },
      s('rect', { width: 100, height: 10 }),
      s('rect', { x: 100, width: 100, height: 10, class: 'alt' }),
      s('text', { x: 0, y: 36, text: '0' }),
      s('text', { x: 100, y: 36, text: '1' }),
      s('text', { x: 200, y: 36, text: '2 m' })),
  );

  host.replaceChildren(svg);

  function fitLabels() {
    const box = svg.getBoundingClientRect();
    if (!box.width) return;
    const k = Math.max(vb[2] / box.width, vb[3] / box.height);
    svg.style.setProperty('--k', k);
    for (const r of rooms.values()) {
      r.name.textContent = r.room.name;
      r.label.style.display = '';
      r.sub.style.display = '';
      const room = r.width * 0.86;
      if (r.name.getComputedTextLength() > room) r.name.textContent = r.room.short ?? r.room.name;
      if (r.name.getComputedTextLength() > room) r.label.style.display = 'none';
      if (r.height < 34 * k) r.sub.style.display = 'none';
    }
  }
  const ro = new ResizeObserver(fitLabels);
  ro.observe(svg);

  let selected = null;
  return {
    el: svg,
    highlight(id) {
      for (const [rid, r] of rooms) {
        r.g.classList.toggle('is-hover', rid === id);
        r.label.classList.toggle('is-hover', rid === id);
      }
    },
    select(id) {
      selected = id;
      for (const [rid, r] of rooms) {
        r.g.classList.toggle('is-selected', rid === selected);
        r.g.setAttribute('aria-pressed', String(rid === selected));
      }
    },
    destroy() {
      ro.disconnect();
      svg.remove();
    },
  };
}
