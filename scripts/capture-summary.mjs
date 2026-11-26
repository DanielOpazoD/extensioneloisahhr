// Render the fictional Resumen that follows the real structure with the presentation of a revision.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fichaAssets, mountFicha, settle, wideSans } from './ficha-capture-harness.mjs';
import { summaryDiagnoses, summaryMedications, summaryPage } from './summary-visual-fixture.mjs';

const refresh = async page => {
  // The readers materialize each cut text with Eloísa's own disclosure: one refresh per commit of the host.
  for (let turn = 0; turn < 4; turn++) { await page.evaluate(() => document.dispatchEvent(new Event('fixture-refresh'))); await settle(page); }
};
const theme = async (page, view) => { await page.evaluate(view => document.dispatchEvent(new CustomEvent('fixture-theme', {detail:view})), view); await refresh(page); };

// What the page looks like, read from the page itself.
const read = page => page.evaluate(() => {
  const box = el => { const {top, bottom, left, right, width, height} = el.getBoundingClientRect(); return {top:top + scrollY, bottom:bottom + scrollY, left, right, width, height}; };
  const one = selector => document.querySelector(selector);
  const frame = one('.frame'), item = id => one('#' + id).closest('.frame > .MuiGrid-item');
  const shown = el => Boolean(el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
  const medication = one('#medicationEntrySection'), diagnosis = one('#diagnosisEntrySection'), print = one('#fixture-print');
  const medicationHead = medication.querySelector('.MuiCardHeader-root'), validate = medicationHead.querySelector('.MuiButton-root');
  const rows = [...medication.querySelectorAll('tbody tr')].map(row => ({
    ...box(row), requester:box(row.cells[4].firstElementChild).height, posology:row.cells[2].querySelector('.MuiTypography-caption').textContent.trim(),
    disclosures:[...row.querySelectorAll('.MuiButton-text')].filter(shown).length,
    actions:[...row.cells[5].querySelectorAll('button')].map(button => [button.querySelector('svg').getAttribute('aria-label'), Math.round(box(button).height), button.hasAttribute('aria-label') || button.hasAttribute('title')]),
  }));
  const diagnoses = [...diagnosis.querySelectorAll('tbody tr')].map(row => ({...box(row), star:shown(row.cells[0].querySelector('svg') || row.cells[0]) && Boolean(row.cells[0].querySelector('svg')),
    state:box(row.querySelector('[role="combobox"]')).height, text:row.cells[1].textContent.replace(/\s+/g, ' ').trim(),
    icons:[...row.querySelectorAll('td > svg, td button')].map(el => Math.round(box(el).width) + '×' + Math.round(box(el).height))}));
  const care = name => { const card = one('#' + name); return {...box(card), mark:card.getAttribute('data-hhr-round')}; };
  return {
    pageWidth:document.documentElement.scrollWidth, viewport:innerHeight, columns:frame.hasAttribute('data-hhr-round-columns'),
    roles:Object.fromEntries(['estimatedDischargeSection', 'shiftChangeEntrySection', 'vitalSignsEntry', 'rest', 'alertEntrySection', 'diagnosisEntrySection', 'medicationEntrySection', 'fixture-print']
      .map(id => [id, item(id).getAttribute('data-hhr-round')])),
    note:box(one('#evolution')), signs:box(one('section#vitalSignsEntry')), handoff:box(one('#shiftChangeObservation')), alerts:box(one('#alertEntries')),
    tiles:[...document.querySelectorAll('.vitals-grid > .tile')].map(box),
    rest:{...care('rest'), empty:getComputedStyle(one('#rest .MuiCardContent-root > p'), '::after').content, native:one('#rest .MuiCardContent-root > p').textContent},
    diet:{...care('nutritionOrder'), text:shown(one('#nutritionOrder .care > .MuiStack-root + .MuiStack-root span'))},
    diagnosis:{card:box(one('#diagnosisEntry')), rows:diagnoses, title:box(diagnosis.querySelector('.MuiCardHeader-title')), byline:box(diagnosis.querySelector('.MuiCardHeader-subheader')),
      repeated:getComputedStyle(diagnosis.querySelector('thead th:nth-child(2) p')).fontSize, heading:diagnosis.querySelector('thead th:nth-child(2)').textContent.trim()},
    medication:{card:box(one('#medicationEntry')), head:box(medicationHead), title:box(medicationHead.querySelector('.MuiCardHeader-title')), rows,
      validate:{...box(validate), text:validate.textContent, transform:getComputedStyle(validate).textTransform, initial:getComputedStyle(validate, '::first-letter').textTransform,
        display:getComputedStyle(validate).display},
      requester:getComputedStyle(medication.querySelector('tbody tr').cells[4]).color,
      filter:box(medicationHead.querySelector('.MuiSwitch-root')).height, actions:box(medicationHead.querySelector('.MuiCardHeader-action'))},
    print:{...box(print), position:getComputedStyle(print.parentElement).position, caption:getComputedStyle(print, '::after').content, name:print.querySelector('svg').getAttribute('aria-label'),
      named:print.hasAttribute('aria-label') || print.hasAttribute('title'), colour:getComputedStyle(print).color},
    switches:[...document.querySelectorAll('#alertEntries .MuiSwitch-root')].map(el => Math.round(box(el).height)),
    archive:[...document.querySelectorAll('#alertEntries .alert-row button')].map(button => [Math.round(box(button.querySelector('svg')).width), Math.round(box(button).height), button.getAttribute('aria-label')]),
    tabs:getComputedStyle(one('[role="tab"]')).textTransform,
    marks:document.querySelectorAll('[data-hhr-round],[data-hhr-reading]').length,
  };
});

// What the compact summary promises on the shapes Eloísa draws, checked on the page itself.
async function verifySummary(page, width, native, off) {
  const shown = await read(page);
  const near = (a, b, slack = 2) => Math.abs(a - b) <= slack;
  assert.equal(shown.pageWidth, width, 'El resumen cabe en la ventana');
  assert.ok(shown.columns, 'La ronda ocupa sus dos columnas');
  assert.deepEqual(shown.roles, {estimatedDischargeSection:'note', shiftChangeEntrySection:'handoff', vitalSignsEntry:'vitals', rest:'care', alertEntrySection:'alerts',
    diagnosisEntrySection:'diagnosis', medicationEntrySection:'peer', 'fixture-print':'print'});

  // The round: note, signs and care on the left; handoff and alerts on the right, on shared edges.
  assert.ok(near(shown.note.left, shown.signs.left) && near(shown.note.right, shown.signs.right) && near(shown.signs.top, shown.note.bottom), 'Signos sigue a la nota con sus bordes');
  assert.ok(near(shown.handoff.left, shown.alerts.left) && near(shown.alerts.top, shown.handoff.bottom) && shown.handoff.left >= shown.note.right - 1, 'Alertas sigue a la entrega de turno');
  assert.equal(new Set(shown.tiles.map(tile => Math.round(tile.top))).size, 1, 'Las nueve mediciones comparten una fila');
  assert.ok(shown.tiles.every(tile => tile.height <= 44), 'Una medición sin unidad no deja una línea vacía: ' + shown.tiles.map(tile => Math.round(tile.height)));

  // An empty rest is a card without its section. It reads «Sin registro» on the line of Régimen.
  assert.equal(shown.rest.mark, 'care-row', 'El reposo sin registro se reconoce sin su sección');
  assert.match(shown.rest.empty, /^"Sin registro"/);
  assert.equal(shown.rest.native, 'No se presenta un Reposo registrado para este paciente', 'La frase de Eloísa sigue en la página');
  assert.ok(near(shown.rest.top, shown.diet.top) && near(shown.rest.top, shown.signs.bottom) && shown.diet.left >= shown.rest.right - 1 && near(shown.diet.right, shown.signs.right),
    'Reposo y Régimen comparten la línea debajo de Signos');
  assert.ok(shown.rest.height <= 36 && shown.diet.height <= 36 && shown.diet.text, `El régimen y su observación se leen en una línea: ${shown.diet.height}`);

  // The diagnosis opens the cards under the round, on the first screen, one line each.
  const roundEnd = Math.max(shown.diet.bottom, shown.alerts.bottom), {diagnosis, medication, print} = shown;
  assert.ok(diagnosis.card.top >= roundEnd && diagnosis.card.top - roundEnd <= 40 && diagnosis.card.bottom <= medication.card.top + 1, 'Diagnóstico abre las tarjetas bajo la ronda');
  assert.ok(diagnosis.card.bottom <= shown.viewport, `Diagnóstico se lee en la primera pantalla: ${diagnosis.card.bottom}`);
  assert.ok(diagnosis.card.top < native.diagnosis.card.top - 600, 'Diagnóstico deja de estar tras las indicaciones');
  assert.ok(diagnosis.rows.length === summaryDiagnoses.length && diagnosis.rows.every((row, at) => row.text.includes(summaryDiagnoses[at][1])), 'Cada diagnóstico conserva su texto');
  assert.ok(diagnosis.rows.every(row => row.height <= 34 && row.state >= 24), 'Un diagnóstico es una línea y su estado sigue siendo pulsable: ' + diagnosis.rows.map(row => row.height));
  assert.deepEqual(diagnosis.rows.map(row => row.icons), [['18×18', '24×24', '24×24'], ['24×24', '24×24']], 'La estrella y las notas de un diagnóstico miden lo que una línea');
  assert.deepEqual(diagnosis.rows.map(row => row.star), [true, false], 'La estrella marca el diagnóstico principal');
  assert.ok(diagnosis.title.right <= diagnosis.rows[0].left + 1 && near(diagnosis.byline.height, 16, 3), 'El nombre y la firma de la tarjeta ocupan su columna, la firma en una línea');
  assert.ok(diagnosis.rows[0].left - diagnosis.card.left <= diagnosis.byline.width + 24, `La columna del nombre mide lo que su firma: ${diagnosis.rows[0].left - diagnosis.card.left} para ${diagnosis.byline.width}`);
  assert.deepEqual([diagnosis.repeated, diagnosis.heading], ['0px', 'Diagnóstico'], 'La columna no repite el nombre de la tarjeta y lo conserva para un lector de pantalla');
  assert.equal(await page.locator('#diagnosisEntrySection').getByRole('columnheader', {name:'Diagnóstico', exact:true}).count(), 1);

  // The cards under the round start and end on its edges.
  for (const card of [diagnosis.card, medication.card]) assert.ok(near(card.left, shown.note.left) && near(card.right, shown.alerts.right), 'Las tarjetas bajo la ronda comparten sus bordes');

  // «Imprimir indicaciones» is an icon alone on a line. It rides on the heading of Fármacos, after the title.
  assert.equal(print.position, 'absolute');
  assert.ok(near((print.top + print.bottom) / 2, (medication.title.top + medication.title.bottom) / 2, 1) && near(print.left, medication.title.right + 14, 1) &&
    print.right <= medication.actions.left - 8, `El botón sigue al título de Fármacos, en su línea, y no toca las herramientas de la tarjeta: ${print.left - medication.title.right}`);
  assert.equal(print.colour, 'rgb(40, 95, 89)', 'El botón lleva el verde de lo que se puede pulsar');
  assert.deepEqual([print.caption.split('"')[1], print.name, print.named, Math.round(print.height)], ['Imprimir indicaciones', 'Imprimir indicaciones', false, 26],
    'El botón dice el nombre que Eloísa le da en su icono, sin un nombre añadido');
  assert.ok(medication.card.top - diagnosis.card.bottom <= 8, 'La línea del icono no deja un hueco sobre Fármacos');

  // The controls of Eloísa at the height of a line, with their words.
  // The capital is drawn only on a block: the same rule on a flex button would leave the phrase in lower case.
  assert.deepEqual([medication.validate.text, medication.validate.transform, medication.validate.initial, medication.validate.display], ['validar tratamiento', 'none', 'uppercase', 'block'],
    '«Validar tratamiento» se escribe como una frase');
  assert.equal(medication.requester, 'rgb(81, 105, 99)', 'El solicitante se lee en la tinta de lo que explica');
  assert.ok(medication.validate.height <= 28 && medication.filter <= 30 && medication.head.height <= 36, 'La cabecera de Fármacos es una línea: ' + medication.head.height);
  assert.ok(shown.switches.every(height => height <= 30) && shown.switches.every((height, at) => height < native.switches[at]), 'Los interruptores miden lo que una línea');
  assert.equal(shown.tabs, 'none', 'Las pestañas se escriben como su nombre');
  assert.ok(shown.archive.length === 3 && shown.archive.every(([icon, height, name]) => icon === 18 && height >= 24 && name === 'Archivar'), 'Archivar una alerta es un icono discreto y pulsable: ' + shown.archive);

  // Each prescription: its requester on one line, its cut texts whole, its three actions with their names.
  assert.equal(medication.rows.length, summaryMedications.length);
  medication.rows.forEach((row, at) => {
    assert.ok(row.requester <= 20, `El solicitante de la fila ${at} ocupa una línea: ${row.requester}`);
    assert.equal(row.posology, summaryMedications[at][3], 'La posología se lee entera');
    assert.equal(row.disclosures, 0, 'Con el texto entero, «Leer menos» no ocupa una línea');
    assert.deepEqual(row.actions.map(([name, , named]) => [name, named]), [['Suspender', false], ['Ver notas', false], [null, false]], 'Las acciones conservan el nombre de su icono');
    assert.ok(row.actions.every(([, height]) => height >= 24) && row.height <= 46 && row.height < native.medication.rows[at].height, `La fila ${at} es más baja: ${native.medication.rows[at].height} → ${row.height}`);
  });
  const single = medication.rows.filter(row => row.height <= 30).length, visible = medication.rows.filter(row => row.bottom <= shown.viewport).length;
  assert.ok(single >= 6, `La mayoría de las indicaciones cabe en una línea: ${single} de ${medication.rows.length}`);
  assert.ok(visible >= (width < 1400 ? 3 : 6), 'La primera pantalla llega a los fármacos: ' + visible);

  // Keyboard: the diagnosis, then «Imprimir indicaciones», then the tools of Fármacos, as they are seen.
  await page.locator('#diagnosisEntrySection tbody tr').last().locator('button:enabled').last().focus();
  const order = [];
  for (let step = 0; step < 3; step++) {
    await page.keyboard.press('Tab');
    order.push(await page.evaluate(() => [document.activeElement.querySelector('svg')?.getAttribute('aria-label') || document.activeElement.textContent.trim() || document.activeElement.type,
      getComputedStyle(document.activeElement).outlineStyle]));
  }
  assert.deepEqual(order.map(([name]) => name), ['Imprimir indicaciones', 'validar tratamiento', 'checkbox'], 'Tab sigue el orden en que se ven');
  assert.equal(order[0][1], 'solid', 'El botón muestra el foco del teclado');
  await page.locator('#fixture-print').press('Enter');
  assert.equal(await page.locator('#fixture-print').getAttribute('data-fixture-print'), 'clicked', 'El botón sigue imprimiendo');
  await page.evaluate(() => document.activeElement.blur());

  // What has another shape stays where Eloísa put it.
  const roles = async () => (await read(page)).roles;
  await page.evaluate(() => { document.querySelector('#diagnosisEntrySection thead th:nth-child(2) p').textContent = 'Problema'; });
  await refresh(page);
  assert.equal((await roles()).diagnosisEntrySection, 'peer', 'Una tabla que no es la de diagnósticos no cambia de lugar');
  assert.ok((await read(page)).diagnosis.card.top > shown.medication.card.bottom, 'y sigue tras las indicaciones');
  await page.evaluate(() => { document.querySelector('#diagnosisEntrySection thead th:nth-child(2) p').textContent = 'Diagnóstico'; });
  await page.evaluate(() => { document.querySelector('#fixture-print svg').setAttribute('aria-label', 'Imprimir resumen'); });
  await refresh(page);
  const renamed = await read(page);
  assert.deepEqual([renamed.roles['fixture-print'], renamed.print.position === 'absolute', renamed.print.caption], ['peer', false, 'none'], 'Un botón con otro nombre conserva su línea y no recibe rótulo');
  await page.evaluate(() => { document.querySelector('#fixture-print svg').setAttribute('aria-label', 'Imprimir indicaciones'); });
  // With a control of its own, Reposo is not a line to read: it keeps its card, and the icon its line above it.
  await page.evaluate(() => {
    const extra = Object.assign(document.createElement('button'), {type:'button', textContent:'Indicar'});
    extra.dataset.fixtureExtra = '';
    document.querySelector('#rest .MuiCardHeader-action > .MuiStack-root').append(extra);
  });
  await refresh(page);
  const busy = await read(page);
  assert.deepEqual([busy.roles['fixture-print'], busy.rest.mark], ['peer', null], 'Con otra tarjeta entre el icono y Fármacos, el icono conserva su línea');
  await page.evaluate(() => document.querySelector('[data-fixture-extra]').remove());
  // Eloísa does not sign the card of Fármacos. If it did, the byline would take the room of the button.
  await page.evaluate(() => { document.querySelector('#medicationEntrySection .MuiCardHeader-subheader').textContent = 'Última actualización: 15-04-2026, 09:12:35, Médico Tomás Ejemplo'; });
  await refresh(page);
  assert.equal((await roles())['fixture-print'], 'peer', 'Con una firma junto al título de Fármacos, el icono conserva su línea');
  await page.evaluate(() => { document.querySelector('#medicationEntrySection .MuiCardHeader-subheader').textContent = ''; });
  await refresh(page);
  assert.deepEqual(await roles(), shown.roles, 'Al volver la forma conocida, todo vuelve a su sitio');

  // A refresh that finds nothing new writes nothing.
  const writes = await page.evaluate(async () => {
    let count = 0;
    const observer = new MutationObserver(records => { count += records.length; });
    observer.observe(document.querySelector('main'), {attributes:true, subtree:true, attributeFilter:['data-hhr-round', 'data-hhr-reading', 'title']});
    document.dispatchEvent(new Event('fixture-refresh'));
    await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    observer.disconnect();
    return count;
  });
  assert.equal(writes, 0, 'Un refresco idéntico no reescribe marcas');

  // Without the compact view the page is the one Eloísa drew, with «Ver evoluciones» as in every view.
  await theme(page, 'off');
  const restored = await read(page);
  assert.equal(restored.marks, 0, 'Al apagar la vista no queda ninguna marca');
  assert.deepEqual([restored.print.position, restored.print.caption, Math.round(restored.diagnosis.card.top), Math.round(restored.medication.card.top), Math.round(restored.medication.card.bottom)],
    [native.print.position, native.print.caption, Math.round(off.diagnosis.card.top), Math.round(off.medication.card.top), Math.round(off.medication.card.bottom)], 'y cada tarjeta vuelve a su lugar');
  await theme(page, 'compact');
  const again = await read(page);
  assert.deepEqual([again.roles, Math.round(again.medication.card.top)], [shown.roles, Math.round(shown.medication.card.top)], 'Al volver a la vista compacta el resumen queda igual');
}

const [revision, directory] = process.argv.slice(2);
if (!revision || !directory) throw Error('Uso: node scripts/capture-summary.mjs <ref|WORKTREE> <directorio>');
const assets = await fichaAssets(revision);
await mkdir(directory, {recursive:true});
const browser = await chromium.launch();
try {
  // Each window is checked with the text of this machine and with a wider family, as on another platform.
  for (const [width, height] of [[1280,800],[1440,900]]) for (const sans of ['', wideSans]) {
    const page = await browser.newPage({viewport:{width,height}, deviceScaleFactor:1, locale:'es-CL', timezoneId:'Pacific/Easter'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent(summaryPage());
    await settle(page);
    const native = await read(page);
    // First with the view off: what the page measures with the extension and without its compact view.
    await mountFicha(page, assets, {sans, theme:'off'});
    await refresh(page);
    const off = await read(page);
    await theme(page, 'compact');
    const measured = await read(page);
    const visible = measured.medication.rows.filter(row => row.bottom <= height).length;
    console.info('Resumen sintético', assets.version, width, sans ? 'con letra ancha' : '', JSON.stringify({
      diagnostico:Math.round(measured.diagnosis.card.top), farmacos:Math.round(measured.medication.card.top), filasVisibles:visible,
      filasDeUnaLinea:measured.medication.rows.filter(row => row.height <= 30).length, finDeFarmacos:Math.round(measured.medication.card.bottom)}),
      'sin extensión', JSON.stringify({diagnostico:Math.round(native.diagnosis.card.top), farmacos:Math.round(native.medication.card.top)}));
    if (!sans) {
      await page.screenshot({path:path.join(directory, width + '-resumen.png')});
      await page.screenshot({path:path.join(directory, width + '-resumen-completo.png'), fullPage:true});
    }
    if (revision === 'WORKTREE') await verifySummary(page, width, native, off);
    if (errors.length) throw Error(errors.join('\n'));
    await page.close();
  }
} finally {
  await browser.close();
}
