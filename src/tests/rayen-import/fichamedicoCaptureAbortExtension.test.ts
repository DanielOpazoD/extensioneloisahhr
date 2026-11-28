// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

const readExt = (file: string) => readFileSync(path.resolve('extension', file), 'utf8');
const RUNTIME_GENERATION = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const ORIGIN = 'https://fichamedico.rayensalud.cl';

const createAbortHarness = (
  fetchHandler: (url: string, init?: { signal?: AbortSignal }) => Promise<unknown>
) => {
  const listeners = new Map<string, Array<(event: unknown) => unknown>>();
  const onRuntimeMessages: Array<
    (msg: Record<string, unknown>, sender: unknown, respond: (value: unknown) => void) => unknown
  > = [];
  const postedMessages: Array<Record<string, unknown>> = [];
  const storage = new Map<string, unknown>();
  const addListener = (type: string, listener: (event: unknown) => unknown) => {
    const current = listeners.get(type) || [];
    current.push(listener);
    listeners.set(type, current);
  };
  const removeListener = (type: string, listener: (event: unknown) => unknown) => {
    listeners.set(type, (listeners.get(type) || []).filter(item => item !== listener));
  };

  const windowObject: Record<string, unknown> = {
    location: {
      href: `${ORIGIN}/dashboard/encounter-list`,
      origin: ORIGIN,
      pathname: '/dashboard/encounter-list',
    },
    fetch: (input: unknown, init?: { signal?: AbortSignal }) =>
      fetchHandler(String(input), init),
    addEventListener: addListener,
    removeEventListener: removeListener,
    dispatchEvent: () => true,
    postMessage: (data: unknown) => {
      if (data && typeof data === 'object') postedMessages.push(data as Record<string, unknown>);
      queueMicrotask(() => {
        for (const listener of [...(listeners.get('message') || [])]) {
          void listener({ source: windowObject, origin: ORIGIN, data });
        }
      });
    },
  };
  Object.defineProperty(windowObject, '__hhrExtensionRuntimeGenerationV1__', {
    value: RUNTIME_GENERATION,
    configurable: false,
    writable: false,
  });

  function XMLHttpRequestMock() {}
  XMLHttpRequestMock.prototype.open = () => undefined;
  XMLHttpRequestMock.prototype.setRequestHeader = () => undefined;

  const mainContext = vm.createContext({
    AbortController,
    Date,
    console,
    URL,
    Headers,
    setTimeout,
    clearTimeout,
    performance,
    window: windowObject,
    sessionStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
    document: { hidden: false, addEventListener: addListener },
    history: { pushState: () => undefined, replaceState: () => undefined },
    XMLHttpRequest: XMLHttpRequestMock,
    CustomEvent: class CustomEventMock {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    },
  });

  for (const file of [
    'fichamedico/fichamedico-isolation-normalization.js',
    'fichamedico/fichamedico-diagnosis-coding.js',
    'fichamedico/fichamedico-normalization.js',
    'fichamedico/fichamedico-read-resilience.js',
    'fichamedico/fichamedico-capture-cache.js',
    'fichamedico/fichamedico-census-runtime.js',
    'salud/bridge-generation-main.js',
    'salud/connection-relay-recovery.js',
    'fichamedico/inject-fichamedico.js',
  ]) {
    vm.runInContext(readExt(file), mainContext, { filename: file });
  }

  const manifest = JSON.parse(readExt('manifest.json')) as { version: string };
  const isolatedContext = vm.createContext({
    window: windowObject,
    document: { documentElement: { setAttribute: () => undefined } },
    chrome: {
      runtime: {
        id: 'eloisa-test-ext',
        getManifest: () => ({ version: manifest.version }),
        onMessage: { addListener: (fn: (typeof onRuntimeMessages)[number]) => onRuntimeMessages.push(fn) },
        sendMessage: (_msg: unknown, cb: (reply: unknown) => void) =>
          cb({ version: manifest.version, runtimeGeneration: RUNTIME_GENERATION }),
        lastError: undefined,
      },
      storage: {
        local: {
          get: async (key: string) => (storage.has(key) ? { [key]: storage.get(key) } : {}),
          set: async (entries: Record<string, unknown>) => {
            for (const [k, v] of Object.entries(entries)) storage.set(k, v);
          },
        },
      },
    },
    setTimeout,
    clearTimeout,
    Date,
    Math,
    String,
    Number,
    Boolean,
    Object,
    Array,
    Promise,
  });
  vm.runInContext('var globalThis = window; ' + readExt('contratos/message-contract.js'), isolatedContext);
  vm.runInContext(readExt('salud/bridge-generation.js'), isolatedContext);
  vm.runInContext(readExt('contenido/content-fichamedico.js'), isolatedContext);

  const sendMain = (request: Record<string, unknown>, responseType: string) =>
    new Promise<Record<string, unknown>>(resolve => {
      const reqId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const onReply = (event: unknown) => {
        const data = (event as { data?: Record<string, unknown> }).data;
        if (!data || data.type !== responseType || data.reqId !== reqId) return;
        removeListener('message', onReply);
        resolve(data);
      };
      addListener('message', onReply);
      windowObject.postMessage({
        ...request,
        reqId,
        runtimeGeneration: RUNTIME_GENERATION,
      });
    });

  const readViaRelay = () =>
    new Promise<Record<string, unknown>>(resolve => {
      for (const listener of onRuntimeMessages) {
        listener({ type: 'RAYEN_READ' }, {}, response => resolve(response as Record<string, unknown>));
      }
    });

  return { sendMain, readViaRelay, postedMessages, storage };
};

const sessionReply = () => ({
  ok: true,
  status: 200,
  json: async () => ({
    ok: true,
    session: {
      token: 'HSP token-abort-test',
      facilityId: 1342,
      healthCarePractitionerId: 7936,
      healthCarePractitionerRoleId: 2,
      role: 'Médico',
      fullName: 'Profesional Sintético',
    },
  }),
});

const waitForAbort = (signal?: AbortSignal) =>
  new Promise<never>((_resolve, reject) => {
    const abortError = () => Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    signal?.addEventListener('abort', () => reject(abortError()), { once: true });
  });

describe('Ficha Médico · presupuesto único de captura con AbortController', () => {
  it('aborta fetch en vuelo al vencer deadlineMs, devuelve timeoutStage sin snapshot parcial y no bloquea la salud', async () => {
    const observedSignals: AbortSignal[] = [];
    const harness = createAbortHarness(async (raw, init) => {
      if (raw === '/api/auth/session') return sessionReply();
      const url = new URL(raw);
      if (url.pathname === '/encounter/list/filter') {
        return {
          ok: true,
          status: 200,
          json: async () => (url.searchParams.get('filterType') === '3' ? [{ id: 101 }] : []),
        };
      }
      if (init?.signal) observedSignals.push(init.signal);
      return waitForAbort(init?.signal);
    });

    const result = await harness.sendMain(
      { type: 'RAYEN_EXT_READ_REQUEST', deadlineMs: 40 },
      'RAYEN_EXT_READ_RESULT'
    );

    expect(result).toMatchObject({
      error: 'Tiempo de espera agotado leyendo Rayen.',
      timeoutStage: 'ficha_main_relay',
    });
    expect(result.snapshot).toBeUndefined();
    expect(observedSignals.length).toBeGreaterThan(0);
    expect(observedSignals.every(signal => signal.aborted)).toBe(true);

    const status = await harness.sendMain(
      { type: 'RAYEN_FM_SESSION_STATUS_REQUEST' },
      'RAYEN_FM_SESSION_STATUS_RESULT'
    );
    expect(status).toMatchObject({ ready: true, reason: 'connected' });
  });

  it('CEN-01: si el aborto ocurre leyendo egresos (filterType=2), no los convierte en lista vacía', async () => {
    let dischargedSignal: AbortSignal | undefined;
    const harness = createAbortHarness(async (raw, init) => {
      if (raw === '/api/auth/session') return sessionReply();
      const url = new URL(raw);
      if (url.pathname === '/encounter/list/filter') {
        if (url.searchParams.get('filterType') === '3') {
          return { ok: true, status: 200, json: async () => [{ id: 201 }] };
        }
        dischargedSignal = init?.signal;
        return waitForAbort(init?.signal);
      }
      return { ok: true, status: 200, json: async () => [] };
    });

    const result = await harness.sendMain(
      { type: 'RAYEN_EXT_READ_REQUEST', deadlineMs: 40 },
      'RAYEN_EXT_READ_RESULT'
    );

    expect(dischargedSignal?.aborted).toBe(true);
    expect(result).toMatchObject({
      error: 'Tiempo de espera agotado leyendo Rayen.',
      timeoutStage: 'ficha_main_relay',
    });
    expect(result.snapshot).toBeUndefined();
  });

  it('no cachea un catálogo CIE-10 abortado y el relé propaga deadlineMs y timeoutStage', async () => {
    let catalogAttempt = 0;
    const harness = createAbortHarness(async (raw, init) => {
      if (raw === '/api/auth/session') return sessionReply();
      const url = new URL(raw);
      if (url.pathname === '/encounter/list/filter') {
        return {
          ok: true,
          status: 200,
          json: async () => (url.searchParams.get('filterType') === '3' ? [{ id: 301 }] : []),
        };
      }
      if (url.pathname.includes('/patientHeaderData/')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ haoDiagId: 4405, haoDiagName: 'Neumonía' }),
        };
      }
      if (url.pathname === '/api/core/diagnosisClassify') {
        catalogAttempt += 1;
        if (catalogAttempt === 1) return waitForAbort(init?.signal);
        return {
          ok: true,
          status: 200,
          json: async () => [{ id: 4405, name: 'Neumonía', internalCode: 'J15' }],
        };
      }
      return { ok: true, status: 200, json: async () => [] };
    });

    const aborted = await harness.sendMain(
      { type: 'RAYEN_EXT_READ_REQUEST', deadlineMs: 40 },
      'RAYEN_EXT_READ_RESULT'
    );
    expect(aborted).toMatchObject({ timeoutStage: 'ficha_main_relay' });
    expect(aborted.snapshot).toBeUndefined();
    expect(harness.storage.size).toBe(0);

    const beforeRelay = harness.postedMessages.length;
    const recovered = await harness.readViaRelay();
    expect(recovered.error).toBeUndefined();
    expect((recovered.snapshot as { encounters: Array<{ diagnosisCode?: string }> }).encounters[0]).toMatchObject({
      diagnosisCode: 'J15',
    });
    expect(catalogAttempt).toBe(2);
    expect(
      harness.postedMessages
        .slice(beforeRelay)
        .find(message => message.type === 'RAYEN_EXT_READ_REQUEST')
    ).toMatchObject({ deadlineMs: 43000 });
  });

  it('el relé aislado conserva timeoutStage cuando MAIN aborta la lectura', async () => {
    const harness = createAbortHarness(async raw => {
      if (raw === '/api/auth/session') return sessionReply();
      const err = Object.assign(new Error('Tiempo de espera agotado leyendo Rayen.'), {
        code: 'HHR_CAPTURE_ABORTED',
        timeoutStage: 'ficha_main_relay',
      });
      throw err;
    });

    const outcome = await harness.readViaRelay();
    expect(outcome).toEqual({
      error: 'Tiempo de espera agotado leyendo Rayen.',
      timeoutStage: 'ficha_main_relay',
    });
  });
});
