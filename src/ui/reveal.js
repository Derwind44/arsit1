import { $$ } from '../lib/util.js';

export function initReveal() {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  const observe = () => $$('.reveal:not(.is-in)').forEach((el) => io.observe(el));
  observe();
  return observe;
}
