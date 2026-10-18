import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createLibrary, applyMode } from '../three/materials.js';
import { disposeTree } from '../three/interior.js';
import { createStage, setWallMode, fitDistance as fit, DAY_BG, NIGHT_BG } from '../three/stage.js';
import { roomRects, roomBounds, easeInOut, motionQuery } from '../lib/util.js';

const DAY = new THREE.Color(DAY_BG);
const NIGHT = new THREE.Color(NIGHT_BG);

export function createViewer(container, plan, { onHover, onSelect, onReady } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `Model 3D ${plan.title}. Seret untuk memutar, scroll atau cubit untuk zoom, tombol panah untuk menggeser.`);
  container.append(canvas);

  const lib = createLibrary(THREE, renderer);
  const { scene, built, hemi, sun, lamps, bounds: B } = createStage(THREE, plan, lib);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = 1.32;
  controls.minDistance = 2.5;
  controls.zoomToCursor = !matchMedia('(pointer: coarse)').matches;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.listenToKeyEvents(canvas);

  const state = { walls: 'cut', mode: 'material', time: 'day', hover: null, selected: null };
  const home = { target: new THREE.Vector3(0, 0.3, 0), position: new THREE.Vector3() };
  let fly = null;
  let tween = null;
  let raf = 0;

  const fitDistance = () => fit(THREE, camera, B);

  function spherePoint(target, dist, polar, azimuth) {
    return new THREE.Vector3().setFromSphericalCoords(dist, polar, azimuth).add(target);
  }

  function computeHome() {
    home.position.copy(spherePoint(home.target, fitDistance(), 0.92, 0.62));
    controls.maxDistance = fitDistance() * 1.7;
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    computeHome();
    render();
  }

  function flyTo(position, target, ms = 900) {
    if (motionQuery.matches) ms = 0;
    fly = { from: camera.position.clone(), to: position, tFrom: controls.target.clone(), tTo: target, start: performance.now(), ms };
    render();
  }

  function frame(now) {
    raf = 0;
    let busy = false;
    if (fly) {
      const t = fly.ms ? Math.min(1, (now - fly.start) / fly.ms) : 1;
      const e = easeInOut(t);
      camera.position.lerpVectors(fly.from, fly.to, e);
      controls.target.lerpVectors(fly.tFrom, fly.tTo, e);
      if (t >= 1) fly = null;
      busy = true;
    }
    if (tween) busy = tween(now) || busy;
    const r = Math.max(B.w, B.d) / 2 + 1;
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -r, r);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -r, r);
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0, 2.5);
    busy = controls.update() || busy;
    renderer.render(scene, camera);
    if (busy) render();
  }

  function render() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  controls.addEventListener('change', render);
  controls.addEventListener('start', () => {
    fly = null;
    container.classList.add('is-grabbing');
  });
  controls.addEventListener('end', () => container.classList.remove('is-grabbing'));

  function paintOverlays() {
    for (const [id, o] of built.overlays) {
      o.group.visible = id === state.hover || id === state.selected;
      o.fill.opacity = id === state.selected ? 0.4 : 0.26;
    }
    render();
  }

  const shown = (o) => {
    for (; o; o = o.parent) if (!o.visible) return false;
    return true;
  };

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const local = new THREE.Vector3();
  function roomAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(built.root, true).find((h) => h.object.isMesh && !h.object.userData.overlay && shown(h.object));
    if (!hit) return null;
    local.copy(hit.point).sub(built.root.position);
    const room = plan.rooms.find((r) => roomRects(r).some(([x, z, w, d]) => local.x >= x && local.x <= x + w && local.z >= z && local.z <= z + d));
    return room?.id ?? null;
  }

  let pending = null;
  let down = null;
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || e.buttons) return;
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = null;
      const id = roomAt(e.clientX, e.clientY);
      if (id !== state.hover) {
        state.hover = id;
        paintOverlays();
        onHover?.(id);
      }
    });
  });
  canvas.addEventListener('pointerleave', () => {
    if (state.hover) {
      state.hover = null;
      paintOverlays();
      onHover?.(null);
    }
  });
  canvas.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const id = roomAt(e.clientX, e.clientY);
    if (id) onSelect?.(id);
  });

  function setWalls(mode) {
    state.walls = mode;
    setWallMode(built, mode);
    renderer.shadowMap.needsUpdate = true;
    render();
  }

  function setTime(time) {
    state.time = time;
    const night = time === 'night';
    const from = { bg: scene.background.clone(), h: hemi.intensity, s: sun.intensity, l: lamps[0]?.intensity ?? 0 };
    const to = { bg: night ? NIGHT : DAY, h: night ? 0.35 : 1.5, s: night ? 0.15 : 2.6, l: night ? 5 : 0 };
    const start = performance.now();
    const ms = motionQuery.matches ? 1 : 650;
    hemi.color.set(night ? '#9fb0c8' : '#ffffff');
    tween = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const e = easeInOut(t);
      scene.background.lerpColors(from.bg, to.bg, e);
      hemi.intensity = from.h + (to.h - from.h) * e;
      sun.intensity = from.s + (to.s - from.s) * e;
      lamps.forEach((l) => (l.intensity = from.l + (to.l - from.l) * e));
      lib.setGlow(night ? 2.2 * e : 2.2 * (1 - e) * (from.l > 0 ? 1 : 0));
      if (t >= 1) tween = null;
      return t < 1;
    };
    render();
  }

  function focus(id) {
    const room = plan.rooms.find((r) => r.id === id);
    if (!room) return;
    const b = roomBounds(room);
    const target = new THREE.Vector3(b.cx, 0.4, b.cz).add(built.root.position);
    const azimuth = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
    const dist = (Math.max(b.w, b.d) * 1.9 + 3.5) / Math.min(1, camera.aspect);
    flyTo(spherePoint(target, dist, 0.82, azimuth), target);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  let disposed = false;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    if (!disposed) container.dataset.state = 'error';
  });

  setWalls('cut');
  resize();
  camera.position.copy(spherePoint(home.target, fitDistance() * 1.5, 0.45, 1.4));
  controls.target.copy(home.target);
  flyTo(home.position.clone(), home.target.clone(), 1400);
  requestAnimationFrame(() => onReady?.());

  return {
    highlight(id) {
      state.hover = id;
      paintOverlays();
    },
    select(id) {
      state.selected = id;
      paintOverlays();
      if (id) focus(id);
    },
    reset() {
      computeHome();
      flyTo(home.position.clone(), home.target.clone());
    },
    top() {
      flyTo(spherePoint(home.target, fitDistance() * 1.05, 0.06, 0), home.target.clone());
    },
    setMode(mode) {
      state.mode = mode;
      applyMode(built.root, lib, mode);
      render();
    },
    setWalls,
    setTime,
    get state() {
      return { ...state };
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(pending);
      ro.disconnect();
      controls.dispose();
      disposeTree(scene);
      lib.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
