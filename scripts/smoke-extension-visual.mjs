import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const screenshot = async (page, name) => {
  if (!process.env.HHR_VISUAL_ARTIFACT_DIR) return;
  await mkdir(process.env.HHR_VISUAL_ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(process.env.HHR_VISUAL_ARTIFACT_DIR, name + '.png') });
};

export const verifyHistoryNavigation = async page => {
  const original = await page.locator('main').innerHTML();
  for (const nested of [false, true]) {
    // Leave room above the timeline so the first jump also moves the bar into sticky position.
    await page.locator('main').evaluate((main, nested) => {
      main.innerHTML = `
        <div role="tablist" style="position:sticky;top:0;background:white;height:70px;z-index:30">
          <button role="tab" aria-selected="true">Historial</button>
        </div>
        <div id="fixture-scroll" style="${nested ? 'overflow-y:auto;height:550px;' : ''}">
          <div id="fixture-timeline" style="margin:180px 20px 0 30%;display:flex;flex-direction:column;gap:12px">
            ${['Hoy', 'Ayer', '01-01-2025'].map(label => `
              <div class="MuiBox-root" style="flex:none">
                <div class="MuiStack-root"><div class="MuiChip-root"><span class="MuiChip-label">${label}</span></div></div>
                <div class="MuiCard-root" style="height:850px;background:#f1f7f5;padding:20px;box-sizing:border-box">
                  Evento sintético
                  <span class="MuiChip-label">02-01-2025</span>
                </div>
              </div>`).join('')}
          </div>
        </div>`;
    }, nested);
    const nav = page.locator('#hhr-history-date-navigation');
    const select = nav.getByRole('combobox', { name: 'Fecha del historial' });
    await select.waitFor();
    assert.equal(await select.locator('option').count(), 3);
    assert.match(await select.locator('option').first().textContent(), /^Hoy · \d{2}-\d{2}-\d{4}$/);
    assert.equal(await nav.getByRole('button', { name: 'Fecha más reciente' }).isDisabled(), true);
    await nav.getByRole('button', { name: 'Fecha anterior', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#hhr-history-date-navigation')?.shadowRoot?.querySelector('select')?.value === '1', null, { timeout: 10000 });
    await select.selectOption('2');
    await page.waitForFunction(() => {
      const shadow = document.querySelector('#hhr-history-date-navigation')?.shadowRoot;
      return shadow?.querySelector('select')?.value === '2' && shadow.querySelector('[data-step="1"]')?.disabled;
    });
    assert.equal(await nav.getByRole('button', { name: 'Fecha anterior', exact: true }).isDisabled(), true);
    await page.evaluate(nested => {
      const target = nested ? document.querySelector('#fixture-scroll') : window;
      document.querySelector('[role="tablist"]').style.height = '90px';
      window.dispatchEvent(new Event('resize'));
      target.scrollBy(0, 300);
    }, nested);
    // Header reflow may move both toolbars. Assert visibility and no obstruction,
    // rather than requiring the previous pixel coordinate to stay unchanged.
    await page.waitForFunction(nested => {
      const rect = document.querySelector('#hhr-history-date-navigation').getBoundingClientRect();
      const bounds = nested ? document.querySelector('#fixture-scroll').getBoundingClientRect() : { top: 0, bottom: innerHeight };
      const tabs = document.querySelector('[role="tablist"]').getBoundingClientRect();
      const operations = document.querySelector('#hhr-clinical-operations-bar').getBoundingClientRect();
      const overlaps = rect.left < operations.right && rect.right > operations.left;
      return rect.height > 0 && rect.top >= Math.max(bounds.top, tabs.bottom, overlaps ? operations.bottom : 0) - 1 &&
        rect.bottom <= Math.min(innerHeight, bounds.bottom) + 1;
    }, nested, { timeout: 10000 });
    assert.equal(await select.inputValue(), '2');
    if (!nested) await screenshot(page, 'historial');
    await select.selectOption('0');
    await page.waitForFunction(() => document.querySelector('#hhr-history-date-navigation')?.shadowRoot?.querySelector('select')?.value === '0');
    // Native filtering replaces the groups; stale dates must disappear from the picker.
    await page.locator('#fixture-timeline > .MuiBox-root').nth(1).evaluate(node => node.remove());
    await page.waitForFunction(() => document.querySelector('#hhr-history-date-navigation')?.shadowRoot?.querySelectorAll('option').length === 2);
    await page.getByRole('tab', { name: 'Historial', exact: true }).evaluate(node => node.setAttribute('aria-selected', 'false'));
    await nav.waitFor({ state: 'detached' });
    await page.locator('main').evaluate((main, original) => { main.innerHTML = original; }, original);
    await page.evaluate(() => window.scrollTo(0, 0));
  }
};

export const verifyLabActionLayout = async page => {
  const originalViewport = page.viewportSize();
  const root = page.locator('#hhr-prescription-print-modal');
  for (const width of [1280, 840, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await root.evaluate(root => {
      const selectors = ['.hhr-center-app-link', '.hhr-patientbar-change', '.hhr-labreq-print', '.hhr-rx-close'];
      const dialog = root.querySelector('.hhr-center-dialog').getBoundingClientRect();
      const controls = selectors.map(selector => {
        const node = root.querySelector(selector);
        const rect = node.getBoundingClientRect();
        return { selector, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width };
      });
      return { controls, left: dialog.left, right: dialog.right,
        overflowing: [...root.querySelectorAll('.hhr-center-header,.hhr-center-patientbar,.hhr-center-toolbar')].some(node => node.scrollWidth > node.clientWidth + 1) };
    });
    assert.equal(geometry.overflowing, false, `Toolbar overflow at ${width}px`);
    for (const control of geometry.controls) {
      assert.ok(control.width > 0 && control.left >= geometry.left && control.right <= geometry.right, `${control.selector} outside dialog at ${width}px`);
      for (const other of geometry.controls.filter(other => other !== control)) {
        assert.ok(control.right <= other.left || control.left >= other.right || control.bottom <= other.top || control.top >= other.bottom,
          `${control.selector} overlaps ${other.selector} at ${width}px`);
      }
    }
    await screenshot(page, 'laboratorio-' + width);
  }
  await page.setViewportSize(originalViewport);
};

export const verifyPrescriptionFormats = async (page, extensionPath) => {
  for (const file of ['hhr-center-shell-runtime.js', 'hhr-prescription-center.js']) {
    await page.addScriptTag({ path: path.join(extensionPath, file) });
  }
  await page.evaluate(() => {
    const noop = () => {};
    const dependencies = {
      modalId: 'hhr-prescription-print-modal', closeModal: () => true,
      ensureStyles: noop, getClinicalGuard: () => ({}), trapModalFocus: noop,
      runClinicalTransition: (_root, action) => action(),
      currentRouteEncounterId: () => '141121', normalizedText: String,
      runtimeMessages: { PRESCRIPTION_OPTIONS_REQUEST: 'options' },
      openPrescriptionCenter: noop, openHospitalizedDocuments: noop, openOperationsCenter: noop,
      helper: { formatDateTimeLabel: () => '', formatDateLabel: () => '' },
      setLiveRegion: noop, attachPatientListFilter: noop,
      sendMessage: async message => message.type === 'options' ? {
        groups: Array.from({ length: 24 }, (_, index) => ({
          key: String(index), professional: 'Profesional de prueba ' + (index + 1), count: 1,
        })),
      } : {
        patients: Array.from({ length: 24 }, (_, index) => ({
          encounterId: String(index + 1), name: 'Paciente de prueba ' + (index + 1), medicationCount: 1,
        })),
      },
    };
    const shell = globalThis.HhrCenterShellRuntime.create(dependencies);
    globalThis.HhrPrescriptionCenterRuntime.create({
      ...dependencies, prepareCenterModalRoot: shell.prepareCenterModalRoot,
    }).open('141121');
  });
  const root = page.locator('#hhr-prescription-print-modal');
  for (const scope of ['current', 'hospitalized']) {
    await root.locator(`[data-tab="${scope}"]`).click();
    const formats = root.getByRole('radiogroup', { name: 'Formato de impresión' });
    await formats.waitFor();
    assert.equal(await formats.getByRole('radio').count(), 2);
    await formats.getByRole('radio', { name: /Compacta/ }).check();
    await page.waitForFunction(() => {
      const label = document.querySelector('.hhr-rx-format-option:has(input[value="compact"]:checked)');
      return label && getComputedStyle(label).backgroundColor !== 'rgb(255, 255, 255)';
    });
    const initial = await formats.boundingBox();
    await root.locator('.hhr-center-content').evaluate(node => { node.scrollTop = node.scrollHeight; });
    const afterScroll = await formats.boundingBox();
    assert.ok(Math.abs(initial.y - afterScroll.y) < 2, 'Print formats must stay above the scrolling recipe list');
    if (scope === 'current') await screenshot(page, 'recetas');
  }
  await root.locator('.hhr-rx-close').click();
};
