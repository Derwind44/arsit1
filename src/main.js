import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './styles/main.css';

import { $, whenNear } from './lib/util.js';
import { initNav } from './ui/nav.js';
import { initHero } from './hero/index.js';
import { initProjects } from './ui/projects.js';
import { initContact } from './ui/contact.js';
import { initReveal } from './ui/reveal.js';

document.documentElement.classList.add('js');

initNav();
initHero($('.hero'));
initProjects();
initContact();
initReveal();

const maket = $('#maket');
whenNear(maket, () =>
  import('./maket/maket.js')
    .then(({ initMaket }) => initMaket(maket))
    .catch((err) => {
      console.error(err);
      $('.maket__stage', maket).dataset.state = 'error';
    }),
);
