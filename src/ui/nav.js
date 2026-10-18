import { $, $$, narrowQuery } from '../lib/util.js';

export function initNav() {
  const header = $('.site-header');
  const toggle = $('.menu-toggle', header);
  const nav = $('#site-nav');
  const links = $$('a[href^="#"]', nav);
  let lastY = scrollY;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('span').textContent = open ? 'Tutup' : 'Menu';
    header.classList.toggle('is-open', open);
    if (open) header.classList.remove('is-hidden');
    document.documentElement.classList.toggle('menu-open', open);
    if (open) links[0]?.focus();
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  links.forEach((a) => a.addEventListener('click', () => setOpen(false)));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  narrowQuery.addEventListener('change', () => setOpen(false));

  addEventListener('scroll', () => {
    const y = scrollY;
    header.classList.toggle('is-solid', y > innerHeight * 0.6);
    const hide = y > lastY + 6 && y > innerHeight * 1.2 && !header.classList.contains('is-open');
    if (hide) header.classList.add('is-hidden');
    else if (y < lastY - 6) header.classList.remove('is-hidden');
    lastY = y;
  }, { passive: true });

  const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      for (const a of links) {
        if (a.getAttribute('href') === `#${e.target.id}`) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      }
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => io.observe(s));
}
