import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const capture = async (page, name) => {
  if (!process.env.HHR_VISUAL_ARTIFACT_DIR) return;
  await mkdir(process.env.HHR_VISUAL_ARTIFACT_DIR, { recursive: true });
  await page.locator('#hhr-prescription-print-modal .hhr-center-dialog').screenshot({ path: path.join(process.env.HHR_VISUAL_ARTIFACT_DIR, name + '.png'), animations: 'disabled' });
};

export const verifyCompactOperationsBar = async page => {
  const viewport = page.viewportSize();
  const bar = page.locator('#hhr-clinical-operations-bar');
  for (const width of [1680, 840, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await bar.evaluate(host => {
      const root = host.shadowRoot, rect = host.getBoundingClientRect();
      return { width: rect.width, height: rect.height,
        labels: ['.hhr-ops-recipes', '.hhr-ops-exams'].map(selector => root.querySelector(selector).textContent.trim()),
        icons: ['.hhr-ops-recipes', '.hhr-ops-exams'].every(selector => root.querySelector(selector).querySelector('svg')),
        subtitle: Boolean(root.querySelector('.session-state')) };
    });
    assert.ok(geometry.width <= 320 && geometry.height <= 40);
    assert.deepEqual(geometry.labels, ['', '']); assert.equal(geometry.icons, true); assert.equal(geometry.subtitle, false);
    assert.equal(await bar.locator('.brand,.hhr-ops-recipes,.hhr-ops-exams,.hhr-ops-session').filter({ visible: true }).count(), 4);
    assert.equal(await bar.locator('.hhr-ops-favorites,.collapse').count(), 0);
    await bar.getByRole('button', { name: 'Exámenes: laboratorio e imágenes', exact: true }).click();
    await bar.getByRole('menuitem', { name: /Laboratorio/ }).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await bar.getByRole('menu', { name: 'Tipos de exámenes' }).isVisible(), false);
  }
  await page.setViewportSize(viewport);
  await bar.locator('.brand').hover();
  const tip = bar.locator('.tip.is-visible');
  await tip.waitFor();
  const session = bar.getByRole('button', { name: /^Abrir conexiones/ });
  await session.hover();
  await tip.waitFor({ state: 'hidden' });
  await session.focus();
  assert.equal(await session.evaluate(button => Boolean(button.closest('[data-tip],[data-tip-note],[title]'))), false);
  await session.press('Enter');
  const panel = page.locator('#hhr-prescription-print-modal[data-active-module="connection"]');
  await panel.locator('.hhr-connection-capabilities').waitFor();
  await panel.locator('[data-module="home"]').click();
  await page.locator('#hhr-prescription-print-modal .hhr-rx-close').click();
};

export const verifyDockedPanel = async page => {
  const root = page.locator('#hhr-prescription-print-modal');
  assert.equal(await root.getAttribute('data-panel-mode'), 'floating');
  assert.equal(await root.getByRole('dialog').getAttribute('aria-modal'), 'true');
  const initial = await root.getByRole('dialog').boundingBox();
  assert.ok(Math.abs(initial.x + initial.width / 2 - page.viewportSize().width / 2) < 2);
  await capture(page, 'workspace-default-dialog');
  await root.locator('[data-panel="dock"]').click();
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
  assert.equal(await root.locator('.hhr-request-source').isVisible(), false);
  assert.equal(await root.locator('.hhr-center-patientbar').count(), 0);
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
  assert.equal(await root.locator('.hhr-labreq-selection-tools').getByRole('button').count(), 0);
  assert.equal(await root.locator('.hhr-labreq-count').isVisible(), false);
  await search.fill('pcr');
  assert.equal(await root.locator('.hhr-labreq-section:visible').count(), 1);
  assert.equal(await root.getByRole('checkbox', { name: 'CREATININA', exact: true }).isVisible(), false);
  await root.getByRole('checkbox', { name: 'PROTEINA C REACTIVA', exact: true }).check();
  assert.equal(await root.locator('.hhr-labreq-count:visible').innerText(), '1 examen');
  await search.fill('creat');
  await root.getByRole('checkbox', { name: 'CREATININA', exact: true }).check();
  assert.equal(await root.locator('.hhr-labreq-selected button').count(), 2);
  await root.getByRole('button', { name: 'Guardar selección', exact: true }).click();
  assert.equal(await root.locator('.hhr-labreq-group-editor').isVisible(), true);
  await root.getByRole('button', { name: 'Cancelar', exact: true }).press('Enter');
  assert.equal(await root.locator('.hhr-labreq-group-editor').isVisible(), false);
  assert.equal(await root.getByRole('button', { name: 'Guardar selección' }).evaluate(button => button === document.activeElement), true);
  await root.getByRole('button', { name: 'Guardar selección', exact: true }).click();
  const groupName = root.getByRole('textbox', { name: 'Nombre del grupo', exact: true });
  await groupName.fill('Grupo de prueba');
  await groupName.press('Enter');
  await page.waitForFunction(() => document.querySelector('.hhr-labreq-search-summary')?.textContent === 'Grupo guardado en este navegador.');
  const stored = await worker.evaluate(() => chrome.storage.local.get(null));
  assert.equal(JSON.stringify(stored).includes('Paciente de prueba'), false);
  assert.deepEqual(Object.entries(stored).find(([key]) => key.startsWith('hhr-center-lab-group-v1:'))[1].keys.sort(), [
    'bioquimica|CREATININA', 'inmunologia|PROTEINA C REACTIVA',
  ]);
  await search.fill('no-existe-ningun-examen');
  assert.equal(await root.locator('.hhr-labreq-section:visible').count(), 0);
  assert.match(await root.locator('.hhr-labreq-search-summary').textContent(), /No hay coincidencias/);
  await root.getByRole('button', { name: 'Quitar PROTEINA C REACTIVA', exact: true }).click();
  assert.equal(await root.locator('.hhr-labreq-selected button').count(), 1);
  await root.getByRole('combobox', { name: 'Grupos de exámenes guardados' }).selectOption({ label: 'Grupo de prueba' });
  await root.getByRole('button', { name: 'Añadir grupo', exact: true }).click();
  await root.getByRole('button', { name: 'Añadir grupo', exact: true }).click();
  assert.equal(await root.locator('.hhr-labreq-selected button').count(), 2);
  await search.fill('');
  await capture(page, 'workspace-laboratorio');
  const printedPage = page.waitForEvent('popup');
  await root.getByRole('button', { name: 'Imprimir', exact: true }).click();
  const popup = await printedPage;
  await popup.getByText('Paciente de prueba', { exact: false }).first().waitFor();
  for (const exam of ['CREATININA', 'PROTEINA C REACTIVA']) {
    assert.equal(await popup.locator('.exam').filter({ hasText: exam }).locator('.box.on').count(), 1);
  }
  assert.equal(await root.locator('.hhr-document-preview').count(), 0);
  await popup.close();
  assert.equal(await name.inputValue(), 'Paciente de prueba');
  assert.equal(await root.locator('.hhr-labreq-selected button').count(), 2);
  await root.locator('.hhr-rx-close').click();
  await page.locator('#hhr-clinical-operations-bar').evaluate(bar => {
    bar.shadowRoot.querySelector('.hhr-ops-exams').click();
    bar.shadowRoot.querySelector('.hhr-exams-lab').click();
  });
  await page.locator('.hhr-labreq-print').waitFor();
  assert.equal(await page.locator('.hhr-labreq-selected button').count(), 0);
  assert.equal(await page.getByRole('combobox', { name: 'Grupos de exámenes guardados' }).locator('option').filter({ hasText: 'Grupo de prueba' }).count(), 1);
};
