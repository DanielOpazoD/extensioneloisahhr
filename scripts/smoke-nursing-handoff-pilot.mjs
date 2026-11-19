import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { unzipSync } from 'fflate';

const code = process.env.HHR_HANDOFF_SMOKE_CODE;
assert.match(code ?? '', /^[\w-]{32}$/, 'Requiere un código sintético del emulador.');
const root = await mkdtemp(path.join(os.tmpdir(), 'hhr-handoff-smoke-'));
let context;
const origin = 'https://fichamedico.rayensalud.cl';
try {
  const zip = await readFile('dist/eloisa-hhr-entrega-turno-pruebas.zip');
  for (const [name, bytes] of Object.entries(unzipSync(zip))) {
    const dest = path.join(root, name);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, bytes);
  }
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  await worker.evaluate(() => {
    const fetchNative = self.fetch;
    self.fetch = async (input, init) => {
      const url = new URL(input);
      if (url.origin !== 'https://fichamedicoback.rayensalud.cl') return fetchNative(input, init);
      if (url.pathname.endsWith('/claim/getAllInApp')) return Response.json([{ claim: 'Acceso_Ficha_Clinica', moduleId: 6 }]);
      if (url.pathname.includes('/patientHeaderData/901001/')) return Response.json({
        patID: 700001, preferredIdentifierCode: '11111111-1', firstGivenName: 'Paciente', firstFamilyName: 'Sintético',
      });
      return new Response(null, { status: 404 });
    };
  });
  await context.route(origin + '/**', route => {
    if (route.request().url().includes('/api/auth/session')) return route.fulfill({ json: {
      ok: true, session: {
        token: 'fixture', facilityId: '1', healthCarePractitionerId: '2',
        healthCarePractitionerRoleId: '3', role: 'Enfermera', fullName: 'Profesional de prueba',
      },
    } });
    return route.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8">
      <main><section class="hhr-hospitalized-panel"><table><tr><td>Paciente sintético</td><td>
      <button title="Abrir entrega de turno" data-hhr-handoff-episode="901001">✎</button>
      </td></tr></table></section></main>` });
  });
  await context.route('https://fichamedicoback.rayensalud.cl/**', route => route.abort());
  const page = await context.newPage();
  await page.goto(origin + '/dashboard/encounter-list-nurse');
  const button = page.getByTitle('Abrir entrega de turno');
  await page.waitForFunction(() => !!document.documentElement.dataset.hhrPrescriptionPrintScript);
  const open = async () => {
    const [editor] = await Promise.all([context.waitForEvent('page', { timeout: 10000 }), button.click()]);
    await editor.waitForURL(/nursing-handoff-editor\.html#/);
    return editor;
  };
  const editor = await open();
  editor.on('pageerror', e => console.error(e.message));
  await editor.getByLabel('Código de vinculación de HHR').fill(code);
  await editor.getByRole('button', { name: 'Vincular', exact: true }).click();
  const note = editor.getByLabel('Nota del turno');
  try {
    await note.waitFor({ timeout: 12000 });
  } catch (error) {
    throw new Error('El editor no cargó: ' + await editor.locator('#status').innerText(), { cause: error });
  }
  assert.equal(context.pages().some(tab => /^http:\/\/127\.0\.0\.1/.test(tab.url())), false);
  await note.fill('Guardado desde Chromium con HHR cerrado');
  assert.equal(await editor.getByText('✓ Guardado en HHR', { exact: true }).count(), 0);
  await editor.getByRole('button', { name: 'Guardar', exact: true }).click();
  await editor.getByText('✓ Guardado en HHR', { exact: true }).waitFor();
  await page.getByTitle(/Guardado en HHR/).waitFor();
  await editor.close();
  await button.waitFor();
  const reopened = await open();
  await reopened.getByLabel('Nota del turno').waitFor();
  assert.equal(await reopened.getByLabel('Nota del turno').inputValue(), 'Guardado desde Chromium con HHR cerrado');
  const observer = await open();
  await observer.getByLabel('Nota del turno').waitFor();
  await observer.getByLabel('Nota del turno').fill('Borrador de otro editor');
  await reopened.getByLabel('Nota del turno').fill('Cambio sincronizado entre editores');
  await reopened.getByRole('button', { name: 'Guardar', exact: true }).click();
  await reopened.getByText('✓ Guardado en HHR', { exact: true }).waitFor();
  await observer.getByText('Hay cambios en HHR.', { exact: false }).waitFor();
  assert.equal(await observer.getByLabel('Nota del turno').inputValue(), 'Borrador de otro editor');
  assert.equal(await observer.getByLabel('Nota actual de HHR').inputValue(), 'Cambio sincronizado entre editores');
  assert.equal(await observer.getByRole('button', { name: 'Guardar', exact: true }).isEnabled(), false);
  console.log('OK: Chromium, vinculación, guardado sin pestaña HHR, confirmación, reapertura y borrador ante conflicto.');
} finally {
  await context?.close();
  await rm(root, { recursive: true, force: true });
}
