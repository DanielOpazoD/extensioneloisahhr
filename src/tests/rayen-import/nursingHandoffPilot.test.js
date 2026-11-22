import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';

Function(readFileSync('extension/nursing-handoff-pilot.js', 'utf8'))();

const source = 'https://fichamedico.rayensalud.cl/dashboard/encounter-list-nurse';
const extensionOrigin = 'chrome-extension://demo/';
const ids = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'];
const demoProof = crypto.randomUUID();
const installationKey = 'a'.repeat(64);
const info = { facId: '1', practitionerId: '2', practitionerRoleId: '3', token: demoProof };
const setup = async hosted => {
  const owner = '1:2:3';
  const fields = { owner, sessionKey: 'rayen-session' };
  const store = {};
  ids.forEach((id, i) => {
    store['hhr-nursing-handoff-' + (i + 1) + ':editor:' + id] = {
      ...fields, id, tabId: i + 1, editorDocument: 'editor-' + i, sourceDocument: 'source-' + i,
      episode: '901001', patientId: '1', run: '11111111-1',
      inline: i === 0,
    };
  });
  const chrome = {
    runtime: { getManifest: () => ({ name: hosted ? 'Puente Eloísa HHR' : 'Eloísa HHR · Entrega de turno (pruebas)' }),
      getURL: file => extensionOrigin + file },
    storage: { session: {
      get: async key => ({ [key]: store[key] }),
      set: async values => Object.assign(store, values),
      remove: async key => { for (const item of Array.isArray(key) ? key : [key]) delete store[item]; },
    } },
    tabs: { get: async id => ({ id, url: source }), onRemoved: { addListener: vi.fn() }, sendMessage: vi.fn().mockResolvedValue(undefined) },
  };
  const checkAccess = vi.fn().mockResolvedValue({ ok: true });
  const fetchImpl = vi.fn();
  const getInfo = vi.fn().mockResolvedValue({ info });
  const getContext = vi.fn(async () => ({ info, patientId: '1', patient: { run: '11111111-1' } }));
  const runtime = globalThis.HhrNursingHandoffPilot.create({
    chrome, hosted, localPilot: { installationKey }, getSessionKey: () => 'rayen-session', getInfo, checkAccess, fetchImpl,
    getContext,
  });
  const message = (index, action, overrides, fields) => runtime.operate({ id: ids[index], action, ...fields }, {
    frameId: 5, documentId: 'editor-' + index, url: extensionOrigin + 'nursing-handoff-editor.html#' + ids[index],
    tab: { id: index + 1, url: source }, ...overrides,
  });
  return { checkAccess, chrome, fetchImpl, getContext, getInfo, message, runtime };
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
    source: { installationKey, facilityId: '1', practitionerId: '2', roleId: '3' },
  });
  expect(fetchImpl.mock.calls[0][1].body).not.toContain(demoProof);
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

it('guarda en orden y conserva el texto de cada editor mientras HHR confirma el anterior', async () => {
  const { message, fetchImpl } = await setup();
  const firstResponse = Promise.withResolvers();
  const success = () => Response.json({ result: { confirmed: true, date: '2026-11-19', shift: 'night' } });
  fetchImpl.mockImplementationOnce(() => firstResponse.promise).mockImplementation(success);
  const first = message(0, 'save', undefined, { text: 'Primera nota' });
  await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
  const second = message(1, 'save', undefined, { text: 'Segunda nota' });
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  firstResponse.resolve(success());
  await expect(Promise.all([first, second])).resolves.toEqual([
    expect.objectContaining({ confirmed: true }), expect.objectContaining({ confirmed: true }),
  ]);
  expect(fetchImpl.mock.calls.map(([, request]) => JSON.parse(request.body).data.text))
    .toEqual(['Primera nota', 'Segunda nota']);
});

it('rechaza una operación si falta la sesión activa', async () => {
  const { message, fetchImpl, getInfo } = await setup();
  getInfo.mockResolvedValue({ info: { ...info, token: '' } });
  await expect(message(0, 'read')).resolves.toMatchObject({ code: 'SOURCE_SESSION_CHANGED' });
  expect(fetchImpl).not.toHaveBeenCalled();
});

it('limita la nota al marco de la entrega y al documento que lo abrió', async () => {
  const { message, fetchImpl } = await setup();
  await expect(message(0, 'read', { frameId: 0 })).resolves.toHaveProperty('error');
  await expect(message(0, 'read', { documentId: 'otro-marco' })).resolves.toHaveProperty('error');
  await expect(message(0, 'close', { frameId: 0, documentId: 'source-1' })).resolves.toHaveProperty('error');
  await expect(message(0, 'close', { frameId: 0, documentId: 'source-0' })).resolves.toEqual({ ok: true });
  await expect(message(0, 'read')).resolves.toHaveProperty('error');
  expect(fetchImpl).not.toHaveBeenCalled();
});

it('comprueba y abre la conexión de la tabla sin leer pacientes y con la sesión de Eloísa autorizada', async () => {
  const open = vi.fn().mockResolvedValue({ ok:true });
  const authorized = vi.fn().mockResolvedValue(null);
  const { runtime, getInfo, getContext, checkAccess, fetchImpl } = await setup({ create:() => ({ authorized, open }) });
  const sender = { frameId:0, documentId:'source-0', url:source, tab:{ id:1, url:source } };
  await expect(runtime.table({ action:'connect' }, { ...sender, frameId:2 })).resolves.toHaveProperty('error');
  await expect(runtime.table({ action:'connect' }, { ...sender, url:'https://hhr-hospitalizados.app' })).resolves.toHaveProperty('error');
  await expect(runtime.table({ action:'status' }, sender)).resolves.toMatchObject({ code:'HHR_LINK_REQUIRED' });
  await expect(runtime.start({ inline:true, encId:'901001' }, sender)).resolves.toMatchObject({ code:'HHR_LINK_REQUIRED' });
  expect(open).not.toHaveBeenCalled();
  await expect(runtime.table({ action:'connect' }, sender)).resolves.toEqual({ ok:true });
  expect(open).toHaveBeenCalledWith('1:2:3', 1);
  authorized.mockResolvedValue({ proof:'synthetic', deviceId:'test-device' });
  await expect(runtime.table({ action:'status' }, sender)).resolves.toEqual({ ok:true });
  await expect(runtime.table({ action:'connect' }, sender)).resolves.toEqual({ ok:true });
  checkAccess.mockResolvedValueOnce({ error:'Sin permiso de ficha.' });
  await expect(runtime.table({ action:'connect' }, sender)).resolves.toEqual({ error:'Sin permiso de ficha.' });
  getInfo.mockResolvedValueOnce({ info:{ ...info, token:'' } });
  await expect(runtime.table({ action:'connect' }, sender)).resolves.toHaveProperty('error');
  expect(open).toHaveBeenCalledOnce();
  expect(getContext).not.toHaveBeenCalled();
  expect(fetchImpl).not.toHaveBeenCalled();
});
