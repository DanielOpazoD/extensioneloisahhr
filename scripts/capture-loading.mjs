// Render the fictional Resumen while it loads, as Eloísa draws it, with the presentation of a revision.
// Eloísa opens a ficha with one placeholder card per section and replaces each as its data arrives
// (read on the page on 26-11-2026). The owner saw the page pass from Eloísa's form to this view: the
// checks below hold what makes it arrive in this view from its first card.
// node scripts/capture-loading.mjs <ref|WORKTREE> <directory>
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fichaAssets, mountFicha, settle } from './ficha-capture-harness.mjs';
import { summaryPage } from './summary-visual-fixture.mjs';

const [revision, directory] = process.argv.slice(2);
if (!revision || !directory) throw Error('Uso: node scripts/capture-loading.mjs <ref|WORKTREE> <directorio>');
const assets = await fichaAssets(revision);

// The placeholder Eloísa draws for a section: its title, a bar for its byline and two for its content, 176 px.
const skeleton = `<style>.MuiSkeleton-root{display:block;height:24px;background:rgba(0,0,0,.11);border-radius:4px/6.7px;transform:scale(1,.6);transform-origin:0 55%}
  .fixture-placeholder{height:auto}.fixture-placeholder>.MuiCardHeader-root{padding:16px}.fixture-placeholder>.MuiCardContent-root{padding:16px 16px 24px}</style>`;
// Puts the summary back in its loading state, keeping every section to give it back later.
function hold() {
  const bar = '<span class="MuiSkeleton-root MuiSkeleton-text MuiSkeleton-pulse"></span>';
  const held = window.fixtureHeld = [];
  const swap = (element, html) => {
    const template = document.createElement('template');
    template.innerHTML = html;
    const stand = template.content.firstElementChild;
    element.replaceWith(stand);
    held.push([stand, element]);
  };
  for (const card of document.querySelectorAll('.frame section.MuiBox-root, .frame .MuiGrid-item > .MuiCard-root')) {
    swap(card, `<div class="MuiPaper-root MuiCard-root fixture-placeholder"><div class="MuiCardHeader-root"><div class="MuiCardHeader-content">
      <span class="MuiTypography-root MuiTypography-h6 MuiCardHeader-title">${card.querySelector('.MuiCardHeader-title').textContent}</span>
      <span class="MuiTypography-root MuiTypography-body1 MuiCardHeader-subheader">${bar}</span></div></div><div class="MuiCardContent-root">${bar}${bar}</div></div>`);
  }
  swap(document.querySelector('.frame > .daily > p'), bar.replace('">', '" style="width:300px;height:14px">'));
  // The fictional page had scrolled to the field it focuses when it opens; a ficha that loads is at its top.
  scrollTo(0, 0);
}
// Gives back the sections whose placeholder matches, as Eloísa does when their data arrives, and
// presents the page once, in the same task: what is read next is what the following paint shows.
function arrive(ids) {
  window.fixtureHeld = window.fixtureHeld.filter(([stand, element]) => {
    if (ids && !ids.some(id => id === 'byline' ? element.matches('p') : element.matches('#' + id) || element.querySelector('#' + id))) return true;
    stand.replaceWith(element);
    return false;
  });
  window.fichaFixture?.refresh();
}
const read = page => page.evaluate(() => {
  const box = el => { const {top, left, width, height} = el.getBoundingClientRect(); return [left, top + scrollY, width, height].map(Math.round); };
  const stands = [...document.querySelectorAll('.fixture-placeholder')], row = document.querySelector('.frame > .daily'), frame = document.querySelector('.frame');
  const title = stands[0]?.querySelector('.MuiCardHeader-title'), shown = el => Boolean(el.getClientRects().length);
  return {
    stands:stands.length, heights:[...new Set(stands.map(card => Math.round(card.getBoundingClientRect().height)))],
    bars:[...new Set(stands.map(card => [...card.querySelectorAll('.MuiSkeleton-root')].filter(shown).length))],
    title:title && [getComputedStyle(title).fontSize, getComputedStyle(title).fontWeight].join('/'),
    page:document.documentElement.scrollHeight, overflow:document.documentElement.scrollWidth > innerWidth,
    row:shown(row), waiting:getComputedStyle(row).animationName, docked:row.hasAttribute('data-hhr-ficha-dock'), rowBox:box(row),
    rail:shown(document.querySelector('.rail')), margin:Math.round(document.querySelector('.fixture-placeholder, #evolution').getBoundingClientRect().left),
    frame:frame.getAttribute('data-hhr-round'), columns:frame.hasAttribute('data-hhr-round-columns'),
    note:(card => card && box(card))(document.querySelector('#evolution')), signs:(card => card && box(card))(document.querySelector('section#vitalSignsEntry')),
  };
});

await mkdir(directory, {recursive:true});
const browser = await chromium.launch();
try {
  for (const [width, height] of [[1280, 800], [1440, 900]]) {
    const page = await browser.newPage({viewport:{width, height}, deviceScaleFactor:1, locale:'es-CL', timezoneId:'Pacific/Easter'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent(summaryPage({}) + skeleton);
    await page.evaluate(hold);
    // What Eloísa draws by itself: the measure the view is compared with.
    const native = await read(page);
    // The saved view is named on the page before Eloísa draws, and the styles are there from the start:
    // the first cards are read with no script of the view at work.
    for (const name of assets.styles) await page.addStyleTag({content:await assets.source(name)});
    await page.evaluate(() => document.documentElement.setAttribute('data-hhr-ficha-theme', 'compact'));
    await settle(page);
    const first = await read(page);
    await page.screenshot({path:path.join(directory, width + '-cargando.png')});
    // The wait of the daily row ends by itself, with nothing of the view running.
    await page.evaluate(() => document.getAnimations().forEach(animation => animation.finish()));
    const patient = await read(page);

    await mountFicha(page, assets, {theme:'compact'});
    const mounted = await read(page);
    // The byline of the day, the note, the handoff, the signs and the alerts arrive first; the rest, later.
    await page.evaluate(arrive, ['byline', 'observationEntrySection', 'estimatedDischargeSection', 'shiftChangeEntrySection', 'vitalSignsEntry', 'alertEntrySection']);
    const partial = await read(page);
    await settle(page);
    const partialSettled = await read(page);
    await page.screenshot({path:path.join(directory, width + '-cargando-parcial.png')});
    await page.evaluate(arrive, null);
    const whole = await read(page);
    await settle(page);
    const wholeSettled = await read(page);
    console.info('Carga sintética', revision, width, JSON.stringify({nativa:native.page, primera:first.page, parcial:partial.page, final:wholeSettled.page, marcador:first.heights}));

    if (revision === 'WORKTREE') {
      assert.ok(native.stands >= 20 && native.heights[0] === 176 && native.page > 3000, 'La página ficticia carga como Eloísa: un marcador de 176 px por apartado: ' + JSON.stringify(native));
      assert.ok(first.stands === native.stands && first.heights.every(size => size <= 56) && first.bars.join() === '1' && first.title === '15px/600',
        'Cada marcador de carga ocupa una línea, con su título escrito como en la vista y una sola barra: ' + JSON.stringify(first));
      assert.ok(first.page < native.page * .5, `La página en carga mide menos de la mitad de la de Eloísa: ${first.page} de ${native.page}`);
      assert.ok(!first.row && !first.rail && first.waiting !== 'none', 'Ni la fila del resumen diario ni la línea de enlaces se dibujan donde Eloísa las pone mientras la ronda no se reconoce: ' + JSON.stringify([first.row, first.rail, first.waiting]));
      assert.ok(patient.row && patient.rail, 'Si la ronda no llega a formarse, la fila del resumen diario y la línea de enlaces aparecen por sí solas');
      assert.equal(first.margin, wholeSettled.margin, 'Los marcadores de carga empiezan en el margen de la vista, antes de que Eloísa dibuje las pestañas');
      assert.ok(mounted.frame === null && mounted.stands === native.stands, 'Con todo en carga la vista no reconoce una ronda ni toca los marcadores: ' + JSON.stringify(mounted));
      // One pass, in the task that drew the cards: the frame that paints them already shows the round.
      assert.ok(partial.frame === 'frame' && partial.columns && partial.waiting === 'none' && partial.row && !partial.rail && !partial.overflow,
        'Al llegar la nota y la entrega, la ronda queda armada en el mismo pase y la fila deja de esperar: ' + JSON.stringify(partial));
      assert.deepEqual([partial.docked, partial.rowBox, partial.note, partial.signs], [partialSettled.docked, partialSettled.rowBox, partialSettled.note, partialSettled.signs],
        'Nada cambia de lugar un cuadro después: la fecha, la nota y los signos quedan puestos en el pase que los dibuja');
      assert.ok(partial.stands > 0 && partial.heights.every(size => size <= 56), 'Lo que aún carga sigue en una línea dentro de la ronda: ' + JSON.stringify(partial.heights));
      assert.ok(whole.stands === 0 && whole.frame === 'frame' && !whole.overflow, 'Al llegar el resto no queda ningún marcador');
      assert.deepEqual([whole.docked, whole.rowBox, whole.note, whole.signs], [wholeSettled.docked, wholeSettled.rowBox, wholeSettled.note, wholeSettled.signs],
        'La página completa tampoco se mueve un cuadro después de dibujarse');
      // The page never grows past what Eloísa would draw, and it ends close to where it started.
      assert.ok(Math.max(first.page, partialSettled.page, wholeSettled.page) < native.page * .62, 'La página no pasa por la altura de Eloísa en ningún momento de la carga: ' +
        JSON.stringify([first.page, partialSettled.page, wholeSettled.page, native.page]));
    }
    if (errors.length) throw Error(errors.join('\n'));
    await page.close();
  }
} finally {
  await browser.close();
}
