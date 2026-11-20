import { act, createElement, useState } from 'react';
import * as React from 'react';
import * as runtime from 'react/jsx-runtime';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const path = '/dashboard/encounter-list-nurse';
let root;
afterEach(async () => {
  if (root) await act(() => root.unmount());
  document.body.replaceChildren();
  delete self.webpackChunk_N_E;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

it('combina las tres fuentes por episodio, filtra, conserva acciones y abre Egresos desde enlaces anteriores', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  history.replaceState(null, '', path + '?tab=2');
  for (const file of ['hhr-worklist-print-column','hhr-nursing-worklist','hhr-continuous-worklist-main']) {
    Function(readFileSync('extension/' + file + '.js', 'utf8'))();
  }
  let setUrl, setFilter, filter = '', activeUrl;
  const action = vi.fn();
  const session = { facilityId: 8, healthCarePractitionerId: 2 };
  const jsx = runtime.jsx;
  const Table = ({ columns, children }) => jsx('table', { children: [
    jsx('thead', { children: jsx('tr', { children: columns.map(({ id, label }) => jsx('th', { children: label }, id)) }) }, 'head'),
    jsx('tbody', { children }, 'body'),
  ] });
  const Tab = ({ label, value, select }) => jsx('button', { onClick: () => select(null,value), children: label });
  const Tabs = ({ children, onChange }) => jsx('nav', { children: children.map(child => React.cloneElement(child, {select:onChange})) });
  const keys = ['incomeEncounterList','noveltyEncounterList','uneventfulEncounterList','recoveredEncounterList'];
  const beds = { 20: 'R1', 21: 'B1UEA', 22: 'H6C2', 23: 'NEO 1', 30: 'H1C1' };
  const lists = [[20,21], [21,22], [22,23], [30]];
  const mocks = { 12115:React, 95155:runtime, 65672:{A:Table}, 26466:{A:Tab}, 68175:{A:Tabs}, 575:{A:()=>()=>{}},
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
      const visible = props[keys[index]].filter(id=>!filter || String(id).includes(filter)).slice(0,10);
      return localJsx.jsx(NativeTable, { columns, listLenght:visible.length, children:visible.map(id =>
        jsx('tr', {children: columns.map(({id: column})=>jsx('td', {children: column === 'actions' ? jsx('button', {
          onClick:()=>action(index,id), children:'Acción '+id
        }) : column === 'location' ? ['AMQI', jsx('br', {}, 'a'), 'Sala', jsx('br', {}, 'b'), beds[id]]
          : column === 'lastNovelty' ? ['Hace 0 horas ', ' por Profesional de prueba']
          : column === '"lastNursePublishDatetime"' ? 'Hace 5 horas'
          : column === 'patient' ? jsx('a', {href:path+'/'+id, children:[jsx('strong', {children:'Paciente '+id},'name'),
          jsx(Chip,{size:'small',label:'Pendiente'},'status'), jsx(Chip,{size:'small',label:'Alta médica'},'discharge'),
          jsx('span', {children:id === 23 ? 'RUN Materno/progenitor(a): 12345678-9' : 'Número de Identificación: DEMO'+id}, 'id')]}) : column},column))},id)) });
    }
    function Chip({label, ...props}) {return jsx('span', {...props, children:label});}
    function Loader({index}) {
      return jsx('article', { style:{paddingBlock:12}, children:localJsx.jsx(Rows, {index,[keys[index]]:lists[index]}) });
    }
    exports.default = function Page() {
      const index = Number(nav.useSearchParams().get('tab'));
      return localJsx.jsxs('main',{children:[jsx('nav',{}),jsx('input',{'aria-label':'Buscar'}),
        ...keys.map((_,i)=>jsx(Panel,{index:i,children:index === i && jsx(Loader,{session,index:i})},i))]});
    };
  };
  const exports = {};
  req.m[61188]({},exports,req);
  function App() {
    [activeUrl,setUrl] = useState(new URL(location.href));
    [filter,setFilter] = useState('');
    return createElement(exports.default);
  }
  root = createRoot(document.body.appendChild(document.createElement('div')));
  await act(() => root.render(createElement(App)));
  const rows = () => [...document.querySelectorAll('tbody tr')].map(tr=>tr.querySelector('a').getAttribute('href').split('/').pop());
  expect([...document.querySelectorAll('nav button')].map(b=>b.textContent)).toEqual(['Pacientes hospitalizados','Egresos']);
  expect(document.querySelectorAll('table')).toHaveLength(1);
  expect(document.querySelectorAll('.hhr-care-source[hidden]')).toHaveLength(3);
  expect(rows()).toEqual(['20','23','22','21']);
  expect(document.body.textContent).not.toContain('Pendiente');
  expect(document.querySelector('[data-hhr-discharge-chip]')?.textContent).toBe('Alta médica');
  expect(document.querySelectorAll('button[data-hhr-handoff-episode]')).toHaveLength(4);
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
  const editor = document.querySelector('[data-hhr-handoff-inline]');
  await act(() => onToggle({ isTrusted: true }));
  expect(headings()).toEqual(expect.arrayContaining(operationalColumns));
  expect(document.querySelector('[data-hhr-handoff-inline]')).toBe(editor);
  expect(editor.hidden).toBe(true);
  const click = text => [...document.querySelectorAll('button')].find(b=>b.textContent===text).click();
  await act(()=>click('Acción 22'));
  expect(action).toHaveBeenCalledWith(1,22);
  await act(()=>setFilter('23'));
  expect(rows()).toEqual(['23']);
  await act(()=>setFilter(''));
  await act(()=>click('Egresos'));
  expect(rows()).toEqual(['30']);
  await act(()=>click('Pacientes hospitalizados'));
  expect(rows()).toEqual(['20','23','22','21']);
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

it('muestra Entrega de turno para cada episodio del piloto', () => {
  Function(readFileSync('extension/hhr-worklist-print-column.js', 'utf8'))();
  Function(readFileSync('extension/hhr-nursing-worklist.js', 'utf8'))();
  const { jsx } = runtime;
  const columns = [{ id: 'patient', label: 'Paciente' }];
  const row = jsx('tr', { children: [jsx('td', { children: 'Paciente sintético' })] }, '123');
  const result = globalThis.HhrNursingWorklist.joinTables(jsx, [{ columns, children: [row] }], true);
  expect(result.columns.map(col => col.label)).toEqual(['Paciente', 'Entrega de turno']);
  expect(result.children[0].props.children[1].props.children.props['data-hhr-handoff-episode']).toBe('123');
});
