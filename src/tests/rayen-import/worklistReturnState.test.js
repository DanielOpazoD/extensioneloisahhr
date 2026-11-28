// @vitest-environment node
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';
import { expect, it } from 'vitest';

const source = readFileSync('extension/listas/worklist-return-state.js', 'utf8');
const url = 'https://fichamedico.rayensalud.cl/dashboard/encounter-list-nurse';
const sender = { url, id: 'extension', frameId: 0, tab: { id: 7 } };
const snapshot = { entryKey: 'list-a', episode: '2013', query: 'sintético', tab: 'Egresos',
  referral: '', scrollTop: 100, windowY: 30, rowTop: 80 };

function setup() {
  const state = new Map();
  const events = {};
  const self = {};
  const chrome = { runtime: { id: 'extension' }, tabs: Object.fromEntries(['onRemoved', 'onUpdated'].map(type =>
    [type, { addListener: handler => { events[type] = handler; } }])),
    storage: { session: { set: async data => Object.entries(data).forEach(([key,value]) => state.set(key,value)),
      get: async key => ({ [key]: state.get(key) }), remove: async key => { state.delete(key); } } } };
  vm.runInNewContext(source, { self, chrome, URL, crypto: { randomUUID } });
  return { handle: self.HhrWorklistReturnState.handle, events, state };
}

const back = { action: 'return', entryKeys: ['list-a'], fromEpisode: '2013' };
it('restores only the matching tab, list entry and episode, including across reinjection', async () => {
  const { handle, state } = setup();
  await handle({ action: 'remember', snapshot }, sender);
  for (const other of [{ tab: { id: 8 } }, { url: url.replace('-nurse', '') }, { frameId: 1 }, { id: 'other' }]) {
    expect(await handle(back, { ...sender, ...other })).toEqual({});
  }
  expect(await handle({ ...back, fromEpisode: '2020' }, sender)).toEqual({});
  expect(await handle({ ...back, entryKeys: ['other-entry'] }, sender)).toEqual({});
  const first = (await handle(back, sender)).snapshot;
  expect(first.query).toBe('sintético');
  expect((await handle(back, sender)).snapshot.receipt).toBe(first.receipt);
  await handle({ action: 'finish', receipt: first.receipt }, sender);
  expect(state.size).toBe(0);
  expect(await handle(back, sender)).toEqual({});
});

it('a delayed confirmation of a previous visit cannot erase a newer return', async () => {
  const { handle } = setup();
  await handle({ action: 'remember', snapshot }, sender);
  const first = (await handle(back, sender)).snapshot;
  await Promise.all([
    handle({ action: 'remember', snapshot: { ...snapshot, query: 'nueva' } }, sender),
    handle({ action: 'finish', receipt: first.receipt }, sender),
  ]);
  expect((await handle(back, sender)).snapshot.query).toBe('nueva');
});

it('clears the query on leaving the clinical session or closing its tab', async () => {
  const { handle, events, state } = setup();
  await handle({ action: 'remember', snapshot }, sender);
  await events.onUpdated(7, { url: url + '/2013' });
  expect(state.size).toBe(1);
  await events.onUpdated(7, { url: new URL('/login', url).href });
  expect(state.size).toBe(0);
  await handle({ action: 'remember', snapshot }, sender);
  await events.onRemoved(7);
  expect(state.size).toBe(0);
});
