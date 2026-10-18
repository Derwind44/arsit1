import { mulberry32 } from '../lib/util.js';

// Furniture is modelled in local space: centred on its footprint, front (where people sit/stand) facing +z.
const col = (hex, fallback) => (hex ? `c:${hex}` : fallback);
const BOOKS = ['#b4653d', '#8e9a7c', '#d9c7a7', '#3c3a36', '#c49a6c', '#e9e2d5'];

function legs(k, w, d, h, inset, size, key) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    k.box(size, h, size, sx * (w / 2 - inset), 0, sz * (d / 2 - inset), key);
  }
}

function chair(k, f) {
  const key = col(f.chairColor, 'oak');
  legs(k, 0.42, 0.42, 0.44, 0.03, 0.035, key);
  k.box(0.44, 0.04, 0.44, 0, 0.44, 0, key);
  k.box(0.44, 0.38, 0.04, 0, 0.48, -0.2, key);
}

function stool(k, h = 0.7) {
  k.cyl(0.17, 0.02, 0, 0, 0, 'metal');
  k.cyl(0.022, h - 0.05, 0, 0.02, 0, 'metal');
  k.cyl(0.18, 0.05, 0, h - 0.05, 0, 'oak');
}

function seat(k, f, w, d, base = 0.1) {
  const key = col(f.color, 'c:#cdbfa6');
  legs(k, w, d, base, 0.08, 0.05, 'walnut');
  k.box(w, 0.24, d, 0, base, 0, key);
  k.box(w - 0.36, 0.12, d - 0.24, 0, base + 0.24, 0.07, key);
  k.box(w, 0.48, 0.2, 0, base + 0.24, -d / 2 + 0.1, key);
  k.box(0.18, 0.24, d, -w / 2 + 0.09, base + 0.24, 0, key);
  k.box(0.18, 0.24, d, w / 2 - 0.09, base + 0.24, 0, key);
}

function plant(k, s = 1) {
  k.cyl(0.19 * s, 0.42 * s, 0, 0, 0, 'pot', { r2: 0.23 * s });
  k.ico(0.36 * s, 0, 0.82 * s, 0, 'leaf', { detail: 1 });
  k.ico(0.28 * s, 0.13 * s, 1.08 * s, -0.08 * s, 'leaf', { ry: 1, detail: 1 });
  k.ico(0.25 * s, -0.15 * s, 1.0 * s, 0.1 * s, 'leaf', { ry: 2, detail: 1 });
}

export const FURNITURE = {
  sofa: (k, f) => seat(k, f, f.w ?? 2.2, f.d ?? 0.92),
  armchair: (k, f) => seat(k, { color: '#b5653d', ...f }, f.w ?? 0.86, f.d ?? 0.86, 0.14),
  bench(k, f) {
    const { w = 2, d = 0.55 } = f;
    const key = col(f.color, 'oak');
    k.box(w, 0.45, d, 0, 0, 0, key);
    k.box(w, 0.5, 0.1, 0, 0.45, -d / 2 + 0.05, key);
  },
  coffee(k, f) {
    const key = col(f.color, 'walnut');
    if (f.round) {
      k.cyl(0.22, 0.02, 0, 0, 0, key);
      k.cyl(0.07, 0.36, 0, 0.02, 0, key);
      k.cyl((f.w ?? 0.9) / 2, 0.04, 0, 0.36, 0, key, { seg: 32 });
    } else {
      const { w = 1.1, d = 0.6 } = f;
      legs(k, w, d, 0.36, 0.06, 0.05, key);
      k.box(w, 0.04, d, 0, 0.36, 0, key);
    }
  },
  rug(k, f) {
    k.box(f.w ?? 2, 0.012, f.d ?? 1.4, 0, 0.002, 0, `rug:${f.color ?? '#e6dccb'}`, { cast: false });
  },
  chair: (k, f) => chair(k, f),
  dining(k, f) {
    const { w = 1.6, d = 0.9 } = f;
    const key = col(f.color, 'oak');
    legs(k, w, d, 0.72, 0.08, 0.06, key);
    k.box(w, 0.04, d, 0, 0.72, 0, key);
    const n = f.chairs ?? Math.max(1, Math.round(w / 0.68));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + ((i + 0.5) * w) / n;
      k.at(x, -d / 2 - 0.3, 0, () => chair(k, f));
      k.at(x, d / 2 + 0.3, 180, () => chair(k, f));
    }
    if (f.ends) {
      k.at(-w / 2 - 0.3, 0, 90, () => chair(k, f));
      k.at(w / 2 + 0.3, 0, -90, () => chair(k, f));
    }
  },
  cafe(k, f) {
    const r = f.r ?? 0.35;
    k.cyl(0.2, 0.02, 0, 0, 0, 'metal');
    k.cyl(0.03, 0.72, 0, 0.02, 0, 'metal');
    if (f.square) k.box(r * 2, 0.04, r * 2, 0, 0.72, 0, col(f.color, 'oak'));
    else k.cyl(r, 0.04, 0, 0.72, 0, col(f.color, 'stone'), { seg: 28 });
    for (const a of f.chairs ?? [0, 180]) {
      const rad = (a * Math.PI) / 180;
      k.at(Math.sin(rad) * (r + 0.32), Math.cos(rad) * (r + 0.32), a + 180, () => chair(k, f));
    }
  },
  bed(k, f) {
    const { w = 1.8, d = 2.05 } = f;
    k.box(w, 0.3, d, 0, 0, 0, 'oak');
    k.box(w - 0.06, 0.22, d - 0.1, 0, 0.3, 0.03, 'linen');
    k.box(w + 0.1, 0.95, 0.08, 0, 0, -d / 2 + 0.04, col(f.color, 'c:#d9cdb8'));
    for (const sx of [-1, 1]) k.box(w / 2 - 0.16, 0.12, 0.36, (sx * w) / 4, 0.52, -d / 2 + 0.34, 'ceramic');
    k.box(w - 0.02, 0.05, d * 0.55, 0, 0.52, d / 2 - (d * 0.55) / 2 - 0.03, col(f.accent, 'c:#c9b39a'));
  },
  nightstand(k, f) {
    k.box(f.w ?? 0.48, 0.5, f.d ?? 0.4, 0, 0, 0, 'oak');
    k.cyl(0.05, 0.22, 0, 0.5, 0, 'metal');
    k.cyl(0.12, 0.18, 0, 0.7, 0, 'lamp', { r2: 0.09 });
  },
  wardrobe(k, f) {
    const { w = 2, d = 0.6 } = f;
    k.box(w, 2.1, d, 0, 0, 0, col(f.color, 'c:#e6dfd3'));
    for (let x = -w / 2 + w / 4; x < w / 2; x += w / 2) k.box(0.02, 0.5, 0.03, x, 0.85, d / 2, 'metal');
  },
  desk(k, f) {
    const { w = 1.4, d = 0.7 } = f;
    legs(k, w, d, 0.72, 0.05, 0.04, 'metal');
    k.box(w, 0.035, d, 0, 0.72, 0, col(f.color, 'oak'));
    if (f.monitor !== false) {
      k.box(0.06, 0.18, 0.06, 0, 0.755, -d / 2 + 0.16, 'metal');
      k.box(0.56, 0.32, 0.03, 0, 0.9, -d / 2 + 0.14, 'screen');
    }
    if (f.chair !== false) {
      k.at(0, d / 2 + 0.25, 180, () => {
        k.cyl(0.26, 0.04, 0, 0, 0, 'metal');
        k.cyl(0.03, 0.42, 0, 0.04, 0, 'metal');
        k.box(0.48, 0.07, 0.46, 0, 0.46, 0, col(f.chairColor, 'c:#3a3733'));
        k.box(0.46, 0.5, 0.06, 0, 0.53, -0.22, col(f.chairColor, 'c:#3a3733'));
      });
    }
  },
  desks(k, f) {
    const { w = 2.4, d = 1.4 } = f;
    const n = f.n ?? 2;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + ((i + 0.5) * w) / n;
      k.at(x, d / 4, 0, () => FURNITURE.desk(k, { ...f, w: w / n - 0.04, d: d / 2 }));
      k.at(x, -d / 4, 180, () => FURNITURE.desk(k, { ...f, w: w / n - 0.04, d: d / 2 }));
    }
  },
  counter(k, f) {
    const { w = 2.4, d = 0.6 } = f;
    const cab = col(f.color, 'c:#e8e3da');
    k.box(w, 0.08, d - 0.08, 0, 0, -0.04, 'metal');
    k.box(w, 0.78, d, 0, 0.08, 0, cab);
    k.box(w + 0.02, 0.04, d + 0.03, 0, 0.86, 0.015, 'stone');
    if (f.sink != null) {
      k.box(0.5, 0.02, 0.38, f.sink, 0.89, 0.02, 'steel');
      k.cyl(0.015, 0.28, f.sink, 0.9, -d / 2 + 0.08, 'steel');
    }
    if (f.cooktop != null) k.box(0.6, 0.012, 0.5, f.cooktop, 0.9, 0.02, 'screen');
    if (f.upper) k.box(f.upperW ?? w, 0.7, 0.35, f.upperX ?? 0, 1.5, -d / 2 + 0.175, cab);
  },
  island(k, f) {
    const { w = 2, d = 0.9 } = f;
    k.box(w, 0.9, d, 0, 0, 0, col(f.color, 'c:#e8e3da'));
    k.box(w + 0.1, 0.04, d + 0.1, 0, 0.9, 0, 'stone');
    const n = f.stools ?? 0;
    for (let i = 0; i < n; i++) k.at(-w / 2 + ((i + 0.5) * w) / n, d / 2 + 0.38, 0, () => stool(k));
  },
  fridge(k, f) {
    k.box(f.w ?? 0.75, 1.95, f.d ?? 0.7, 0, 0, 0, 'steel');
    k.box(0.03, 0.6, 0.03, (f.w ?? 0.75) / 2 - 0.08, 1.0, (f.d ?? 0.7) / 2 + 0.015, 'metal');
  },
  tv(k, f) {
    const { w = 1.8, d = 0.42 } = f;
    k.box(w, 0.4, d, 0, 0.12, 0, col(f.color, 'walnut'));
    legs(k, w, d, 0.12, 0.08, 0.04, 'metal');
    k.box(w * 0.72, 0.62, 0.04, 0, 0.95, -d / 2 + 0.03, 'screen');
  },
  console(k, f) {
    const { w = 1.8, d = 0.42 } = f;
    legs(k, w, d, 0.15, 0.06, 0.04, 'metal');
    k.box(w, 0.6, d, 0, 0.15, 0, col(f.color, 'walnut'));
    k.cyl(0.08, 0.3, w * 0.3, 0.75, 0, 'ceramic', { r2: 0.05 });
    k.box(0.32, 0.04, 0.24, -w * 0.25, 0.75, 0, 'c:#b4653d');
  },
  shelf(k, f) {
    const { w = 2, d = 0.35, h = 2 } = f;
    const rnd = mulberry32(Math.round((f.at[0] * 31 + f.at[1] * 17) * 100));
    const key = col(f.color, 'oak');
    k.box(0.03, h, d, -w / 2 + 0.015, 0, 0, key);
    k.box(0.03, h, d, w / 2 - 0.015, 0, 0, key);
    const rows = 5;
    for (let i = 0; i < rows; i++) {
      const y = 0.05 + (i * (h - 0.1)) / (rows - 1);
      k.box(w, 0.025, d, 0, y, 0, key);
      if (i === rows - 1) continue;
      let x = -w / 2 + 0.06;
      while (x < w / 2 - 0.2) {
        if (rnd() < 0.18) {
          x += 0.25;
          continue;
        }
        const bw = 0.025 + rnd() * 0.035;
        const bh = 0.2 + rnd() * 0.14;
        k.box(bw, bh, d * 0.75, x + bw / 2, y + 0.025, 0, `c:${BOOKS[Math.floor(rnd() * BOOKS.length)]}`);
        x += bw + 0.004;
      }
    }
  },
  plant: (k, f) => plant(k, f.s ?? 1),
  lamp(k) {
    k.cyl(0.16, 0.03, 0, 0, 0, 'metal');
    k.cyl(0.014, 1.42, 0, 0.03, 0, 'metal');
    k.cyl(0.22, 0.3, 0, 1.36, 0, 'lamp', { r2: 0.16 });
  },
  pendant(k, f) {
    const y = f.y ?? 1.8;
    k.cyl(0.006, (f.top ?? 2.8) - y - 0.2, 0, y + 0.2, 0, 'metal', { cast: false });
    k.cyl(0.32, 0.22, 0, y, 0, 'c:#c79d6b', { r2: 0.07, seg: 24 });
    k.sphere(0.07, 0, y + 0.02, 0, 'lamp', { cast: false });
  },
  toilet(k) {
    k.cyl(0.18, 0.4, 0, 0, 0.06, 'ceramic');
    k.cyl(0.19, 0.03, 0, 0.4, 0.06, 'ceramic');
    k.box(0.38, 0.4, 0.16, 0, 0.36, -0.22, 'ceramic');
  },
  vanity(k, f) {
    const { w = 0.9, d = 0.5 } = f;
    k.box(w, 0.42, d, 0, 0.38, 0, col(f.color, 'oak'));
    k.box(w, 0.03, d, 0, 0.8, 0, 'stone');
    k.cyl(0.17, 0.1, 0, 0.83, 0.03, 'ceramic');
    k.cyl(0.012, 0.22, 0, 0.83, -d / 2 + 0.06, 'steel');
    k.box(w * 0.8, 0.7, 0.02, 0, 1.2, -d / 2 + 0.01, 'c:#c9d4d6');
  },
  shower(k, f) {
    const { w = 1, d = 1 } = f;
    k.box(w, 0.04, d, 0, 0, 0, 'ceramic');
    k.box(w * 0.65, 1.95, 0.015, -w * 0.175, 0.04, d / 2 - 0.01, 'glass', { cast: false });
    k.cyl(0.1, 0.02, 0, 2.0, -d / 2 + 0.18, 'steel');
  },
  bathtub(k, f) {
    const { w = 1.7, d = 0.75 } = f;
    k.box(w, 0.56, d, 0, 0, 0, 'ceramic');
    k.box(w - 0.14, 0.02, d - 0.14, 0, 0.5, 0, 'water');
  },
  bar(k, f) {
    const { w = 3, d = 0.7 } = f;
    k.box(w, 1.05, d, 0, 0, 0, col(f.color, 'c:#3b3631'));
    k.box(w + 0.05, 0.05, d + 0.12, 0, 1.05, 0.04, 'oak');
    k.box(0.55, 0.42, 0.42, f.machine ?? w / 2 - 0.55, 1.1, -0.08, 'steel');
    k.box(0.9, 0.36, 0.44, f.display ?? -w / 2 + 0.65, 1.1, 0, 'glass', { cast: false });
    for (let i = 0; i < 4; i++) k.box(0.14, 0.06, 0.14, (f.display ?? -w / 2 + 0.65) - 0.3 + i * 0.2, 1.12, 0, 'c:#c49a6c');
    const n = f.stools ?? 0;
    for (let i = 0; i < n; i++) k.at(-w / 2 + ((i + 0.5) * w) / n, d / 2 + 0.4, 0, () => stool(k, 0.76));
  },
  stool: (k) => stool(k),
  washer(k) {
    k.box(0.6, 0.85, 0.6, 0, 0, 0, 'ceramic');
    k.cyl(0.17, 0.02, 0, 0.45, 0.3, 'screen', { rx: Math.PI / 2 });
  },
  model(k, f) {
    const { w = 1, d = 0.7 } = f;
    k.box(w, 0.03, d, 0, f.y ?? 0.76, 0, 'ash');
    const y = (f.y ?? 0.76) + 0.03;
    k.box(w * 0.42, 0.16, d * 0.5, -w * 0.12, y, -d * 0.08, 'clay');
    k.box(w * 0.5, 0.13, d * 0.42, w * 0.08, y + 0.16, -d * 0.04, 'clay');
    k.box(w * 0.2, 0.03, d * 0.3, w * 0.28, y, d * 0.22, 'water');
  },
  art(k, f) {
    const { w = 1.2, h = 0.9 } = f;
    k.box(w, h, 0.03, 0, f.y ?? 1.3, 0.015, 'art', { cast: false });
  },
};
