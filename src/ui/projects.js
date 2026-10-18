import { $, $$, h, whenNear, onIdle, totalArea, m2 } from '../lib/util.js';
import { projects, categories, findProject } from '../data/projects.js';
import { openProject, closeProject, isOpen } from './dialog.js';

const ROUTE = /^#\/karya\/([\w-]+)$/;

function card(p, index) {
  const maket = h('img', { class: 'card__img card__img--maket', alt: `Maket putih ${p.title}`, decoding: 'async', hidden: true });
  const material = h('img', { class: 'card__img card__img--material', alt: `Render material ${p.title}`, decoding: 'async', hidden: true });
  const media = h('div', { class: 'card__media', 'data-state': 'loading' }, maket, material, h('span', { class: 'card__badge', text: '3D · Denah' }));
  const el = h('article', { class: 'card reveal', 'data-category': p.category, style: `--i:${index}` },
    h('a', { class: 'card__link', href: `#/karya/${p.slug}`, 'aria-label': `${p.title}: buka model 3D dan denah` },
      media,
      h('div', { class: 'card__body' },
        h('p', { class: 'card__meta', text: `${p.type} · ${p.location} · ${p.year}` }),
        h('h3', { class: 'card__title', text: p.title }),
        h('p', { class: 'card__summary', text: p.summary }),
        h('p', { class: 'card__foot' },
          h('span', { text: m2(totalArea(p)) }),
          h('span', { class: 'card__cta', text: 'Jelajahi proyek' })))));
  return { el, media, maket, material };
}

export function initProjects() {
  const section = $('#karya');
  const grid = $('.projects__grid', section);
  const filters = $('.projects__filters', section);
  const status = $('.projects__status', section);
  const cards = new Map(projects.map((p, i) => [p.slug, card(p, i)]));
  grid.append(...[...cards.values()].map((c) => c.el));

  for (const c of categories) {
    const count = c.id === 'semua' ? projects.length : projects.filter((p) => p.category === c.id).length;
    const btn = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(c.id === 'semua'), 'data-filter': c.id },
      c.label, h('span', { class: 'chip__count', text: count }));
    btn.addEventListener('click', () => {
      $$('[data-filter]', filters).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      let shown = 0;
      for (const [slug, { el }] of cards) {
        const on = c.id === 'semua' || findProject(slug).category === c.id;
        el.hidden = !on;
        shown += on;
      }
      status.textContent = `${shown} proyek ditampilkan`;
    });
    filters.append(btn);
  }

  whenNear(grid, () =>
    onIdle(async () => {
      try {
        const { renderThumbs } = await import('../viewer/thumbs.js');
        await renderThumbs(projects, (slug, mode, url) => {
          const c = cards.get(slug);
          const img = mode === 'maket' ? c.maket : c.material;
          img.onload = () => {
            img.hidden = false;
            if (!c.maket.hidden && !c.material.hidden) c.media.dataset.state = 'ready';
          };
          img.src = url;
        });
      } catch (err) {
        console.error(err);
        cards.forEach((c) => (c.media.dataset.state = 'error'));
      }
    }),
  );

  let pushed = false;
  function route() {
    const m = location.hash.match(ROUTE);
    const project = m && findProject(m[1]);
    if (project) {
      openProject(project, {
        onClose: () => {
          if (pushed) {
            pushed = false;
            history.back();
          } else {
            history.replaceState(null, '', '#karya');
            closeProject();
          }
        },
        onNavigate: (next) => {
          history.replaceState(null, '', `#/karya/${next.slug}`);
          route();
        },
      });
    } else if (isOpen()) {
      pushed = false;
      closeProject();
    }
  }

  grid.addEventListener('click', (e) => {
    if (e.target.closest('.card__link')) pushed = true;
  });
  addEventListener('hashchange', route);
  route();
}
