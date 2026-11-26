// Render a fictional medical worklist with the presentation of a revision, and check what it promises.
// The rows go through the extension's own adapter, as Eloísa's table does. The patient column is as
// narrow as the page draws it (26-11-2026): a name was broken inside its words beside a native «Nuevo».
// node scripts/capture-medical-worklist.mjs <ref|WORKTREE> <directory>
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const [revision, directory] = process.argv.slice(2);
if (!revision || !directory) throw Error('Uso: node scripts/capture-medical-worklist.mjs <ref|WORKTREE> <directorio>');
const source = file => revision === 'WORKTREE' ? readFile(path.join('extension', file), 'utf8') :
  execFileSync('git', ['show', revision + ':extension/' + file], {encoding:'utf8'});
const [adapter, presentation] = await Promise.all(['hhr-worklist-print-column.js', 'hhr-native-worklist-presentation.js'].map(source));

// Invented patients. The second and the fourth are new, as Eloísa marks them.
const patients = [['Paciente Sintético Ejemplo', false], ['Persona De Prueba Larga', true], ['Caso Ficticio', false],
  ['María Eugenia Villaficticia', true], ['Otro Paciente Simulado', false]];
const html = `<!doctype html><html lang="es"><meta charset="utf-8"><style>
  body{margin:0;background:#f1f1f1;color:rgba(0,0,0,.87);font:14px/1.43 Arial,"Liberation Sans",sans-serif}
  header.MuiAppBar-root{height:52px;background:#218b80}main{padding:8px 64px}
  table{width:100%;border-collapse:collapse;background:#fff}td,th{padding:16px;border-bottom:1px solid #e0e0e0;text-align:left;vertical-align:middle}
  /* The width Eloísa leaves the patient in this list. */
  .fixture-patient{width:110px;max-width:110px}
  .MuiStack-root{display:flex;flex-direction:column}.fixture-name{display:flex;align-items:center}.MuiTypography-root{margin:0}
  .MuiChip-root{display:inline-flex;align-items:center;height:24px;border-radius:16px;background:#ed6c02;color:#fff;font-size:13px}.MuiChip-label{padding:0 8px}
  .MuiPaper-root{background:#fff}a{color:inherit;text-decoration:none}
</style><header class="MuiAppBar-root"></header><main><div class="MuiBox-root" style="display:flex;flex-direction:column">
  <div role="tablist"><button role="tab" aria-selected="true">Pacientes sin médico</button></div>
  <div class="MuiPaper-root"><input id="search-encounter-list"></div>
  <div role="tabpanel"><div><h6>Resultados de búsqueda no asignados (${patients.length})</h6></div>
    <div><div class="MuiTableContainer-root"><table><thead><tr></tr></thead><tbody></tbody></table></div></div></div>
</div></main>`;

// Stand-in for React: the adapter only needs elements it can read and rebuild.
function draw(patients, route) {
  const jsx = (type, props, key) => ({type, props, key});
  const render = (node, svg = false) => {
    if (node == null || typeof node === 'boolean') return document.createTextNode('');
    if (typeof node !== 'object') return document.createTextNode(String(node));
    if (Array.isArray(node)) { const group = document.createDocumentFragment(); group.append(...node.map(child => render(child, svg))); return group; }
    const {type, props} = node, vector = svg || type === 'svg';
    const el = vector ? document.createElementNS('http://www.w3.org/2000/svg', type) : document.createElement(type);
    for (const [name, value] of Object.entries(props)) {
      if (name === 'children' || value == null || value === false || typeof value === 'object' || typeof value === 'function') continue;
      el.setAttribute(name === 'className' ? 'class' : name, value);
    }
    el.append(render(props.children ?? [], vector));
    return el;
  };
  const columns = [['location', 'Ubicación'], ['patient', 'Paciente'], ['age', 'Edad'], ['ges', 'GES'], ['diagnosisAdmission', 'Diagnóstico Ingreso'],
    ['origin', 'Origen'], ['stay', 'Estadía'], ['assignment', 'Asignación'], ['link', '']].map(([id, label]) => ({id, label}));
  const rows = patients.map(([name, isNew], at) => {
    const href = route + '/' + (9001 + at);
    const patient = jsx('div', {className:'MuiStack-root', children:[
      jsx('a', {href, children:jsx('span', {className:'fixture-name', children:[
        jsx('span', {administrativeSexId:2, 'aria-hidden':true, children:'♀'}),
        jsx('strong', {className:'MuiTypography-root', fontWeight:'bold', children:name}),
        ...(isNew ? [jsx('span', {className:'MuiChip-root', label:'Nuevo', color:'warning', children:jsx('span', {className:'MuiChip-label', children:'Nuevo'})})] : []),
      ]})}),
      jsx('span', {title:'0000000' + at + '-0', children:jsx('span', {children:['RUN', ' ', ': 0.000.00' + at + '-0']})}),
    ]});
    const cells = [['AMQI', jsx('br', {}), 'R' + (at + 1)], patient, '5' + at + ' a', 'No GES', 'Diagnóstico de prueba de la simulación',
      'AMQI', ['0' + at + ' días', jsx('br', {}), '26-11-2026'], jsx('select', {'aria-label':'Asignación', children:jsx('option', {children:'Sin asignación'})}),
      jsx('a', {LinkComponent:'a', href, children:'>'})];
    return jsx('tr', {children:cells.map((child, index) => jsx('td', {className:index === 1 ? 'fixture-patient' : undefined, children:child}))}, at);
  });
  const adapted = globalThis.HhrWorklistPrintColumn.adapt(jsx, {columns, listLenght:rows.length, children:rows}, route);
  document.querySelector('thead tr').replaceChildren(...adapted.columns.map(column => render(jsx('th', {children:column.label}))));
  document.querySelector('tbody').replaceChildren(...adapted.children.map(row => render(row)));
  globalThis.HhrNativeWorklistPresentation.create({}).refresh(route);
}

const read = page => page.evaluate(() => {
  const lines = el => { const range = new Range(); range.selectNodeContents(el); return new Set([...range.getClientRects()].map(box => Math.round(box.top))).size; };
  const names = [...document.querySelectorAll('tbody td:nth-child(2) strong')];
  // A word drawn in more than one piece was broken inside.
  const broken = names.flatMap(name => [...name.textContent.matchAll(/\S+/g)].filter(match => {
    const range = new Range(); range.setStart(name.firstChild, match.index); range.setEnd(name.firstChild, match.index + match[0].length);
    return range.getClientRects().length !== 1;
  }).map(match => match[0]));
  const chips = [...document.querySelectorAll('tbody .MuiChip-root')].map(chip => { const look = getComputedStyle(chip), box = chip.getBoundingClientRect(), cell = chip.closest('td').getBoundingClientRect();
    return {marked:chip.hasAttribute('data-hhr-new-patient-chip'), surface:look.backgroundColor, ink:look.color, height:Math.round(box.height), size:look.fontSize, inside:box.left >= cell.left && box.right <= cell.right + 1}; });
  return {marked:document.querySelector('table').hasAttribute('data-hhr-compact-worklist'), layout:document.querySelector('[data-hhr-worklist-layout]')?.getAttribute('data-hhr-worklist-layout'),
    patient:Math.round(document.querySelector('tbody td:nth-child(2)').getBoundingClientRect().width), rows:[...document.querySelectorAll('tbody tr')].map(row => Math.round(row.getBoundingClientRect().height)),
    nameLines:names.map(lines), broken, chips, runs:document.querySelectorAll('tbody button[data-hhr-copy-run]').length,
    overflow:document.documentElement.scrollWidth > innerWidth};
});

await mkdir(directory, {recursive:true});
const browser = await chromium.launch();
try {
  for (const [width, height] of [[1280, 520], [1440, 520]]) {
    const page = await browser.newPage({viewport:{width, height}, deviceScaleFactor:1, locale:'es-CL', timezoneId:'Pacific/Easter'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent(html);
    await page.addScriptTag({content:adapter});
    await page.addScriptTag({content:presentation});
    await page.evaluate(`(${draw})(${JSON.stringify(patients)}, '/dashboard/encounter-list')`);
    await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
    const shown = await read(page);
    console.info('Lista médica sintética', revision, width, JSON.stringify({paciente:shown.patient, filas:shown.rows, lineasDelNombre:shown.nameLines, nuevo:shown.chips[0]?.surface}));
    await page.screenshot({path:path.join(directory, width + '-lista-medica.png')});
    if (revision === 'WORKTREE') {
      assert.ok(shown.marked && shown.layout === 'medical' && shown.runs === patients.length, 'La lista médica ficticia se reconoce como la de Eloísa: ' + JSON.stringify(shown));
      // The owner asked for the medical list to read like the care list.
      assert.deepEqual(shown.broken, [], 'Ningún nombre se parte dentro de una palabra');
      assert.ok(shown.nameLines.every(count => count === 1) && shown.patient >= 240, 'Cada nombre de la ficha de prueba cabe en una línea de su columna: ' + JSON.stringify([shown.patient, shown.nameLines]));
      assert.ok(Math.max(...shown.rows) - Math.min(...shown.rows) <= 1 && shown.rows[0] <= 56, 'Todas las filas miden lo mismo, un nombre y su RUN: ' + shown.rows);
      assert.ok(shown.chips.length === 2 && shown.chips.every(chip => chip.marked && chip.surface === 'rgb(232, 243, 238)' && chip.ink === 'rgb(34, 90, 69)' && chip.height === 16 && chip.size === '10px' && chip.inside),
        '«Nuevo» se lee como en Gestión de cuidados, tras el nombre: ' + JSON.stringify(shown.chips));
      assert.ok(!shown.overflow, 'La lista cabe en la ventana');
      // A small screen keeps Eloísa's widths and its sideways scroll.
      await page.setViewportSize({width:800, height});
      const small = await read(page);
      assert.ok(small.patient < 240 && small.chips.every(chip => chip.marked), 'Bajo 900 px la columna conserva el ancho de Eloísa: ' + small.patient);
    }
    if (errors.length) throw Error(errors.join('\n'));
    await page.close();
  }
} finally {
  await browser.close();
}
