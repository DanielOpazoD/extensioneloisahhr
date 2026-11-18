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
  const Table = ({ children }) => jsx('table', { children: jsx('tbody', { children }) });
  const Tab = ({ label, value, select }) => jsx('button', { onClick: () => select(null,value), children: label });
  const Tabs = ({ children, onChange }) => jsx('nav', { children: children.map(child => React.cloneElement(child, {select:onChange})) });
  const keys = ['incomeEncounterList','noveltyEncounterList','uneventfulEncounterList','recoveredEncounterList'];
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
      const columns = ['location','patient','ges','diagnosisAdmission',...(index === 0 ? ['stay'] : ['crd']), 'actions','link'].map(id=>({id,label:id}));
      const visible = props[keys[index]].filter(id=>!filter || String(id).includes(filter)).slice(0,10);
      return localJsx.jsx(NativeTable, { columns, listLenght:visible.length, children:visible.map(id =>
        jsx('tr', {children: columns.map(({id: column})=>jsx('td', {children: column === 'actions' ? jsx('button', {
          onClick:()=>action(index,id), children:'Acción '+id
        }) : column === 'patient' ? jsx('a', {href:path+'/'+id, children:[jsx('strong', {children:'Paciente '+id},'name'),
          jsx(Chip,{size:'small',label:'Pendiente'},'status'), jsx(Chip,{size:'small',label:'Alta médica'},'discharge')]}) : column},column))},id)) });
    }
    function Chip({label}) {return label;}
    function Loader({index}) { return localJsx.jsx(Rows, {index,[keys[index]]:lists[index]}); }
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
  const rows = () => [...document.querySelectorAll('tr')].map(tr=>tr.querySelector('a').getAttribute('href').split('/').pop());
  expect([...document.querySelectorAll('nav button')].map(b=>b.textContent)).toEqual(['Pacientes hospitalizados','Egresos']);
  expect(document.querySelectorAll('table')).toHaveLength(1);
  expect(rows()).toEqual(['21','22','23','20']);
  expect(document.body.textContent).not.toContain('Pendiente');
  expect(document.body.textContent).toContain('Alta médica');
  const click = text => [...document.querySelectorAll('button')].find(b=>b.textContent===text).click();
  await act(()=>click('Acción 22'));
  expect(action).toHaveBeenCalledWith(1,22);
  await act(()=>setFilter('23'));
  expect(rows()).toEqual(['23']);
  await act(()=>setFilter(''));
  await act(()=>click('Egresos'));
  expect(rows()).toEqual(['30']);
  await act(()=>click('Pacientes hospitalizados'));
  expect(rows()).toEqual(['21','22','23','20']);
});
