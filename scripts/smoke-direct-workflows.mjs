import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

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
        const patient = id => ({ patientId: 'synthetic-' + id, name: 'Paciente sintético ' + id, run: 'SINTETICO', service: 'Servicio de prueba' });
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
        state.calls.push({ type: message.type, preview: message.preview, operation: message.operation });
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
  const choose = async id => {
    await root.getByRole('button', { name: /Cambiar paciente/ }).click();
    await root.getByRole('option').filter({ hasText: 'Paciente sintético ' + id }).click();
  };
  try {
    await nav('settings'); await nav('lab'); await labReady();
    await root.getByRole('checkbox', { name: 'CREATININA', exact: true }).check();
    await root.getByRole('textbox', { name: 'Otros exámenes', exact: true }).fill('Borrador de prueba');
    await nav('imaging'); await imageReady();
    await root.getByRole('textbox', { name: 'Médico solicitante' }).fill('Profesional de prueba');
    await root.locator('[data-doc="encuesta"]').click();
    await root.locator('.hhr-imaging-canvas').focus(); await page.keyboard.press('Enter');
    assert.equal(await root.locator('.hhr-imaging-mark').count(), 1);
    await nav('settings');
    await root.getByRole('button', { name: 'Favoritos', exact: true }).click();
    await root.getByRole('textbox', { name: 'Nombre del favorito' }).fill('Enlace de prueba');
    await root.getByRole('textbox', { name: 'URL del favorito' }).fill('https://example.org/');
    await root.getByRole('button', { name: 'Agregar', exact: true }).click();
    await root.locator('.hhr-fav-open').filter({ hasText: 'Enlace de prueba' }).waitFor();
    await root.getByRole('button', { name: 'Volver a ajustes' }).click();
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
    await choose('141122'); await imageReady();
    assert.equal(await root.locator('.hhr-imaging-mark').count(), 0);
    await nav('lab'); await labReady();
    assert.equal(await root.getByRole('textbox', { name: 'Otros exámenes' }).inputValue(), '');
    await choose('141121'); await labReady();
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
    const printRequests = calls.filter(call => call.type === 'RAYEN_IMAGING_FORM_PRINT_REQUEST');
    assert.equal(printRequests.length, 2);
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
