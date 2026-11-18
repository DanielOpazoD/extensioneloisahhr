import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { verifyWorklistOverlays } from './smoke-worklist-overlays.mjs';

const routes = [
  { pathname: '/dashboard/encounter-list', module: 25587, other: 'Mis pacientes', sections: [
    ['Pacientes sin médico', 'no asignados', 'encounterList', 'encounterApiTag', 'encounters-unassiged-list', 14],
  ] },
  { pathname: '/dashboard/encounter-list-nurse', module: 61188, other: 'Ingresos', sections: [
    ['Pacientes con novedad', 'con novedad', 'noveltyEncounterList', 'tagName', 'noveltyEncounterListData', 24],
    ['Pacientes sin novedad', 'sin novedad', 'uneventfulEncounterList', 'tagName', 'nurse-encounters-uneventful-list', 13],
  ] },
];

// Mirrors the verified Eloísa contract: filter the input, slice ten, use the
// filtered count (independent of slice) for the heading and the MUI footer.
function startFixture(route) {
  const nativeJsx = (component, props) => component(props);
  const modules = {};
  function require(id) {
    if (id === 95155) return { jsx: nativeJsx };
    const module = { exports: {} };
    modules[id](module, module.exports, require);
    return module.exports;
  }
  require.m = modules;
  const queue = self.webpackChunk_N_E ||= [];
  const register = ([, factories, run]) => {
    Object.assign(modules, factories);
    run?.(require);
  };
  queue.forEach(register);
  queue.push = register;

  modules[route.module] = (module, exports, localRequire) => {
    const { jsx } = localRequire(95155);
    module.exports = (section, page, filter) => {
      const [, label, key, tag, value, count] = section;
      const rows = Array.from({ length: count }, (_, i) => ({ id: i + 1 }));
      jsx(props => {
        const matches = props[key].filter(row => !filter || row.id % 2 === 1);
        const visible = matches.slice((page - 1) * 10, page * 10);
        document.querySelector('.heading').textContent = 'Resultados de búsqueda ' + label + ' (' + matches.length + ')';
        const body = document.querySelector('#worklist tbody');
        body.replaceChildren();
        for (const { id } of visible) {
          const row = body.insertRow();
          row.innerHTML = '<th scope="row">Servicio<br>Cama ' + id + '</th><td><div class="MuiStack-root"><strong class="MuiTypography-root">Paciente sintético ' + id + '</strong><span class="MuiTypography-root">Datos de prueba</span><span class="MuiTypography-root">Identificador ' + id + '</span></div></td><td>Diagnóstico simulado</td><td><select aria-label="Asignación"><option>Sin asignación</option><option>Profesional de prueba</option></select></td><td><button>Abrir ficha</button></td>';
          if (route.pathname.endsWith('-nurse')) {
            const crd = document.createElement('button');
            crd.textContent = 'CRD';
            row.lastElementChild.append(crd);
            crd.onclick = () => {
              const main = document.querySelector('main');
              const dialog = document.createElement('div');
              dialog.setAttribute('role', 'dialog');
              dialog.setAttribute('aria-modal', 'true');
              dialog.setAttribute('aria-label', 'CUDYR');
              const close = document.createElement('button');
              close.textContent = 'Cerrar';
              dialog.append(close);
              document.body.append(dialog);
              close.focus();
              main.setAttribute('aria-hidden', 'true');
              close.onclick = () => {
                dialog.remove();
                main.removeAttribute('aria-hidden');
                crd.focus();
              };
            };
          }
          row.querySelector('button').onclick = () => { document.querySelector('output').value = String(id); };
        }
      }, { [tag]: value, [key]: rows });
    };
  };
  const renderList = require(route.module);
  const other = [route.other, 'ingresos', 'otherList', 'tagName', 'other', 24];
  const tabs = [...document.querySelectorAll('[role=tab]')];
  let current = other;
  let page = 1;
  const render = () => renderList(current, page, document.querySelector('input').checked);
  tabs.forEach((tab, index) => {
    tab.onclick = () => {
      current = index ? route.sections[index - 1] : other;
      page = 1;
      tabs.forEach(t => t.setAttribute('aria-selected', String(t === tab)));
      render();
    };
  });
  document.querySelector('input').onchange = render;
  document.querySelector('[data-next]').onclick = () => { page = 2; render(); };
  render();
}

export const nativeWorklistFixture = pathname => {
  const route = routes.find(entry => entry.pathname === pathname);
  if (!route) return null;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    body { font:14px/1.5 system-ui,sans-serif; }
    main { margin:16px; }
    .MuiTableContainer-root { overflow:auto; max-height:400px; }
    table { border-collapse:collapse; width:100%; min-width:550px; text-align:left; }
    td,th { padding:13px 16px; border-bottom:1px solid #ddd; }
    .MuiStack-root { display:flex; flex-direction:column; }
    .MuiStack-root > * + * { margin-top:3px; }
  </style></head><body><main><div role="tablist">
    ${[route.other, ...route.sections.map(s => s[0])].map((tab, i) => `<button role="tab" aria-selected="${i === 0}" aria-controls="worklist">${tab}</button>`).join('')}
  </div><label><input type="checkbox">Filtrar estación</label><output></output>
  <div id="worklist" role="tabpanel"><p class="heading"></p><div><div class="MuiTableContainer-root"><table>
  <thead><tr><th>Ubicación</th><th>Paciente</th><th>Diagnóstico de ingreso</th><th>Médico tratante</th><th>Acciones</th></tr></thead>
  <tbody></tbody><tfoot><tr><td colspan="5"><nav class="MuiPagination-root"><button data-next>Página 2</button></nav></td></tr></tfoot>
  </table></div></div></div></main><script>(${startFixture.toString()})(${JSON.stringify(route)});</script></body></html>`;
};

export const verifyNativeWorklists = async (context, origin) => {
  for (const route of routes) {
    const page = await context.newPage();
    try {
      await page.setViewportSize({ width: 1100, height: 450 });
      await page.goto(origin + route.pathname);
      await page.waitForFunction(() => document.documentElement.dataset.hhrPrescriptionPrintState === 'operations-ready');
      const table = page.locator('#worklist table');
      const rows = table.locator('tbody tr');
      const pager = page.locator('[data-next]');
      const nativeHeight = await rows.first().evaluate(tr => tr.offsetHeight);
      assert.equal(await rows.count(), 10);
      await pager.click();
      assert.match(await rows.first().innerText(), /Paciente sintético 11\b/);

      for (const [name, , , , , total] of route.sections) {
        await page.getByRole('tab', { name, exact: true }).click();
        await page.locator('table[data-hhr-complete-worklist]').waitFor();
        assert.equal(await rows.count(), total);
        assert.equal(await pager.isVisible(), false);
        assert.equal(await table.evaluate(t => getComputedStyle(t.parentElement).maxHeight), 'none');
        assert.ok(await rows.first().evaluate(tr => tr.offsetHeight) < nativeHeight * .8);
        if (route.pathname.endsWith('-nurse')) {
          const heights = () => rows.evaluateAll(elements => elements.map(row => row.offsetHeight));
          const before = await heights();
          const dialog = page.getByRole('dialog', { name: 'CUDYR' });
          // Wait for the extension's DOM refresh after each portal transition.
          const ready = page.locator('html[data-hhr-prescription-print-state="operations-ready"]');
          await ready.evaluate(root => root.removeAttribute('data-hhr-prescription-print-state'));
          await rows.first().getByRole('button', { name: 'CRD' }).click();
          await dialog.waitFor();
          await ready.waitFor();
          assert.deepEqual(await heights(), before, 'Opening CUDYR changed the background row heights');
          assert.equal(await table.evaluate(t => t.closest('main').getAttribute('aria-hidden')), 'true');
          assert.equal(await pager.isVisible(), false);
          await ready.evaluate(root => root.removeAttribute('data-hhr-prescription-print-state'));
          await dialog.getByRole('button', { name: 'Cerrar' }).click();
          await dialog.waitFor({ state: 'detached' });
          await ready.waitFor();
          assert.deepEqual(await heights(), before, 'Closing CUDYR changed the background row heights');
          console.log(`[CUDYR] ${name}: ${total} rows remain ${before[0]} px before, during and after the dialog`);
        }
        await verifyWorklistOverlays(page, total);
        const identities = await rows.locator('strong').allTextContents();
        assert.deepEqual(identities, Array.from({ length: total }, (_, i) => 'Paciente sintético ' + (i + 1)));
        await rows.last().getByRole('combobox').selectOption('Profesional de prueba');
        await rows.last().getByRole('button', { name: 'Abrir ficha' }).click();
        assert.equal(await page.locator('output').textContent(), String(total));
        await page.getByRole('checkbox').check();
        assert.equal(await rows.count(), Math.ceil(total / 2));
        assert.equal(await rows.nth(1).locator('strong').textContent(), 'Paciente sintético 3');
        await page.getByRole('checkbox').uncheck();
        await rows.last().evaluate(tr => tr.remove());
        await pager.waitFor({ state: 'visible' }); // partial source: native pages remain reachable
        await page.getByRole('checkbox').check();
        await page.getByRole('checkbox').uncheck();
        await page.locator('table[data-hhr-complete-worklist]').waitFor();
        const stale = await rows.first().locator('td').last().evaluate(cell => {
          const button = document.createElement('button');
          button.dataset.hhrPatientCodeAction = '1';
          cell.append(button);
          return getComputedStyle(button).display;
        });
        assert.equal(stale, 'none');
        if (process.env.HHR_VISUAL_ARTIFACT_DIR) {
          await mkdir(process.env.HHR_VISUAL_ARTIFACT_DIR, { recursive: true });
          await page.screenshot({ path: path.join(process.env.HHR_VISUAL_ARTIFACT_DIR, name + '.png') });
        }
        console.log(`[worklist] ${name}: ${total}/${total} compact rows, final action and station filter verified`);
      }
      await page.getByRole('tab', { name: route.other }).click();
      await page.locator('[data-hhr-compact-worklist]').waitFor({ state: 'detached' });
      assert.equal(await rows.count(), 10);
      assert.equal(await pager.isVisible(), true);
      assert.equal(await rows.first().evaluate(tr => tr.offsetHeight), nativeHeight);
      await page.getByRole('tab', { name: route.sections[0][0] }).click();
      await page.locator('[data-hhr-complete-worklist]').waitFor();
      await page.evaluate(() => history.pushState({}, '', location.pathname + '/141121'));
      await page.locator('[data-hhr-compact-worklist]').waitFor({ state: 'detached' });
    } finally { await page.close(); }
  }
};
