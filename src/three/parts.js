import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const CORNERS = [
  [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5],
  [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5],
];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

// Collects primitives in local space, then merges them per layer + material into a handful of draw calls.
export class Parts {
  constructor(THREE) {
    this.T = THREE;
    this.items = [];
    this.edges = {};
    this.layer = 'main';
    this.edgesOn = false;
    this.stack = [new THREE.Matrix4()];
    this.unitBox = new THREE.BoxGeometry(1, 1, 1);
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._v = new THREE.Vector3();
  }

  get top() {
    return this.stack[this.stack.length - 1];
  }

  at(x, z, rotDeg, fn, y = 0) {
    const m = new this.T.Matrix4().makeRotationY(((rotDeg || 0) * Math.PI) / 180).setPosition(x, y, z);
    this.stack.push(this.top.clone().multiply(m));
    fn();
    this.stack.pop();
  }

  compose(x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    this._e.set(rx, ry, rz);
    this._q.setFromEuler(this._e);
    return new this.T.Matrix4().compose(this._p.set(x, y, z), this._q, this._s.set(sx, sy, sz));
  }

  add(geom, local, key, o = {}) {
    const m = this.top.clone().multiply(local);
    const g = geom.index ? geom.toNonIndexed() : geom.clone();
    g.applyMatrix4(m);
    this.items.push({
      g,
      key,
      layer: o.layer ?? this.layer,
      cast: o.cast ?? true,
      receive: o.receive ?? true,
    });
    return m;
  }

  // y is the bottom of the box, x/z its centre.
  box(w, h, d, x, y, z, key, o = {}) {
    const m = this.add(this.unitBox, this.compose(x, y + h / 2, z, w, h, d, o.rx, o.ry, o.rz), key, o);
    if (o.edges ?? this.edgesOn) this.boxEdges(m, o.layer ?? this.layer);
  }

  cyl(r, h, x, y, z, key, o = {}) {
    const g = new this.T.CylinderGeometry(o.r2 ?? r, r, h, o.seg ?? 18, 1, o.open ?? false);
    this.add(g, this.compose(x, y + h / 2, z, 1, 1, 1, o.rx, o.ry, o.rz), key, o);
    g.dispose();
  }

  sphere(r, x, y, z, key, o = {}) {
    const g = new this.T.SphereGeometry(r, o.seg ?? 16, o.rings ?? 10);
    this.add(g, this.compose(x, y, z, o.sx ?? 1, o.sy ?? 1, o.sz ?? 1), key, o);
    g.dispose();
  }

  ico(r, x, y, z, key, o = {}) {
    const g = new this.T.IcosahedronGeometry(r, o.detail ?? 0);
    this.add(g, this.compose(x, y, z, o.sx ?? 1, o.sy ?? 1, o.sz ?? 1, 0, o.ry ?? 0), key, o);
    g.dispose();
  }

  boxEdges(m, layer) {
    const pts = (this.edges[layer] ??= []);
    const v = CORNERS.map((c) => this._v.fromArray(c).applyMatrix4(m).toArray());
    for (const [a, b] of EDGES) pts.push(...v[a], ...v[b]);
  }

  build(lib, { clay = false, showEdges = clay } = {}) {
    const T = this.T;
    const layers = {};
    const groups = new Map();
    for (const it of this.items) {
      const k = `${it.layer}|${it.key}|${+it.cast}${+it.receive}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(it);
    }
    for (const [k, items] of groups) {
      const [layer, key] = k.split('|');
      const geom = mergeGeometries(items.map((i) => i.g), false);
      items.forEach((i) => i.g.dispose());
      const mesh = new T.Mesh(geom, clay ? lib.clay(key) : lib.get(key));
      mesh.userData.key = key;
      mesh.castShadow = items[0].cast;
      mesh.receiveShadow = items[0].receive;
      (layers[layer] ??= new T.Group()).add(mesh);
    }
    for (const [layer, pts] of Object.entries(this.edges)) {
      if (!pts.length) continue;
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      const lines = new T.LineSegments(g, lib.lines);
      lines.userData.edges = true;
      lines.visible = showEdges;
      (layers[layer] ??= new T.Group()).add(lines);
    }
    this.items = [];
    this.edges = {};
    return layers;
  }

  dispose() {
    this.unitBox.dispose();
  }
}
