// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import '../../../extension/hhr-ficha-evolution-authors.js';

function event(id, title, sub, kind) {
  return `<article id="${id}" class="MuiCard-root"><header class="MuiCardHeader-root">
    <span class="MuiCardHeader-title">${title}</span><span class="MuiCardHeader-subheader">${sub}</span></header>
    <div class="MuiCardContent-root"><p class="MuiTypography-root">${kind}</p><p>Texto de prueba</p></div></article>`;
}
let reader;
const hidden = () => [...document.querySelectorAll('[data-hhr-evolution-filtered="card"]')].map(el => el.id);
const actions = () => [...document.querySelectorAll('.hhr-evo-author')];
beforeEach(() => {
  document.body.innerHTML = '<main><nav role="tablist"><button role="tab" aria-selected="true">Resumen</button>' +
    '<button role="tab" aria-selected="false">Historial</button></nav><section id="evolution"><div class="MuiCardHeader-action"></div>' +
    '<button id="amend">Enmendar</button></section><div data-hhr-history-timeline><div class="MuiBox-root">' +
    event('a','Médico','Ana Ejemplo','Evolución') + event('b','Luis Ejemplo','Enfermera(o)','Evolución') +
    event('rx','Médico','Ana Ejemplo','Fármacos') + event('anon','?','','Evolución') +
    '<article id="unknown" class="MuiCard-root"><p>Otro formato</p></article></div></div></main>';
  vi.spyOn(Element.prototype,'getClientRects').mockReturnValue([{width:100,height:30}]);
  for (const tab of document.querySelectorAll('[role=tab]')) {
    tab.addEventListener('click', () => {
      for (const t of document.querySelectorAll('[role=tab]')) t.setAttribute('aria-selected',String(t===tab));
    });
  }
  reader = globalThis.HhrFichaEvolutionAuthors.create();
  reader.refresh('1');
});
afterEach(() => {reader.clear(); document.body.replaceChildren(); vi.restoreAllMocks();});

it('reúne solo las acciones de la nota de lectura y conserva los botones al montar pautas o un editor', () => {
  const card = document.querySelector('#evolution');
  card.className = 'MuiCard-root';
  card.innerHTML = '<div class="MuiCardHeader-root"><div class="MuiCardHeader-action"></div></div>' +
    '<div class="MuiCardContent-root"><div class="MuiStack-root"><div class="MuiStack-root">' +
    '<div class="MuiBox-root"><span class="MuiTypography-caption">Nota ficticia</span></div></div>' +
    '<div class="MuiStack-root"><div class="MuiStack-root"><button aria-label="Editar evolución"><svg></svg></button>' +
    '</div></div></div></div>';
  const native = card.querySelector('[aria-label="Editar evolución"]');
  const host = native.parentElement;
  const edit = vi.fn();
  native.addEventListener('click',edit);
  native.focus();
  reader.refresh('1');
  expect(card.hasAttribute('data-hhr-evo-toolbar')).toBe(true);
  host.insertAdjacentHTML('beforeend','<span class="hhr-checklist-launcher"><button>Pautas</button></span>');
  reader.refresh('1');
  expect(card.hasAttribute('data-hhr-evo-toolbar')).toBe(true);
  expect(native.parentElement).toBe(host);
  expect(document.activeElement).toBe(native);
  native.click();
  expect(edit).toHaveBeenCalledOnce();
  host.insertAdjacentHTML('beforeend','<button>Firmar nota</button>');
  reader.refresh('1');
  expect(card.hasAttribute('data-hhr-evo-toolbar')).toBe(false);
  host.lastChild.remove();
  card.querySelector('.MuiTypography-caption').setAttribute('contenteditable','true');
  reader.refresh('1');
  expect(card.hasAttribute('data-hhr-evo-toolbar')).toBe(false);
});

it('nombra solo las acciones nativas reconocibles y retira sus marcas sin tocar los nombres de Eloísa', () => {
  const card = document.querySelector('#evolution');
  card.className = 'MuiCard-root';
  const toolbar = (header, tools) => {
    card.innerHTML = '<div class="MuiCardHeader-root"><div class="MuiCardHeader-action">' + header + '</div></div>' +
      '<div class="MuiCardContent-root"><div class="MuiStack-root"><div class="MuiStack-root">' +
      '<div class="MuiBox-root"><span class="MuiTypography-caption">Nota ficticia</span></div></div>' +
      '<div class="MuiStack-root"><div class="MuiStack-root">' + tools + '</div></div></div></div>';
    reader.refresh('1');
    return [...card.querySelectorAll('button:not(.hhr-evo-entry)')];
  };
  const marks = buttons => buttons.map(button => button.getAttribute('data-hhr-evo-action'));

  let buttons = toolbar('<button aria-label="Más opciones"><svg data-testid="MoreVertIcon"></svg></button>',
    '<button aria-label="Editar evolución"><svg></svg></button><button title="Enmendamientos"><svg></svg></button>' +
    '<button aria-label="Compartir"><svg></svg></button><button aria-label="Nueva evolución"><svg></svg></button>');
  expect(card.hasAttribute('data-hhr-evo-toolbar')).toBe(true);
  expect(marks(buttons)).toEqual(['more','edit','amend',null,'write']);
  // A named button may carry Eloísa's own tooltip. Only its native title remains.
  expect(buttons.map(button => button.title)).toEqual(['','','Enmendamientos','','']);
  // Refreshing must not treat its own hint as a native name, nor rewrite identical marks.
  const writes = [];
  const observer = new MutationObserver(records => writes.push(...records));
  observer.observe(card,{subtree:true,attributes:true});
  reader.refresh('1');
  expect(observer.takeRecords()).toEqual([]);
  observer.disconnect();
  expect(marks(buttons)).toEqual(['more','edit','amend',null,'write']);

  // Two unnamed icons: the first one opens the native editor, as for a guideline. The second stays as it is.
  buttons = toolbar('', '<button><svg></svg></button><button><svg></svg></button>');
  expect(marks(buttons)).toEqual(['edit',null]);
  expect(buttons.map(button => button.title)).toEqual(['Editar evolución','']);
  buttons = toolbar('', '<button><svg data-testid="HistoryIcon"></svg></button><button><svg data-testid="EditNoteIcon"></svg></button>');
  expect(marks(buttons)).toEqual([null,'edit']);
  buttons = toolbar('', '<button><svg></svg></button><button><svg></svg></button><button><svg></svg></button>');
  expect(marks(buttons)).toEqual([null,null,null]);
  // An overflow icon among the tools is not the card menu.
  buttons = toolbar('', '<button aria-label="Opciones"><svg></svg></button>');
  expect(marks(buttons)).toEqual([null]);

  buttons = toolbar('<button aria-label="Más opciones"><svg></svg></button>',
    '<button aria-label="Editar evolución" title="Editar"><svg></svg></button><button><svg data-testid="EditIcon"></svg></button>');
  expect(marks(buttons)).toEqual(['more','edit','edit']);
  buttons[2].title = 'Nombre que Eloísa añadió después';
  reader.clear();
  expect(marks(buttons)).toEqual([null,null,null]);
  expect(buttons.map(button => button.title)).toEqual(['','Editar','Nombre que Eloísa añadió después']);
  expect(card.querySelector('[data-hhr-evo-hint],[data-hhr-evo-action]')).toBeNull();
});

it('opens native history, restricts the explicit view to notes, and filters by the person in either header order', () => {
  const amendments = vi.fn();
  document.querySelector('#amend').addEventListener('click',amendments);
  document.querySelector('#evolution .hhr-evo-entry').click();
  expect(amendments).not.toHaveBeenCalled();
  expect(document.querySelector('[aria-selected="true"]').textContent).toBe('Historial');
  expect(actions().map(x => x.textContent)).toEqual(['Todos','Ana Ejemplo','Luis Ejemplo','Autor sin identificar']);
  expect(hidden()).toEqual(['rx']);
  actions()[1].click();
  expect(hidden()).toEqual(['b','rx','anon']);
  expect(actions()[1].getAttribute('aria-pressed')).toBe('true');
  actions()[3].click();
  expect(hidden()).toEqual(['a','b','rx']);
  actions()[0].click();
  expect(hidden()).toEqual(['rx']);
  document.querySelector('.hhr-evo-back').click();
  expect(hidden()).toEqual([]);
  expect(document.activeElement.classList.contains('hhr-evo-entry')).toBe(true);
});

it('restores full history after changing episode, theme, or tab, and reconciles asynchronously loaded authors', () => {
  document.querySelector('.hhr-evo-entry').click();
  actions()[2].click();
  document.querySelector('#b').remove();
  reader.refresh('1');
  expect(actions().map(x => x.textContent)).toEqual(['Todos','Ana Ejemplo','Autor sin identificar']);
  expect(actions()[0].getAttribute('aria-pressed')).toBe('true');
  reader.refresh('2');
  expect(actions().length).toBe(0);
  expect(hidden()).toEqual([]);
  document.querySelector('.hhr-evo-entry').click();
  document.querySelector('[role=tab]').click();
  reader.refresh('2');
  expect(hidden()).toEqual([]);
  reader.refresh(null);
  expect(document.querySelector('.hhr-evo-entry,.hhr-evo-filters')).toBeNull();
});

it('waits for the native history tab to switch and keeps keyboard focus on the author filter', () => {
  const original = document.querySelector('[role=tab]:last-child');
  const history = original.cloneNode(true);
  original.replaceWith(history);
  reader.refresh('1');
  document.querySelector('.hhr-evo-entry').click();
  expect(actions().length).toBe(0);
  history.setAttribute('aria-selected','true');
  document.querySelector('#a .MuiCardHeader-title').textContent = 'Kinesiólogo(a)';
  reader.refresh('1');
  expect(actions()[1].textContent).toBe('Ana Ejemplo');
  expect(document.activeElement).toBe(actions()[0]);
});

it('hides only the recognized role and the date of an entirely filtered day, then restores the native headers', () => {
  const timeline = document.querySelector('[data-hhr-history-timeline]');
  const date = '<div class="divider"><span class="MuiChip-root"><span class="MuiChip-label">Ayer</span></span></div>';
  const day = document.createElement('div');
  day.className = 'MuiBox-root';
  day.innerHTML = date + event('old','Luis Ejemplo','Enfermera(o)','Evolución');
  timeline.append(day);
  document.querySelector('.hhr-evo-entry').click();
  const title = document.querySelector('#a .MuiCardHeader-title');
  const name = document.querySelector('#a .MuiCardHeader-subheader');
  expect(title.getAttribute('data-hhr-evolution-filtered')).toBe('role');
  expect(title.textContent).toBe('Médico');
  expect(name.hasAttribute('data-hhr-evolution-filtered')).toBe(false);
  expect(day.querySelector('.MuiCardHeader-subheader').getAttribute('data-hhr-evolution-filtered')).toBe('role');
  actions()[1].click();
  expect(day.firstElementChild.getAttribute('data-hhr-evolution-filtered')).toBe('date');
  day.insertAdjacentHTML('beforeend','<button>Ver más</button>');
  reader.refresh('1');
  expect(day.firstElementChild.hasAttribute('data-hhr-evolution-filtered')).toBe(false);
  day.lastElementChild.replaceWith(document.createElement('article'));
  reader.refresh('1');
  expect(day.firstElementChild.hasAttribute('data-hhr-evolution-filtered')).toBe(false);
  document.querySelector('.hhr-evo-back').click();
  expect(timeline.querySelector('[data-hhr-evolution-filtered]')).toBeNull();
});

it('only presents the author choices once the native timeline has mounted', () => {
  const timeline = document.querySelector('[data-hhr-history-timeline]');
  timeline.remove();
  document.querySelector('#evolution .hhr-evo-entry').click();
  expect(actions()).toHaveLength(0);
  document.querySelector('main').append(timeline);
  reader.refresh('1');
  expect(document.activeElement).toBe(actions()[0]);
  expect(actions()[0].textContent).toBe('Todos');
  expect(document.querySelector('#rx').hasAttribute('data-hhr-evolution-filtered')).toBe(true);
});
