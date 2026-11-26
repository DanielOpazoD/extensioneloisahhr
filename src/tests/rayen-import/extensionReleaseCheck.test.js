import { expect, it, vi } from 'vitest';
import '../../../extension/extension-release-check.js';

const { create, newer, project, storageKey } = globalThis.HhrExtensionReleaseCheck;
const ficha = { frameId: 0, url: 'https://fichamedico.rayensalud.cl/dashboard/encounter-list/1' };
const hour = 60 * 60_000;
const release = tag => ({ ok: true, json: async () => ({ tag_name: tag, draft: false, prerelease: false }) });
function setup({ installed = '0.48.187', stored, reply = async () => release('v0.48.194') } = {}) {
  const state = { record: stored, clock: 1_000_000_000 };
  const storage = {
    get: vi.fn(async key => ({ [key]: state.record })),
    set: vi.fn(async entry => { state.record = entry[storageKey]; }),
  };
  const request = vi.fn((...args) => reply(...args));
  return { state, storage, request, check: create({ storage, request, installed, now: () => state.clock }) };
}

it('compares versions by number and reads only a published release', () => {
  expect([newer('0.48.194', '0.48.187'), newer('0.49.0', '0.48.999'), newer('1.0.0', '0.99.99')]).toEqual([true, true, true]);
  expect([newer('0.48.187', '0.48.187'), newer('0.48.9', '0.48.10'), newer('0.48', '0.48.1'), newer('x', '0.48.1'), newer('0.48.2', null)]).toEqual([false, false, false, false, false]);
  expect(project({ tag_name: 'v0.48.194', draft: false, prerelease: false })).toBe('0.48.194');
  expect([project({ tag_name: 'v0.48.194', draft: true }), project({ tag_name: 'v0.48.194', prerelease: true }), project({ tag_name: '0.48.194' }),
    project({ tag_name: 'v0.48.194-beta' }), project({}), project(null)]).toEqual([null, null, null, null, null, null]);
});

it('answers only the top frame of the ficha and asks GitHub without credentials or referrer', async () => {
  const { check, request, storage, state } = setup();
  for (const sender of [undefined, { frameId: 1, url: ficha.url }, { frameId: 0, url: 'https://fichamedico.rayensalud.cl.example/dashboard' },
    { frameId: 0, url: 'https://hhr-hospitalizados.app/' }]) {
    expect(await check.status({}, sender)).toEqual({ error: 'Versión publicada no disponible.' });
  }
  expect(request).not.toHaveBeenCalled();
  expect(await check.status({}, ficha)).toEqual({ installed: '0.48.187', published: '0.48.194', available: true });
  expect(request).toHaveBeenCalledTimes(1);
  const [url, options] = request.mock.calls[0];
  expect(url).toBe('https://api.github.com/repos/DanielOpazoD/extensioneloisahhr/releases/latest');
  expect([options.credentials, options.referrerPolicy, options.signal instanceof AbortSignal, options.body, options.headers]).toEqual(['omit', 'no-referrer', true, undefined, undefined]);
  expect(state.record).toEqual({ published: '0.48.194', checkedAt: state.clock });
  expect(storage.set).toHaveBeenCalledTimes(1);
});

it('keeps one answer for six hours and shares one request among simultaneous questions', async () => {
  let finish;
  // Only the first request waits: both questions must find it in flight.
  const { check, request, state } = setup({ reply: () => finish ? release('v0.48.194') : new Promise(done => { finish = () => done(release('v0.48.194')); }) });
  const both = [check.status({}, ficha), check.status({}, ficha)];
  await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  finish();
  expect(await Promise.all(both)).toEqual(Array(2).fill({ installed: '0.48.187', published: '0.48.194', available: true }));
  state.clock += 6 * hour - 1;
  await check.status({}, ficha);
  expect(request).toHaveBeenCalledTimes(1);
  state.clock += 1;
  await check.status({}, ficha);
  expect(request).toHaveBeenCalledTimes(2);
});

it('says nothing is available for the installed or a later local version', async () => {
  expect(await setup({ installed: '0.48.194' }).check.status({}, ficha)).toEqual({ installed: '0.48.194', published: '0.48.194', available: false });
  expect(await setup({ installed: '0.48.200' }).check.status({}, ficha)).toEqual({ installed: '0.48.200', published: '0.48.194', available: false });
});

it('keeps the last known version through a failure and waits an hour before asking again', async () => {
  // A refusal is not an answer, whatever its body says.
  const failures = [async () => { throw new Error('sin red'); }, async () => ({ ok: false, json: async () => ({ tag_name: 'v0.48.194', draft: false, prerelease: false }) }),
    async () => ({ ok: true, json: async () => ({ tag_name: 'nightly' }) }), async () => ({ ok: true, json: async () => { throw new Error('no es JSON'); } })];
  for (const reply of failures) {
    const first = setup({ reply });
    expect(await first.check.status({}, ficha)).toEqual({ installed: '0.48.187', published: null, available: false });
    expect(first.state.record).toEqual({ failedAt: first.state.clock });
    first.state.clock += hour - 1;
    await first.check.status({}, ficha);
    expect(first.request).toHaveBeenCalledTimes(1);
    first.state.clock += 1;
    await first.check.status({}, ficha);
    expect(first.request).toHaveBeenCalledTimes(2);
  }
  const stale = setup({ stored: { published: '0.48.190', checkedAt: 1_000_000_000 - 7 * hour }, reply: failures[0] });
  expect(await stale.check.status({}, ficha)).toEqual({ installed: '0.48.187', published: '0.48.190', available: true });
  expect(stale.state.record).toEqual({ published: '0.48.190', checkedAt: 1_000_000_000 - 7 * hour, failedAt: stale.state.clock });
  expect(await stale.check.status({}, ficha)).toEqual({ installed: '0.48.187', published: '0.48.190', available: true });
  expect(stale.request).toHaveBeenCalledTimes(1);
});

it('asks again when the stored answer is not one it wrote or comes from the future', async () => {
  for (const stored of [undefined, null, 'x', { published: '0.48', checkedAt: 1_000_000_000 }, { published: '0.48.190' }, { published: '0.48.190', checkedAt: 1_000_000_000 + hour },
    { failedAt: 1_000_000_000 + hour }]) {
    const { check, request } = setup({ stored });
    expect(await check.status({}, ficha)).toEqual({ installed: '0.48.187', published: '0.48.194', available: true });
    expect(request).toHaveBeenCalledTimes(1);
  }
  // Storage that fails to read or to write does not stop the answer.
  const broken = setup();
  broken.storage.get.mockRejectedValue(new Error('sin almacenamiento'));
  broken.storage.set.mockRejectedValue(new Error('sin almacenamiento'));
  expect(await broken.check.status({}, ficha)).toEqual({ installed: '0.48.187', published: '0.48.194', available: true });
});
