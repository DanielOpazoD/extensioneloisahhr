// Render the fictional Resumen that follows the real structure with the presentation of a revision.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fichaAssets, mountFicha, settle, wideSans } from './ficha-capture-harness.mjs';
import { assertFigures, assertPalette, assertQuality } from './visual-quality.mjs';
import { summaryDiagnoses, summaryFree, summaryMedications, summaryPage, summaryProcedures, summaryReferrals, summarySurgeries, summaryTests } from './summary-visual-fixture.mjs';

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
      width:box(row.cells[0]).width, end:box(row.cells[0]).right - box(marker.querySelector('span')).right,
      // How far the number reads from the line of the medication's name.
      line:(name => { const text = document.createRange(); text.selectNodeContents(name); const first = text.getClientRects()[0], number = box(marker.querySelector('span'));
        return Math.round(Math.abs((number.top + number.bottom) / 2 - scrollY - (first.top + first.bottom) / 2)); })(row.cells[1].querySelector('.MuiTypography-root'))}))(row.cells[0].firstElementChild),
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
    rest:{...care('rest'), hidden:(own => own ? Math.round(own.getBoundingClientRect().width) : null)(one('#rest').closest('[data-hhr-round="care-hidden"]')), native:one('#rest .MuiCardContent-root > p').textContent,
      tile:(proxy => proxy && {tile:proxy.getAttribute('data-hhr-round-tile'), name:proxy.textContent.trim(), aria:proxy.getAttribute('aria-hidden'), shown:proxy.getClientRects().length > 0})(one('[data-hhr-round-proxy="rest"]'))},
    // The last line of the round: the item of the care instructions and those of the requests without records.
    careLine:box(item('rest')), requests:[...document.querySelectorAll('.MuiGrid-item[data-hhr-round="empty-request"]')].map(box),
    alertList:(list => ({height:list.clientHeight, scroll:list.scrollHeight, overflow:getComputedStyle(list).overflowY}))(one('#alertEntries > .MuiCardContent-root > .MuiBox-root')),
    noteLines:(text => text && Math.round(text.clientHeight / parseFloat(getComputedStyle(text).lineHeight)))(one('#evolution [data-hhr-note-text]')),
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
      filter:shown(card.querySelector('button[type="submit"]')), calendars:[...card.querySelectorAll('.MuiInputAdornment-root button')].filter(shown).length,
      fold:(opener => opener && {shown:shown(opener), expanded:opener.getAttribute('aria-expanded'), name:opener.getAttribute('aria-label'), size:[box(opener).width, box(opener).height],
        controls:opener.getAttribute('aria-controls') === opener.parentElement.querySelector(':scope > .MuiStack-root')?.id,
        icon:getComputedStyle(opener, '::before').maskImage !== 'none', afterState:box(opener).left > box(card.querySelector('[data-hhr-balance="empty"]')).left})(card.querySelector('[data-hhr-balance-filter]'))}))(one('#inputOutputHydricBalanceEntry')),
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
      // The column of the ficha: where the line of section links was, and where every card starts and ends.
      const rail = one('[data-hhr-ficha-section-slot]').getBoundingClientRect();
      const cards = [...document.querySelectorAll('.frame section[id] > .MuiCard-root, .frame #rest.MuiCard-root')].filter(shown);
      const items = [...document.querySelectorAll('.frame > [data-hhr-round="peer"]')].filter(shown);
      // What has no records, or cannot be seen, is not one more card: it closes the summary as a group of short lines.
      const tiles = items.map(item => item.querySelector(':scope > section > [data-hhr-reading="status-card"]:only-child, :scope > [data-hhr-reading="status-card"]:only-child')).filter(Boolean);
      const peers = items
        // Eloísa can wrap a card in a second section, as it does with Fármacos.
        .map(item => item.querySelector(':scope > section > .MuiCard-root, :scope > section > section:only-child > .MuiCard-root')).filter(card => card && !tiles.includes(card)).sort((a, b) => box(a).top - box(b).top);
      const texts = [...document.querySelectorAll('.frame *, [data-hhr-ficha-sections] *')].filter(el => shown(el) &&
        [...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim()) && getComputedStyle(el).fontSize !== '0px');
      const firstText = el => { const range = document.createRange(); range.selectNodeContents(el); return range.getClientRects()[0]?.left; };
      const tabled = ['medicationEntrySection', 'freeIndicationEntrySection', 'procedureOrderEntrySection', 'procedureEntrySection', 'referralRequestEntrySection', 'diagnosisTestEntrySection',
        'operationTheaterRequestEntrySection'].map(id => document.getElementById(id)).filter(section => section.querySelector('thead'));
      const tables = tabled.map(section => {
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
        // The daily row has no line of its own: where it rides and what a pointer finds on it. The section links are not shown.
        dock:(row => row && (() => {
          const place = row.getBoundingClientRect(), head = one('[role="tablist"]').closest('.MuiAppBar-root').getBoundingClientRect(), links = one('[data-hhr-ficha-sections]');
          const bar = document.getElementById('hhr-clinical-operations-bar')?.getBoundingClientRect(), field = row.querySelector('form input').getBoundingClientRect();
          const submit = row.querySelector('button[type="submit"]').getBoundingClientRect(), calendar = row.querySelector('.MuiInputAdornment-root button').getBoundingClientRect(), control = row.querySelector('.MuiInputBase-root').getBoundingClientRect();
          return {line:row.getAttribute('data-hhr-ficha-dock-line'), short:row.getAttribute('data-hhr-ficha-dock') === 'short', position:getComputedStyle(row).position,
            onTabs:place.top >= head.top - 1 && place.bottom <= head.bottom + 1,
            afterTabs:Math.round(place.left - Math.max(...[...document.querySelectorAll('[role="tab"]')].map(tab => tab.getBoundingClientRect().right))), beforeBar:bar ? Math.round(bar.left - place.right) : null,
            reachable:row.contains(document.elementFromPoint(field.left + field.width / 2, field.top + field.height / 2)),
            links:Boolean(links.getClientRects().length), slot:Math.round(one('[data-hhr-ficha-section-slot]').getBoundingClientRect().height),
            // The line the round starts on: the second while the row keeps the first.
            lead:frame.style.getPropertyValue('--hhr-round-line'),
            // The date is read whole in its field, with its calendar inside it and «Imprimir» after it.
            date:[Math.round(field.width), row.querySelector('form input').scrollWidth <= row.querySelector('form input').clientWidth],
            order:[calendar.left >= field.right - 1 && calendar.right <= control.right + 1, Math.round(submit.left - control.right)]};
        })())(one('.frame > .daily')),
        statusTitle:(title => getComputedStyle(title).fontSize + ' ' + getComputedStyle(title).fontWeight)(one('#ramEntry .MuiCardHeader-title')),
        families:[...new Set(texts.map(el => getComputedStyle(el).fontFamily.split(',')[0].trim()))],
        weights:[...new Set(texts.map(el => getComputedStyle(el).fontWeight))].sort(),
        sizes:[...new Set(texts.map(el => parseFloat(getComputedStyle(el).fontSize)))].sort((a, b) => a - b),
        titles:[...new Set(peers.concat([one('#diagnosisEntry'), one('#evolution'), one('#shiftChangeObservation'), one('section#vitalSignsEntry > .MuiCard-root'), one('#alertEntries')])
          .filter(card => !card.matches('[data-hhr-reading="status-card"]'))
          .map(card => { const title = getComputedStyle(card.querySelector('.MuiCardHeader-title')); return title.fontSize + ' ' + title.fontWeight; }))],
        surfaces:[...new Set(peers.concat([one('#diagnosisEntry')]).map(card => { const look = getComputedStyle(card); return look.borderTopLeftRadius + ' ' + look.boxShadow; }))],
        tables, empty,
        // The rhythm of each table: the size of its headings and of its cells, the band of its headings and its tallest row.
        rhythm:tabled.map(section => {
          // The size a cell is read at is the one of the element that holds its text.
          const words = [...section.querySelectorAll('tbody td *')].find(el => [...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize));
          return [getComputedStyle(section.querySelector('thead th')).fontSize, getComputedStyle(section.querySelector('thead th')).backgroundColor, getComputedStyle(words).fontSize,
            Math.round(Math.max(...[...section.querySelectorAll('tbody tr')].map(row => row.getBoundingClientRect().height)))];
        }),
        group:{count:tiles.length, heading:getComputedStyle(one('.frame'), '::before').content, headingSize:getComputedStyle(one('.frame'), '::before').fontSize,
          top:Math.min(...tiles.map(tile => box(tile).top)), bottom:Math.max(...tiles.map(tile => box(tile).bottom)), left:Math.min(...tiles.map(tile => tile.getBoundingClientRect().left)),
          rows:new Set(tiles.map(tile => Math.round(box(tile).top))).size,
          inside:tiles.every(tile => tile.getBoundingClientRect().left >= rail.left - 1 && tile.getBoundingClientRect().right <= rail.right + 1), heights:tiles.map(tile => Math.round(box(tile).height)),
          surfaces:[...new Set(tiles.map(tile => getComputedStyle(tile).backgroundColor))],
          says:tiles.map(tile => (message => message && getComputedStyle(message, '::after').content)(tile.querySelector('[data-hhr-reading="status-message"],[data-hhr-reading="status-denied"]'))),
          // A group per state: its state once, then the names one after the other.
          leads:tiles.map(tile => tile.closest('[data-hhr-round-tile]')).filter(tile => tile?.getAttribute('data-hhr-round-tile') === 'lead').map(tile => [tile.getAttribute('data-hhr-round-state'), Math.round(box(tile).top)]),
          names:tiles.map(tile => { const title = tile.querySelector('.MuiCardHeader-title, h3'); return title && Math.round(title.getBoundingClientRect().left); }),
          wraps:tiles.map(tile => tile.closest('[data-hhr-round-tile]')).filter(tile => tile?.hasAttribute('data-hhr-round-wrap')).map(tile => Math.round(tile.getBoundingClientRect().left))},
        // The daily row: the name of its field before it, whole, and the byline out of sight.
        daily:(row => row && (name => ({name:box(name), field:box(row.querySelector('.MuiInputBase-root')), byline:box(row.querySelector('[data-hhr-update-label]')),
          clipped:name.scrollWidth > name.clientWidth + 1}))(row.querySelector('.MuiInputLabel-root')))(one('.frame > .daily')),
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
          // Beside it in the group, a section in the second column: the filter starts where its name does.
          const second = [...document.querySelectorAll('[data-hhr-round-tile="end"] :is(.MuiCardHeader-title,[data-hhr-reading="empty-section-title"])')][0]?.getBoundingClientRect();
          const track = one('#noPharmaEntry .MuiCardHeader-action .MuiSwitch-root').getBoundingClientRect();
          void second; void track;
          // «Mostrar suspendidos» is drawn as an icon: its box, the room it leaves after the state, its words and its hint.
          const filter = one('#noPharmaEntry .MuiCardHeader-action label'), words = filter.querySelector('.MuiFormControlLabel-label, .MuiTypography-root') || filter.lastElementChild;
          return {end:Math.round(card.right - label.right), gap:Math.round(label.left - message.right), box:[Math.round(label.width), Math.round(label.height)], icon:getComputedStyle(filter, '::before').maskImage !== 'none',
            words:Math.round(words.getBoundingClientRect().width), name:filter.textContent.trim(), hint:filter.title, head:(el => [Math.round(el.width), Math.round(el.height)])(freeLabel),
            freeEnd:Math.round(free.right - freeLabel.right), afterMessage:label.left > message.right,
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
    scroll:Math.round(scrollY),
  };
});

// What the compact summary promises on the shapes Eloísa draws, checked on the page itself.
async function verifySummary(page, width, native, off, sans) {
  const shown = await read(page);
  const near = (a, b, slack = 2) => Math.abs(a - b) <= slack;
  assert.equal(shown.pageWidth, width, 'El resumen cabe en la ventana');
  // Eloísa focuses the empty alert field while the page loads, and the page follows it far down its own layout.
  assert.equal(shown.scroll, 0, 'El resumen se abre arriba aunque Eloísa dé el foco al campo de alertas');
  assert.ok(shown.columns, 'La ronda ocupa sus dos columnas');
  assert.deepEqual(shown.roles, {estimatedDischargeSection:'note', shiftChangeEntrySection:'handoff', vitalSignsEntry:'vitals', rest:'care', alertEntrySection:'alerts',
    diagnosisEntrySection:'diagnosis', medicationEntrySection:'peer', 'fixture-print':'print'});

  // The edges of the page: the round, every card and the section links keep the same margin on both sides.
  const {look} = shown;
  // The steps of the view: the space between two blocks and the reading edge inside a card.
  const gap0 = 12, inset = 16;
  assert.equal(look.rail[0], look.rail[1], 'La columna de la ficha deja el mismo margen a cada lado: ' + look.rail);
  assert.ok(look.rail[0] >= 32, 'El margen nunca es menor que el de Eloísa: ' + look.rail[0]);
  assert.equal(look.tabEdge, 0, 'Las pestañas empiezan donde empiezan los títulos de las tarjetas');
  assert.ok(look.lefts[0] === look.rail[0] && look.rights[0] === look.rail[1], `Las tarjetas empiezan y terminan en los bordes de esa columna: ${look.lefts[0]}/${look.rights[0]} frente a ${look.rail}`);
  // One gap between blocks, one typeface, two weights, four sizes, one title, one surface.
  assert.ok(look.gaps.length >= 3 && look.gaps.every(gap => gap === gap0), `Los bloques bajo la ronda se separan siempre ${gap0} px: ` + look.gaps);
  assert.deepEqual(look.edges, [look.rail.join('/')], 'Cada tarjeta bajo la ronda, Fármacos en su segunda sección incluida, termina en los bordes de la columna: ' + look.edges);
  // The wide pass swaps only the view's family, to measure another platform: there two are expected.
  if (!sans) assert.equal(look.families.length, 1, 'Una sola tipografía en toda la ficha: ' + look.families);
  assert.deepEqual(look.weights, ['400', '600'], 'Dos pesos de letra');
  // The tag (11 px) joins the scale since a value of Régimen reads as the other tags (27-11-2026).
  assert.ok(look.sizes.every(size => [11, 12, 13, 15, 16].includes(size)), 'Los tamaños de letra de la vista: ' + look.sizes);
  assert.deepEqual(look.titles, ['15px 600'], 'Cada tarjeta se titula igual');
  assert.deepEqual(look.surfaces, ['8px none'], 'Diagnóstico y las tarjetas bajo la ronda tienen la misma superficie');
  assert.ok(look.tables.every(([title, heading, cell]) => title === heading && heading === cell), 'Cada tabla empieza en el borde de su título: ' + JSON.stringify(look.tables));
  // Under «Sin datos» a section is its name alone: the state is said once by its group.
  void look.empty;
  assert.deepEqual(look.inks, ['rgb(33, 33, 33)', 'rgb(74, 74, 74)', 'rgb(102, 102, 102)'], 'El texto usa las tintas neutras de Eloísa');
  void look.emptyEdges;
  // The owner asked for an icon in place of the switch and its words, wherever a section shows what is suspended.
  assert.ok(look.filter.afterMessage && look.filter.oneLine && look.filter.gap >= 4 && look.filter.gap <= 16 && look.filter.box.join() === '20,20' && look.filter.head.join() === '26,26' &&
    look.filter.icon && look.filter.words <= 1 && /^Mostrar Suspendidos$/i.test(look.filter.name) && look.filter.hint === look.filter.name,
    '«Mostrar suspendidos» es un icono tras el estado de su sección, con sus palabras como nombre y como ayuda: ' + JSON.stringify(look.filter));
  assert.equal(look.filter.freeEnd, inset, 'Un filtro que cierra la cabecera termina en el borde de lectura');
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
  // Without records its filter for another period waits behind an icon, after «Sin registros». The icon opens it.
  assert.ok(balance.fold?.shown && balance.fold.expanded === 'false' && balance.fold.name === 'Filtrar otro periodo' && balance.fold.icon && balance.fold.controls &&
    balance.fold.afterState && balance.fold.size.every(side => side === 26) && !balance.filter && balance.calendars === 0,
    'Balance Hídrico sin registros guarda su filtro tras un icono: ' + JSON.stringify(balance));
  await page.click('[data-hhr-balance-filter]');
  await page.waitForFunction(() => document.querySelector('[data-hhr-balance-filter]')?.getAttribute('aria-expanded') === 'true');
  const opened = (await read(page)).balance;
  assert.ok(opened.fold.shown && opened.fold.expanded === 'true', 'El icono queda junto al filtro abierto: ' + JSON.stringify(opened.fold));
  assert.equal(await page.evaluate(() => document.activeElement?.closest('#inputOutputHydricBalanceEntry .MuiCardContent-root > .MuiStack-root') !== null), true, 'Abierto, el foco pasa al filtro');
  Object.assign(balance, opened);
  assert.ok(balance.height <= native.balance.height - 40 && balance.controls.length === 5 && balance.controls.every(height => height <= 30) && balance.filter && balance.calendars === 2 && balance.edge === inset,
    `Balance Hídrico filtra en una línea, con sus campos, su calendario y «Filtrar»: ${native.balance.height} → ${balance.height}, ${balance.controls}`);
  for (const id of ['adverseEventEntry', 'obstetricGynecologicalExaminationEntry']) {
    const line = lines[id];
    // In half of half the line a long name with a wide letter may take two lines.
    assert.ok(line.mark === 'status-card' && line.height <= 44 && line.title === look.statusTitle, `Una sección sin permiso es una línea breve, como RAM: ${id} ${JSON.stringify(line)}`);
  }
  // The owner asked for the summary without the line of section links, and for the daily row not to be a line of it.
  // The row rides on the line of tabs, between them and the floating bar.
  const {daily, group, dock} = look;
  assert.ok(!dock.links && dock.slot === 0, 'La línea de enlaces de sección no se muestra ni deja su hueco: ' + JSON.stringify([dock.links, dock.slot]));
  assert.ok(dock.line === 'tabs' && dock.position === 'fixed' && dock.onTabs && dock.afterTabs >= 12 && dock.beforeBar >= 8 && dock.reachable,
    'La fila diaria va en la línea de pestañas, entre ellas y la barra flotante: ' + JSON.stringify(dock));
  // Names, as the owner asked: a first name and a first surname for every professional, and the diagnosis without its hour.
  // Eloísa's own text, with the whole name, stays in the page.
  const naming = await page.evaluate(() => {
    const label = selector => document.querySelector(selector)?.getAttribute('data-hhr-update-label'), shown = el => getComputedStyle(el, '::after').content;
    const alert = document.querySelector('#alertEntries [data-hhr-author]'), asked = document.querySelector('#medicationEntrySection td[data-hhr-reading="order-requester"] [data-hhr-author]');
    const heading = document.querySelector('#medicationEntrySection th[data-hhr-reading="order-indication"] > *');
    return {diagnosis:label('#diagnosisEntry .MuiCardHeader-subheader'), note:label('#evolution .MuiCardHeader-subheader'), diet:label('#nutritionOrder .MuiCardHeader-subheader'),
      native:document.querySelector('#diagnosisEntry .MuiCardHeader-subheader').textContent, alert:[alert?.textContent, shown(alert), getComputedStyle(alert).fontSize],
      asked:[asked?.textContent.trim(), shown(asked)], heading:[heading?.textContent.trim(), shown(heading), getComputedStyle(heading).fontSize]};
  });
  assert.deepEqual([naming.diagnosis, naming.note, naming.diet], ['15-04-2026 · Tomás Ejemplo', '15-04-2026 · 09:12 · Tomás Ejemplo', '15-04-2026 · 10:45 · Tomás Ejemplo'],
    'Cada firma dice un nombre y un apellido, y la del diagnóstico no lleva hora');
  assert.match(naming.native, /09:05:10, Médico Tomás {2}Ejemplo Prueba$/, 'La firma de Eloísa sigue entera en la página');
  assert.deepEqual([naming.alert, naming.asked], [['Enfermera(o) Elena  Ejemplo Prueba', '"Elena Ejemplo" / ""', '0px'], ['Tomás Ejemplo Prueba', '"Tomás Ejemplo" / ""']],
    'Quien escribió una alerta y quien pidió un fármaco se leen con un nombre y un apellido, sin el cargo (pedido el 27-11-2026)');
  assert.deepEqual(naming.heading, ['Indication', '"Indicación" / ""', '0px'], 'La columna «Indication» de Eloísa se lee «Indicación»');
  // Balance Hídrico without records: one line, with its filter whole and two words for its state.
  const idle = await page.evaluate(() => { const card = document.querySelector('#inputOutputHydricBalanceEntry'), box = el => el.getBoundingClientRect(), state = card.querySelector('[data-hhr-balance="empty"]');
    const fields = [...card.querySelectorAll('.MuiCardContent-root input:not(.MuiSelect-nativeInput), .MuiSelect-select')].filter(el => el.getClientRects().length);
    return {height:Math.round(box(card).height), says:getComputedStyle(state, '::after').content, native:state.textContent, tops:new Set([...card.querySelectorAll('.MuiCardHeader-title, .MuiCardContent-root button, .MuiSwitch-root')].map(el => Math.round((box(el).top + box(el).bottom) / 2 / 6))).size,
      whole:fields.filter(el => el.matches('input')).every(el => el.scrollWidth <= el.clientWidth + 1), count:fields.length, inside:[...card.querySelectorAll('*')].every(el => !el.getClientRects().length || box(el).bottom <= box(card).bottom + 1)}; });
  // In the narrower window its switch takes a second line.
  assert.ok(idle.height <= (width >= 1440 ? 48 : 84) && idle.says === '"Sin registros" / ""' && /^No se presentan registros de balance hídrico/.test(idle.native) && idle.tops <= 2 && idle.count === 4 && idle.inside,
    'Balance Hídrico sin registros es una línea, con su filtro y «Sin registros»: ' + JSON.stringify(idle));
  assert.ok(idle.whole, 'Cada fecha de su filtro se lee entera');
  // Every section without records is read under «Sin datos»: the owner asked for no control that folds or unfolds them.
  const grouped = await page.evaluate(() => ({toggle:document.querySelectorAll('.hhr-ficha-empty-toggle, [data-hhr-ficha-folded]').length,
    shown:['#physicalExaminationEntry', '#encounterFormEntry', '#noPharmaEntrySection', '#referralRequestEntrySection'].map(id => Boolean(document.querySelector(id)?.closest('[data-hhr-round-tile]')?.getClientRects().length)),
    // Two tiles of a row read on one line, whatever kind of empty section each is.
    rows:(tiles => tiles.every(([top, title], at) => at % 2 === 0 || tiles[at - 1][2] === 'whole' || tiles[at][2] !== 'end' || (top === tiles[at - 1][0] && title === tiles[at - 1][1])))(
      [...document.querySelectorAll('[data-hhr-round-tile]')].map(tile => [Math.round(tile.getBoundingClientRect().top), Math.round((tile.querySelector('.MuiCardHeader-title,[data-hhr-reading="empty-section-title"]') || tile).getBoundingClientRect().top), tile.getAttribute('data-hhr-round-tile')]))}));
  assert.ok(grouped.toggle === 0 && grouped.shown.every(Boolean), 'Toda sección vacía se lee bajo «Sin datos», sin botón que la pliegue: ' + JSON.stringify(grouped));
  // Eloísa gives the field 180 px: «Imprimir» was drawn over the date. Each control follows the one before.
  assert.ok(dock.order[0] && dock.order[1] >= 4 && dock.order[1] <= 12, 'El calendario queda dentro del campo de fecha e «Imprimir» lo sigue sin taparlo: ' + dock.order);
  assert.equal(dock.lead, '1', 'y el resumen empieza en la línea que la fila ocupaba');
  assert.ok(dock.date[0] >= 100 && dock.date[0] <= 120 && dock.date[1], 'El campo de la fila diaria mide lo que una fecha y la muestra entera: ' + dock.date);
  assert.ok(daily.byline.width <= 1 && daily.byline.height <= 1, 'La fila diaria no muestra quién actualizó el resumen');
  if (dock.short) assert.ok(daily.name.width <= 1, 'Sin sitio para su nombre, el campo lo conserva solo para el lector de pantalla');
  else assert.ok(!daily.clipped && daily.name.width > 100 && daily.name.right <= daily.field.left && Math.abs((daily.name.top + daily.name.bottom) / 2 - (daily.field.top + daily.field.bottom) / 2) <= 2,
    'El nombre del campo del resumen diario se lee entero, antes del campo: ' + JSON.stringify(daily));
  // What has no records, or cannot be seen, closes the summary together: a heading and a short line for each section.
  // The owner asked for «Sin datos» in as few lines as can hold it: one group per state, its state said once,
  // then the names of its sections one after the other, wrapping under the first name.
  assert.ok(group.count === 10 && group.inside && group.rows <= 4 && group.heights.every(height => height <= 24) && group.top >= shown.signs.top && group.left >= shown.signs.right - 1,
    'Las secciones sin datos se leen junto a Signos, en pocas líneas: ' + JSON.stringify(group));
  assert.deepEqual([group.heading, group.headingSize, group.surfaces], ['"Sin datos"', '12px', ['rgba(0, 0, 0, 0)']], 'El grupo tiene su rótulo y no dibuja una tarjeta por sección');
  assert.deepEqual(group.leads.map(([state]) => state), ['none', 'denied'], 'Un grupo sin registros y otro sin permiso, en ese orden: ' + JSON.stringify(group.leads));
  assert.deepEqual(group.says.filter(state => state !== 'none'), ['"Sin registros" / ""', '"Sin permiso" / ""'], 'Cada grupo dice su estado una vez: ' + group.says);
  const leadNames = group.names.filter((left, at) => at === 0 || at === group.names.length - 2);
  assert.ok(group.wraps.every(left => Math.abs(left - leadNames[0]) <= 1) && Math.abs(leadNames[0] - leadNames[1]) <= 1,
    'Los nombres de cada grupo empiezan en una misma columna, también al saltar de línea: ' + JSON.stringify([leadNames, group.wraps]));
  // Its sentence is three text nodes. Read whole, it is an empty request like Exámenes, beside it on the last line of the round.
  assert.deepEqual([lines.operationTheaterRequestEntry.mark, lines.operationTheaterRequestEntry.round], ['status-card', 'empty-request'], 'Cirugía sin solicitudes acompaña a Exámenes');

  // The round: the note with the handoff and the alerts beside it, all three ending on one line; then the signs across the page.
  assert.ok(near(shown.handoff.left, shown.alerts.left) && near(shown.alerts.top, shown.handoff.bottom) && shown.handoff.left >= shown.note.right - 1, 'Alertas sigue a la entrega de turno');
  // From 1360 px the handoff and the alerts take five twelfths of the line; narrower, four.
  const share = shown.handoff.width / (shown.handoff.width + shown.note.width);
  assert.ok(Math.abs(share - (page.viewportSize().width >= 1360 ? 5 / 12 : 4 / 12)) < .02, 'La entrega de turno y Alertas tienen su ancho: ' + share.toFixed(3));
  assert.ok(near(shown.note.top, shown.handoff.top) && near(shown.alerts.bottom, shown.note.bottom, 1), `La nota y las tarjetas a su lado empiezan y terminan en la misma línea: ${shown.note.bottom} y ${shown.alerts.bottom}`);
  assert.ok(shown.alertList.overflow === 'auto' && shown.alertList.scroll <= shown.alertList.height + 1, 'Tres alertas caben en su lista sin desplazarla: ' + JSON.stringify(shown.alertList));
  // Alertas reads like the rest of the summary: a row is its text in the ink and weight of what is read, with who
  // wrote it and when in the ink of what situates, and no rule of its own. One mark beside the title flags the card.
  const alertLook = await page.evaluate(() => { const card = document.querySelector('#alertEntries'), look = (el, pseudo) => getComputedStyle(el, pseudo);
    const rows = [...card.querySelectorAll('.alerts-list > .alert-row')], toggle = card.querySelector('[data-hhr-resuscitation-toggle]');
    const flag = () => [look(toggle).backgroundColor, look(toggle).boxShadow === 'none', look(toggle.querySelector('.MuiFormControlLabel-label')).fontWeight, Math.round(toggle.getBoundingClientRect().left), Math.round(toggle.getBoundingClientRect().width)];
    const idle = flag();
    toggle.querySelector('input').click();
    const on = flag();
    toggle.querySelector('input').click();
    return {rows:rows.map(row => { const message = row.querySelector(':scope > .MuiStack-root > div > .MuiTypography-body2'), author = row.querySelector('[data-hhr-author]'), time = row.querySelector('.MuiTypography-caption');
        // A name already short is read as Eloísa writes it; a longer one, by its short form.
        const signed = author || row.querySelector(':scope > .MuiStack-root > p');
        return [look(row).borderInlineStartWidth, look(message).fontWeight, look(message).color, author ? look(author, '::after').color : look(signed).color, look(time).color].join(' | '); }),
      heights:rows.map(row => Math.round(row.getBoundingClientRect().height)), mark:[look(card.querySelector('.MuiCardHeader-title'), '::before').backgroundColor, look(card.querySelector('.MuiCardHeader-title'), '::before').width], idle, on}; });
  assert.deepEqual([...new Set(alertLook.rows)], ['0px | 400 | rgb(33, 33, 33) | rgb(102, 102, 102) | rgb(102, 102, 102)'], 'Una alerta se lee como una fila del resumen, sin su propia regla: ' + JSON.stringify(alertLook.rows));
  assert.ok(alertLook.heights.every(height => height <= 64) && alertLook.mark.join() === 'rgb(181, 121, 63),7px', 'y la tarjeta lleva una sola marca, junto a su título: ' + JSON.stringify([alertLook.heights, alertLook.mark]));
  assert.ok(alertLook.idle[0] === 'rgba(0, 0, 0, 0)' && alertLook.idle[1] && alertLook.idle[2] === '400' && alertLook.on[0] !== alertLook.idle[0] && !alertLook.on[1] && alertLook.on[2] === '600' &&
    alertLook.on[3] === alertLook.idle[3], '«No reanimación» se lee como un interruptor más hasta que se marca, y no se mueve al marcarla: ' + JSON.stringify([alertLook.idle, alertLook.on]));
  assert.equal(shown.noteLines, 14, 'La nota muestra catorce líneas a la vez');
  // Under the note, the signs take the first half of the line and the care instructions follow under them: what has no
  // data sits beside both. The owner saw the signs stretched to the height of that column, with a blank band under
  // their measurements: each column is as high as what it carries.
  const middle = rect => (rect.top + rect.bottom) / 2, {careLine, requests} = shown;
  assert.ok(near(shown.signs.left, shown.note.left) && near(shown.signs.top, shown.note.bottom + gap0) && near(careLine.left, shown.signs.left) && near(careLine.right, shown.signs.right, 2) &&
    near(careLine.top, shown.signs.bottom + gap0), `Signos ocupa la mitad de la línea bajo la nota, con Reposo y Régimen debajo: ${shown.signs.bottom} y ${careLine.top}`);
  const blank = await page.evaluate(() => { const card = document.querySelector('#vitalSignsEntry.MuiCard-root'), content = card.querySelector('.MuiCardContent-root');
    const last = Math.max(...[...content.children].filter(el => el.getClientRects().length && getComputedStyle(el).position !== 'absolute').map(el => el.getBoundingClientRect().bottom));
    return Math.round(card.getBoundingClientRect().bottom - last); });
  assert.ok(blank >= 0 && blank <= 12, 'La tarjeta de Signos termina con sus mediciones, sin una franja en blanco: ' + blank);
  assert.ok(new Set(shown.tiles.map(tile => Math.round(tile.top))).size <= 3, 'Las nueve mediciones ocupan tres filas a lo más en su mitad de la línea');
  // Name, value and what details it (the PAM and the time share a line): three lines, as compact as before.
  assert.ok(shown.tiles.every(tile => tile.height < 52), 'Una medición sin unidad no deja una línea vacía: ' + shown.tiles.map(tile => Math.round(tile.height)));
  const reading = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('#vitalSignsEntry [data-hhr-reading="vital-tile"]')].filter(tile => tile.querySelector('[data-hhr-reading="vital-value"]'));
    const at = (tile, role) => tile.querySelector('[data-hhr-reading="' + role + '"]')?.getBoundingClientRect();
    const pressure = tiles.find(tile => tile.querySelector('[data-hhr-reading="vital-pam"]'));
    const value = at(pressure, 'vital-value'), pam = at(pressure, 'vital-pam'), name = at(pressure, 'vital-label');
    const rows = Object.values(Object.groupBy(tiles, tile => Math.round(tile.getBoundingClientRect().top)));
    return {pam:{under:Math.round(pam.top - value.bottom), start:Math.round(pam.left - value.left), name:Math.round(value.top - name.bottom)},
      tops:rows.map(row => new Set(row.map(tile => Math.round(at(tile, 'vital-value').top))).size),
      starts:tiles.map(tile => Math.round(at(tile, 'vital-value').left - at(tile, 'vital-label').left))};
  });
  assert.ok(reading.pam.under >= -1 && reading.pam.under <= 4 && Math.abs(reading.pam.start) <= 1 && reading.pam.name >= -1,
    'La PAM va bajo el valor de la presión, al mismo comienzo: ' + JSON.stringify(reading.pam));
  assert.ok(reading.tops.every(size => size === 1), 'Los valores de una fila de mediciones están en la misma línea: ' + reading.tops);
  assert.ok(reading.starts.every(start => Math.abs(start) <= 1), 'Cada valor empieza donde su nombre: ' + reading.starts);

  // An empty rest is a card without its section. The owner asked for every empty section under «Sin datos»: it
  // keeps its place in the block it shares with Régimen, out of sight with Eloísa's sentence, and its name is read
  // there with the sections without records. Régimen takes the line under Signos.
  assert.ok(shown.rest.hidden !== null && shown.rest.hidden <= 1, 'El reposo sin registro deja su lugar, fuera de la vista: ' + JSON.stringify(shown.rest));
  assert.equal(shown.rest.native, 'No se presenta un Reposo registrado para este paciente', 'La frase de Eloísa sigue en la página');
  assert.deepEqual(shown.rest.tile, {tile:'item', name:'Reposo', aria:'true', shown:true}, 'y su nombre se lee bajo «Sin datos», con las secciones sin registros');
  assert.ok(near(shown.diet.left, shown.signs.left, 2) && near(shown.diet.right, shown.signs.right, 2), 'Régimen ocupa la línea bajo Signos: ' + JSON.stringify([shown.diet.left, shown.diet.right]));
  assert.ok(shown.diet.height <= 60 && shown.diet.text, `El régimen se lee en dos líneas a lo más: ${shown.diet.height}`);
  // Exámenes and Cirugía without requests are two more sections without data, in their group.
  assert.ok(requests.length === 2 && requests.every(request => request.top >= shown.signs.top && request.left >= shown.signs.right - 1 && request.right <= shown.alerts.right + 1 && request.height <= 30),
    'Las solicitudes sin registros se leen con las demás secciones sin datos: ' + JSON.stringify(requests));

  // The diagnosis says why the patient is here: it opens the round, above the note, one line each.
  const roundEnd = Math.max(careLine.bottom, group.bottom), {diagnosis, medication, print} = shown;
  assert.ok(near(shown.note.top - diagnosis.card.bottom, gap0) && diagnosis.card.top < shown.note.top, `Diagnóstico abre la ronda: ${diagnosis.card.bottom} y ${shown.note.top}`);
  assert.ok(diagnosis.card.bottom <= shown.viewport, `Diagnóstico se lee en la primera pantalla: ${diagnosis.card.bottom}`);
  assert.ok(diagnosis.card.top < native.diagnosis.card.top - 600, 'Diagnóstico deja de estar tras las indicaciones');
  assert.ok(diagnosis.rows.length === summaryDiagnoses.length && diagnosis.rows.every((row, at) => row.text.includes(summaryDiagnoses[at][1])), 'Cada diagnóstico conserva su texto');
  assert.ok(diagnosis.rows.every(row => row.height <= 36 && row.state >= 24), 'Un diagnóstico es una línea y su estado sigue siendo pulsable: ' + diagnosis.rows.map(row => row.height));
  // The owner asked for the state read as text: no box nor arrow at rest, both again on the row pointed at, the word in place.
  const quiet = async () => page.evaluate(() => [...document.querySelectorAll('#diagnosisEntrySection tbody tr')].map(row => { const root = row.querySelector('[role="combobox"]').parentElement, cell = root.closest('td');
    return [getComputedStyle(root.querySelector('.MuiOutlinedInput-notchedOutline')).borderTopColor, getComputedStyle(root.querySelector('.MuiSelect-icon')).visibility,
      Math.round(root.querySelector('[role="combobox"] .MuiTypography-root').getBoundingClientRect().left - cell.getBoundingClientRect().left - parseFloat(getComputedStyle(cell).paddingLeft))]; }));
  await page.mouse.move(0, 0);
  const rest = await quiet();
  await page.locator('#diagnosisEntrySection tbody tr').first().hover();
  const pointed = await quiet();
  await page.mouse.move(0, 0);
  assert.ok(rest.every(([line, arrow, edge]) => line === 'rgba(0, 0, 0, 0)' && arrow === 'hidden' && Math.abs(edge) <= 1) && pointed[0][0] !== rest[0][0] && pointed[0][1] === 'visible' && pointed[0][2] === rest[0][2] &&
    pointed.slice(1).every(([line, arrow]) => line === 'rgba(0, 0, 0, 0)' && arrow === 'hidden'), 'El estado se lee como texto y muestra su caja y su flecha al apuntar su fila, sin moverse: ' + JSON.stringify([rest, pointed]));
  assert.deepEqual(diagnosis.rows.map(row => row.icons), [['18×18', '24×24', '24×24'], ['24×24', '24×24']], 'La estrella y las notas de un diagnóstico miden lo que una línea');
  assert.deepEqual(diagnosis.rows.map(row => row.star), [true, false], 'La estrella marca el diagnóstico principal');
  assert.ok(diagnosis.title.right <= diagnosis.rows[0].left + 1 && near(diagnosis.byline.height, 16, 3), 'El nombre y la firma de la tarjeta ocupan su columna, la firma en una línea');
  assert.ok(diagnosis.rows[0].left - diagnosis.card.left <= diagnosis.byline.width + 2 * inset + 4, `La columna del nombre mide lo que su firma: ${diagnosis.rows[0].left - diagnosis.card.left} para ${diagnosis.byline.width}`);
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
  assert.ok(near(medication.card.top - roundEnd, gap0), 'La línea del icono no deja un hueco sobre Fármacos: ' + (medication.card.top - roundEnd));

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
    assert.ok(row.actions.every(([, height]) => height >= 24) && row.height <= (row.markerBelow ? 68 : 48) && row.height < native.medication.rows[at].height,
      `La fila ${at} es más baja: ${native.medication.rows[at].height} → ${row.height}`);
  });
  assert.equal(new Set(medication.rows.map(row => Math.round(row.days.end))).size, 1, 'Las unidades de los días caen en una línea: ' + medication.rows.map(row => Math.round(row.days.end)));
  // Eloísa hangs the number under a triangle the view does not draw: it read 4 px under the name.
  assert.ok(medication.rows.filter(row => row.height <= 32).every(row => row.days.line <= 2), 'El número de días se lee en la línea de su medicamento: ' + medication.rows.map(row => row.days.line));
  const single = medication.rows.filter(row => row.height <= 32).length, visible = medication.rows.filter(row => row.bottom <= shown.viewport).length;
  // The columns that are read keep the width they had before the reading edge grew: the same rows fit on a line.
  assert.ok(single >= 6, `La mayoría de las indicaciones cabe en una línea: ${single} de ${medication.rows.length}`);
  // The first screen is the round: why the patient is here, the note and what goes with it, and the signs.
  const lastTile = Math.max(...shown.tiles.map(tile => tile.bottom));
  assert.ok(lastTile <= shown.viewport, `La primera pantalla llega a las mediciones de los signos vitales: ${lastTile} de ${shown.viewport}`);
  void visible;

  // The note keeps its height whatever its length, so every card under it keeps its place. Eloísa's own
  // disclosure leaves here a note of two lines.
  await page.locator('#evolution button[data-hhr-note-disclosure]').evaluate(button => button.click());
  await refresh(page);
  const short = await read(page);
  assert.ok(short.noteLines === 14 && near(short.note.height, shown.note.height, 1) && near(short.alerts.bottom, short.note.bottom, 1) &&
    near(short.medication.card.top, medication.card.top, 1), `Una nota corta ocupa lo mismo que una larga: ${shown.note.height} → ${short.note.height}, Fármacos ${medication.card.top} → ${short.medication.card.top}`);
  // Cut, the note shows Eloísa's «Leer más» with its other actions. Read whole again, nothing folds it.
  const more = page.locator('#evolution button[data-hhr-note-disclosure="more"]');
  assert.ok(await more.isVisible() && await more.evaluate(button => { const box = button.getBoundingClientRect(), entry = document.querySelector('#evolution .hhr-evo-entry').getBoundingClientRect();
    return Math.abs(box.top - entry.top) <= 2 && box.height >= 28; }), 'Una nota cortada muestra «Leer más» en la línea de acciones de la tarjeta');
  await more.click();
  await refresh(page);
  assert.ok(await page.locator('#evolution button[data-hhr-note-disclosure="less"]').evaluate(button => getComputedStyle(button).visibility === 'hidden'), 'Con la nota entera no se dibuja el control que la contrae');

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
  assert.ok(wide.rail[0] === wide.rail[1] && Math.abs(1990 - wide.rail[0] * 2 - 1440) <= 1 && wide.tabEdge === 0,
    'En una pantalla ancha el contenido mide 1440 px y queda centrado: ' + wide.rail);
  await page.setViewportSize(viewport);
  await refresh(page);

  // Keyboard, as it is seen: from the diagnosis into the note; and from the end of the round to «Imprimir
  // indicaciones» and the tools of Fármacos.
  await page.locator('#diagnosisEntrySection tbody tr').last().locator('button:enabled').last().focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('#evolution'))), true, 'Tras el diagnóstico, Tab entra en la evolución');
  await page.locator('#vitalSignsEntry [data-hhr-reading="vital-history"]').focus();
  // Beside the signs, the filter of a section without data is the next stop: it belongs to the round.
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('#noPharmaEntrySection')) && document.activeElement.type), 'checkbox', 'Tras los signos, Tab llega al filtro de una sección sin datos');
  const order = [];
  for (let step = 0; step < 4; step++) {
    await page.keyboard.press('Tab');
    order.push(await page.evaluate(() => [document.activeElement.querySelector('svg')?.getAttribute('aria-label') || document.activeElement.textContent.trim() || document.activeElement.type,
      getComputedStyle(document.activeElement).outlineStyle]));
  }
  // After the group «Sin datos», which has no control of its own, the cards under the round.
  assert.deepEqual(order.slice(0, 3).map(([name]) => name), ['Imprimir indicaciones', 'validar tratamiento', 'checkbox'], 'Tab sigue el orden en que se ven: ' + order.map(([name]) => name));
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
  // Eloísa's menu, like every window it opens, hides the whole page from a screen reader while it is open
  // (`aria-hidden` on what lies behind). The owner saw the summary lose its shape under it: it must stay as it is.
  await page.evaluate(() => { document.querySelector('main').setAttribute('aria-hidden', 'true'); document.body.setAttribute('aria-hidden', 'true'); });
  await refresh(page);
  const veiled = await read(page);
  assert.deepEqual([veiled.columns, veiled.roles, veiled.marks, veiled.look.dock.line, veiled.look.dock.lead, Math.round(veiled.medication.card.top), veiled.pageWidth],
    [true, shown.roles, again.marks, 'tabs', '1', Math.round(shown.medication.card.top), width], 'Con el menú de Eloísa abierto el resumen conserva su forma, sus marcas y su fila diaria');
  await page.evaluate(() => { document.querySelector('main').removeAttribute('aria-hidden'); document.body.removeAttribute('aria-hidden'); });
  await refresh(page);
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
    assert.ok(line.mark === 'status-card' && line.round === 'peer' && line.height <= 30 && line.oneLine && line.title === shown.look.statusTitle,
      `Una sección vacía con tabla se lee como las demás vacías: ${id} ${JSON.stringify(line)}`);
  }
  assert.ok(shown.look.gaps.every(gap => gap === 12) && shown.look.edges.length === 1, 'Los bloques conservan su separación y sus bordes: ' + shown.look.gaps + ' ' + shown.look.edges);
  assert.equal(await page.locator('[data-hhr-ficha-folded] #diagnosisEntry, [data-hhr-ficha-folded]#diagnosisEntry').count(), 0, 'Un diagnóstico ausente no se pliega con las secciones vacías');
  await page.close();
  // A summary the view recognizes says nothing. One it does not, here without Observaciones de entrega, says so once,
  // after the page has been still, and is shown as Eloísa draws it.
  page = await open({});
  const quiet = await page.evaluate(() => new Promise(resolve => setTimeout(() => resolve(document.documentElement.getAttribute('data-hhr-view-unrecognized')), 4500)));
  assert.equal(quiet, null, 'Un Resumen reconocido no avisa nada');
  const unknown = await page.evaluate(() => new Promise(resolve => {
    let count = 0;
    document.addEventListener('hhr-view-unrecognized', event => { count += event.detail === 'Resumen' ? 1 : 100; });
    document.querySelector('#shiftChangeEntrySection').closest('.MuiGrid-item').remove();
    document.dispatchEvent(new Event('fixture-refresh'));
    setTimeout(() => resolve({count, view:document.documentElement.getAttribute('data-hhr-view-unrecognized'), frame:Boolean(document.querySelector('[data-hhr-round="frame"]'))}), 5500);
  }));
  assert.deepEqual(unknown, {count:1, view:'Resumen', frame:false}, 'Un Resumen que la vista no reconoce lo avisa una vez: ' + JSON.stringify(unknown));
  await page.close();
  // Procedimientos, Solicitud interconsulta, Solicitud de examen and Solicitudes de intervención quirúrgica with records
  // read like the other tables: the title, the headings and the first cell on one edge, and the same rhythm.
  page = await open({procedureList:summaryProcedures, referralList:summaryReferrals, testList:summaryTests, surgeryList:summarySurgeries});
  shown = await read(page);
  assert.equal(shown.look.tables.length, 7, 'Las cuatro secciones dibujan su tabla: ' + shown.look.tables.length);
  assert.ok(shown.look.tables.every(([title, heading, cell]) => title === heading && heading === cell), 'Cada tabla empieza en el borde de su título: ' + JSON.stringify(shown.look.tables));
  assert.ok(shown.look.rhythm.every(([heading, band, cell]) => heading === '12px' && band === shown.look.rhythm[0][1] && cell === shown.look.rhythm[0][2]),
    'Las tablas comparten el tamaño de sus cabeceras y de sus celdas y su banda: ' + JSON.stringify(shown.look.rhythm));
  // The owner asked for Procedimientos as dense as the rest: these sections read at the rhythm of Fármacos. A row is one
  // line high, also with the selector of its state and with a text Eloísa cuts, whose «Ver más» ends its own line.
  const dense = await page.evaluate(() => {
    const rows = id => [...document.querySelectorAll('#' + id + ' tbody tr')].map(row => Math.round(row.getBoundingClientRect().height));
    const cut = document.querySelector('#procedureEntrySection td button[data-hhr-note-disclosure="more"]'), text = cut.closest('td').querySelector('.MuiTypography-root');
    const select = document.querySelector('#procedureEntrySection td .MuiInputBase-root').getBoundingClientRect();
    return {orders:rows('medicationEntrySection').filter(height => height <= 32)[0], rows:['procedureEntrySection', 'referralRequestEntrySection', 'procedureOrderEntrySection', 'diagnosisTestEntrySection', 'operationTheaterRequestEntrySection'].map(rows),
      sameLine:Math.abs((cut.getBoundingClientRect().top + cut.getBoundingClientRect().bottom) / 2 - (text.getBoundingClientRect().top + text.getBoundingClientRect().bottom) / 2) <= 3 && cut.getBoundingClientRect().left >= text.getBoundingClientRect().right,
      select:[Math.round(select.width), Math.round(select.height)], tool:(button => [Math.round(button.getBoundingClientRect().width), Math.round(button.getBoundingClientRect().height)])(document.querySelector('#procedureEntrySection td .MuiIconButton-root'))};
  });
  assert.ok(dense.rows.flat().every(height => height <= dense.orders + 5) && dense.sameLine && dense.select[0] <= 140 && dense.select[1] <= 28 && dense.tool[0] >= 24 && dense.tool[1] >= 24,
    'Procedimientos y las demás secciones con registros se leen al ritmo de Fármacos, una línea por fila: ' + JSON.stringify(dense));
  // Open, the whole text is read and its disclosure closes it.
  await page.locator('#procedureEntrySection td button[data-hhr-note-disclosure="more"]').first().click();
  await refresh(page);
  const opened = await page.evaluate(() => { const cell = document.querySelector('#procedureEntrySection tbody tr td:nth-child(6)'), text = cell.querySelector('.MuiTypography-root');
    return {whole:text.scrollWidth <= text.clientWidth + 1 && getComputedStyle(text).whiteSpace !== 'nowrap', less:Boolean(cell.querySelector('button[data-hhr-note-disclosure="less"]')), inside:cell.scrollWidth <= cell.clientWidth + 1}; });
  assert.deepEqual(opened, {whole:true, less:true, inside:true}, 'Al abrir un fundamento se lee entero dentro de su celda, con «Ver menos»: ' + JSON.stringify(opened));
  assert.deepEqual([shown.look.titles, shown.look.surfaces, shown.look.edges], [['15px 600'], ['8px none'], [shown.look.rail.join('/')]], 'Sus tarjetas se titulan y terminan como las demás');
  assert.ok(shown.look.gaps.length >= 7 && shown.look.gaps.every(gap => gap === 12), 'y se separan como las demás: ' + shown.look.gaps);
  // The owner asked for the exam requests without «Imprimir selección»: the button is not drawn, nor the line
  // that only held it, and each order keeps the print action of its row.
  const printTests = await page.evaluate(() => { const button = document.getElementById('fixture-print-tests'), card = button.closest('.MuiCard-root');
    return [button.getClientRects().length, button.parentElement.getClientRects().length, card.querySelectorAll('tbody svg[aria-label="Imprimir"]').length, card.querySelectorAll('tbody tr').length]; });
  assert.ok(printTests[0] === 0 && printTests[1] === 0 && printTests[2] === printTests[3] && printTests[3] > 0, '«Imprimir selección» no se dibuja y cada orden conserva su «Imprimir»: ' + printTests);
  // One button: Eloísa fills «Imprimir» and «Filtrar» in green and «Validar tratamiento» in orange, and the view
  // adds outlined ones. The owner asked for a single look: a line around the words, in the ink of what is pressed.
  // Each print says what it prints, in the look of «Imprimir indicaciones»: the icon of the daily row prints the
  // evolution and the one at the end of Fármacos the recetón (read on the page 27-11-2026).
  // PAM reads as a whole number (asked 27-11-2026): Eloísa's figure, with two decimals, stays in the page out of sight.
  const pam = await page.evaluate(() => { const value = document.querySelector('[data-hhr-vital-rounded]');
    return value && {says:getComputedStyle(value, '::after').content, native:value.textContent, size:getComputedStyle(value).fontSize, width:Math.round(value.getBoundingClientRect().width)}; });
  assert.ok(pam && pam.says === '"87" / ""' && pam.native === '87.33' && pam.size === '0px' && pam.width <= 20, 'La PAM se lee como número entero: ' + JSON.stringify(pam));
  // The print of the evolution rides on its card, beside «Ver evoluciones», and presses Eloísa's icon, which
  // leaves the daily row (asked by the owner on 27-11-2026, with the summary reorganized).
  const evolutionPrint = await page.evaluate(() => {
    const proxy = document.querySelector('#evolution .MuiCardHeader-action > .hhr-evo-entry + .hhr-evo-print'), native = document.querySelector('.frame > .daily hr + button');
    let pressed = 0; native.addEventListener('click', () => { pressed++; }, {once:true}); proxy?.click();
    return {proxy:Boolean(proxy), name:proxy?.getAttribute('aria-label'), size:proxy && [proxy.offsetWidth, proxy.offsetHeight], native:native.getClientRects().length,
      rule:document.querySelector('.frame > .daily hr').getClientRects().length, pressed};
  });
  assert.deepEqual(evolutionPrint, {proxy:true, name:'Imprimir evolución', size:[28, 28], native:0, rule:0, pressed:1},
    'La impresión de la evolución va en su tarjeta y pulsa el icono de Eloísa, que deja la fila diaria: ' + JSON.stringify(evolutionPrint));
  const prints = await page.evaluate(() => [['#medicationEntrySection .MuiCardHeader-action > .MuiStack-root > button.MuiIconButton-root', 'Imprimir recetón'],
    ['#fixture-print', 'Imprimir indicaciones']].map(([selector, name]) => {
    const button = document.querySelector(selector);
    if (!button) return {missing:selector};
    const box = button.getBoundingClientRect(), look = getComputedStyle(button);
    return {says:getComputedStyle(button, '::after').content, name:button.querySelector('svg').getAttribute('aria-label'), own:button.hasAttribute('aria-label'),
      height:Math.round(box.height), colour:look.color, size:getComputedStyle(button, '::after').fontSize, whole:button.scrollWidth <= button.clientWidth + 1};
  }));
  assert.deepEqual(prints.map(({says, name, own}) => [says, name, own]), [['"Imprimir recetón" / ""', 'Imprimir recetón', false],
    ['"Imprimir indicaciones" / ""', 'Imprimir indicaciones', false]], 'Cada impresión dice qué imprime, y su nombre sigue siendo el de Eloísa: ' + JSON.stringify(prints));
  assert.equal(new Set(prints.map(({height, colour, size, whole}) => [height, colour, size, whole].join())).size, 1, 'y todas se leen igual: ' + JSON.stringify(prints));
  // «Filtrar» of Balance Hídrico is measured with its filter open.
  if (await page.getAttribute('[data-hhr-balance-filter]', 'aria-expanded') === 'false') await page.click('[data-hhr-balance-filter]');
  const buttons = await page.evaluate(() => [['Imprimir', '.frame > .daily form .MuiButton-root'], ['Validar tratamiento', '#medicationEntrySection .MuiCardHeader-action .MuiButton-root'],
    ['Filtrar', '#inputOutputHydricBalanceEntrySection .MuiButton-root'], ['Agregar', '#shiftChangeObservation [data-hhr-entry-open]'], ['Agregar alerta', '#alertEntrySection [data-hhr-entry-open]']].map(([name, selector]) => {
    const button = document.querySelector(selector), look = getComputedStyle(button), box = button.getBoundingClientRect();
    // A button whose words are shortened is read by the words it draws.
    const type = look.fontSize === '0px' ? getComputedStyle(button, '::after') : look;
    return [name, [look.backgroundColor, look.color, look.borderTopWidth + ' ' + look.borderTopColor, look.borderTopLeftRadius, type.fontSize + '/' + type.fontWeight, look.boxShadow, look.textTransform].join(' | '), Math.round(box.height), button.scrollWidth <= button.clientWidth + 1]; }));
  assert.deepEqual([...new Set(buttons.map(([, look]) => look))], ['rgba(0, 0, 0, 0) | rgb(40, 95, 89) | 1px rgb(196, 216, 209) | 6px | 12px/600 | none | none'],
    'Los botones del Resumen comparten un solo aspecto: ' + JSON.stringify(buttons));
  assert.ok(buttons.every(([name, , height, whole]) => whole && height === (name === 'Filtrar' ? 30 : 26)), 'y una altura, salvo «Filtrar», que mide lo que los campos de su fila: ' + JSON.stringify(buttons.map(([name, , height]) => [name, height])));
  // The filter of what is suspended answers a click and the keyboard, and reads pressed while it is on.
  const filter = page.locator('#medicationEntrySection .MuiCardHeader-action label[data-hhr-reading-toggle="suspended"]');
  const pressed = () => filter.evaluate(label => [label.querySelector('input').checked, getComputedStyle(label.querySelector('input')).backgroundColor]);
  const idle = await pressed();
  await filter.click();
  const on = await pressed();
  await filter.locator('input').press('Space');
  assert.ok(!idle[0] && on[0] && on[1] !== idle[1] && !(await pressed())[0], 'El icono de suspendidos se activa con un clic, se lee pulsado y se apaga con el teclado: ' + JSON.stringify([idle, on]));
  await page.close();
  // In a narrower window the row keeps the line of tabs and gives up the name of its field.
  page = await open();
  await page.setViewportSize({width:1150, height:800});
  await page.evaluate(() => { window.dispatchEvent(new Event('resize')); });
  await refresh(page);
  let {dock} = (await read(page)).look;
  assert.ok(dock.line === 'tabs' && dock.short && dock.onTabs && dock.afterTabs >= 12 && dock.beforeBar >= 8 && dock.reachable && dock.lead === '1',
    'A 1150 px la fila sigue en la línea de pestañas, sin el nombre de su campo: ' + JSON.stringify(dock));
  await page.close();
  // Should Eloísa paint its line of tabs over the content, the date would be under it: the row keeps its native place.
  page = await browser.newPage({viewport:{width:1440, height:900}, deviceScaleFactor:1, locale:'es-CL', timezoneId:'Pacific/Easter'});
  await page.setContent(summaryPage());
  await page.addStyleTag({content:'main > .MuiStack-root { position:relative; z-index:1; }'});
  await settle(page);
  await mountFicha(page, assets, {theme:'compact'});
  await refresh(page);
  ({dock} = (await read(page)).look);
  assert.ok(dock.line === null && dock.position !== 'fixed' && dock.reachable && dock.lead === '2' && !dock.links && dock.order[0] && dock.order[1] >= 4,
    'Bajo una línea de pestañas que la taparía, la fila conserva su lugar, a la vista: ' + JSON.stringify(dock));
  await page.close();
  // The ficha opened from Gestión de cuidados, as read on the page on 26-11-2026: the note card is titled «Valoración»,
  // a paragraph «Evolución:» names the note before it, it has one tool, and Dispositivos invasivos has its own table.
  // The owner asked for the same note card as the medical ficha, and for a clean, compact table of devices.
  const noteLook = () => page.evaluate(() => { const card = document.querySelector('#evolution'), box = el => el.getBoundingClientRect(), text = card.querySelector('[data-hhr-note-text]');
    return {toolbar:card.hasAttribute('data-hhr-evo-toolbar'), width:Math.round(box(card).width), height:Math.round(box(card).height), text:text && Math.round(box(text).height), lines:text && Math.round(box(text).height / parseFloat(getComputedStyle(text).lineHeight)),
      entry:Boolean(card.querySelector('.hhr-evo-entry')), captions:[...card.querySelectorAll('[data-hhr-evo-caption]')].map(tool => tool.getAttribute('data-hhr-evo-caption')),
      beside:[document.querySelector('#shiftChangeObservation'), document.querySelector('#alertEntries')].map(el => Math.round(box(el).left - box(card).right)), ends:Math.round(box(document.querySelector('#alertEntries')).bottom - box(card).bottom)}; });
  page = await open();
  const medicalNote = await noteLook();
  await page.close();
  page = await browser.newPage({viewport:{width:1440, height:900}, deviceScaleFactor:1, locale:'es-CL', timezoneId:'Pacific/Easter'});
  await page.setContent(summaryPage());
  await page.evaluate(() => {
    const card = document.querySelector('#evolution'), content = card.querySelector('.MuiCardContent-root');
    card.querySelector('.MuiCardHeader-title').textContent = 'Valoración';
    content.insertAdjacentHTML('afterbegin', '<p class="MuiTypography-root MuiTypography-body2">Evolución:</p>');
    content.querySelector('.MuiStack-root > .MuiStack-root + .MuiStack-root button').remove();
    // Dispositivos invasivos: the table Eloísa draws, with dates in columns as wide as a day.
    const item = document.querySelector('#procedureOrderEntrySection').closest('.MuiGrid-item').cloneNode(true);
    item.querySelector('section').id = 'invasiveDeviceEntrySection';
    item.querySelector('.MuiCard-root').id = 'invasiveDeviceEntry';
    item.querySelector('.MuiCardHeader-title').textContent = 'Dispositivos invasivos';
    const names = ['Dispositivo', 'Nº', 'Fecha instalación', 'Fecha de caducidad', 'Localización', 'Procedencia', 'Observación'];
    item.querySelectorAll('thead th').forEach((heading, at) => { heading.querySelector('p').textContent = names[at] || 'Acciones'; });
    item.querySelectorAll('tbody tr').forEach(row => { ['Vía venosa de prueba', '20', '12-04-2026 20:00', '16-04-2026', 'Sitio ficticio', 'Interna'].forEach((value, at) => {
      row.cells[at].innerHTML = '<span class="MuiTypography-root MuiTypography-caption">' + value + '</span>'; });
      for (const at of [2, 3]) { row.cells[at].style.width = '103px'; row.cells[at].style.maxWidth = '103px'; } });
    document.querySelector('#procedureOrderEntrySection').closest('.MuiGrid-item').after(item);
  });
  await settle(page);
  await mountFicha(page, assets, {theme:'compact'});
  await refresh(page);
  const careNote = await noteLook();
  assert.deepEqual({...careNote, captions:null}, {...medicalNote, captions:null}, 'La nota de la ficha de Gestión de cuidados mide y se ordena como la de la ficha médica: ' + JSON.stringify([careNote, medicalNote]));
  assert.ok(careNote.toolbar && careNote.lines === 14 && careNote.entry && careNote.captions.length === 1 && medicalNote.captions.length === 2, 'con sus catorce líneas, «Ver evoluciones» y la herramienta que Eloísa le da: ' + JSON.stringify(careNote));
  const naming = await page.evaluate(() => { const label = document.querySelector('#evolution .MuiCardContent-root > p'), box = label.getBoundingClientRect();
    return [Math.round(box.width), Math.round(box.height), label.textContent, document.querySelector('#evolution .MuiCardHeader-title').textContent]; });
  assert.deepEqual(naming, [1, 1, 'Evolución:', 'Valoración'], 'El párrafo que repite el nombre de la nota queda solo para el lector de pantalla y la tarjeta conserva su título');
  const devices = await page.evaluate(() => { const section = document.querySelector('#invasiveDeviceEntrySection'), box = el => el.getBoundingClientRect(), table = section.querySelector('table');
    const lines = el => { const range = new Range(); range.selectNodeContents(el); return new Set([...range.getClientRects()].map(r => Math.round(r.top))).size; };
    return {rows:[...section.querySelectorAll('tbody tr')].map(row => Math.round(box(row).height)), orders:Math.round(box(document.querySelector('#medicationEntrySection tbody tr')).height), head:Math.round(box(section.querySelector('thead tr')).height),
      headings:[...section.querySelectorAll('thead th p')].map(lines), date:lines(section.querySelector('tbody td:nth-child(3) span')), fits:table.scrollWidth <= section.querySelector('.MuiTableContainer-root').clientWidth + 1,
      size:[getComputedStyle(section.querySelector('thead th')).fontSize, getComputedStyle(section.querySelector('tbody td span')).fontSize === getComputedStyle(document.querySelector('#procedureOrderEntrySection tbody td span')).fontSize], edge:Math.round(box(section.querySelector('thead th p')).left - box(section.querySelector('.MuiCardHeader-title')).left)}; });
  assert.ok(devices.rows.every(height => height <= devices.orders + 2) && devices.head <= 24 && devices.headings.every(count => count === 1) && devices.date === 1 && devices.fits && devices.edge === 0,
    'Dispositivos invasivos se lee como Fármacos: una línea por fila y por encabezado, la fecha con su hora en una línea y la tabla dentro de su tarjeta: ' + JSON.stringify(devices));
  assert.deepEqual(devices.size, ['12px', true], 'con la letra de las demás tablas');
  await assertQuality(page, 'Resumen de la ficha de cuidados', assert);
  await assertPalette(page, 'Resumen de la ficha de cuidados', assert);
  await page.screenshot({path:path.join(directory, '1440-ficha-de-cuidados.png')});
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
      filasDeUnaLinea:measured.medication.rows.filter(row => row.height <= 32).length, finDeFarmacos:Math.round(measured.medication.card.bottom)}),
      'sin extensión', JSON.stringify({diagnostico:Math.round(native.diagnosis.card.top), farmacos:Math.round(native.medication.card.top)}));
    if (!sans) {
      await page.screenshot({path:path.join(directory, width + '-resumen.png')});
      await page.screenshot({path:path.join(directory, width + '-resumen-completo.png'), fullPage:true});
    }
    if (revision === 'WORKTREE') await verifySummary(page, width, native, off, sans);
    if (revision === 'WORKTREE' && !sans) { await assertQuality(page, `Resumen ${width}`, assert); await assertPalette(page, `Resumen ${width}`, assert); await assertFigures(page, `Resumen ${width}`, assert); }
    if (errors.length) throw Error(errors.join('\n'));
    await page.close();
  }
  if (revision === 'WORKTREE') await verifyShapes(browser, assets);
  // A narrow window, as a small notebook or a tablet at the bedside: the summary keeps Eloísa's order, with no
  // sideways scroll, and reads and is pressed as on the desk.
  if (revision === 'WORKTREE') {
    const page = await browser.newPage({viewport:{width:1024, height:768}, deviceScaleFactor:1, locale:'es-CL', timezoneId:'Pacific/Easter'});
    await page.setContent(summaryPage());
    await settle(page);
    await mountFicha(page, assets, {});
    await refresh(page);
    const narrow = await page.evaluate(() => ({page:document.documentElement.scrollWidth, window:innerWidth, top:Math.round(document.scrollingElement.scrollTop),
      cards:[...document.querySelectorAll('main .MuiCard-root')].filter(card => card.getClientRects().length).every(card => card.getBoundingClientRect().right <= innerWidth + 1),
      proxy:[...document.querySelectorAll('[data-hhr-round-proxy]')].filter(el => el.getClientRects().length).length}));
    assert.ok(narrow.page <= narrow.window + 1 && narrow.cards && narrow.proxy === 0, 'A 1024 px el resumen no se desborda a lo ancho: ' + JSON.stringify(narrow));
    assert.equal(narrow.top, 0, 'A 1024 px el resumen se abre arriba aunque Eloísa dé el foco al campo de alertas');
    // One column read in the order of the desk (asked 27-11-2026): each block takes the line.
    const column = await page.evaluate(() => {
      const frame = document.querySelector('[data-hhr-round="frame"]'), box = el => el.getBoundingClientRect();
      const of = role => frame.querySelector(':scope > [data-hhr-round="' + role + '"]');
      const order = ['diagnosis', 'note', 'handoff', 'alerts', 'vitals', 'care'].map(role => [role, of(role) && Math.round(box(of(role)).top)]);
      const width = Math.round(box(frame).width);
      return {order, full:['diagnosis', 'note', 'handoff', 'alerts', 'vitals', 'care'].every(role => of(role) && Math.abs(box(of(role)).width - width) <= 2),
        titles:[...new Set(['#diagnosisEntry', '#evolution', '#vitalSignsEntry', '#medicationEntry'].map(id => getComputedStyle(document.querySelector(id + ' .MuiCardHeader-title')).fontSize))]};
    });
    assert.ok(column.order.every(([, top], at) => top !== null && (!at || top > column.order[at - 1][1])) && column.full,
      'A 1024 px el resumen es una columna en el orden del escritorio: ' + JSON.stringify(column));
    assert.deepEqual(column.titles, ['15px'], 'y sus tarjetas se titulan como en el escritorio: ' + column.titles);
    await assertQuality(page, 'Resumen a 1024 px', assert);
    await page.screenshot({path:path.join(directory, '1024-resumen.png')});
    await page.close();
  }
} finally {
  await browser.close();
}
