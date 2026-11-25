// @vitest-environment jsdom
import { expect, it } from 'vitest';
import '../../../extension/hhr-ficha-reading-labels.js';

it('abrevia la fecha de origen y omite únicamente el cargo reconocido', () => {
  const { stamp } = globalThis.HhrFichaReadingLabels;
  expect(stamp('Última actualización: 15-04-2026, 09:12:35, Enfermera(o) Autora Ejemplo')).toBe('15-04-2026 · 09:12 · Autora Ejemplo');
  expect(stamp('Última actualización: 15-04-2026, 09:12 - Profesional Ejemplo')).toBe('15-04-2026 · 09:12 · Profesional Ejemplo');
  expect(stamp('Última actualización: 15-04-2026, 11:19:48, Kinesiólogo(a) Autor Ejemplo')).toBe('15-04-2026 · 11:19 · Autor Ejemplo');
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
