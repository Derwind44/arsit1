// Shared wall analysis: the 3D builder and the 2D plan both read this, so they never disagree.
const DEFAULTS = {
  door: { sill: 0, head: 2.1 },
  opening: { sill: 0, head: 2.1 },
  window: { sill: 0.9, head: 2.1 },
  glass: { sill: 0, head: 2.4 },
};

const EPS = 1e-3;

export function analyzeWalls(plan) {
  const H = plan.height ?? 2.8;
  return plan.walls.map(([x1, z1, x2, z2, t = 0.12, h = H], index) => {
    const horiz = Math.abs(z1 - z2) < EPS;
    const c = horiz ? z1 : x1;
    const a0 = horiz ? Math.min(x1, x2) : Math.min(z1, z2);
    const a1 = horiz ? Math.max(x1, x2) : Math.max(z1, z2);

    const ops = (plan.openings ?? [])
      .filter(({ at: [x, z] }) =>
        horiz
          ? Math.abs(z - c) < EPS && x > a0 - EPS && x < a1 + EPS
          : Math.abs(x - c) < EPS && z > a0 - EPS && z < a1 + EPS,
      )
      .map((o) => {
        const p = horiz ? o.at[0] : o.at[1];
        return { ...DEFAULTS[o.type], ...o, s0: p - o.w / 2, s1: p + o.w / 2 };
      })
      .sort((a, b) => a.s0 - b.s0);

    const solids = [];
    let cur = a0 - t / 2;
    for (const o of ops) {
      if (o.s0 > cur + EPS) solids.push([cur, o.s0]);
      cur = Math.max(cur, o.s1);
    }
    if (a1 + t / 2 > cur + EPS) solids.push([cur, a1 + t / 2]);

    return { index, horiz, c, a0, a1, t, h, ops, solids };
  });
}

// Every box a wall turns into, as [u0, u1, y0, y1] along the wall axis.
export function wallPieces(wall, cut = Infinity) {
  const out = [];
  const add = (u0, u1, y0, y1) => {
    const top = Math.min(y1, cut);
    if (top - y0 > EPS && u1 - u0 > EPS) out.push([u0, u1, y0, top]);
  };
  for (const [u0, u1] of wall.solids) add(u0, u1, 0, wall.h);
  for (const o of wall.ops) {
    if (o.sill > 0) add(o.s0, o.s1, 0, o.sill);
    if (o.head < wall.h) add(o.s0, o.s1, o.head, wall.h);
  }
  return out;
}

export function doorFrame(wall, o) {
  const end = o.hinge === 'end';
  const along = end ? o.s1 : o.s0;
  const dir = end ? -1 : 1;
  const swing = o.swing ?? 1;
  return {
    hinge: wall.horiz ? [along, wall.c] : [wall.c, along],
    closed: wall.horiz ? [dir, 0] : [0, dir],
    normal: wall.horiz ? [0, swing] : [swing, 0],
    w: o.w,
  };
}

export function planBounds(plan) {
  const xs = plan.walls.flatMap(([x1, , x2]) => [x1, x2]);
  const zs = plan.walls.flatMap(([, z1, , z2]) => [z1, z2]);
  const x0 = Math.min(...xs);
  const z0 = Math.min(...zs);
  const x1 = Math.max(...xs);
  const z1 = Math.max(...zs);
  return { x0, z0, x1, z1, w: x1 - x0, d: z1 - z0, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
}
