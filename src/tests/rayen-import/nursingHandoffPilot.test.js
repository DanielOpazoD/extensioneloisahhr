import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';

Function(readFileSync('extension/nursing-handoff-pilot.js', 'utf8'))();

const source = 'https://fichamedico.rayensalud.cl/dashboard/encounter-list-nurse';
const extensionOrigin = 'chrome-extension://demo/';
const ids = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'];
const demoProof = 'eloisa-demo-v1.' + 'x'.repeat(32);
const info = { facId: '1', practitionerId: '2', practitionerRoleId: '3', token: demoProof };
const setup = async () => {
  const owner = '1:2:3';
  const fields = { owner, sessionKey: 'rayen-session' };
  const store = {};
  ids.forEach((id, i) => {
    store['hhr-nursing-handoff-editor-' + id] = {
      ...fields, tabId: 1, editorTab: i + 2, episode: '901001', patientId: '1', run: '11111111-1',
    };
  });
  const chrome = {
    runtime: { getManifest: () => ({ name: 'Eloísa HHR · Entrega de turno (pruebas)' }), getURL: file => extensionOrigin + file },
    storage: { session: {
      get: async key => ({ [key]: store[key] }),
      set: async values => Object.assign(store, values),
      remove: async key => { delete store[key]; },
    } },
    tabs: { get: async () => ({ id: 1, url: source }), onRemoved: { addListener: vi.fn() }, sendMessage: vi.fn().mockResolvedValue(undefined) },
  };
  const checkAccess = vi.fn().mockResolvedValue({ ok: true });
  const fetchImpl = vi.fn();
  const getInfo = vi.fn().mockResolvedValue({ info });
  const runtime = globalThis.HhrNursingHandoffPilot.create({
    chrome, getSessionKey: () => 'rayen-session', getInfo, checkAccess, fetchImpl,
    getContext: async () => ({ info, patientId: '1', patient: { run: '11111111-1' } }),
  });
  const message = (index, action) => runtime.operate({ id: ids[index], action }, {
    frameId: 0, url: extensionOrigin + 'nursing-handoff-editor.html#' + ids[index], tab: { id: index + 2 },
  });
  return { checkAccess, chrome, fetchImpl, getInfo, message };
};

it('retira el acceso a la nota si Eloísa revoca el permiso durante una lectura', async () => {
  const { message, checkAccess, fetchImpl } = await setup();
  fetchImpl.mockImplementation(async () => {
    checkAccess.mockResolvedValue({ error: 'Eloísa retiró el acceso a la ficha.' });
    return Response.json({ result: { text: 'nota sintética' } });
  });
  await expect(message(0, 'read')).resolves.toEqual({
    code: 'SOURCE_SESSION_CHANGED', error: 'Eloísa retiró el acceso a la ficha.',
  });
  expect(fetchImpl).toHaveBeenCalledOnce();
  await message(0, 'read');
  expect(fetchImpl).toHaveBeenCalledOnce();
});

it('guarda directamente con la sesión de Eloísa y comunica la confirmación', async () => {
  const { message, chrome, fetchImpl } = await setup();
  fetchImpl.mockResolvedValue(Response.json({ result: { confirmed: true, date: '2026-11-19', shift: 'day' } }));
  await expect(message(1, 'save')).resolves.toMatchObject({ confirmed: true });
  const { data } = JSON.parse(fetchImpl.mock.calls[0][1].body);
  expect(data).toMatchObject({
    action: 'save',
    episode: '901001',
    source: { sessionProof: demoProof, facilityId: '1', practitionerId: '2', roleId: '3' },
  });
  expect(chrome.tabs.sendMessage).toHaveBeenCalledOnce();
});

it('conserva la confirmación del servidor si caduca la sesión mientras responde', async () => {
  const { message, chrome, fetchImpl, getInfo } = await setup();
  fetchImpl.mockImplementation(async () => {
    getInfo.mockResolvedValue({ error: 'Sesión cerrada.' });
    return Response.json({ result: { text: 'nota sintética', confirmed: true } });
  });
  await expect(message(0, 'save')).resolves.toMatchObject({ confirmed: true, code: 'SOURCE_SESSION_CHANGED' });
  expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
});

it('mantiene las credenciales ajenas al piloto fuera del emulador', async () => {
  const { message, fetchImpl, getInfo } = await setup();
  const token = crypto.randomUUID();
  getInfo.mockResolvedValue({ info: { ...info, token } });
  await expect(message(0, 'read')).resolves.toMatchObject({ code: 'SOURCE_SESSION_CHANGED' });
  expect(fetchImpl).not.toHaveBeenCalled();
});
