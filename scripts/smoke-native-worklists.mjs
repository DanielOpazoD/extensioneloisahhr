import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const routes = [
  { pathname: '/dashboard/encounter-list', target: 'Pacientes sin médico', other: 'Mis pacientes' },
  { pathname: '/dashboard/encounter-list-nurse', target: 'Pacientes con novedad', other: 'Pacientes sin novedad' },
];

const row = (_, index) => `<tr>
  <th scope="row"><div class="MuiTypography-root">Servicio de prueba</div><div class="MuiTypography-root">Cama ${index + 1}</div></th>
  <td><div class="MuiStack-root">
    <strong class="MuiTypography-root">Paciente sintético ${index + 1}</strong>
    <span class="MuiTypography-root">Datos de prueba</span>
    <span class="MuiTypography-root">Identificador sintético ${index + 1}</span>
  </div></td>
  <td class="MuiTypography-root">Diagnóstico simulado</td>
  <td><select aria-label="Asignación"><option>Sin asignación</option><option>Profesional de prueba</option></select></td>
  <td><button type="button" data-native-action>Abrir ficha</button></td>
</tr>`;
const table = () => `<table><thead><tr>
  <th>Ubicación</th><th>Paciente</th><th>Diagnóstico de ingreso</th><th>Médico tratante</th><th>Acciones</th>
</tr></thead><tbody>${Array.from({ length: 6 }, row).join('')}</tbody></table>`;

export const nativeWorklistFixture = pathname => {
  const route = routes.find(entry => entry.pathname === pathname);
  if (!route) return null;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <style>
    body { font:14px/1.5 system-ui,sans-serif; }
    main { margin:16px; }
    [role="tablist"] { margin-bottom:18px; }
    .results { overflow-x:auto; }
    table { border-collapse:collapse; width:100%; min-width:550px; text-align:left; }
    td,th { padding:13px 16px; border-bottom:1px solid #ddd; }
    .MuiStack-root { display:flex; flex-direction:column; }
    .MuiStack-root > * + * { margin-top:3px; }
  </style></head><body><main>
  <div role="tablist">
    <button type="button" role="tab" data-other aria-selected="true" aria-controls="worklist"> ${route.other} </button>
    <button type="button" role="tab" data-target aria-selected="false" aria-controls="worklist"> ${route.target} (6) </button>
  </div>
  <div class="results" id="worklist" role="tabpanel">${table()}
  <button type="button" data-next-page>Página 2</button></div>
  <div hidden>${table()}</div>
  </main><script>
    const tabs = document.querySelectorAll('[role=tab]');
    tabs.forEach(tab => tab.addEventListener('click', () => tabs.forEach(other => other.setAttribute('aria-selected', String(other === tab)))));
    document.querySelector('main').addEventListener('click', event => {
      if (event.target.matches('[data-next-page]')) event.target.dataset.used = 'true';
      if (event.target.matches('[data-native-action]')) event.target.dataset.used = 'true';
    });
  </script></body></html>`;
};

export const verifyNativeWorklists = async (context, origin) => {
  for (const route of routes) {
    const page = await context.newPage();
    try {
      await page.setViewportSize({ width: 1100, height: 450 });
      await page.goto(origin + route.pathname);
      await page.waitForFunction(() => document.documentElement.dataset.hhrPrescriptionPrintState === 'operations-ready');
      const visibleTable = page.locator('#worklist table');
      const layout = () => visibleTable.evaluate(table => {
        const rows = [...table.tBodies[0].rows].map(row => row.getBoundingClientRect());
        return { height: table.getBoundingClientRect().height, visibleRows: rows.filter(row => row.top >= 0 && row.bottom <= innerHeight).length };
      });
      const normal = await layout();
      await page.getByRole('tab', { name: route.target + ' (6)', exact: true }).click();
      await visibleTable.and(page.locator('[data-hhr-compact-worklist]')).waitFor();
      const compact = await layout();
      assert.ok(compact.height < normal.height * .8, `Insufficient density in ${route.pathname}: ${JSON.stringify({normal,compact})}`);
      assert.ok(compact.visibleRows > normal.visibleRows, `No additional visible rows in ${route.pathname}`);
      assert.equal(await page.locator('[data-hhr-compact-worklist]').count(), 1);
      assert.equal(await visibleTable.locator('tbody tr').count(), 6);
      assert.equal(await visibleTable.getByText('Identificador sintético 6', { exact: true }).count(), 1);
      assert.equal(await page.getByRole('button', { name: 'Copiar para HHR' }).count(), 0);
      if (process.env.HHR_VISUAL_ARTIFACT_DIR) {
        await mkdir(process.env.HHR_VISUAL_ARTIFACT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.HHR_VISUAL_ARTIFACT_DIR, route.pathname.split('/').at(-1) + '.png') });
      }
      const assignment = visibleTable.getByRole('combobox').first();
      await assignment.selectOption('Profesional de prueba');
      assert.equal(await assignment.inputValue(), 'Profesional de prueba');
      const open = visibleTable.getByRole('button', { name: 'Abrir ficha' }).first();
      await open.click();
      assert.equal(await open.getAttribute('data-used'), 'true');
      const nextPage = page.getByRole('button', { name: 'Página 2' });
      await nextPage.click();
      assert.equal(await nextPage.getAttribute('data-used'), 'true');

      const oldButton = page.locator('[data-hhr-patient-code-action="1"]');
      await visibleTable.locator('tbody td:last-child').first().evaluate(cell => {
        const stale = document.createElement('button');
        stale.dataset.hhrPatientCodeAction = '1';
        stale.textContent = 'Copiar para HHR';
        cell.append(stale);
      });
      assert.equal(await oldButton.isVisible(), false, 'An old page must not show the retired button');
      await page.getByRole('tab', { name: route.other, exact: true }).click();
      await page.locator('[data-hhr-compact-worklist]').waitFor({ state: 'detached' });
      assert.equal((await layout()).height, normal.height);
      await page.getByRole('tab', { name: route.target + ' (6)', exact: true }).click();
      await visibleTable.and(page.locator('[data-hhr-compact-worklist]')).waitFor();
      // A native re-render during filtering or pagination replaces the table.
      await visibleTable.evaluate(table => {
        const replacement = table.cloneNode(true);
        replacement.removeAttribute('data-hhr-compact-worklist');
        table.replaceWith(replacement);
      });
      await visibleTable.and(page.locator('[data-hhr-compact-worklist]')).waitFor();
      await page.evaluate(() => history.pushState({}, '', location.pathname + '/141121'));
      await page.locator('[data-hhr-compact-worklist]').waitFor({ state: 'detached' });
      console.log(`[worklist] ${route.pathname}: ${normal.visibleRows} → ${compact.visibleRows} complete rows at 1100×450, table ${Math.round(normal.height)} → ${Math.round(compact.height)} px`);
    } finally {
      await page.close();
    }
  }
};
