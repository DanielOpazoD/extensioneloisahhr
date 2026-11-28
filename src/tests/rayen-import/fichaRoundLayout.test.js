// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import '../../../extension/ficha/hhr-ficha-round-layout.js';

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

it('pairs two empty requests on the last line, stacks the alerts under the handoff and lets them fill the line of the note', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({matches:true, addEventListener() {}, removeEventListener() {}}));
  const heights = {observationEntrySection:200, vitalSignsEntry:90, shiftChangeEntrySection:30, alertEntrySection:120,
    diagnosisTestEntrySection:27, operationTheaterRequestEntrySection:45};
  vi.spyOn(Element.prototype,'getBoundingClientRect').mockImplementation(function () {
    return {height:heights[this.firstElementChild?.id] ?? 0};
  });
  const desktop = globalThis.HhrFichaRoundLayout.create();
  try {
    document.body.innerHTML = '<main><div class="MuiGrid-container">' +
      slot('observationEntrySection','Nota') + slot('shiftChangeEntrySection','<textarea></textarea>') +
      slot('vitalSignsEntry','Signos') + slot('alertEntrySection','<button>Archivar</button>') +
      slot('diagnosisTestEntrySection','Sin solicitudes') + slot('operationTheaterRequestEntrySection','Sin solicitudes') +
      '</div></main>';
    const main = document.querySelector('main'), original = main.innerHTML;
    const item = id => main.querySelector('#' + id).parentElement;
    const offset = id => item(id).style.getPropertyValue('--hhr-round-offset');
    const exam = main.querySelector('#diagnosisTestEntrySection'), surgery = main.querySelector('#operationTheaterRequestEntrySection');
    exam.dataset.hhrEmptyRequest = 'exam';
    surgery.dataset.hhrEmptyRequest = 'surgery';
    desktop.refresh(main);
    expect(main.firstElementChild.hasAttribute('data-hhr-round-columns')).toBe(true);
    expect([exam,surgery].map(el => el.parentElement.dataset.hhrRoundHalf)).toEqual(['start','end']);
    // The signs and the requests take a line of the grid each: only what shares a line and a column stacks.
    expect(['observationEntrySection','vitalSignsEntry'].map(offset)).toEqual(['0px','']);
    expect(['shiftChangeEntrySection','alertEntrySection','diagnosisTestEntrySection','operationTheaterRequestEntrySection'].map(offset))
      .toEqual(['0px','30px','','']);
    // The alerts end where the note ends: they take the height the handoff leaves beside it.
    const fill = id => item(id).style.getPropertyValue('--hhr-round-fill');
    expect(['observationEntrySection','shiftChangeEntrySection','alertEntrySection'].map(fill)).toEqual(['','','170px']);
    // A taller note gives them its height on the next packing. Their own height is never read back.
    heights.observationEntrySection = 260;
    heights.alertEntrySection = 400;
    desktop.repack();
    expect(fill('alertEntrySection')).toBe('230px');
    heights.observationEntrySection = 200;
    desktop.repack();
    expect(fill('alertEntrySection')).toBe('170px');

    // A request with a record leaves the pair. The remaining notice takes the whole line.
    delete exam.dataset.hhrEmptyRequest;
    desktop.refresh(main);
    expect(exam.parentElement.dataset.hhrRound).toBe('peer');
    expect(main.querySelector('[data-hhr-round-half]')).toBeNull();
    expect(offset('operationTheaterRequestEntrySection')).toBe('');
    expect(offset('diagnosisTestEntrySection')).toBe('');
    expect(fill('alertEntrySection')).toBe('170px');

    exam.dataset.hhrEmptyRequest = 'exam';
    desktop.refresh(main);
    expect([exam,surgery].map(el => el.parentElement.dataset.hhrRoundHalf)).toEqual(['start','end']);
    delete exam.dataset.hhrEmptyRequest;
    delete surgery.dataset.hhrEmptyRequest;
    desktop.clear();
    for (const el of main.querySelectorAll('[style=""]')) el.removeAttribute('style');
    expect(main.innerHTML).toBe(original);
  } finally {
    desktop.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
});

it('does not reserve a line of the round for a leading row docked on the section links', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({matches:true, addEventListener() {}, removeEventListener() {}}));
  vi.spyOn(Element.prototype,'getClientRects').mockReturnValue([{width:10,height:10}]);
  const desktop = globalThis.HhrFichaRoundLayout.create();
  try {
    document.body.innerHTML = '<main><div class="MuiGrid-container"><div class="MuiGrid-item MuiGrid-grid-xs-12"><input type="date"></div>' +
      slot('observationEntrySection','Nota') + slot('shiftChangeEntrySection','<textarea></textarea>') +
      slot('vitalSignsEntry','Signos') + '</div></main>';
    const main = document.querySelector('main'), frame = main.firstElementChild, daily = frame.firstElementChild;
    desktop.refresh(main);
    expect(daily.dataset.hhrRound).toBe('before');
    expect(frame.style.getPropertyValue('--hhr-round-line')).toBe('2');
    // The caller docks or releases the row and needs the lines right before the next paint.
    daily.setAttribute('data-hhr-ficha-dock','');
    desktop.repack();
    expect(frame.style.getPropertyValue('--hhr-round-line')).toBe('1');
    daily.removeAttribute('data-hhr-ficha-dock');
    desktop.repack();
    expect(frame.style.getPropertyValue('--hhr-round-line')).toBe('2');
    daily.setAttribute('data-hhr-ficha-dock','');
    desktop.clear();
    desktop.refresh(main);
    expect(frame.style.getPropertyValue('--hhr-round-line')).toBe('1');
  } finally {
    desktop.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
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

// The shapes read in Eloísa (docs/estructura-eloisa.md): an empty rest is a card without its section,
// «Imprimir indicaciones» is an icon alone on its line, and the diagnosis is a table after the prescriptions.
const realCard = (id, title, body) => '<div class="MuiPaper-root MuiCard-root" id="'+id+'"><div class="MuiCardHeader-root"><div class="MuiCardHeader-content">' +
  '<span class="MuiCardHeader-title">'+title+'</span><span class="MuiCardHeader-subheader"></span></div><div class="MuiCardHeader-action"><div class="MuiStack-root"></div></div></div>' +
  '<div class="MuiCardContent-root">'+body+'</div></div>';
const realItem = (content, attributes = '') => '<div class="MuiGrid-item MuiGrid-grid-xs-12"'+attributes+'>'+content+'</div>';
const realSection = (id, cardId, title, body) => '<section class="MuiBox-root" id="'+id+'">'+realCard(cardId, title, body)+'</section>';
const realTable = headings => '<table><thead><tr>'+headings.map(heading => '<th><p>'+heading+'</p></th>').join('')+'</tr></thead><tbody><tr>'+headings.map(() => '<td></td>').join('')+'</tr></tbody></table>';
function realSummary({second = 'Diagnóstico', printName = 'Imprimir indicaciones', folded = ''} = {}) {
  document.body.innerHTML = '<main><div class="MuiGrid-container">' +
    '<div class="MuiGrid-item MuiGrid-grid-xs-6"><div class="MuiGrid-container">'+realItem(realSection('observationEntrySection','evolution','Evolución','Nota'))+'</div></div>' +
    realItem(realSection('shiftChangeEntrySection','shiftChangeObservation','Observaciones de entrega de turno','<input>')) +
    realItem(realSection('vitalSignsEntry','vitals','Signos vitales','')) +
    '<div class="MuiGrid-item MuiGrid-grid-xs-12" id="print-line"><button type="button" class="MuiIconButton-root"><svg aria-label="'+printName+'"></svg></button></div>' +
    '<div class="MuiGrid-item MuiGrid-grid-xs-6" id="care-item"><div class="MuiGrid-container">' +
      realItem(realCard('rest','Reposo','<p class="MuiTypography-body2">No se presenta un Reposo registrado para este paciente</p>')) +
      realItem(realSection('nutritionOrderEntrySection','nutritionOrder','Régimen','<div class="MuiStack-root"><div class="MuiStack-root"><p>Régimen:</p>' +
        '<div class="MuiChip-root"><span class="MuiChip-label">Común</span></div><div class="MuiBox-root"><span class="MuiTypography-caption"></span></div></div>' +
        '<div class="MuiStack-root"><p>Observación:</p><div class="MuiBox-root"><span class="MuiTypography-caption">Porciones pequeñas.</span></div></div></div>')) + '</div></div>' +
    realItem(realSection('alertEntrySection','alertEntries','Alertas','')) +
    realItem(realSection('encounterFormEntrySection','encounterForm','Instrumentos','Vacío'), folded) +
    realItem(realSection('medicationEntrySection','medicationEntry','Fármacos',realTable(['Tiempo','Indication']))) +
    realItem(realSection('diagnosisEntrySection','diagnosisEntry','Diagnóstico',realTable(['',second,'Estado']))) + '</div></main>';
  return document.querySelector('main');
}
const role = selector => document.querySelector(selector).closest('.MuiGrid-container > .MuiGrid-item:not(.MuiGrid-container .MuiGrid-container *)')?.getAttribute('data-hhr-round') ?? null;

it('reads an empty rest without its section, marks the diagnosis that opens the round and docks the print icon on Fármacos', () => {
  const main = realSummary({folded:' hidden'}), original = main.innerHTML;
  layout.refresh(main);
  expect(document.getElementById('rest').dataset.hhrRound).toBe('care-row');
  expect(document.querySelector('#rest p').dataset.hhrRound).toBe('care-empty');
  expect(document.querySelector('#nutritionOrder [data-hhr-round="care-value"] .MuiChip-label').textContent).toBe('Común');
  expect(document.querySelector('#nutritionOrder [data-hhr-round="care-observation"]').textContent).toContain('Porciones pequeñas.');
  expect([role('#rest'), role('#diagnosisEntrySection'), role('#medicationEntrySection'), document.getElementById('print-line').dataset.hhrRound])
    .toEqual(['care', 'diagnosis', 'peer', 'print']);

  const changes = new MutationObserver(() => {});
  changes.observe(main, {subtree:true, attributes:true, childList:true});
  layout.refresh(main);
  expect(changes.takeRecords()).toHaveLength(0);
  changes.disconnect();
  layout.clear();
  expect(main.innerHTML).toBe(original);
});

it('reads an empty rest under «Sin datos» and leaves its card in the block it shares with Régimen', () => {
  const main = realSummary({folded:' hidden'}), original = main.innerHTML;
  // The reading surfaces mark Eloísa's sentence of an empty rest as the state of an empty section.
  document.getElementById('rest').setAttribute('data-hhr-reading', 'status-card');
  const marked = main.innerHTML;
  layout.refresh(main);
  const restItem = document.getElementById('rest').parentElement;
  expect(restItem.dataset.hhrRound).toBe('care-hidden');
  expect(document.querySelector('#rest [data-hhr-round]')).toBeNull();
  const proxy = document.querySelector('[data-hhr-round-proxy="rest"]');
  expect([proxy.previousElementSibling.id, proxy.dataset.hhrRound, proxy.getAttribute('aria-hidden'), proxy.textContent]).toEqual(['care-item', 'peer', 'true', 'Reposo']);
  expect(document.querySelector('#nutritionOrder [data-hhr-round="care-value"] .MuiChip-label').textContent).toBe('Común');
  // The print line still finds Fármacos past the name of the view.
  expect(document.getElementById('print-line').dataset.hhrRound).toBe('print');
  layout.clear();
  expect(main.innerHTML).toBe(marked);
  document.getElementById('rest').removeAttribute('data-hhr-reading');
  expect(main.innerHTML).toBe(original);
});

it('docks the print icon on Fármacos also when Eloísa wraps its card in a second section', () => {
  const main = realSummary({folded:' hidden'});
  const section = document.getElementById('medicationEntrySection');
  section.innerHTML = '<section class="MuiBox-root" id="dilutionEntrySection">' + section.innerHTML + '</section>';
  layout.refresh(main);
  expect([role('#medicationEntrySection'), document.getElementById('print-line').dataset.hhrRound]).toEqual(['peer', 'print']);
  // Anything else beside the card in that section is not the shape that was read.
  document.getElementById('dilutionEntrySection').after(document.createElement('div'));
  layout.refresh(main);
  expect(document.getElementById('print-line').dataset.hhrRound).toBe('peer');
  layout.clear();
});

it('leaves a table of another kind, an icon of another name and a line followed by another card where they are', () => {
  layout.refresh(realSummary({second:'Problema', folded:' hidden'}));
  expect([role('#diagnosisEntrySection'), document.getElementById('print-line').dataset.hhrRound]).toEqual(['peer', 'print']);
  layout.refresh(realSummary({printName:'Imprimir resumen', folded:' hidden'}));
  expect([role('#diagnosisEntrySection'), document.getElementById('print-line').dataset.hhrRound]).toEqual(['diagnosis', 'peer']);
  // A card drawn between the line and Fármacos: the line keeps its place above it.
  layout.refresh(realSummary());
  expect(document.getElementById('print-line').dataset.hhrRound).toBe('peer');
  // A rest card with a control of its own is not a line to read.
  const main = realSummary({folded:' hidden'});
  document.querySelector('#rest .MuiCardHeader-action > .MuiStack-root').append(document.createElement('button'));
  layout.refresh(main);
  expect([document.getElementById('rest').dataset.hhrRound, document.getElementById('print-line').dataset.hhrRound]).toEqual([undefined, 'peer']);
  // The icon button with a second control beside it is not the line that was recognized.
  const busy = realSummary({folded:' hidden'});
  document.getElementById('print-line').append(document.createElement('button'));
  layout.refresh(busy);
  expect(document.getElementById('print-line').dataset.hhrRound).toBe('peer');
});

it('asks for the whole shape before it moves the diagnosis or docks the print icon', () => {
  const printRole = () => document.getElementById('print-line').dataset.hhrRound;
  const diagnosisRole = () => role('#diagnosisEntrySection');
  const withShape = change => { const main = realSummary({folded:' hidden'}); change(main); layout.refresh(main); };
  const card = () => document.querySelector('#diagnosisEntry'), table = () => card().querySelector('table');

  // The diagnosis: one table, one line of headings, a title, and nothing else in the card.
  withShape(() => table().after(table().cloneNode(true)));
  expect(diagnosisRole()).toBe('peer');
  withShape(() => { table().tBodies[0].rows[0].cells[0].innerHTML = '<table><tbody><tr><td></td></tr></tbody></table>'; });
  expect(diagnosisRole()).toBe('peer');
  withShape(() => table().tHead.append(table().tHead.rows[0].cloneNode(true)));
  expect(diagnosisRole()).toBe('peer');
  withShape(() => table().tHead.rows[0].cells[2].remove());
  expect(diagnosisRole()).toBe('peer');
  withShape(() => card().append(document.createElement('footer')));
  expect(diagnosisRole()).toBe('peer');
  withShape(() => card().querySelector('.MuiCardHeader-title').remove());
  expect(diagnosisRole()).toBe('peer');
  withShape(() => { card().querySelector('.MuiCardContent-root').innerHTML = '<p>No presenta diagnósticos registrados</p>'; });
  expect(diagnosisRole()).toBe('peer');
  // Beside another card in a nested row, or outside the grid of the round, it stays where it is.
  withShape(() => {
    const item = document.getElementById('diagnosisEntrySection').parentElement, row = document.createElement('div');
    row.className = 'MuiGrid-container';
    item.before(row);
    row.append(item, Object.assign(document.createElement('div'), {className:'MuiGrid-item', textContent:'Otra tarjeta'}));
    const outer = document.createElement('div');
    outer.className = 'MuiGrid-item';
    row.before(outer);
    outer.append(row);
  });
  expect(document.querySelector('[data-hhr-round="diagnosis"]')).toBeNull();
  withShape(main => main.append(document.getElementById('diagnosisEntrySection')));
  expect(document.querySelector('[data-hhr-round="diagnosis"]')).toBeNull();
  // A table without records is still the table of diagnoses.
  withShape(() => table().tBodies[0].replaceChildren());
  expect(diagnosisRole()).toBe('diagnosis');

  // The print line: an enabled icon button alone in its grid item, with nothing written beside it.
  const line = () => document.getElementById('print-line');
  withShape(() => { line().firstElementChild.disabled = true; });
  expect(printRole()).toBe('peer');
  withShape(() => line().append('Imprimir'));
  expect(printRole()).toBe('peer');
  withShape(() => line().append(document.createElement('img')));
  expect(printRole()).toBe('peer');
  withShape(() => line().classList.remove('MuiGrid-item'));
  expect(printRole()).toBe('peer');
  // Fármacos must be the card that follows, with a title and no byline beside it.
  withShape(() => document.querySelector('#medicationEntry .MuiCardHeader-title').remove());
  expect(printRole()).toBe('peer');
  withShape(() => { document.querySelector('#medicationEntry .MuiCardHeader-subheader').textContent = 'Última actualización: hoy'; });
  expect(printRole()).toBe('peer');
  // A section folded with a style, as the compact view folds an empty one, is not drawn between them.
  const main = realSummary();
  document.getElementById('encounterFormEntrySection').parentElement.style.display = 'none';
  layout.refresh(main);
  expect(printRole()).toBe('print');
});
