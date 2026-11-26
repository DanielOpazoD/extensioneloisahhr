import { afterEach, expect, it } from 'vitest';
import '../../../extension/hhr-ficha-order-details.js';
import '../../../extension/hhr-ficha-reading-surfaces.js';
import '../../../extension/hhr-ficha-vital-strip.js';
import '../../../extension/hhr-ficha-summary-density.js';

const makeCard = (id,title,body,action='') => `<div class="MuiGrid-item"><div class="MuiGrid-item">
  <div ${id ? 'id="'+id+'"' : ''} class="MuiCard-root"><div class="MuiCardHeader-root">
    <span class="MuiCardHeader-title">${title}</span><span class="MuiCardHeader-subheader"></span>
    <div class="MuiCardHeader-action"><div class="MuiStack-root">${action}</div></div></div>
    <div class="MuiCardContent-root"><p>${body}</p></div>
  </div></div></div>`;

afterEach(() => document.body.replaceChildren());

it('pliega los estados nativos de solo lectura y recupera sus envoltorios al expandir o al llegar información', () => {
  document.body.innerHTML = '<main><nav><span data-hhr-ficha-link="exam"></span></nav>'+
    makeCard('encounterFormEntry','Instrumentos de evaluación','No presentan instrumentos de evaluación registrados')+
    '<div class="MuiGrid-item"><section id="exam" class="MuiBox-root">'+makeCard('','Examen físico','No presenta exámenes físicos registrados')+'</section></div>'+
    makeCard('request','Solicitud interconsulta','No se presentan interconsultas solicitadas para este paciente')+
    makeCard('ram','RAM','No presenta RAM registradas')+
    makeCard('allergy','Alergias','No presenta alergias registradas')+
    makeCard('denied','Eventos Adversos','No tiene permiso para visualizar')+
    makeCard('procedure','Procedimientos','No se presentan procedimientos registrados para este paciente',
      '<label><input type="checkbox">Mostrar suspendidos</label>')+
    makeCard('other','Solicitud de examen','No se presentan interconsultas solicitadas para este paciente')+
    '</main>';
  const main = document.querySelector('main'), nav = main.querySelector('nav');
  const reader = globalThis.HhrFichaReadingSurfaces.create();
  const density = globalThis.HhrFichaSummaryDensity.create([]);
  const refresh = (compact=true) => { reader.refresh(main,compact); density.refresh('episode',nav); };
  const folded = '[data-hhr-ficha-folded]';
  refresh();
  expect(nav.textContent).toBe('Ver vacías (3)');
  const card = document.getElementById('encounterFormEntry');
  const outer = card.parentElement.parentElement;
  expect(outer.matches(folded)).toBe(true);
  expect(nav.querySelector('span').matches(folded)).toBe(true);
  expect(document.getElementById('exam').parentElement.matches(folded)).toBe(true);
  for (const id of ['ram','allergy','denied','procedure','other']) {
    expect(document.getElementById(id).closest(folded)).toBeNull();
  }
  expect(document.getElementById('procedure').dataset.hhrReading).toBe('status-card');
  expect(document.getElementById('denied').dataset.hhrReading).toBe('status-card');
  expect(document.getElementById('other').hasAttribute('data-hhr-reading')).toBe(false);
  nav.querySelector('button').click();
  expect(main.querySelector(folded)).toBeNull();
  nav.querySelector('button').click();
  card.querySelector('.MuiCardContent-root p').textContent = 'Evaluación registrada';
  refresh();
  expect(nav.textContent).toBe('Ver vacías (2)');
  expect(outer.matches(folded)).toBe(false);
  refresh(false);
  expect(main.querySelector(folded)).toBeNull();
  expect(nav.querySelector('button')).toBeNull();
  density.clear(); reader.clear();
});

it('conserva los controles, las esperas y los avisos de acceso aunque el texto contenga una frase de vacío', () => {
  document.body.innerHTML = '<main><nav></nav>'+
    makeCard('action','Examen físico','No presenta exámenes físicos registrados','<button>Registrar</button>')+
    makeCard('loading','Examen físico','No presenta exámenes físicos registrados','<i role="progressbar"></i>')+
    makeCard('forbidden','Solicitud de examen','No tiene permiso para visualizar')+
    makeCard('mixed','Solicitud de examen','No se presentan solicitudes de exámenes registradas · error')+
    '</main>';
  const main = document.querySelector('main');
  const reader = globalThis.HhrFichaReadingSurfaces.create();
  const density = globalThis.HhrFichaSummaryDensity.create([]);
  reader.refresh(main,true); density.refresh('episode',main.querySelector('nav'));
  expect(main.querySelector('[data-hhr-ficha-folded]')).toBeNull();
  expect(main.querySelectorAll('[data-hhr-reading="status-card"]')).toHaveLength(1);
  density.clear(); reader.clear();
});

it('conserva visibles los dos avisos del lateral y retira la marca cuando llegan órdenes o un control', () => {
  const exam = 'No presenta solicitudes de examenes registradas';
  const surgery = 'No se presentan Solicitudes de intervención quirúrgica registradas para este paciente';
  document.body.innerHTML = '<main><nav></nav><section id="diagnosisTestEntrySection">' +
    makeCard('', 'Solicitud de examen', exam) + '</section>' +
    makeCard('operationTheaterRequestEntrySection','Solicitudes de intervención quirúrgica',surgery) + '</main>';
  const main = document.querySelector('main'), reader = globalThis.HhrFichaReadingSurfaces.create();
  const density = globalThis.HhrFichaSummaryDensity.create(['diagnosisTestEntrySection','operationTheaterRequestEntrySection']);
  const test = document.querySelector('#diagnosisTestEntrySection');
  const operation = document.querySelector('#operationTheaterRequestEntrySection');
  reader.refresh(main,true);
  expect(test.dataset.hhrEmptyRequest).toBe('exam');
  expect(operation.dataset.hhrEmptyRequest).toBe('surgery');
  for (const section of [test, operation]) section.setAttribute('data-hhr-round', 'empty-request');
  density.refresh('round',main.querySelector('nav'));
  expect(main.querySelector('[data-hhr-ficha-folded]')).toBeNull();
  test.querySelector('.MuiCardContent-root p').textContent = 'Solicitud ingresada';
  operation.insertAdjacentHTML('beforeend','<button>Ver solicitud</button>');
  reader.refresh(main,true);
  expect(main.querySelector('[data-hhr-empty-request]')).toBeNull();
  operation.querySelector('button').remove();
  reader.refresh(main,true);
  expect(operation.dataset.hhrEmptyRequest).toBe('surgery');
  reader.refresh(main,false);
  expect(main.querySelector('[data-hhr-empty-request]')).toBeNull();
  density.clear(); reader.clear();
});

it('respeta permisos, estados pendientes y controles fuera de la tarjeta al detectar solicitudes', () => {
  const empty = 'No se presentan solicitudes de exámenes registradas';
  const main = document.createElement('main');
  document.body.append(main);
  const reader = globalThis.HhrFichaReadingSurfaces.create();
  for (const extra of ['<button>Ingresar solicitud</button>','<span>Registro anterior</span>','<i role="progressbar"></i>']) {
    main.innerHTML = '<section id="diagnosisTestEntrySection">' + makeCard('','Solicitud de examen',empty) + extra + '</section>';
    reader.refresh(main,true);
    expect(main.querySelector('[data-hhr-empty-request],[data-hhr-reading="empty-section-title"]')).toBeNull();
  }
  main.innerHTML = makeCard('diagnosisTestEntrySection','Solicitud de examen','No tiene permiso para visualizar');
  reader.refresh(main,true);
  expect(main.querySelector('[data-hhr-empty-request],[data-hhr-reading="empty-section-title"]')).toBeNull();
  reader.clear();
});

it('las órdenes de atención conservan controles, nombres, foco y órdenes de varias líneas', () => {
  document.body.innerHTML = '<main><section id="procedureOrderEntrySection"><div class="MuiCard-root">' +
    '<h3>Órdenes de atención</h3><table><thead><tr><th>Estado</th><th>Indicaciones</th><th>Acciones</th></tr></thead>' +
    '<tbody><tr><td><select aria-label="Estado"><option>Solicitada</option><option>Realizada</option></select></td>' +
    '<td>Primera instrucción<br>Segunda instrucción</td><td><button aria-label="Imprimir orden">Imprimir</button></td></tr></tbody>' +
    '</table></div></section></main>';
  const reader = globalThis.HhrFichaReadingSurfaces.create(), main = document.querySelector('main');
  const select = main.querySelector('select');
  select.focus();
  reader.refresh(main,true);
  expect(main.querySelector('#procedureOrderEntrySection').dataset.hhrReading).toBe('care-orders');
  expect(main.querySelectorAll('[data-hhr-reading="narrow"]')).toHaveLength(2);
  expect(main.querySelector('th[data-hhr-reading="order-instructions"]').textContent).toBe('Indicaciones');
  expect(document.activeElement).toBe(select);
  select.selectedIndex = 1;
  reader.refresh(main,true);
  expect(main.querySelector('select').value).toBe('Realizada');
  expect(main.querySelector('button').getAttribute('aria-label')).toBe('Imprimir orden');
  expect(main.querySelector('td br')).toBeTruthy();
  reader.refresh(main,false);
  expect(main.querySelector('[data-hhr-reading="care-orders"],[data-hhr-reading="narrow"],[data-hhr-reading="order-instructions"]')).toBeNull();
  reader.clear();
});

it('lee como una línea las secciones vacías o sin permiso que Eloísa dibuja con otra forma', () => {
  document.body.innerHTML = '<main><nav></nav><section id="diagnosisEntrySection">' +
    makeCard('diagnosisEntry','Diagnóstico','No se presentan diagnosticos registrados para este paciente') + '</section>' +
    '<section id="procedureOrderEntrySection">' + makeCard('procedureOrderEntry','Órdenes de atención','No se presenta orden de atención solicitada para este paciente') + '</section>' +
    makeCard('gyneco','Examen Gíneco Obstétrico','No tiene permiso para visualizar') +
    '<section id="operationTheaterRequestEntrySection">' + makeCard('surgery','Solicitudes de intervención quirúrgica','') + '</section>' +
    makeCard('unknown','Otra sección','No se presentan registros de prueba para este paciente') + '</main>';
  // React writes this sentence in three text nodes around the name of the section.
  document.querySelector('#surgery p').append('No se presentan ', 'Solicitudes de intervención quirúrgica', ' registradas para este paciente');
  const main = document.querySelector('main'), reader = globalThis.HhrFichaReadingSurfaces.create();
  const density = globalThis.HhrFichaSummaryDensity.create([]);
  reader.refresh(main,true); density.refresh('episode',main.querySelector('nav'));
  for (const id of ['diagnosisEntry','procedureOrderEntry','gyneco','surgery']) expect(document.getElementById(id).dataset.hhrReading).toBe('status-card');
  // Their sections no longer read as the tables they hold when there are records.
  expect(document.querySelector('#diagnosisEntrySection').hasAttribute('data-hhr-reading')).toBe(false);
  expect(document.querySelector('#procedureOrderEntrySection').hasAttribute('data-hhr-reading')).toBe(false);
  expect(document.querySelector('#operationTheaterRequestEntrySection').dataset.hhrEmptyRequest).toBe('surgery');
  // Kept in view: an empty diagnosis is worth reading, and a section without permission is never folded.
  for (const id of ['diagnosisEntry','procedureOrderEntry','gyneco']) expect(document.getElementById(id).closest('[data-hhr-ficha-folded]')).toBeNull();
  expect(document.getElementById('unknown').hasAttribute('data-hhr-reading')).toBe(false);
  // With a record the diagnosis is its table again.
  document.querySelector('#diagnosisEntry .MuiCardContent-root').innerHTML = '<table><thead><tr><th>Diagnóstico</th></tr></thead><tbody><tr><td>Z00</td></tr></tbody></table>';
  reader.refresh(main,true);
  expect([document.querySelector('#diagnosisEntrySection').dataset.hhrReading, document.getElementById('diagnosisEntry').dataset.hhrReading]).toEqual(['diagnosis','diagnosis']);
  // Two sentences in two elements are not one message.
  document.querySelector('#gyneco p').insertAdjacentHTML('afterend','<p>Solicitar acceso</p>');
  reader.refresh(main,true);
  expect(document.getElementById('gyneco').hasAttribute('data-hhr-reading')).toBe(false);
  // Outside the compact view no section is a status line.
  reader.refresh(main,false);
  expect(main.querySelector('[data-hhr-reading="status-card"],[data-hhr-reading="status-message"],[data-hhr-empty-request]')).toBeNull();
  density.clear(); reader.clear();
});

it('marca quién validó el tratamiento de Fármacos solo con su forma exacta', () => {
  const line = value => '<div class="MuiBox-root"><span class="MuiTypography-root MuiTypography-caption">Medico Validador:</span>' +
    '<span class="MuiTypography-root MuiTypography-caption">' + value + '</span></div>';
  const table = '<table><thead><tr><th>Indication</th></tr></thead><tbody><tr><td>Preparación</td></tr></tbody></table>';
  document.body.innerHTML = '<main><section id="medicationEntrySection"><section id="dilutionEntrySection">' +
    makeCard('medicationEntry','Fármacos','').replace('<p></p>', line('') + table) + '</section></section></main>';
  const main = document.querySelector('main'), reader = globalThis.HhrFichaReadingSurfaces.create();
  const validator = () => main.querySelector('#medicationEntry .MuiCardContent-root > .MuiBox-root');
  reader.refresh(main,true);
  expect(validator().dataset.hhrReading).toBe('order-validator');
  validator().outerHTML = line('Tomás Ejemplo 15-04-2026');
  reader.refresh(main,true);
  expect(validator().dataset.hhrReading).toBe('order-validator');
  // Another label, a control or a third piece is not that line.
  for (const change of [el => { el.firstElementChild.textContent = 'Observación:'; }, el => el.append(document.createElement('button')),
    el => el.lastElementChild.append(document.createElement('b')), el => el.append('texto suelto')]) {
    validator().outerHTML = line('');
    change(validator());
    reader.refresh(main,true);
    expect(validator().hasAttribute('data-hhr-reading')).toBe(false);
  }
  validator().outerHTML = line('');
  reader.refresh(main,true);
  // Outside the compact view the line is Eloísa's again.
  reader.refresh(main,false);
  expect(validator().hasAttribute('data-hhr-reading')).toBe(false);
  reader.clear();
});

it('una tarjeta con su tabla conserva su tipo aunque contenga una sección vacía', () => {
  // A nursing screen can draw a table and an empty section inside one Box, without a card of its own.
  document.body.innerHTML = '<main><div class="MuiGrid-item" id="nurse"><p class="MuiTypography-root">Indicaciones libres</p>' +
    '<table><thead><tr><th>Indicación</th><th>Acciones</th></tr></thead><tbody><tr><td>Curación de prueba</td><td><button>Ver</button></td></tr></tbody></table>' +
    makeCard('ram','RAM','No presenta RAM registradas') + '</div></main>';
  const main = document.querySelector('main'), reader = globalThis.HhrFichaReadingSurfaces.create();
  reader.refresh(main,true);
  expect([document.getElementById('nurse').dataset.hhrReading, document.getElementById('ram').dataset.hhrReading]).toEqual(['orders','status-card']);
  reader.clear();
});
