// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import '../../../extension/hhr-ficha-care-plan.js';

const tool = (icon, name = '') => `<button class="MuiIconButton-root"><svg data-testid="${icon}"${name ? ` aria-label="${name}"` : ''}></svg></button>`;
const tools = (extra = '') => `<div class="MuiBox-root"><div class="MuiCollapse-root"><div class="MuiStack-root">
  ${tool('AccessTimeRoundedIcon', 'Planificación estandar')}${tool('TouchAppIcon', 'Planificación única')}${tool('MoreVertIcon')}${extra}</div></div></div>`;
const card = ({heading = 'Indicación', body = '<tr><td><p>Indicación de prueba</p></td><td></td></tr>', bar = tools()} = {}) => `<div class="MuiCard-root">
  <div class="MuiCardHeader-root"><span class="MuiCardHeader-title">Programación de prueba</span></div>${bar}
  <div class="MuiCardContent-root"><div class="MuiTableContainer-root"><table><thead><tr><th><p>${heading}</p><button>Ir a Hoy</button></th><th></th></tr></thead>
    <tbody>${body}</tbody><tfoot><tr><td></td></tr></tfoot></table></div></div></div>`;
const emptyBody = '<tr><td colspan="3"><p>No se registra un plan de tratamiento.</p></td></tr>';
const mount = html => { document.body.innerHTML = `<main><div class="MuiStack-root" id="view">${html}</div></main>`; return document.querySelector('main'); };
const marks = selector => [...document.querySelectorAll(selector)].map(element => element.getAttribute('data-hhr-plan'));
const titles = () => [...document.querySelectorAll('.MuiCard-root')].map(element => [...element.querySelectorAll('.MuiBox-root button')].map(button => button.getAttribute('title')));
let plan;
beforeEach(() => { plan = globalThis.HhrFichaCarePlan.create(); });

it('marca la vista, las tarjetas de programación, sus herramientas y la tabla sin plan', () => {
  const main = mount(card() + card({body:emptyBody}));
  plan.refresh(main);
  expect(document.querySelector('#view').getAttribute('data-hhr-plan')).toBe('view');
  expect(marks('.MuiCard-root')).toEqual(['card', 'card']);
  expect(marks('.MuiCard-root > .MuiBox-root')).toEqual(['tools', 'tools']);
  expect([...document.querySelectorAll('table')].map(table => table.hasAttribute('data-hhr-plan-empty'))).toEqual([false, true]);
  // The names are Eloísa's, read from the icon. The button gets no accessible name of ours.
  const buttons = [...document.querySelector('.MuiCard-root > .MuiBox-root').querySelectorAll('button')];
  expect(buttons.map(button => button.getAttribute('data-hhr-plan-caption'))).toEqual(['Planificación estandar', 'Planificación única', null]);
  expect(buttons.map(button => button.getAttribute('title'))).toEqual(['Planificación estandar', 'Planificación única', 'Más opciones']);
  expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual([null, null, null]);
  expect(document.querySelector('thead button').hasAttribute('title')).toBe(false);
});

it('no toca una tarjeta que no es de programación ni una dentro de un diálogo', () => {
  const main = mount(card({heading:'Prestación'}) + `<div role="dialog">${card()}</div>` + '<div class="MuiCard-root"><div class="MuiCardHeader-root"></div><div class="MuiCardContent-root"><p>Otra tarjeta</p></div></div>');
  plan.refresh(main);
  expect(document.querySelectorAll('[data-hhr-plan],[data-hhr-plan-caption],[data-hhr-plan-empty],[title]')).toHaveLength(0);
});

it('deja las herramientas en su fila cuando no son solo botones de icono o hay otro bloque', () => {
  const main = mount(card({bar:tools('<input type="text">')}) + card({bar:tools('<button class="MuiButton-root">Planificar</button>')}) +
    card({bar:tools() + '<div class="MuiAlert-root">Aviso</div>'}) + card({bar:''}));
  plan.refresh(main);
  expect(marks('.MuiCard-root')).toEqual(['card', 'card', 'card', 'card']);
  expect(document.querySelectorAll('[data-hhr-plan="tools"],[data-hhr-plan-caption],[title]')).toHaveLength(0);
});

const filter = '<div class="MuiBox-root" id="filter"><label><input type="checkbox"> Mostrar todos los ocultos</label></div>';
it('marca la vista solo si contiene tarjetas de programación y, como mucho, su interruptor', () => {
  let main = mount(filter + card() + card());
  plan.refresh(main);
  expect(document.querySelector('#view').getAttribute('data-hhr-plan')).toBe('view');
  expect(document.querySelector('#filter').getAttribute('data-hhr-plan')).toBe('filter');
  // Anything else in the stack: each card is compacted, the stack and that block are left alone.
  for (const other of [`<div class="MuiBox-root">${card()}</div>`, card({heading:'Prestación'}), '<div class="MuiAlert-root">Aviso</div>',
    '<div class="MuiBox-root"><label><input type="checkbox"> Uno</label><button>Otro</button></div>', '<div class="MuiBox-root"><input type="text"></div>']) {
    plan.clear();
    main = mount(filter + card() + other);
    plan.refresh(main);
    expect(document.querySelector('#view > .MuiCard-root').getAttribute('data-hhr-plan')).toBe('card');
    expect(document.querySelectorAll('[data-hhr-plan="view"],[data-hhr-plan="filter"]')).toHaveLength(0);
  }
});

it('lee solo lo que está a la vista y no inventa nombres', () => {
  const long = 'Planificación con un nombre demasiado largo para caber';
  const main = mount(`<div hidden>${card()}</div><div aria-hidden="true">${card()}</div>` +
    card({bar:`<div class="MuiBox-root">${tool('AccessTimeRoundedIcon', long)}${tool('HelpIcon')}<button class="MuiIconButton-root" aria-label="Planificación única"><svg></svg></button></div>`,
      body:'<tr><td><p>Una sola celda, sin unir columnas</p></td></tr>'}));
  plan.refresh(main);
  expect(marks('.MuiCard-root')).toEqual([null, null, 'card']);
  const buttons = [...document.querySelectorAll('[data-hhr-plan="tools"] button')];
  // A long name stays on hover. An icon without a name that is not the menu gets none. A button with
  // an accessible name of its own shows it, and is not described a second time.
  expect(buttons.map(button => [button.getAttribute('data-hhr-plan-caption'), button.getAttribute('title')]))
    .toEqual([[null, long], [null, null], ['Planificación única', null]]);
  expect(document.querySelector('[data-hhr-plan-empty]')).toBeNull();
});

it('respeta el título propio de un botón y retira solo los suyos', () => {
  const main = mount(card());
  const [first, second] = main.querySelectorAll('.MuiBox-root button');
  first.title = 'Ayuda nativa';
  plan.refresh(main);
  plan.refresh(main);
  expect(titles()).toEqual([['Ayuda nativa', 'Planificación única', 'Más opciones']]);
  // Eloísa renames a tool: the hint follows.
  second.querySelector('svg').setAttribute('aria-label', 'Planificación puntual');
  plan.refresh(main);
  expect(second.title).toBe('Planificación puntual');
  expect(second.getAttribute('data-hhr-plan-caption')).toBe('Planificación puntual');
  // The table gains a plan, then the view closes.
  main.querySelector('th p').textContent = 'Prestación';
  plan.refresh(main);
  expect(titles()).toEqual([['Ayuda nativa', null, null]]);
  expect(document.querySelectorAll('[data-hhr-plan],[data-hhr-plan-caption]')).toHaveLength(0);
  main.querySelector('th p').textContent = 'Indicación';
  plan.refresh(main);
  expect(marks('.MuiCard-root')).toEqual(['card']);
  plan.clear();
  expect(titles()).toEqual([['Ayuda nativa', null, null]]);
  expect(document.querySelectorAll('[data-hhr-plan],[data-hhr-plan-caption],[data-hhr-plan-empty]')).toHaveLength(0);
});

it('dibuja como icono los interruptores de una tarjeta y deja el de la vista como nota', () => {
  const header = label => `<div class="MuiCardHeader-root"><span class="MuiCardHeader-title">Programación de procedimientos</span>
    <div class="MuiCardHeader-action"><label><input type="checkbox"> ${label}</label></div></div>`;
  const withSwitch = label => card().replace(/<div class="MuiCardHeader-root">[\s\S]*?<\/div>/, header(label));
  const main = mount(filter + withSwitch('Mostrar Suspendidos') + withSwitch('Mostrar realizados, no realizados, archivados y suspendidos'));
  plan.refresh(main);
  const labels = [...document.querySelectorAll('.MuiCardHeader-action label')];
  expect(labels.map(label => [label.getAttribute('data-hhr-plan-filter'), label.title]))
    .toEqual([['suspended', 'Mostrar Suspendidos'], ['hidden', 'Mostrar realizados, no realizados, archivados y suspendidos']]);
  expect(document.querySelector('#filter label').getAttribute('data-hhr-plan-filter')).toBe('all');
  plan.clear();
  expect(document.querySelectorAll('[data-hhr-plan-filter]')).toHaveLength(0);
  expect(labels.map(label => label.hasAttribute('title'))).toEqual([false, false]);
});

it('reconoce Programación de procedimientos, que deja vacía su primera columna', () => {
  // On the page its first heading is an empty cell, without «Ir a Hoy» (read 27-11-2026).
  const main = mount(card().replace('Programación de prueba', 'Programación de procedimientos').replace(/<th><p>Indicación<\/p><button>Ir a Hoy<\/button><\/th>/, '<th></th>'));
  plan.refresh(main);
  expect(marks('.MuiCard-root')).toEqual(['card']);
});

it('reconoce la columna de selección de la ficha de Gestión de cuidados y solo esa', () => {
  // On the page each table but Procedimientos opens with a checkbox in its heading and in each row (read 27-11-2026).
  const box = tag => `<${tag}><span class="MuiCheckbox-root"><input type="checkbox"></span></${tag}>`;
  const select = html => html.replace('<thead><tr>', '<thead><tr>' + box('th')).replace(/<tbody><tr>/, '<tbody><tr>' + box('td'));
  const main = mount(select(card()) + select(card().replace('Indicación</p>', 'Prestación</p>')) + card());
  plan.refresh(main);
  expect(marks('.MuiCard-root')).toEqual(['card', null, 'card']);
  expect([...document.querySelectorAll('table')].map(table => table.hasAttribute('data-hhr-plan-select'))).toEqual([true, false, false]);
  // A first column with words, or with more than a checkbox, is not a column of selection.
  for (const first of ['<th>Sel <input type="checkbox"></th>', '<th><input type="checkbox"><button>Todo</button></th>']) {
    plan.clear();
    plan.refresh(mount(card().replace('<thead><tr>', '<thead><tr>' + first)));
    expect(marks('.MuiCard-root')).toEqual([null]);
  }
  plan.clear();
  expect(document.querySelectorAll('[data-hhr-plan-select]')).toHaveLength(0);
});

it('no escribe en la página cuando nada cambió', async () => {
  const main = mount(card() + card({body:emptyBody}));
  plan.refresh(main);
  const records = [];
  const observer = new MutationObserver(list => records.push(...list));
  observer.observe(document.body, {subtree:true, attributes:true, childList:true, characterData:true});
  plan.refresh(main);
  await Promise.resolve();
  observer.disconnect();
  expect(records).toHaveLength(0);
});
