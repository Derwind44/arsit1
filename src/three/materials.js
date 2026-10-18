import { createTextures } from './textures.js';

const FINISH = {
  plaster: { color: '#f1ece4', roughness: 0.95 },
  cap: { color: '#2b2825', roughness: 0.9 },
  base: { color: '#d6d0c5', roughness: 0.95 },
  floor_wood: { color: '#ffffff', map: 'wood', roughness: 0.72 },
  floor_terrazzo: { color: '#ffffff', map: 'terrazzo', roughness: 0.55 },
  floor_tile: { color: '#ffffff', map: 'tile', roughness: 0.5 },
  floor_concrete: { color: '#cbc6bd', roughness: 0.9 },
  oak: { color: '#b98d5f', roughness: 0.7 },
  walnut: { color: '#6b4a31', roughness: 0.65 },
  ash: { color: '#d8c29f', roughness: 0.7 },
  stone: { color: '#e9e5de', roughness: 0.45 },
  metal: { color: '#2a2927', roughness: 0.5 },
  steel: { color: '#b4b8ba', roughness: 0.35 },
  glass: { color: '#d4e6e8', roughness: 0.1, transparent: true, opacity: 0.2, depthWrite: false },
  linen: { color: '#f3efe8', roughness: 1 },
  leaf: { color: '#7c9466', roughness: 0.9, flatShading: true },
  tree: { color: '#a7b98f', roughness: 0.95, flatShading: true },
  tint: { color: '#59646d', roughness: 0.25 },
  pot: { color: '#c4ae94', roughness: 0.9 },
  ceramic: { color: '#f7f5f1', roughness: 0.3 },
  screen: { color: '#1b1d20', roughness: 0.3 },
  art: { color: '#ffffff', map: 'art', roughness: 0.9 },
  water: { color: '#98c1c5', roughness: 0.15 },
  lamp: { color: '#efe0c2', roughness: 0.6, emissive: '#ffc982', emissiveIntensity: 0 },
  clay: { color: '#f4f1eb', roughness: 0.95 },
  clayFloor: { color: '#ebe7e0', roughness: 0.95 },
  clayBase: { color: '#ddd7cc', roughness: 0.95 },
  clayLeaf: { color: '#dde3d3', roughness: 0.95, flatShading: true },
  clayWater: { color: '#dfe8e9', roughness: 0.4 },
  lawn: { color: '#c3cbb0', roughness: 1 },
  paving: { color: '#e6e1d6', roughness: 0.95 },
  deck: { color: '#c9a77d', roughness: 0.8 },
  slat: { color: '#b4875a', roughness: 0.8 },
  car: { color: '#b4b9ba', roughness: 0.5 },
  figure: { color: '#57534c', roughness: 0.9 },
  trunk: { color: '#8c6c4f', roughness: 0.9 },
};

const CLAY = {
  glass: 'glass',
  cap: 'cap',
  leaf: 'clayLeaf',
  tree: 'clayLeaf',
  water: 'clayWater',
  base: 'clayBase',
  lawn: 'clayLeaf',
  screen: 'clay',
};

export function createLibrary(THREE, renderer) {
  const textures = createTextures(THREE, renderer);
  const cache = new Map();

  function make(def) {
    const { map, ...rest } = def;
    return new THREE.MeshStandardMaterial({ metalness: 0, ...rest, ...(map ? { map: textures[map] } : {}) });
  }

  function get(key) {
    let mat = cache.get(key);
    if (mat) return mat;
    let def = FINISH[key];
    if (!def && key.startsWith('c:')) def = { color: key.slice(2), roughness: 0.88 };
    if (!def && key.startsWith('rug:')) def = { color: key.slice(4), map: 'rug', roughness: 1 };
    mat = make(def ?? FINISH.clay);
    mat.name = key;
    cache.set(key, mat);
    return mat;
  }

  const clay = (key) => get(CLAY[key] ?? (key.startsWith('floor_') ? 'clayFloor' : 'clay'));

  const lines = new THREE.LineBasicMaterial({ color: 0x3a352f, transparent: true, opacity: 0.3 });

  return {
    get,
    clay,
    lines,
    textures,
    setGlow(v) {
      get('lamp').emissiveIntensity = v;
    },
    dispose() {
      cache.forEach((m) => m.dispose());
      cache.clear();
      lines.dispose();
      Object.values(textures).forEach((t) => t.dispose());
    },
  };
}

export function applyMode(root, lib, mode) {
  const clay = mode === 'maket';
  root.traverse((o) => {
    if (o.userData.key) o.material = clay ? lib.clay(o.userData.key) : lib.get(o.userData.key);
    if (o.userData.edges) o.visible = clay;
  });
}
