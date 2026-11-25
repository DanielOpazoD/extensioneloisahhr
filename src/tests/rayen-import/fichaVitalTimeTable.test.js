// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import '../../../extension/hhr-ficha-vital-strip.js';

afterEach(() => {
  document.body.replaceChildren();
  delete document.documentElement.dataset.hhrFichaTheme;
});

function attributedTable() {
  document.documentElement.dataset.hhrFichaTheme = 'compact';
  document.body.innerHTML = '<section><p>Última actualización: Profesional de cabecera</p><table><thead><tr>' +
    '<th>Signo</th><th>Valor</th><th>Fecha y hora</th><th>Registrado por</th></tr></thead><tbody>' +
    '<tr><td>FC</td><td>75</td><td>24-11-2026 23:59</td><td>Profesional uno</td></tr>' +
    '<tr><td>FR</td><td>16</td><td>25-11-2026 00:08</td><td>Profesional dos</td></tr>' +
    '</tbody></table></section>';
  // jsdom does not lay out elements. CSS-based visibility is exercised in the Chromium smoke.
  for (const cell of document.querySelectorAll('td')) cell.checkVisibility = () => true;
  return document.querySelector('section');
}

it('destaca la fecha anterior en su fila nativa conservando profesionales y controles', () => {
  const section = attributedTable(), table = section.querySelector('table'), rows = table.tBodies[0].rows;
  const strip = globalThis.HhrFichaVitalStrip.create();
  strip.refresh(section);
  expect([...section.querySelectorAll('[data-hhr-vital-older]')]).toEqual([rows[0].cells[2]]);
  expect(section.querySelector('dl,.hhr-ficha-vitals')).toBeNull();
  expect(rows[0].cells[3].textContent).toBe('Profesional uno');
  expect(table.hasAttribute('data-hhr-vital-detail-folded')).toBe(false);
  rows[1].cells[2].textContent = '24/11/2026 23:59:00';
  strip.refresh(section);
  expect(section.querySelector('[data-hhr-vital-older]')).toBeNull();
  rows[1].cells[2].textContent = '24-11-2026 23:58';
  strip.refresh(section);
  expect([...section.querySelectorAll('[data-hhr-vital-older]')]).toEqual([rows[1].cells[2]]);
  document.documentElement.dataset.hhrFichaTheme = 'balanced';
  strip.refresh(section);
  expect(section.querySelector('[data-hhr-vital-older]')).toBeNull();
});

it('omite fechas ocultas y conserva el original ante fechas incompletas o incompatibles', () => {
  const section = attributedTable(), table = section.querySelector('table'), rows = table.tBodies[0].rows;
  const strip = globalThis.HhrFichaVitalStrip.create();
  rows[1].hidden = true;
  strip.refresh(section);
  expect(section.querySelector('[data-hhr-vital-older]')).toBeNull();
  rows[1].hidden = false;
  rows[1].cells[2].textContent = '00:08';
  strip.refresh(section);
  expect(section.querySelector('[data-hhr-vital-older]')).toBeNull();
  rows[1].cells[2].textContent = '31-11-2026 00:08';
  strip.refresh(section);
  expect(section.querySelector('[data-hhr-vital-older]')).toBeNull();
  expect(section.querySelector('table')).toBe(table);
});

it('retira el énfasis cuando Eloísa cambia de tabla y al salir de la ficha', () => {
  const section = attributedTable(), table = section.querySelector('table');
  const strip = globalThis.HhrFichaVitalStrip.create();
  strip.refresh(section);
  expect(table.querySelector('[data-hhr-vital-older]')).toBeTruthy();
  const another = attributedTable();
  strip.refresh(another);
  expect(table.querySelector('[data-hhr-vital-older]')).toBeNull();
  expect(another.querySelector('[data-hhr-vital-older]')).toBeTruthy();
  strip.clear();
  expect(another.querySelector('[data-hhr-vital-older]')).toBeNull();
});
