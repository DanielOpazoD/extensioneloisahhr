import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { verifyEditShortcut } from './smoke-worklist-editor.mjs';
import { verifyWorklistOverlays } from './smoke-worklist-overlays.mjs';

const routes = [
  { pathname: '/dashboard/encounter-list', module: 25587, other: 'Otra tabla', sections: [
    ['Pacientes sin médico', 'no asignados', 'encounterList', 'encounterApiTag', 'encounters-unassiged-list', 14],
    ['Mis pacientes', 'pacientes asignados', 'encounterList', 'encounterApiTag', 'encounters-my-assignees', 16],
    ['Mis pacientes de interconsulta', 'Interconsulta', 'encounterList', 'claims', {}, 11],
    ['Pacientes egresados de alta', 'pacientes con alta', 'encounterList', 'session', {}, 12],
  ] },
  { pathname: '/dashboard/encounter-list-nurse', module: 61188, other: 'Otra tabla', sections: [
    ['Ingresos', 'ingresos', 'incomeEncounterList', 'localClaims', {}, 11],
    ['Pacientes egresados', 'alta', 'recoveredEncounterList', 'tagName', 'nurse-encounters-recovered-list', 12],
    ['Pacientes con novedad', 'con novedad', 'noveltyEncounterList', 'tagName', 'noveltyEncounterListData', 24],
    ['Pacientes sin novedad', 'sin novedad', 'uneventfulEncounterList', 'tagName', 'nurse-encounters-uneventful-list', 13],
  ] },
];

// Mirrors the verified Eloísa contract: filter the input, slice ten, use the
// filtered count (independent of slice) for the heading and the MUI footer.
function startFixture(route) {
  const nativeJsx = (type, props, key) => typeof type === 'function' ? type(props) : ({ type, props, key });
  function renderElement(node, svg = false) {
    if (node == null || typeof node === 'boolean') return document.createTextNode('');
    if (typeof node !== 'object') return document.createTextNode(String(node));
    const { type, props } = node;
    const el = svg || type === 'svg' ? document.createElementNS('http://www.w3.org/2000/svg', type) : document.createElement(type);
    for (const [name, value] of Object.entries(props)) {
      if (name === 'children' || value == null || value === false) continue;
      el.setAttribute(name === 'className' ? 'class' : name, value);
    }
    for (const child of [props.children ?? []].flat()) el.append(renderElement(child, svg || type === 'svg'));
    return el;
  }
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
      const referral = label === 'Interconsulta';
      const discharge = label === 'pacientes con alta';
      jsx(props => {
        const list = referral ? props[key][0].patientList : props[key];
        const matches = list.filter(row => !filter || row.id % 2 === 1);
        const visible = matches.slice((page - 1) * 10, page * 10);
        document.querySelector('.heading').textContent = (referral ? 'Mis pacientes de interconsulta en Medicina' : 'Resultados de búsqueda ' + label) + ' (' + matches.length + ')';
        const body = document.querySelector('#worklist tbody');
        body.replaceChildren();
        const columns = [
          ['location', 'Ubicación'], ['patient', 'Paciente'], ...(referral ? [] : [['ges', 'GES']]),
          ['diagnosisAdmission', 'Diagnóstico'],
          ...(label === 'con novedad' ? [['lastNovelty', 'Última novedad']] : []),
          ...(discharge || referral ? [[discharge ? 'medicalDischargeDatetime' : 'referralReason', 'Detalle']] : []),
          ['assignment', 'Médico tratante'], ['actions', 'Acciones'],
        ].map(([id, label]) => ({ id, label }));
        const tr = (id) => {
          const encId = 2000 + id;
          const href = route.pathname + '/' + encId + (referral ? '/?referralGuid=demo' : '');
          const patient = nativeJsx(discharge ? 'span' : 'a', { ...(discharge ? {} : {href}), children: [
            nativeJsx('strong', {className:'MuiTypography-root', children:'Paciente sintético ' + id}),
            ...['Datos de prueba', 'Identificador ' + id].map(text => nativeJsx('span', {className:'MuiTypography-root',children:text})),
          ], className:'MuiStack-root' });
          const nativeAction = nativeJsx('button', { ...(discharge ? {encId,patId:3000+id} : {}), children: 'Abrir ficha' });
          const location = ['AMQI', nativeJsx('br', {}), 'H1', nativeJsx('br', {}), 'H1C2'];
          const cells = [location, patient, ...(referral ? [] : ['No GES']), 'Diagnóstico (lateral) (Ingreso) (principal) (solicitud hospitalización)',
            ...(label === 'con novedad' ? ['Hace 1 hora por Profesional de prueba'] : []),
            ...(discharge || referral ? ['Detalle'] : []),
            nativeJsx('select', {'aria-label':'Asignación', children:['Sin asignación','Profesional de prueba'].map(text => nativeJsx('option',{children:text}))}),
            nativeAction].map(child => nativeJsx('td', {children:child}));
          return nativeJsx('tr', {children:cells}, id);
        };
        jsx(tableProps => {
          document.querySelector('#worklist thead tr').replaceChildren(...tableProps.columns.map(c => renderElement(nativeJsx('th',{children:c.label}))));
          body.replaceChildren(...tableProps.children.map(row => renderElement(row)));
        }, { columns, listLenght: matches.length, children: visible.map(row => tr(row.id)) });
        for (const [index, row] of [...body.rows].entries()) {
          const {id} = visible[index];
          if (route.pathname.endsWith('-nurse')) {
            const family = document.createElement('button');
            family.id = 'fade-button';
            family.setAttribute('aria-haspopup', 'true');
            family.innerHTML = '<svg><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-7 9h-2V5h2zm0 4h-2v-2h2z"/></svg>';
            row.lastElementChild.append(family);
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
          row.lastElementChild.querySelector('button').onclick = () => { document.querySelector('output').value = String(id); };
        }
      }, { [tag]: value, [key]: referral ? [{patientList:rows}] : rows });
    };
  };
  const renderList = require(route.module);
  const other = [route.other, 'otra lista', 'otherList', 'tagName', 'other', 24];
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
    main { margin:16px; display:flex; flex-direction:column; gap:32px; }
    #filters { height:70px; padding-block:16px; box-sizing:border-box; }
    .heading { margin:0; padding-block:16px; }
    .MuiTableContainer-root { overflow:auto; max-height:400px; }
    table { border-collapse:collapse; width:100%; min-width:550px; text-align:left; }
    td,th { padding:13px 16px; border-bottom:1px solid #ddd; }
    .MuiStack-root { display:flex; flex-direction:column; }
    .MuiStack-root > * + * { margin-top:3px; }
  </style></head><body><main class="MuiBox-root"><div role="tablist">
    ${[route.other, ...route.sections.map(s => s[0])].map((tab, i) => `<button role="tab" aria-selected="${i === 0}" aria-controls="worklist">${tab}</button>`).join('')}
  </div><div class="MuiPaper-root" id="filters"><label><input type="checkbox">Filtrar estación</label>
  <input id="search-encounter-list" aria-label="Buscar paciente"><output></output></div>
  <div id="worklist" role="tabpanel"><p class="heading"></p><div><div class="MuiTableContainer-root"><table>
  <thead><tr><th>Ubicación</th><th>Paciente</th><th>Diagnóstico de ingreso</th><th>Médico tratante</th><th>Acciones</th></tr></thead>
  <tbody></tbody><tfoot><tr><td colspan="5"><nav class="MuiPagination-root"><button data-next>Página 2</button></nav></td></tr></tfoot>
  </table></div></div></div></main><script>(${startFixture.toString()})(${JSON.stringify(route)});</script></body></html>`;
};

export const verifyNativeWorklists = async (context, origin, worker) => {
  await worker.evaluate(async () => {
    self.HhrExtensionRuntime.ensurePdf();
    const pdf = await self.PDFLib.PDFDocument.create();
    pdf.addPage();
    const bytes = await pdf.save();
    self.__worklistOriginalFetch = self.fetch;
    self.__worklistReports = [];
    self.fetch = async (input, init) => {
      const url = new URL(input);
      if (url.origin !== 'https://fichamedicoback.rayensalud.cl') return self.__worklistOriginalFetch(input, init);
      if (url.pathname.endsWith('/claim/getAllInApp')) return Response.json([{claim:'Acceso_Ficha_Clinica', moduleId:6}]);
      const patient = url.pathname.match(/\/patientHeaderData\/(\d+)\/false$/);
      if (patient) return Response.json({patID: Number(patient[1]) + 1000});
      if (url.pathname.startsWith('/api/report/')) {
        self.__worklistReports.push([url.pathname.split('/').pop(), url.searchParams.get('enc_id'), url.searchParams.get('pat_id')]);
        return new Response(bytes, {headers:{'Content-Type':'application/pdf'}});
      }
      return new Response('', {status:404});
    };
  });
  try {
    await verifyLists(context, origin, worker);
  } finally {
    await worker.evaluate(() => { self.fetch = self.__worklistOriginalFetch; delete self.__worklistOriginalFetch; });
  }
};

async function printAndCheck(context, worker, button, filename, encId) {
  const [printed] = await Promise.all([context.waitForEvent('page', {timeout: 15000}), button.click()]);
  try {
    assert.deepEqual(await worker.evaluate(() => self.__worklistReports.at(-1)), [filename, String(encId), String(encId + 1000)]);
  } finally { await printed.close(); }
}

async function verifyWorklistWidth(page) {
  for (const width of [1800, 390, 1100]) {
    await page.setViewportSize({ width, height: 450 });
    const bounds = await page.evaluate(() => {
      const rect = selector => {
        const { left, right, width } = document.querySelector(selector).getBoundingClientRect();
        return { left, right, width };
      };
      return { main: rect('main'), filters: rect('#filters'), panel: rect('#worklist'), table: rect('#worklist table') };
    });
    const left = bounds.panel.left - bounds.main.left;
    const right = bounds.main.right - bounds.panel.right;
    assert.ok(Math.abs(left - right) < 1, 'The worklist must stay centered');
    assert.deepEqual(bounds.filters, bounds.panel);
    if (width === 390) {
      const scrollable = await page.locator('.MuiTableContainer-root').evaluate(el => el.scrollWidth > el.clientWidth);
      assert.ok(scrollable, 'Small screens retain native horizontal scrolling');
    } else {
      assert.deepEqual(bounds.table, bounds.panel);
    }
    if (width === 1800) {
      assert.ok(left >= 70 && left <= 125, 'Wide worklists need moderate side margins');
      const doctor = page.locator('td[data-hhr-worklist-doctor]').first();
      assert.ok((await doctor.getByRole('combobox').boundingBox()).width <= 137, 'Compact assignment selector');
    }
    else assert.ok(Math.abs(left) < 1, 'Narrow worklists need all the available width');
  }
}

const verifyLists = async (context, origin, worker) => {
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
        await verifyWorklistWidth(page);
        const first = rows.first();
        assert.equal(await first.locator('td').first().innerText(), 'AMQI\nH1C2');
        assert.equal(await first.getByText('Diagnóstico (lateral)', {exact:true}).count(), 1);
        await first.hover();
        assert.equal(await first.locator('td').last().evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(231, 244, 241)');
        assert.equal(await first.locator('[data-hhr-edit-episode]').count(), route.pathname.endsWith('-nurse') ? 1 : 0);
        if (name === 'Pacientes sin novedad') await verifyEditShortcut(context, page, rows.nth(2), worker);
        const referral = name === 'Mis pacientes de interconsulta';
        assert.equal(await page.locator('.heading').isVisible(), referral);
        const spacing = await page.evaluate(() => {
          const filters = document.getElementById('filters').getBoundingClientRect();
          const tabs = document.querySelector('[role="tablist"]').getBoundingClientRect();
          const panel = document.getElementById('worklist').getBoundingClientRect();
          return [filters.top - tabs.bottom, panel.top - filters.bottom, filters.height];
        });
        assert.deepEqual(spacing, [6, 6, 48]);
        if (route.pathname.endsWith('-nurse')) {
          const markers = rows.getByRole('img', { name: 'Con novedad' });
          assert.equal(await markers.count(), name === 'Pacientes con novedad' ? total : 0);
          if (name === 'Pacientes con novedad') {
            assert.equal((await markers.first().boundingBox()).height, 17);
            assert.equal(await markers.first().getAttribute('title'), 'Con novedad · Última publicación médica hace 1 h');
          }
          assert.equal(await rows.locator('button[id="fade-button"]').count(), total);
          assert.equal(await rows.locator('button[id="fade-button"]:visible').count(), 0);
        }
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
        assert.equal(await table.getByRole('columnheader', {name:'GES', exact:true}).count(), 0);
        assert.equal(await table.getByRole('columnheader', {name:'Imprimir', exact:true}).count(), 1);
        for (const kind of ['indications', 'prescription']) {
          const buttons = rows.locator('button[data-hhr-print-document="' + kind + '"]');
          assert.equal(await buttons.count(), total);
          assert.equal(await buttons.last().isEnabled(), true);
          assert.equal(await buttons.last().evaluate(b => b.closest('td').dataset.hhrWorklistEpisode), String(2000 + total));
        }
        await printAndCheck(context, worker, rows.last().getByRole('button', {name:'Imprimir indicaciones vigentes de hoy'}), 'Reporte_Indicaciones_Paciente.pdf', 2000 + total);
        const identities = await rows.locator('td:nth-child(2) strong').allTextContents();
        assert.deepEqual(identities, Array.from({ length: total }, (_, i) => 'Paciente sintético ' + (i + 1)));
        await rows.last().getByRole('combobox').selectOption('Profesional de prueba');
        await rows.last().getByRole('button', { name: 'Abrir ficha' }).click();
        assert.equal(await page.locator('output').textContent(), String(total));
        await page.getByRole('checkbox').check();
        assert.equal(await rows.count(), Math.ceil(total / 2));
        assert.equal(await rows.nth(1).locator('td:nth-child(2) strong').textContent(), 'Paciente sintético 3');
        await printAndCheck(context, worker, rows.nth(1).getByRole('button', {name:'Imprimir última receta completa'}), 'Reporte_Receta_Medica.pdf', 2003);
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
