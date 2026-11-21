import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { unzipSync } from 'fflate';

const synthetic = process.env.HHR_HANDOFF_SYNTHETIC === '1';
const sessions = [crypto.randomUUID(), crypto.randomUUID()];
const root = await mkdtemp(path.join(os.tmpdir(), 'hhr-handoff-smoke-'));
let context;
const origin = 'https://fichamedico.rayensalud.cl';
// Intercept only the synthetic pilot's loopback API, before its worker binds fetch.
function installSyntheticHandoff() {
  const realFetch = self.fetch;
  const notes = new Map();
  let revision = 0;
  self.__handoffShift = { date:'2026-11-19', shift:'night' };
  self.__handoffActors = new Set();
  self.fetch = async (input, init) => {
    const url = new URL(input);
    if (url.hostname !== '127.0.0.1' || !url.pathname.endsWith('/nursingHandoffExtension')) return realFetch(input, init);
    const { data } = JSON.parse(init.body);
    self.__handoffActors.add(data.source.practitionerId);
    const slot = self.__handoffShift;
    const fail = (status, message, details) => Response.json({ error:{ status, message, details } }, { status:409 });
    if (data.episode === '901003') return fail('NOT_FOUND', 'Este episodio aún no está en el censo local de pruebas.', slot);
    if (data.date && (data.date !== slot.date || data.shift !== slot.shift)) {
      return fail('FAILED_PRECONDITION', 'Cambió el turno o la fecha censal. Abre otra entrega.');
    }
    const key = slot.date + '/' + slot.shift + '/' + data.episode;
    const previous = () => notes.get(key) ?? { text:'', version:'0'.repeat(64) };
    if (data.action === 'save') {
      if (data.version !== previous().version) return fail('ABORTED', 'La entrega cambió en HHR.');
      const value = { text:data.text, version:(++revision).toString(16).padStart(64,'0') };
      notes.set(key, value);
      return Response.json({ result:{ ...slot, ...value, confirmed:true } });
    }
    if (data.since) await new Promise(resolve => setTimeout(resolve, 150));
    return Response.json({ result:{ ...slot, ...previous() } });
  };
}

try {
  const zip = await readFile('dist/eloisa-hhr-entrega-turno-pruebas.zip');
  const files = unzipSync(zip);
  if (synthetic) {
    const manifest = JSON.parse(Buffer.from(files['manifest.json']).toString('utf8'));
    const worker = manifest.background.service_worker;
    files[worker] = Buffer.concat([
      Buffer.from("'use strict';\n(" + installSyntheticHandoff.toString() + ")();\n"),
      files[worker],
    ]);
  }
  for (const [name, bytes] of Object.entries(files)) {
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
    if (route.request().url().includes('/api/auth/session')) {
      const differentProfessional = synthetic && route.request().headers().referer?.includes('handoffObserver=1');
      return route.fulfill({ json: {
        ok: true, session: {
          token: sessions[differentProfessional ? 1 : 0],
          facilityId: '1', healthCarePractitionerId: differentProfessional ? '4' : '2',
          healthCarePractitionerRoleId: '3', role: 'Enfermera',
          fullName: differentProfessional ? 'Segunda profesional de prueba' : 'Profesional de prueba',
        },
      } });
    }
    const table = new URL(route.request().url()).searchParams.has('handoffTable');
    const markup = table ? `
      <button data-hhr-handoff-toggle aria-expanded="false">Entrega de turno</button>
      <span data-hhr-handoff-pending role="status"></span>
      <table><tbody>${['901001', '901002'].map(id => `<tr><th>Paciente sintético</th><td data-hhr-handoff-episode="${id}">
        <div data-hhr-handoff-inline="${id}" hidden></div>
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
  try {
    await missing.getByText('Este episodio aún no está en el censo local de pruebas.').waitFor({ timeout: 8000 });
  } catch (error) {
    throw new Error('Falló el episodio ausente: ' + await missing.locator('#status').textContent({ timeout: 1000 }), { cause: error });
  }
  assert.match(await missing.locator('#slot').innerText(), /^.+ · (Día|Noche)$/);
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
  await otherPage.goto(origin + '/dashboard/encounter-list-nurse' + (synthetic ? '?handoffObserver=1' : ''));
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
  await observer.getByRole('button', { name: 'Usar nota de HHR', exact: true }).click();
  assert.equal(await observer.locator('#recovery-label').textContent(), 'Mi borrador conservado');
  await observer.locator('#recovery-label').click();
  assert.equal(await observer.getByLabel('Texto conservado').inputValue(), 'Borrador de otro editor');
  await observer.getByRole('button', { name: 'Recuperar como borrador', exact: true }).click();
  assert.equal(await observer.getByLabel('Nota del turno').inputValue(), 'Borrador de otro editor');
  if (synthetic) assert.deepEqual(await worker.evaluate(() => [...self.__handoffActors].sort()), ['2', '4']);
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
  await grid.getByText('2 borradores', { exact: true }).waitFor();
  await second.getByRole('button', { name: 'Guardar', exact: true }).click();
  await second.getByText('✓ Guardado en HHR', { exact: true }).waitFor();
  await first.getByText('Borrador sin guardar', { exact: true }).waitFor();
  await grid.getByText('1 borrador', { exact: true }).waitFor();
  assert.match(await second.locator('footer #slot').innerText(), /^.+ · (Día|Noche)$/);
  await toggle.click();
  assert.equal(await grid.locator(host('901001')).isVisible(), false);
  await toggle.click();
  await a.waitFor();
  assert.equal(await a.inputValue(), 'Solo borrador del primer episodio');
  await grid.locator(host('901001')).evaluate(element => {
    const empty = element.cloneNode(false);
    empty.removeAttribute('data-hhr-handoff-inline');
    empty.id = 'filtered-row-editor';
    element.replaceWith(empty);
  });
  await grid.getByText('1 borrador', { exact: true }).waitFor({ state: 'hidden' });
  await grid.locator('#filtered-row-editor').evaluate(element => {
    const restored = element.cloneNode(false);
    restored.removeAttribute('id');
    restored.dataset.hhrHandoffInline = '901001';
    element.replaceWith(restored);
  });
  await grid.locator(host('901002')).evaluate(element => element.replaceWith(element.cloneNode(false)));
  await first.getByText('Borrador recuperado', { exact: true }).waitFor();
  await grid.getByText('1 borrador', { exact: true }).waitFor();
  await b.waitFor();
  assert.equal(await a.inputValue(), 'Solo borrador del primer episodio');
  assert.equal(await b.inputValue(), 'Nota guardada del segundo episodio');
  assert.equal(await first.getByRole('button', { name: 'Guardar', exact: true }).isEnabled(), true);
  assert.equal(await second.getByRole('button', { name: 'Guardar', exact: true }).isDisabled(), true);
  assert.equal(context.pages().length, tabCount);
  if (synthetic) {
    assert.match(await first.locator('#slot').innerText(), /19.* · Noche$/);
    await worker.evaluate(() => { self.__handoffShift = { date:'2026-11-20', shift:'day' }; });
    await b.focus();
    await a.focus();
    const next = first.getByRole('button', { name:'Ver turno vigente' });
    await next.waitFor();
    assert.equal(await a.getAttribute('readonly'), '');
    assert.equal(await a.inputValue(), 'Solo borrador del primer episodio');
    await next.click();
    await first.getByText(/20.* · Día$/).waitFor();
    assert.match(await first.locator('#recovery-label').textContent(), /Borrador · .*19.* · Noche/);
    await first.locator('#recovery-label').click();
    assert.equal(await first.getByLabel('Texto conservado').inputValue(), 'Solo borrador del primer episodio');
    assert.equal(await a.inputValue(), '');
    assert.equal(await first.getByRole('button', { name:'Guardar', exact:true }).isDisabled(), true);
    console.log('OK: turno nocturno fechado, cambio a turno diurno y recuperación del texto sin transferirlo.');
  }
  console.log('OK: dos entregas en una tabla, guardado por episodio y borrador recuperado tras ocultar o filtrar.');
} finally {
  await context?.close();
  await rm(root, { recursive: true, force: true });
}
