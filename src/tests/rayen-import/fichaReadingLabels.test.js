// @vitest-environment jsdom
import { expect, it } from 'vitest';
import '../../../extension/hhr-ficha-reading-labels.js';

it('abrevia la fecha de origen y omite únicamente el cargo reconocido', () => {
  const { stamp } = globalThis.HhrFichaReadingLabels;
  expect(stamp('Última actualización: 15-04-2026, 09:12:35, Enfermera(o) Autora Ejemplo')).toBe('15-04-2026 · 09:12 · Autora Ejemplo');
  expect(stamp('Última actualización: 15-04-2026, 09:12 - Profesional Ejemplo')).toBe('15-04-2026 · 09:12 · Profesional Ejemplo');
  expect(stamp('Última actualización: 15-04-2026, 11:19:48, Kinesiólogo(a) Autor Ejemplo')).toBe('15-04-2026 · 11:19 · Autor Ejemplo');
  expect(stamp('Última actualización: 15-04-2026 7:30:54, Paramédico Autor Ejemplo')).toBe('15-04-2026 · 07:30 · Autor Ejemplo');
  expect(stamp('Cambio de evolución, 09:12:35')).toBeNull();
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
