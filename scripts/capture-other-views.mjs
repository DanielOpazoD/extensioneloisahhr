// Render the fictional Alta and Ejecución de cuidados with the presentation declared by a revision.
// With WORKTREE it also checks that both read in the language of the summary (docs/estilo-ficha.md).
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fichaAssets, mountFicha, settle } from './ficha-capture-harness.mjs';
import { otherViewPage } from './other-views-visual-fixture.mjs';
import { assertPalette, assertQuality } from './visual-quality.mjs';

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
  await assertPalette(page, name, assert);
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
  // Eloísa's confirmations, with the structure read in its code (27-11-2026): one MUI dialog with a title, a
  // sentence and its actions, the action contained and «SALIR» in words. A dialog with a field is a form.
  if (revision === 'WORKTREE') {
    const page = await browser.newPage({viewport:{width:1440, height:900}, deviceScaleFactor:1, locale:'es-CL', timezoneId:'Pacific/Easter'});
    await page.setContent(otherViewPage('discharge'));
    await settle(page);
    await mountFicha(page, assets, {});
    await page.evaluate(() => {
      const dialog = (id, body, actions) => `<div class="MuiDialog-root MuiModal-root" role="presentation" id="${id}"><div class="MuiBackdrop-root" style="position:fixed;inset:0;background:rgba(0,0,0,.5)"></div>
        <div class="MuiDialog-container" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center"><div class="MuiPaper-root MuiDialog-paper" role="dialog" aria-labelledby="${id}-title"
          style="max-width:600px;margin:32px;border-radius:16px;background:#fff;box-shadow:0 11px 15px rgba(0,0,0,.2)">
          <h2 class="MuiTypography-root MuiDialogTitle-root" id="${id}-title" style="margin:0;padding:16px 24px;font:500 20px/1.6 Arial"><p class="MuiTypography-root" style="margin:0">Validar tratamiento</p></h2>
          <div class="MuiDialogContent-root" style="padding:20px 24px">${body}</div>
          <div class="MuiDialogActions-root" style="display:flex;justify-content:flex-end;padding:8px">${actions}</div></div></div></div>`;
      const button = (text, kind) => `<button type="${kind === 'contained' ? 'submit' : 'button'}" class="MuiButtonBase-root MuiButton-root MuiButton-${kind}" style="padding:6px 16px;border:0;border-radius:6px;font:500 14px Arial;${kind === 'contained' ? 'background:#3f9184;color:#fff' : 'background:none;color:#3f9184'}">${text}</button>`;
      document.body.insertAdjacentHTML('beforeend', dialog('confirm', '<p class="MuiTypography-root MuiDialogContentText-root" style="margin:0;font:16px/1.5 Arial;color:rgba(0,0,0,.6)">Declaro haber revisado el tratamiento de prueba.</p>',
        button('CONTINUAR', 'contained') + button('SALIR', 'text')) + dialog('form', '<label>Motivo <input type="text"></label>', button('GUARDAR', 'contained') + button('CANCELAR', 'text')));
    });
    await settle(page);
    const look = await page.evaluate(() => [...document.querySelectorAll('.MuiDialog-paper')].map(paper => {
      const style = el => getComputedStyle(el), title = paper.querySelector('.MuiDialogTitle-root'), text = paper.querySelector('.MuiDialogContentText-root,label');
      return {corner:style(paper).borderTopLeftRadius, width:Math.round(paper.getBoundingClientRect().width), title:style(title).fontSize + '/' + style(title).fontWeight, text:style(text).fontSize,
        buttons:[...paper.querySelectorAll('.MuiButton-root')].map(button => [style(button).textTransform, style(button).backgroundColor, style(button).borderTopColor, style(button).color].join(' | '))};
    }));
    const [confirm, form] = look;
    assert.deepEqual([confirm.corner, confirm.title, confirm.text], ['8px', '15px/600', '13px'], 'Una confirmación de Eloísa se lee como el Resumen: ' + JSON.stringify(confirm));
    assert.ok(confirm.width <= 480, 'y no ocupa más que su pregunta: ' + confirm.width);
    assert.deepEqual(confirm.buttons, ['lowercase | rgba(0, 0, 0, 0) | rgb(196, 216, 209) | rgb(40, 95, 89)', 'lowercase | rgba(0, 0, 0, 0) | rgba(0, 0, 0, 0) | rgb(74, 74, 74)'],
      'Lo que pide lleva una línea; volver, solo sus palabras; ninguna en mayúsculas: ' + JSON.stringify(confirm.buttons));
    assert.deepEqual([form.corner, form.title], ['16px', '20px/500'], 'Un diálogo con un campo es un formulario y conserva su aspecto: ' + JSON.stringify(form));
    await assertQuality(page, 'Confirmación de Eloísa', assert, '#confirm .MuiDialog-paper');
    await page.evaluate(() => document.getElementById('form').remove());
    await page.screenshot({path:path.join(directory, '1440-confirmacion.png')});
    await page.close();
  }
} finally {
  await browser.close();
}
