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

it('keeps the native history action, accessible name and optional tooltip when switching views', () => {
  document.body.innerHTML = '<main><section id="vitalSignsEntry"><h3>Signos vitales</h3>' +
    '<button>Ver historial completo</button><dialog><button>Ver historial completo</button></dialog></section>' +
    '<section><button>Ver historial completo</button></section></main>';
  const main = document.querySelector('main');
  const [history, modal, other] = main.querySelectorAll('button');
  const readings = globalThis.HhrFichaReadingSurfaces.create();
  let opened = 0;
  history.addEventListener('click', () => opened++);
  readings.refresh(main,true);
  expect(history.dataset.hhrReading).toBe('vital-history');
  expect(history.textContent).toBe('Ver historial completo');
  expect(history.title).toBe('Ver historial completo');
  expect(modal.hasAttribute('data-hhr-reading')).toBe(false);
  expect(other.hasAttribute('data-hhr-reading')).toBe(false);
  history.click();
  expect(opened).toBe(1);
  readings.refresh(main,false);
  expect(history.hasAttribute('title')).toBe(false);
  expect(history.hasAttribute('data-hhr-reading')).toBe(false);
  history.title = 'Texto de Eloísa';
  readings.refresh(main,true);
  readings.clear();
  expect(history.title).toBe('Texto de Eloísa');
});

it('recognises a direct native label with an auxiliary Box and keeps unfamiliar measurements intact', () => {
  const main = document.createElement('main');
  main.innerHTML = '<section id="vitalSignsEntry"><div id="vitalSignsEntry" class="MuiCard-root">' +
    '<div class="MuiCardContent-root"><div class="MuiStack-root"></div><p>Observaciones</p>' +
    '<button>VER HISTORIAL COMPLETO <span class="MuiTouchRipple-root"></span></button></div></div></section>';
  document.body.append(main);
  const grid = main.querySelector('.MuiStack-root');
  for (const [name,value,detail] of [['Presión','118/72',''],['Tº axilar','37,1','°C'],['Otra medición','4','']]) {
    const tile = document.createElement('div');
    tile.className = 'MuiCard-root';
    tile.innerHTML = '<div class="MuiCardContent-root"><p class="MuiTypography-root"></p><h5></h5><p>1 hora</p></div>';
    const label = tile.querySelector('p');
    label.append(name);
    const box = document.createElement('div');
    box.className = 'MuiBox-root';
    box.innerHTML = '<span class="MuiTypography-caption"></span>';
    box.firstChild.textContent = detail;
    label.append(box);
    tile.querySelector('h5').textContent = value;
    grid.append(tile);
  }
  const readings = globalThis.HhrFichaReadingSurfaces.create();
  readings.refresh(main,true);
  expect(grid.dataset.hhrReading).toBe('vital-grid');
  expect(grid.querySelectorAll('[data-hhr-reading="vital-value"]')).toHaveLength(2);
  expect(grid.querySelectorAll('[data-hhr-vital-elapsed="1h"]')).toHaveLength(2);
  expect(grid.children[1].querySelector('.MuiTypography-caption').textContent).toBe('°C');
  expect(grid.lastChild.textContent).toContain('Otra medición41 hora');
  expect(grid.lastChild.querySelector('[data-hhr-reading]')).toBeNull();
  expect(main.querySelector('button').dataset.hhrReading).toBe('vital-history');
  expect(grid.nextElementSibling.textContent).toBe('Observaciones');
});
