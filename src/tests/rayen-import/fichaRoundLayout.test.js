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
