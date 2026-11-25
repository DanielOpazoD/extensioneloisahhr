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
