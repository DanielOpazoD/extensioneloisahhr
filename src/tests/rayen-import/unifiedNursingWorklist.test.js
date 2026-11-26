import { act, createElement, useState } from 'react';
import * as React from 'react';
import * as runtime from 'react/jsx-runtime';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const path = '/dashboard/encounter-list-nurse';
let root;
afterEach(async () => {
  if (root) await act(() => root.unmount());
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-hhr-handoff-enabled');
  delete self.webpackChunk_N_E;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  vi.unstubAllGlobals();
});

it('combina las tres fuentes por episodio, filtra, conserva acciones y abre Egresos desde enlaces anteriores', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  document.documentElement.setAttribute('data-hhr-handoff-enabled', '');
  history.replaceState(null, '', path + '?tab=2');
  for (const file of ['hhr-worklist-print-column','hhr-nursing-novelty','hhr-nursing-worklist','hhr-continuous-worklist-main']) {
    Function(readFileSync('extension/' + file + '.js', 'utf8'))();
  }
  let setUrl, setFilter, setReady, ready, filter = '', activeUrl;
  const action = vi.fn();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback) { this.callback = callback; }
    observe() { queueMicrotask(() => this.callback([{ isIntersecting: true }])); }
    disconnect() {}
  });
  const session = { facilityId: 8, healthCarePractitionerId: 2 };
  const jsx = runtime.jsx;
  const Table = ({ columns, children }) => jsx('table', { children: [
    jsx('thead', { children: jsx('tr', { children: columns.map(({ id, label }) => jsx('th', { children: label }, id)) }) }, 'head'),
    jsx('tbody', { children }, 'body'),
  ] });
  const Tab = ({ label, value, select }) => jsx('button', { onClick: () => select(null,value), children: label });
  const Tabs = ({ children, onChange }) => jsx('nav', { children: children.map(child => React.cloneElement(child, {select:onChange})) });
  const NativeChart = ({ LinkComponent, ...props }) => jsx(LinkComponent, props);
  const NativeSkeleton = () => jsx('table', { 'data-native-skeleton': '' });
  const keys = ['incomeEncounterList','noveltyEncounterList','uneventfulEncounterList','recoveredEncounterList'];
  const beds = { 20: 'R1', 21: 'B1UEA', 22: 'H6C2', 23: 'NEO 1', 30: 'H1C1' };
  const discharges = Array.from({ length:12 }, (_, index) => 30 + index);
  const lists = [[20,21], [21,22], [22,23], discharges];
  const publication = '2026-11-20T09:10:00-05:00';
  const historyRead = vi.fn(async path => ({ data: path.includes('/21/') ? [{
    publishDatetime: publication, evolutionResume: [{ HCPR_NAME: 'Médico', HCP_LEGAL: 'Profesional de prueba',
      OBE_NOTES: '<p>Texto de la evolución sintética</p>' }],
  }] : [{
    publishDatetime: publication, patientPharmaIndicationResume: [{ HCP_ROLE: 'Médica' }],
  }] }));
  const mocks = { 12115:React, 95155:runtime, 65672:{A:Table}, 26466:{A:Tab}, 68175:{A:Tabs}, 575:{A:()=>()=>{}},
    40767:{A:historyRead},
    20063:{useSearchParams:()=>new URLSearchParams(activeUrl.search), useRouter:()=>({replace: next=>setUrl(new URL(next,location.href))})} };
  const req = id => mocks[id];
  req.m = {};
  self.webpackChunk_N_E.at(-1)[2](req);
  req.m[61188] = (module, exports, local) => {
    const nav = local(20063), localJsx = local(95155), NativeTable = local(65672).A;
    const Panel = ({children})=>children;
    function Rows(props) {
      const { index } = props;
      const columns = ['location','patient','ges','diagnosisAdmission',...(index === 0 ? ['stay'] : ['crd', index === 1 ? 'lastNovelty' : '"lastNursePublishDatetime"']), 'assignesDoctor', 'isolated', 'actions','link'].map(id=>({id,label:id}));
      if (ready === 'unknown-table') columns[0].id = 'native-location';
      const visible = props[keys[index]].map(row => row.id ?? row).filter(id=>!filter || String(id).includes(filter)).slice(0,10);
      return localJsx.jsx(NativeTable, { columns, listLenght:visible.length, children:visible.map(id =>
        jsx('tr', {children: columns.map(({id: column})=>jsx('td', {children: column === 'actions' ? jsx('button', {
          onClick:()=>action(index,id), children:'Acción '+id
        }) : column === 'location' ? ['AMQI', jsx('br', {}, 'a'), 'Sala', jsx('br', {}, 'b'), beds[id]]
          : column === 'lastNovelty' ? ['Hace 0 horas ', ' por Profesional de prueba']
          : column === '"lastNursePublishDatetime"' ? 'Hace 5 horas'
          : column === 'patient' ? jsx('a', {href:path+'/'+id, children:[jsx('strong', {children:'Paciente '+id},'name'),
          jsx(Chip,{size:'small',label:id === 20 ? 'Nuevo' : 'Pendiente'},'status'), jsx(Chip,{size:'small',label:'Alta médica'},'discharge'),
          jsx('span', {children:id === 23 ? 'RUN Materno/progenitor(a): 12345678-9' : 'Número de Identificación: DEMO'+id}, 'id')]})
          : column === 'link' ? jsx(NativeChart, { LinkComponent: 'a', href: path+'/'+id, children: '>' }) : column},column))},1000 * (index + 1) + id)) });
    }
    function Chip({label, ...props}) {return jsx('span', {...props, children:label});}
    function Loader({index}) {
      const entries = index === 1 ? lists[index].slice(0, ready === 'novelty-only' ? 1 : undefined)
        .map(id => ({ id, lastPhysicianPublishDatetime: publication })) : lists[index];
      if (!ready || (ready === 'novelty-only' && index !== 1)) return localJsx.jsx(NativeSkeleton, { columns: [], isLoading: true });
      if (ready === 'error') return localJsx.jsx('div', { children: 'Error al cargar los datos' });
      return jsx('article', { style:{paddingBlock:12}, children:localJsx.jsx(Rows, {index,[keys[index]]:entries}) });
    }
    exports.default = function Page() {
      const index = Number(nav.useSearchParams().get('tab'));
      if (ready === 'unknown-layout') return localJsx.jsxs('main', { children:[
        jsx('h1',{children:'Gestión de cuidados nativa'}), jsx(Loader,{session,index}),
      ] });
      return localJsx.jsxs('main',{children:[jsx('nav',{}),jsx('input',{'aria-label':'Buscar'}),
        ...keys.map((_,i)=>jsx(Panel,{index:i,children:index === i && jsx(Loader,{session:i === 3 ? undefined : session,index:i})},i))]});
    };
  };
  const exports = {};
  req.m[61188]({},exports,req);
  function App() {
    [activeUrl,setUrl] = useState(new URL(location.href));
    [filter,setFilter] = useState('');
    [ready,setReady] = useState(false);
    return createElement(exports.default);
  }
  root = createRoot(document.body.appendChild(document.createElement('div')));
  await act(() => root.render(createElement(App)));
  expect(document.querySelectorAll('table')).toHaveLength(1);
  expect(document.querySelector('[data-native-skeleton]')).toBeNull();
  expect(document.querySelector('.hhr-care-loading').textContent).not.toContain('Entrega de turno');
  expect(document.querySelector('.hhr-care-loading').textContent).toContain('Imprimir');
  expect(document.querySelector('.hhr-care-loading').textContent).not.toMatch(/GES|Acciones/);
  await act(() => setReady('novelty-only'));
  expect(document.querySelectorAll('table')).toHaveLength(1);
  expect(document.querySelector('.hhr-care-loading')).not.toBeNull();
  expect(document.body.textContent).not.toContain('Paciente 21');
  await act(() => setReady('error'));
  expect(document.querySelector('.hhr-care-loading')).toBeNull();
  expect(document.querySelectorAll('[role="alert"]')).toHaveLength(3);
  expect([...document.querySelectorAll('nav button')].map(button => button.textContent))
    .toEqual(['Pacientes hospitalizados', 'Egresos']);
  await act(() => setReady(true));
  const rows = () => [...document.querySelectorAll('tbody tr')].map(tr=>tr.querySelector('a').getAttribute('href').split('/').pop());
  const noveltyRows = () => [...document.querySelectorAll('[data-hhr-patient-novelty]')].map(marker =>
    marker.parentElement.querySelector('a').getAttribute('href').split('/').pop());
  const tabLabels = () => [...document.querySelectorAll('nav button')].map(button => button.textContent);
  expect(tabLabels()).toEqual(['Pacientes hospitalizados (4)', 'Egresos (12)']);
  expect(document.querySelectorAll('table')).toHaveLength(1);
  expect(document.querySelectorAll('.hhr-care-source[hidden]')).toHaveLength(3);
  expect(rows()).toEqual(['20','23','22','21']);
  expect([...document.querySelectorAll('[data-hhr-rongorongo-link]')].map(link=>link.getAttribute('href')))
    .toEqual(rows().map(episode=>path+'/'+episode));
  expect(document.querySelector('[data-hhr-rongorongo-link] .hhr-rongorongo-icon')).not.toBeNull();
  expect(noveltyRows()).toEqual(['22','21']);
  expect([...document.querySelectorAll('a[data-hhr-patient-novelty]')].map(link=>link.getAttribute('href'))).toEqual([
    path + '/22#hhr-ultima-publicacion', path + '/21#hhr-ultima-publicacion',
  ]);
  expect([...document.querySelectorAll('a[data-hhr-patient-novelty]')].map(link=>link.dataset.hhrNoveltyKind))
    .toEqual(['indication', 'evolution']);
  const evolution = document.querySelector('a[data-hhr-novelty-kind="evolution"]');
  const preview = evolution.nextElementSibling;
  expect(preview.getAttribute('popover')).toBe('auto');
  expect(preview.textContent).toContain('09:10 · Profesional de prueba');
  expect(preview.textContent).toContain('Texto de la evolución sintética');
  expect(preview.querySelector('a').getAttribute('href')).toBe(path + '/21#hhr-ultima-publicacion=2026-11-20T09:10');
  preview.showPopover = vi.fn();
  const activation = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  await act(() => evolution.dispatchEvent(activation));
  expect(activation.defaultPrevented).toBe(true);
  expect(preview.showPopover).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(preview.querySelector('a'));
  expect(historyRead.mock.calls.map(([url]) => url)).toEqual([
    '/encounter/22/getPatientEncounterHistoryReportServer/false/0/0/-14',
    '/encounter/21/getPatientEncounterHistoryReportServer/false/0/0/-14',
  ]);
  expect(document.querySelector('[data-hhr-new-patient-chip]')?.textContent).toBe('Nuevo');
  expect(document.body.textContent).not.toContain('Pendiente');
  expect(document.querySelector('[data-hhr-discharge-chip]')?.textContent).toBe('Alta médica');
  expect(document.querySelectorAll('button[data-hhr-handoff-episode]')).toHaveLength(0);
  expect(document.querySelectorAll('td[data-hhr-handoff-episode][hidden]')).toHaveLength(4);
  expect(document.body.textContent).not.toContain('Última novedad');
  expect(document.body.textContent).not.toContain('Última atención');
  expect(document.body.textContent).not.toMatch(/Hace |por Profesional|RUN Materno|Número de Identificación/);
  expect(document.body.textContent).toContain('DEMO22');
  const toggle = document.querySelector('[data-hhr-handoff-toggle]');
  const onToggle = toggle[Object.keys(toggle).find(key => key.startsWith('__reactProps'))].onClick;
  const operationalColumns = ['crd', 'assignesDoctor', 'isolated', 'actions', 'link'];
  const headings = () => [...document.querySelectorAll('thead th')].map(th => th.textContent);
  await act(() => onToggle({ isTrusted: false }));
  expect(document.querySelectorAll('[data-hhr-handoff-inline]')).toHaveLength(0);
  await act(() => onToggle({ isTrusted: true }));
  expect(headings().filter(heading => operationalColumns.includes(heading))).toEqual([]);
  expect([...document.querySelectorAll('[data-hhr-handoff-inline]')].map(host => host.dataset.hhrHandoffInline)).toEqual(rows());
  expect(rows()).toEqual(['20','23','22','21']);
  expect(noveltyRows()).toEqual(['22','21']);
  const editor = document.querySelector('[data-hhr-handoff-inline]');
  await act(() => setReady('novelty-only'));
  expect(document.querySelector('.hhr-care-loading')).not.toBeNull();
  expect(editor.closest('.hhr-care-results').hidden).toBe(true);
  await act(() => setReady(true));
  expect(document.querySelector('.hhr-care-loading')).toBeNull();
  expect(document.querySelector('[data-hhr-handoff-inline]')).toBe(editor);
  expect(editor.closest('.hhr-care-results').hidden).toBe(false);
  await act(() => onToggle({ isTrusted: true }));
  expect(headings()).toEqual(expect.arrayContaining(operationalColumns));
  expect(document.querySelector('[data-hhr-handoff-inline]')).toBe(editor);
  expect(editor.hidden).toBe(true);
  await act(() => onToggle({ isTrusted: true }));
  await act(() => document.documentElement.removeAttribute('data-hhr-handoff-enabled'));
  expect(document.querySelector('[data-hhr-handoff-toggle]')).toBeNull();
  expect(document.querySelector('[data-hhr-handoff-inline]')).toBeNull();
  expect(headings()).toContain('Actividad');
  await act(() => document.documentElement.setAttribute('data-hhr-handoff-enabled', ''));
  expect(document.querySelector('[data-hhr-handoff-toggle]').getAttribute('aria-expanded')).toBe('false');
  const click = text => [...document.querySelectorAll('button')].find(b=>b.textContent===text).click();
  await act(()=>click('Acción 22'));
  expect(action).toHaveBeenCalledWith(1,22);
  await act(()=>setFilter('23'));
  expect(rows()).toEqual(['23']);
  expect(tabLabels()).toEqual(['Pacientes hospitalizados (1)', 'Egresos (0)']);
  expect(noveltyRows()).toEqual([]);
  await act(()=>setFilter(''));
  await act(()=>click('Egresos (12)'));
  expect(rows()).toEqual(discharges.map(String));
  expect(noveltyRows()).toEqual([]);
  expect(tabLabels()).toEqual(['Pacientes hospitalizados (4)', 'Egresos (12)']);
  await act(()=>click('Pacientes hospitalizados (4)'));
  expect(rows()).toEqual(['20','23','22','21']);
  await act(()=>setReady('unknown-table'));
  expect(document.querySelector('.hhr-hospitalized-panel')).toBeNull();
  expect(document.querySelector('thead th').textContent).toBe('location');
  expect(rows()).toEqual(['20','21']);
  await act(()=>click('Acción 20'));
  expect(action).toHaveBeenCalledWith(0,20);
  await act(()=>setReady('unknown-layout'));
  expect(document.querySelector('h1').textContent).toBe('Gestión de cuidados nativa');
  expect(rows()).toEqual(['20','21']);
});

it.each(['missing', 'changed'])('mantiene los imports nativos cuando la tabla interna de Rayen está %s', (kind) => {
  const context = { location:{ pathname:path } };
  context.self = context;
  for (const file of ['hhr-worklist-print-column','hhr-nursing-worklist','hhr-continuous-worklist-main']) {
    runInNewContext(readFileSync('extension/' + file + '.js', 'utf8'), context);
  }
  const navigation = { useSearchParams:() => new URLSearchParams(), useRouter:() => ({ replace() {} }) };
  const modules = {
    12115:React, 95155:runtime, 20063:navigation, 65673:{ A:() => 'Tabla nativa' },
    26466:{ A:() => null }, 68175:{ A:() => null }, 575:{ A:() => () => {} }, 40767:{ A:async () => ({data:[]}) },
  };
  if (kind === 'changed') modules[65672] = { A:'otro tipo de exportación' };
  const require = id => {
    if (!Object.hasOwn(modules, id)) throw new Error('Módulo de prueba ausente');
    return modules[id];
  };
  require.m = {};
  context.webpackChunk_N_E.at(-1)[2](require);
  require.m[61188] = (_module, exports, local) => {
    exports.navigation = local(20063);
    exports.jsx = local(95155);
    exports.default = local(65673).A;
  };
  const exports = {};
  require.m[61188]({}, exports, require);
  expect(exports.navigation).toBe(navigation);
  expect(exports.jsx).toBe(runtime);
  expect(exports.default()).toBe('Tabla nativa');
});

it('ordena las camas visibles y mantiene ambos episodios cuando comparten ubicación', () => {
  Function(readFileSync('extension/hhr-worklist-print-column.js', 'utf8'))();
  const { jsx } = runtime;
  const codes = ['R1', 'R2', 'R3', 'R4', 'Neo 1', 'NEO2', 'H1C1', 'H1C2',
    'H2C1', 'H2C2', 'H3C1', 'H3C2', 'H4C1', 'H4C2', 'H5C1', 'H5C2', 'H6C1', 'H6C2',
    'Sin cama', 'B2UEA', 'B10UEA'];
  const makeRow = (bed, id) => jsx('tr', { children: [
    jsx('td', { children: ['AMQI', jsx('br', {}), 'Sala', jsx('br', {}), bed] }),
    jsx('td', { children: jsx('a', { href: '/dashboard/encounter-list/' + id }) }),
    jsx('td', { children: 'GES' }),
  ] }, id);
  const children = codes.map((bed, i) => makeRow(bed, 100 + i)).reverse();
  children.unshift(makeRow('R2', 999));
  const ordered = globalThis.HhrWorklistPrintColumn.adapt(jsx, {
    children, listLenght: children.length, columns: ['location', 'patient', 'ges'].map(id => ({ id })),
  }, '/dashboard/encounter-list');
  const expected = codes.map((_, i) => String(100 + i));
  expected.splice(1, 0, '999');
  expect(ordered.children.map(row => row.props.children[2].props['data-hhr-worklist-episode'])).toEqual(expected);
});

it('usa el episodio del enlace nativo para imprimir y editar la entrega, incluso si cambia la clave de React', () => {
  Function(readFileSync('extension/hhr-worklist-print-column.js', 'utf8'))();
  Function(readFileSync('extension/hhr-nursing-worklist.js', 'utf8'))();
  const { jsx } = runtime;
  const columns = ['location', 'patient', 'ges', 'link'].map(id => ({ id, label:id }));
  const row = (key, patient, chart = patient) => jsx('tr', { children: [
    jsx('td', { children:['AMQI', jsx('br', {}), 'Sala', jsx('br', {}), 'R1'] }),
    jsx('td', { children:jsx('a', { href:path + '/' + patient, children:'Paciente ' + patient }) }),
    jsx('td', { children:'GES' }),
    jsx('td', { children:jsx('a', { href:path + '/' + chart, children:'Ficha' }) }),
  ] }, key);
  const table = rows => globalThis.HhrWorklistPrintColumn.adapt(jsx, {
    columns, listLenght:rows.length, children:rows,
  }, path);
  const { children } = globalThis.HhrNursingWorklist.joinTables(jsx, [
    table([row('80', 200)]), table([row('123', 200), row('456', 300), row('789', 400, 500)]),
  ], true);
  expect(children).toHaveLength(3);
  const projected = children.map(row => {
    const cells = row.props.children.map(cell => cell.props);
    return {
      print:cells.find(cell => cell.className === 'hhr-worklist-documents')['data-hhr-worklist-episode'],
      handoff:cells.find(cell => cell.className === 'hhr-worklist-handoff')?.['data-hhr-handoff-episode'],
      href:cells.at(-1).children.props.href,
    };
  });
  expect(projected).toEqual([
    { print:'200', handoff:'200', href:path + '/200' },
    { print:'300', handoff:'300', href:path + '/300' },
    { print:undefined, handoff:undefined, href:path + '/500' },
  ]);
});

it('marca «Nuevo» también en la lista médica, sea cual sea su tamaño, y solo el pequeño en Gestión de cuidados', () => {
  Function(readFileSync('extension/hhr-worklist-print-column.js', 'utf8'))();
  const jsx = (type, props, key) => ({ type, props, key });
  const Chip = () => null;
  const marked = (route, size) => {
    const row = jsx('tr', { children: [
      jsx('td', { children: ['AMQI', jsx('br', {}), 'R1'] }),
      jsx('td', { children: jsx('div', { children: [jsx('a', { href: route + '/7', children: jsx('span', { children: [
        jsx('span', { administrativeSexId: 1 }), jsx('strong', { fontWeight: 'bold', children: 'Paciente sintético' }),
        jsx(Chip, { label: 'Nuevo', size }),
      ] }) })] }) }),
      jsx('td', { children: 'GES' }),
    ] }, 7);
    const adapted = globalThis.HhrWorklistPrintColumn.adapt(jsx, {
      children: [row], listLenght: 1, columns: ['location', 'patient', 'ges'].map(id => ({ id })),
    }, route);
    // The care list wraps the link with its tools: look the name row up wherever the adapter leaves it.
    const find = node => Array.isArray(node) ? node.map(find).find(Boolean) :
      !node?.props ? undefined : Object.hasOwn(node.props, 'data-hhr-patient-name-row') ? node : find(node.props.children);
    const nameRow = find(adapted.children[0].props.children[1]);
    expect(nameRow.props['data-hhr-patient-name-row']).toBe('');
    return Object.hasOwn(nameRow.props.children.at(-1).props, 'data-hhr-new-patient-chip');
  };
  expect(['small', undefined, 'medium'].map(size => marked('/dashboard/encounter-list', size))).toEqual([true, true, true]);
  expect(['small', 'medium'].map(size => marked(path, size))).toEqual([true, false]);
});
