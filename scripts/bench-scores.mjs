import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { fichaAssets, mountFicha } from './ficha-capture-harness.mjs';
import { summaryPage } from './summary-visual-fixture.mjs';
import '../extension/clinico/clinical-assessment-clock.js';
import '../extension/clinico/clinical-checklist-braden-templates.js';
import '../extension/clinico/clinical-checklist-braden.js';
import '../extension/clinico/clinical-checklist-falls.js';

const [revision, output] = process.argv.slice(2);
if (!revision || !output) throw new Error('Uso: node scripts/bench-scores.mjs <ref|WORKTREE> <informe.json>');

const volumes = [20, 200, 1000];
const warmups = 3;
const repetitions = 30;
const viewport = { width: 1440, height: 900 };
const timezoneId = 'Pacific/Easter';
const narrative = 'Paciente ficticio estable. Control, marcha asistida y observación del turno de prueba. ';
const adultBraden = globalThis.HhrBradenTemplates[0];
const adultFalls = globalThis.HhrChecklistFalls.templates[0];
const bradenChoices = Object.fromEntries(adultBraden.fields.filter(field => field.type === 'choice')
  .map(field => [field.id, field.options[0].label]));

// Every fourth note is a valid assessment. The same recent records are present at all three volumes.
function history(volume) {
  return Array.from({ length: volume }, (_, index) => {
    const instant = new Date(Date.UTC(2026, 10, 28, 16) - index * 20 * 60_000);
    const { date: fecha, time: hora } = globalThis.HhrClinicalAssessmentClock.hospitalDateTimeNow(instant);
    let text = narrative.repeat(3);
    if (index % 8 === 0) {
      text = globalThis.HhrChecklistBraden.buildDraftEvolutionText(adultBraden, { ...bradenChoices, fecha, hora });
    } else if (index % 8 === 4) {
      text = globalThis.HhrChecklistFalls.buildEvolutionText(adultFalls, {
        fecha, hora, edad: 'mayor-75', factores: ['caidas-previas'], farmacos: ['ninguno'],
      });
    }
    return { evolutionResume: [{
      id: index + 1, OBE_NOTES: text, OBE_PUBLISH_DATETIME: instant.toISOString(),
      HCPR_NAME: index % 2 ? 'Médico' : 'Enfermera(o)', HCP_FGN: 'Persona', HCP_FFN: 'Ejemplo',
    }] };
  });
}

// Read the browser clock at the trusted click and after the new rows have layout.
async function measureClick(page, button, target) {
  await button.evaluate((control, selector) => {
    window.scoresBenchElapsed = null;
    control.addEventListener('click', () => {
      const start = performance.now();
      const observer = new MutationObserver(() => {
        const row = document.querySelector(selector);
        if (!row || !row.getBoundingClientRect().height) return;
        window.scoresBenchElapsed = performance.now() - start;
        observer.disconnect();
      });
      observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
    }, { capture: true, once: true });
  }, target);
  await button.click();
  const elapsed = await page.waitForFunction(() => Number.isFinite(window.scoresBenchElapsed));
  await elapsed.dispose();
  return page.evaluate(() => window.scoresBenchElapsed);
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = (sorted.length - 1) / 2;
  const median = (sorted[Math.floor(middle)] + sorted[Math.ceil(middle)]) / 2;
  return { p50Ms: Number(median.toFixed(2)), p95Ms: Number(sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(2)) };
}

async function measureVolume(browser, assets, volume) {
  const page = await browser.newPage({ viewport, locale: 'es-CL', timezoneId });
  const scoresCount = volume / 4;
  const samples = [];
  try {
    await page.setContent(summaryPage());
    await page.addScriptTag({ content: await assets.source('ficha/ficha-evolution-notes.js') });
    await mountFicha(page, assets, { notes: { 14: [] } });
    await page.evaluate(raw => { window.scoresBenchHistory = raw; }, history(volume));
    const open = page.locator('#evolution').getByRole('button', { name: 'Ver evoluciones', exact: true });
    const evolutions = page.getByRole('dialog', { name: 'Evoluciones del episodio' });
    const scores = page.getByRole('dialog', { name: 'Scores del episodio' });
    const rows = scores.locator('tbody tr:not(.hhr-score-detail)');

    for (let trial = 0; trial < warmups + repetitions; trial++) {
      const projectMs = await page.evaluate(() => {
        const start = performance.now();
        const notes = window.HhrFichaEvolutionNotes.project(window.scoresBenchHistory);
        const elapsed = performance.now() - start;
        window.fichaNotes = { 14: notes };
        window.fichaNoteRequests = [];
        window.fichaNoteResponses = [];
        return elapsed;
      });
      const evolutionsMs = await measureClick(page, open, '.hhr-evo-reader-feed:not([hidden]) .hhr-evo-reader-note');
      assert.equal(await evolutions.locator('.hhr-evo-reader-note').count(), volume - scoresCount);
      const scoresMs = await measureClick(page, evolutions.getByRole('button', { name: 'Scores', exact: true }),
        '.hhr-evo-reader-scores:not([hidden]) tbody tr:not(.hhr-score-detail)');
      assert.equal(await rows.count(), scoresCount);
      assert.deepEqual(await page.evaluate(() => window.fichaNoteRequests), [['1', 14]]);
      if (trial >= warmups) samples.push({ projectMs, evolutionsMs, scoresMs });
      await scores.getByRole('button', { name: 'Cerrar', exact: true }).click();
      await page.locator('dialog.hhr-evo-reader').waitFor({ state: 'detached' });
    }
  } finally {
    await page.close();
  }
  return {
    notes: volume, scores: scoresCount, readsPerTrial: 1,
    projection: summarize(samples.map(sample => sample.projectMs)),
    openEvolutions: summarize(samples.map(sample => sample.evolutionsMs)),
    openScores: summarize(samples.map(sample => sample.scoresMs)),
    samples,
  };
}

const assets = await fichaAssets(revision);
const browser = await chromium.launch();
try {
  const results = [];
  for (const volume of volumes) {
    const entry = await measureVolume(browser, assets, volume);
    results.push(entry);
    console.info(`${entry.notes} notas · ${entry.scores} scores · clic en Scores ${entry.openScores.p50Ms} ms p50 / ${entry.openScores.p95Ms} ms p95`);
  }
  const testedCommit = execFileSync('git', ['rev-parse', revision === 'WORKTREE' ? 'HEAD' : revision], { encoding: 'utf8' }).trim();
  const report = {
    version: assets.version, revision, testedCommit, browser: browser.version(),
    platform: process.platform, architecture: process.arch, viewport, timezoneId, warmups, repetitions,
    method: 'Historial ficticio en memoria. Se mide su proyección por separado y los clics hasta que las filas tienen geometría.',
    results,
  };
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.info('Resultados en', output);
} finally {
  await browser.close();
}
