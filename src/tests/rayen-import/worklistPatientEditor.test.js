// @vitest-environment node
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { beforeEach, expect, it, vi } from 'vitest';

const source = readFileSync('extension/worklist-patient-editor.js', 'utf8');
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
  vm.runInNewContext(source, { self, document, location: { origin: 'https://hospitalizado.rayensalud.cl', hash: '#/bed' } });
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
