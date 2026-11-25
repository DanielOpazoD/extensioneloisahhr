// Render the fictional Historial with the presentation declared by a revision.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fichaAssets, mountFicha, settle } from './ficha-capture-harness.mjs';
import { historyDays, historyPage } from './history-visual-fixture.mjs';

// What the compact timeline promises, checked on the page itself.
async function verifyTimeline(page, directory, width, measured) {
  assert.equal(measured.pageWidth, width, 'El historial cabe en la ventana');
  assert.ok(measured.visible >= 7, 'La primera pantalla muestra al menos siete eventos completos: ' + measured.visible);
  const days = await page.locator('.timeline > .MuiBox-root').evaluateAll(groups => groups.map(group => {
    const label = group.querySelector(':scope > :first-child .MuiChip-label');
    const band = group.firstElementChild.getBoundingClientRect(), box = group.getBoundingClientRect();
    return {native:label.textContent, shown:getComputedStyle(label, '::after').content.split('"')[1] || label.textContent,
      spans:Math.abs(band.left - box.left) < 1 && Math.abs(band.right - box.right) < 1 && Math.abs(band.top - box.top) < 1};
  }));
  assert.deepEqual(days.map(day => day.native), historyDays.map(([label]) => label), 'El texto nativo de cada día sigue en la página');
  assert.deepEqual(days.map(day => day.shown), ['Hoy · 15-04-2026', 'Ayer · 14-04-2026', '13-04-2026'], '«Hoy» y «Ayer» muestran su fecha');
  assert.ok(days.every(day => day.spans), 'Cada día encabeza su propia superficie');

  const events = await page.locator('.timeline .MuiCard-root').evaluateAll(cards => cards.map(card => {
    const box = el => el.getBoundingClientRect();
    const time = card.querySelector('.MuiCardHeader-action'), category = card.querySelector('.MuiCardContent-root > p');
    const name = card.querySelector('.MuiCardHeader-title'), role = card.querySelector('.MuiCardHeader-subheader');
    const body = card.querySelector('.MuiCardContent-root > .MuiStack-root p'), badge = card.querySelector('[data-hhr-history-new]');
    const line = el => Math.round(box(el).top + box(el).height / 2);
    return {
      kind:card.getAttribute('data-hhr-history-kind'), category:category.textContent, timeLeft:Math.round(box(time).left - box(card).left),
      inMargin:box(time).right <= box(category).left - 4, bodyLeft:Math.round(box(body).left - box(category).left),
      oneLine:Math.abs(line(time) - line(category)) <= 3 && Math.abs(line(name) - line(category)) <= 3 && Math.abs(line(role) - line(category)) <= 3,
      order:box(category).right <= box(name).left && box(name).right <= box(role).left,
      avatar:box(card.querySelector('.MuiCardHeader-avatar')).width, rule:getComputedStyle(card).boxShadow,
      badge:badge && {firstLine:Math.abs(line(badge) - line(category)) <= 6, clear:box(badge).left >= box(role).right + 6, inside:box(badge).right <= box(card).right},
      bodySize:getComputedStyle(body).fontSize, native:[time.textContent, name.textContent, role.textContent],
    };
  }));
  const expected = historyDays.flatMap(([, list]) => list);
  assert.deepEqual(events.map(event => event.native), expected.map(event => [event.time, event.name, event.role]), 'Hora, profesional y cargo conservan su texto');
  assert.equal(new Set(events.map(event => event.timeLeft)).size, 1, 'Las horas forman una sola columna en el margen');
  assert.ok(events.every(event => event.inMargin && event.oneLine && event.order && event.bodyLeft === 0),
    'Cada evento se lee como hora, categoría, profesional y cargo, con el texto alineado bajo la categoría');
  assert.ok(events.every(event => event.avatar === 0 && event.bodySize === '13px'), 'Las iniciales no repiten el nombre y el texto usa el tamaño de lectura');
  assert.deepEqual(events.map(event => event.kind === 'note'), expected.map(event => /^Evolución/.test(event.category)), 'Solo las evoluciones son notas');
  assert.ok(events.every(event => (event.kind === 'note') === /inset/.test(event.rule)), 'Solo las notas llevan el filete lateral');
  const badges = events.filter(event => event.badge);
  assert.equal(badges.length, 1);
  assert.ok(badges[0].badge.firstLine && badges[0].badge.clear && badges[0].badge.inside, '«Nuevo» cierra la primera línea de su evento');

  // A picture or an icon in the avatar is not a repetition: it stays, at text size.
  await page.evaluate(() => {
    document.querySelector('.timeline .MuiAvatar-root').innerHTML = '<svg viewBox="0 0 24 24" width="40" height="40"><circle cx="12" cy="12" r="10"/></svg>';
    window.fichaFixture.refresh();
  });
  await settle(page);
  const picture = await page.locator('.timeline .MuiCardHeader-avatar').first().boundingBox();
  assert.ok(picture.width >= 16 && picture.width <= 20 && picture.height <= 20, 'Un avatar con imagen se conserva al tamaño del texto');
  await page.evaluate(() => { document.querySelector('.timeline .MuiAvatar-root').textContent = 'EE'; window.fichaFixture.refresh(); });
  await settle(page);

  // The day stays in view under the tabs while its events scroll.
  await page.evaluate(() => { document.body.style.paddingBlockEnd = '900px'; window.scrollTo(0,260); });
  await settle(page);
  const sticky = await page.evaluate(() => {
    const bar = document.querySelector('.MuiAppBar-root').getBoundingClientRect();
    const band = document.querySelector('.timeline > .MuiBox-root > :first-child').getBoundingClientRect();
    const second = document.querySelectorAll('.timeline .MuiCard-root')[2].getBoundingClientRect();
    return {gap:Math.round(band.top - bar.bottom), covered:second.top < band.bottom};
  });
  assert.ok(sticky.gap >= 0 && sticky.gap <= 2 && sticky.covered, 'El día sigue a la vista bajo las pestañas: ' + JSON.stringify(sticky));
  await page.evaluate(() => { document.body.style.removeProperty('padding-block-end'); window.scrollTo(0,0); });
  await settle(page);

  // Notes by professional, with the keyboard.
  const entry = page.getByRole('button', {name:'Ver evoluciones', exact:true});
  await entry.focus();
  await page.keyboard.press('Enter');
  const authors = page.getByRole('group', {name:'Evoluciones por profesional'});
  await authors.getByRole('button', {name:'Todos', exact:true}).waitFor();
  const shown = page.locator('.timeline .MuiCard-root:visible');
  assert.equal(await shown.count(), expected.filter(event => /^Evolución/.test(event.category)).length, 'La vista de evoluciones reúne las notas médicas y de enfermería');
  await page.screenshot({path:path.join(directory, width + '-evoluciones.png')});
  await authors.getByRole('button', {name:'Elena Ejemplo', exact:true}).press('Enter');
  assert.deepEqual(await shown.locator('.MuiCardHeader-title').allTextContents(), ['Elena Ejemplo']);
  await page.getByRole('button', {name:'Historial completo', exact:true}).press('Enter');
  assert.equal(await shown.count(), expected.length, '«Historial completo» devuelve todos los eventos');

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
