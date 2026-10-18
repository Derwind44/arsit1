import { Parts } from '../three/parts.js';
import { buildInterior } from '../three/interior.js';
import { setWallMode } from '../three/stage.js';
import { houseInterior, INTERIOR_OFFSET } from '../data/house.js';

export const PLINTH = { w: 13, d: 11 };

function tree(p, x, z, s) {
  p.cyl(0.08 * s, 1.3 * s, x, 0.06, z, 'trunk', { r2: 0.06 * s, seg: 7 });
  p.ico(1, x, 0.06 + 1.85 * s, z, 'tree', { sx: 1.05 * s, sy: 0.9 * s, sz: 1.05 * s, ry: x });
}

// The hero maquette: site, an enterable ground floor (built from the plan data) and a lifted upper volume.
// Layers are separate groups so the maket section can pull them apart.
export function buildHouse(THREE, lib, { clay = false } = {}) {
  const root = new THREE.Group();
  const p = new Parts(THREE);
  p.edgesOn = true;

  p.layer = 'site';
  p.box(PLINTH.w, 0.4, PLINTH.d, 0, -0.4, 0, 'base');
  p.box(PLINTH.w - 0.5, 0.06, PLINTH.d - 0.5, 0, 0, 0, 'lawn', { edges: false });
  p.box(1.3, 0.09, 4.9, -0.1, 0, 3.05, 'paving');
  p.box(3.2, 0.09, 9.7, 3.0, 0, 0.65, 'paving');
  p.box(4.4, 0.06, 3.2, -3.6, 0.06, 3.2, 'deck');
  p.box(3.4, 0.04, 1.7, -3.6, 0.1, 3.45, 'water', { edges: false });
  p.box(1.4, 0.1, 0.5, -4.6, 0.12, 2.0, 'clay');
  p.box(1.4, 0.1, 0.5, -2.6, 0.12, 2.0, 'clay');
  p.box(1.8, 0.55, 4.2, 3.1, 0.09, -2.0, 'car');
  p.box(1.5, 0.48, 2.2, 3.1, 0.64, -1.9, 'tint');
  for (const dx of [-0.9, 0.9]) for (const dz of [-1.4, 1.4]) {
    p.cyl(0.32, 0.22, 3.1 + dx, 0.41 - 0.11, -2.0 + dz, 'figure', { rz: Math.PI / 2, seg: 12 });
  }
  tree(p, 5.5, 3.8, 1.2);
  tree(p, 5.7, -4.9, 0.9);
  tree(p, -5.95, 1.6, 0.9);
  tree(p, -6.0, -2.0, 0.7);

  for (const z of [1.35, -1.6, -4.35]) p.box(0.2, 3.04, 0.2, 4.65, 0.06, z, 'clay');
  p.box(3.5, 3.04, 0.15, 2.75, 0.06, -4.33, 'slat');

  p.layer = 'upper';
  p.box(10.3, 0.25, 6.2, -0.25, 3.1, -1.5, 'clay');
  p.box(0.6, 0.05, 0.6, -4.8, 3.35, -2.6, 'tint', { edges: false });
  p.box(8.7, 2.6, 5.4, 0.15, 3.35, -1.7, 'clay');
  p.box(7.0, 2.0, 0.06, 0.1, 3.65, 1.0, 'tint', { edges: false });
  p.box(0.06, 1.8, 0.9, 4.5, 3.75, -1.6, 'tint', { edges: false });
  p.box(0.06, 1.7, 2.4, -4.2, 3.75, -1.8, 'tint', { edges: false });
  for (let i = 0; i < 29; i++) p.box(0.09, 2.4, 0.12, -3.55 + i * 0.26, 3.45, 1.15, 'slat', { edges: false });

  p.layer = 'roof';
  p.box(9.1, 0.22, 5.8, 0.15, 5.95, -1.7, 'clay');
  p.box(1.8, 0.5, 1.4, -1.8, 6.17, -2.8, 'clay');

  const built = p.build(lib, { clay, showEdges: true });
  p.dispose();

  const interior = buildInterior(THREE, houseInterior, lib, {
    walls: 'both',
    cut: 1.35,
    edges: true,
    furnitureEdges: clay,
    showEdges: true,
    doorOpen: 0,
    clay,
  });
  interior.root.position.set(...INTERIOR_OFFSET);
  setWallMode(interior, 'full');

  const layers = {};
  for (const name of ['site', 'ground', 'upper', 'roof']) {
    layers[name] = built[name] ?? new THREE.Group();
    root.add(layers[name]);
  }
  layers.ground.add(interior.root);

  const lights = interior.lights.map((v) => v.clone().add(interior.root.position));
  return { root, layers, interior, door: interior.doors[0], lights };
}
