import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const capture = async (page, name) => {
  if (!process.env.HHR_VISUAL_ARTIFACT_DIR) return;
  await mkdir(process.env.HHR_VISUAL_ARTIFACT_DIR, { recursive: true });
  await page.locator('#hhr-prescription-print-modal .hhr-center-dialog').screenshot({ path: path.join(process.env.HHR_VISUAL_ARTIFACT_DIR, name + '.png'), animations: 'disabled' });
};

export const verifyDockedPanel = async page => {
  const root = page.locator('#hhr-prescription-print-modal');
  assert.equal(await root.getAttribute('data-panel-mode'), 'docked');
  await page.evaluate(() => {
    const style = document.createElement('style'); style.id = 'workspace-native-header-style';
    style.textContent = '.MuiAppBar-root{position:fixed;top:0;left:0;width:100%;height:48px;background:#128e86;color:white;z-index:4}';
    document.head.append(style);
    const header = document.createElement('header'); header.id = 'workspace-native-header';
    header.className = 'MuiAppBar-root'; header.textContent = 'Ficha clínica sintética'; document.body.prepend(header);
  });
  const available = await page.evaluate(() => innerWidth - Number.parseFloat(document.documentElement.style.getPropertyValue('--hhr-center-reserved')));
  assert.ok(Math.abs((await page.locator('#workspace-native-header').boundingBox()).width - available) < 2);
  await page.locator('#native-validate').evaluate(button => button.onclick = () => { button.dataset.clicked = 'true'; });
  await page.locator('#native-validate').click();
  assert.equal(await page.locator('#native-validate').getAttribute('data-clicked'), 'true');
  assert.equal(await root.isVisible(), true);
  await root.locator('[data-panel="dock"]').click();
  assert.equal(await root.getAttribute('data-panel-mode'), 'floating');
  assert.ok(Math.abs((await page.locator('#workspace-native-header').boundingBox()).width - page.viewportSize().width) < 2);
  assert.equal(await root.getByRole('dialog').getAttribute('aria-modal'), 'true');
  await root.locator('[data-panel="minimize"]').click();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.querySelector('#hhr-prescription-print-modal').contains(document.activeElement)), false);
  await root.getByRole('button', { name: 'Restaurar Centro HHR', exact: true }).click();
  await root.locator('[data-panel="expand"]').click();
  assert.equal(await root.getAttribute('data-expanded'), 'true');
  await root.locator('[data-panel="dock"]').click();
  assert.equal(await root.getAttribute('data-panel-mode'), 'docked');
  await root.locator('[data-panel="density"]').click();
  assert.equal(await root.getAttribute('data-density'), 'compact');
  await root.locator('[data-panel="density"]').click();
  await page.locator('#workspace-native-header').evaluate(node => node.remove());
  await page.locator('#workspace-native-header-style').evaluate(node => node.remove());
};

export const verifyLabWorkspace = async (page, worker) => {
  const root = page.locator('#hhr-prescription-print-modal');
  await root.locator('[name="hhr-labreq-patient-source"][value="manual"]').check();
  const name = root.locator('[data-manual="name"]');
  await name.fill('Paciente de prueba');
  assert.equal(await root.locator('.hhr-patientbar-name').textContent(), 'Paciente de prueba');
  assert.equal(await root.locator('.hhr-patientbar-episode').textContent(), '');
  await root.locator('[data-panel="minimize"]').click();
  assert.equal(await root.getByRole('dialog').isVisible(), false);
  assert.equal(await page.evaluate(() => Boolean(document.documentElement.dataset.hhrCenterDocked)), false);
  await root.getByRole('button', { name: 'Restaurar Centro HHR', exact: true }).click();
  assert.equal(await name.inputValue(), 'Paciente de prueba');
  const resize = root.getByRole('separator');
  const beforeWidth = Number(await resize.getAttribute('aria-valuenow'));
  const rect = await resize.boundingBox();
  await page.mouse.move(rect.x + 3, rect.y + 180);
  await page.mouse.down();
  await page.mouse.move(rect.x - 37, rect.y + 180);
  await page.mouse.up();
  assert.ok(Number(await resize.getAttribute('aria-valuenow')) > beforeWidth + 30);
  const search = root.getByRole('searchbox', { name: 'Buscar exámenes para solicitar' });
  assert.equal(await root.locator('.hhr-labreq-group-editor').isVisible(), false);
  await search.fill('pcr');
  assert.equal(await root.getByRole('checkbox', { name: 'CREATININA', exact: true }).isVisible(), false);
  await root.getByRole('checkbox', { name: 'PROTEINA C REACTIVA', exact: true }).check();
  await search.fill('creat');
  await root.getByRole('checkbox', { name: 'CREATININA', exact: true }).check();
  assert.equal(await root.locator('.hhr-labreq-selected button').count(), 2);
  await root.getByRole('button', { name: 'Guardar selección', exact: true }).click();
  assert.equal(await root.locator('.hhr-labreq-group-editor').isVisible(), true);
  await root.getByRole('button', { name: 'Cancelar', exact: true }).click();
  assert.equal(await root.locator('.hhr-labreq-group-editor').isVisible(), false);
  await root.getByRole('button', { name: 'Guardar selección', exact: true }).click();
  await root.getByRole('textbox', { name: 'Nombre del grupo', exact: true }).fill('Grupo de prueba');
  await root.getByRole('button', { name: 'Guardar', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.hhr-labreq-search-summary')?.textContent === 'Grupo guardado en este navegador.');
  const stored = await worker.evaluate(() => chrome.storage.local.get(null));
  assert.equal(JSON.stringify(stored).includes('Paciente de prueba'), false);
  assert.deepEqual(Object.entries(stored).find(([key]) => key.startsWith('hhr-center-lab-group-v1:'))[1].keys.sort(), [
    'bioquimica|CREATININA', 'inmunologia|PROTEINA C REACTIVA',
  ]);
  await search.fill('no-existe-ningun-examen');
  assert.match(await root.locator('.hhr-labreq-search-summary').textContent(), /No hay coincidencias/);
  await root.getByRole('button', { name: 'Quitar PROTEINA C REACTIVA', exact: true }).click();
  assert.equal(await root.locator('.hhr-labreq-selected button').count(), 1);
  await root.getByRole('combobox', { name: 'Grupos de exámenes guardados' }).selectOption({ label: 'Grupo de prueba' });
  await root.getByRole('button', { name: 'Añadir grupo', exact: true }).click();
  await root.getByRole('button', { name: 'Añadir grupo', exact: true }).click();
  assert.equal(await root.locator('.hhr-labreq-selected button').count(), 2);
  await search.fill('');
  await capture(page, 'workspace-laboratorio');
  await root.locator('.hhr-labreq-print').click();
  const preview = root.locator('.hhr-document-preview');
  assert.equal(await preview.locator('.hhr-preview-formats').isVisible(), false);
  assert.equal(await preview.locator('.hhr-preview-page-controls').isVisible(), false);
  const documentFrame = preview.frameLocator('iframe');
  await documentFrame.getByText('Paciente de prueba', { exact: false }).first().waitFor();
  assert.equal(await documentFrame.locator('.exam').filter({ hasText: 'CREATININA' }).locator('.box.on').count(), 1);
  assert.equal(await documentFrame.locator('.exam').filter({ hasText: 'PROTEINA C REACTIVA' }).locator('.box.on').count(), 1);
  await capture(page, 'workspace-solicitud');
  const printedPage = page.waitForEvent('popup');
  await preview.getByRole('button', { name: 'Imprimir', exact: true }).click();
  const popup = await printedPage;
  await popup.getByText('Paciente de prueba', { exact: false }).first().waitFor();
  await page.waitForFunction(() => document.querySelector('.hhr-preview-status')?.textContent === 'Impresión solicitada.');
  await popup.close();
  await preview.getByRole('button', { name: 'Volver', exact: true }).click();
  assert.equal(await name.inputValue(), 'Paciente de prueba');
  assert.equal(await root.locator('.hhr-labreq-selected button').count(), 2);
  await verifyPdfPreview(page, worker);
  await root.locator('.hhr-rx-close').click();
  await page.locator('#hhr-clinical-operations-bar').evaluate(bar => {
    bar.shadowRoot.querySelector('.hhr-ops-exams').click();
    bar.shadowRoot.querySelector('.hhr-exams-lab').click();
  });
  await page.locator('.hhr-labreq-print').waitFor();
  assert.equal(await page.locator('.hhr-labreq-selected button').count(), 0);
  assert.equal(await page.getByRole('combobox', { name: 'Grupos de exámenes guardados' }).locator('option').filter({ hasText: 'Grupo de prueba' }).count(), 1);
};

const verifyPdfPreview = async (page, worker) => {
  const fixture = await worker.evaluate(async url => {
    self.HhrExtensionRuntime.ensurePdf();
    const pdf = await self.PDFLib.PDFDocument.create();
    pdf.addPage([612, 792]).drawText('Documento sintetico de prueba', { x: 40, y: 720 });
    pdf.addPage([612, 792]).drawText('Segunda pagina sintetica', { x: 40, y: 720 });
    const bytes = await pdf.save();
    const base64 = btoa(String.fromCharCode(...bytes));
    const [tab] = await chrome.tabs.query({ url });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'ISOLATED', args: [base64], func: pdfBase64 => {
      globalThis.__hhrWorkspacePreviewMessages = [];
      globalThis.HhrDocumentPreviewRuntime.open({
        root: document.querySelector('#hhr-prescription-print-modal'), title: 'Documento sintético', formats: true,
        runtimeMessages: globalThis.HhrRayenMessageContract.types,
        load: async format => ({ ok: true, jobId: 'synthetic-' + format, pdfBase64, filename: 'synthetic.pdf' }),
        sendMessage: async message => { globalThis.__hhrWorkspacePreviewMessages.push(message); return { ok: true }; },
      });
    } });
    return { tabId: tab.id };
  }, page.url());
  const preview = page.locator('.hhr-document-preview');
  await preview.locator('canvas').waitFor();
  await page.waitForFunction(() => document.querySelector('.hhr-preview-status')?.textContent === 'Documento listo para revisar e imprimir.');
  assert.equal(await preview.locator('.hhr-preview-page-controls span').textContent(), '1 / 2');
  await preview.getByRole('button', { name: 'Página siguiente' }).click();
  await page.waitForFunction(() => document.querySelector('.hhr-preview-page-controls span')?.textContent === '2 / 2');
  await preview.getByRole('button', { name: 'Compacta', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-format="compact"]')?.getAttribute('aria-pressed') === 'true' &&
    document.querySelector('.hhr-preview-status')?.textContent === 'Documento listo para revisar e imprimir.');
  await capture(page, 'workspace-pdf');
  await preview.getByRole('button', { name: 'Imprimir', exact: true }).click();
  const messages = await worker.evaluate(async tabId => {
    const [result] = await chrome.scripting.executeScript({ target: { tabId }, world: 'ISOLATED',
      func: () => globalThis.__hhrWorkspacePreviewMessages });
    return result.result;
  }, fixture.tabId);
  assert.ok(messages.some(message => message.operation === 'print' && message.jobId === 'synthetic-compact'));
  await preview.getByRole('button', { name: 'Volver', exact: true }).click();
};
