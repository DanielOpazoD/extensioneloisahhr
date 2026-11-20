import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { unzipSync } from 'fflate';

const token = crypto.randomUUID();
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
      if (url.pathname.includes('/patientHeaderData/901002/')) return Response.json({
        patID: 700002, preferredIdentifierCode: '22222222-2', firstGivenName: 'Segundo', firstFamilyName: 'Paciente',
      });
      if (url.pathname.includes('/patientHeaderData/901001/') || url.pathname.includes('/patientHeaderData/901003/')) return Response.json({
        patID: 700001, preferredIdentifierCode: '11111111-1', firstGivenName: 'Paciente', firstFamilyName: 'Sintético',
      });
      return new Response(null, { status: 404 });
    };
  });
  await context.route(origin + '/**', route => {
    if (route.request().url().includes('/api/auth/session')) return route.fulfill({ json: {
      ok: true, session: {
        token, facilityId: '1', healthCarePractitionerId: '2',
        healthCarePractitionerRoleId: '3', role: 'Enfermera', fullName: 'Profesional de prueba',
      },
    } });
    const table = new URL(route.request().url()).searchParams.has('handoffTable');
    const markup = table ? `
      <button data-hhr-handoff-toggle aria-expanded="false">Entrega de turno</button>
      <table><tbody>${['901001', '901002'].map(id => `<tr><th>Paciente sintético</th><td>
        <button data-hhr-handoff-episode="${id}">✎</button><div data-hhr-handoff-inline="${id}" hidden></div>
      </td></tr>`).join('')}</tbody></table>
    ` : `
      <table><tr><td>Paciente sintético</td><td>
      <button title="Abrir entrega de turno" data-hhr-handoff-episode="901001">✎</button>
      <button title="Abrir episodio ausente" data-hhr-handoff-episode="901003">✎</button>
      </td></tr></table>`;
    return route.fulfill({ contentType: 'text/html', headers: {
      'Content-Security-Policy': "default-src 'self'; frame-src 'self' blob: https://visor.saludenred.cl https://viau.ssmso.cl; child-src 'self' blob:",
    }, body: `<!doctype html><meta charset="utf-8">
      <main><section class="hhr-hospitalized-panel">${markup}</section></main>` });
  });
  await context.route('https://fichamedicoback.rayensalud.cl/**', route => route.abort());
  const page = await context.newPage();
  await page.goto(origin + '/dashboard/encounter-list-nurse');
  const frame = 'dialog.hhr-nursing-handoff-dialog[open] iframe';
  const open = async (source, title = 'Abrir entrega de turno') => {
    await source.waitForFunction(() => !!document.documentElement.dataset.hhrPrescriptionPrintScript);
    const pages = context.pages().length;
    await source.getByTitle(title).click();
    await source.locator(frame).waitFor();
    assert.equal(context.pages().length, pages);
    return source.frameLocator(frame);
  };
  const missing = await open(page, 'Abrir episodio ausente');
  await missing.getByText('Este episodio aún no está en el censo local de pruebas.').waitFor();
  assert.match(await missing.locator('#slot').innerText(), /^(Día|Noche) · \d{2}-\d{2}-\d{4}$/);
  assert.equal(await missing.getByRole('button', { name: 'Guardar' }).isVisible(), false);
  await missing.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.locator(frame).waitFor({ state: 'detached' });
  const editor = await open(page);
  const note = editor.getByLabel('Nota del turno');
  try {
    await note.waitFor({ timeout: 12000 });
  } catch (error) {
    throw new Error('El editor no cargó: ' + await editor.locator('#status').innerText(), { cause: error });
  }
  assert.equal(await editor.getByLabel('Código de vinculación de HHR').count(), 0);
  assert.equal(await editor.getByRole('button', { name: /vincular/i }).count(), 0);
  assert.equal(await page.locator(frame).evaluate(node => node.contentDocument === null), true);
  assert.equal(context.pages().some(tab => /^http:\/\/127\.0\.0\.1/.test(tab.url())), false);
  await note.fill('Guardado desde Chromium con HHR cerrado');
  assert.equal(await editor.getByText('✓ Guardado en HHR', { exact: true }).count(), 0);
  await note.press('Control+Enter');
  await editor.getByText('✓ Guardado en HHR', { exact: true }).waitFor();
  await page.getByTitle(/Guardado en HHR/).waitFor();
  await editor.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.locator(frame).waitFor({ state: 'detached' });
  assert.equal(await page.getByTitle('Abrir entrega de turno').evaluate(el => el === document.activeElement), true);
  const reopened = await open(page);
  await reopened.getByLabel('Nota del turno').waitFor();
  assert.equal(await reopened.getByLabel('Nota del turno').inputValue(), 'Guardado desde Chromium con HHR cerrado');
  const otherPage = await context.newPage();
  await otherPage.setViewportSize({ width: 390, height: 700 });
  await otherPage.goto(origin + '/dashboard/encounter-list-nurse');
  const observer = await open(otherPage);
  await observer.getByLabel('Nota del turno').waitFor();
  await observer.getByLabel('Nota del turno').fill('Borrador de otro editor');
  await observer.getByLabel('Nota del turno').press('Escape');
  await observer.getByText('Hay cambios sin guardar.').waitFor();
  await observer.getByRole('button', { name: 'Seguir editando' }).click();
  await reopened.getByLabel('Nota del turno').fill('Cambio sincronizado entre editores');
  await reopened.getByRole('button', { name: 'Guardar', exact: true }).click();
  await reopened.getByText('✓ Guardado en HHR', { exact: true }).waitFor();
  await observer.getByText('Hay cambios en HHR.', { exact: false }).waitFor();
  assert.equal(await observer.getByLabel('Nota del turno').inputValue(), 'Borrador de otro editor');
  assert.equal(await observer.getByLabel('Nota actual de HHR').inputValue(), 'Cambio sincronizado entre editores');
  assert.equal(await observer.locator('main').evaluate(main => (
    main.scrollWidth <= main.clientWidth
  )), true);
  assert.equal(await observer.getByRole('button', { name: 'Guardar', exact: true }).isEnabled(), false);
  console.log('OK: diálogo en Eloísa, episodio ausente, guardado con HHR cerrado, confirmación, reapertura y borrador ante conflicto.');

  const grid = await context.newPage();
  await grid.goto(origin + '/dashboard/encounter-list-nurse?handoffTable=1');
  await grid.waitForFunction(() => !!document.documentElement.dataset.hhrPrescriptionPrintScript);
  const toggle = grid.locator('[data-hhr-handoff-toggle]');
  await toggle.evaluate(button => button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    for (const host of document.querySelectorAll('[data-hhr-handoff-inline]')) host.hidden = expanded;
  }));
  const tabCount = context.pages().length;
  await toggle.click();
  const host = id => `[data-hhr-handoff-inline="${id}"]`;
  const first = grid.frameLocator(host('901001') + ' iframe');
  const second = grid.frameLocator(host('901002') + ' iframe');
  const a = first.getByLabel('Nota del turno');
  const b = second.getByLabel('Nota del turno');
  await a.waitFor();
  await b.waitFor();
  assert.equal(context.pages().length, tabCount);
  assert.equal(await grid.locator(host('901001') + ' iframe').evaluate(element => element.contentDocument), null);
  assert.equal(await a.inputValue(), 'Cambio sincronizado entre editores');
  assert.equal(await b.inputValue(), '');
  await a.fill('Solo borrador del primer episodio');
  await b.fill('Nota guardada del segundo episodio');
  await second.getByRole('button', { name: 'Guardar', exact: true }).click();
  await second.getByText('✓ Guardado en HHR', { exact: true }).waitFor();
  await first.getByText('Sin guardar', { exact: true }).waitFor();
  await toggle.click();
  assert.equal(await grid.locator(host('901001')).isVisible(), false);
  await toggle.click();
  await a.waitFor();
  assert.equal(await a.inputValue(), 'Solo borrador del primer episodio');
  for (const id of ['901001', '901002']) {
    await grid.locator(host(id)).evaluate(element => element.replaceWith(element.cloneNode(false)));
  }
  await first.getByText('Borrador recuperado', { exact: true }).waitFor();
  await b.waitFor();
  assert.equal(await a.inputValue(), 'Solo borrador del primer episodio');
  assert.equal(await b.inputValue(), 'Nota guardada del segundo episodio');
  assert.equal(await first.getByRole('button', { name: 'Guardar', exact: true }).isEnabled(), true);
  assert.equal(await second.getByRole('button', { name: 'Guardar', exact: true }).isDisabled(), true);
  assert.equal(context.pages().length, tabCount);
  console.log('OK: dos entregas en una tabla, guardado por episodio y borrador recuperado tras ocultar o filtrar.');
} finally {
  await context?.close();
  await rm(root, { recursive: true, force: true });
}
