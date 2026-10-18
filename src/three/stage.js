import { buildInterior } from './interior.js';

export const DAY_BG = '#e7e2d9';
export const NIGHT_BG = '#1c1a18';

// Scene, lights and a centred interior for a project plan. Shared by the viewer and the thumbnail renderer.
export function createStage(THREE, plan, lib, opts = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(DAY_BG);

  const hemi = new THREE.HemisphereLight('#ffffff', '#d6ccbc', 1.5);
  const sun = new THREE.DirectionalLight('#fff2df', 2.6);
  scene.add(hemi, sun, sun.target);

  const built = buildInterior(THREE, plan, lib, { walls: 'both', cut: 1.3, edges: true, doorOpen: 0.75, ...opts });
  const B = built.bounds;
  built.root.position.set(-B.cx, 0, -B.cz);
  scene.add(built.root);

  const half = Math.max(B.w, B.d) / 2 + 1.5;
  sun.position.set(-B.w * 0.6, 14, B.d * 0.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 50 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;

  const lamps = built.lights.map((p) => {
    const light = new THREE.PointLight('#ffc98a', 0, 7, 2);
    light.position.copy(p).add(built.root.position);
    scene.add(light);
    return light;
  });

  return { scene, built, hemi, sun, lamps, bounds: B };
}

export function setWallMode(built, mode) {
  const full = mode === 'full';
  if (built.layers.walls) built.layers.walls.visible = full;
  if (built.layers.wallsCut) built.layers.wallsCut.visible = !full;
  built.doorGroup.visible = full;
}

export function fitDistance(THREE, camera, bounds) {
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const span = Math.hypot(bounds.w, bounds.d) * 0.62;
  const vertical = span / Math.tan(fov / 2);
  return Math.max(vertical, vertical / Math.min(1, camera.aspect)) * 0.95;
}
