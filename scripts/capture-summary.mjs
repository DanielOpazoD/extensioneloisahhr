// Render the fictional Resumen that follows the real structure with the presentation of a revision.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fichaAssets, mountFicha, settle, wideSans } from './ficha-capture-harness.mjs';
import { summaryDiagnoses, summaryFree, summaryMedications, summaryPage } from './summary-visual-fixture.mjs';

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
    // A marker that did not fit after the last word starts a line of its own, as a word does.
    markerBelow:(chip => { if (!chip) return false; const name = document.createRange(); name.selectNodeContents(row.cells[1].querySelector('.MuiTypography-root'));
      return chip.getBoundingClientRect().top >= [...name.getClientRects()].at(-1).bottom - 2; })(row.cells[1].querySelector('.MuiChip-root')),
    days:(marker => ({text:marker.textContent.trim(), unit:getComputedStyle(marker, '::after').content, triangle:getComputedStyle(marker.querySelector('svg')).display,
      size:getComputedStyle(marker.querySelector('span')).fontSize, family:getComputedStyle(marker.querySelector('span')).fontFamily, zoom:getComputedStyle(marker).zoom,
      width:box(row.cells[0]).width, end:box(row.cells[0]).right - box(marker.querySelector('span')).right}))(row.cells[0].firstElementChild),
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
      // Without diagnoses Eloísa writes a sentence in place of the table.
      repeated:diagnosis.querySelector('thead') && getComputedStyle(diagnosis.querySelector('thead th:nth-child(2) p')).fontSize, heading:diagnosis.querySelector('thead th:nth-child(2)')?.textContent.trim()},
    medication:{card:box(one('#medicationEntry')), head:box(medicationHead), title:box(medicationHead.querySelector('.MuiCardHeader-title')), rows,
      validate:{...box(validate), text:validate.textContent, transform:getComputedStyle(validate).textTransform, initial:getComputedStyle(validate, '::first-letter').textTransform,
        display:getComputedStyle(validate).display},
      requester:getComputedStyle(medication.querySelector('tbody tr').cells[4]).color,
      filter:box(medicationHead.querySelector('.MuiSwitch-root')).height, actions:box(medicationHead.querySelector('.MuiCardHeader-action'))},
    print:{...box(print), position:getComputedStyle(print.parentElement).position, caption:getComputedStyle(print, '::after').content, name:print.querySelector('svg').getAttribute('aria-label'),
      named:print.hasAttribute('aria-label') || print.hasAttribute('title'), colour:getComputedStyle(print).color},
    switches:[...document.querySelectorAll('#alertEntries .MuiSwitch-root')].map(el => Math.round(box(el).height)),
    // Eloísa focuses the empty alert field when the summary opens.
    alertForm:(row => ({folded:row?.hasAttribute('data-hhr-entry-folded') ?? null, shown:shown(one('#fixture-alert')), focused:document.activeElement === one('#fixture-alert'),
      opener:Boolean(one('#alertEntrySection [data-hhr-entry-open]') && shown(one('#alertEntrySection [data-hhr-entry-open]')))}))(one('#alertEntrySection [data-hhr-entry-prompt]')),
    free:(card => ({disclosures:[...card.querySelectorAll('tbody .MuiButton-text')].filter(shown).length, last:card.querySelector('tbody tr:last-child td').textContent.trim(),
      widths:[...card.querySelectorAll('thead th')].map(th => Math.round(box(th).width))}))(one('#freeIndicationEntry')),
    balance:(card => ({...box(card), controls:[...card.querySelectorAll('.MuiCardContent-root :is(.MuiInputBase-root,.MuiButton-root)')].map(el => Math.round(box(el).height)),
      edge:Math.round(card.querySelector('.MuiCardHeader-title').getBoundingClientRect().left - box(card).left),
      filter:shown(card.querySelector('button[type="submit"]')), calendars:[...card.querySelectorAll('.MuiInputAdornment-root button')].filter(shown).length}))(one('#inputOutputHydricBalanceEntry')),
    // A section without permission, or empty, is one line: its name and Eloísa's sentence.
    lines:Object.fromEntries(['adverseEventEntry', 'obstetricGynecologicalExaminationEntry', 'operationTheaterRequestEntry', 'diagnosisEntry', 'procedureOrderEntry'].map(id => {
      const card = one('#' + id), title = card.querySelector('.MuiCardHeader-title'), text = card.querySelector('.MuiCardContent-root > p');
      const middle = el => (el.getBoundingClientRect().top + el.getBoundingClientRect().bottom) / 2;
      return [id, {mark:card.getAttribute('data-hhr-reading'), round:card.closest('.frame > .MuiGrid-item')?.getAttribute('data-hhr-round'), height:Math.round(box(card).height),
        title:getComputedStyle(title).fontSize + ' ' + getComputedStyle(title).fontWeight,
        left:Math.round(box(card).left), right:Math.round(innerWidth - box(card).right), oneLine:Boolean(text) && Math.abs(middle(title) - middle(text)) < 6}];
    })),
    // Who validated the treatment, the first line of Fármacos.
    validator:(line => line && {mark:line.getAttribute('data-hhr-reading'), says:getComputedStyle(line.firstElementChild, '::after').content,
      edge:Math.round(box(line).left + parseFloat(getComputedStyle(line).paddingLeft)), size:getComputedStyle(line).fontSize, colour:getComputedStyle(line).color,
      afterTitle:Math.round(box(line).top - box(one('#medicationEntry .MuiCardHeader-title')).bottom), beforeTable:Math.round(box(one('#medicationEntry thead')).top - box(line).bottom)})(
      one('#medicationEntry > .MuiCardContent-root > .MuiBox-root:first-child:not(:only-child)')),
    archive:[...document.querySelectorAll('#alertEntries .alert-row button')].map(button => [Math.round(box(button.querySelector('svg')).width), Math.round(box(button).height), button.getAttribute('aria-label')]),
    tabs:getComputedStyle(one('[role="tab"]')).textTransform,
    // What good order asks of the whole page: its edges, its gaps, its type and its surfaces. Only in the compact view.
    look:!one('[data-hhr-ficha-sections] [data-hhr-ficha-link]') || !one('[data-hhr-round="frame"]') ? null : (() => {
      const rail = one('[data-hhr-ficha-sections]').getBoundingClientRect();
      const cards = [...document.querySelectorAll('.frame section[id] > .MuiCard-root, .frame #rest.MuiCard-root')].filter(shown);
      const peers = [...document.querySelectorAll('.frame > [data-hhr-round="peer"], .frame > [data-hhr-round="diagnosis"]')].filter(shown)
        // Eloísa can wrap a card in a second section, as it does with Fármacos.
        .map(item => item.querySelector(':scope > section > .MuiCard-root, :scope > section > section:only-child > .MuiCard-root')).filter(Boolean).sort((a, b) => box(a).top - box(b).top);
      const texts = [...document.querySelectorAll('.frame *, [data-hhr-ficha-sections] *')].filter(el => shown(el) &&
        [...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim()) && getComputedStyle(el).fontSize !== '0px');
      const firstText = el => { const range = document.createRange(); range.selectNodeContents(el); return range.getClientRects()[0]?.left; };
      const tables = ['medicationEntrySection', 'freeIndicationEntrySection', 'procedureOrderEntrySection'].map(id => document.getElementById(id)).filter(section => section.querySelector('thead')).map(section => {
        // The reading edge of a cell is where its content box starts: «Tiempo» aligns its days to the right on purpose.
        const edge = cell => cell.getBoundingClientRect().left + parseFloat(getComputedStyle(cell).paddingLeft);
        return [firstText(section.querySelector('.MuiCardHeader-title')), edge(section.querySelector('thead th')), edge(section.querySelector('tbody td'))].map(Math.round);
      });
      const empty = ['ramEntry', 'allergyEntry', 'noPharmaEntry'].map(id => {
        const card = document.getElementById(id);
        return Math.round(card.querySelector('[data-hhr-reading="status-message"]').getBoundingClientRect().left - card.querySelector('.MuiCardHeader-title').getBoundingClientRect().right);
      });
      const tab = document.createRange(); tab.selectNodeContents(one('[role="tab"][aria-selected="true"]'));
      return {
        tabEdge:Math.round(tab.getClientRects()[0].left - firstText(one('#evolution .MuiCardHeader-title'))),
        rail:[Math.round(rail.left), Math.round(innerWidth - rail.right)],
        lefts:[...new Set(cards.map(card => Math.round(card.getBoundingClientRect().left)))].sort((a, b) => a - b),
        rights:[...new Set(cards.map(card => Math.round(innerWidth - card.getBoundingClientRect().right)))].sort((a, b) => a - b),
        gaps:peers.slice(1).map((card, at) => Math.round(box(card).top - box(peers[at]).bottom)),
        edges:[...new Set(peers.map(card => Math.round(card.getBoundingClientRect().left) + '/' + Math.round(innerWidth - card.getBoundingClientRect().right)))],
        // The daily row docked on the section links takes the colour of that line.
        dock:one('[data-hhr-ficha-dock]') && [getComputedStyle(one('[data-hhr-ficha-dock]')).backgroundColor, getComputedStyle(one('[data-hhr-ficha-sections]')).backgroundColor],
        statusTitle:(title => getComputedStyle(title).fontSize + ' ' + getComputedStyle(title).fontWeight)(one('#ramEntry .MuiCardHeader-title')),
        families:[...new Set(texts.map(el => getComputedStyle(el).fontFamily.split(',')[0].trim()))],
        weights:[...new Set(texts.map(el => getComputedStyle(el).fontWeight))].sort(),
        sizes:[...new Set(texts.map(el => parseFloat(getComputedStyle(el).fontSize)))].sort((a, b) => a - b),
        titles:[...new Set(peers.concat([one('#evolution'), one('#shiftChangeObservation'), one('section#vitalSignsEntry > .MuiCard-root'), one('#alertEntries')])
          .filter(card => !card.matches('[data-hhr-reading="status-card"]'))
          .map(card => { const title = getComputedStyle(card.querySelector('.MuiCardHeader-title')); return title.fontSize + ' ' + title.fontWeight; }))],
        surfaces:[...new Set(peers.map(card => { const look = getComputedStyle(card); return look.borderTopLeftRadius + ' ' + look.boxShadow; }))],
        tables, empty,
        // Eloísa's neutral inks: what is read, what names a column, what only explains.
        inks:[getComputedStyle(one('#medicationEntry .MuiCardHeader-title')).color, getComputedStyle(one('#medicationEntry thead th')).color,
          getComputedStyle(one('#ramEntry [data-hhr-reading="status-message"]')).color],
        // An empty section: its name on the reading edge, its filter closing the line on the other.
        emptyEdges:['ramEntry', 'allergyEntry', 'noPharmaEntry'].map(id => {
          const card = document.getElementById(id).getBoundingClientRect(), title = document.querySelector('#' + id + ' .MuiCardHeader-title').getBoundingClientRect();
          return Math.round(title.left - card.left);
        }),
        filter:(() => {
          const card = one('#noPharmaEntry').getBoundingClientRect(), label = one('#noPharmaEntry .MuiCardHeader-action label').getBoundingClientRect();
          const free = one('#freeIndicationEntry').getBoundingClientRect(), freeLabel = one('#freeIndicationEntry .MuiCardHeader-action label').getBoundingClientRect();
          const message = one('#noPharmaEntry [data-hhr-reading="status-message"]').getBoundingClientRect();
          return {end:Math.round(card.right - label.right), freeEnd:Math.round(free.right - freeLabel.right), afterMessage:label.left > message.right,
            oneLine:Math.abs((label.top + label.bottom) / 2 - (message.top + message.bottom) / 2) < 6};
        })(),
        // The name of the diagnosis card starts at the top, beside the headings of its table.
        diagnosisTop:Math.round(one('#diagnosisEntry .MuiCardHeader-title').getBoundingClientRect().top - one('#diagnosisEntry').getBoundingClientRect().top),
        // A marker follows the last word of a name that takes two lines.
        marker:(() => {
          const cell = [...document.querySelectorAll('#medicationEntrySection tbody tr')][2].cells[1];
          const name = document.createRange(); name.selectNodeContents(cell.querySelector('.MuiTypography-root'));
          const lines = [...name.getClientRects()], last = lines.at(-1), chip = cell.querySelector('.MuiChip-root').getBoundingClientRect();
          return {lines:new Set(lines.map(rect => Math.round(rect.top))).size, gap:Math.round(chip.left - last.right), onLast:chip.top < last.bottom && chip.bottom > last.top,
            below:chip.top >= last.bottom - 2, start:Math.round(chip.left - lines[0].left)};
        })(),
      };
    })(),
    marks:document.querySelectorAll('[data-hhr-round],[data-hhr-reading]').length,
  };
});

// What the compact summary promises on the shapes Eloísa draws, checked on the page itself.
async function verifySummary(page, width, native, off, sans) {
  const shown = await read(page);
  const near = (a, b, slack = 2) => Math.abs(a - b) <= slack;
  assert.equal(shown.pageWidth, width, 'El resumen cabe en la ventana');
  assert.ok(shown.columns, 'La ronda ocupa sus dos columnas');
  assert.deepEqual(shown.roles, {estimatedDischargeSection:'note', shiftChangeEntrySection:'handoff', vitalSignsEntry:'vitals', rest:'care', alertEntrySection:'alerts',
    diagnosisEntrySection:'diagnosis', medicationEntrySection:'peer', 'fixture-print':'print'});

  // The edges of the page: the round, every card and the section links keep the same margin on both sides.
  const {look} = shown;
  assert.equal(look.rail[0], look.rail[1], 'La línea de secciones deja el mismo margen a cada lado: ' + look.rail);
  assert.ok(look.rail[0] >= 32, 'El margen nunca es menor que el de Eloísa: ' + look.rail[0]);
  assert.equal(look.tabEdge, 0, 'Las pestañas empiezan donde empiezan los títulos de las tarjetas');
  assert.ok(look.lefts[0] === look.rail[0] && look.rights[0] === look.rail[1], `Las tarjetas empiezan y terminan en los bordes de la línea de secciones: ${look.lefts[0]}/${look.rights[0]} frente a ${look.rail}`);
  // One gap between blocks, one typeface, two weights, four sizes, one title, one surface.
  assert.ok(look.gaps.length >= 6 && look.gaps.every(gap => gap === 8), 'Los bloques bajo la ronda se separan siempre 8 px: ' + look.gaps);
  assert.deepEqual(look.edges, [look.rail.join('/')], 'Cada tarjeta bajo la ronda, Fármacos en su segunda sección incluida, termina en los bordes de la línea de secciones: ' + look.edges);
  // The wide pass swaps only the view's family, to measure another platform: there two are expected.
  if (!sans) assert.equal(look.families.length, 1, 'Una sola tipografía en toda la ficha: ' + look.families);
  assert.deepEqual(look.weights, ['400', '600'], 'Dos pesos de letra');
  assert.ok(look.sizes.every(size => [12, 13, 15, 16].includes(size)), 'Cuatro tamaños de letra: ' + look.sizes);
  assert.deepEqual(look.titles, ['15px 600'], 'Cada tarjeta se titula igual');
  assert.deepEqual(look.surfaces, ['6px none'], 'Las tarjetas bajo la ronda tienen la misma superficie');
  assert.ok(look.tables.every(([title, heading, cell]) => title === heading && heading === cell), 'Cada tabla empieza en el borde de su título: ' + JSON.stringify(look.tables));
  assert.ok(look.empty.every(gap => gap >= 8 && gap <= 12), 'Una sección vacía separa su nombre de su mensaje: ' + look.empty);
  assert.deepEqual(look.inks, ['rgb(33, 33, 33)', 'rgb(74, 74, 74)', 'rgb(102, 102, 102)'], 'El texto usa las tintas neutras de Eloísa');
  assert.ok(look.emptyEdges.every(edge => edge === 10), 'Una sección vacía empieza en el borde de lectura: ' + look.emptyEdges);
  assert.ok(look.filter.end === 10 && look.filter.afterMessage && look.filter.oneLine, 'El filtro de una sección vacía cierra su línea: ' + JSON.stringify(look.filter));
  assert.equal(look.filter.freeEnd, 10, 'Un filtro que cierra la cabecera termina en el borde de lectura');
  assert.ok(look.diagnosisTop <= 10, 'El nombre de Diagnóstico queda arriba: ' + look.diagnosisTop);
  // Like a word: after the last word of the name, or, when that line is full, at the start of the next one. Never in a column of its own.
  const {marker} = look;
  assert.ok(marker.lines === 2 && ((marker.onLast && marker.gap >= 4 && marker.gap <= 10) || (marker.below && marker.start >= 0 && marker.start <= 10)),
    'La etiqueta sigue al nombre como una palabra: ' + JSON.stringify(marker));

  // Shapes read in Eloísa on 26-11-2026. Fármacos opens with who validated the treatment, under its title and on its edge.
  const {validator, alertForm, free, balance, lines} = shown;
  assert.ok(validator?.mark === 'order-validator' && validator.edge === look.tables[0][0] && validator.afterTitle >= 0 && validator.afterTitle <= 8 &&
    validator.beforeTable >= 0 && validator.beforeTable <= 6, 'Quién valida el tratamiento se lee bajo el título de Fármacos, en su borde y junto a su tabla: ' + JSON.stringify(validator));
  assert.deepEqual([validator.says, validator.size, validator.colour], ['"Tratamiento sin validar" / "Tratamiento sin validar"', '12px', 'rgb(102, 102, 102)'],
    'Sin validar, la línea lo dice en el gris de lo que explica, y también al lector de pantalla');
  // Eloísa gives the empty alert field the focus when the summary opens. The form still folds, and the next key does not go into an alert.
  assert.deepEqual(alertForm, {folded:true, shown:false, focused:false, opener:true}, 'El formulario de alertas se pliega aunque Eloísa le dé el foco: ' + JSON.stringify(alertForm));
  assert.ok(free.disclosures === 0 && free.last.startsWith(summaryFree.at(-1)[0]) && free.widths[0] === Math.max(...free.widths),
    'Una indicación libre se lee entera, en la columna más ancha: ' + JSON.stringify(free));
  assert.ok(balance.height <= native.balance.height - 40 && balance.controls.length === 5 && balance.controls.every(height => height <= 30) && balance.filter && balance.calendars === 2 && balance.edge === 10,
    `Balance Hídrico filtra en una línea, con sus campos, su calendario y «Filtrar»: ${native.balance.height} → ${balance.height}, ${balance.controls}`);
  for (const id of ['adverseEventEntry', 'obstetricGynecologicalExaminationEntry']) {
    const line = lines[id];
    assert.ok(line.mark === 'status-card' && line.height <= 30 && line.oneLine && line.left === look.rail[0] && line.right === look.rail[1] && line.title === look.statusTitle,
      `Una sección sin permiso es una línea, como RAM: ${id} ${JSON.stringify(line)}`);
  }
  if (look.dock) assert.equal(look.dock[0], look.dock[1], 'La fila diaria sobre la línea de secciones tiene su mismo fondo');
  // Its sentence is three text nodes. Read whole, it is an empty request like Exámenes, beside it on the last line of the round.
  assert.deepEqual([lines.operationTheaterRequestEntry.mark, lines.operationTheaterRequestEntry.round], ['status-card', 'empty-request'], 'Cirugía sin solicitudes acompaña a Exámenes');

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
  assert.equal(medication.requester, 'rgb(102, 102, 102)', 'El solicitante se lee en el gris de lo que explica, el de Eloísa, no en un color que parezca un enlace');
  assert.ok(medication.validate.height <= 28 && medication.filter <= 30 && medication.head.height <= 36, 'La cabecera de Fármacos es una línea: ' + medication.head.height);
  assert.ok(shown.switches.every(height => height <= 30) && shown.switches.every((height, at) => height < native.switches[at]), 'Los interruptores miden lo que una línea');
  assert.equal(shown.tabs, 'none', 'Las pestañas se escriben como su nombre');
  assert.ok(shown.archive.length === 3 && shown.archive.every(([icon, height, name]) => icon === 18 && height >= 24 && name === 'Archivar'), 'Archivar una alerta es un icono discreto y pulsable: ' + shown.archive);

  // Each prescription: its requester on one line, its cut texts whole, its three actions with their names.
  assert.equal(medication.rows.length, summaryMedications.length);
  medication.rows.forEach((row, at) => {
    // «Tiempo» counts days of treatment: the number says its unit, and one day is read in the singular.
    const [count] = summaryMedications[at];
    assert.deepEqual([row.days.text, row.days.triangle, row.days.size, row.days.zoom], [String(count), 'none', '12px', '1'], `Los días de la fila ${at} se leen como un número`);
    assert.match(row.days.unit, count === 1 ? /^"\s?d" \/ " día"$/ : /^"\s?d" \/ " días"$/, `El número dice su unidad: ${row.days.unit}`);
    // Compared with Eloísa's own column in the same run: a fixed number of pixels depends on the font of each platform.
    assert.ok(row.days.width <= native.medication.rows[at].days.width + 1 && !/^Arial/.test(row.days.family),
      `La columna de días no pide más ancho que la de Eloísa: ${native.medication.rows[at].days.width} → ${row.days.width}`);
    assert.ok(row.requester <= 20, `El solicitante de la fila ${at} ocupa una línea: ${row.requester}`);
    assert.equal(row.posology, summaryMedications[at][3], 'La posología se lee entera');
    assert.equal(row.disclosures, 0, 'Con el texto entero, «Leer menos» no ocupa una línea');
    assert.deepEqual(row.actions.map(([name, , named]) => [name, named]), [['Suspender', false], ['Ver notas', false], [null, false]], 'Las acciones conservan el nombre de su icono');
    // Two lines at most, or three when a marker that did not fit after the last word took a line of its own.
    assert.ok(row.actions.every(([, height]) => height >= 24) && row.height <= (row.markerBelow ? 66 : 46) && row.height < native.medication.rows[at].height,
      `La fila ${at} es más baja: ${native.medication.rows[at].height} → ${row.height}`);
  });
  assert.equal(new Set(medication.rows.map(row => Math.round(row.days.end))).size, 1, 'Las unidades de los días caen en una línea: ' + medication.rows.map(row => Math.round(row.days.end)));
  const single = medication.rows.filter(row => row.height <= 30).length, visible = medication.rows.filter(row => row.bottom <= shown.viewport).length;
  assert.ok(single >= 6, `La mayoría de las indicaciones cabe en una línea: ${single} de ${medication.rows.length}`);
  // How many rows fit depends on the metrics of the font. With Eloísa's fallback both platforms measure alike; the
  // wide pass, which is DejaVu on Linux and Verdana on macOS, keeps one row less of margin.
  assert.ok(visible >= (width < 1400 ? 3 : 6) - (sans ? 1 : 0), 'La primera pantalla llega a los fármacos: ' + visible);

  // At the narrowest width of the two columns a diagnosis may wrap its text, never its state or its date.
  const viewport = page.viewportSize();
  await page.setViewportSize({width:1100, height:viewport.height});
  await refresh(page);
  const narrow = await page.evaluate(() => [...document.querySelectorAll('#diagnosisEntrySection tbody tr')].map(row =>
    [row.querySelector('[role="combobox"]'), row.cells[3]].map(cell => { const range = document.createRange(); range.selectNodeContents(cell); return new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size; })));
  assert.ok(narrow.every(lines => lines.every(count => count === 1)), 'A 1100 px el estado y la fecha de un diagnóstico ocupan una línea: ' + JSON.stringify(narrow));
  await page.setViewportSize(viewport);
  await refresh(page);

  // On a wide screen the content stops at 1600 px and stays at the centre, tabs included.
  await page.setViewportSize({width:1990, height:viewport.height});
  await refresh(page);
  const wide = (await read(page)).look;
  assert.ok(wide.rail[0] === wide.rail[1] && Math.abs(1990 - wide.rail[0] * 2 - 1600) <= 1 && wide.tabEdge === 0,
    'En una pantalla ancha el contenido mide 1600 px y queda centrado: ' + wide.rail);
  await page.setViewportSize(viewport);
  await refresh(page);

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
  // «Agregar alerta» opens the field that was folded and gives it the focus; leaving it empty folds it again.
  await page.locator('#alertEntrySection [data-hhr-entry-open]').click();
  assert.deepEqual((await read(page)).alertForm, {folded:false, shown:true, focused:true, opener:false}, '«Agregar alerta» abre el campo con el foco');
  await page.evaluate(() => document.activeElement.blur());
  await refresh(page);
  assert.equal((await read(page)).alertForm.folded, true, 'Vacío y sin foco, vuelve a plegarse');

  // A section that Eloísa fills with something unknown keeps its content and takes the title of every card.
  await page.evaluate(() => { document.querySelector('#adverseEventEntry .MuiCardContent-root > p').textContent = 'Evento de prueba registrado el 14-04-2026'; });
  await refresh(page);
  assert.deepEqual(await page.evaluate(() => { const title = getComputedStyle(document.querySelector('#adverseEventEntry .MuiCardHeader-title'));
    return [document.getElementById('adverseEventEntry').hasAttribute('data-hhr-reading'), title.fontSize + ' ' + title.fontWeight]; }), [false, '15px 600'], 'Una tarjeta con registros se titula como las demás');
  await page.evaluate(() => { document.querySelector('#adverseEventEntry .MuiCardContent-root > p').textContent = 'No tiene permiso para visualizar'; });
  await refresh(page);

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

  // In the other views the days keep the triangle of Eloísa, one day like the rest.
  await theme(page, 'balanced');
  const elsewhere = (await read(page)).medication.rows.map(row => [row.days.zoom, row.days.triangle !== 'none', row.days.unit]);
  assert.ok(elsewhere.every(([zoom, triangle, unit]) => zoom === '0.68' && triangle && unit === 'none'), 'Fuera de la vista compacta los días conservan su símbolo: ' + elsewhere.at(-1));
  await theme(page, 'compact');
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

// The other shapes Eloísa draws, each in a page of its own at 1440 px.
async function verifyShapes(browser, assets) {
  const open = async options => {
    const page = await browser.newPage({viewport:{width:1440, height:900}, deviceScaleFactor:1, locale:'es-CL', timezoneId:'Pacific/Easter'});
    await page.setContent(summaryPage(options));
    await settle(page);
    await mountFicha(page, assets, {theme:'compact'});
    await refresh(page);
    return page;
  };
  // A patient without diagnoses nor care orders, as the one read on 26-11-2026: both are lines like RAM, kept in view.
  let page = await open({diagnoses:[], careOrders:[]});
  let shown = await read(page);
  for (const id of ['diagnosisEntry', 'procedureOrderEntry']) {
    const line = shown.lines[id];
    assert.ok(line.mark === 'status-card' && line.round === 'peer' && line.height <= 30 && line.oneLine && line.left === shown.look.rail[0] && line.right === shown.look.rail[1] &&
      line.title === shown.look.statusTitle,
      `Una sección vacía con tabla se lee como las demás vacías: ${id} ${JSON.stringify(line)}`);
  }
  assert.ok(shown.look.gaps.every(gap => gap === 8) && shown.look.edges.length === 1, 'Los bloques conservan su separación y sus bordes: ' + shown.look.gaps + ' ' + shown.look.edges);
  assert.equal(await page.locator('[data-hhr-ficha-folded] #diagnosisEntry, [data-hhr-ficha-folded]#diagnosisEntry').count(), 0, 'Un diagnóstico ausente no se pliega con las secciones vacías');
  await page.close();
  // The older shape of Fármacos, its card straight in its section, without the line of its validator.
  page = await open({nested:false});
  shown = await read(page);
  assert.ok(shown.roles['fixture-print'] === 'print' && shown.validator === null && shown.look.edges.length === 1 && shown.look.tables.every(([title, heading, cell]) => title === heading && heading === cell),
    'Fármacos sin su segunda sección conserva su forma: ' + JSON.stringify([shown.roles['fixture-print'], shown.look.edges, shown.look.tables]));
  await page.close();
  // Validated: the line names who did it, in the ink of what is read.
  page = await open({validator:'Tomás Ejemplo 15-04-2026 08:40'});
  shown = await read(page);
  const value = await page.evaluate(() => getComputedStyle(document.querySelector('[data-hhr-reading="order-validator"] > :last-child')).color);
  assert.deepEqual([shown.validator.says, value], ['"Médico validador:" / ""', 'rgb(74, 74, 74)'], 'Con un validador, la línea lo nombra');
  await page.close();
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
    if (revision === 'WORKTREE') await verifySummary(page, width, native, off, sans);
    if (errors.length) throw Error(errors.join('\n'));
    await page.close();
  }
  if (revision === 'WORKTREE') await verifyShapes(browser, assets);
} finally {
  await browser.close();
}
