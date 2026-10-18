import * as THREE from 'three';
import { createLibrary } from '../three/materials.js';
import { buildHouse, PLINTH } from './house.js';
import { lerp, smooth, span, motionQuery, narrowQuery } from '../lib/util.js';

const TAU = Math.PI * 2;
const ORBIT = { yaw: 0.7, elev: 0.45, look: new THREE.Vector3(0, 2.2, 0) };

// Camera keyframes in house space. The first one is the orbit view and is computed from the viewport.
const KEYS = [
  { p: 0, fov: 24 },
  { p: 0.24, pos: [1.6, 3.4, 15], look: [-0.6, 2.3, -1], fov: 30 },
  { p: 0.36, pos: [-0.1, 1.58, 4.4], look: [-0.1, 1.3, 0], fov: 40 },
  { p: 0.5, pos: [0.0, 1.56, 3.1], look: [-0.05, 1.32, -0.6], fov: 50 },
  { p: 0.62, pos: [0.05, 1.5, -0.35], look: [-1.4, 1.3, -2.6], fov: 62 },
  { p: 0.8, pos: [-0.5, 1.5, -0.5], look: [-3.0, 1.2, -2.2], fov: 62 },
  { p: 1, pos: [-2.0, 1.45, -0.2], look: [-4.4, 1.15, -2.4], fov: 62 },
];

export function createHeroScene(host, { spots = [] } = {}) {
  const narrow = narrowQuery.matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, narrow ? 1.5 : 1.75));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.append(renderer.domElement);

  const lib = createLibrary(THREE, renderer);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.5, 200);

  const hemi = new THREE.HemisphereLight('#ffffff', '#d9d0c1', 1.3);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1dc', 2.5);
  sun.position.set(-9, 16, 11);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(narrow ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -9.5, right: 9.5, top: 9.5, bottom: -9.5, near: 4, far: 45 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 2;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.41;
  ground.receiveShadow = true;
  scene.add(ground);

  const house = buildHouse(THREE, lib);
  scene.add(house.root);
  const warm = house.lights.map((p, i) => {
    const light = new THREE.PointLight('#ffc78a', 0, i ? 6 : 7, 2);
    light.position.copy(p);
    scene.add(light);
    return light;
  });

  const posCurve = new THREE.CatmullRomCurve3(KEYS.map(() => new THREE.Vector3()), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(KEYS.map(() => new THREE.Vector3()), false, 'centripetal');
  KEYS.forEach((k, i) => lookCurve.points[i].copy(k.look ? new THREE.Vector3(...k.look) : ORBIT.look));

  // Portrait screens see less horizontally: pull the outdoor keyframes back and widen the lens indoors.
  const view = { w: 1, h: 1, ox: 0, oy: 0, fov: 1 };
  function placeKeys(portrait) {
    KEYS.forEach((k, i) => {
      if (!k.pos) return;
      const p = posCurve.points[i].fromArray(k.pos);
      if (k.p <= 0.5) p.sub(lookCurve.points[i]).multiplyScalar(k.p <= 0.24 ? portrait : Math.sqrt(portrait)).add(lookCurve.points[i]);
    });
  }
  let spin = 0;
  let rest = 0;

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = !narrowQuery.matches;
    const pw = wide ? w * 0.6 : w;
    const ph = wide ? h : h * 0.6;
    const portrait = THREE.MathUtils.clamp(0.95 / camera.aspect, 1, 1.75);
    Object.assign(view, { w, h, ox: wide ? w * 0.2 : 0, oy: wide ? 0 : h * 0.19, fov: Math.min(1.3, portrait) });
    placeKeys(portrait);
    const radius = Math.hypot(PLINTH.w, PLINTH.d) / 2;
    const dist = Math.max((radius * 2.1 * h) / ph, (radius * (wide ? 2.35 : 2.1) * h) / pw) / (2 * Math.tan(THREE.MathUtils.degToRad(12)));
    const { yaw, elev, look } = ORBIT;
    posCurve.points[0].set(Math.sin(yaw) * Math.cos(elev), Math.sin(elev), Math.cos(yaw) * Math.cos(elev)).multiplyScalar(dist).add(look);
  }

  function sample(p) {
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const t = span(p, KEYS[i].p, KEYS[i + 1].p);
    return { u: (i + t) / (KEYS.length - 1), fov: lerp(KEYS[i].fov, KEYS[i + 1].fov, smooth(t)) };
  }

  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const right = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  function update(p, mx, my, dt) {
    const reduce = motionQuery.matches;
    if (!reduce) spin += dt * 0.11;
    if (p < 0.002) rest = Math.round(spin / TAU) * TAU;
    const settle = smooth(span(p, 0, 0.12));
    const outside = 1 - smooth(span(p, 0.02, 0.2));
    const inside = smooth(span(p, 0.55, 0.72));
    house.root.rotation.y = lerp(spin, rest, settle) + (reduce ? 0 : mx * 0.28 * outside);

    const { u, fov } = sample(p);
    posCurve.getPoint(u, pos);
    lookCurve.getPoint(u, look);
    if (!reduce) {
      pos.y -= my * 1.2 * outside;
      right.subVectors(look, pos).cross(camera.up).normalize();
      look.addScaledVector(right, mx * 0.7 * inside);
      look.y -= my * 0.35 * inside;
    }
    camera.position.copy(pos);
    camera.lookAt(look);
    camera.fov = fov * lerp(1, view.fov, smooth(span(p, 0.3, 0.6)));
    camera.near = p > 0.42 ? 0.05 : 0.5;
    const shift = outside;
    camera.setViewOffset(view.w, view.h, -view.ox * shift, -view.oy * shift, view.w, view.h);
    camera.updateProjectionMatrix();

    house.door?.setOpen(smooth(span(p, 0.37, 0.5)));
    const glow = span(p, 0.3, 0.62);
    const [pendant, fill] = warm;
    if (pendant) pendant.intensity = lerp(1.2, 6, glow);
    if (fill) fill.intensity = lerp(0.4, 4, glow);
    hemi.intensity = lerp(1.3, 2.3, inside);
    lib.setGlow(lerp(0.6, 2.4, glow));
    lib.lines.opacity = 0.3 * (1 - span(p, 0.42, 0.58));

    for (const s of spots) {
      tmp.fromArray(s.at).applyMatrix4(house.root.matrixWorld).project(camera);
      const onScreen = tmp.z < 1 && Math.abs(tmp.x) < 0.92 && Math.abs(tmp.y) < 0.9;
      s.li.style.transform = `translate(${((tmp.x + 1) / 2) * view.w}px, ${((1 - tmp.y) / 2) * view.h}px)`;
      s.li.classList.toggle('is-off', !onScreen);
    }
  }

  function render() {
    renderer.render(scene, camera);
  }

  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    host.dataset.state = 'error';
  });

  resize();
  return {
    update,
    render,
    resize,
    animating: (p) => !motionQuery.matches && p < 0.2,
  };
}
