// Render the fictional Plan de tratamiento with the presentation declared by a revision.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fichaAssets, mountFicha, settle, wideSans } from './ficha-capture-harness.mjs';
import { carePlanPage, planCards, planDays } from './care-plan-visual-fixture.mjs';

const hours = planDays.flatMap(([, list]) => list);
const refresh = async page => { await page.evaluate(() => document.dispatchEvent(new Event('fixture-refresh'))); await settle(page); };
const theme = async (page, view) => { await page.evaluate(view => document.dispatchEvent(new CustomEvent('fixture-theme', {detail:view})), view); await settle(page); };

// What the page looks like, read from the page itself.
const read = page => page.evaluate(() => {
  const box = el => { const {top, bottom, left, right, width, height} = el.getBoundingClientRect(); return {top, bottom, left, right, width, height}; };
  const middle = el => { const {left, width} = el.getBoundingClientRect(); return left + width / 2; };
  const cards = [...document.querySelectorAll('.plan > .MuiCard-root')].map(card => {
    const header = card.querySelector(':scope > .MuiCardHeader-root'), tools = card.children[1], table = card.querySelector('table');
    const captions = [...table.querySelectorAll('thead .hours span')];
    return {
      mark:card.getAttribute('data-hhr-plan'), tools:tools.getAttribute('data-hhr-plan'), empty:table.hasAttribute('data-hhr-plan-empty'),
      box:box(card), header:box(header), headerPadding:getComputedStyle(header).paddingTop, toolsBox:box(tools.querySelector('.tools')),
      filter:{height:Math.round(box(header.querySelector('.MuiSwitch-root')).height), size:getComputedStyle(header.querySelector('.MuiFormControlLabel-label')).fontSize},
      title:{text:header.querySelector('.MuiCardHeader-title').textContent, size:getComputedStyle(header.querySelector('.MuiCardHeader-title')).fontSize},
      buttons:[...tools.querySelectorAll('button')].map(button => ({
        name:button.querySelector('svg').getAttribute('aria-label'), label:button.getAttribute('aria-label'), title:button.getAttribute('title'),
        caption:getComputedStyle(button, '::after').content, box:box(button), icon:box(button.querySelector('svg')).width})),
      heading:{sticky:getComputedStyle(table.querySelector('th')).position, size:getComputedStyle(table.querySelector('th p')).fontSize,
        box:box(table.tHead), indication:box(table.tHead.rows[0].cells[0]).width, hours:captions.map(caption => caption.textContent), page:box(table.querySelector('th .MuiStack-root > p')).height, controls:[...table.querySelectorAll('th:first-child button')].map(button => box(button).height)},
      foot:getComputedStyle(table.tFoot).display,
      rows:[...table.tBodies[0].rows].map(row => {
        const texts = [...row.cells[0].querySelectorAll('p')];
        return {height:box(row).height, top:box(row).top, bottom:box(row).bottom, text:texts.map(p => p.textContent),
          block:box(row.cells[0].firstElementChild).height, lines:texts.map(p => parseFloat(getComputedStyle(p).lineHeight)),
          sizes:texts.map(p => getComputedStyle(p).fontSize), weights:texts.map(p => getComputedStyle(p).fontWeight),
          chips:[...row.querySelectorAll('.MuiChip-root')].map(chip => box(chip).height),
          marks:[...row.querySelectorAll('.slots > .MuiStack-root')].map((slot, index) => {
            const button = slot.querySelector('button');
            return button ? {icon:button.querySelector('svg').dataset.testid, size:box(button).height, colour:getComputedStyle(button).color,
              named:button.hasAttribute('aria-label') || button.hasAttribute('title'), offset:Math.abs(middle(button) - middle(captions[index]))} : null;
          })};
      }),
    };
  });
  const rows = cards.flatMap(card => card.rows);
  return {pageWidth:document.documentElement.scrollWidth, view:document.querySelector('.plan').getAttribute('data-hhr-plan'),
    filter:document.querySelector('.plan > .MuiBox-root').getAttribute('data-hhr-plan'), cards,
    summary:{cards:cards.length, rows:rows.length, visibleRows:rows.filter(row => row.bottom <= innerHeight).length,
      visibleCards:cards.filter(card => card.header.bottom <= innerHeight).length, end:Math.round(cards.at(-1).box.bottom)}};
});

// What the compact plan promises, checked on the page itself.
async function verifyPlan(page, width, native) {
  const shown = await read(page);
  assert.equal(shown.pageWidth, width, 'El plan cabe en la ventana');
  assert.deepEqual([shown.view, shown.filter], ['view', 'filter']);
  assert.deepEqual(shown.cards.map(card => [card.mark, card.tools, card.empty]), planCards.map(card => ['card', 'tools', !card.rows.length]), 'Las cuatro tarjetas se reconocen');
  assert.deepEqual(shown.cards.map(card => card.title.text), planCards.map(card => card.title));
  assert.ok(shown.summary.end < native.summary.end * .62, `El plan ocupa bastante menos alto: ${native.summary.end} → ${shown.summary.end}`);
  // One row under what this machine measures (6 and 9 or 10): a wider font of another platform wraps one name more.
  assert.ok(shown.summary.visibleRows >= (width < 1400 ? 5 : 8), 'La primera pantalla muestra la mayoría de las indicaciones: ' + shown.summary.visibleRows);

  shown.cards.forEach((card, index) => {
    const before = native.cards[index];
    // Title, switch and tools share the first line of the card.
    assert.ok(card.header.height <= 36, 'La cabecera es una línea: ' + card.header.height);
    assert.equal(card.title.size, '15px');
    assert.deepEqual([card.filter.height < before.filter.height, card.filter.size], [true, '12px'], 'El interruptor de la tarjeta se lee como una nota');
    assert.ok(card.toolsBox.top >= card.header.top - 1 && card.toolsBox.bottom <= card.header.bottom + 1 && card.toolsBox.left >= card.header.right - 1,
      'Las herramientas cierran la línea del título');
    assert.ok(card.buttons.every(button => button.box.height === 28 && button.icon === 18 && button.box.right <= card.box.right), 'Las herramientas miden lo que un control de la ficha');
    // Eloísa names the tools on their icons. The extension repeats that name, it does not invent one.
    assert.deepEqual(card.buttons.map(button => button.name), ['Planificación estandar', 'Planificación única', null], 'El nombre nativo sigue en el icono');
    assert.deepEqual(card.buttons.map(button => button.label), [null, null, null], 'El botón no recibe un nombre accesible que Eloísa no le dio');
    assert.deepEqual(card.buttons.map(button => button.title), ['Planificación estandar', 'Planificación única', 'Más opciones'], 'Cada herramienta dice su nombre al pasar el cursor');
    const captions = card.buttons.map(button => button.caption.split('"')[1] || '');
    assert.deepEqual(captions, card.box.width >= 992 ? ['Planificación estandar', 'Planificación única', ''] : ['', '', ''], 'Con sitio, la herramienta muestra su nombre');
    assert.ok(card.buttons.every((button, at) => !at || button.box.left >= card.buttons[at - 1].box.right), 'Las herramientas no se montan');

    // The table keeps its sticky heading, its hours and its page controls.
    assert.equal(card.heading.sticky, 'sticky');
    assert.deepEqual(card.heading.hours, hours);
    assert.equal(card.heading.size, '12px');
    assert.ok(card.heading.box.height <= 50 && card.heading.box.height < before.heading.box.height * .6, 'La cabecera de horas pierde alto: ' + card.heading.box.height);
    assert.ok(card.heading.controls.every(height => height >= 22), 'Los controles de página conservan un tamaño pulsable');
    assert.ok(card.heading.page <= 18, 'El número de página no se parte entre sus flechas: ' + card.heading.page);
    assert.equal(card.foot, 'none', 'El pie vacío no ocupa una fila');
    // The page controls no longer hold the first column open: the indication keeps its width in a narrow window.
    assert.ok(card.heading.indication >= 224, 'La indicación conserva su ancho: ' + card.heading.indication);
    card.rows.forEach((row, at) => {
      const earlier = before.rows[at];
      assert.deepEqual(row.text, earlier.text, 'El texto de la indicación no cambia');
      if (card.empty) {
        assert.ok(row.height <= 30, 'Una tarjeta sin plan lo dice en una línea: ' + row.height);
        return;
      }
      assert.deepEqual([row.sizes, row.weights], [['13px', '12px'], ['600', '400']], 'La indicación manda y la posología la explica');
      // A row is as tall as its text, in lines of the compact view. How many lines the text takes depends on
      // the font of each platform, so the row is not compared with a share of the native one.
      assert.ok(row.lines[0] <= 19 && row.lines[1] <= 17, 'Las líneas de una indicación son las de la vista compacta: ' + row.lines);
      assert.ok(row.height <= Math.max(row.block, 28) + 8 && row.height < earlier.height,
        `La fila ${at} mide lo que su texto: ${earlier.height} → ${row.height}, texto ${row.block}`);
      assert.ok(row.chips.every(height => height === 16), 'Las marcas SOS y Externo son etiquetas pequeñas');
      row.marks.forEach((mark, slot) => {
        const old = earlier.marks[slot];
        assert.equal(Boolean(mark), Boolean(old));
        if (!mark) return;
        // A status keeps its drawing, its colour and its hour. Its meaning is Eloísa's.
        assert.deepEqual([mark.icon, mark.colour, mark.named], [old.icon, old.colour, false], 'El estado conserva su icono y su color, sin un nombre inventado');
        assert.equal(mark.size, 28);
        assert.ok(mark.offset <= 1, `La marca queda bajo su hora: fila ${at}, hora ${slot}, ${mark.offset}`);
      });
    });
  });

  // Keyboard: the switch of the card, its tools and the page controls, in the order they are seen.
  await page.locator('.plan > .MuiCard-root').nth(2).locator('.MuiCardHeader-action input').focus();
  const order = [];
  for (let step = 0; step < 4; step++) {
    await page.keyboard.press('Tab');
    order.push(await page.evaluate(() => [document.activeElement.querySelector('svg')?.dataset.testid || document.activeElement.textContent.trim(),
      getComputedStyle(document.activeElement).outlineStyle + ' ' + getComputedStyle(document.activeElement).outlineWidth]));
  }
  assert.deepEqual(order.map(([name]) => name), ['AccessTimeRoundedIcon', 'TouchAppIcon', 'MoreVertIcon', 'Ir a Hoy']);
  assert.ok(order.every(([, outline]) => outline === 'solid 2px'), 'Cada control muestra dónde está el foco del teclado: ' + order.map(([, outline]) => outline));
  await page.evaluate(() => document.activeElement.blur());

  // A foot that says something keeps its row.
  await page.evaluate(() => { document.querySelector('.plan table tfoot td').textContent = 'Total de prueba'; });
  assert.notEqual(await page.locator('.plan table tfoot').first().evaluate(foot => getComputedStyle(foot).display), 'none');
  await page.evaluate(() => { document.querySelector('.plan table tfoot td').textContent = ''; });

  // A card with another shape keeps the look Eloísa gives it.
  const first = page.locator('.plan > .MuiCard-root').first();
  await first.locator('th p').first().evaluate(heading => { heading.textContent = 'Prestación'; });
  await refresh(page);
  const unknown = (await read(page)).cards[0];
  assert.deepEqual([unknown.mark, unknown.tools, unknown.headerPadding, unknown.title.size, unknown.filter, unknown.buttons.map(button => button.title)],
    [null, null, native.cards[0].headerPadding, native.cards[0].title.size, native.cards[0].filter, [null, null, null]], 'Una tabla que no es de programación no se toca');
  await first.locator('th p').first().evaluate(heading => { heading.textContent = 'Indicación'; });
  // A tool with a tooltip of its own keeps it.
  await first.locator('.tools button').first().evaluate(button => { button.title = 'Ayuda nativa'; });
  await refresh(page);
  assert.deepEqual((await read(page)).cards[0].buttons.map(button => button.title), ['Ayuda nativa', 'Planificación única', 'Más opciones']);
  await first.locator('.tools button').first().evaluate(button => button.removeAttribute('title'));
  await refresh(page);

  // Tools with something that is not an icon button keep the row Eloísa gives them, under the title.
  await first.locator('.tools').evaluate(tools => { tools.insertAdjacentHTML('beforeend', '<input type="text" aria-label="Buscar" data-fixture-extra>'); });
  await refresh(page);
  const mixed = (await read(page)).cards[0];
  assert.deepEqual([mixed.mark, mixed.tools], ['card', null]);
  assert.ok(mixed.toolsBox.top >= mixed.header.bottom - 1 && mixed.toolsBox.height === native.cards[0].toolsBox.height,
    `Las herramientas que no se reconocen conservan su fila: ${mixed.header.bottom} → ${mixed.toolsBox.top}`);
  await page.evaluate(() => document.querySelector('[data-fixture-extra]').remove());
  await refresh(page);

  // With anything else among the cards, the stack keeps its spacing and that block keeps its look.
  await page.evaluate(() => {
    const block = document.createElement('div');
    block.className = 'MuiBox-root'; block.dataset.fixtureExtra = '';
    block.innerHTML = document.querySelector('.plan > .MuiBox-root').innerHTML + document.querySelector('.plan > .MuiCard-root').outerHTML;
    // The copy is a block Eloísa would draw: without the marks the reader put on the original.
    for (const element of block.querySelectorAll('*')) {
      for (const {name} of [...element.attributes]) if (name.startsWith('data-hhr-') || name === 'title') element.removeAttribute(name);
    }
    block.querySelector('th p').textContent = 'Prestación';
    document.querySelector('.plan').append(block);
  });
  await refresh(page);
  const foreign = await page.evaluate(() => {
    const block = document.querySelector('.plan > [data-fixture-extra]'), known = document.querySelector('.plan > .MuiCard-root + .MuiCard-root');
    return {view:document.querySelector('.plan').getAttribute('data-hhr-plan'), filter:document.querySelector('.plan > .MuiBox-root').getAttribute('data-hhr-plan'),
      marks:block.querySelectorAll('[data-hhr-plan],[data-hhr-plan-caption],[title]').length, gap:getComputedStyle(known).marginTop, blockGap:getComputedStyle(block).marginTop,
      switches:[...block.querySelectorAll('.MuiSwitch-root')].map(element => Math.round(element.getBoundingClientRect().height)),
      labels:[...block.querySelectorAll('.MuiFormControlLabel-label')].map(element => getComputedStyle(element).fontSize)};
  });
  assert.deepEqual(foreign, {view:null, filter:null, marks:0, gap:'16px', blockGap:'16px', switches:[38, 38], labels:['16px', '16px']},
    'Un bloque que no se reconoce conserva su aspecto y la pila su separación');
  assert.equal((await read(page)).cards[1].mark, 'card', 'Las tarjetas reconocidas siguen compactas');
  await page.evaluate(() => document.querySelector('.plan > [data-fixture-extra]').remove());
  await refresh(page);
  assert.equal((await read(page)).view, 'view');

  // Without the compact view the page is the one Eloísa drew.
  await theme(page, 'off');
  const restored = await read(page);
  assert.deepEqual([restored.view ?? restored.filter, restored.cards.map(card => [card.mark, card.tools, card.empty, card.buttons.map(button => button.title)])],
    [null, planCards.map(() => [null, null, false, [null, null, null]])], 'Al apagar la vista no queda ninguna marca');
  assert.deepEqual(restored.summary, native.summary, 'Al apagar la vista el plan mide lo mismo que sin la extensión');
  await theme(page, 'compact');
  assert.deepEqual((await read(page)).summary, shown.summary, 'Al volver a la vista compacta el plan queda igual');
}

const [revision, directory] = process.argv.slice(2);
if (!revision || !directory) throw Error('Uso: node scripts/capture-care-plan.mjs <ref|WORKTREE> <directorio>');
const assets = await fichaAssets(revision);
await mkdir(directory, {recursive:true});
const browser = await chromium.launch();
try {
  // 1000 px is narrower than the hours of a card: the table scrolls inside it and the tools lose their captions.
  // Each width is checked twice: with the text of this machine and with a wider family, as on another platform.
  for (const [width, height] of [[1000,800],[1280,800],[1440,900],[1920,1080]]) for (const sans of ['', wideSans]) {
    const page = await browser.newPage({viewport:{width,height}, deviceScaleFactor:1, locale:'es-CL', timezoneId:'Pacific/Easter'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent(carePlanPage());
    await settle(page);
    const native = await read(page);
    await mountFicha(page, assets, {sans});
    await settle(page);
    const measured = await read(page);
    console.info('Plan de tratamiento sintético', assets.version, width, sans ? 'con letra ancha' : '', JSON.stringify(measured.summary), 'sin extensión', JSON.stringify(native.summary));
    if (!sans) await page.screenshot({path:path.join(directory, width + '-plan.png')});
    if (revision === 'WORKTREE') await verifyPlan(page, width, native);
    if (errors.length) throw Error(errors.join('\n'));
    await page.close();
  }
} finally {
  await browser.close();
}
