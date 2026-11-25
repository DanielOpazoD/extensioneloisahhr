import { afterEach, expect, it } from 'vitest';
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
  const exam = 'No presenta solicitudes de exámenes registradas';
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
  expect(document.activeElement).toBe(select);
  select.selectedIndex = 1;
  reader.refresh(main,true);
  expect(main.querySelector('select').value).toBe('Realizada');
  expect(main.querySelector('button').getAttribute('aria-label')).toBe('Imprimir orden');
  expect(main.querySelector('td br')).toBeTruthy();
  reader.refresh(main,false);
  expect(main.querySelector('[data-hhr-reading="care-orders"],[data-hhr-reading="narrow"]')).toBeNull();
  reader.clear();
});
