// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { medicalRound } from '../../../scripts/medical-round-visual-fixture.mjs';
import '../../../extension/hhr-ficha-vital-strip.js';
import '../../../extension/hhr-ficha-order-details.js';
import '../../../extension/hhr-ficha-reading-surfaces.js';

afterEach(() => document.body.replaceChildren());

it('conserva la presión compuesta, la PAM y el tiempo original al cambiar de tema', () => {
  const main = new DOMParser().parseFromString(medicalRound, 'text/html').querySelector('main');
  document.body.append(main);
  const readings = globalThis.HhrFichaReadingSurfaces.create();
  readings.refresh(main,true);
  const values = main.querySelectorAll('[data-hhr-reading="vital-value"]');
  expect(values).toHaveLength(9);
  expect([...main.querySelectorAll('[data-hhr-vital-short]')].map(el => [el.dataset.hhrVitalShort,el.title])).toEqual([
    ['PA','Presión arterial'],['FC','Frecuencia cardíaca'],['SatO₂','Saturación de oxígeno'],
    ['T° ax.','Temperatura axilar'],['FR','Frecuencia respiratoria'],['HGT','Hemoglucotest'],
  ]);
  expect(values[3].getAttribute('style')).toContain('color:');
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
  expect(main.querySelector('[data-hhr-vital-short], [title="Frecuencia cardíaca"]')).toBeNull();
  expect(main.querySelector('[data-hhr-vital-elapsed],[data-hhr-reading="vital-pressure-group"]')).toBeNull();
  readings.clear();
  expect(main.querySelector('[data-hhr-reading]')).toBeNull();
  expect(since.textContent).toBe('Hora no disponible');
});

it('dice una vez la antigüedad común de las mediciones y conserva la de la medición anterior', () => {
  const main = new DOMParser().parseFromString(medicalRound, 'text/html').querySelector('main');
  document.body.append(main);
  const readings = globalThis.HhrFichaReadingSurfaces.create();
  const heading = main.querySelector('#vitalSignsEntry .MuiCardHeader-content');
  const times = () => [...main.querySelectorAll('[data-hhr-reading="vital-time"]')];
  const shared = () => times().map(el => el.getAttribute('data-hhr-vital-shared'));
  readings.refresh(main,true);
  expect(heading.getAttribute('data-hhr-vital-shared')).toBe('2 h');
  expect(shared()).toEqual(['','','','','','','',null,'']);
  expect(times()[7].hasAttribute('data-hhr-vital-older')).toBe(true);
  expect(times().map(el => el.textContent)).toEqual(['2 horas','2 horas','2 horas','2 horas','2 horas','2 horas','2 horas','4 horas','2 horas']);

  // A measurement without a readable age leaves every age on its own tile.
  const first = times()[0];
  first.textContent = 'Hora no disponible';
  readings.refresh(main,true);
  expect(heading.hasAttribute('data-hhr-vital-shared')).toBe(false);
  expect(main.querySelector('[data-hhr-vital-shared]')).toBeNull();
  first.textContent = '2 horas';

  // Two recent measurements with different labels are not summarized.
  const second = main.querySelectorAll('.tile')[1].querySelector('[data-hhr-reading="vital-time"]');
  second.textContent = '110 minutos';
  readings.refresh(main,true);
  expect(main.querySelector('[data-hhr-vital-shared]')).toBeNull();
  second.textContent = '2 horas';

  // «1 hora» and «65 minutos» can describe the same moment, but they are not one label.
  times().forEach((time, index) => { time.textContent = index % 2 ? '65 minutos' : '1 hora'; });
  readings.refresh(main,true);
  expect(main.querySelector('[data-hhr-vital-shared]')).toBeNull();
  times().forEach((time, index) => { time.textContent = index === 7 ? '4 horas' : '2 horas'; });

  // A card the reader does not recognize as a measurement has no age of its own to share.
  const unknown = document.createElement('div');
  unknown.className = 'MuiPaper-root MuiCard-root tile';
  unknown.innerHTML = '<div class="MuiCardContent-root"><p>Balance pendiente</p></div>';
  main.querySelector('.vitals-grid').append(unknown);
  readings.refresh(main,true);
  expect(main.querySelector('[data-hhr-vital-shared]')).toBeNull();
  unknown.remove();

  readings.refresh(main,true);
  expect(heading.getAttribute('data-hhr-vital-shared')).toBe('2 h');
  for (const [native, label] of [['35 minutos','35 min'],['1 día','1 día'],['3 días','3 días']]) {
    for (const time of times()) time.textContent = native;
    readings.refresh(main,true);
    expect(heading.getAttribute('data-hhr-vital-shared')).toBe(label);
    expect(shared()).toEqual(Array(9).fill(''));
  }
  readings.refresh(main,false);
  expect(main.querySelector('[data-hhr-vital-shared]')).toBeNull();
  readings.refresh(main,true);
  readings.clear();
  expect(main.querySelector('[data-hhr-vital-shared]')).toBeNull();
});

it('retira de la vista el rótulo de la columna de acciones y conserva su texto', () => {
  document.body.innerHTML = '<main><section id="medicationEntrySection"><table><thead><tr><th>Indicación</th><th>Hora</th><th>Acciones</th></tr></thead>' +
    '<tbody><tr><td>Preparación</td><td>08:00</td><td><button>···</button></td></tr></tbody></table></section>' +
    '<section id="freeIndicationEntrySection"><table><thead><tr><th>Indicación</th><th><b>Acciones</b></th></tr></thead>' +
    '<tbody><tr><td>Texto</td><td><button>···</button></td></tr></tbody></table></section>' +
    '<section id="procedureOrderEntrySection"><h6>Órdenes de atención</h6><table><thead><tr><th>Profesional</th><th>Acciones</th></tr></thead>' +
    '<tbody><tr><td>Kinesiólogo(a)</td><td><button>⎙</button></td></tr><tr><td>Otro</td><td>Pendiente <button>Ver</button></td></tr></tbody></table></section></main>';
  const main = document.querySelector('main');
  const [, time, actions, , marked, , mixed] = main.querySelectorAll('th');
  const readings = globalThis.HhrFichaReadingSurfaces.create();
  readings.refresh(main,true);
  expect(actions.hasAttribute('data-hhr-actions-heading')).toBe(true);
  expect(actions.textContent).toBe('Acciones');
  expect(time.hasAttribute('data-hhr-actions-heading')).toBe(false);
  // A heading with its own markup stays as Eloísa draws it.
  expect(marked.hasAttribute('data-hhr-actions-heading')).toBe(false);
  // A column that also carries text keeps its visible name.
  expect(mixed.textContent).toBe('Acciones');
  expect(mixed.hasAttribute('data-hhr-actions-heading')).toBe(false);
  readings.refresh(main,false);
  expect(main.querySelector('[data-hhr-actions-heading]')).toBeNull();
  readings.refresh(main,true);
  readings.clear();
  expect(main.querySelector('[data-hhr-actions-heading]')).toBeNull();
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
  expect(grid.children[1].querySelector('[data-hhr-vital-short]').title).toBe('Temperatura axilar');
  expect(grid.lastChild.textContent).toContain('Otra medición41 hora');
  expect(grid.lastChild.querySelector('[data-hhr-reading]')).toBeNull();
  expect(main.querySelector('button').dataset.hhrReading).toBe('vital-history');
  expect(grid.nextElementSibling.textContent).toBe('Observaciones');
});

it('deja la presión sin relación sistólica/diastólica y las etiquetas con información propia intactas', () => {
  const main = new DOMParser().parseFromString(medicalRound, 'text/html').querySelector('main');
  document.body.append(main);
  const readings = globalThis.HhrFichaReadingSurfaces.create();
  readings.refresh(main,true);
  const pressure = main.querySelector('[data-hhr-vital-short="PA"]');
  const heart = main.querySelector('[data-hhr-vital-short="FC"]');
  const glucose = main.querySelector('[data-hhr-vital-short="HGT"]');
  pressure.closest('.tile').querySelector('.numeric').textContent = '18';
  heart.title = 'Unidad indicada por la fuente';
  glucose.textContent = 'Hemoglucotest (mg/dL)';
  readings.refresh(main,true);
  expect(main.querySelector('[data-hhr-vital-short="PA"],[data-hhr-vital-short="FC"],[data-hhr-vital-short="HGT"]')).toBeNull();
  expect(pressure.textContent).toBe('Presión');
  expect(heart.title).toBe('Unidad indicada por la fuente');
  expect(glucose.textContent).toBe('Hemoglucotest (mg/dL)');
  const observer = new MutationObserver(() => {});
  observer.observe(main,{subtree:true,childList:true,attributes:true});
  readings.refresh(main,true);
  expect(observer.takeRecords()).toHaveLength(0);
  observer.disconnect();
  readings.clear();
});

it('destaca solo las edades distinguibles de la más reciente dentro de cada banda', () => {
  const main = new DOMParser().parseFromString(medicalRound, 'text/html').querySelector('main');
  document.body.append(main);
  const readings = globalThis.HhrFichaReadingSurfaces.create();
  readings.refresh(main,true);
  const times = [...main.querySelectorAll('[data-hhr-reading="vital-time"]')];
  const older = () => main.querySelectorAll('[data-hhr-vital-older]');
  expect([...older()]).toEqual([times[7]]);
  expect(times[7].textContent).toBe('4 horas');
  expect(main.querySelector('[data-hhr-vital-source]')).toBeNull();
  times[7].textContent = '120 minutos';
  times[2].textContent = '1 día';
  readings.refresh(main,true);
  expect([...older()]).toEqual([times[2]]);
  times[7].textContent = '125 minutos';
  readings.refresh(main,true);
  expect([...older()]).toEqual([times[2]]);
  times[2].textContent = 'Sin registro';
  readings.refresh(main,true);
  expect(older()).toHaveLength(0);
  times[2].textContent = '3 horas';
  readings.refresh(main,true);
  expect([...older()]).toEqual([times[2]]);
  readings.refresh(main,false);
  expect(older()).toHaveLength(0);
});

it('muestra metadatos explícitos de la medición sin tomar los de la cabecera', () => {
  const main = new DOMParser().parseFromString(medicalRound, 'text/html').querySelector('main');
  document.body.append(main);
  const readings = globalThis.HhrFichaReadingSurfaces.create();
  readings.refresh(main,true);
  const elapsed = main.querySelector('[data-hhr-vital-older]');
  const shell = elapsed.parentElement;
  elapsed.title = '15-04-2026 06:20 · Registrado por: Profesional de prueba';
  readings.refresh(main,true);
  expect(shell.dataset.hhrVitalSource).toBe(elapsed.title);
  elapsed.removeAttribute('title');
  elapsed.innerHTML = '<time datetime="2026-11-25T03:15:00Z" title="Autor: Profesional de prueba">4 horas</time>';
  readings.refresh(main,true);
  const converted = new Intl.DateTimeFormat('es-CL', {timeZone:'Pacific/Easter', dateStyle:'short', timeStyle:'short'})
    .format(new Date('2026-11-25T03:15:00Z'));
  expect(shell.dataset.hhrVitalSource).toBe(converted + ' · Autor: Profesional de prueba');
  const time = elapsed.querySelector('time');
  time.dateTime = '2026-11-25T03:15:00';
  readings.refresh(main,true);
  expect(shell.dataset.hhrVitalSource).toBe(time.title);
  readings.clear();
  expect(main.querySelector('[data-hhr-vital-source],[data-hhr-vital-older]')).toBeNull();
  expect(time.title).toBe('Autor: Profesional de prueba');
});
