// Ground floor of the hero maquette. Same plan format as the projects; placed inside the house in hero/house.js.
export const houseInterior = {
  slug: 'rumah-kemang',
  height: 3.0,
  walls: [
    [0, 0, 6.2, 0, 0.2],
    [6.2, 0, 6.2, 5, 0.2],
    [0, 5, 6.2, 5, 0.2],
    [0, 0, 0, 5, 0.2],
  ],
  openings: [
    { type: 'glass', at: [2.0, 5], w: 3.2, head: 2.7 },
    { type: 'door', at: [5.1, 5], w: 1.0, head: 2.2, hinge: 'start', swing: -1, open: 100 },
    { type: 'window', at: [4.6, 0], w: 1.6, sill: 1.15, head: 2.1 },
    { type: 'window', at: [6.2, 2.4], w: 1.2, sill: 1.3, head: 2.2 },
  ],
  rooms: [
    { id: 'keluarga', name: 'Ruang Keluarga', rect: [0, 0, 3.3, 5], floor: 'wood' },
    { id: 'makan', name: 'Dapur & Makan', rect: [3.3, 0, 2.9, 5], floor: 'wood' },
  ],
  furniture: [
    { t: 'sofa', at: [0.62, 2.4], rot: 90, w: 2.3, d: 0.95, color: '#d4c6ad' },
    { t: 'rug', at: [1.85, 2.4], w: 2.4, d: 2.9, color: '#e9dfcf' },
    { t: 'coffee', at: [1.9, 2.4], round: true, w: 0.95 },
    { t: 'armchair', at: [2.85, 3.55], rot: -125 },
    { t: 'lamp', at: [0.45, 0.75] },
    { t: 'plant', at: [0.5, 4.45], s: 1.2 },
    { t: 'shelf', at: [1.75, 0.28], w: 2.2, d: 0.36 },
    { t: 'art', at: [0.11, 2.4], rot: 90, w: 1.5, h: 1.0, y: 1.35 },
    { t: 'dining', at: [4.3, 2.5], w: 1.6, d: 0.9, chairs: 2, color: '#b48a5f', chairColor: '#3a3430' },
    { t: 'counter', at: [4.65, 0.4], w: 2.9, sink: 0.1, cooktop: -0.9, color: '#8e9a7c' },
    { t: 'pendant', at: [4.3, 2.5], y: 1.75, top: 3.0 },
  ],
  lights: [{ at: [4.3, 2.5], y: 1.7 }, { at: [1.8, 2.6], y: 2.6 }],
};

// World offset of the interior inside the maquette (plan origin → house space).
export const INTERIOR_OFFSET = [-5.2, 0.1, -4.4];

// Hotspots shown once the camera is inside, in house space.
export const hotspots = [
  { id: 'lantai', label: 'Lantai kayu jati, finishing minyak', at: [-1.7, 0.12, 0.0] },
  { id: 'sofa', label: 'Sofa linen custom, 230 cm', at: [-4.6, 0.85, -2.0] },
  { id: 'lampu', label: 'Lampu gantung rotan dari Jepara', at: [-0.9, 1.95, -1.9] },
];
