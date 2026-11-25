import assert from 'node:assert/strict';

async function verifyTemplateDialogs(page, evolution, portal) {
  await evolution.evaluate(editor => {
    const draft = document.createElement('textarea');
    draft.value = 'Borrador nativo de prueba';
    const templates = document.createElement('button');
    templates.textContent = 'Plantillas';
    templates.onclick = () => {
      const picker = document.createElement('dialog');
      picker.setAttribute('aria-label', 'Plantillas de evolución');
      picker.innerHTML = '<button>Cerrar plantillas</button>';
      document.body.append(picker);
      editor.setAttribute('aria-hidden', 'true');
      picker.showModal();
      picker.firstChild.onclick = () => {
        picker.close();
        picker.remove();
        editor.removeAttribute('aria-hidden');
      };
    };
    editor.append(draft, templates);
  });
  await evolution.getByRole('button', { name: 'Plantillas', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Plantillas de evolución' });
  await picker.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await picker.locator('[data-hhr-checklist]').count(), 0, 'Los accesos HHR invadieron el selector nativo');
  assert.equal(await evolution.locator('.hhr-checklist-trigger').count(), 1, 'El editor perdió su acceso bajo el selector');
  await picker.getByRole('button', { name: 'Cerrar plantillas' }).click();

  await evolution.evaluate(editor => {
    editor.dataset.focusEscapes = '0';
    const guard = event => {
      if (!editor.contains(event.target)) editor.dataset.focusEscapes = String(Number(editor.dataset.focusEscapes) + 1);
    };
    const escape = event => { if (event.key === 'Escape') editor.close(); };
    document.addEventListener('focusin', guard);
    editor.addEventListener('keydown', escape);
    editor.stopTestListeners = () => {
      document.removeEventListener('focusin', guard);
      editor.removeEventListener('keydown', escape);
    };
  });
  await evolution.getByRole('button', { name: 'Aplicar pauta' }).click();
  const checklist = page.getByRole('dialog', { name: 'Aplicar pauta' });
  const topBefore = await checklist.evaluate(el => el.getBoundingClientRect().top);
  await portal.evaluate(() => setTimeout(() => document.documentElement.setAttribute('data-hhr-checklists-ready', ''), 650));
  await checklist.getByLabel('Observación').fill('Selección de prueba');
  assert.equal(await evolution.getAttribute('data-focus-escapes'), '0', 'El foco salió del ámbito de la evolución');
  const topAfter = await checklist.evaluate(el => el.getBoundingClientRect().top);
  assert.ok(Math.abs(topAfter - topBefore) <= 1, 'La cabecera saltó al terminar la carga');
  await checklist.getByLabel('Observación').press('Escape');
  await checklist.waitFor({ state: 'detached' });
  assert.equal(await evolution.evaluate(el => el.open), true);
  assert.equal(await evolution.locator('textarea').inputValue(), 'Borrador nativo de prueba');
  await evolution.evaluate(editor => { editor.stopTestListeners(); editor.querySelector('textarea').remove(); });
}

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
    await verifyTemplateDialogs(ficha, native, portal);
    await native.evaluate(dialog => dialog.close());
    await ficha.locator('#observationEntrySection').getByRole('button', { name: 'Aplicar pauta' }).click();
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
