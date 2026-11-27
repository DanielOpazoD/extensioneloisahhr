// Render the fictional Alta and Ejecución de cuidados with the presentation declared by a revision.
// With WORKTREE it also checks that both read in the language of the summary (docs/estilo-ficha.md).
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fichaAssets, mountFicha, settle } from './ficha-capture-harness.mjs';
import { otherViewPage } from './other-views-visual-fixture.mjs';
import { assertQuality } from './visual-quality.mjs';

// What makes a view read like the summary, measured as it is painted.
const read = page => page.evaluate(() => {
  const main = document.querySelector('main'), look = el => getComputedStyle(el), box = el => el.getBoundingClientRect();
  const shown = el => el.getClientRects().length && look(el).visibility !== 'hidden';
  const cards = [...main.querySelectorAll('.MuiPaper-root')].filter(el => shown(el) && box(el).width > 200 && !el.parentElement.closest('.MuiPaper-root'));
  const buttons = [...main.querySelectorAll('.MuiButton-contained,.MuiButton-outlined')].filter(shown).map(button => {
    const style = look(button);
    return [button.textContent.trim(), [style.backgroundColor, style.borderTopWidth, style.borderTopLeftRadius, Math.round(box(button).height), style.fontSize, style.textTransform].join(' | ')];
  });
  return {view:main.getAttribute('data-hhr-ficha-view'), title:(title => title && look(title).fontSize + '/' + look(title).fontWeight)(main.querySelector('h6')),
    corners:[...new Set(cards.map(card => look(card).borderTopLeftRadius))], shadows:cards.filter(card => look(card).boxShadow !== 'none').length,
    buttons, switches:[...main.querySelectorAll('.MuiSwitch-root')].filter(shown).map(el => Math.round(box(el).height)),
    fields:[...main.querySelectorAll('.MuiOutlinedInput-root')].filter(shown).map(el => Math.round(box(el).height)),
    cells:[...new Set([...main.querySelectorAll('td')].filter(shown).map(cell => look(cell).fontSize))],
    upper:[...main.querySelectorAll('*')].filter(el => shown(el) && look(el).textTransform === 'uppercase').length,
    labels:[...main.querySelectorAll('.MuiInputLabel-root')].filter(shown).map(label => {
      const field = label.parentElement.querySelector('.MuiOutlinedInput-root'); const a = box(label), b = box(field);
      return a.top >= b.top - 10 && a.bottom <= b.bottom + 2 && a.left >= b.left;
    })};
});

async function verify(page, view) {
  const shown = await read(page);
  const name = view === 'discharge' ? 'Alta' : 'Ejecución de cuidados';
  assert.equal(shown.view, view === 'discharge' ? 'discharge' : 'care-execution', `${name}: la presentación nombra la vista`);
  assert.equal(shown.title, '15px/600', `${name}: su título mide como los del Resumen`);
  assert.deepEqual([shown.corners, shown.shadows], [['8px'], 0], `${name}: sus tarjetas tienen la esquina de la vista y no flotan: ` + JSON.stringify(shown.corners));
  assert.deepEqual([...new Set(shown.buttons.map(([, look]) => look))], ['rgba(0, 0, 0, 0) | 1px | 6px | 26 | 12px | none'], `${name}: un solo botón: ` + JSON.stringify(shown.buttons));
  assert.equal(shown.upper, 0, `${name}: nada en mayúsculas`);
  assert.ok(shown.switches.every(height => height <= 29), `${name}: los interruptores miden como los del Resumen: ` + shown.switches);
  assert.ok(shown.fields.every(height => height <= 34), `${name}: los campos tienen la altura de una línea: ` + shown.fields);
  assert.ok(shown.labels.every(Boolean), `${name}: el nombre de cada campo queda sobre su campo: ` + JSON.stringify(shown.labels));
  if (view === 'care-plan-execute') assert.deepEqual(shown.cells, ['13px'], 'Ejecución de cuidados: las celdas a la letra del Resumen: ' + shown.cells);
  await assertQuality(page, name, assert);
  // Outside the compact view, Eloísa's look comes back.
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('fixture-theme', {detail:'off'})));
  await settle(page);
  const native = await read(page);
  assert.ok(native.view === null && native.corners.includes('12px'), `${name}: al desactivar la vista vuelve el aspecto de Eloísa`);
}

const [revision, directory] = process.argv.slice(2);
if (!revision || !directory) throw Error('Uso: node scripts/capture-other-views.mjs <ref|WORKTREE> <directorio>');
const assets = await fichaAssets(revision);
await mkdir(directory, {recursive:true});
const browser = await chromium.launch();
try {
  for (const view of ['discharge', 'care-plan-execute']) {
    const page = await browser.newPage({viewport:{width:1440, height:900}, deviceScaleFactor:1, locale:'es-CL', timezoneId:'Pacific/Easter'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent(otherViewPage(view));
    await settle(page);
    await mountFicha(page, assets, {});
    await settle(page);
    await page.screenshot({path:path.join(directory, '1440-' + (view === 'discharge' ? 'alta' : 'ejecucion') + '.png')});
    if (revision === 'WORKTREE') await verify(page, view);
    if (errors.length) throw Error(errors.join('\n'));
    await page.close();
  }
} finally {
  await browser.close();
}
