import { $, $$, h, roomArea, totalArea, m2, narrowQuery } from '../lib/util.js';
import { renderPlan } from '../plan/plan.js';
import { projects } from '../data/projects.js';

const FLOORS = { wood: 'Lantai kayu', terrazzo: 'Terrazzo', tile: 'Keramik', concrete: 'Beton ekspos' };
const TABS = ['3d', 'plan', 'info'];

const dlg = $('#project-dialog');
const el = {
  meta: $('#pd-meta'),
  title: $('#pd-title'),
  canvas: $('.pd__canvas', dlg),
  toolbar: $('.pd__toolbar', dlg),
  planSvg: $('.pd__plan-svg', dlg),
  room: $('.pd__room', dlg),
  info: $('#pd-info .pd__info-body', dlg),
  tabs: $$('[role="tab"]', dlg),
  panels: { '3d': $('#pd-3d'), plan: $('#pd-plan'), info: $('#pd-info') },
};

let current = null;
let viewerModule = null;
let tab = '3d';

export const isOpen = () => dlg.open;

function signal(open) {
  dispatchEvent(new CustomEvent('modal', { detail: open }));
}

function roomInfo() {
  if (!current) return;
  const id = current.hover ?? current.selected;
  const room = current.project.rooms.find((r) => r.id === id);
  if (!room) {
    el.room.replaceChildren(h('p', { class: 'pd__room-empty', text: 'Arahkan kursor atau ketuk ruang di denah untuk melihat detailnya.' }));
    return;
  }
  const showJump = narrowQuery.matches && tab === 'plan' && id === current.selected;
  const parts = [
    h('p', { class: 'pd__room-kicker', text: `${FLOORS[room.floor] ?? 'Lantai'} · ${m2(roomArea(room))}` }),
    h('h4', { class: 'pd__room-name', text: room.name }),
    h('p', { class: 'pd__room-note', text: room.note }),
  ];
  if (showJump) parts.push(h('button', { type: 'button', class: 'btn btn--small', text: 'Lihat di 3D', onclick: () => setTab('3d') }));
  el.room.replaceChildren(...parts);
}

function hover(id) {
  if (!current) return;
  current.hover = id;
  current.plan?.highlight(id);
  current.viewer?.highlight(id);
  roomInfo();
}

function select(id) {
  if (!current) return;
  current.selected = id;
  current.plan?.select(id);
  current.viewer?.select(id);
  roomInfo();
}

function setTab(name, focus = false) {
  tab = name;
  const narrow = narrowQuery.matches;
  for (const t of el.tabs) {
    const on = t.dataset.tab === name;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if (on && focus) t.focus();
  }
  for (const [key, panel] of Object.entries(el.panels)) panel.hidden = narrow && key !== name;
  roomInfo();
}

function applyLayout() {
  const narrow = narrowQuery.matches;
  for (const [key, panel] of Object.entries(el.panels)) {
    if (narrow) {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `pd-tab-${key}`);
    } else {
      panel.removeAttribute('role');
      panel.removeAttribute('aria-labelledby');
    }
  }
  setTab(tab);
}

function fill(p) {
  el.meta.textContent = `${p.type} · ${p.location} · ${p.year}`;
  el.title.textContent = p.title;
  const specs = [['Lokasi', p.location], ['Tahun', p.year], ['Luas', m2(totalArea(p))], ['Lingkup', p.scope], ['Status', p.status]];
  el.info.replaceChildren(
    h('p', { class: 'pd__lede', text: p.summary }),
    ...p.story.map((t) => h('p', { text: t })),
    h('dl', { class: 'specs' }, ...specs.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: String(v) })])),
    h('div', { class: 'palette' },
      h('h4', { text: 'Palet material' }),
      h('ul', {}, ...p.palette.map(([name, hex]) => h('li', {}, h('span', { class: 'palette__swatch', style: `--c:${hex}`, 'aria-hidden': 'true' }), name)))),
    h('a', { class: 'btn', href: '#kontak', text: 'Diskusikan proyek serupa' }),
  );
  for (const b of $$('button[aria-pressed]', el.toolbar)) {
    const first = b.parentElement.firstElementChild === b;
    b.setAttribute('aria-pressed', String(first));
  }
  $$('button', el.toolbar).forEach((b) => (b.disabled = true));
}

function mountViewer() {
  const token = current.token;
  el.canvas.dataset.state = 'loading';
  viewerModule ??= import('../viewer/viewer.js');
  viewerModule
    .then(({ createViewer }) => {
      if (!current || current.token !== token) return;
      current.viewer = createViewer(el.canvas, current.project, {
        onHover: hover,
        onSelect: select,
        onReady: () => {
          el.canvas.dataset.state = 'ready';
          $$('button', el.toolbar).forEach((b) => (b.disabled = false));
        },
      });
    })
    .catch((err) => {
      console.error(err);
      el.canvas.dataset.state = 'error';
    });
}

function teardown() {
  if (!current) return;
  current.viewer?.dispose();
  current.plan?.destroy();
  current = null;
}

export function openProject(project, callbacks) {
  if (current?.project === project) return;
  teardown();
  current = { project, callbacks, hover: null, selected: null, viewer: null, plan: null, token: Symbol(project.slug) };
  fill(project);
  if (!dlg.open) {
    dlg.showModal();
    signal(true);
  }
  tab = '3d';
  applyLayout();
  current.plan = renderPlan(el.planSvg, project, { onHover: hover, onSelect: select });
  roomInfo();
  mountViewer();
  $('.pd__scroll', dlg).scrollTop = 0;
}

export function closeProject() {
  teardown();
  if (dlg.open) {
    dlg.close();
    signal(false);
  }
}

const requestClose = () => current?.callbacks.onClose();

function step(dir) {
  if (!current) return;
  const i = projects.indexOf(current.project);
  current.callbacks.onNavigate(projects[(i + dir + projects.length) % projects.length]);
}

dlg.addEventListener('cancel', (e) => {
  e.preventDefault();
  requestClose();
});
$('[data-pd="close"]', dlg).addEventListener('click', requestClose);
$('[data-pd="prev"]', dlg).addEventListener('click', () => step(-1));
$('[data-pd="next"]', dlg).addEventListener('click', () => step(1));

el.toolbar.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  const v = current?.viewer;
  if (!b || !v) return;
  const { mode, walls, time, view } = b.dataset;
  if (mode) v.setMode(mode);
  if (walls) v.setWalls(walls);
  if (time) v.setTime(time);
  if (view === 'top') v.top();
  if (view === 'reset') v.reset();
  if (b.hasAttribute('aria-pressed')) {
    for (const sib of b.parentElement.children) sib.setAttribute('aria-pressed', String(sib === b));
  }
});

el.tabs.forEach((t, i) => {
  t.addEventListener('click', () => setTab(t.dataset.tab));
  t.addEventListener('keydown', (e) => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    setTab(TABS[(i + d + TABS.length) % TABS.length], true);
  });
});
narrowQuery.addEventListener('change', applyLayout);
