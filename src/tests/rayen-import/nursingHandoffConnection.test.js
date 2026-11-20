import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';

Function(readFileSync('extension/nursing-handoff-connection.js', 'utf8'))();

const host = 'https://hhr-hospitalizados.app';
const session = () => {
  const entries = new Map();
  return {
    get: async key => ({ [key]: entries.get(key) }),
    set: async values => Object.entries(values).forEach(([key, value]) => entries.set(key, value)),
    remove: async key => { entries.delete(key); },
  };
};
const setup = () => {
  let tabId = 20;
  const tabs = new Map([[2, { id: 2, windowId: 1, url: 'https://fichamedico.rayensalud.cl/dashboard/encounter-list-nurse' }]]);
  const chrome = {
    storage: { local: session(), session: session() },
    tabs: {
      query: async () => [...tabs.values()].filter(tab => tab.url.startsWith(host)),
      get: vi.fn(async id => tabs.get(id)),
      create: vi.fn(async ({ url }) => {
        const value = { id: ++tabId, windowId: 1, url };
        tabs.set(value.id, value);
        return value;
      }),
      update: vi.fn(async (id, update) => Object.assign(tabs.get(id), update)),
      duplicate: vi.fn(async id => chrome.tabs.create({ url: tabs.get(id).url })),
      remove: vi.fn(async id => tabs.delete(id)),
    },
    windows: { update: vi.fn(async () => {}) },
  };
  const runtime = globalThis.HhrNursingHandoffConnection.create(chrome);
  return { runtime, chrome, tabs };
};

it('requires the expected HHR tab and correlates the receipt without giving the page the proof', async () => {
  const { runtime, chrome, tabs } = setup();
  expect(await runtime.authorized('owner-A')).toBeNull();
  await expect(runtime.open('owner-A', 2)).resolves.toEqual({ ok: true });
  const hhr = tabs.get(21);
  const url = new URL(hhr.url);
  expect(url.origin).toBe(host);
  const parameters = new URLSearchParams(url.hash.slice(1));
  const id = parameters.get('requestId');
  const message = { id, expiresAt: Date.now() + 60000 };
  const source = { frameId: 0, tab: hhr, url: hhr.url };
  await expect(runtime.receive(message, { ...source, frameId: 1 })).resolves.toHaveProperty('error');
  await expect(runtime.receive(message, { ...source, url: host + '.otro.test' })).resolves.toHaveProperty('error');
  await expect(runtime.receive({ ...message, id: crypto.randomUUID() }, source)).resolves.toHaveProperty('error');
  await expect(runtime.receive(message, source)).resolves.toEqual({ ok: true });
  const { proof, deviceId } = await runtime.authorized('owner-A');
  expect(proof).toMatch(/^[a-f0-9]{64}$/);
  expect(hhr.url).not.toContain(proof);
  expect(parameters.get('deviceId')).toBe(deviceId);
  expect(await runtime.authorized('owner-B')).toBeNull();
  expect(chrome.tabs.remove).toHaveBeenCalledWith(21);
  expect(chrome.tabs.update).toHaveBeenCalledWith(2, { active: true });
  await expect(runtime.receive(message, source)).resolves.toHaveProperty('error');
});

it('keeps the existing HHR tab untouched when a connection is cancelled', async () => {
  const { runtime, chrome, tabs } = setup();
  await chrome.tabs.create({ url: host + '/censo' });
  await runtime.open('owner-A', 2);
  expect(chrome.tabs.duplicate).toHaveBeenCalledWith(21);
  const hhr = tabs.get(22);
  const id = new URLSearchParams(new URL(hhr.url).hash.slice(1)).get('requestId');
  await runtime.receive({ id }, { frameId: 0, tab: hhr, url: hhr.url });
  expect(await runtime.authorized('owner-A')).toBeNull();
  expect(tabs.get(21).url).toBe(host + '/censo');
  expect(tabs.has(22)).toBe(false);
});
