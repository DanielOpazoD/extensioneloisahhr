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

async function verifyOtherProfessional(context, url) {
  const other = await context.newPage();
  try {
    await other.route('**/api/auth/session*', route => route.fulfill({
      json: { ok: true, session: { token: 'fixture-other', facilityId: '1', healthCarePractitionerId: '82',
        healthCarePractitionerRoleId: '3', role: 'Enfermera', fullName: 'Profesional B', user: 'test-b' } },
    }));
    await other.goto(url);
    await other.evaluate(() => {
      const section = document.createElement('section');
      section.id = 'observationEntrySection';
      section.innerHTML = '<h2>Evolución</h2><textarea></textarea>';
      document.querySelector('main').append(section);
    });
    await openChecklistAction(other);
    const modal = other.getByRole('dialog', { name: 'Aplicar pauta' });
    await modal.getByLabel('Plantilla', { exact: true }).selectOption('otro-control');
    await modal.getByRole('button', { name: 'Fijar pauta favorita' }).waitFor();
    assert.equal(await modal.getByLabel('Detalle').inputValue(), '');
  } finally {
    await other.close();
  }
}

export async function verifyClinicalChecklists(context, original, worker) {
  // Each step says when it starts: in CI this phase took 48 s against 6 s on a desk (27-11-2026).
  const started = Date.now();
  const mark = name => console.info(`[pautas] ${((Date.now() - started) / 1000).toFixed(1)} s · ${name}`);
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
        ? Promise.resolve(Response.json({ patID: 91, preferredIdentifierCode: globalThis.__checklistDocument || 'TEST-X',
          firstGivenName: 'Persona', firstFamilyName: 'Sintética', birthDate: globalThis.__checklistBirthDate || '2000-01-01' }))
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
    mark('acceso con el lápiz');
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
    mark('ventanas de pautas');
    await verifyTemplateDialogs(ficha, native, portal);
    await native.evaluate(dialog => dialog.close());
    mark('continuar pauta y guardar');
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
    mark('pauta insertada');
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
    await verifyOtherProfessional(context, ficha.url());
    await ficha.bringToFront();
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

    mark('escala Braden');
    // The bundled scale works with only Eloísa open, and never uses a narrative draft as its destination.
    await openChecklistAction(native, 'Braden');
    await modal.getByRole('heading', { name: 'Braden adulto', exact: true }).waitFor();
    const insert = modal.getByRole('button', { name: 'Insertar en evolución', exact: true });
    await insert.click();
    await modal.getByRole('status').filter({ hasText: 'Completa primero' }).waitFor();
    for (const option of await modal.locator('button[data-points="1"]').all()) await option.click();
    await modal.getByText('Total: 6 / 23', { exact: true }).waitFor();
    await insert.click();
    await modal.getByRole('status').filter({ hasText: 'nueva y vacía' }).waitFor();
    await modal.getByRole('button', { name: 'Cerrar', exact: true }).click();
    assert.match(await native.locator('textarea').inputValue(), /Seguimiento diferido de prueba/);
    await native.locator('textarea').fill('');
    await openChecklistAction(native, 'Continuar pauta');
    await modal.getByRole('button', { name: 'Copiar texto', exact: true }).click();
    await modal.getByRole('status').filter({ hasText: 'Texto copiado' }).waitFor();
    const bradenText = await ficha.evaluate(() => navigator.clipboard.readText());
    assert.match(bradenText, /^#EscalaBraden\nBraden adulto\n/);
    assert.match(bradenText, /PS 1 · H 1 · A 1 · M 1 · N 1 · F 1/);
    assert.match(bradenText, /Puntaje: 6 \/ 23/);
    await insert.press('Enter');
    await ficha.locator('dialog.hhr-checklist-dialog').waitFor({ state: 'detached' });
    assert.equal(await native.locator('textarea').inputValue(), bradenText);

    await openChecklistAction(native, 'Braden');
    await modal.getByRole('heading', { name: 'Braden adulto', exact: true }).waitFor();
    for (const option of await modal.locator('button[data-points="1"]').all()) await option.click();
    await modal.getByLabel('Observaciones de piel e intervenciones').fill('Otro borrador sintético');
    await worker.evaluate(() => { globalThis.__checklistDocument = 'TEST-Y'; });
    await modal.getByRole('button', { name: 'Copiar texto', exact: true }).click();
    await modal.getByRole('status').filter({ hasText: 'Reabre la ficha del mismo paciente' }).waitFor();
    assert.equal(await ficha.evaluate(() => navigator.clipboard.readText()), bradenText);
    await modal.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await openChecklistAction(native, 'Braden');
    await modal.locator('.identity').filter({ hasText: 'TEST-Y' }).waitFor();
    await modal.getByText('0 de 6 dimensiones completas', { exact: true }).waitFor();
    await modal.getByRole('button', { name: 'Cerrar', exact: true }).click();

    await worker.evaluate(() => { globalThis.__checklistBirthDate = '1950-01-01'; });
    await native.locator('textarea').fill('');
    await openChecklistAction(native, 'Caídas en adultos');
    mark('caídas en adultos');
    await modal.getByRole('heading', { name: 'Caídas en adultos', exact: true }).waitFor();
    await modal.getByLabel('Fecha de valoración').fill('2026-11-27');
    await modal.getByText('Mayor de 75 años (3 pts)', { exact: true }).waitFor();
    await modal.getByRole('checkbox', { name: /^Ningún tratamiento/ }).check();
    await insert.click();
    await modal.getByRole('status').filter({ hasText: 'Completa primero: Factores de riesgo' }).waitFor();
    const noFactors = modal.getByRole('checkbox', { name: /^Ningún factor/ });
    await noFactors.check();
    await modal.getByText('Total: 3 / 30', { exact: true }).waitFor();
    await modal.getByRole('checkbox', { name: /^Historia de caídas anteriores/ }).check();
    assert.equal(await noFactors.isChecked(), false);
    await modal.getByText('Total: 4 / 30', { exact: true }).waitFor();
    await modal.getByText('Riesgo Medio', { exact: true }).waitFor();
    await insert.press('Enter');
    await ficha.locator('dialog.hhr-checklist-dialog').waitFor({ state: 'detached' });
    const adultFalls = await native.locator('textarea').inputValue();
    assert.match(adultFalls, /^#EscalaCaidas\nCaídas en adultos\n2026-11-27 /);
    assert.match(adultFalls, /Puntaje: 4 \/ 30\nRiesgo de caídas según escala: Medio \(medio\)/);

    await worker.evaluate(() => { globalThis.__checklistBirthDate = '2024-06-01'; });
    await native.locator('textarea').fill('');
    await openChecklistAction(native, 'Caídas pediátricas');
    mark('caídas pediátricas');
    await modal.getByRole('heading', { name: 'Caídas pediátricas', exact: true }).waitFor();
    await modal.getByLabel('Fecha de valoración').fill('2026-11-27');
    await modal.getByRole('radio', { name: /^Lactante mayor o preescolar/ }).check();
    for (const label of ['Antecedentes de caídas previas', 'Compromiso de conciencia']) {
      await modal.getByRole('group', { name: label, exact: true }).getByRole('radio', { name: /^Sí/ }).check();
    }
    const history = modal.getByRole('group', { name: 'Antecedentes', exact: true });
    const none = history.getByRole('checkbox', { name: /^Sin antecedentes/ });
    const present = await history.getByRole('checkbox', { name: /^(?!Sin antecedentes)/ }).all();
    for (const box of present) await box.check();
    await modal.getByText('Total: 10 / 10', { exact: true }).waitFor();
    await none.check();
    assert.ok((await Promise.all(present.map(box => box.isChecked()))).every(selected => !selected));
    await modal.getByText('Total: 5 / 10', { exact: true }).waitFor();
    for (const box of present) await box.check();
    assert.equal(await none.isChecked(), false);
    await modal.getByLabel('Observaciones y medidas preventivas aplicadas').fill('Observación ficticia de la prueba.');
    await modal.getByRole('button', { name: 'Copiar texto', exact: true }).click();
    await modal.getByRole('status').filter({ hasText: 'Texto copiado' }).waitFor();
    const pediatricFalls = await ficha.evaluate(() => navigator.clipboard.readText());
    assert.match(pediatricFalls, /^#EscalaCaidas\nCaídas pediátricas\n2026-11-27 /);
    assert.match(pediatricFalls, /Puntaje: 10 \/ 10\nRiesgo de caídas según escala: Alto \(alto\)/);
    await insert.press('Enter');
    await ficha.locator('dialog.hhr-checklist-dialog').waitFor({ state: 'detached' });
    assert.equal(await native.locator('textarea').inputValue(), pediatricFalls);
  } finally {
    await worker.evaluate(async () => {
      if (globalThis.__checklistFetch) { globalThis.fetch = globalThis.__checklistFetch; delete globalThis.__checklistFetch; }
      delete globalThis.__checklistDocument;
      delete globalThis.__checklistBirthDate;
      await chrome.storage.local.remove('hhr-clinical-checklists-enabled');
    });
    await ficha.evaluate(() => document.getElementById('observationEntrySection')?.remove());
    if (!portal.isClosed()) await portal.close();
    await ficha.close();
    await original.bringToFront();
  }
}
