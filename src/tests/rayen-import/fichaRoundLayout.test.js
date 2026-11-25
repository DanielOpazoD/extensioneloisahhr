// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import '../../../extension/hhr-ficha-round-layout.js';

const slot = (id, content) => '<div class="MuiGrid-item MuiGrid-grid-xs-12"><section id="'+id+'">'+content+'</section></div>';
const layout = globalThis.HhrFichaRoundLayout.create();
afterEach(() => { layout.clear(); document.body.replaceChildren(); });

it('recognises the adjacent branches within the medical summary and restores the native controls in place', () => {
  const date = slot('estimatedDischargeSection','<div id="estimatedDischarge"><input type="date"></div>');
  const note = slot('observationEntrySection','<div id="evolution"><button>Leer más</button></div>');
  const handoff = slot('shiftChangeEntrySection','<div id="shiftChangeObservation"><textarea></textarea></div>');
  const unrelated = '<div class="MuiGrid-item">Otra sección</div>';
  document.body.innerHTML = '<main><div class="MuiGrid-container">'+unrelated+
    '<div class="MuiGrid-item"><div class="MuiGrid-container">'+date+note+'</div></div>'+
    handoff+unrelated.repeat(20)+'</div></main>';
  const main = document.querySelector('main');
  const field = main.querySelector('textarea');
  field.value = 'Borrador de prueba';
  field.focus();
  const original = main.innerHTML;
  layout.refresh(main);
  expect(main.querySelector('[data-hhr-round="frame"]').children).toHaveLength(23);
  expect(main.querySelector('[data-hhr-round="date"] input[type=date]')).not.toBeNull();
  expect(main.querySelector('[data-hhr-round="handoff"] textarea')).toBe(field);
  expect(main.querySelector('[data-hhr-round="note"] #evolution')).not.toBeNull();

  const changes = new MutationObserver(() => {});
  changes.observe(main, {subtree:true, attributes:true, childList:true});
  layout.refresh(main);
  expect(changes.takeRecords()).toHaveLength(0);
  changes.disconnect();

  layout.clear();
  expect(main.innerHTML).toBe(original);
  expect(document.activeElement).toBe(field);
  expect(field.value).toBe('Borrador de prueba');
  const extra = document.createElement('button');
  extra.textContent = 'Acción adicional';
  main.querySelector('#shiftChangeEntrySection').after(extra);
  layout.refresh(main);
  expect(main.querySelector('[data-hhr-round="frame"]')).toBeNull();
  expect(main.querySelector('[data-hhr-round="date"] input')).not.toBeNull();
  expect(extra.closest('[data-hhr-round="date"]')).toBeNull();
});

it('hides the discharge card independently while retaining an adjacent native control', () => {
  document.body.innerHTML = '<main><div class="MuiGrid-item"><div id="estimatedDischarge">Fecha estimada de alta</div><button>Otra acción</button></div></main>';
  const main = document.querySelector('main');
  layout.refresh(main);
  expect(main.querySelector('#estimatedDischarge').dataset.hhrRound).toBe('date');
  expect(main.querySelector('button').closest('[data-hhr-round]')).toBeNull();
  layout.clear();
  expect(main.querySelector('[data-hhr-round]')).toBeNull();
});

it('pairs neighbouring note and handoff even when discharge was never mounted', () => {
  document.body.innerHTML = '<main><div class="MuiGrid-container">' +
    slot('shiftChangeEntrySection','<input>') + slot('observationEntrySection','Evolución') +
    '<div class="MuiGrid-item">Más información</div></div></main>';
  const main = document.querySelector('main');
  layout.refresh(main);
  expect(main.querySelector('[data-hhr-round="handoff"] input')).not.toBeNull();
  expect(main.querySelector('#observationEntrySection').parentElement.dataset.hhrRound).toBe('note');
  expect(main.querySelector('.MuiGrid-container > :last-child').hasAttribute('data-hhr-round')).toBe(false);
});

it('keeps controls and independent siblings in their own slots and accepts adjacent native columns', () => {
  const pair = '<div class="MuiGrid-container">' + slot('restEntrySection','Reposo') +
    slot('nutritionOrderEntrySection','Régimen') + '</div>';
  document.body.innerHTML = '<main><div class="MuiGrid-container">' +
    slot('observationEntrySection','Evolución') + slot('shiftChangeEntrySection','<textarea></textarea>') +
    slot('vitalSignsEntry','Signos') + '<div class="MuiGrid-item MuiGrid-grid-xs-6">' + pair + '</div>' +
    slot('alertEntrySection','<button>Archivar</button>') + '</div></main>';
  const main = document.querySelector('main');
  const original = main.innerHTML;
  const field = main.querySelector('textarea');
  field.value = 'Texto en edición';
  field.focus();
  layout.refresh(main);
  const care = main.querySelector('[data-hhr-round="care"]');
  expect(care.querySelector('#nutritionOrderEntrySection')).not.toBeNull();
  expect(care.querySelector('#restEntrySection')).not.toBeNull();
  expect(main.querySelector('#alertEntrySection').closest('[data-hhr-round="care"]')).toBeNull();

  const control = document.createElement('button');
  care.querySelector('#restEntrySection').append(control);
  layout.refresh(main);
  expect(care.dataset.hhrRound).not.toBe('care');
  control.remove();
  const peer = document.createElement('article');
  care.firstElementChild.append(peer);
  layout.refresh(main);
  expect(care.dataset.hhrRound).not.toBe('care');
  peer.remove();
  const other = document.createElement('div');
  other.className = 'MuiGrid-item MuiGrid-grid-md-4';
  care.after(other);
  layout.refresh(main);
  expect(care.dataset.hhrRound).toBe('care');
  expect(other.dataset.hhrRound).toBe('peer');
  other.remove();
  layout.refresh(main);
  expect(main.querySelector('[data-hhr-round="care"]')).toBe(care);

  layout.clear();
  expect(main.innerHTML).toBe(original);
  expect(document.activeElement).toBe(field);
  expect(field.value).toBe('Texto en edición');
});

it('reads two instructions without sharing their bylines or dropping observations on refresh', () => {
  const care = (id, name, byline, body) => slot(id,
    '<div class="MuiCard-root"><div class="MuiCardHeader-root"><div class="MuiCardHeader-content">' +
    '<span class="MuiCardHeader-title">' + name + '</span><span class="MuiCardHeader-subheader">' + byline +
    '</span></div></div><div class="MuiCardContent-root">' + body + '</div></div>');
  const rest = care('restEntrySection', 'Reposo', 'Firma A',
    '<p><strong>Reposo:</strong> Relativo</p><p>Movilización asistida.</p>');
  const diet = care('nutritionOrderEntrySection', 'Régimen', 'Firma B',
    '<div class="MuiStack-root"><div class="MuiStack-root"><span>Régimen:</span> <span class="MuiChip-root">Común</span></div>' +
    '<div class="MuiStack-root"><strong>Observación:</strong> Según tolerancia.</div></div>');
  document.body.innerHTML = '<main><div class="MuiGrid-container">' +
    slot('observationEntrySection', 'Evolución') + slot('shiftChangeEntrySection', '<textarea></textarea>') +
    '<div class="MuiGrid-item"><div class="MuiGrid-container">' + rest + diet + '</div></div></div></main>';
  const main = document.querySelector('main');
  const original = main.innerHTML;
  layout.refresh(main);
  const rows = [...main.querySelectorAll('[data-hhr-round="care-row"]')];
  expect(rows.map(row => row.querySelector('.MuiCardHeader-subheader').textContent)).toEqual(['Firma A', 'Firma B']);
  expect(rows.map(row => row.querySelector('[data-hhr-round="care-observation"]').textContent))
    .toEqual(['Movilización asistida.', 'Observación: Según tolerancia.']);
  expect([...main.querySelectorAll('[data-hhr-round="care-label"]')].map(el => el.textContent))
    .toEqual(['Reposo:', 'Régimen:', 'Observación:']);

  const stamps = rows.map(row => row.querySelector('.MuiCardHeader-subheader'));
  const fullStamp = 'Última actualización: 15-04-2026, 09:12:35, Médico Tomás Ejemplo';
  for (const stamp of stamps) {
    stamp.textContent = fullStamp;
    stamp.dataset.hhrUpdateLabel = '15-04-2026 · 09:12 · Tomás Ejemplo';
  }
  layout.refresh(main);
  expect(stamps.map(el => el.dataset.hhrRound)).toEqual(['same-stamp', 'shared-stamp']);
  stamps[0].textContent = fullStamp.replace(':35,', ':59,');
  layout.refresh(main);
  expect(stamps.map(el => el.dataset.hhrRound)).toEqual([undefined, undefined]);
  stamps.forEach((stamp, index) => {
    stamp.textContent = index === 0 ? 'Firma A' : 'Firma B';
    delete stamp.dataset.hhrUpdateLabel;
  });

  const observation = rows[0].querySelector('[data-hhr-round="care-observation"]');
  const originalText = observation.textContent;
  observation.textContent = '-';
  layout.refresh(main);
  expect(observation.dataset.hhrRound).toBe('care-placeholder');
  observation.textContent = '- Control durante el turno';
  layout.refresh(main);
  expect(observation.dataset.hhrRound).toBe('care-observation');
  observation.textContent = originalText;
  const prefix = rows[0].querySelector('strong');
  prefix.textContent = 'Detalle especial:';
  layout.refresh(main);
  expect(rows[0].hasAttribute('data-hhr-round')).toBe(false);
  expect(rows[0].querySelector('[data-hhr-round="care-label"]')).toBeNull();
  expect(rows[1].dataset.hhrRound).toBe('care-row');
  prefix.textContent = 'Reposo:';
  layout.refresh(main);
  expect(main.querySelectorAll('[data-hhr-round="care-row"]')).toHaveLength(2);
  layout.clear();
  expect(main.innerHTML).toBe(original);
});

it('uses only isolated native branches for the two columns and returns populated requests to their original flow', () => {
  document.body.innerHTML = '<main><div class="MuiGrid-container">' +
    slot('observationEntrySection','Nota') + slot('shiftChangeEntrySection','<textarea></textarea>') +
    slot('vitalSignsEntry','Signos') + slot('alertEntrySection','<button>Archivar</button>') +
    slot('diagnosisTestEntrySection','Sin solicitudes') + slot('operationTheaterRequestEntrySection','Sin solicitudes') +
    '</div></main>';
  const main = document.querySelector('main');
  const exam = main.querySelector('#diagnosisTestEntrySection');
  const surgery = main.querySelector('#operationTheaterRequestEntrySection');
  exam.dataset.hhrEmptyRequest = 'exam';
  surgery.dataset.hhrEmptyRequest = 'surgery';
  layout.refresh(main);
  expect(main.querySelector('#vitalSignsEntry').parentElement.dataset.hhrRound).toBe('vitals');
  expect(main.querySelector('#alertEntrySection').parentElement.dataset.hhrRound).toBe('alerts');
  expect(exam.parentElement.dataset.hhrRound).toBe('empty-request');
  expect(surgery.parentElement.dataset.hhrRound).toBe('empty-request');
  delete exam.dataset.hhrEmptyRequest;
  exam.textContent = 'Solicitud vigente';
  surgery.after(document.createElement('button'));
  layout.refresh(main);
  expect(exam.parentElement.dataset.hhrRound).toBe('peer');
  expect(surgery.parentElement.dataset.hhrRound).toBe('peer');
});

it('exposes nested MUI layout slots and preserves the sibling print action, draft and hidden print copy', () => {
  const group = body => '<section class="MuiBox-root"><div class="MuiGrid-container">' + body + '</div></section>';
  const printCopy = '<div style="display:none">' + slot('vitalSignsEntry', 'Impresión') + '</div>';
  document.body.innerHTML = '<main><div class="MuiGrid-container">' + printCopy +
    group(slot('observationEntrySection','Nota') + slot('shiftChangeEntrySection','<textarea></textarea>')) +
    group(slot('vitalSignsEntry','Signos') + '<div class="MuiGrid-item"><button>Imprimir</button></div>') +
    group(slot('alertEntrySection','Alertas') + slot('diagnosisTestEntrySection','Vacío')) + '</div></main>';
  const main = document.querySelector('main');
  const draft = main.querySelector('textarea'), print = main.querySelector('button');
  const originalParent = print.parentElement, original = main.innerHTML;
  const request = main.querySelector('#diagnosisTestEntrySection');
  request.dataset.hhrEmptyRequest = 'exam';
  draft.focus();
  draft.value = 'Borrador de prueba';
  layout.refresh(main);
  expect(main.querySelector('[data-hhr-round="frame"]')).toBe(main.firstElementChild);
  expect(main.querySelector('[data-hhr-round="vitals"]').textContent).toBe('Signos');
  expect(main.querySelector('[style="display:none"] [data-hhr-round]')).toBeNull();
  expect(getComputedStyle(main.querySelector('[style="display:none"]')).display).toBe('none');
  expect(main.querySelector('[data-hhr-round="alerts"]').textContent).toBe('Alertas');
  expect(request.parentElement.dataset.hhrRound).toBe('empty-request');
  expect(print.parentElement).toBe(originalParent);
  expect(print.closest('[data-hhr-round="vitals"],[data-hhr-round="empty-request"]')).toBeNull();
  expect(document.activeElement).toBe(draft);
  delete request.dataset.hhrEmptyRequest;
  layout.clear();
  expect(main.innerHTML).toBe(original);
  expect(draft.value).toBe('Borrador de prueba');
});

it.each([
  ['restEntrySection','Reposo','No se presenta un Reposo registrado para este paciente'],
  ['nutritionOrderEntrySection','Régimen','<b>Régimen:</b> Según tolerancia'],
])('compacts a single read-only instruction in its native section (%s)', (id,title,body) => {
  const card = '<div class="MuiCard-root"><div class="MuiCardHeader-root"><div class="MuiCardHeader-content">' +
    '<span class="MuiCardHeader-title">' + title + '</span></div></div><div class="MuiCardContent-root"><p>' + body +
    '</p></div></div>';
  document.body.innerHTML = '<main><div class="MuiGrid-container">' + slot('observationEntrySection','Nota') +
    slot('shiftChangeEntrySection','Entrega') + slot('vitalSignsEntry','Signos') + slot(id,card) + '</div></main>';
  const main = document.querySelector('main');
  layout.refresh(main);
  const care = main.querySelector('#' + id);
  expect(care.parentElement.dataset.hhrRound).toBe('care');
  expect(care.firstElementChild.dataset.hhrRound).toBe('care-row');
  expect(care.querySelector('[data-hhr-round="care-empty"],[data-hhr-round="care-value"]').textContent).toBe(
    id === 'restEntrySection' ? body : 'Régimen: Según tolerancia');
  const button = document.createElement('button');
  button.textContent = 'Acción de la indicación';
  care.append(button);
  layout.refresh(main);
  expect(care.closest('[data-hhr-round="care"]')).toBeNull();
  expect(care.querySelector('[data-hhr-round="care-row"]')).toBeNull();
});
