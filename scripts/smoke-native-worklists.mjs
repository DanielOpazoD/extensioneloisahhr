import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { verifyEditShortcut } from './smoke-worklist-editor.mjs';
import { verifyWorklistOverlays } from './smoke-worklist-overlays.mjs';
import { nativeFichaFixture } from './smoke-native-ficha.mjs';

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
      const hasMedicalLink = !route.pathname.endsWith('-nurse') && !discharge;
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
          const nursing = route.pathname.endsWith('-nurse');
          const nameParts = [
            nativeJsx('span', {administrativeSexId:1, 'aria-hidden':true, children:'♂'}),
            nativeJsx('strong', {className:'MuiTypography-root', fontWeight:'bold', children:'Paciente sintético ' + id}),
          ];
          const identifier = [
            ['RUN', '00.000.001-k'], ['RUN', '000000020'], ['Número de Identificación', '000000030'],
            ['RUN Materno/progenitor(a)', '000000040'], ['Pasaporte', '00000005-K'],
          ][id - 1] ?? ['Identificador', String(id)];
          const details = [
            nativeJsx('span', {children: nursing ? 'Nombre social: Nombre alternativo' : ['Nombre social: ', 'Nombre alternativo']}),
            nativeJsx('span', {children:'Género: Femenina'}),
            nativeJsx('span', {title:identifier[1], children:nativeJsx('span', {
              children:nursing ? identifier.join(': ') : [identifier[0], ' ', ': ' + identifier[1]],
            })}),
          ];
          const link = nativeJsx(discharge ? 'span' : 'a', {
            ...(discharge ? {} : {href}),
            children: nursing ? nameParts : nativeJsx('span', {className:'fixture-name-line', children:nameParts}),
            className: nursing ? 'fixture-name-line' : '',
          });
          const patient = nativeJsx('div', {className:'MuiStack-root', children:[link, ...details]});
          const nativeAction = hasMedicalLink ? nativeJsx('a', { LinkComponent: 'a', href, children: '>' })
            : nativeJsx('button', { ...(discharge ? {encId,patId:3000+id} : {}), children: 'Abrir ficha' });
          const location = ['AMQI', nativeJsx('br', {}), 'H1', nativeJsx('br', {}), id > 8 ? 'H2C1' : 'H1C2'];
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
          const action = row.lastElementChild.querySelector('button');
          if (action) action.onclick = () => { document.querySelector('output').value = String(id); };
        }
      }, { [tag]: value, [key]: referral ? [{patientList:rows}] : rows });
    };
  };
  const renderList = require(route.module);
  const other = [route.other, 'otra lista', 'otherList', 'tagName', 'other', 24];
  const tabs = [...document.querySelectorAll('[role=tab]')];
  let current = other;
  let page = 1;
  const filter = document.getElementById('fixture-worklist-filter') || document.getElementById('select-nurse-station-list');
  const render = () => renderList(current, page, filter.value !== '');
  tabs.forEach((tab, index) => {
    tab.onclick = () => {
      current = index ? route.sections[index - 1] : other;
      page = 1;
      tabs.forEach(t => t.setAttribute('aria-selected', String(t === tab)));
      render();
    };
  });
  filter.onchange = render;
  document.querySelector('[data-next]').onclick = () => { page = 2; render(); };
  render();
}

export const nativeWorklistFixture = pathname => {
  const route = routes.find(entry => entry.pathname === pathname);
  if (!route) return null;
  const nursing = pathname.endsWith('-nurse');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    body { font:14px/1.5 system-ui,sans-serif; }
    header.MuiAppBar-root { height:56px; margin:-8px -8px 0; padding-inline:16px; display:flex; align-items:center; }
    main { margin:6px 16px 16px; display:flex; flex-direction:column; gap:32px; }
    #filters { height:70px; padding-block:16px; box-sizing:border-box; display:flex; align-items:center; }
    .fixture-search { display:flex; align-items:center; min-width:0; flex:1; }
    .fixture-search input, #filters select { width:100%; }
    .heading { margin:0; padding-block:16px; }
    .MuiTableContainer-root { overflow:auto; max-height:400px; }
    table { border-collapse:collapse; width:100%; min-width:550px; text-align:left; }
    td,th { padding:13px 16px; border-bottom:1px solid #ddd; }
    .fixture-name-line { display:flex; align-items:center; }
    .fixture-name-line > strong { margin-inline-start:8px; }
    .MuiStack-root { display:flex; flex-direction:column; }
    .MuiStack-root > * + * { margin-top:3px; }
  </style></head><body><header class="MuiAppBar-root">Eloísa</header><main class="MuiBox-root"><div role="tablist">
    ${[route.other, ...route.sections.map(s => s[0])].map((tab, i) => `<button role="tab" aria-selected="${i === 0}" aria-controls="worklist">${tab}</button>`).join('')}
  </div><div class="MuiPaper-root" id="filters">
  <label for="search-encounter-list">Nombre del Paciente / RUN</label>
  <div class="MuiInputBase-root fixture-search"><span aria-hidden="true">⌕</span><input id="search-encounter-list" aria-label="Buscar paciente"></div>
  <div class="MuiFormControl-root">
    <label id="select-label-hcp" for="${nursing ? 'select-nurse-station-list' : 'fixture-worklist-filter'}">${nursing ? 'Estaciones de enfermería' : 'Servicio'}</label>
    <div class="MuiInputBase-root"><select id="${nursing ? 'select-nurse-station-list' : 'fixture-worklist-filter'}" role="combobox"
      aria-labelledby="${nursing ? 'select-label-nurse-station select-nurse-station-list' : 'select-label-hcp'}">
      <option value="">Todos</option><option value="1">Sector de prueba</option>
    </select></div>
  </div>
  <button id="long-button" aria-label="more">⎙</button><output></output></div>
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
      if (url.hostname === 'api.open-meteo.com') {
        if (init?.credentials !== 'omit' || init?.referrerPolicy !== 'no-referrer' || url.searchParams.get('forecast_hours') !== '73') return new Response('', { status: 400 });
        const hour = 1795226400;
        const sequence = callback => Array.from({ length: 73 }, (_, i) => callback(i));
        return Response.json({
          current: { time: hour + 600, temperature_2m: 20, weather_code: 1, wind_speed_10m: 30, is_day: 0 },
          hourly: { time: sequence(i => hour + i * 3600), temperature_2m: sequence(() => 20),
            precipitation_probability: sequence(() => 25), wind_gusts_10m: sequence(() => 39) },
        });
      }
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
        const { left, right, width, top, bottom } = document.querySelector(selector).getBoundingClientRect();
        return { left, right, width, top, bottom };
      };
      return { main: rect('main'), filters: rect('#filters'), tabs: rect('[role=tablist]'),
        panel: rect('#worklist'), table: rect('#worklist table'),
        search: rect('#search-encounter-list'), station: rect('#filters select'), print: rect('#long-button') };
    });
    const left = bounds.panel.left - bounds.main.left;
    const right = bounds.main.right - bounds.panel.right;
    assert.ok(Math.abs(left - right) < 1, 'The worklist must stay centered');
    assert.ok(bounds.filters.top < bounds.panel.top && bounds.filters.right <= bounds.main.right + 1);
    assert.ok(bounds.search.width >= 44 && bounds.search.right <= bounds.station.left + 1 && bounds.station.right <= bounds.print.left + 1,
      `Filter controls overlap at ${width}px: ${JSON.stringify(bounds)}`);
    if (width === 390) {
      assert.ok(bounds.filters.top >= bounds.tabs.bottom);
      const scrollable = await page.locator('.MuiTableContainer-root').evaluate(el => el.scrollWidth > el.clientWidth);
      assert.ok(scrollable, 'Small screens retain native horizontal scrolling');
    } else {
      assert.equal(bounds.table.width, bounds.panel.width);
    }
    if (width === 1800) {
      assert.ok(bounds.filters.left >= bounds.tabs.right && bounds.filters.top < bounds.tabs.bottom);
      assert.ok(left >= 70 && left <= 125, 'Wide worklists need moderate side margins');
      const doctor = page.locator('td[data-hhr-worklist-doctor]').first();
      assert.ok((await doctor.getByRole('combobox').boundingBox()).width <= 137, 'Compact assignment selector');
    }
    else assert.ok(Math.abs(left) < 1, 'Narrow worklists need all the available width');
  }
}

const verifyLists = async (context, origin, worker) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  for (const route of routes) {
    const page = await context.newPage();
    try {
      await page.setViewportSize({ width: 1100, height: 450 });
      await page.goto(origin + route.pathname);
      await page.waitForFunction(() => document.documentElement.dataset.hhrPrescriptionPrintState === 'operations-ready');
      if (!route.pathname.endsWith('-nurse')) {
        await page.evaluate(() => {
          const drawer = document.createElement('nav');
          drawer.className = 'MuiDrawer-paper MuiDrawer-paperAnchorLeft';
          drawer.id = 'fixture-drawer-tools';
          drawer.tabIndex = -1;
          drawer.style.cssText = 'position:fixed; inset:0 auto 0 0; z-index:1300; width:216px; background:white;';
          const demoLogo = '<svg xmlns="http://www.w3.org/2000/svg" width="135" height="42"><text x="4" y="27" fill="#19695f" font-family="sans-serif" font-size="21">Eloísa demo</text></svg>';
          drawer.innerHTML = '<header><img alt="Rayen Eloísa" width="135" height="42" src="data:image/svg+xml,' + encodeURIComponent(demoLogo) + '"></header>' +
            '<button type="button">Lista de trabajo médico</button>' +
            '<p>20-11-2026, 21:35:27</p><p>Versión: 26.4.7</p>';
          document.body.append(drawer);
          const keepFocus = event => { if (!drawer.contains(event.target)) drawer.focus(); };
          document.addEventListener('focusin', keepFocus);
          drawer.releaseFocus = () => document.removeEventListener('focusin', keepFocus);
        });
        const drawer = page.locator('#fixture-drawer-tools');
        await drawer.locator('time').waitFor();
        assert.match(await drawer.locator('time').textContent(), /\d{2}[-/]\d{2}[-/]\d{4}.*\d{2}:\d{2}/);
        assert.equal(await drawer.getByText('Versión: 26.4.7', { exact: true }).isVisible(), false);
        assert.equal(await drawer.getByRole('button', { name: 'Información de versiones' }).count(), 0);
        await drawer.getByText('48–72 h', { exact: true }).waitFor();
        assert.equal(await drawer.getByText('Lluvia 25%', { exact: true }).count(), 3);
        const cloud = drawer.locator('[data-night] .hhr-sky-cloud');
        assert.equal(await cloud.evaluate(node => getComputedStyle(node).animationName), 'hhr-sky-drift');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await cloud.evaluate(node => getComputedStyle(node).animationName), 'none');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        const logo = drawer.locator('img[data-hhr-drawer-logo]');
        assert.ok((await logo.boundingBox()).width >= 100);
        assert.ok(await drawer.locator('[data-hhr-drawer-brand]').evaluate(node => {
          const mascot = getComputedStyle(node, '::after');
          return parseFloat(mascot.height) >= 40 && mascot.backgroundImage.startsWith('url("data:image/png;base64,');
        }));
        const source = drawer.getByRole('link', { name: 'Abrir Open-Meteo' });
        assert.equal(await source.getAttribute('href'), 'https://open-meteo.com/');
        assert.equal(await source.textContent(), '↗');
        assert.ok((await source.boundingBox()).width <= 24);
        const navigation = drawer.locator('[data-hhr-menu-icon="worklist"]');
        assert.equal(await navigation.evaluate(node => getComputedStyle(node, '::before').width), '16px');
        if (process.env.HHR_VISUAL_ARTIFACT_DIR) {
          await mkdir(process.env.HHR_VISUAL_ARTIFACT_DIR, { recursive: true });
          await drawer.screenshot({ path: path.join(process.env.HHR_VISUAL_ARTIFACT_DIR, 'Menú de Eloísa.png') });
        }
        assert.match(await drawer.getByRole('link', { name: 'Un día como hoy' }).getAttribute('href'), /#Nacimientos$/);
        const favorites = drawer.getByRole('button', { name: /Favoritos/ });
        await favorites.click();
        const dialog = drawer.getByRole('dialog', { name: 'Favoritos' });
        const url = dialog.getByRole('textbox', { name: 'URL del favorito' });
        await url.click();
        assert.equal(await url.evaluate(field => document.activeElement === field), true);
        await page.keyboard.type('favorito.example.org');
        assert.equal(await url.inputValue(), 'favorito.example.org');
        await dialog.getByRole('button', { name: 'Agregar', exact: true }).waitFor({ state: 'visible' });
        await page.waitForFunction(() => !document.querySelector('.hhr-fav-add')?.disabled);
        await url.press('Enter');
        await dialog.getByText('https://favorito.example.org/', { exact: true }).waitFor();
        await url.press('Escape');
        await dialog.waitFor({ state: 'detached' });
        await favorites.click();
        await dialog.getByText('https://favorito.example.org/', { exact: true }).waitFor();
        await dialog.getByRole('button', { name: /Eliminar favorito.example.org/ }).click();
        await dialog.getByText('https://favorito.example.org/', { exact: true }).waitFor({ state: 'detached' });
        await dialog.getByRole('button', { name: 'Cerrar', exact: true }).first().click();
        await drawer.evaluate(element => { element.releaseFocus(); element.remove(); });
      }
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
        if (name === route.sections[0][0]) {
          const strip = page.locator('[data-hhr-bed-index]');
          await strip.waitFor();
          assert.deepEqual(await strip.locator('button').allTextContents(), ['H1C2', 'H2C1']);
          await strip.getByRole('button', { name: 'Ir a cama H2C1 · AMQI' }).click();
          const focused = rows.locator('td .hhr-location-bed').filter({ hasText: 'H2C1' }).first();
          assert.equal(await focused.evaluate(node => node.closest('tr').hasAttribute('data-hhr-bed-target')), true);
          const sticky = await table.locator('thead th').first().boundingBox();
          assert.ok(sticky.y >= 0, 'Table headers stay visible after scrolling to a bed');
          await strip.locator('summary').click();
          assert.equal(await strip.locator('button').first().isVisible(), false);
          await strip.locator('summary').click();
        }
        const first = rows.first();
        assert.equal(await first.locator('td').first().innerText(), 'AMQI\nH1C2');
        assert.equal(await first.getByText('Diagnóstico (lateral)', {exact:true}).count(), 1);
        assert.equal(await rows.getByText(/^Género:/).count(), 0);
        assert.equal(await rows.nth(2).getByText('000000030', { exact: true }).count(), 1);
        assert.equal(await rows.nth(2).locator('[data-hhr-copy-run]').count(), 0);
        assert.equal(await rows.nth(3).locator('[data-hhr-copy-run]').count(), 0);
        const run = first.getByRole('button', { name: 'Copiar RUN 00000001-K' });
        assert.equal(await run.count(), 1, 'The displayed RUN must be a single copy button');
        assert.equal(await run.textContent(), '00000001-K');
        assert.equal(await run.evaluate(node => node.closest('a')), null);
        const nameBounds = await first.locator('td:nth-child(2) strong').boundingBox();
        const runBounds = await run.boundingBox();
        assert.ok(Math.abs(nameBounds.x - runBounds.x) <= 1 && runBounds.y >= nameBounds.y + nameBounds.height - 1,
          'RUN must start directly below the patient name');
        assert.equal(await rows.getByText(/^Nombre social:/).count(), 0);
        assert.equal(await table.getByRole('columnheader', { name:'Acciones' }).count(), 0);
        assert.equal(await rows.nth(4).getByText(/Pasaporte.*00000005-K/).count(), 1);
        assert.equal(await rows.nth(4).locator('[data-hhr-copy-run]').count(), 0);
        if (name === route.sections[0][0]) {
          const copy = route.pathname.endsWith('-nurse') ? rows.nth(1).getByRole('button', { name: 'Copiar RUN 00000002-0' }) : run;
          if (route.pathname.endsWith('-nurse')) await copy.click();
          else await copy.press('Enter');
          const expected = await copy.textContent();
          await page.waitForFunction(async value => (await navigator.clipboard.readText()) === value, expected);
          assert.equal(new URL(page.url()).pathname, route.pathname);
          assert.match(await page.locator('header.MuiAppBar-root').evaluate(header => getComputedStyle(header).backgroundImage), /linear-gradient/);
        }
        await first.hover();
        assert.equal(await first.locator('td').last().evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(231, 244, 241)');
        assert.equal(await first.locator('[data-hhr-edit-episode]').count(), route.pathname.endsWith('-nurse') ? 1 : 0);
        if (name === 'Pacientes sin novedad') await verifyEditShortcut(context, page, rows.nth(2), worker);
        const referral = name === 'Mis pacientes de interconsulta';
        assert.equal(await page.locator('.heading').isVisible(), referral);
        assert.equal(await page.getByRole('button', { name: 'Imprimir', exact: true }).count(), 1);
        if (route.pathname.endsWith('-nurse')) {
          const filter = page.locator('#filters').getByRole('combobox', { name: /Estaciones de enfermería/ });
          assert.equal(await filter.count(), 1);
          assert.equal(await page.locator('#select-label-hcp').evaluate(label => getComputedStyle(label).clipPath), 'inset(50%)');
          const markers = rows.getByRole('link', { name: 'Abrir última publicación médica en Historial' });
          assert.equal(await markers.count(), name === 'Pacientes con novedad' ? total : 0);
          if (name === 'Pacientes con novedad') {
            const marker = markers.first();
            assert.equal((await marker.boundingBox()).height, 17);
            await marker.hover();
            const tooltip = page.locator('#hhr-worklist-novelty-tooltip');
            await tooltip.waitFor();
            assert.equal(await tooltip.textContent(), 'Con novedad · Última publicación médica hace 1 h');
            const target = await marker.boundingBox();
            const bubble = await tooltip.boundingBox();
            assert.ok(Math.abs(Math.max(target.y - bubble.y - bubble.height, bubble.y - target.y - target.height) - 6) < 2);
            assert.ok(bubble.x < target.x + target.width && bubble.x + bubble.width > target.x);
            await marker.focus();
            await marker.press('Escape');
            await tooltip.waitFor({ state: 'detached' });
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
        const chartLinks = rows.locator('[data-hhr-rongorongo-link]');
        if (!route.pathname.endsWith('-nurse') && name !== 'Pacientes egresados de alta') {
          assert.equal(await chartLinks.count(), total);
          const chart = rows.last().getByRole('link', { name: 'Abrir ficha clínica' });
          assert.equal(await chart.getAttribute('href'), route.pathname + '/' + (2000 + total) + (referral ? '/?referralGuid=demo' : ''));
          assert.ok(await chart.locator('.hhr-rongorongo-icon').evaluate(icon =>
            getComputedStyle(icon).maskImage.startsWith('url("data:image/png;base64,')));
        } else {
          assert.equal(await chartLinks.count(), 0);
          await rows.last().getByRole('button', { name: 'Abrir ficha' }).click();
          assert.equal(await page.locator('output').textContent(), String(total));
        }
        await page.locator('#filters select').selectOption('1');
        assert.equal(await rows.count(), Math.ceil(total / 2));
        assert.equal(await rows.nth(1).locator('td:nth-child(2) strong').textContent(), 'Paciente sintético 3');
        await printAndCheck(context, worker, rows.nth(1).getByRole('button', {name:'Imprimir última receta completa'}), 'Reporte_Receta_Medica.pdf', 2003);
        await page.locator('#filters select').selectOption('');
        await rows.last().evaluate(tr => tr.remove());
        await pager.waitFor({ state: 'visible' }); // partial source: native pages remain reachable
        await page.locator('#filters select').selectOption('1');
        await page.locator('#filters select').selectOption('');
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
      if (route.pathname.endsWith('-nurse')) {
        const chart = route.pathname + '/2001';
        await page.route(origin + chart, request => request.fulfill({ contentType: 'text/html', body: nativeFichaFixture() }));
        await page.getByRole('tab', { name: 'Pacientes con novedad', exact: true }).click();
        const marker = rows.first().getByRole('link', { name: 'Abrir última publicación médica en Historial' });
        await marker.focus();
        await marker.press('Enter');
        await page.waitForURL(origin + chart);
        const focused = page.locator('#medication[data-hhr-history-novelty-target]');
        await focused.waitFor();
        assert.equal(await focused.evaluate(card => document.activeElement === card), true);
        assert.ok(await focused.evaluate(card => {
          const tabs = document.querySelector('[role="tablist"]').getBoundingClientRect();
          const target = card.getBoundingClientRect();
          return target.top >= tabs.bottom && target.top < innerHeight;
        }));
        assert.equal(await page.getByRole('tab', { name: 'Historial', selected: true }).count(), 1);
        assert.equal(new URL(page.url()).hash, '');
        const islandDate = await page.evaluate(() => new Intl.DateTimeFormat('en-CA', {
          timeZone:'Pacific/Easter', year:'numeric', month:'2-digit', day:'2-digit',
        }).format(new Date()));
        await page.goto(origin + chart + '#hhr-ultima-publicacion=' + islandDate + 'T09:10');
        await page.locator('#medical-today[data-hhr-history-novelty-target]').waitFor();
        assert.equal(await page.locator('#medication[data-hhr-history-novelty-target]').count(), 0);
        await page.goto(origin + route.pathname);
      } else {
        const chart = origin + route.pathname + '/2001/?referralGuid=demo';
        await page.route(url => url.href === chart, request => request.fulfill({ contentType: 'text/html', body: nativeFichaFixture() }));
        await page.getByRole('tab', { name: 'Mis pacientes de interconsulta', exact: true }).click();
        await rows.first().getByRole('link', { name: 'Abrir ficha clínica' }).press('Enter');
        await page.waitForURL(chart);
        await page.getByRole('tab', { name: 'Resumen', selected: true }).waitFor();
        await page.goto(origin + route.pathname);
      }
      await page.getByRole('tab', { name: route.sections[0][0] }).click();
      await page.locator('[data-hhr-complete-worklist]').waitFor();
      await page.evaluate(() => history.pushState({}, '', location.pathname + '/141121'));
      await page.locator('[data-hhr-compact-worklist]').waitFor({ state: 'detached' });
    } finally { await page.close(); }
  }
};
