import { mulberry32 } from '../lib/util.js';

// Procedural textures: no image downloads, drawn once per page and shared by every renderer.
const canvases = new Map();

function getCanvas(key, w, h, draw) {
  if (!canvases.has(key)) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    canvases.set(key, c);
  }
  return canvases.get(key);
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

function wrapped(S, x, y, r, fn) {
  for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
    if (x + dx > -r && x + dx < S + r && y + dy > -r && y + dy < S + r) fn(x + dx, y + dy);
  }
}

function drawWood(ctx, S) {
  const rnd = mulberry32(11);
  const n = 6;
  const pw = S / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = shade('#c69c6e', 0.88 + rnd() * 0.22);
    ctx.fillRect(i * pw, 0, pw, S);
    ctx.lineWidth = 1;
    for (let g = 0; g < 16; g++) {
      const x = i * pw + rnd() * pw;
      const amp = 0.6 + rnd() * 2.4;
      const f = 1 + Math.floor(rnd() * 4);
      ctx.strokeStyle = `rgba(92,56,26,${0.05 + rnd() * 0.09})`;
      ctx.beginPath();
      for (let y = 0; y <= S; y += 8) ctx.lineTo(x + Math.sin((y / S) * Math.PI * 2 * f + g) * amp, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(64,38,16,0.32)';
    ctx.fillRect(i * pw, rnd() * S, pw, 2);
    ctx.fillRect(i * pw, 0, 1.5, S);
  }
}

function drawTerrazzo(ctx, S) {
  ctx.fillStyle = '#ebe6de';
  ctx.fillRect(0, 0, S, S);
  const rnd = mulberry32(5);
  const cols = ['#c7b49c', '#9aa58a', '#b2643f', '#8a847b', '#d8cdbd', '#fbfaf7'];
  for (let i = 0; i < 1100; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 1 + rnd() ** 3 * 8;
    const k = 3 + Math.floor(rnd() * 3);
    const pts = Array.from({ length: k }, (_, j) => {
      const a = (j / k) * Math.PI * 2 + rnd();
      const rr = r * (0.6 + rnd() * 0.6);
      return [Math.cos(a) * rr, Math.sin(a) * rr];
    });
    ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
    wrapped(S, x, y, r * 1.3, (px, py) => {
      ctx.beginPath();
      for (const [dx, dy] of pts) ctx.lineTo(px + dx, py + dy);
      ctx.fill();
    });
  }
}

function drawTile(ctx, S) {
  ctx.fillStyle = '#cfd3cf';
  ctx.fillRect(0, 0, S, S);
  const rnd = mulberry32(3);
  const n = 4;
  const t = S / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    ctx.fillStyle = shade('#e7e9e5', 0.96 + rnd() * 0.06);
    ctx.fillRect(i * t + 1.5, j * t + 1.5, t - 3, t - 3);
  }
}

function drawRug(ctx, S) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 2;
  for (let i = -S; i < S * 2; i += 14) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + S, S);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(70,45,25,0.45)';
  ctx.lineWidth = S * 0.035;
  ctx.strokeRect(S * 0.07, S * 0.07, S * 0.86, S * 0.86);
  ctx.lineWidth = S * 0.008;
  ctx.strokeRect(S * 0.13, S * 0.13, S * 0.74, S * 0.74);
}

function drawArt(ctx, W, H) {
  ctx.fillStyle = '#ece3d3';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#b4653d';
  ctx.beginPath();
  ctx.moveTo(W * 0.18, H * 0.86);
  ctx.lineTo(W * 0.18, H * 0.48);
  ctx.arc(W * 0.4, H * 0.48, W * 0.22, Math.PI, 0);
  ctx.lineTo(W * 0.62, H * 0.86);
  ctx.fill();
  ctx.fillStyle = '#d9a44a';
  ctx.beginPath();
  ctx.arc(W * 0.7, H * 0.3, W * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8e9a7c';
  ctx.fillRect(W * 0.55, H * 0.58, W * 0.27, H * 0.28);
  ctx.strokeStyle = '#2a2622';
  ctx.lineWidth = W * 0.012;
  ctx.beginPath();
  ctx.moveTo(W * 0.1, H * 0.86);
  ctx.lineTo(W * 0.9, H * 0.86);
  ctx.stroke();
}

export function createTextures(THREE, renderer) {
  const aniso = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() ?? 1);
  const make = (key, w, h, draw, repeat = true) => {
    const tex = new THREE.CanvasTexture(getCanvas(key, w, h, draw));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = aniso;
    if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  };
  return {
    wood: make('wood', 512, 512, drawWood),
    terrazzo: make('terrazzo', 512, 512, drawTerrazzo),
    tile: make('tile', 256, 256, drawTile),
    rug: make('rug', 256, 256, drawRug, false),
    art: make('art', 512, 384, drawArt, false),
  };
}

// Metres covered by one texture repeat, used to scale floor UVs.
export const TEXTURE_SCALE = { wood: 1.2, terrazzo: 1.1, tile: 2.4 };
