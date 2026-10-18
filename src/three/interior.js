import { Parts } from './parts.js';
import { FURNITURE } from './furniture.js';
import { TEXTURE_SCALE } from './textures.js';
import { analyzeWalls, wallPieces, doorFrame, planBounds } from '../lib/walls.js';
import { roomRects } from '../lib/util.js';

const angleOf = ([x, z]) => Math.atan2(-z, x);

function wallBox(parts, w, u0, u1, y0, y1, depth, key, o) {
  const len = u1 - u0;
  const mid = (u0 + u1) / 2;
  if (w.horiz) parts.box(len, y1 - y0, depth, mid, y0, w.c, key, o);
  else parts.box(depth, y1 - y0, len, w.c, y0, mid, key, o);
}

function glazing(parts, w, o, cutH) {
  const top = Math.min(o.head, cutH);
  if (top - o.sill < 0.05) return;
  const frame = { cast: false, edges: false };
  wallBox(parts, w, o.s0, o.s1, o.sill, top, 0.025, 'glass', { cast: false, receive: false, edges: false });
  wallBox(parts, w, o.s0, o.s1, o.sill, o.sill + 0.04, 0.06, 'metal', frame);
  if (top === o.head) wallBox(parts, w, o.s0, o.s1, top - 0.04, top, 0.06, 'metal', frame);
  const n = Math.max(1, Math.ceil(o.w / (o.type === 'glass' ? 1.1 : 1.3)));
  for (let i = 0; i <= n; i++) {
    const u = o.s0 + (i * o.w) / n;
    wallBox(parts, w, u - 0.02, u + 0.02, o.sill, top, 0.06, 'metal', frame);
  }
}

function buildWalls(parts, walls, layer, cutH, edges) {
  parts.layer = layer;
  for (const w of walls) {
    for (const [u0, u1, y0, y1] of wallPieces(w, cutH)) {
      wallBox(parts, w, u0, u1, y0, y1, w.t, 'plaster', { edges });
      if (y1 === cutH) wallBox(parts, w, u0, u1, y1, y1 + 0.012, w.t + 0.004, 'cap', { cast: false, edges: false });
    }
    for (const o of w.ops) if (o.type === 'window' || o.type === 'glass') glazing(parts, w, o, cutH);
  }
}

// Turns a plan (rooms, walls, openings, furniture) into a merged three.js group.
export function buildInterior(THREE, plan, lib, opts = {}) {
  const { walls: wallMode = 'both', cut = 1.25, edges = true, clay = false, doorOpen = 0.8, base = true } = opts;
  const { furnitureEdges = edges, showEdges = clay } = opts;
  const root = new THREE.Group();
  const parts = new Parts(THREE);
  const walls = analyzeWalls(plan);
  const bounds = planBounds(plan);

  if (base) {
    parts.layer = 'base';
    parts.box(bounds.w + 0.5, 0.12, bounds.d + 0.5, bounds.cx, -0.12, bounds.cz, 'base', { edges });
  }
  if (wallMode !== 'cut') buildWalls(parts, walls, 'walls', Infinity, edges);
  if (wallMode !== 'full') buildWalls(parts, walls, 'wallsCut', cut, edges);

  parts.layer = 'furniture';
  parts.edgesOn = furnitureEdges;
  for (const f of plan.furniture ?? []) {
    const make = FURNITURE[f.t];
    if (make) parts.at(f.at[0], f.at[1], f.rot ?? 0, () => make(parts, f));
  }
  parts.edgesOn = false;

  const layers = parts.build(lib, { clay, showEdges });
  parts.dispose();
  Object.values(layers).forEach((g) => root.add(g));

  const floors = [];
  const overlays = new Map();
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xc4602f, transparent: true, depthWrite: false });
  const strip = (w, d, x, z) => {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, edgeMat);
    m.position.set(x, 0.026, z);
    m.renderOrder = 3;
    m.userData.overlay = true;
    return m;
  };
  for (const room of plan.rooms) {
    const key = `floor_${room.floor ?? 'wood'}`;
    const sc = TEXTURE_SCALE[room.floor] ?? 1;
    const fill = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false });
    const group = new THREE.Group();
    group.visible = false;
    overlays.set(room.id, { group, fill });
    root.add(group);
    for (const [x, z, w, d] of roomRects(room)) {
      const g = new THREE.PlaneGeometry(w, d);
      g.rotateX(-Math.PI / 2);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w + x) / sc, (uv.getY(i) * d - z - d) / sc);
      const floor = new THREE.Mesh(g, clay ? lib.clay(key) : lib.get(key));
      floor.position.set(x + w / 2, 0.002, z + d / 2);
      floor.receiveShadow = true;
      floor.userData = { key, room: room.id };
      const over = new THREE.Mesh(g, fill);
      over.position.set(x + w / 2, 0.02, z + d / 2);
      over.renderOrder = 2;
      over.userData.overlay = true;
      const t = 0.07;
      group.add(
        over,
        strip(w, t, x + w / 2, z + t / 2),
        strip(w, t, x + w / 2, z + d - t / 2),
        strip(t, d, x + t / 2, z + d / 2),
        strip(t, d, x + w - t / 2, z + d / 2),
      );
      root.add(floor);
      floors.push(floor);
    }
  }

  const doors = [];
  const doorGroup = new THREE.Group();
  for (const w of walls) {
    for (const o of w.ops) {
      if (o.type !== 'door') continue;
      const f = doorFrame(w, o);
      const pivot = new THREE.Group();
      pivot.position.set(f.hinge[0], 0, f.hinge[1]);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(o.w - 0.04, o.head - 0.02, 0.04), clay ? lib.clay('oak') : lib.get('oak'));
      leaf.position.set((o.w - 0.04) / 2 + 0.02, (o.head - 0.02) / 2, 0);
      leaf.castShadow = leaf.receiveShadow = true;
      leaf.userData.key = 'oak';
      pivot.add(leaf);
      const a0 = angleOf(f.closed);
      const max = ((o.open ?? 95) * Math.PI) / 180;
      const dir = [f.closed[0] * Math.cos(max) + f.normal[0] * Math.sin(max), f.closed[1] * Math.cos(max) + f.normal[1] * Math.sin(max)];
      let delta = angleOf(dir) - a0;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      const setOpen = (t) => (pivot.rotation.y = a0 + delta * t);
      setOpen(doorOpen);
      doorGroup.add(pivot);
      doors.push({ pivot, setOpen, opening: o });
    }
  }
  root.add(doorGroup);

  const lights = (plan.lights ?? []).map(({ at: [x, z], y = 2.2 }) => new THREE.Vector3(x, y, z));

  return { root, layers, floors, overlays, doors, doorGroup, lights, bounds, walls };
}

export function disposeTree(root) {
  const owned = new Set();
  root.traverse((o) => {
    if (o.geometry) owned.add(o.geometry);
    if (o.material?.isMeshBasicMaterial || o.material?.isShadowMaterial) owned.add(o.material);
  });
  owned.forEach((x) => x.dispose());
}
