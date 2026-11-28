import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { summaryPage } from './summary-visual-fixture.mjs';

const chartOrigin = 'https://fichamedico.rayensalud.cl';
const savePath = '/__fixture/evoluciones';
const narrative = 'Seguimiento narrativo de la ficha ficticia.';
const entry = (id, OBE_NOTES) => ({
  id, OBE_NOTES, OBE_PUBLISH_DATETIME: '2026-11-28T02:00:00',
  HCPR_NAME: 'Enfermera(o)', HCP_FGN: 'Elena', HCP_FFN: 'Ejemplo',
});

export async function mockSavedChecklistScores(page, worker) {
  const history = {};
  await page.route(chartOrigin + savePath, async route => {
    const request = route.request();
    assert.equal(request.method(), 'POST');
    const { episode, note } = request.postDataJSON();
    assert.match(episode, /^\d+$/);
    assert.match(note, /^#Escala(?:Braden|Caidas)\n/);
    const notes = history[episode] ??= [entry(1, narrative)];
    notes.push(entry(notes.length + 1, note));
    await route.fulfill({ status: 201, json: { saved: true } });
  });

  async function save(dialog) {
    await dialog.evaluate((native, url) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Guardar evolución de prueba';
      button.addEventListener('click', () => fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode: location.pathname.split('/').at(-1), note: native.querySelector('textarea').value }),
      }));
      native.append(button);
    }, savePath);
    const button = dialog.getByRole('button', { name: 'Guardar evolución de prueba', exact: true });
    const [response] = await Promise.all([page.waitForResponse(chartOrigin + savePath), button.click()]);
    assert.equal(response.status(), 201);
    await button.evaluate(el => el.remove());
  }

  async function verify(episode, expected, screenshotName) {
    assert.equal(history[episode]?.length, expected.length + 1);
    await worker.evaluate(history => { globalThis.__checklistHistory = history; }, history);
    const chart = chartOrigin + '/dashboard/encounter-list-nurse/' + episode;
    await page.route(chart, route => route.fulfill({ contentType: 'text/html', body: summaryPage() }));
    await page.goto(chart);
    await page.reload();
    await page.locator('#evolution').getByRole('button', { name: 'Ver evoluciones', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Evoluciones del episodio' });
    await dialog.getByText(narrative, { exact: true }).waitFor();
    assert.deepEqual(await dialog.locator('.hhr-evo-reader-note p').allTextContents(), [narrative]);
    await dialog.getByRole('button', { name: 'Scores', exact: true }).click();
    const scores = page.getByRole('table', { name: 'Valoraciones del episodio' });
    await scores.waitFor();
    const rows = scores.locator('tbody tr:not(.hhr-score-detail)');
    const visibleCells = await rows.evaluateAll(items => items.map(row => Array.from(row.cells, cell => cell.textContent)));
    assert.deepEqual(visibleCells, expected);
    assert.deepEqual(await rows.locator('td:last-child time').evaluateAll(items => items.map(time => time.dateTime)),
      expected.map(row => row.at(-1).split('-').reverse().join('-')));
    const show = rows.first().getByRole('button');
    await show.click();
    await scores.getByText(history[episode].at(-1).OBE_NOTES, { exact: true }).waitFor();
    await show.click();
    if (process.env.RUNNER_TEMP) {
      const images = path.join(process.env.RUNNER_TEMP, 'pautas-scores');
      await mkdir(images, { recursive: true });
      await page.screenshot({ path: path.join(images, screenshotName + '.png') });
    }
  }

  return { save, verify };
}
