// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { medicalRound } from '../../../scripts/medical-round-visual-fixture.mjs';
import '../../../extension/hhr-ficha-reading-surfaces.js';

afterEach(() => document.body.replaceChildren());

it('conserva la presión compuesta, la PAM y el tiempo original al cambiar de tema', () => {
  const main = new DOMParser().parseFromString(medicalRound, 'text/html').querySelector('main');
  document.body.append(main);
  const readings = globalThis.HhrFichaReadingSurfaces.create();
  readings.refresh(main,true);
  const values = main.querySelectorAll('[data-hhr-reading="vital-value"]');
  expect(values).toHaveLength(9);
  expect(values[0].textContent.replace(/\s+/g,'')).toBe('118/72');
  expect(main.querySelector('[data-hhr-reading="vital-pam"]').textContent.replace(/\s+/g,'')).toBe('PAM:87');
  const since = main.querySelector('[data-hhr-vital-elapsed]');
  expect(since.dataset.hhrVitalElapsed).toBe('2h');
  expect(since.textContent).toBe('2 horas');
  since.textContent = 'Hace 3 minutos';
  readings.refresh(main,true);
  expect(since.dataset.hhrVitalElapsed).toBe('3min');
  since.textContent = 'Hora no disponible';
  readings.refresh(main,true);
  expect(since.hasAttribute('data-hhr-vital-elapsed')).toBe(false);
  readings.refresh(main,false);
  expect(main.querySelector('[data-hhr-vital-elapsed],[data-hhr-reading="vital-pressure-group"]')).toBeNull();
  readings.clear();
  expect(main.querySelector('[data-hhr-reading]')).toBeNull();
  expect(since.textContent).toBe('Hora no disponible');
});
