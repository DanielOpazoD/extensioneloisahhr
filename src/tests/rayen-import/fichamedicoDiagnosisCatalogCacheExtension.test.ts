// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import { afterEach, describe, expect, it, vi } from 'vitest';

const readExt = (file: string) => readFileSync(path.resolve('extension', file), 'utf8');
const RUNTIME_GENERATION = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const ORIGIN = 'https://fichamedico.rayensalud.cl';
const STORAGE_KEY = 'hhr:diagnosis-catalog:v1';

interface ApiScenario {
  token: string;
  encounters: Array<{ id: number; diagnosisId: number; diagnosisName: string }>;
  catalog: Array<{ id: number; name: string; internalCode: string }>;
  onCatalogCall: () => void;
}

const createTabEnvironment = (
  storage: Map<string, unknown>,
  scenario: ApiScenario
) => {
  const listeners = new Map<string, Array<(event: unknown) => unknown>>();
  const onRuntimeMessages: Array<
    (msg: Record<string, unknown>, sender: unknown, respond: (value: unknown) => void) => unknown
  > = [];
  const addListener = (type: string, listener: (event: unknown) => unknown) => {
    const current = listeners.get(type) || [];
    current.push(listener);
    listeners.set(type, current);
  };
  const removeListener = (type: string, listener: (event: unknown) => unknown) => {
    listeners.set(type, (listeners.get(type) || []).filter(item => item !== listener));
  };

  const windowObject: Record<string, unknown> = {
    location: { href: `${ORIGIN}/dashboard/encounter-list`, origin: ORIGIN, pathname: '/dashboard/encounter-list' },
    fetch: async (input: unknown) => {
      const raw = String(input);
      if (raw === '/api/auth/session') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            session: {
              token: scenario.token,
              facilityId: 1342,
              healthCarePractitionerId: 7936,
              healthCarePractitionerRoleId: 2,
              role: 'Médico',
              fullName: 'Profesional Sintético',
            },
          }),
        };
      }
      const url = new URL(raw);
      if (url.pathname === '/encounter/list/filter') {
        return {
          ok: true,
          status: 200,
          json: async () => (url.searchParams.get('filterType') === '3' ? scenario.encounters : []),
        };
      }
      if (url.pathname.includes('/patientHeaderData/')) {
        const enc = scenario.encounters.find(item => url.pathname.includes(`/${item.id}/`));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            haoDiagId: enc?.diagnosisId ?? null,
            haoDiagName: enc?.diagnosisName ?? '',
          }),
        };
      }
      if (url.pathname === '/api/core/diagnosisClassify') {
        scenario.onCatalogCall();
        return { ok: true, status: 200, json: async () => scenario.catalog };
      }
      return { ok: true, status: 200, json: async () => [] };
    },
    addEventListener: addListener,
    removeEventListener: removeListener,
    dispatchEvent: () => true,
    postMessage: (data: unknown) => {
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

  const readSnapshot = () =>
    new Promise<Record<string, any>>(resolve => {
      for (const listener of onRuntimeMessages) {
        listener({ type: 'RAYEN_READ' }, {}, response => resolve(response as Record<string, any>));
      }
    });

  return { readSnapshot };
};

describe('Ficha Médico · caché persistente del catálogo CIE-10 entre pestañas', () => {
  afterEach(() => vi.useRealTimers());

  it('reutiliza el catálogo guardado en chrome.storage.local en una pestaña nueva sin volver a descargarlo ni filtrarlo en el snapshot', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-24T12:00:00Z'));

    const storage = new Map<string, unknown>();
    let catalogCalls = 0;
    const scenario: ApiScenario = {
      token: 'HSP token-1',
      encounters: [{ id: 101, diagnosisId: 4405, diagnosisName: 'Neumonía bacteriana' }],
      catalog: [{ id: 4405, name: 'Neumonía bacteriana', internalCode: 'J15' }],
      onCatalogCall: () => {
        catalogCalls += 1;
      },
    };

    const tab1 = createTabEnvironment(storage, scenario);
    const first = await tab1.readSnapshot();
    expect(first.snapshot.isComplete).toBe(true);
    expect(first.snapshot.encounters[0]).toMatchObject({ diagnosisCode: 'J15' });
    expect(first).not.toHaveProperty('diagnosisCatalogUpdate');
    expect(first.snapshot).not.toHaveProperty('diagnosisCatalogUpdate');
    expect(catalogCalls).toBe(1);
    expect(storage.has(STORAGE_KEY)).toBe(true);

    // Simula recarga de pestaña o reinicio de Chrome 3 horas después con otra sesión/token.
    vi.setSystemTime(new Date('2026-11-24T15:00:00Z'));
    scenario.token = 'HSP token-2';
    const tab2 = createTabEnvironment(storage, scenario);
    const second = await tab2.readSnapshot();
    expect(second.snapshot.encounters[0]).toMatchObject({ diagnosisCode: 'J15' });
    expect(catalogCalls).toBe(1);

    // Cambio de token en la misma pestaña dispara clearClinicalReadCache() en el primer aviso,
    // pero conserva el catálogo estático CIE-10 en la siguiente lectura válida.
    scenario.token = 'HSP token-3';
    const rotated = await tab2.readSnapshot();
    expect(rotated.error).toContain('cambió o venció');
    const third = await tab2.readSnapshot();
    expect(third.snapshot.encounters[0]).toMatchObject({ diagnosisCode: 'J15' });
    expect(catalogCalls).toBe(1);

    // Un código nuevo ausente en la caché persistida gatilla un único refresco de red y actualiza storage.
    scenario.encounters = [{ id: 102, diagnosisId: 7001, diagnosisName: 'Apendicitis aguda' }];
    scenario.catalog = [
      { id: 4405, name: 'Neumonía bacteriana', internalCode: 'J15' },
      { id: 7001, name: 'Apendicitis aguda', internalCode: 'K35.8' },
    ];
    const fourth = await tab2.readSnapshot();
    expect(fourth.snapshot.encounters[0]).toMatchObject({ diagnosisCode: 'K35.8' });
    expect(catalogCalls).toBe(2);

    // Una tercera pestaña nueva ya encuentra el código 7001 persistido con 0 llamadas de red.
    const tab3 = createTabEnvironment(storage, scenario);
    const fifth = await tab3.readSnapshot();
    expect(fifth.snapshot.encounters[0]).toMatchObject({ diagnosisCode: 'K35.8' });
    expect(catalogCalls).toBe(2);
  });

  it('descarta un registro corrupto o vencido en chrome.storage.local y lee el catálogo real', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-24T12:00:00Z'));

    const storage = new Map<string, unknown>([
      [
        STORAGE_KEY,
        {
          version: 1,
          origin: 'https://fichamedicoback.rayensalud.cl',
          savedAt: Date.now() - 1000,
          expiresAt: Date.now() + 60_000,
          entries: [[4405, 'NO_ES_CIE10']],
        },
      ],
    ]);
    let catalogCalls = 0;
    const scenario: ApiScenario = {
      token: 'HSP token-corrupt',
      encounters: [{ id: 101, diagnosisId: 4405, diagnosisName: 'Neumonía bacteriana' }],
      catalog: [{ id: 4405, name: 'Neumonía bacteriana', internalCode: 'J15' }],
      onCatalogCall: () => {
        catalogCalls += 1;
      },
    };

    const tab = createTabEnvironment(storage, scenario);
    const result = await tab.readSnapshot();
    expect(result.snapshot.encounters[0]).toMatchObject({ diagnosisCode: 'J15' });
    expect(catalogCalls).toBe(1);
    expect((storage.get(STORAGE_KEY) as { entries: unknown[] }).entries).toEqual([[4405, 'J15']]);
  });
});
