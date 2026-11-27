// The reader of evolutions on the fictional Resumen: every profession, in place, without Historial.
// The worker is stood in by the harness; its own projection is checked on the same invented history.
// node scripts/capture-evolution-reader.mjs <ref|WORKTREE> <directory>
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { extensionSource, fichaAssets, mountFicha, settle } from './ficha-capture-harness.mjs';
import { summaryPage } from './summary-visual-fixture.mjs';
import '../extension/clinical-checklist-braden-templates.js';
import '../extension/clinical-checklist-braden.js';

const [revision, directory] = process.argv.slice(2);
if (!revision || !directory) throw Error('Uso: node scripts/capture-evolution-reader.mjs <ref|WORKTREE> <directorio>');

// An invented history, as Eloísa's report writes it: mainland wall clocks without offset.
const entry = (id, at, role, [first, last], note, more = {}) => ({id, OBE_NOTES:note, OBE_PUBLISH_DATETIME:at, HCPR_NAME:role, HCP_FGN:first, HCP_FFN:last, ...more});
function assessment(index, points, fecha, hora, piel = '') {
  const template = globalThis.HhrBradenTemplates[index];
  const fields = template.fields.filter(field => field.type === 'choice');
  const answers = {fecha, hora, piel};
  let remaining = points - fields.length;
  for (const field of fields) {
    const option = Math.min(remaining, field.options.length - 1);
    answers[field.id] = field.options[option].label;
    remaining -= option;
  }
  return globalThis.HhrChecklistBraden.buildDraftEvolutionText(template, answers);
}
const long = 'Paciente de simulación en buenas condiciones generales. ' + 'Sin cambios respecto del control anterior de la simulación. '.repeat(9);
const recent = [
  {publishDatetime:'2026-04-15T11:12:35', evolutionResume:[entry(41, '2026-04-15T11:12:35', 'Médico', ['Tomás', 'Ejemplo'], 'Evolución médica de prueba.\nPlan de la ronda: mantener conducta de la simulación.')]},
  {publishDatetime:'2026-04-15T09:40:00', evolutionResume:[entry(40, '2026-04-15T09:40:00', 'Enfermera(o)', ['Elena', 'Ejemplo'], '<p>Turno de noche de prueba sin incidentes.</p><p>PAM &lt;65 no registrada; diuresis conservada.</p>')]},
  {publishDatetime:'2026-04-14T18:05:00', evolutionResume:[entry(39, '2026-04-14T18:05:00', 'Kinesiólogo(a)', ['Rosa', 'Ejemplo'], 'Marcha asistida de prueba, tolera 20 m. Satura >94 % con FiO2 <30 %.')]},
  {publishDatetime:'2026-04-14T10:30:00', evolutionResume:[entry(38, '2026-04-14T10:30:00', 'Médico', ['Tomás', 'Ejemplo'], long, {OBE_AMENDED:true}),
    entry(37, '2026-04-14T10:10:00', 'Enfermera(o)', ['Elena', 'Ejemplo'], 'Nota de prueba anulada por su autora.', {IS_CROSSED_OUT:true})]},
  {publishDatetime:'2026-04-13T02:10:00', evolutionResume:[entry(36, '2026-04-13T02:10:00', 'Enfermera(o)', ['Marta', 'Ejemplo'], 'Ingreso de enfermería de prueba: paciente ficticio orientado.')]},
  {evolutionResume:[
    entry(51, '2026-04-15T13:00:00', 'Enfermera(o)', ['Elena', 'Ejemplo'],
      assessment(0, 15, '2026-04-14', '23:40', 'Piel íntegra en la simulación.')),
    entry(52, '2026-04-15T11:45:00', 'Enfermera(o)', ['Elena', 'Ejemplo'], assessment(1, 7, '2026-04-15', '08:30')),
    entry(53, '2026-04-15T10:15:00', 'Enfermera(o)', ['Marta', 'Ejemplo'], assessment(0, 16, '2026-04-14', '08:00'), {ARCHIVED:true}),
  ]},
];
const older = [...recent, {publishDatetime:'2026-03-02T12:00:00', evolutionResume:[
  entry(12, '2026-03-02T12:00:00', 'Nutricionista', ['Paula', 'Ejemplo'], 'Evaluación nutricional de prueba.'),
  entry(13, '2026-03-02T11:00:00', 'Enfermera(o)', ['Marta', 'Ejemplo'], assessment(0, 16, '2026-03-02', '08:30')),
  entry(14, '2026-03-01T11:00:00', 'Enfermera(o)', ['Marta', 'Ejemplo'], '#EscalaBraden\nPuntaje pendiente de confirmar.'),
]}];

await mkdir(directory, {recursive:true});
const assets = await fichaAssets(revision);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport:{width:1440, height:900}, deviceScaleFactor:1, locale:'es-CL', timezoneId:'Pacific/Easter'});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent(summaryPage());
  await settle(page);
  // What the worker would answer: its own projection of the invented history.
  await page.addScriptTag({content:await extensionSource(revision)('ficha-evolution-notes.js')});
  const notes = await page.evaluate(([recent, older]) => ({14:window.HhrFichaEvolutionNotes.project(recent), 60:window.HhrFichaEvolutionNotes.project(older), 365:'El servidor de Ficha Médico respondió HTTP 500.'}), [recent, older]);
  assert.deepEqual(notes[14].filter(note => Number(note.id) < 50).map(note => [note.id, note.day, note.time, note.role, note.author]), [
    ['41', '15-04-2026', '09:12', 'Médico', 'Tomás Ejemplo'], ['40', '15-04-2026', '07:40', 'Enfermera(o)', 'Elena Ejemplo'],
    ['39', '14-04-2026', '16:05', 'Kinesiólogo(a)', 'Rosa Ejemplo'], ['38', '14-04-2026', '08:30', 'Médico', 'Tomás Ejemplo'],
    ['37', '14-04-2026', '08:10', 'Enfermera(o)', 'Elena Ejemplo'], ['36', '13-04-2026', '00:10', 'Enfermera(o)', 'Marta Ejemplo'],
  ], 'El historial se lee de la más reciente a la más antigua, con la hora continental convertida a la de Rapa Nui');
  await mountFicha(page, assets, {notes});
  for (let turn = 0; turn < 4; turn++) { await page.evaluate(() => document.dispatchEvent(new Event('fixture-refresh'))); await settle(page); }

  const open = page.locator('#evolution').getByRole('button', {name:'Ver evoluciones', exact:true});
  const reader = page.getByRole('dialog', {name:'Evoluciones del episodio'});
  const filters = reader.getByRole('group', {name:'Evoluciones por profesión'});
  const shown = reader.locator('.hhr-evo-reader-note');
  const heads = () => shown.locator('header').evaluateAll(list => list.map(head => [...head.children].map(part => part.textContent).join(' | ')));
  await open.focus();
  await page.keyboard.press('Enter');
  await shown.first().waitFor();
  // The owner asked to read the evolutions of other professionals without going to Historial.
  assert.equal(await page.getByRole('tab', {name:'Resumen', exact:true}).getAttribute('aria-selected'), 'true', 'El lector se abre sobre el Resumen: no cambia de pestaña');
  assert.deepEqual(await page.evaluate(() => window.fichaNoteRequests), [['1', 14]], 'Lee una vez los últimos 14 días del episodio abierto');
  assert.deepEqual(await heads(), ['Médico | Tomás Ejemplo | 15-04-2026 · 09:12', 'Enfermera(o) | Elena Ejemplo | 15-04-2026 · 07:40', 'Kinesiólogo(a) | Rosa Ejemplo | 14-04-2026 · 16:05',
    'Médico | Tomás Ejemplo | 14-04-2026 · 08:30 | Enmendada', 'Enfermera(o) | Elena Ejemplo | 14-04-2026 · 08:10 | Tachada', 'Enfermera(o) | Marta Ejemplo | 13-04-2026 · 00:10'],
    'Cada evolución dice su profesión, su autor, su día y su hora, y si fue enmendada o tachada');
  assert.deepEqual(await filters.getByRole('button').evaluateAll(list => list.map(choice => choice.textContent + ' ' + choice.getAttribute('aria-pressed'))),
    ['Todas6 true', 'Enfermera(o)3 false', 'Kinesiólogo(a)1 false', 'Médico2 false'], 'Las profesiones presentes se eligen en una línea, con su número de notas');
  const texts = await shown.locator('p').allTextContents();
  assert.equal(texts[1], 'Turno de noche de prueba sin incidentes.\nPAM <65 no registrada; diuresis conservada.', 'Las marcas del editor de Eloísa se quitan y el texto queda');
  assert.equal(texts[2], 'Marcha asistida de prueba, tolera 20 m. Satura >94 % con FiO2 <30 %.', 'Un «<» que escribió el autor no se confunde con una marca');
  assert.ok(texts[0].includes('\nPlan de la ronda'), 'Los saltos de línea de la nota se conservan');
  const look = await reader.evaluate(dialog => {
    const box = el => el.getBoundingClientRect(), feed = dialog.querySelector('.hhr-evo-reader-feed'), note = dialog.querySelector('.hhr-evo-reader-note p');
    return {width:Math.round(box(dialog).width), height:Math.round(box(dialog).height), inside:box(dialog).bottom <= innerHeight && box(dialog).right <= innerWidth,
      overflow:getComputedStyle(feed).overflowY, size:getComputedStyle(note).fontSize, wrap:getComputedStyle(note).whiteSpace,
      muted:getComputedStyle(dialog.querySelector('[data-state="void"] p')).color !== getComputedStyle(note).color, modal:dialog.matches(':modal')};
  });
  // The window takes most of the screen (26-11-2026: the owner asked for more room to read); its text, a step
  // smaller than a line of the desk (27-11-2026: the owner asked for it a little smaller).
  assert.deepEqual(look, {width:1216, height:846, inside:true, overflow:'auto', size:'14px', wrap:'pre-wrap', muted:true, modal:true},
    'El lector ocupa la ventana de la nota completa, se desplaza dentro y atenúa la nota tachada: ' + JSON.stringify(look));
  await page.screenshot({path:path.join(directory, '1440-evoluciones-todas.png')});

  // One profession, with the keyboard.
  await filters.getByRole('button', {name:/^Enfermera\(o\)/}).press('Enter');
  assert.deepEqual((await heads()).map(head => head.split(' | ')[0]), ['Enfermera(o)', 'Enfermera(o)', 'Enfermera(o)'], 'Una profesión deja solo sus evoluciones');
  assert.equal(await filters.getByRole('button', {name:/^Enfermera\(o\)/}).evaluate(choice => choice === document.activeElement && choice.getAttribute('aria-pressed')), 'true', 'y el foco sigue en la profesión elegida');
  await page.screenshot({path:path.join(directory, '1440-evoluciones-enfermeria.png')});
  await filters.getByRole('button', {name:/^Todas/}).click();

  await reader.getByRole('button', {name:'Scores', exact:true}).press('Enter');
  const scoresDialog = page.getByRole('dialog', {name:'Scores del episodio'});
  const table = scoresDialog.getByRole('table', {name:'Valoraciones Braden del episodio'});
  const scoreRows = table.locator('tbody tr:not(.hhr-score-detail)');
  assert.deepEqual(await table.getByRole('columnheader').allTextContents(),
    ['Escala', 'Fecha de valoración', 'Puntaje', 'Riesgo', 'Próxima valoración']);
  const cells = () => scoreRows.evaluateAll(rows => rows.map(row => [...row.cells].map(cell => cell.innerText.trim())));
  assert.deepEqual(await cells(), [
    ['Braden Q', '15-04-2026 · 08:30', '7 / 28', 'Alto', '16-04-2026 · 08:30'],
    ['Braden adulto', '14-04-2026 · 23:40', '15 / 23', 'Moderado', '17-04-2026 · 23:40'],
    ['Braden adulto\nArchivada', '14-04-2026 · 08:00', '16 / 23', 'Bajo', '—'],
  ], 'El orden y los plazos se calculan desde la fecha de valoración, no desde su publicación');
  assert.deepEqual(await page.evaluate(() => window.fichaNoteRequests), [['1', 14]], 'Scores y Evoluciones comparten la lectura');
  const noteLink = table.getByRole('button', {name:'Braden adulto, nota del 14-04-2026 · 23:40', exact:true});
  await noteLink.press('Enter');
  await table.getByText('Observaciones de piel e intervenciones: Piel íntegra en la simulación.', {exact:false}).waitFor();
  assert.equal(await noteLink.getAttribute('aria-expanded'), 'true');
  await noteLink.press('Enter');
  await page.screenshot({path:path.join(directory, '1440-scores.png')});
  await page.setViewportSize({width:390, height:844});
  const scroll = scoresDialog.getByRole('region', {name:'Historial de Scores'});
  const narrow = await scroll.evaluate(el => ({ tabIndex:el.tabIndex, scroll:el.scrollWidth, width:el.clientWidth,
    inViewport:el.closest('dialog').getBoundingClientRect().right <= innerWidth }));
  assert.ok(narrow.tabIndex === 0 && narrow.scroll <= narrow.width + 1 && narrow.inViewport,
    'Las cinco columnas caben en una pantalla estrecha: ' + JSON.stringify(narrow));
  await page.screenshot({path:path.join(directory, '390-scores.png')});
  await page.setViewportSize({width:1440, height:900});
  await scoresDialog.getByRole('button', {name:'Evoluciones', exact:true}).click();
  assert.equal(await shown.count(), 6, 'Las valoraciones válidas no aparecen en Evoluciones');

  // Older notes are asked for, never read by default. A failed read says so: it is not «no evolutions».
  const more = reader.getByRole('button', {name:'Ver más antiguas (últimos 60 días)', exact:true});
  await more.click();
  await reader.getByText('Nutricionista', {exact:true}).first().waitFor();
  assert.equal(await shown.count(), 8);
  await reader.getByText('Puntaje pendiente de confirmar.', {exact:false}).waitFor();
  assert.equal(await reader.locator('small').textContent(), 'Últimos 60 días · hora de Rapa Nui');
  await reader.getByRole('button', {name:'Scores', exact:true}).click();
  assert.equal(await scoreRows.count(), 4);
  assert.deepEqual((await cells()).at(-1), ['Braden adulto', '02-03-2026 · 08:30', '16 / 23', 'Bajo', '09-03-2026 · 08:30']);
  await scoresDialog.getByRole('button', {name:'Evoluciones', exact:true}).click();
  await reader.getByRole('button', {name:'Ver más antiguas (último año)', exact:true}).click();
  const status = reader.getByRole('status');
  await reader.getByRole('button', {name:'Reintentar', exact:true}).waitFor();
  assert.equal(await status.textContent(), 'El servidor de Ficha Médico respondió HTTP 500.');
  assert.equal(await shown.count(), 8, 'Una lectura fallida conserva las evoluciones ya leídas');
  assert.deepEqual(await page.evaluate(() => window.fichaNoteRequests.map(([, days]) => days)), [14, 60, 365]);
  await page.evaluate(() => { window.fichaNotes = {365:[]}; });
  await reader.getByRole('button', {name:'Reintentar', exact:true}).click();
  await reader.getByText('Sin evoluciones en el último año.', {exact:true}).waitFor();
  assert.equal(await shown.count(), 0);
  await page.evaluate(() => { delete window.fichaNotes; });

  // Escape closes it and gives the focus back. Nothing of the notes stays in the page.
  await page.keyboard.press('Escape');
  await reader.waitFor({state:'detached'});
  assert.ok(await open.evaluate(button => button === document.activeElement), 'Al cerrar, el foco vuelve a «Ver evoluciones»');
  assert.equal(await page.locator('.hhr-evo-reader, .hhr-evo-reader-note').count(), 0);

  // Historial keeps its own filter by author, one step away.
  await page.getByRole('tab', {name:'Historial', exact:true}).evaluate(tab => { tab.addEventListener('click', () => { window.historyOpened = (window.historyOpened || 0) + 1; }); });
  await open.click();
  await shown.first().waitFor();
  await reader.getByRole('button', {name:'Ver en Historial', exact:true}).click();
  await reader.waitFor({state:'detached'});
  assert.equal(await page.evaluate(() => window.historyOpened), 1, '«Ver en Historial» abre la pestaña Historial, como hacía el botón');

  // The ficha moves to another episode with the reader open: the notes of the first leave the page.
  await page.evaluate(() => { window.fichaFixture.authors.refresh('1'); });
  await open.click();
  await shown.first().waitFor();
  await page.evaluate(() => { window.fichaFixture.authors.refresh('2'); });
  await reader.waitFor({state:'detached'});
  assert.equal(await page.locator('.hhr-evo-reader-note').count(), 0, 'Al cambiar de episodio no queda ninguna nota del anterior');
  // An answer for another episode is never shown.
  await page.evaluate(() => { window.fichaFixture.authors.refresh('1'); window.fichaNotes = null; });
  if (errors.length) throw Error(errors.join('\n'));
  await page.close();
} finally {
  await browser.close();
}
console.info('Lector de evoluciones', assets.version, 'comprobado');
