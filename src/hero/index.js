import { $, $$, h, clamp, span, motionQuery, onIdle } from '../lib/util.js';
import { hotspots } from '../data/house.js';

const CHAPTERS = [0, 0.15, 0.36, 0.6];

// Scroll-driven intro. Text overlays work without WebGL; the three.js scene is loaded lazily on top.
export function initHero(section) {
  if (!section) return;
  const host = $('.hero__stage', section);
  const phased = $$('[data-phase]', section).map((el) => ({ el, r: el.dataset.phase.split(' ').map(Number), o: -1 }));
  const rail = $$('[data-go]', section);
  const bar = $('.hero__bar', section);
  const list = $('.hero__spots', section);
  const spots = hotspots.map((s) => {
    const li = h('li', { class: 'spot' }, h('span', { class: 'spot__dot', 'aria-hidden': 'true' }), h('span', { class: 'spot__label', text: s.label }));
    list.append(li);
    return { ...s, li };
  });

  let progress = 0;
  let sp = 0;
  let tx = 0;
  let ty = 0;
  let mx = 0;
  let my = 0;
  let visible = true;
  let raf = 0;
  let last = 0;
  let scene = null;
  let chapter = -1;

  const measure = () => {
    const r = section.getBoundingClientRect();
    progress = clamp(-r.top / Math.max(1, section.offsetHeight - innerHeight));
  };

  function overlays(p) {
    for (const item of phased) {
      const [a, b, c, d] = item.r;
      const o = Math.round(Math.min(span(p, a, b), 1 - span(p, c, d)) * 100) / 100;
      if (o === item.o) continue;
      item.o = o;
      item.el.style.opacity = o;
      item.el.style.transform = `translate3d(0, ${(1 - o) * 18}px, 0)`;
      item.el.style.visibility = o < 0.02 ? 'hidden' : '';
      item.el.classList.toggle('is-live', o > 0.5);
    }
    const next = CHAPTERS.findLastIndex((c) => p >= c - 0.001);
    if (next !== chapter) {
      chapter = next;
      rail.forEach((b, i) => b.setAttribute('aria-current', i === chapter ? 'step' : 'false'));
    }
    bar?.style.setProperty('--p', p.toFixed(3));
  }

  function frame(now) {
    raf = 0;
    const dt = clamp((now - last) / 1000, 0, 0.1);
    last = now;
    const k = motionQuery.matches ? 1 : 1 - Math.exp(-dt * 6);
    sp += (progress - sp) * k;
    mx += (tx - mx) * k;
    my += (ty - my) * k;
    if (Math.abs(progress - sp) < 1e-4) sp = progress;
    overlays(sp);
    if (scene) {
      scene.update(sp, mx, my, dt);
      scene.render();
    }
    const moving = sp !== progress || Math.abs(tx - mx) + Math.abs(ty - my) > 1e-3;
    if (moving || scene?.animating(sp)) kick();
  }

  let paused = false;
  addEventListener('modal', (e) => {
    paused = e.detail;
    kick();
  });

  function kick() {
    if (raf || paused || !visible || document.hidden) return;
    if (!last || performance.now() - last > 100) last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function goTo(p) {
    const top = section.offsetTop + p * (section.offsetHeight - innerHeight);
    scrollTo({ top, behavior: motionQuery.matches ? 'auto' : 'smooth' });
  }

  addEventListener('scroll', () => {
    measure();
    kick();
  }, { passive: true });
  addEventListener('resize', () => {
    measure();
    scene?.resize();
    kick();
  });
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    tx = (e.clientX / innerWidth) * 2 - 1;
    ty = (e.clientY / innerHeight) * 2 - 1;
    kick();
  }, { passive: true });
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    kick();
  }).observe(section);
  document.addEventListener('visibilitychange', kick);
  rail.forEach((b) => b.addEventListener('click', () => goTo(Number(b.dataset.go))));

  measure();
  sp = progress;
  overlays(sp);

  onIdle(async () => {
    try {
      const { createHeroScene } = await import('./scene.js');
      scene = createHeroScene(host, { spots });
      host.dataset.state = 'ready';
      kick();
    } catch (err) {
      console.error(err);
      host.dataset.state = 'error';
    }
  }, 400);
}
