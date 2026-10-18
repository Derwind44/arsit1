import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createLibrary, applyMode } from '../three/materials.js';
import { buildHouse } from '../hero/house.js';
import { setWallMode } from '../three/stage.js';
import { $, $$, h, clamp, motionQuery } from '../lib/util.js';

const LABELS = [
  { layer: 'roof', text: 'Atap & taman atap', at: [3.6, 6.2, 1.2] },
  { layer: 'upper', text: 'Lantai 2 · kamar', at: [4.6, 4.4, 1.0] },
  { layer: 'ground', text: 'Lantai 1 · ruang keluarga', at: [-5.2, 1.4, 0.7] },
];

// Interactive maquette: orbit it, pull the floors apart, switch between white model and materials.
export function initMaket(section) {
  const host = $('.maket__stage', section);
  const slider = $('#urai', section);
  const tagList = $('.maket__tags', section);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Maket 3D rumah dua lantai. Seret ke samping untuk memutar.');
  host.append(canvas);

  const lib = createLibrary(THREE, renderer);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#d9d0c1', 1.35));
  const sun = new THREE.DirectionalLight('#fff3e3', 2.4);
  sun.position.set(-9, 16, 11);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(2048);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 12, bottom: -9, near: 4, far: 50 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.ShadowMaterial({ opacity: 0.14 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.41;
  ground.receiveShadow = true;
  scene.add(ground);

  const house = buildHouse(THREE, lib, { clay: true });
  house.door?.setOpen(0.65);
  scene.add(house.root);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 200);
  camera.position.set(20, 26, 24);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 2.4, 0);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.3;
  controls.autoRotate = !motionQuery.matches;
  controls.autoRotateSpeed = 0.7;
  canvas.style.touchAction = 'pan-y';

  const tags = LABELS.map((l) => {
    const li = h('li', { class: 'maket__tag', text: l.text });
    tagList.append(li);
    return { ...l, li, v: new THREE.Vector3() };
  });

  let explode = 0;
  let target = 0;
  let wallMode = 'full';
  let visible = false;
  let raf = 0;
  let last = 0;
  let size = { w: 1, h: 1 };

  function resize() {
    const w = host.clientWidth;
    const hgt = host.clientHeight;
    if (!w || !hgt) return;
    size = { w, h: hgt };
    renderer.setSize(w, hgt, false);
    camera.aspect = w / hgt;
    const dist = 39 / Math.min(1, camera.aspect * 1.05);
    camera.position.sub(controls.target).setLength(dist).add(controls.target);
    camera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
    kick();
  }

  function frame(now) {
    raf = 0;
    const dt = clamp((now - last) / 1000, 0, 0.1);
    last = now;
    const moving = Math.abs(target - explode) > 0.001;
    explode += (target - explode) * (motionQuery.matches ? 1 : 1 - Math.exp(-dt * 5));
    house.layers.upper.position.y = explode * 3.0;
    house.layers.roof.position.y = explode * 5.8;
    controls.target.y = 2.4 + explode * 2.2;
    const walls = explode > 0.45 ? 'cut' : 'full';
    if (walls !== wallMode) {
      wallMode = walls;
      setWallMode(house.interior, walls);
    }
    if (moving) renderer.shadowMap.needsUpdate = true;
    const changed = controls.update(dt);
    renderer.render(scene, camera);
    for (const t of tags) {
      t.v.fromArray(t.at).add(house.layers[t.layer].position).project(camera);
      t.li.style.transform = `translate(${((t.v.x + 1) / 2) * size.w}px, ${((1 - t.v.y) / 2) * size.h}px)`;
      t.li.style.opacity = clamp((explode - 0.35) * 3);
    }
    if (visible && (moving || changed || controls.autoRotate)) kick();
  }

  let paused = false;
  addEventListener('modal', (e) => {
    paused = e.detail;
    kick();
  });

  function kick() {
    if (raf || paused || !visible || document.hidden) return;
    if (performance.now() - last > 100) last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  slider.addEventListener('input', () => {
    target = Number(slider.value) / 100;
    slider.setAttribute('aria-valuetext', target > 0.5 ? 'Lantai terurai' : 'Maket utuh');
    kick();
  });
  $$('[data-maket-mode]', section).forEach((btn) =>
    btn.addEventListener('click', () => {
      applyMode(house.root, lib, btn.dataset.maketMode);
      $$('[data-maket-mode]', section).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      kick();
    }),
  );
  controls.addEventListener('start', () => (controls.autoRotate = false));
  controls.addEventListener('change', kick);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    kick();
  }).observe(host);
  new ResizeObserver(resize).observe(host);
  document.addEventListener('visibilitychange', kick);
  host.dataset.state = 'ready';
}
