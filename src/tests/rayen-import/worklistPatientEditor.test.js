// @vitest-environment node
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { beforeEach, expect, it, vi } from 'vitest';

const source = readFileSync('extension/gestion-camas/worklist-patient-editor.js', 'utf8');
const request = { episode: '21', patient: '41', professional: '17', facility: '8' };
let bed, groups, view, dialog, api;

beforeEach(() => {
  bed = { encounterId: 21, bedEncounterMapping: { encounterMapping: { encounter: { id: 21 } } }, hospitalAdmissionOrderId: 5 };
  groups = { 3: [bed], 4: [], 5: [] };
  const current = { profile: { id: 17 }, role: { facilityId: 8, permissions: ['Modificar_Paciente'] } };
  const order = { id: 5, patient: { id: 41 }, hospitalAdmissionOrderMapping: {} };
  dialog = false;
  view = {
    props: { authenticate: { current }, hospitalRequest: { results: [order] }, onAction: vi.fn(() => { dialog = true; }) },
    typeViewResult: () => [{ bed, action: [[{ value: 'requestModified' }]] }],
  };
  const element = owner => ({ __reactInternalInstance$fixture: { _currentElement: { _owner: owner } } });
  const tabs = {};
  tabs._hostParent = { _renderedChildren: { tabs: { _currentElement: { props: { bedsByType: groups } }, _renderedComponent: tabs } } };
  const document = {
    querySelector: selector => selector.startsWith('.sdxWrapper__content-tabs') ? { __reactInternalInstance$fixture: tabs } : null,
    querySelectorAll: selector => selector === '.sdxTemplate__wrapper' ? [element({ _instance: view })] :
      dialog ? [{ textContent: 'Modificación del paciente', getClientRects: () => [1] }] : [],
  };
  const self = {};
  vm.runInNewContext(source, { self, document, URL, location: { origin: 'https://hospitalizado.rayensalud.cl', hash: '#/bed' } });
  api = self.HhrWorklistPatientEditor;
});

it.each([
  ['un profesional distinto', () => { view.props.authenticate.current.profile.id = 18; }],
  ['otro establecimiento', () => { view.props.authenticate.current.role.facilityId = 9; }],
  ['sin permiso para modificar', () => { view.props.authenticate.current.role.permissions = []; }],
  ['acción ausente para la fila', () => { view.typeViewResult = () => []; }],
  ['acción deshabilitada', () => { view.typeViewResult = () => [{bed, action: [[{value:'requestModified', disabled:true}]]}]; }],
  ['distinto paciente en la orden', () => { view.props.hospitalRequest.results[0].patient.id = 99; }],
  ['dos órdenes para la cama', () => { view.props.hospitalRequest.results.push(view.props.hospitalRequest.results[0]); }],
  ['dos camas para el episodio', () => { groups[4].push(bed); }],
  ['episodios contradictorios', () => { bed.encounterId = 99; }],
])('no abre el editor con %s', async (_, change) => {
  change();
  expect(await api.openNativeEditor(request)).toHaveProperty('error');
  expect(view.props.onAction).not.toHaveBeenCalled();
});

it('espera la carga del episodio sin inferir identidad desde la cama', async () => {
  groups[3] = [];
  expect(await api.openNativeEditor(request)).toEqual({wait: true});
  expect(view.props.onAction).not.toHaveBeenCalled();
});

it('solicita únicamente abrir el editor autorizado por el menú nativo', async () => {
  expect(await api.openNativeEditor(request)).toEqual({opened: true});
  expect(view.props.onAction.mock.calls).toEqual([[{ option: 'requestModified', bed }]]);
});

it('activa la sesión coincidente en otra ventana sin navegar de nuevo ni duplicar la pestaña', async () => {
  const origin = 'https://hospitalizado.rayensalud.cl';
  const tabs = [{id:1,windowId:1,url:origin+'/#/authenticate/login'}, {id:2,windowId:1,url:origin+'/#/bed'},
    {id:3,windowId:2,url:origin+'/#/bed'}];
  const pendingKey = 'hhr-worklist-editor-3';
  const pending = { [pendingKey]: { ...request, episode: '20', expires: Date.now() + 90_000 } };
  const chrome = { tabs: { query: vi.fn(async()=>tabs), update: vi.fn(),
    create: vi.fn(), onRemoved:{addListener:vi.fn()} }, windows:{update:vi.fn()}, storage:{session:{
      get: async key=>({[key]:pending[key]}), set: async data=>Object.assign(pending,data), remove:vi.fn(async key => { delete pending[key]; }),
    }}, scripting:{executeScript:vi.fn(async ({target, func, files}) => {
      if (files) return [];
      if (func.name === 'openNativeEditor') {
        if (target.documentIds[0] === 'retired') throw new Error('Document was replaced');
        return [{result:{opened:true}}];
      }
      return [{result:['login','other','match'][target.tabId-1]}];
    })} };
  const editor=api.create({chrome,getInfo:async()=>({info:{}}),checkAccess:async()=>({ok:true}),
    getContext:async()=>({patientId:41,info:{facId:8,practitionerId:17}})});
  const url='https://fichamedico.rayensalud.cl/dashboard/encounter-list-nurse';
  const sender={frameId:0,url,tab:{id:9,url,windowId:1}};
  expect(await editor.start({encId:21},sender)).toEqual({ok:true});
  expect(chrome.tabs.create).not.toHaveBeenCalled();
  expect(chrome.tabs.update.mock.calls).toEqual([[3,{active:true}]]);
  expect(chrome.windows.update).toHaveBeenCalledWith(2,{focused:true});
  expect(pending[pendingKey].episode).toBe('21');
  const dest = { frameId: 0, documentId: 'retired', url: tabs[2].url, tab: tabs[2] };
  expect(await editor.resume({}, dest)).toEqual({wait:true});
  expect(await editor.resume({}, {...dest, documentId:'new-document'})).toEqual({opened:true});
  expect(pending[pendingKey]).toBeUndefined();
});
