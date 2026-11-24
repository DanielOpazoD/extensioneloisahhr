import assert from 'node:assert/strict';

export async function verifyClinicalChecklists(context, original, worker) {
  const ficha = await context.newPage();
  await ficha.goto('https://fichamedico.rayensalud.cl/dashboard/encounter-list-nurse/661733');
  await ficha.waitForFunction(() => document.documentElement.dataset.hhrPrescriptionPrintState === 'ready');
  const origin = 'https://hhr-hospitalizados.app';
  const portal = await context.newPage();
  const portalRoute = route => route.fulfill({ contentType: 'text/html', body: '<main>HHR de prueba</main>' });
  await portal.route(origin + '/**', portalRoute);
  await portal.goto(origin + '/');
  await portal.evaluate(() => {
    // The already-open portal is still restoring its authenticated view.
    window.addEventListener('message', e => {
      if (e.source !== window || e.origin !== location.origin || e.data?.type !== 'HHR_CHECKLIST_REQUEST') return;
      const { request, requestId } = e.data;
      const data = request.action === 'templates' ? { uid: 'test-nurse', authorName: 'Profesional de prueba', templates: [{ id: 'seguimiento', title: 'Seguimiento IAAS', version: 1,
        fields: [{ id: 'control', type: 'text', label: 'Observación', required: true }] }] } :
        { record: { code: request.code, authorUid: request.uid, patient: { episode: request.episode },
          evolution: 'Aplicación pauta IAAS\n' + request.answers.control + '\nCódigo de verificación: ' + request.code } };
      window.postMessage({ type: 'HHR_CHECKLIST_RESPONSE', requestId, data }, location.origin);
    });
  });
  try {
    await ficha.evaluate(() => {
      const section = document.createElement('section'); section.id = 'observationEntrySection';
      section.innerHTML = '<h2>Evolución</h2><textarea>Texto previo</textarea><button type="button">Firmar evolución</button>';
      document.querySelector('main').append(section);
      section.querySelector('button').onclick = () => { throw new Error('La extensión intentó firmar'); };
    });
    assert.equal(await ficha.getByRole('button', { name: 'Aplicar pauta' }).count(), 0);
    await worker.evaluate(async () => {
      globalThis.__checklistFetch = globalThis.fetch;
      globalThis.fetch = (input, init) => String(input).includes('/api/encounter/patientHeaderData/')
        ? Promise.resolve(Response.json({ patID: 91, preferredIdentifierCode: 'TEST-X', firstGivenName: 'Persona', firstFamilyName: 'Sintética' }))
        : globalThis.__checklistFetch(input, init);
      await chrome.storage.local.set({ 'hhr-clinical-checklists-enabled': true });
    });
    await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ url: 'https://fichamedico.rayensalud.cl/dashboard/encounter-list-nurse/661733' });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['clinical-checklist-dialog.js'] });
    });
    const native = ficha.locator('#test-evolution-dialog');
    await ficha.evaluate(() => {
      const dialog = document.createElement('dialog');
      dialog.id = 'test-evolution-dialog'; dialog.setAttribute('aria-label', 'Nueva evolución');
      document.body.append(dialog);
    });
    await ficha.getByRole('button', { name: 'Aplicar pauta' }).waitFor();
    await native.evaluate(dialog => dialog.showModal());
    await native.getByRole('button', { name: 'Aplicar pauta' }).waitFor();
    await native.evaluate(dialog => dialog.close());
    await ficha.locator('#observationEntrySection').getByRole('button', { name: 'Aplicar pauta' }).click();
    await portal.evaluate(() => setTimeout(() => document.documentElement.setAttribute('data-hhr-checklists-ready', ''), 650));
    const modal = ficha.getByRole('dialog', { name: 'Aplicar pauta' });
    await modal.getByLabel('Observación').fill('Control sintético');
    assert.match(await modal.locator('.identity').innerText(), /Persona Sintética/);
    const save = modal.getByRole('button', { name: 'Guardar e insertar' });
    await save.evaluate(el => el.click());
    assert.equal(await save.isEnabled(), true);
    await save.focus();
    await save.press('Enter');
    await ficha.locator('dialog.hhr-checklist-dialog').waitFor({ state: 'detached' });
    assert.match(await ficha.locator('#observationEntrySection textarea').inputValue(),
      /^Texto previo\n\nAplicación pauta IAAS\nControl sintético\nCódigo de verificación: PT-[0-9A-F-]{36}$/);
    await ficha.getByRole('button', { name: 'Pauta insertada · guardar en Eloísa' }).waitFor();
    await ficha.evaluate(() => {
      history.pushState({}, '', '/dashboard/encounter-list-nurse/661734');
      document.querySelector('#observationEntrySection textarea').value = '';
      document.getElementById('observationEntrySection').append(document.createElement('span'));
    });
    await ficha.getByRole('button', { name: 'Aplicar pauta', exact: true }).waitFor();
    assert.equal(await ficha.locator('.hhr-checklist-trigger').getAttribute('title'), '');
    await ficha.locator('#observationEntrySection textarea').evaluate(el => el.remove());
    await ficha.getByRole('button', { name: 'Aplicar pauta', exact: true }).click();
    try {
      await modal.getByLabel('Observación').fill('Seguimiento diferido de prueba', { timeout: 12000 });
    } catch (error) {
      throw new Error('La segunda ficha no abrió su pauta: ' + await modal.innerText({ timeout: 1500 }), { cause: error });
    }
    await modal.getByRole('button', { name: 'Guardar e insertar' }).click();
    await modal.getByRole('button', { name: 'Insertar en evolución' }).waitFor();
    await modal.getByRole('button', { name: 'Cerrar' }).click();
    await portal.close();
    await ficha.evaluate(() => {
      const dialog = document.getElementById('test-evolution-dialog');
      const note = document.createElement('textarea');
      dialog.append(note);
      const create = document.createElement('button');
      create.textContent = 'Nueva evolución';
      create.onclick = () => dialog.showModal();
      document.getElementById('observationEntrySection').append(create);
    });
    await ficha.getByRole('button', { name: 'Insertar pauta guardada' }).click();
    await ficha.locator('dialog.hhr-checklist-dialog').waitFor({ state: 'detached' });
    assert.match(await native.locator('textarea').inputValue(), /Seguimiento diferido de prueba\nCódigo de verificación: PT-/);
    assert.equal(await native.evaluate(dialog => dialog.open), true);
  } finally {
    await worker.evaluate(async () => {
      if (globalThis.__checklistFetch) { globalThis.fetch = globalThis.__checklistFetch; delete globalThis.__checklistFetch; }
      await chrome.storage.local.remove('hhr-clinical-checklists-enabled');
    });
    await ficha.evaluate(() => document.getElementById('observationEntrySection')?.remove());
    if (!portal.isClosed()) await portal.close();
    await ficha.close();
    await original.bringToFront();
  }
}
