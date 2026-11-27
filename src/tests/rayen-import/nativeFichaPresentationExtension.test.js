// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../extension/hhr-history-date-navigation.js';
import '../../../extension/hhr-ficha-order-details.js';
import '../../../extension/hhr-ficha-reading-surfaces.js';
import '../../../extension/hhr-ficha-vital-strip.js';
import '../../../extension/hhr-ficha-summary-density.js';
import '../../../extension/hhr-ficha-reading-labels.js';
import '../../../extension/hhr-ficha-round-layout.js';
import '../../../extension/hhr-ficha-care-plan.js';
import '../../../extension/hhr-ficha-note-reader.js';
import '../../../extension/hhr-native-ficha-presentation.js';

const event = (role, category, note = '') => `<div class="MuiCard-root">
  <div class="MuiCardHeader-root"><span class="MuiCardHeader-title">Autor de prueba</span><span class="MuiCardHeader-subheader">${role}</span></div>
  <div class="MuiCardContent-root"><div class="MuiStack-root"><p class="MuiTypography-root">${category}</p><div>${note}</div></div></div></div>`;
const group = (date, cards) => `<div class="MuiBox-root"><div class="MuiStack-root"><div class="MuiChip-root"><span class="MuiChip-label">${date}</span></div></div>${cards}</div>`;
const historyTab = '<div role="tablist"><button role="tab" aria-selected="true">Historial</button><button role="tab" aria-selected="false">Alta</button></div>';
let history, presentation;
beforeEach(() => {
  vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(function () {
    return this.closest('[hidden],[data-hhr-history-filtered]') ? [] : [{ top: 0, bottom: 30, width: 100, height: 30 }];
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
});
afterEach(() => {
  history?.dispose(); presentation?.dispose(); history = null; presentation = null;
  document.body.replaceChildren(); vi.unstubAllGlobals(); vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

describe('Compact native history dates', () => {
  it('opens native history once and focuses the newest medical publication after loading', () => {
    window.history.replaceState(null, '', '/dashboard/encounter-list-nurse/22#hhr-ultima-publicacion');
    document.body.innerHTML = historyTab + '<div id="timeline"></div>';
    const tab = document.querySelector('button');
    tab.setAttribute('aria-selected', 'false');
    const open = vi.fn(() => tab.setAttribute('aria-selected', 'true'));
    tab.addEventListener('click', open);
    const unavailable = vi.fn();
    history = globalThis.HhrHistoryDateNavigation.create({ onNoveltyUnavailable: unavailable });
    history.refresh('22'); history.refresh('22');
    expect(open).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('');
    document.querySelector('#timeline').innerHTML = group('Hoy',
      event('Paramédico', 'Administración') + event('Médica cirujana', 'Indicaciones') + event('Médico', 'Evolución')) +
      group('Ayer', event('Médico', 'Evolución'));
    history.refresh('22');
    const target = document.querySelector('[data-hhr-history-novelty-target]');
    expect(target.querySelector('.MuiCardContent-root').textContent).toBe('Indicaciones');
    expect(document.activeElement).toBe(target);
    expect(window.scrollBy).toHaveBeenCalled();
    expect(unavailable).not.toHaveBeenCalled();
    tab.setAttribute('aria-selected', 'false');
    history.refresh('22');
    expect(target.hasAttribute('data-hhr-history-novelty-target')).toBe(false);
    expect(target.hasAttribute('tabindex')).toBe(false);
  });

  it('reports an unavailable publication and never opens a different episode', () => {
    vi.useFakeTimers();
    const url = '/dashboard/encounter-list-nurse/22#hhr-ultima-publicacion';
    window.history.replaceState(null, '', url);
    document.body.innerHTML = historyTab + '<div>' + group('Hoy', event('Enfermera', 'Evolución')) + '</div>';
    const unavailable = vi.fn();
    history = globalThis.HhrHistoryDateNavigation.create({ onNoveltyUnavailable: unavailable });
    history.refresh('23');
    expect(window.location.hash).toBe('#hhr-ultima-publicacion');
    history.refresh('22');
    expect(document.querySelector('[data-hhr-history-novelty-target]')).toBeNull();
    vi.advanceTimersByTime(15_000);
    expect(unavailable).toHaveBeenCalledTimes(1);
  });

  it('shows only date navigation while keeping every native event available', () => {
    document.body.innerHTML = historyTab + '<div id="timeline">' +
      group('Hoy', event('Médico', 'Evolución') + event('Médico', 'Fármacos')) +
      group('Ayer', event('Enfermera(o)', 'Evolución')) + '</div>';
    history = globalThis.HhrHistoryDateNavigation.create(); history.refresh('1');
    const navigator = document.querySelector('#hhr-history-date-navigation');
    expect(navigator.parentElement).toBe(document.querySelector('[role="tablist"]'));
    expect(navigator.previousElementSibling.textContent).toBe('Alta');
    const shadow = navigator.shadowRoot;
    expect(shadow.querySelectorAll('button')).toHaveLength(2);
    expect(shadow.querySelectorAll('option')).toHaveLength(2);
    expect(shadow.querySelector('[data-filter],[role="status"]')).toBeNull();
    expect(document.querySelectorAll('.MuiCard-root')).toHaveLength(3);
    expect(document.querySelectorAll('[data-hhr-history-filtered]')).toHaveLength(0);
  });

  it('updates loaded dates after native filtering and clears old episode dates', () => {
    document.body.innerHTML = historyTab + '<div id="timeline">' + group('Hoy', event('Médico', 'Evolución')) + '</div>';
    history = globalThis.HhrHistoryDateNavigation.create(); history.refresh('1');
    document.querySelector('#timeline').innerHTML = group('01-01-2025', event('Médico', 'Procedimientos'));
    history.refresh('2');
    const shadow = document.querySelector('#hhr-history-date-navigation').shadowRoot;
    expect(shadow.querySelector('select').textContent).toBe('01-01-2025');
    document.querySelector('#timeline').replaceChildren(); history.refresh('2');
    expect(document.querySelector('#hhr-history-date-navigation')).toBeNull();
  });

  it('releases date navigation on leaving history', () => {
    document.body.innerHTML = historyTab + '<div>' + group('Hoy', event('Médico', 'Evolución')) + '</div>';
    history = globalThis.HhrHistoryDateNavigation.create(); history.refresh('1');
    document.querySelector('[role="tab"]').setAttribute('aria-selected', 'false'); history.refresh('1');
    expect(document.querySelector('#hhr-history-date-navigation')).toBeNull();
    expect(document.querySelector('[data-hhr-history-rail],[data-hhr-history-tab],[data-hhr-history-scroll]')).toBeNull();
    expect(document.querySelectorAll('.MuiCard-root')).toHaveLength(1);
  });

  it('marks each day with its date and each note by its category, and returns both to Eloísa on leaving', () => {
    vi.useFakeTimers({toFake:['Date']});
    vi.setSystemTime(new Date('2026-04-15T18:00:00Z'));
    const timed = (category, time = '09:12') => `<div class="MuiCard-root"><div class="MuiCardHeader-root">
      <span class="MuiCardHeader-title">Autor de prueba</span><span class="MuiCardHeader-subheader">Médico</span>
      <span class="MuiCardHeader-action">${time}</span></div>
      <div class="MuiCardContent-root"><p class="MuiTypography-root">${category}</p><div>Texto</div></div></div>`;
    const categories = ['Evolución', 'Evolución de enfermería', 'Evolución médica', 'Fármacos', 'Evolución de signos'];
    document.body.innerHTML = historyTab + '<div id="timeline">' + group('Hoy', categories.map(category => timed(category)).join('')) +
      group('Ayer', timed('Evolución', 'sin hora')) + group('13-04-2026', timed('Procedimientos')) + '</div>';
    history = globalThis.HhrHistoryDateNavigation.create(); history.refresh('1');
    const days = () => [...document.querySelectorAll('#timeline > .MuiBox-root > :first-child .MuiChip-label')].map(label => label.dataset.hhrHistoryDay);
    const kinds = () => [...document.querySelectorAll('#timeline .MuiCard-root')].map(card => card.getAttribute('data-hhr-history-kind'));
    expect(days()).toEqual(['Hoy · 15-04-2026', 'Ayer · 14-04-2026', '13-04-2026']);
    expect(document.querySelector('#timeline .MuiChip-label').textContent).toBe('Hoy');
    // A card without a readable time keeps its native layout, whatever its category.
    expect(kinds()).toEqual(['note', 'note', 'note', null, null, null, null]);
    // Identical marks are not rewritten on the next refresh.
    const writes = new MutationObserver(() => {});
    writes.observe(document.querySelector('#timeline'), {subtree:true, attributes:true});
    history.refresh('1');
    expect(writes.takeRecords()).toEqual([]);
    writes.disconnect();

    document.querySelector('#timeline .MuiCardContent-root > p').textContent = 'Fármacos';
    history.refresh('1');
    expect(kinds()[0]).toBeNull();
    document.querySelector('[role="tab"]').setAttribute('aria-selected', 'false'); history.refresh('1');
    expect(document.querySelector('[data-hhr-history-day],[data-hhr-history-kind],[data-hhr-history-inline]')).toBeNull();
  });

  it('reads every event of a day across the boxes Eloísa gives them, in both native content shapes', () => {
    // As in the real Historial: a dated box opens the day, later events have boxes of their own,
    // the time ends in «hrs», and some categories sit inside the only stack of the content.
    const card = (id, category, inStack = false, time = '09:12 hrs') => `<div id="${id}" class="MuiCard-root"><div class="MuiCardHeader-root">
      <div class="MuiCardHeader-avatar"><div class="MuiAvatar-root">M</div></div>
      <span class="MuiCardHeader-title">Médico</span><span class="MuiCardHeader-subheader">Autor de prueba</span>
      <div class="MuiCardHeader-action"><p>${time}</p></div></div><div class="MuiCardContent-root">${inStack
        ? '<div class="MuiStack-root"><p class="MuiTypography-root">' + category + '</p><div>Texto</div></div>'
        : '<p class="MuiTypography-root">' + category + '</p><div class="MuiStack-root"><div>Texto</div></div>'}</div></div>`;
    const box = (cards, date = '') => '<div class="MuiBox-root">' + (date ? '<div class="MuiStack-root"><div class="MuiChip-root"><span class="MuiChip-label">' + date + '</span></div></div>' : '') + cards + '</div>';
    const chip = '<div class="MuiChip-root"><span class="MuiChip-label">Nuevo</span></div>';
    document.body.innerHTML = historyTab + '<div id="timeline"><button class="hhr-evo-entry">Ver evoluciones</button>' +
      box(card('a', 'Administrador de medicamentos'), 'Hoy') + box(card('b', 'Evolución')) +
      box(card('c', 'Signos vitales', true) + card('d', 'Evolución', false, '08:50 hrs')) + box(card('e', 'Fármacos', true).replace('Texto', chip)) +
      box(card('f', 'Evolución'), 'Ayer') + box(card('g', 'Alertas', true, 'ayer')) + '</div>';
    history = globalThis.HhrHistoryDateNavigation.create(); history.refresh('1');
    const boxes = [...document.querySelectorAll('#timeline > .MuiBox-root')];
    const attr = name => id => document.getElementById(id).getAttribute(name);
    expect(['a','b','c','d','e','f','g'].map(attr('data-hhr-history-inline'))).toEqual(['', 'evolution', '', 'evolution', '', 'evolution', null]);
    expect(['a','b','c','d','e','f','g'].map(attr('data-hhr-history-kind'))).toEqual([null, 'note', null, 'note', null, 'note', null]);
    // Only a recognized card has its inner stack flattened into the line of the event.
    expect(['c','e','g'].map(id => document.querySelector('#' + id + ' .MuiCardContent-root > .MuiStack-root').hasAttribute('data-hhr-history-flat'))).toEqual([true, true, false]);
    expect(document.querySelector('#a .MuiCardContent-root > .MuiStack-root').hasAttribute('data-hhr-history-flat')).toBe(false);
    expect(boxes.map(el => el.getAttribute('data-hhr-history-edge'))).toEqual(['start', null, null, 'end', 'start', 'end']);
    expect(document.querySelectorAll('[data-hhr-history-new]')).toHaveLength(1);
    expect(document.querySelector('#e [data-hhr-history-new]')).not.toBeNull();
    // The navigation still offers one date per day, not one per box.
    expect(document.querySelector('#hhr-history-date-navigation').shadowRoot.querySelectorAll('option')).toHaveLength(2);

    // A new dated box in the middle splits the day. An event that loses its category returns to Eloísa.
    boxes[2].insertAdjacentHTML('afterbegin', '<div class="MuiStack-root"><div class="MuiChip-root"><span class="MuiChip-label">13-04-2026</span></div></div>');
    document.querySelector('#e .MuiCardContent-root p').innerHTML = '<b>Fármacos</b>';
    history.refresh('1');
    expect(boxes.map(el => el.getAttribute('data-hhr-history-edge'))).toEqual(['start', 'end', 'start', 'end', 'start', 'end']);
    expect(attr('data-hhr-history-inline')('e')).toBeNull();
    expect(document.querySelector('#e [data-hhr-history-flat]')).toBeNull();

    document.querySelector('[role="tab"]').setAttribute('aria-selected', 'false'); history.refresh('1');
    expect(document.querySelector('[data-hhr-history-edge],[data-hhr-history-flat],[data-hhr-history-inline],[data-hhr-history-kind],[data-hhr-history-day]')).toBeNull();
  });

  it('compacts Nuevo only within history cards and clears the style when the label changes', () => {
    const chip = '<div class="MuiChip-root"><span class="MuiChip-label">Nuevo</span></div>';
    document.body.innerHTML = historyTab + chip + '<div id="timeline">' +
      group('Hoy', event('Médico', 'Fármacos', chip)) + '</div>';
    history = globalThis.HhrHistoryDateNavigation.create(); history.refresh('1');
    const marked = document.querySelector('[data-hhr-history-new]');
    expect(marked.closest('#timeline')).not.toBeNull();
    expect(document.querySelectorAll('[data-hhr-history-new]')).toHaveLength(1);
    marked.firstElementChild.textContent = 'Suspendido';
    history.refresh('1');
    expect(marked.hasAttribute('data-hhr-history-new')).toBe(false);
  });
});

describe('Native ficha presentation', () => {
  it('lets a long note scroll in its card, without a reader window, and restores the native attributes', () => {
    document.body.innerHTML = '<div><span aria-label="Nota nativa">Ingreso ficticio</span></div>';
    const source = document.querySelector('span');
    Object.defineProperties(source, {
      scrollHeight:{value:480}, clientHeight:{value:180}, innerText:{get:() => source.textContent},
    });
    const reader = globalThis.HhrFichaNoteReader.create();
    reader.refresh(source,'uno');
    // The owner asked to drop «Nota completa» and its window (27-11-2026).
    expect(document.querySelector('button,dialog')).toBeNull();
    expect([source.getAttribute('role'), source.getAttribute('tabindex'), source.getAttribute('aria-label')]).toEqual(['region', '0', 'Nota nativa']);
    expect(source.hasAttribute('data-hhr-note-scroll')).toBe(true);
    reader.refresh(null,null);
    expect(source.getAttribute('aria-label')).toBe('Nota nativa');
    expect(source.hasAttribute('tabindex')).toBe(false);
    expect(source.hasAttribute('role')).toBe(false);
    expect(source.hasAttribute('data-hhr-note-scroll')).toBe(false);
  });

  it('opens the native summary note once and respects manual folding across refreshes and remounts', () => {
    document.body.innerHTML = `<main><div class="MuiTabs-root"><button role="tab" aria-selected="true">Resumen</button></div>
      <section id="evolution"><span class="MuiCardHeader-title">Evolución</span>
        <div class="MuiCardContent-root"><div class="MuiStack-root"><div class="MuiStack-root">
          <div class="MuiBox-root"><span class="MuiTypography-caption">Nota de prueba</span>
            <div class="MuiBox-root" id="disclosure-host"></div></div>
        </div></div></div></section>
      <div class="MuiCardContent-root"><button id="other">Leer más</button></div></main>`;
    const other = document.getElementById('other');
    const otherClicks = vi.fn();
    other.addEventListener('click', otherClicks);
    other.focus();
    const host = document.getElementById('disclosure-host');
    const mount = () => {
      const button = document.createElement('button');
      button.textContent = 'LEER MÁS';
      const click = vi.fn(() => {button.textContent = button.textContent === 'LEER MÁS' ? 'LEER MENOS' : 'LEER MÁS';});
      button.addEventListener('click', click);
      host.replaceChildren(button);
      return {button, click};
    };
    presentation = globalThis.HhrNativeFichaPresentation.create();
    presentation.refresh('1');
    const first = mount();
    for (const mode of ['off','balanced','reading']) presentation.refresh('1', mode);
    expect(first.click).not.toHaveBeenCalled();
    presentation.refresh('1'); presentation.refresh('1');
    expect(first.button.textContent).toBe('LEER MENOS');
    expect(first.click).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(other);
    const second = mount();
    presentation.refresh('1');
    expect(second.button.textContent).toBe('LEER MENOS');
    second.button.click(); presentation.refresh('1');
    expect(second.button.textContent).toBe('LEER MÁS');
    const remounted = mount();
    presentation.refresh('1');
    expect(remounted.click).not.toHaveBeenCalled();
    host.closest('section').setAttribute('role', 'dialog');
    presentation.refresh('2');
    expect(remounted.click).not.toHaveBeenCalled();
    host.closest('section').removeAttribute('role');
    presentation.refresh('2');
    expect(remounted.click).toHaveBeenCalledTimes(1);
    expect(otherClicks).not.toHaveBeenCalled();
  });

  it('widens read-only evolutions, preserves editable fields and restores native navigation attributes', () => {
    document.body.innerHTML = `<main><header class="MuiAppBar-root"><div class="MuiTabs-root"><div role="tablist">
      <button id="encounter-event-tab-summary" role="tab" aria-selected="true">Resumen</button></div></div></header>
      <div><div class="MuiGrid-container"><div class="MuiGrid-item"><span class="MuiTypography-caption">Evolución</span></div></div></div>
      <section id="observationEntrySection"><div id="evolution" class="MuiCard-root"><span class="MuiCardHeader-title">Evolución</span>
        <div class="MuiCardContent-root"><div class="MuiStack-root"><div class="MuiStack-root">
          <div class="MuiBox-root" id="read"><span class="MuiTypography-caption">Autor de prueba</span><div class="MuiBox-root">Texto de prueba</div></div>
          <div class="MuiBox-root" id="edit"><span class="MuiTypography-caption">Editor</span><div class="MuiBox-root"><textarea>Trabajo en curso</textarea></div></div>
        </div></div></div></div></section></main>`;
    presentation = globalThis.HhrNativeFichaPresentation.create(); presentation.refresh('1');
    expect(document.querySelector('#read').hasAttribute('data-hhr-evolution-block')).toBe(true);
    expect(document.querySelector('#edit').hasAttribute('data-hhr-evolution-block')).toBe(false);
    const link = document.querySelector('[data-hhr-ficha-link]');
    expect(link.getAttribute('role')).toBe('link'); expect(link.tabIndex).toBe(0);
    presentation.dispose();
    expect(document.querySelectorAll('[data-hhr-evolution-block],[data-hhr-ficha-primary]')).toHaveLength(0);
    expect(link.hasAttribute('role')).toBe(false); expect(link.hasAttribute('tabindex')).toBe(false);
    expect(document.querySelector('textarea').value).toBe('Trabajo en curso');
  });
});

it('deja a la vista las secciones vacías: no pliega ninguna ni dibuja un botón para verlas', () => {
  const ids = ['procedureEntrySection', 'diagnosisTestEntrySection', 'referralRequestEntrySection',
    'operationTheaterRequestEntrySection', 'alertEntrySection', 'procedureOrderEntrySection'];
  const bodies = ['Sin registros', 'Sin registros<button>Solicitar</button>', '<div class="MuiSkeleton-root"></div>',
    'Sin registros<p>Registro clínico</p>', 'Sin registros', 'Error al cargar'];
  document.body.innerHTML = '<main><nav></nav><div id="grid">' + ids.map((id, i) =>
    '<section id="'+id+'"><h2>Sección</h2><div>'+bodies[i]+'</div></section>').join('')+'</div></main>';
  const density = globalThis.HhrFichaSummaryDensity.create(ids);
  const row = document.querySelector('nav'), section = document.getElementById(ids[0]);
  const refresh = () => density.refresh('1', row);
  refresh(); refresh();
  expect(document.querySelectorAll('[data-hhr-ficha-folded]')).toHaveLength(0);
  expect(row.children).toHaveLength(0);
  density.refresh('2', row);
  section.lastChild.textContent = 'Nuevo procedimiento';
  refresh();
  expect(document.querySelectorAll('[data-hhr-ficha-folded]')).toHaveLength(0);
  expect(row.children).toHaveLength(0);
  expect(document.querySelector('#grid').hasAttribute('data-hhr-ficha-summary-grid')).toBe(true);
  density.clear();
  expect(document.querySelector('[data-hhr-ficha-summary-grid]')).toBeNull();
});

it('reclasifica cuadros al editar o agregar registros y solo cuenta filas visibles en una tabla simple', () => {
  document.body.innerHTML = '<main><nav></nav><div><section id="diagnosisEntrySection"><h2>Diagnóstico</h2><p>Dato breve</p></section>' +
    '<section id="medicationEntrySection"><h2>Fármacos</h2><table><tbody><tr><td>A</td><td>B</td></tr></tbody></table></section></div></main>';
  const density = globalThis.HhrFichaSummaryDensity.create(['diagnosisEntrySection','medicationEntrySection']);
  const refresh = () => density.refresh('1',document.querySelector('nav'));
  const diagnosis = document.querySelector('#diagnosisEntrySection'), meds = document.querySelector('#medicationEntrySection');
  const title = meds.querySelector('h2');
  refresh();
  expect(diagnosis.dataset.hhrFichaSummaryCard).toBe('brief');
  expect(meds.dataset.hhrFichaSummaryCard).toBe('wide');
  expect(title.dataset.hhrVisibleMedications).toBe('1');
  diagnosis.insertAdjacentHTML('beforeend','<p>Otro dato</p>');
  meds.querySelector('tr').hidden = true;
  refresh();
  expect(diagnosis.dataset.hhrFichaSummaryCard).toBe('regular');
  expect(title.hasAttribute('data-hhr-visible-medications')).toBe(false);
  diagnosis.lastElementChild.remove();
  diagnosis.insertAdjacentHTML('beforeend','<button>Editar</button>');
  refresh();
  expect(diagnosis.dataset.hhrFichaSummaryCard).toBe('regular');
  density.clear();
  expect(diagnosis.hasAttribute('data-hhr-ficha-summary-card')).toBe(false);
});

it('no pliega dispositivos invasivos ni su enlace, con la tabla vacía o con datos', () => {
  document.body.innerHTML = '<main><nav><div class="MuiGrid-item"><span data-hhr-ficha-link="invasiveDeviceEntry">Dispositivos invasivos</span></div></nav>' +
    '<section id="invasiveDeviceEntry"><h2>Dispositivos invasivos</h2><table><thead><tr><th>Tipo</th></tr></thead>' +
    '<tbody><tr><td>Sin dispositivos invasivos</td></tr></tbody></table></section></main>';
  const density = globalThis.HhrFichaSummaryDensity.create(['invasiveDeviceEntry']);
  const nav = document.querySelector('nav'), section = document.querySelector('section');
  const folded = () => [section, nav.firstElementChild].map(el => el.hasAttribute('data-hhr-ficha-folded'));
  density.refresh('1', nav);
  expect(folded()).toEqual([false,false]);
  section.insertAdjacentHTML('beforeend','<button>Registrar</button>');
  density.refresh('1', nav);
  expect(folded()).toEqual([false,false]);
  section.lastElementChild.remove();
  section.querySelector('td').textContent = 'Dispositivo de prueba';
  density.refresh('1', nav);
  expect(folded()).toEqual([false,false]);
  density.clear();
});

it('conserva unidad y fecha por signo, recupera la tabla ante ambigüedad y limpia el episodio', () => {
  document.body.innerHTML = '<section><table><thead><tr><th>Fecha y hora</th><th>PA (mmHg)</th><th>FC (lpm)</th><th>FR (rpm)</th><th>SpO2 (%)</th><th>Temperatura (°C)</th></tr></thead>' +
    '<tbody><tr><td>25-11-2026 09:00</td><td>120/80</td><td></td><td>16</td><td>98</td><td>36,5</td></tr>' +
    '<tr><td>24-11-2026 23:45</td><td>118/76</td><td>70</td><td></td><td></td><td></td></tr></tbody></table></section>';
  const section = document.querySelector('section'), table = section.querySelector('table');
  const strip = globalThis.HhrFichaVitalStrip.create();
  strip.refresh(section);
  expect([...section.querySelectorAll('dd')].map(el => el.textContent)).toEqual([
    '120/80 mmHg25-11-2026 09:00','70 lpm24-11-2026 23:45','16 rpm25-11-2026 09:00',
    '98 %25-11-2026 09:00','36,5 °C25-11-2026 09:00',
  ]);
  const button = section.querySelector('button');
  button.click(); strip.refresh(section);
  expect(section.querySelector('button')).toBe(button);
  expect(table.hasAttribute('data-hhr-vital-detail-folded')).toBe(false);
  table.tBodies[0].rows[1].cells[0].textContent = '23:45';
  strip.refresh(section);
  expect(section.querySelector('dl')).toBeNull();
  expect(table.hasAttribute('data-hhr-vital-detail-folded')).toBe(false);
  strip.clear();
  expect(section.children).toHaveLength(1);
});

it('distingue un aviso de permiso de una sección vacía y vuelve al formato nativo al desactivar', () => {
  document.body.innerHTML = '<main><div class="MuiTabs-root"><button role="tab" aria-selected="true">Resumen</button></div>' +
    '<section><h3>Alergias</h3><p>No tiene permiso para visualizar</p></section>' +
    '<section><h3>Procedimientos</h3><p>No se presentan procedimientos registrados para este paciente</p></section>' +
    '<section><h3>Prestaciones</h3><p>No se presentan prestaciones registradas</p><button>Agregar</button></section></main>';
  presentation = globalThis.HhrNativeFichaPresentation.create();
  presentation.refresh('1','compact');
  expect(document.querySelectorAll('[data-hhr-reading="status-card"]')).toHaveLength(2);
  expect(document.querySelector('[data-hhr-ficha-folded]')).toBeNull();
  const message = document.querySelector('section:nth-of-type(2) p');
  message.textContent = 'Procedimiento registrado';
  presentation.refresh('1','compact');
  expect(message.hasAttribute('data-hhr-reading')).toBe(false);
  presentation.refresh('1','off');
  expect(document.querySelector('[data-hhr-ficha-theme],[data-hhr-reading],[data-hhr-ficha-primary]')).toBeNull();
  expect(document.querySelector('section p').textContent).toBe('No tiene permiso para visualizar');
});
