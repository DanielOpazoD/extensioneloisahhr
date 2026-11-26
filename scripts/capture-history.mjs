// Render the fictional Historial with the presentation declared by a revision.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fichaAssets, mountFicha, settle } from './ficha-capture-harness.mjs';
import { historyDays, historyPage } from './history-visual-fixture.mjs';

// What the compact timeline promises, checked on the page itself.
async function verifyTimeline(page, directory, width, measured) {
  const expected = historyDays.flatMap(([, list]) => list);
  assert.equal(measured.pageWidth, width, 'El historial cabe en la ventana');
  assert.equal(measured.events, expected.length);
  assert.ok(measured.visible >= 6, 'La primera pantalla muestra al menos seis eventos completos: ' + measured.visible);

  // A day is a run of boxes: it opens with its date, its boxes touch, and the next day starts apart.
  const boxes = await page.locator('.timeline > .MuiBox-root').evaluateAll(list => list.map(box => {
    const label = box.querySelector(':scope > .MuiStack-root .MuiChip-label');
    const {top, bottom} = box.getBoundingClientRect();
    const style = getComputedStyle(box);
    return {top, bottom, edge:box.getAttribute('data-hhr-history-edge') || '', cards:box.querySelectorAll(':scope > .MuiCard-root').length,
      native:label?.textContent ?? null, shown:label ? getComputedStyle(label, '::after').content.split('"')[1] || label.textContent : null,
      band:label ? getComputedStyle(box.firstElementChild).position : null, rounded:[style.borderStartStartRadius, style.borderEndEndRadius]};
  }));
  assert.deepEqual(boxes.filter(box => box.native !== null).map(box => box.native), historyDays.map(([label]) => label), 'El texto nativo de cada día sigue en la página');
  assert.deepEqual(boxes.filter(box => box.shown !== null).map(box => box.shown), ['Hoy · 15-04-2026', 'Ayer · 14-04-2026', '13-04-2026'], '«Hoy» y «Ayer» muestran su fecha');
  assert.deepEqual(boxes.map(box => box.cards), [1,1,1,2,1,1,1,1,1,1], 'La ficha de prueba reparte los eventos en cajas como Eloísa');
  assert.deepEqual(boxes.map(box => box.edge), ['start','','','','end','start','','end','start','end'], 'Cada día va de su caja con fecha a la anterior a la siguiente fecha');
  boxes.forEach((box, index) => {
    if (!index) return;
    const gap = Math.round(box.top - boxes[index - 1].bottom);
    assert.equal(gap, box.edge.includes('start') ? 8 : 0, 'Las cajas de un día se tocan y los días se separan: caja ' + index);
  });
  assert.ok(boxes.every(box => (box.rounded[0] !== '0px') === box.edge.includes('start') && (box.rounded[1] !== '0px') === box.edge.includes('end')),
    'Solo el inicio y el final de cada día redondean sus esquinas');
  assert.ok(boxes.every(box => box.band === null || box.band === 'sticky'), 'La fecha del día sigue fija bajo las pestañas mientras pasa su caja, como en las demás vistas');

  const events = await page.locator('.timeline .MuiCard-root').evaluateAll(cards => cards.map(card => {
    const box = el => el.getBoundingClientRect();
    const time = card.querySelector('.MuiCardHeader-action'), category = card.querySelector('.MuiCardContent-root p');
    const title = card.querySelector('.MuiCardHeader-title'), sub = card.querySelector('.MuiCardHeader-subheader');
    const body = card.querySelector('.MuiCardContent-root .MuiStack-root .MuiStack-root p, .MuiCardContent-root .MuiStack-root > p + .MuiStack-root p') ||
      [...card.querySelectorAll('.MuiCardContent-root p')][1];
    const badge = card.querySelector('[data-hhr-history-new]');
    const line = el => Math.round(box(el).top + box(el).height / 2);
    return {
      inline:card.hasAttribute('data-hhr-history-inline'), kind:card.getAttribute('data-hhr-history-kind'), category:category.textContent,
      timeLeft:Math.round(box(time).left - box(card).left), inMargin:box(time).right <= box(category).left - 4, timeLines:Math.round(box(time).height),
      bodyLeft:Math.round(box(body).left - box(category).left),
      oneLine:Math.abs(line(time) - line(category)) <= 3 && Math.abs(line(title) - line(category)) <= 3 && Math.abs(line(sub) - line(category)) <= 3,
      order:box(category).right <= box(title).left && box(title).right <= box(sub).left,
      avatar:box(card.querySelector('.MuiCardHeader-avatar')).width, rule:getComputedStyle(card).boxShadow,
      badge:badge && {firstLine:Math.abs(line(badge) - line(category)) <= 6, clear:box(badge).left >= box(sub).right + 6, inside:box(badge).right <= box(card).right},
      chips:[...card.querySelectorAll('.MuiChip-root:not([data-hhr-history-new])')].map(chip => Math.round(box(chip).height)),
      bodySize:getComputedStyle(body).fontSize, native:[time.textContent.trim(), title.textContent, sub.textContent],
    };
  }));
  assert.deepEqual(events.map(event => event.native), expected.map(event => [event.time + ' hrs', ...(event.nameFirst ? [event.name, event.role] : [event.role, event.name])]),
    'Hora, cargo y profesional conservan su texto y su orden');
  assert.ok(events.every(event => event.inline), 'Todos los eventos se reconocen, estén o no en la caja que abre el día');
  assert.equal(new Set(events.map(event => event.timeLeft)).size, 1, 'Las horas forman una sola columna en el margen');
  assert.ok(events.every(event => event.inMargin && event.timeLines <= 20), 'La hora con «hrs» cabe en una línea del margen, sin pisar la categoría');
  assert.ok(events.every(event => event.oneLine && event.order && event.bodyLeft === 0),
    'Cada evento se lee como hora, categoría, cargo y profesional, con el texto alineado bajo la categoría');
  assert.ok(events.every(event => event.avatar === 0 && event.bodySize === '13px'), 'La letra del avatar no repite el cargo y el texto usa el tamaño de lectura');
  assert.deepEqual(events.map(event => event.kind === 'note'), expected.map(event => event.category === 'Evolución'), 'Solo las evoluciones son notas');
  assert.ok(events.every(event => (event.kind === 'note') === /inset/.test(event.rule)), 'Solo las notas llevan el filete lateral');
  const badges = events.filter(event => event.badge);
  assert.equal(badges.length, expected.filter(event => event.isNew).length);
  assert.ok(badges.every(event => event.badge.firstLine && event.badge.clear && event.badge.inside), '«Nuevo» cierra la primera línea de su evento');
  assert.ok(events.flatMap(event => event.chips).every(height => height <= 18), 'Las demás etiquetas de un evento tienen altura de texto');

  // The labelled details of an administration flow on one line. A label without a value is not shown.
  const details = await page.locator('.timeline .MuiCard-root').nth(1).evaluate(card => {
    const pairs = [...card.querySelectorAll('.MuiCardContent-root span.MuiTypography-root')].filter(el => el.children.length === 2);
    const shown = pairs.filter(el => el.getClientRects().length);
    return {all:pairs.map(el => el.firstElementChild.textContent), shown:shown.map(el => el.firstElementChild.textContent),
      lines:new Set(shown.slice(0, 3).map(el => Math.round(el.getBoundingClientRect().top))).size};
  });
  assert.equal(details.all.length, 8, 'El texto nativo de cada detalle sigue en la página');
  assert.deepEqual(details.shown.filter(label => /^Comentario/.test(label)).length, 1, 'Un comentario vacío no ocupa lugar y uno escrito se lee');
  assert.equal(details.lines, 1, 'Los detalles de una administración comparten línea');

  // A picture or an icon in the avatar is not a repetition: it stays, at text size.
  await page.evaluate(() => {
    document.querySelector('.timeline .MuiAvatar-root').innerHTML = '<svg viewBox="0 0 24 24" width="40" height="40"><circle cx="12" cy="12" r="10"/></svg>';
    window.fichaFixture.refresh();
  });
  await settle(page);
  const picture = await page.locator('.timeline .MuiCardHeader-avatar').first().boundingBox();
  assert.ok(picture.width >= 16 && picture.width <= 20 && picture.height <= 20, 'Un avatar con imagen se conserva al tamaño del texto');
  await page.evaluate(() => { document.querySelector('.timeline .MuiAvatar-root').textContent = 'E'; window.fichaFixture.refresh(); });
  await settle(page);

  // Notes by professional, with the keyboard. A day keeps its date while any of its notes is shown.
  const entry = page.getByRole('button', {name:'Ver evoluciones', exact:true});
  await entry.focus();
  await page.keyboard.press('Enter');
  const authors = page.getByRole('group', {name:'Evoluciones por profesional'});
  await authors.getByRole('button', {name:'Todos', exact:true}).waitFor();
  const shown = page.locator('.timeline .MuiCard-root:visible');
  const dates = page.locator('.timeline > .MuiBox-root > .MuiStack-root:visible');
  assert.equal(await shown.count(), expected.filter(event => event.category === 'Evolución').length, 'La vista de evoluciones reúne las notas médicas y de enfermería');
  assert.equal(await dates.count(), 3, 'Los tres días conservan su fecha: todos tienen alguna evolución');
  await page.screenshot({path:path.join(directory, width + '-evoluciones.png')});
  await authors.getByRole('button', {name:'Marta Ejemplo', exact:true}).press('Enter');
  // The header of each event says a first name and a first surname. Eloísa's own text, with the whole name and its
  // spaces, stays in the page; the separator before the name keeps its size.
  const signed = await shown.locator('.MuiCardHeader-subheader').evaluateAll(list => list.map(line => [line.textContent, line.getAttribute('data-hhr-author'),
    getComputedStyle(line, '::after').content, getComputedStyle(line).fontSize, getComputedStyle(line, '::before').fontSize, getComputedStyle(line, '::after').fontSize]));
  assert.deepEqual(signed, [['Marta  Ejemplo Prueba', 'Marta Ejemplo', '"Marta Ejemplo" / ""', '0px', '12px', '12px']], 'Quien firma un evento del Historial se lee con un nombre y un apellido');
  assert.equal(await dates.count(), 1, 'Solo queda la fecha del día que tiene una nota de esa profesional');
  // Eloísa gives each event a box: with hundreds of them, a line or a gap per filtered box would add up.
  const leftovers = await page.locator('.timeline > .MuiBox-root').evaluateAll(list => {
    const seen = element => getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden';
    const empty = list.filter(box => ![...box.children].some(seen));
    const kept = list.filter(box => [...box.children].some(seen));
    return {empty:empty.length, height:empty.reduce((sum, box) => sum + box.getBoundingClientRect().height, 0),
      above:Math.round(kept[0].getBoundingClientRect().top - document.querySelector('[role="group"][aria-label="Evoluciones por profesional"]').getBoundingClientRect().bottom),
      first:kept[0].getBoundingClientRect().top, last:kept.at(-1).getBoundingClientRect().bottom,
      content:kept.reduce((sum, box) => sum + box.getBoundingClientRect().height, 0)};
  });
  assert.ok(leftovers.empty >= 8 && leftovers.height === 0, 'Una caja sin eventos a la vista no deja filete: ' + JSON.stringify(leftovers));
  assert.ok(leftovers.last - leftovers.first - leftovers.content <= 1 && leftovers.above <= 20, 'Ni deja más hueco que el de un día sobre las cajas que quedan, ni entre ellas: ' + JSON.stringify(leftovers));
  await authors.getByRole('button', {name:'Tomás Ejemplo', exact:true}).press('Enter');
  assert.equal(await shown.count(), 3);
  assert.equal(await dates.count(), 2, 'Un día conserva su fecha aunque su primer evento no sea una nota de ese profesional');
  await page.getByRole('button', {name:'Historial completo', exact:true}).press('Enter');
  assert.equal(await shown.count(), expected.length, '«Historial completo» devuelve todos los eventos');

  // The native filters give the timeline most of the line.
  const columns = await page.evaluate(() => [document.querySelector('.filters'), document.querySelector('.timeline').parentElement].map(el => Math.round(el.getBoundingClientRect().width)));
  assert.ok(columns[0] >= 260 && columns[0] <= 280 && columns[1] > columns[0] * 3, 'Los filtros ceden ancho a la línea de tiempo: ' + columns);
  assert.ok(await page.getByRole('button', {name:'Filtrar', exact:true}).isVisible());

  // Outside the compact view the timeline is Eloísa's again.
  await page.evaluate(() => { document.dispatchEvent(new CustomEvent('fixture-theme', {detail:'off'})); });
  await settle(page);
  const native = await page.locator('.timeline .MuiCard-root').first().evaluate(card => ({
    avatar:card.querySelector('.MuiCardHeader-avatar').getBoundingClientRect().width, rule:getComputedStyle(card).boxShadow,
    position:getComputedStyle(card.querySelector('.MuiCardHeader-action')).position,
  }));
  assert.ok(native.avatar >= 40 && !/inset/.test(native.rule) && native.position === 'static', 'Al desactivar la vista, el historial recupera su aspecto nativo');
}

const [revision, directory] = process.argv.slice(2);
if (!revision || !directory) throw Error('Uso: node scripts/capture-history.mjs <ref|WORKTREE> <directorio>');
const assets = await fichaAssets(revision);
await mkdir(directory, {recursive:true});
const browser = await chromium.launch();
try {
  for (const [width, height] of [[1280,800],[1440,900]]) {
    const page = await browser.newPage({viewport:{width,height}, deviceScaleFactor:1, locale:'es-CL', timezoneId:'Pacific/Easter'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // «Hoy» and «Ayer» take their dates from the clock of the hospital.
    await page.clock.install({time:new Date('2026-04-15T14:00:00-06:00')});
    await page.setContent(historyPage());
    await mountFicha(page, assets);
    await settle(page);
    const measured = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.timeline .MuiCard-root')];
      const box = el => { const {top,bottom,left,right} = el.getBoundingClientRect(); return {top:Math.round(top),bottom:Math.round(bottom),left:Math.round(left),right:Math.round(right)}; };
      return {pageWidth:document.documentElement.scrollWidth, events:cards.length, first:box(cards[0]), last:box(cards.at(-1)),
        visible:cards.filter(card => card.getBoundingClientRect().bottom <= innerHeight).length};
    });
    console.info('Historial sintético', assets.version, width, JSON.stringify(measured));
    await page.screenshot({path:path.join(directory, width + '-historial.png')});
    if (revision === 'WORKTREE') await verifyTimeline(page, directory, width, measured);
    if (errors.length) throw Error(errors.join('\n'));
    await page.close();
  }
} finally {
  await browser.close();
}
