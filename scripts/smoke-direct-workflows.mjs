import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

async function verifyImagingToolbar(page, root) {
  const viewport = page.viewportSize();
  const dock = root.locator('[data-panel="dock"]');
  const wasDocked = await dock.getAttribute('aria-pressed') === 'true';
  if (wasDocked) await dock.click();
  try {
    const tabs = root.getByRole('tablist', { name: 'Documento' });
    const consent = tabs.getByRole('tab', { name: 'Consentimiento Informado' });
    await consent.click();
    assert.equal(await consent.getAttribute('aria-selected'), 'true');
    for (const width of [1036, 620, 390, 320]) {
      await page.setViewportSize({ width, height: 740 });
      const layout = await root.evaluate(node => {
        const pane = node.querySelector('.hhr-center-content');
        pane.scrollTop = 0;
        const box = selector => node.querySelector(selector).getBoundingClientRect();
        const docs = box('.hhr-imaging-tabs'), doctor = box('.hhr-imaging-physician'), tools = box('.hhr-imaging-tools');
        return {
          abovePaper: Math.round(box('.hhr-imaging-canvas').top - box('.hhr-center-toolbar').top),
          overflow: pane.scrollWidth - pane.clientWidth, inputWidth: doctor.width,
          docsInline: Math.abs(docs.y + docs.height / 2 - doctor.y - doctor.height / 2) < 2,
          toolsInline: Math.abs(tools.y + tools.height / 2 - doctor.y - doctor.height / 2) < 2,
        };
      });
      assert.ok(layout.overflow <= 1 && layout.inputWidth >= 100 && layout.toolsInline, JSON.stringify({width, layout}));
      assert.equal(layout.docsInline, width >= 620);
      if (width === 1036) assert.ok(layout.abovePaper <= 180, 'Demasiado espacio por encima de la orden personalizada');
    }
    await tabs.getByRole('tab', { name: 'Formulario Solicitud' }).click();
  } finally {
    await page.setViewportSize(viewport);
    if (wasDocked) await dock.click();
  }
}

async function chooseCensusPatient(root, id, query = '') {
  const button = root.getByRole('button', { name: 'De Eloísa', exact: true });
  await button.click();
  const search = root.getByRole('searchbox', { name: 'Buscar paciente en el censo' });
  if (query) await search.fill(query);
  const option = root.getByRole('option').filter({ hasText: 'Paciente sintético ' + id });
  await option.waitFor();
  if (query) {
    assert.equal(await root.getByRole('option').count(), 1);
    await search.press('ArrowDown');
    assert.equal(await option.evaluate(node => document.activeElement === node), true);
    await option.press('Enter');
  } else await option.click();
}

async function verifyLocalOrders(page, worker, root, nav) {
  const choose = source => root.locator('[name="hhr-labreq-patient-source"][value="' + source + '"]').check();
  const name = 'Nora Ejemplo Prueba';
  const run = 'PAS-TEST123';
  for (const module of ['lab', 'imaging']) {
    await nav(module);
    assert.equal(await root.locator('.hhr-center-patientbar').count(), 0);
    const picker = root.getByRole('button', { name: 'De Eloísa', exact: true });
    await choose('manual');
    const hint = root.locator('.hhr-labreq-patient-summary');
    await root.locator('[data-manual="name"]').fill(name);
    assert.equal(await hint.isVisible(), false);
    await root.locator('[data-manual="name"]').fill('');
    assert.equal(await hint.isVisible(), true);
    await root.locator('[data-manual="name"]').fill(name);
    await root.locator('[data-manual="run"]').fill(run);
    await picker.click();
    const search = root.getByRole('searchbox', { name: 'Buscar paciente en el censo' });
    await search.fill('consulta sin coincidencias');
    await search.press('Escape');
    assert.equal(await picker.evaluate(node => document.activeElement === node), true);
    assert.equal(await root.locator('[data-manual="name"]').inputValue(), name);
    if (module === 'imaging') await verifyImagingToolbar(page, root);
    for (const blank of [false, true]) {
      if (blank) {
        await choose('blank');
        await picker.click();
        await root.locator('.hhr-center-toolbar h3, .hhr-center-toolbar h2, .hhr-center-toolbar strong').first().click();
        assert.equal(await picker.getAttribute('aria-expanded'), 'false');
      }
      const actions = root.locator('.hhr-request-actions');
      assert.equal(await actions.locator('.hhr-request-source').isVisible(), blank);
      if (blank) assert.equal(await actions.locator('.hhr-request-source').innerText(), 'Sin identificación');
      const button = actions.getByRole('button', { name: 'Imprimir', exact: true });
      const before = await button.boundingBox();
      await root.locator('.hhr-center-content').evaluate(node => { node.scrollTop = node.scrollHeight; });
      const scrolled = await button.boundingBox();
      assert.ok(Math.abs(scrolled.y - before.y) < 1 && Math.abs(scrolled.x - before.x) < 1);
      let printed;
      if (module === 'lab') {
        const popup = page.waitForEvent('popup');
        await root.locator('.hhr-labreq-print').click();
        const order = await popup;
        printed = await order.locator('body').innerText();
        await order.close();
      } else {
        // Capture exactly the bytes passed to Chrome's print tab, before the job is consumed.
        await worker.evaluate(() => {
          self.__localOrder = new Promise(resolve => {
            const listener = (changes, area) => {
              if (area !== 'session') return;
              const job = Object.entries(changes).find(([key, change]) => key.startsWith('hhr-pdf-print-') && change.newValue?.base64);
              if (!job) return;
              chrome.storage.onChanged.removeListener(listener);
              resolve(job[1].newValue.base64);
            };
            chrome.storage.onChanged.addListener(listener);
          });
        });
        const popup = page.context().waitForEvent('page', {timeout:15000});
        await root.locator('.hhr-imaging-print').click();
        const order = await popup;
        const b64 = await worker.evaluate(() => self.__localOrder);
        const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const pdf = await getDocument({ data: new Uint8Array(Buffer.from(b64, 'base64')), useSystemFonts:true }).promise;
        const content = await (await pdf.getPage(1)).getTextContent();
        printed = content.items.map(item => item.str || '').join(' ');
        await pdf.destroy();
        await order.close();
      }
      assert.doesNotMatch(printed, /Paciente sintético|DOC-FICHA|PAS-PRUEBA/i);
      assert.equal(printed.toUpperCase().includes(run), !blank);
      for (const part of name.toUpperCase().split(' ')) assert.equal(printed.toUpperCase().includes(part), !blank);
    }
    await chooseCensusPatient(root, '141121');
    if (module === 'lab') {
      for (let i = 0; i < 6; i++) {
        await choose('manual');
        await chooseCensusPatient(root, '141121');
        assert.equal(await picker.getAttribute('aria-pressed'), 'true');
      }
    }
  }
  console.info('[órdenes] Cuatro impresiones verificadas: identidad personalizada y en blanco en HTML de laboratorio y PDF de imágenes.');
}

export const verifyDirectWorkflows = async (page, worker) => {
  const url = page.url();
  const tabId = await worker.evaluate(async url => {
    const [tab] = await chrome.tabs.query({ url });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'ISOLATED', func: () => {
      const original = chrome.runtime.sendMessage;
      const types = globalThis.HhrRayenMessageContract.types;
      const state = globalThis.__hhrDirectWorkflowFixture = { calls: [], actor: 'synthetic-author', failHeader: false, failPrint: false, original };
      chrome.runtime.sendMessage = (message, callback) => {
        let response;
        const patient = id => ({ patientId: 'synthetic-' + id, name: 'Paciente sintético ' + id, run: id === '141121' ? 'DOC-FICHA-A' : 'PAS-PRUEBA-B', bed: id === '141121' ? 'C1' : 'C2', service: 'Servicio de prueba' });
        if (message.type === types.PATIENT_HEADER_REQUEST) response = state.failHeader
          ? { error: 'Sin sesión de Ficha Médico.', requiresLogin: true }
          : { patient: patient(message.encId), actorId: state.actor };
        else if (message.type === types.CENSUS_LIST_REQUEST) response = { patients: ['141121', '141122'].map(id => ({ ...patient(id), encounterId: id, isCurrent: id === '141121' })) };
        else if (message.type === types.SYSLAB_STATUS_REQUEST) response = { connected: true };
        else if (message.type === types.LAB_SEARCH_REQUEST) response = { patient: patient(message.encId), batchId: 'synthetic-results', exams: [] };
        else if (message.type === types.CONNECTION_REPAIR_REQUEST) {
          state.failHeader = false; state.failPrint = false;
          response = { report: { fichaMedico: { status: 'ready', reason: 'connected' } } };
        } else if (message.type === types.IMAGING_FORM_PRINT_REQUEST) response = state.failPrint
          ? { error: 'Sesión vencida.', requiresLogin: true }
          : { ok: true };
        else if (message.type === types.DOCUMENT_PREVIEW_REQUEST) response = { ok: true };
        else return original.call(chrome.runtime, message, callback);
        const module = document.querySelector('#hhr-prescription-print-modal')?.dataset.activeModule;
        state.calls.push({ type: message.type, preview: message.preview, operation: message.operation, encId: message.encId, module });
        callback?.(response); return Promise.resolve(response);
      };
    } });
    return tab.id;
  }, url);
  const setState = patch => worker.evaluate(async ({ tabId, patch }) => {
    await chrome.scripting.executeScript({ target: { tabId }, world: 'ISOLATED', args: [patch], func: patch => Object.assign(globalThis.__hhrDirectWorkflowFixture, patch) });
  }, { tabId, patch });
  const root = page.locator('#hhr-prescription-print-modal'), bar = page.locator('#hhr-clinical-operations-bar');
  const nav = module => root.locator('.hhr-center-nav-button[data-module="' + module + '"]').click();
  const labReady = () => page.waitForFunction(() => !document.querySelector('.hhr-labreq-print')?.disabled);
  const imageReady = () => page.waitForFunction(() => !document.querySelector('.hhr-imaging-print')?.disabled);
  try {
    await nav('settings'); await verifyLocalOrders(page, worker, root, nav); await nav('lab'); await labReady();
    assert.equal(await root.locator('.hhr-labreq-patient-summary').isVisible(), false);
    assert.match(await root.locator('.hhr-request-source').innerText(), /Paciente sintético/);
    await root.getByRole('checkbox', { name: 'CREATININA', exact: true }).check();
    await root.getByRole('textbox', { name: 'Otros exámenes', exact: true }).fill('Borrador de prueba');
    await nav('imaging'); await imageReady();
    const imagingLayout = await root.evaluate(node => {
      const bounds = selector => node.querySelector(selector).getBoundingClientRect();
      return { beforeForm: Math.round(bounds('.hhr-imaging-canvas').top - bounds('.hhr-center-toolbar').top),
        width: Math.round(bounds('.hhr-center-dialog').width) };
    });
    console.info('[imágenes] Diálogo de ' + imagingLayout.width + ' px: ' + imagingLayout.beforeForm + ' px antes del formulario');
    if (imagingLayout.width >= 590) assert.ok(imagingLayout.beforeForm < 220, 'Los controles de imágenes deben dejar visible el formulario');
    await root.getByRole('textbox', { name: 'Médico solicitante' }).fill('Profesional de prueba');
    await root.locator('[data-doc="encuesta"]').click();
    await root.locator('.hhr-imaging-canvas').focus(); await page.keyboard.press('Enter');
    assert.equal(await root.locator('.hhr-imaging-mark').count(), 1);
    await root.locator('.hhr-flow-tabs [data-flow="reports"]').click();
    assert.equal(await root.getByRole('button', { name: 'Imprimir', exact: true }).count(), 0);
    await root.locator('.hhr-flow-tabs [data-flow="request"]').click();
    await imageReady();
    assert.equal(await root.locator('.hhr-imaging-mark').count(), 1);
    await nav('settings');
    assert.equal(await root.locator('.hhr-center-patientbar').count(), 0);
    assert.match(await root.getByRole('link', { name: 'Descargar ZIP' }).getAttribute('href'), /releases\/latest\/download\/eloisa-hhr\.zip$/);
    const favorites = root.getByRole('navigation', { name: 'Favoritos' });
    assert.deepEqual(await favorites.getByRole('link').allTextContents(), ['SysLab', 'MMRAD', 'Gmail']);
    assert.equal(await favorites.getByRole('textbox').count(), 0);
    assert.equal(await favorites.getByRole('button').count(), 0);
    await root.getByLabel('Densidad', { exact: true }).selectOption('compact');
    assert.equal(await root.getAttribute('data-density'), 'compact');
    await root.getByLabel('Densidad', { exact: true }).selectOption('normal');
    await nav('lab'); await labReady();
    assert.equal(await root.getByRole('checkbox', { name: 'CREATININA', exact: true }).isChecked(), true);
    assert.equal(await root.getByRole('textbox', { name: 'Otros exámenes' }).inputValue(), 'Borrador de prueba');
    await nav('imaging'); await imageReady();
    assert.equal(await root.locator('.hhr-imaging-mark').count(), 1);
    assert.equal(await root.locator('[data-doc="encuesta"]').getAttribute('aria-selected'), 'true');
    assert.equal(await root.getByRole('textbox', { name: 'Médico solicitante' }).inputValue(), 'Profesional de prueba');
    await root.locator('.hhr-flow-tabs [data-flow="reports"]').click();
    await chooseCensusPatient(root, '141122', 'paspruebab');
    assert.equal(await root.locator('.hhr-flow-tabs [data-flow="reports"]').getAttribute('aria-selected'), 'true');
    await root.locator('.hhr-flow-tabs [data-flow="request"]').click();
    await imageReady();
    assert.match(await root.locator('.hhr-request-source').innerText(), /141122/);
    assert.equal(await root.locator('.hhr-request-id').innerText(), 'PAS-PRUEBA-B');
    assert.equal(await root.locator('.hhr-patientbar-route').isVisible(), true);
    await root.locator('.hhr-imaging-print').click();
    await root.getByText('Se abrió el PDF', { exact: false }).waitFor();
    assert.equal(await root.locator('.hhr-imaging-mark').count(), 0);
    await nav('lab'); await labReady();
    assert.equal(await root.getByRole('textbox', { name: 'Otros exámenes' }).inputValue(), '');
    const openedOrder = page.waitForEvent('popup');
    await root.locator('.hhr-labreq-print').click();
    const order = await openedOrder;
    const printed = await order.locator('body').innerText();
    assert.match(printed, /Paciente sintético 141122/i);
    assert.match(printed, /PAS-PRUEBA-B/i);
    assert.doesNotMatch(printed, /141121|DOC-FICHA-A|Nora Ejemplo/i);
    await order.close();
    await root.locator('.hhr-flow-tabs [data-flow="results"]').click();
    await chooseCensusPatient(root, '141121', 'C1');
    assert.equal(await root.locator('.hhr-flow-tabs [data-flow="results"]').getAttribute('aria-selected'), 'true');
    await root.locator('.hhr-flow-tabs [data-flow="request"]').click();
    await labReady();
    assert.equal(await root.locator('.hhr-patientbar-route').isVisible(), false);
    assert.equal(await root.getByRole('textbox', { name: 'Otros exámenes' }).inputValue(), 'Borrador de prueba');
    await setState({ actor: 'another-author' }); await nav('imaging'); await imageReady(); await nav('lab'); await labReady();
    assert.equal(await root.getByRole('textbox', { name: 'Otros exámenes' }).inputValue(), '');
    await setState({ failHeader: true }); await nav('imaging');
    await root.getByRole('button', { name: 'Reconectar y continuar', exact: true }).waitFor();
    await root.getByRole('textbox', { name: 'Médico solicitante' }).fill('Continuación de prueba');
    await root.getByRole('button', { name: 'Reconectar y continuar', exact: true }).click(); await imageReady();
    assert.equal(await root.getByRole('textbox', { name: 'Médico solicitante' }).inputValue(), 'Continuación de prueba');
    assert.equal(await root.locator('.hhr-imaging-feedback').textContent(), '');
    await setState({ failPrint: true }); await root.locator('.hhr-imaging-print').click();
    await root.getByRole('button', { name: 'Reconectar y continuar', exact: true }).click();
    await imageReady();
    await root.getByRole('button', { name: 'Imprimir', exact: true }).click();
    await root.getByText('Se abrió el PDF', { exact: false }).waitFor();
    assert.equal(await root.locator('.hhr-document-preview').count(), 0);
    await root.locator('.hhr-rx-close').click();
    for (const [label, selector] of [['Ver resultados', '.hhr-lab-filter'], ['Solicitar laboratorio', '.hhr-labreq-print'], ['Solicitar imágenes', '.hhr-imaging-print']]) {
      await bar.getByRole('button', { name: 'Exámenes: laboratorio e imágenes', exact: true }).click();
      await bar.getByRole('menuitem', { name: label, exact: label !== 'Ver resultados' }).click();
      await root.locator(selector).waitFor();
      if (label === 'Solicitar laboratorio') assert.equal(await root.locator('.hhr-labreq-exam input:checked').count(), 0);
      await root.locator('.hhr-rx-close').click();
    }
    const calls = await worker.evaluate(async tabId => {
      const [result] = await chrome.scripting.executeScript({ target: { tabId }, world: 'ISOLATED', func: () => globalThis.__hhrDirectWorkflowFixture.calls }); return result.result;
    }, tabId);
    assert.equal(calls.filter(call => call.operation === 'print').length, 0);
    assert.ok(!calls.some(call => call.module === 'settings' && call.type === 'RAYEN_PATIENT_HEADER_REQUEST'));
    const printRequests = calls.filter(call => call.type === 'RAYEN_IMAGING_FORM_PRINT_REQUEST');
    assert.deepEqual(printRequests.map(call => call.encId), ['141122', '141121', '141121']);
    assert.ok(printRequests.every(call => !call.preview));
    assert.equal(await bar.locator('.hhr-ops-favorites,.collapse').count(), 0);
    await bar.getByRole('button', { name: 'Abrir Centro HHR', exact: true }).click(); await nav('settings');
    const viewport = page.viewportSize();
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await root.locator('.hhr-center-dialog').evaluate(node => node.scrollWidth <= node.clientWidth + 1));
      if (process.env.HHR_VISUAL_ARTIFACT_DIR) {
        await mkdir(process.env.HHR_VISUAL_ARTIFACT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.HHR_VISUAL_ARTIFACT_DIR, 'direct-workflows-settings-' + width + '.png') });
      }
    }
    await page.setViewportSize(viewport); await root.locator('.hhr-rx-close').click();
  } catch (error) {
    if (process.env.HHR_VISUAL_ARTIFACT_DIR) {
      await mkdir(process.env.HHR_VISUAL_ARTIFACT_DIR, { recursive: true });
      await page.screenshot({ path: path.join(process.env.HHR_VISUAL_ARTIFACT_DIR, 'direct-workflows-failure.png') });
    }
    throw error;
  } finally {
    await worker.evaluate(async tabId => {
      await chrome.scripting.executeScript({ target: { tabId }, world: 'ISOLATED', func: () => {
        chrome.runtime.sendMessage = globalThis.__hhrDirectWorkflowFixture.original; delete globalThis.__hhrDirectWorkflowFixture;
      } });
    }, tabId);
  }
  await bar.evaluate(host => { host.shadowRoot.querySelector('.hhr-ops-exams').click(); host.shadowRoot.querySelector('.hhr-exams-lab').click(); });
  await root.locator('.hhr-labreq-print').waitFor();
};
