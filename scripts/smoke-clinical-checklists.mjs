import assert from 'node:assert/strict';

const actionsButton = scope => scope.getByRole('button', { name: 'Acciones de evolución' });
const openChecklistAction = async (scope, name = 'Pautas') => {
  await actionsButton(scope).click();
  await scope.getByRole('menuitem', { name, exact: true }).click();
};

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
  const actions = actionsButton(evolution);
  await actions.press('ArrowDown');
  const menu = evolution.getByRole('menu', { name: 'Acciones de evolución' });
  const pautas = menu.getByRole('menuitem', { name: 'Pautas' });
  await pautas.waitFor();
  assert.equal(await pautas.evaluate(el => el === document.activeElement), true);
  const anchorBox = await actions.boundingBox();
  const menuBox = await menu.boundingBox();
  assert.ok(Math.abs(anchorBox.x - menuBox.x) < 2 && Math.abs(anchorBox.y + anchorBox.height - menuBox.y) <= 6,
    'El menú debe quedar junto al botón que lo abre');
  await pautas.press('ArrowDown');
  const braden = menu.getByRole('menuitem', { name: 'Braden' });
  assert.equal(await braden.evaluate(el => el === document.activeElement), true);
  await braden.press('Escape');
  assert.equal(await actions.evaluate(el => el === document.activeElement), true);
  assert.equal(await evolution.evaluate(el => el.open), true);
  await actions.click();
  await evolution.locator('textarea').click();
  await menu.waitFor({ state: 'hidden' });
  await openChecklistAction(evolution);
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
      const data = request.action === 'templates' ? { uid: 'test-nurse', authorName: 'Profesional de prueba', templates: [
        ...['vigilancia-cirugias', 'supervision-tacto', 'p-9470a3d4-a989-4199-b822-eef1e78fe60b'].map(id => ({
          id, title: 'Pauta retirada', version: 1, fields: [{ id: 'test', label: 'asdasdasd', type: 'text' }],
        })), { id: 'seguimiento', title: 'Seguimiento sintético', version: 1,
        fields: [{ id: 'control', type: 'text', label: 'Observación', required: true }] },
        { id: 'otro-control', title: 'Otra pauta sintética', version: 1,
          fields: [{ id: 'control', type: 'text', label: 'Detalle', required: true }] }] } :
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
    assert.equal(await actionsButton(ficha).count(), 0);
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
      dialog.id = 'test-evolution-dialog'; dialog.setAttribute('aria-labelledby', 'test-evolution-title');
      dialog.innerHTML = '<h2 class="MuiDialogTitle-root" id="test-evolution-title">Evolución</h2>';
      document.body.append(dialog);
      const pencil = document.createElement('button');
      pencil.setAttribute('aria-label', 'Editar evolución');
      pencil.onclick = () => dialog.showModal();
      document.querySelector('#observationEntrySection').append(pencil);
    });
    await actionsButton(ficha).waitFor();
    await ficha.getByRole('button', { name: 'Editar evolución' }).click();
    const samples = await native.evaluate(async dialog => {
      const counts = [];
      for (let frame = 0; frame < 24; frame++) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        counts.push(dialog.querySelectorAll('.MuiDialogTitle-root .hhr-checklist-trigger').length);
      }
      return counts.slice(2);
    });
    assert.ok(samples.every(count => count === 1), 'Acceso inestable al abrir con el lápiz: ' + samples.join(''));
    await ficha.locator('#observationEntrySection [aria-label="Editar evolución"]').evaluate(el => el.remove());
    await actionsButton(native).waitFor();
    await verifyTemplateDialogs(ficha, native, portal);
    await native.evaluate(dialog => dialog.close());
    await openChecklistAction(ficha.locator('#observationEntrySection'), 'Continuar pauta');
    const modal = ficha.getByRole('dialog', { name: 'Aplicar pauta' });
    assert.equal(await modal.getByLabel('Observación').inputValue(), 'Selección de prueba');
    assert.equal(await modal.locator('#hhr-checklist-template option').count(), 2);
    await modal.getByLabel('Observación').fill('Control sintético');
    assert.match(await modal.locator('.identity').innerText(), /Persona Sintética/);
    const save = modal.getByRole('button', { name: 'Guardar', exact: true });
    await save.evaluate(el => el.click());
    assert.equal(await save.isEnabled(), true);
    await save.focus();
    await save.press('Enter');
    await ficha.locator('dialog.hhr-checklist-dialog').waitFor({ state: 'detached' });
    assert.match(await ficha.locator('#observationEntrySection textarea').inputValue(),
      /^Texto previo\n\nAplicación pauta IAAS\nControl sintético\nCódigo de verificación: PT-[0-9A-F-]{36}$/);
    const editor = ficha.locator('#observationEntrySection textarea');
    assert.ok(await editor.evaluate(el => document.activeElement === el &&
      el.selectionStart === el.value.length && el.selectionEnd === el.value.length));
    await ficha.keyboard.type(' fin');
    assert.ok((await editor.inputValue()).endsWith(' fin'));
    await actionsButton(ficha).click();
    await ficha.getByText('Pauta insertada · guardar en Eloísa', { exact: true }).waitFor();
    await ficha.getByRole('menuitem', { name: 'Pautas' }).press('Escape');
    const noteBeforeCopy = await ficha.locator('#observationEntrySection textarea').inputValue();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(ficha.url()).origin });
    await openChecklistAction(ficha);
    await modal.getByRole('combobox', { name: 'Plantilla', exact: true }).selectOption('otro-control');
    await modal.getByRole('button', { name: 'Fijar pauta favorita' }).click();
    await modal.getByRole('button', { name: 'Quitar pauta favorita' }).waitFor();
    await modal.getByRole('button', { name: 'Cerrar' }).click();
    await openChecklistAction(ficha, 'Otra pauta sintética');
    assert.equal(await modal.locator('#hhr-checklist-template').inputValue(), 'otro-control');
    await modal.getByLabel('Detalle').fill('Prueba de copia');
    await modal.getByRole('button', { name: 'Copiar texto', exact: true }).click();
    await modal.getByRole('status').filter({ hasText: 'texto copiado' }).waitFor();
    assert.match(await ficha.evaluate(() => navigator.clipboard.readText()), /Prueba de copia\nCódigo de verificación: PT-/);
    assert.equal(await ficha.locator('#observationEntrySection textarea').inputValue(), noteBeforeCopy);
    await modal.getByRole('button', { name: 'Cerrar' }).click();
    await ficha.evaluate(() => {
      history.pushState({}, '', '/dashboard/encounter-list-nurse/661734');
      document.querySelector('#observationEntrySection textarea').value = '';
      document.getElementById('observationEntrySection').append(document.createElement('span'));
    });
    await actionsButton(ficha).click();
    assert.equal(await ficha.getByText('Pauta insertada · guardar en Eloísa', { exact: true }).count(), 0);
    await ficha.getByRole('menuitem', { name: 'Pautas' }).press('Escape');
    await ficha.locator('#observationEntrySection textarea').evaluate(el => el.remove());
    await openChecklistAction(ficha);
    try {
      await modal.getByLabel('Observación').fill('Seguimiento diferido de prueba', { timeout: 12000 });
    } catch (error) {
      throw new Error('La segunda ficha no abrió su pauta: ' + await modal.innerText({ timeout: 1500 }), { cause: error });
    }
    await modal.getByRole('button', { name: 'Guardar', exact: true }).click();
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
    await openChecklistAction(ficha, 'Insertar pauta guardada');
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
