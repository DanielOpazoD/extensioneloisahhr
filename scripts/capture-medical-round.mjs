// Render the same synthetic medical round with the content scripts declared by each revision.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { medicalHistory, medicalRound } from './medical-round-visual-fixture.mjs';

const [revision, directory] = process.argv.slice(2);
if (!revision || !directory) throw Error('Uso: node scripts/capture-medical-round.mjs <ref|WORKTREE> <directorio>');
const source = filename => revision === 'WORKTREE' ? readFile('extension/' + filename, 'utf8') :
  execFileSync('git', ['show', revision + ':extension/' + filename], {encoding:'utf8'});
const manifest = JSON.parse(await source('manifest.json'));
const entry = manifest.content_scripts.find(group => group.js?.includes('hhr-native-ficha-presentation.js'));
const styles = entry.css.filter(name => name.startsWith('hhr-ficha-'));
const scripts = entry.js.filter(name => /^(hhr-ficha-|hhr-(history-date-navigation|native-ficha-presentation)\.js$)/.test(name));
await mkdir(directory, {recursive:true});
const browser = await chromium.launch();
try {
  for (const [width, height] of [[1366,850],[390,844]]) {
    const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1,locale:'es-CL'});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setContent(medicalRound);
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
      refresh();
    },medicalHistory);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    });
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
    if (scripts.includes('hhr-ficha-round-layout.js')) {
      const vitals = await page.evaluate(() => {
        const grid = document.querySelector('.vitals-grid');
        const elapsed = grid.querySelector('[data-hhr-vital-elapsed]');
        return {
          count:grid.querySelectorAll('[data-hhr-reading="vital-value"]').length,
          flagged:getComputedStyle(grid.querySelector('[style*="color"]')).color,
          label:getComputedStyle(elapsed,'::after').content,
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
    const entryButton = page.getByRole('button',{name:'Ver evoluciones',exact:true});
    if (await entryButton.count() && width === 1366) {
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
