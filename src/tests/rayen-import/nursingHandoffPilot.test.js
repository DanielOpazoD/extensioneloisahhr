import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';

Function(readFileSync('extension/nursing-handoff-pilot.js', 'utf8'))();

const source = 'https://fichamedico.rayensalud.cl/dashboard/encounter-list-nurse';
const extensionOrigin = 'chrome-extension://demo/';
const ids = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'];
const info = { facId: '1', practitionerId: '2', practitionerRoleId: '3' };
const grantKey = 'hhr-nursing-handoff-grant';
const setup = async () => {
  const owner = '1:2:3';
  const fields = { owner, sessionKey: 'rayen-session' };
  const store = {
    [grantKey]: { ...fields, grant: 'first' },
  };
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
  const runtime = globalThis.HhrNursingHandoffPilot.create({
    chrome, getSessionKey: () => 'rayen-session', getInfo: async () => ({ info }), checkAccess, fetchImpl,
    getContext: async () => ({ info, patientId: '1', patient: { run: '11111111-1' } }),
  });
  const message = (index, action) => runtime.operate({ id: ids[index], action }, {
    frameId: 0, url: extensionOrigin + 'nursing-handoff-editor.html#' + ids[index], tab: { id: index + 2 },
  });
  return { store, checkAccess, chrome, fetchImpl, message };
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

it('confirma el guardado antes de desvincular y conserva la vinculación nueva', async () => {
  const { store, message, chrome, fetchImpl } = await setup();
  const order = [];
  let complete;
  const saved = new Promise(resolve => { complete = resolve; });
  let started;
  const saving = new Promise(resolve => { started = resolve; });
  fetchImpl.mockImplementation(async (_url, request) => {
    const { data } = JSON.parse(request.body);
    order.push(data.action);
    if (data.action === 'save') {
      started();
      return saved;
    }
    if (data.action === 'disconnect') return Response.json({ result: { disconnected: true } });
    return Response.json({ result: { grant: 'second' } });
  });
  const write = message(0, 'save');
  await saving;
  const disconnect = message(1, 'disconnect');
  const reconnect = message(0, 'connect');
  expect(order).toEqual(['save']);
  complete(Response.json({ result: { confirmed: true, date: '2026-11-19', shift: 'day' } }));
  await expect(write).resolves.toMatchObject({ confirmed: true });
  await Promise.all([disconnect, reconnect]);
  expect(chrome.tabs.sendMessage).toHaveBeenCalledOnce();
  expect(order).toEqual(['save', 'disconnect', 'connect']);
  expect(store[grantKey].grant).toBe('second');
});
