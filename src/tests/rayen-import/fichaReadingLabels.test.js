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
