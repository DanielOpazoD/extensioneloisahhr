import {afterEach, expect, it, vi} from 'vitest';
import '../../../extension/hhr-ficha-order-details.js';
import '../../../extension/hhr-ficha-reading-surfaces.js';

const detail = (label, open = false) => '<div class="MuiBox-root"><p class="MuiTypography-root">' +
  label + (open ? ' final ficticio.' : '…') + '</p><button type="button" class="MuiButton-root">' +
  (open ? 'Ver menos' : 'Ver más') + '</button></div>';
const chip = label => '<span role="button" tabindex="0" class="MuiChip-root"><span class="MuiChip-label">' + label + '</span></span>';
function summary() {
  document.body.innerHTML = '<main><section id="medicationEntrySection"><h3>Fármacos</h3>' +
    '<table><thead><tr><th>Medicamento</th><th>Posología</th><th>Indicaciones específicas</th><th>Acciones</th></tr></thead>' +
    '<tbody><tr><td>Preparación ficticia ' + chip('SOS') + chip('Antimic.') + chip('Vigente') + '</td><td>' +
    detail('Instrucción A') + '</td><td>' + detail('Instrucción B') + '</td><td>' + detail('Acción') + '</td></tr></tbody></table></section>' +
    '<section class="MuiCard-root"><h3>Indicaciones libres</h3><table><thead><tr><th>Indicación</th></tr></thead>' +
    '<tbody><tr><td>' + detail('Instrucción C') + '</td></tr></tbody></table></section></main>';
  const reader = globalThis.HhrFichaReadingSurfaces.create();
  const main = document.querySelector('main');
  return {main, refresh:(compact = true) => reader.refresh(main, compact), clear:reader.clear};
}
function nativeDetails(main) {
  const clicks = [];
  main.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const group = button.parentElement;
    const native = group.querySelector('p');
    const label = native.textContent.replace(/(?:…| final ficticio\.)$/, '');
    const open = button.textContent === 'Ver más';
    clicks.push([label, open]);
    // React can replace the actual button + text in the same table cell.
    group.outerHTML = detail(label, open);
  });
  return clicks;
}
afterEach(() => document.body.replaceChildren());

it('materializa los tres textos en su propia fila y recupera sus controles al cambiar de tema', () => {
  const {main,refresh,clear} = summary(), clicks = nativeDetails(main);
  refresh(); refresh();
  expect(clicks).toEqual([['Instrucción A',true],['Instrucción B',true],['Instrucción C',true]]);
  const buttons = [...main.querySelectorAll('[data-hhr-reading="order-disclosure"]')];
  expect(buttons.map(button => button.previousElementSibling.textContent)).toEqual(
    ['Instrucción A final ficticio.','Instrucción B final ficticio.','Instrucción C final ficticio.']);
  expect([...main.querySelectorAll('[data-hhr-reading^="order-marker-"]')].map(node => [node.textContent,node.tabIndex,node.getAttribute('role')]))
    .toEqual([['SOS',0,'button'],['Antimic.',0,'button']]);
  refresh(false);
  expect(main.querySelector('[data-hhr-reading^="order-"]')).toBeNull();
  expect([...main.querySelectorAll('tbody button')].map(button => button.textContent)).toEqual(Array(4).fill('Ver más'));
  refresh(); clear();
  expect(main.querySelector('[data-hhr-reading]')).toBeNull();
  expect(clicks).toHaveLength(12);
});

it('mantiene accesibles los controles si falla la expansión o si muestra texto de otro origen', () => {
  const {main,refresh} = summary();
  const [slow,wrong,action] = main.querySelectorAll('button');
  const fail = vi.fn(), unrelated = vi.fn();
  slow.addEventListener('click', fail); action.addEventListener('click', unrelated);
  wrong.onclick = () => { wrong.textContent = 'Ver menos'; wrong.previousElementSibling.textContent = 'Otro texto ficticio.'; };
  refresh(); refresh();
  expect(fail).toHaveBeenCalledTimes(1);
  expect(unrelated).not.toHaveBeenCalled();
  expect(main.querySelector('[data-hhr-reading="order-disclosure"]')).toBeNull();
  slow.textContent = 'Ver menos';
  slow.previousElementSibling.textContent = 'Instrucción A final ficticio.';
  refresh();
  expect(slow.dataset.hhrReading).toBe('order-disclosure');
  slow.previousElementSibling.hidden = true;
  refresh();
  expect(slow.hasAttribute('data-hhr-reading')).toBe(false);
});

it('reconoce las filas que React reemplaza y respeta lo que ya estaba abierto', () => {
  const {main,refresh,clear} = summary();
  const first = main.querySelector('tbody tr');
  const existing = first.cells[1];
  existing.innerHTML = detail('Registro manual',true);
  const clicks = nativeDetails(main);
  refresh();
  first.insertAdjacentHTML('afterend','<tr><td>Preparación nueva</td><td>' + detail('Registro nuevo') + '</td><td>Breve</td><td></td></tr>');
  first.remove();
  refresh();
  const replacement = main.querySelector('tbody tr');
  expect(replacement.querySelector('[data-hhr-reading="order-disclosure"]').previousSibling.textContent).toBe('Registro nuevo final ficticio.');
  clear();
  expect(clicks.filter(([label]) => label === 'Registro manual')).toHaveLength(0);
  expect(clicks.filter(([label]) => label === 'Registro nuevo')).toEqual([['Registro nuevo',true],['Registro nuevo',false]]);
});

it('conserva acciones de formularios, diálogos y celdas con más de un control', () => {
  const {main,refresh} = summary(), clicks = vi.fn();
  const buttons = main.querySelectorAll('button');
  buttons[0].outerHTML = '<form><button type="submit">Ver más</button></form>';
  buttons[1].setAttribute('aria-haspopup','dialog');
  buttons[3].insertAdjacentHTML('afterend','<a href="#comentario">Comentario</a>');
  main.addEventListener('click',clicks);
  refresh();
  expect(clicks).not.toHaveBeenCalled();
  expect(main.querySelector('[data-hhr-reading="order-disclosure"]')).toBeNull();
});

it('conserva el control si un contenedor nativo todavía recorta el texto que terminó de cargar', () => {
  const {main,refresh,clear} = summary();
  const cell = main.querySelector('tbody tr').cells[1];
  const long = 'Instrucción A final ficticio.';
  cell.style.overflowY = 'hidden';
  Object.defineProperties(cell, {clientHeight:{value:20},scrollHeight:{value:60,configurable:true}});
  const button = cell.querySelector('button');
  button.addEventListener('click', () => {
    const open = button.textContent === 'Ver más';
    button.textContent = open ? 'Ver menos' : 'Ver más';
    button.previousElementSibling.textContent = open ? long : 'Instrucción A…';
  });
  refresh();
  expect(button.previousElementSibling.textContent).toBe(long);
  expect(button.hasAttribute('data-hhr-reading')).toBe(false);
  Object.defineProperty(cell,'scrollHeight',{value:20});
  refresh();
  expect(button.dataset.hhrReading).toBe('order-disclosure');
  clear();
  expect(button.textContent).toBe('Ver más');
});

it('restaura una apertura confirmada entre dos refrescos y conserva las aperturas del usuario', async () => {
  const {main,refresh} = summary();
  const [automatic, alreadyOpen,, manual] = main.querySelectorAll('tbody button');
  alreadyOpen.parentElement.outerHTML = detail('Abierta antes de la ronda',true);
  let manualEnabled = false;
  const toggle = button => {
    const open = button.textContent === 'Ver más';
    const text = button.previousElementSibling;
    const prefix = text.textContent.replace(/(?:…| final ficticio\.)$/, '');
    queueMicrotask(() => {
      text.textContent = prefix + (open ? ' final ficticio.' : '…');
      button.textContent = open ? 'Ver menos' : 'Ver más';
    });
  };
  automatic.onclick = () => toggle(automatic);
  manual.onclick = () => { if (manualEnabled) toggle(manual); };
  refresh();
  await Promise.resolve();
  expect(automatic.textContent).toBe('Ver menos');
  manualEnabled = true;
  manual.click();
  await Promise.resolve();
  refresh(false);
  await Promise.resolve();
  expect([...main.querySelectorAll('tbody button')].map(button => button.textContent))
    .toEqual(['Ver más','Ver menos','Ver más','Ver menos']);
});

it('marca la posología y el solicitante de una tabla de fármacos solo en la vista compacta', () => {
  document.body.innerHTML = '<main><section id="medicationEntrySection"><h3>Fármacos</h3><table><thead><tr>' +
    ['Tiempo','Indication','Posología','Indicaciones específicas','Solicitante','Acciones'].map(heading => '<th><p>' + heading + '</p></th>').join('') + '</tr></thead>' +
    '<tbody><tr><td>3</td><td>Preparación ficticia</td><td>1 cada 8 horas</td><td></td><td><span>Tomás Ejemplo</span></td><td><button type="button"></button></td></tr></tbody></table></section></main>';
  const reader = globalThis.HhrFichaReadingSurfaces.create(), main = document.querySelector('main');
  const marks = () => [...main.querySelectorAll('th,td')].map(cell => cell.getAttribute('data-hhr-reading'));
  reader.refresh(main, true);
  expect(marks()).toEqual(['narrow', null, 'order-posology', null, null, 'narrow', 'narrow', null, null, null, 'order-requester', 'narrow']);
  reader.refresh(main, false);
  expect(marks()).toEqual(['narrow', null, null, null, null, 'narrow', 'narrow', null, null, null, null, 'narrow']);
  reader.clear();
  expect(main.querySelector('[data-hhr-reading]')).toBeNull();
});
