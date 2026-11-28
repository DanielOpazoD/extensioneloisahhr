// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../extension/ficha/hhr-ficha-reading-labels.js';

it('abrevia la fecha de origen y omite únicamente el cargo reconocido', () => {
  const { stamp } = globalThis.HhrFichaReadingLabels;
  expect(stamp('Última actualización: 15-04-2026, 09:12:35, Enfermera(o) Autora Ejemplo')).toBe('15-04-2026 · 09:12 · Autora Ejemplo');
  expect(stamp('Última actualización: 15-04-2026, 09:12 - Profesional Ejemplo')).toBe('15-04-2026 · 09:12 · Profesional Ejemplo');
  expect(stamp('Última actualización: 15-04-2026, 11:19:48, Kinesiólogo(a) Autor Ejemplo')).toBe('15-04-2026 · 11:19 · Autor Ejemplo');
  expect(stamp('Última actualización: 15-04-2026 7:30:54, Paramédico Autor Ejemplo')).toBe('15-04-2026 · 07:30 · Autor Ejemplo');
  expect(stamp('Cambio de evolución, 09:12:35')).toBeNull();
});

it('dice una sola vez la firma de la fila diaria y la de las tarjetas de indicaciones consecutivas', () => {
  const stamp = 'Última actualización: 15-04-2026, 09:12:35, Médico Tomás Ejemplo';
  const card = (id, text, cardId = '') => '<section id="' + id + '"><div ' + cardId + ' class="MuiCard-root"><div class="MuiCardHeader-root">' +
    '<div class="MuiCardHeader-content"><span class="MuiCardHeader-title">Sección</span>' +
    '<span class="MuiCardHeader-subheader">' + text + '</span></div></div></div></section>';
  const main = document.createElement('main');
  const dailyText = 'Última actualización: 15-04-2026, 09:12 - Tomás Ejemplo';
  main.innerHTML = '<div class="MuiGrid-item"><p class="MuiTypography-body2">' + dailyText + '</p></div>' +
    '<div class="MuiGrid-item"><p class="MuiTypography-body2">' + dailyText + '</p><div><form><input type="text"><button>Imprimir</button></form></div></div>' +
    card('observationEntrySection', stamp, 'id="evolution"') + card('medicationEntrySection', stamp) +
    card('freeIndicationEntrySection', stamp) + card('procedureOrderEntrySection', stamp.replace('09:12:35', '09:12:36'));
  document.body.append(main);
  // jsdom paints nothing: a card counts as painted unless its own styles hide it.
  vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(function () {
    return this.closest('[style*="display: none"]') ? [] : [{width:10, height:10}];
  });
  const [decoy, daily] = main.querySelectorAll('p');
  const [note, medication, free, orders] = main.querySelectorAll('.MuiCardHeader-subheader');
  const repeat = el => el.getAttribute('data-hhr-update-repeat');
  orders.title = 'Nombre nativo';
  const labels = globalThis.HhrFichaReadingLabels.create();
  try {
    labels.refresh(main);
    expect([daily, note, medication, free, orders].map(repeat)).toEqual(['note', null, null, 'above', null]);
    // Only the row with the date field is the daily row.
    expect(repeat(decoy)).toBeNull();
    expect(free.title).toBe('15-04-2026 · 09:12 · Tomás Ejemplo');
    expect(free.textContent).toBe(stamp);
    // A different second is a different act, even when the visible label is the same.
    expect(orders.dataset.hhrUpdateLabel).toBe(free.dataset.hhrUpdateLabel);

    // A copy hidden by its own styles is not the card above: its byline must not stand in
    // for the one the reader sees.
    const other = stamp.replace('Tomás', 'Elena');
    free.textContent = other;
    orders.textContent = other;
    free.closest('section').style.display = 'none';
    labels.refresh(main);
    expect([medication, free, orders].map(repeat)).toEqual([null, null, null]);
    free.closest('section').style.display = '';
    labels.refresh(main);
    expect([medication, free, orders].map(repeat)).toEqual([null, null, 'above']);
    free.textContent = stamp;
    orders.textContent = stamp;
    // A hidden note does not make the daily byline redundant.
    note.closest('section').style.display = 'none';
    labels.refresh(main);
    expect(repeat(daily)).toBeNull();
    note.closest('section').style.display = '';
    labels.refresh(main);
    expect(repeat(daily)).toBe('note');

    // Another professional updated the summary after the note: the daily row keeps its byline.
    daily.textContent = 'Última actualización: 15-04-2026, 11:30 - Elena Ejemplo';
    medication.textContent = stamp.replace('Tomás', 'Elena');
    labels.refresh(main);
    expect([daily, medication, free, orders].map(repeat)).toEqual([null, null, null, 'above']);
    labels.clear();
    expect(main.querySelector('[data-hhr-update-repeat],[data-hhr-update-label]')).toBeNull();
    expect([free.hasAttribute('title'), orders.title]).toEqual([false, 'Nombre nativo']);
  } finally {
    labels.clear();
    main.remove();
    vi.restoreAllMocks();
  }
});

it('conserva el botón nativo y actualiza su presentación cuando cambia la acción', () => {
  const main = document.createElement('main');
  main.innerHTML = '<div class="MuiCardContent-root"><button>Leer menos</button></div>';
  const button = main.querySelector('button');
  const labels = globalThis.HhrFichaReadingLabels.create();
  labels.refresh(main);
  expect(button.dataset.hhrNoteDisclosure).toBe('less');
  button.textContent = 'Leer más';
  labels.refresh(main);
  expect(button.dataset.hhrNoteDisclosure).toBe('more');
  labels.clear();
  expect(button.hasAttribute('data-hhr-note-disclosure')).toBe(false);
  expect(main.querySelector('button')).toBe(button);
});

it('ajusta solo la presentación de Mostrar suspendidos en el resumen y conserva sus controles', () => {
  const main = document.createElement('main');
  main.innerHTML = '<section><label><input type="checkbox" checked><span>Mostrar Suspendidos</span></label></section>' +
    '<section><label><input type="checkbox">Mostrar suspendidos</label><label><input type="checkbox">Otra opción</label></section>' +
    '<dialog><label><input type="checkbox">Mostrar suspendidos</label></dialog>';
  const labels = globalThis.HhrFichaReadingLabels.create();
  labels.refresh(main);
  const matches = main.querySelectorAll('[data-hhr-reading-toggle="suspended"]');
  expect(matches).toHaveLength(2);
  expect(matches[0].querySelector('input').checked).toBe(true);
  matches[0].click();
  expect(matches[0].querySelector('input').checked).toBe(false);
  matches[1].lastChild.textContent = 'Otra opción';
  labels.refresh(main);
  expect(matches[1].hasAttribute('data-hhr-reading-toggle')).toBe(false);
  labels.clear();
  expect(main.querySelector('[data-hhr-reading-toggle="suspended"]')).toBeNull();
});

it('mantiene los interruptores de cada alerta con el mismo foco, orden y estado', () => {
  const main = document.createElement('main');
  const flags = '<label><input type="checkbox" disabled>No reanimación</label><label><input type="checkbox" checked>Gestión de Visitas</label>';
  main.innerHTML = '<section id="alertEntrySection"><div class="MuiStack-root">' + flags + '</div><p>Alerta de prueba</p></section>' +
    '<dialog>' + flags + '</dialog><aside>' + flags + '</aside>';
  document.body.append(main);
  const labels = globalThis.HhrFichaReadingLabels.create();
  const visit = main.querySelector('input:checked');
  visit.focus();
  labels.refresh(main);
  expect(main.querySelectorAll('[data-hhr-reading-toggle="alert"]')).toHaveLength(2);
  expect(document.activeElement).toBe(visit);
  expect(main.querySelector('input:disabled').checked).toBe(false);
  expect(visit.checked).toBe(true);
  expect(visit.closest('label').hasAttribute('data-hhr-reading-toggle')).toBe(true);
  // The owner asked for the summary without «Gestión de Visitas»: it is marked to be left out of sight.
  expect([...main.querySelectorAll('[data-hhr-visits-toggle]')].map(label => label.textContent)).toEqual(['Gestión de Visitas']);
  labels.clear();
  expect(main.querySelector('[data-hhr-reading-toggle="alert"]')).toBeNull();
  main.remove();
});

it('distingue los destinos nativos, conserva borradores y restaura las etiquetas de Eloísa', () => {
  const main = document.createElement('main');
  main.innerHTML = `<section id="shiftChangeEntrySection"><h3>Observaciones de entrega de turno</h3>
    <form><input aria-label="Observaciones" placeholder="Observaciones"><button disabled>Agregar</button></form></section>
    <section id="alertEntrySection"><form><label><input type="checkbox">No reanimación</label>
    <label><input type="checkbox" checked>Gestión de visitas</label><div><div>
    <label id="native-label" for="entry">Observaciones</label><textarea id="entry" aria-labelledby="native-label"></textarea>
    <textarea aria-hidden="true"></textarea></div><button type="button" aria-label="Agregar">Agregar</button></div></form>
    <dialog><input placeholder="Observaciones"><button>Agregar</button></dialog></section>`;
  document.body.append(main);
  const handoff = main.querySelector('#shiftChangeEntrySection input');
  const field = main.querySelector('#entry');
  const button = main.querySelector('#alertEntrySection form button');
  const labels = globalThis.HhrFichaReadingLabels.create();
  handoff.value = 'Borrador de entrega';
  field.value = 'Borrador de alerta';
  field.focus();
  labels.refresh(main);
  expect(handoff.getAttribute('aria-label')).toBe('Observación de entrega');
  expect(handoff.placeholder).toBe('Escribir entrega…');
  expect(main.querySelector('button:disabled').getAttribute('aria-label')).toBe('Agregar a entrega');
  expect(field.getAttribute('aria-label')).toBe('Nueva alerta');
  expect(field.hasAttribute('aria-labelledby')).toBe(false);
  expect(button.getAttribute('aria-label')).toBe('Agregar alerta');
  expect(main.querySelector('[data-hhr-entry-prompt]').contains(field)).toBe(true);
  expect(main.querySelectorAll('[data-hhr-resuscitation-toggle]')).toHaveLength(1);
  expect(main.querySelector('dialog button').hasAttribute('aria-label')).toBe(false);
  const observer = new MutationObserver(() => {});
  observer.observe(main, {subtree:true,childList:true,attributes:true,characterData:true});
  labels.refresh(main);
  expect(observer.takeRecords()).toHaveLength(0);
  observer.disconnect();
  labels.clear();
  expect(field.getAttribute('aria-labelledby')).toBe('native-label');
  expect(field.hasAttribute('aria-label')).toBe(false);
  expect(button.getAttribute('aria-label')).toBe('Agregar');
  expect(handoff.getAttribute('aria-label')).toBe('Observaciones');
  expect(handoff.placeholder).toBe('Observaciones');
  expect(main.querySelector('[data-hhr-entry-prompt],[data-hhr-entry-suffix],[data-hhr-resuscitation-toggle]')).toBeNull();
  expect(document.activeElement).toBe(field);
  expect([field.value,handoff.value]).toEqual(['Borrador de alerta','Borrador de entrega']);
  main.remove();
});

it('descarta una asociación ambigua o una acción que Eloísa acaba de reemplazar', () => {
  const main = document.createElement('main');
  main.innerHTML = '<section id="alertEntrySection"><form><input placeholder="Observaciones"><button>Agregar</button></form></section>';
  const labels = globalThis.HhrFichaReadingLabels.create();
  const form = main.querySelector('form'), button = form.querySelector('button');
  labels.refresh(main);
  expect(button.dataset.hhrEntrySuffix).toBe('alerta');
  form.append(document.createElement('textarea'));
  labels.refresh(main);
  expect(button.hasAttribute('data-hhr-entry-suffix')).toBe(false);
  expect(button.hasAttribute('aria-label')).toBe(false);
  form.lastChild.remove();
  labels.refresh(main);
  button.textContent = 'Cancelar';
  button.setAttribute('aria-label','Cancelar edición');
  labels.refresh(main);
  expect(button.getAttribute('aria-label')).toBe('Cancelar edición');
  form.querySelector('input').placeholder = 'Otro dato';
  button.textContent = 'Agregar';
  labels.refresh(main);
  expect(button.hasAttribute('data-hhr-entry-suffix')).toBe(false);
});

it.each([
  ['aria-label en el campo', '<input aria-label="Motivo para anular la alerta" placeholder="Observaciones">', '<button>Agregar</button>'],
  ['aria-labelledby en el campo', '<span id="reason">Motivo para anular la alerta</span><input aria-labelledby="reason" placeholder="Observaciones">', '<button>Agregar</button>'],
  ['label asociado al campo', '<label for="reason">Motivo para anular la alerta</label><input id="reason" placeholder="Observaciones">', '<button>Agregar</button>'],
  ['aria-label en el botón', '<input placeholder="Observaciones">', '<button aria-label="Agregar motivo">Agregar</button>'],
  ['aria-labelledby en el botón', '<input placeholder="Observaciones">', '<span id="reason">Agregar motivo</span><button aria-labelledby="reason">Agregar</button>'],
  ['referencia sin resolver', '<input aria-labelledby="etiqueta-aun-no-cargada" placeholder="Observaciones">', '<button>Agregar</button>'],
])('respeta el destino específico de Eloísa cuando hay %s', (_scenario, field, button) => {
  const main = document.createElement('main');
  main.innerHTML = '<section id="alertEntrySection"><form>' + field + button + '</form></section>';
  document.body.append(main);
  const original = main.innerHTML;
  const labels = globalThis.HhrFichaReadingLabels.create();
  labels.refresh(main);
  expect(main.innerHTML).toBe(original);
  labels.clear();
  main.remove();
});

describe('acción breve de los formularios de escritorio', () => {
  let main, labels, section, field, row, action, outside;
  const selector = '[data-hhr-entry-open]';
  const folded = 'data-hhr-entry-folded';
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({matches:true}));
    main = document.createElement('main');
    main.innerHTML = `<section id="alertEntrySection"><p>Aviso recibido</p><form>
      <label><input type="checkbox" checked>No reanimación</label>
      <label><input type="checkbox">Gestión de visitas</label>
      <div><div><textarea placeholder="Observaciones"></textarea></div><button disabled>Agregar</button></div>
      </form></section><section id="shiftChangeEntrySection"><p>Entrega recibida</p>
      <form><input placeholder="Observaciones"><button disabled>Agregar</button></form></section><button>Continuar</button>`;
    document.body.append(main);
    labels = globalThis.HhrFichaReadingLabels.create();
    section = main.querySelector('#alertEntrySection');
    action = section.querySelector('button');
    field = section.querySelector('textarea');
    row = action.parentElement;
    outside = main.lastElementChild;
  });
  afterEach(() => { labels.clear(); main.remove(); vi.unstubAllGlobals(); });

  it('abre el campo nativo sin enviar, deja los avisos e interruptores fuera y repliega solo al salir sin texto', async () => {
    labels.refresh(main, 'a');
    const opener = section.querySelector(selector);
    expect([...main.querySelectorAll(selector)].map(el => el.textContent)).toEqual(['Agregar alerta','Agregar observación']);
    expect(opener.type).toBe('button');
    expect(opener.getAttribute('aria-controls')).toBe(row.id);
    expect(row.hasAttribute(folded)).toBe(true);
    expect(main.querySelectorAll('p, label')).toHaveLength(4);
    expect(main.querySelectorAll('[data-hhr-entry-folded] :is(p,label,input[type=checkbox])')).toHaveLength(0);
    const submitted = vi.fn(event => event.preventDefault());
    action.form.addEventListener('submit', submitted);
    const parentClick = vi.fn();
    action.form.addEventListener('click', parentClick);
    opener.click();
    expect(document.activeElement).toBe(field);
    expect(submitted).not.toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
    expect(row.hasAttribute(folded)).toBe(false);
    field.value = '   ';
    field.dispatchEvent(new Event('input', {bubbles:true}));
    outside.focus();
    await Promise.resolve();
    expect(row.hasAttribute(folded)).toBe(false);
    expect(field.value).toBe('   ');
    field.focus();
    field.value = '';
    field.dispatchEvent(new Event('input', {bubbles:true}));
    expect(row.hasAttribute(folded)).toBe(false);
    outside.focus();
    await Promise.resolve();
    expect(row.hasAttribute(folded)).toBe(true);
    expect(document.activeElement).toBe(outside);
    opener.click();
    field.value = 'Nueva observación';
    action.disabled = false;
    action.click();
    expect(submitted).toHaveBeenCalledTimes(1);
    expect(submitted.mock.calls[0][0].submitter).toBe(action);
    expect(section.querySelector('input[type=checkbox]').checked).toBe(true);
  });

  it('pliega el campo de alerta aunque Eloísa le dé el foco al abrir el resumen y suelta ese foco', async () => {
    field.focus();
    labels.refresh(main, 'a');
    expect(row.hasAttribute(folded)).toBe(true);
    expect(document.activeElement).not.toBe(field);
    // Through the opener the field opens with the focus, and stays open while it has it.
    section.querySelector(selector).click();
    expect([row.hasAttribute(folded), document.activeElement]).toEqual([false, field]);
    labels.refresh(main, 'a');
    expect([row.hasAttribute(folded), document.activeElement]).toEqual([false, field]);
    outside.focus();
    await Promise.resolve();
    expect(row.hasAttribute(folded)).toBe(true);
    // A focus the page gives again to the folded field is let go as well.
    field.focus();
    expect([row.hasAttribute(folded), document.activeElement === field]).toEqual([true, false]);
    // A draft Eloísa restores opens the editor, wherever the focus is.
    field.value = 'Borrador';
    labels.refresh(main, 'a');
    expect(row.hasAttribute(folded)).toBe(false);
  });

  it('respeta el foco de quien ya escribía al volver de una ventana estrecha y lo suelta al cambiar de paciente', () => {
    labels.refresh(main, 'a');
    section.querySelector(selector).click();
    vi.stubGlobal('matchMedia', () => ({matches:false}));
    labels.refresh(main, 'a');
    expect(document.activeElement).toBe(field);
    // The editor comes back in the same summary with the person's focus inside: it stays open.
    vi.stubGlobal('matchMedia', () => ({matches:true}));
    labels.refresh(main, 'a');
    expect([row.hasAttribute(folded), document.activeElement]).toEqual([false, field]);
    // The summary of another patient opens with the field focused, as Eloísa does: that focus is let go.
    labels.refresh(main, 'b');
    expect(row.hasAttribute(folded)).toBe(true);
    expect(document.activeElement).not.toBe(field);
  });

  it('no suelta el foco de quien borra un borrador que ya escribía antes de plegarse el campo', () => {
    field.value = 'Borrador';
    field.focus();
    labels.refresh(main, 'a');
    expect([row.hasAttribute(folded), document.activeElement]).toEqual([false, field]);
    field.value = '';
    field.dispatchEvent(new Event('input', {bubbles:true}));
    expect([row.hasAttribute(folded), document.activeElement]).toEqual([false, field]);
  });

  it('conserva borrador y foco al cambiar tamaño, modo o paciente y limpia los controles anteriores', () => {
    labels.refresh(main, 'a');
    const opener = section.querySelector(selector);
    opener.focus();
    vi.stubGlobal('matchMedia', () => ({matches:false}));
    labels.refresh(main, 'a');
    expect(document.activeElement).toBe(field);
    expect(main.querySelector(selector)).toBeNull();
    expect(row.id).toBe('');
    vi.stubGlobal('matchMedia', () => ({matches:true}));
    row.id = 'editor-nativo';
    field.value = 'Borrador previo';
    labels.refresh(main, 'a');
    expect(section.querySelector(selector).getAttribute('aria-controls')).toBe('editor-nativo');
    expect(row.hasAttribute(folded)).toBe(false);
    const stale = section.querySelector(selector);
    labels.refresh(main, 'b');
    expect(stale.isConnected).toBe(false);
    outside.focus();
    stale.click();
    expect(document.activeElement).toBe(outside);
    labels.clear();
    expect(main.querySelector('[data-hhr-entry-open],[data-hhr-entry-folded],[data-hhr-entry-field]')).toBeNull();
    expect(row.id).toBe('editor-nativo');
    expect(field.value).toBe('Borrador previo');
  });

  it('reconoce cambios de estado nativos sin reescribir el DOM en refrescos idénticos', async () => {
    labels.refresh(main, 'a');
    const mutations = new MutationObserver(() => {});
    mutations.observe(main, {childList:true,subtree:true,attributes:true});
    labels.refresh(main, 'a');
    expect(mutations.takeRecords()).toHaveLength(0);
    mutations.disconnect();
    field.setAttribute('aria-invalid','true');
    await Promise.resolve();
    expect(section.querySelector(selector)).toBeNull();
    expect(row.hasAttribute(folded)).toBe(false);
    field.removeAttribute('aria-invalid');
    await Promise.resolve();
    expect(row.hasAttribute(folded)).toBe(true);
    row.insertAdjacentHTML('afterbegin','<p role="status">Guardando…</p>');
    await Promise.resolve();
    expect(section.querySelector(selector)).toBeNull();
    expect(action.isConnected).toBe(true);
  });

  it('reconoce una pareja MUI sin form con label asociado y restaura el placeholder ausente', () => {
    section.innerHTML = `<div class="MuiStack-root"><label><input type="checkbox">No reanimación</label>
      <div class="MuiStack-root"><div class="MuiFormControl-root"><label for="new-alert">Observaciones</label>
        <div class="MuiInputBase-root"><input id="new-alert"><fieldset class="MuiOutlinedInput-notchedOutline" aria-hidden="true">
        <legend><span>Observaciones</span></legend></fieldset></div></div><button disabled>Agregar</button></div></div>`;
    const native = section.querySelector('#new-alert');
    labels.refresh(main, 'a');
    const opener = section.querySelector(selector);
    expect(opener).toBeTruthy();
    expect(native.form).toBeNull();
    expect(native.placeholder).toBe('Escribir alerta…');
    expect(native.closest('[data-hhr-entry-folded]')).toBe(opener.nextElementSibling);
    expect(section.querySelector('input[type=checkbox]').closest('[data-hhr-entry-folded]')).toBeNull();
    opener.click();
    expect(document.activeElement).toBe(native);
    labels.clear();
    expect(native.hasAttribute('placeholder')).toBe(false);
    expect(native.labels[0].textContent).toBe('Observaciones');
    expect(document.activeElement).toBe(native);
  });

  it.each([
    ['un campo sin nombre', '<input>', 'MuiStack-root'],
    ['un contenedor sin reconocer', '<input aria-label="Observaciones">', ''],
    ['un campo con otra finalidad', '<input aria-label="Motivo de consulta">', 'MuiBox-root'],
  ])('conserva una pareja sin form que tiene %s', (_reason, input, wrapper) => {
    section.innerHTML = '<div class="' + wrapper + '">' + input + '<button disabled>Agregar</button></div>';
    labels.refresh(main, 'a');
    expect(section.querySelector(selector)).toBeNull();
    expect(section.querySelector('input').hasAttribute('placeholder')).toBe(false);
  });

  it.each([
    ['mensaje recibido dentro de la fila', () => field.before('Entrega recibida')],
    ['control adicional en el formulario', () => row.after(document.createElement('select'))],
    ['botón de cancelación nativo', () => { action.textContent = 'Cancelar'; }],
    ['campo de solo lectura', () => { field.readOnly = true; }],
    ['carga en la sección', () => { section.setAttribute('aria-busy', 'true'); }],
    ['indicador de error', () => { row.insertAdjacentHTML('afterend', '<p role="alert">Revisar observación</p>'); }],
  ])('mantiene el formulario visible ante %s', (_label, change) => {
    change();
    labels.refresh(main, 'a');
    expect(row.hasAttribute(folded)).toBe(false);
    expect(section.querySelector(selector)).toBeNull();
    expect(action.form).toBe(field.form);
  });
});

it('dice qué imprime el icono de la fila diaria y el del recetón, sin cambiar su nombre', () => {
  const printer = name => `<button class="MuiIconButton-root"><svg data-testid="LocalPrintshopRoundedIcon" aria-label="${name}"></svg></button>`;
  const main = document.createElement('main');
  main.innerHTML = '<div class="MuiGrid-item"><p class="MuiTypography-body2">Última actualización: 15-04-2026, 09:12 - Tomás Ejemplo</p>' +
    `<div class="MuiStack-root"><form><input type="text"><button type="submit">Imprimir</button></form><hr class="MuiDivider-vertical">${printer('Imprimir')}</div></div>` +
    `<section id="medicationEntrySection"><div class="MuiCard-root"><div class="MuiCardHeader-root"><div class="MuiCardHeader-action"><div class="MuiStack-root">${printer('Imprimir recetón')}</div></div></div></div></section>` +
    `<section id="freeIndicationEntrySection"><div class="MuiCardHeader-action"><div class="MuiStack-root">${printer('Imprimir recetón')}</div></div></section>`;
  document.body.append(main);
  const labels = globalThis.HhrFichaReadingLabels.create();
  try {
    labels.refresh(main);
    const buttons = [...main.querySelectorAll('.MuiIconButton-root')];
    expect(buttons.map(button => button.getAttribute('data-hhr-print-caption'))).toEqual(['Evolución', 'Imprimir recetón', null]);
    expect(buttons.map(button => button.hasAttribute('aria-label') || button.hasAttribute('title'))).toEqual([false, false, false]);
    labels.clear();
    expect(main.querySelectorAll('[data-hhr-print-caption]')).toHaveLength(0);
  } finally {
    labels.clear();
    main.remove();
  }
});

it('guarda tras un icono el filtro de Balance Hídrico sin registros y lo devuelve al haber registros', () => {
  const main = document.createElement('main');
  const sentence = '<p class="MuiTypography-root">No se presentan registros de balance hídrico para este paciente</p>';
  main.innerHTML = '<section id="inputOutputHydricBalanceEntrySection"><div class="MuiCard-root"><div class="MuiCardHeader-root"></div>' +
    `<div class="MuiCardContent-root"><div class="MuiStack-root"><input type="text"><button type="button">Filtrar</button></div>${sentence}</div></div></section>`;
  document.body.append(main);
  const labels = globalThis.HhrFichaReadingLabels.create();
  try {
    labels.refresh(main);
    const content = main.querySelector('.MuiCardContent-root'), filters = content.querySelector('.MuiStack-root');
    const opener = content.querySelector('button[data-hhr-balance-filter]');
    // Before the sentence: Eloísa's sentence stays the last child of its card.
    expect([...content.children].map(el => el.tagName)).toEqual(['DIV', 'BUTTON', 'P']);
    expect([opener.getAttribute('aria-label'), opener.getAttribute('aria-expanded'), opener.getAttribute('aria-controls')]).toEqual(['Filtrar otro periodo', 'false', filters.id]);
    expect(filters.hasAttribute('data-hhr-balance-folded')).toBe(true);
    opener.click();
    expect([opener.getAttribute('aria-expanded'), filters.hasAttribute('data-hhr-balance-folded'), document.activeElement]).toEqual(['true', false, filters.querySelector('input')]);
    // A refresh keeps it open and writes nothing.
    const mutations = new MutationObserver(() => {});
    mutations.observe(main, {childList:true, subtree:true, attributes:true});
    labels.refresh(main);
    expect(mutations.takeRecords()).toHaveLength(0);
    mutations.disconnect();
    opener.click();
    expect(filters.hasAttribute('data-hhr-balance-folded')).toBe(true);
    // With records, the filter is Eloísa's again.
    content.querySelector('p').textContent = 'Ingresos 1200 mL';
    labels.refresh(main);
    expect(content.querySelector('[data-hhr-balance-filter]')).toBeNull();
    expect([filters.hasAttribute('data-hhr-balance-folded'), filters.hasAttribute('id')]).toEqual([false, false]);
  } finally {
    labels.clear();
    main.remove();
  }
});

it('lee la PAM como número entero y el autor de una alerta sin su cargo', () => {
  const main = document.createElement('main');
  main.innerHTML = '<div data-hhr-reading="vital-pam"><p>PAM:</p><p>87.50</p></div><div data-hhr-reading="vital-pam"><p>PAM:</p><p>90</p></div>' +
    '<section id="alertEntrySection"><div class="MuiCardContent-root"><div class="MuiBox-root"><div class="MuiStack-root"><div class="MuiStack-root">' +
    '<p class="MuiTypography-body2">Enfermera(o) Elena  Ejemplo</p></div></div></div></div></section>';
  document.body.append(main);
  const labels = globalThis.HhrFichaReadingLabels.create();
  try {
    labels.refresh(main);
    expect([...main.querySelectorAll('[data-hhr-reading="vital-pam"] p:last-child')].map(p => p.getAttribute('data-hhr-vital-rounded'))).toEqual(['88', null]);
    expect(main.querySelector('#alertEntrySection p').getAttribute('data-hhr-author')).toBe('Elena Ejemplo');
    labels.clear();
    expect(main.querySelectorAll('[data-hhr-vital-rounded],[data-hhr-author]')).toHaveLength(0);
  } finally {
    labels.clear();
    main.remove();
  }
});
