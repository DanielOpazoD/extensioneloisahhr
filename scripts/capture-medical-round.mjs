// Render the same synthetic medical round with the content scripts declared by each revision.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { medicalHistory, medicalRound, medicalRoundWithControls } from './medical-round-visual-fixture.mjs';
import { captureDesktopRound } from './capture-desktop-round.mjs';

const [revision, directory, comparison] = process.argv.slice(2);
if (!revision || !directory || (comparison && !['antes','despues','escritorio'].includes(comparison))) {
  throw Error('Uso: node scripts/capture-medical-round.mjs <ref|WORKTREE> <directorio> [antes|despues|escritorio]');
}
const source = filename => revision === 'WORKTREE' ? readFile('extension/' + filename, 'utf8') :
  execFileSync('git', ['show', revision + ':extension/' + filename], {encoding:'utf8'});
const manifest = JSON.parse(await source('manifest.json'));
const entry = manifest.content_scripts.find(group => group.js?.includes('hhr-native-ficha-presentation.js'));
const styles = entry.css.filter(name => name.startsWith('hhr-ficha-'));
const scripts = entry.js.filter(name => /^(hhr-ficha-|hhr-(history-date-navigation|native-ficha-presentation)\.js$)/.test(name));
await mkdir(directory, {recursive:true});
const browser = await chromium.launch();
try {
  const desktop = comparison === 'escritorio';
  for (const [width, height] of desktop ? [[1280,800],[1440,900]] : [[1366,850],[390,844]]) {
    const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1,locale:'es-CL'});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setContent(comparison ? medicalRoundWithControls : medicalRound);
    for (const name of styles) await page.addStyleTag({content:await source(name)});
    for (const name of scripts) await page.addScriptTag({content:await source(name)});
    await page.evaluate(historyMarkup => {
      const summary = window.HhrNativeFichaPresentation.create();
      const dates = window.HhrHistoryDateNavigation.create();
      const authors = window.HhrFichaEvolutionAuthors?.create();
      const refresh = () => {
        summary.refresh('1', 'compact');
        dates.refresh('1');
        authors?.refresh('1');
      };
      document.getElementById('encounter-event-tab-history').addEventListener('click', event => {
        document.querySelector('[aria-selected="true"]').setAttribute('aria-selected','false');
        event.currentTarget.setAttribute('aria-selected','true');
        document.querySelector('main').innerHTML = historyMarkup;
        refresh();
      });
      // Simulate the content-script refresh following the host's React update.
      document.getElementById('evolution').addEventListener('click', () => queueMicrotask(refresh));
      refresh();
    },medicalHistory);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    });
    if (desktop) {
      await captureDesktopRound(page, directory, width, revision === 'WORKTREE');
      assert.deepEqual(errors, []);
      await page.close();
      continue;
    }
    const metrics = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector).getBoundingClientRect();
      return {
        evolutionWidth:Math.round(rect('#evolution').width),
        handoffHeight:Math.round(rect('#shiftChangeObservation').height),
        vitalsStart:Math.round(rect('section#vitalSignsEntry').top),
        vitalsRows:new Set([...document.querySelectorAll('.tile')].map(tile => Math.round(tile.getBoundingClientRect().top))).size,
        vitalsGridHeight:Math.round(rect('.vitals-grid').height),
        medicationsStart:Math.round(rect('#medication').top),
        pageWidth:document.documentElement.scrollWidth,
      };
    });
    console.log(manifest.version, width, metrics);
    assert.equal(metrics.pageWidth, width, 'El resumen debe caber en la ventana');
    if (comparison === 'antes') {
      assert.equal(await page.locator('.vitals-grid [data-hhr-reading="vital-value"]').count(),0,
        'La referencia debe reproducir las etiquetas que no reconocía la versión 0.48.181');
      if (width === 1366) assert.equal(metrics.vitalsRows,2);
      assert.equal(await page.locator('.vitals-grid [data-hhr-vital-elapsed]').count(),0);
    }
    if (scripts.includes('hhr-ficha-round-layout.js') && (!comparison || comparison === 'despues')) {
      const vitals = await page.evaluate(() => {
        const grid = document.querySelector('.vitals-grid');
        const elapsed = grid.querySelector('[data-hhr-vital-elapsed]');
        return {
          count:grid.querySelectorAll('[data-hhr-reading="vital-value"]').length,
          flagged:getComputedStyle(grid.querySelector('[style*="color"]')).color,
          label:elapsed ? getComputedStyle(elapsed,'::after').content : '',
        };
      });
      assert.equal(vitals.count, 9, 'Deben estar las nueve lecturas nativas');
      assert.equal(vitals.flagged, 'rgb(204, 36, 36)', 'Se debe conservar el color de la temperatura');
      assert.match(vitals.label, /"2h"/, 'La antigüedad debe abreviarse sin perderse');
      assert.equal(metrics.vitalsRows, width === 1366 ? 1 : 3);
    }
    await page.screenshot({path:path.join(directory,width + '.png')});
    if (width === 1366) {
      await page.locator('section#vitalSignsEntry').screenshot({path:path.join(directory,'signos.png')});
    }
    if (comparison) {
      const card = page.locator('#alertEntrySection');
      await card.screenshot({path:path.join(directory,'alertas-' + width + '.png')});
      const vitals = page.locator('section#vitalSignsEntry');
      const historyButton = vitals.getByRole('button',{name:/historial/i});
      const buttons = card.getByRole('checkbox');
      const suspended = page.getByRole('checkbox',{name:/mostrar suspendidos/i});
      const handoff = page.locator('#shiftChangeObservation');
      const note = await page.locator('#evolution').boundingBox();
      const hand = await handoff.boundingBox();
      const controls = await buttons.evaluateAll(nodes => nodes.map(n => {
        const rect = n.closest('label').getBoundingClientRect();
        return {top:rect.top, bottom:rect.bottom, left:rect.left};
      }));
      const controlMetrics = {
        dischargesVisible:await page.locator('#estimatedDischargeSection:visible').count(),
        handoffWidth:Math.round(hand.width),
        vitalsHeight:Math.round((await vitals.boundingBox()).height),
        historyButtonWidth:Math.round((await historyButton.boundingBox()).width),
        alertsHeight:Math.round((await card.boundingBox()).height),
        filterFont:await suspended.evaluate(n => getComputedStyle(n.closest('label').querySelector('.MuiFormControlLabel-label')).fontSize),
      };
      console.log('Controles',width,controlMetrics);
      assert.equal(await card.getByRole('button',{name:'Archivar alerta'}).count(),2);
      assert.ok(await card.getByText('Pauta de seguimiento pendiente para el próximo turno.').isVisible());
      assert.ok(await card.getByText('Se acordó una visita con la familia.').isVisible());
      assert.equal(controls.length,2);
      assert.equal(await suspended.isChecked(),false);
      assert.equal(await buttons.nth(0).isChecked(),false);
      assert.equal(await buttons.nth(1).isChecked(),true);
      if (comparison === 'despues') {
        assert.equal(controlMetrics.dischargesVisible,0);
        if (width > 1000) {
          assert.ok(note.width >= 2 * hand.width && hand.x >= note.x + note.width - 1);
          assert.ok(Math.abs(note.y - hand.y) < 3);
          assert.ok(controls[1].top < controls[0].bottom && controls[1].left > controls[0].left);
        } else assert.ok(hand.y >= note.y + note.height - 1);
        assert.ok(controlMetrics.historyButtonWidth >= 24 && controlMetrics.historyButtonWidth <= 40);
        assert.ok(parseFloat(controlMetrics.filterFont) < 16);
      }
      await handoff.getByRole('textbox').fill('Texto simulado de entrega');
      await buttons.nth(0).focus();
      await page.keyboard.press('Space');
      assert.ok(await buttons.nth(0).isChecked());
      assert.ok(await buttons.nth(1).isChecked());
      await historyButton.focus();
      await page.keyboard.press('Enter');
      await page.getByRole('dialog',{name:'Historial de signos'}).waitFor();
      await page.keyboard.press('Escape');
      assert.equal(await handoff.getByRole('textbox').inputValue(),'Texto simulado de entrega');
    }
    const entryButton = page.getByRole('button',{name:'Ver evoluciones',exact:true});
    if (!comparison && await entryButton.count() && width === 1366) {
      await entryButton.click();
      const group = page.getByRole('group',{name:'Evoluciones por profesional'});
      await group.getByRole('button',{name:'Todos',exact:true}).waitFor();
      const visible = page.locator('[data-hhr-history-timeline] article:visible');
      if (await visible.count() !== 2) throw Error('La vista de evoluciones debe mostrar dos notas.');
      const region = page.locator('main');
      await region.screenshot({path:path.join(directory,'evoluciones.png')});
      await group.getByRole('button',{name:'Elena Ejemplo'}).click();
      if (await visible.count() !== 1 || !(await visible.textContent()).includes('Elena Ejemplo')) {
        throw Error('La selección de profesional debe mostrar solo sus evoluciones.');
      }
    }
    if (errors.length) throw Error(errors.join('\n'));
    await page.close();
  }
} finally {
  await browser.close();
}
