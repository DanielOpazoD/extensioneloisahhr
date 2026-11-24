// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import '../../../extension/hhr-origin-policy.js';
import '../../../extension/clinical-checklist-evolution.js';
import '../../../extension/clinical-checklist-broker.js';

const code = 'PT-00000000-0000-4000-8000-000000000001';
const record = { code, evolution: 'Aplicación pauta IAAS\nCódigo de verificación: ' + code };
beforeEach(() => vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(() => [{ height: 30 }]));
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

it('conserva la nota previa, notifica al editor nativo y evita insertar dos veces el mismo código', () => {
  document.body.innerHTML = '<section id="observationEntrySection"><textarea>Nota previa</textarea><textarea aria-hidden="true"></textarea></section>';
  const area = document.querySelector('textarea');
  const input = vi.fn();
  const change = vi.fn();
  area.addEventListener('input', input);
  area.addEventListener('change', change);
  expect(globalThis.HhrChecklistEvolution.insert({ ...record, evolution: 'Código distinto' })).toBe(false);
  expect(area.value).toBe('Nota previa');
  expect(globalThis.HhrChecklistEvolution.insert(record)).toBe(true);
  expect(globalThis.HhrChecklistEvolution.insert(record)).toBe(true);
  expect(area.value).toBe('Nota previa\n\n' + record.evolution);
  expect(input).toHaveBeenCalledTimes(1);
  expect(change).toHaveBeenCalledTimes(1);
});

it('rechaza un editor ambiguo, un diálogo ajeno y un texto que no cabe', () => {
  document.body.innerHTML = '<section id="observationEntrySection"><textarea></textarea><textarea></textarea></section>';
  expect(globalThis.HhrChecklistEvolution.insert(record)).toBe(false);
  document.querySelector('textarea').remove();
  document.body.insertAdjacentHTML('beforeend', '<div role="dialog" aria-label="Alta"><textarea></textarea></div>');
  expect(globalThis.HhrChecklistEvolution.insert(record)).toBe(false);
  document.querySelector('[role=dialog]').setAttribute('aria-label', 'Nueva evolución');
  const note = document.querySelector('[role=dialog] textarea');
  note.maxLength = 8;
  expect(globalThis.HhrChecklistEvolution.insert(record)).toBe(false);
  note.removeAttribute('maxlength');
  expect(globalThis.HhrChecklistEvolution.insert(record)).toBe(true);
  expect(document.querySelector('section textarea').value).toBe('');
});

it('monta el disparador dentro de la tarjeta MUI de Evolución y abre el editor desde botones de ícono', async () => {
  document.body.innerHTML = `
    <div id="observationEntrySection">
      <div class="MuiCard-root">
        <div class="MuiCardHeader-root">
          <span class="MuiCardHeader-title">Evolución</span>
          <div class="MuiCardHeader-action"><button type="button" aria-label="Más opciones"><svg data-testid="MoreVertIcon"></svg></button></div>
        </div>
        <div class="MuiCardContent-root">
          <p>Buenas condiciones. En regresión el cuadro...</p>
          <div class="evo-actions">
            <button type="button" id="icon-write"><svg></svg></button>
            <button type="button" id="icon-list"><svg></svg></button>
          </div>
        </div>
      </div>
    </div>`;
  const host = globalThis.HhrChecklistEvolution.resolveTriggerHost(null);
  expect(host).toBe(document.querySelector('.evo-actions'));

  const writeBtn = document.getElementById('icon-write');
  writeBtn.addEventListener('click', () => {
    const drawer = document.createElement('div');
    drawer.className = 'MuiDrawer-paper';
    drawer.innerHTML = '<h6>Evolución médica</h6><div contenteditable="true" id="rich-evo">Nota previa</div>';
    document.body.append(drawer);
  });

  expect(await globalThis.HhrChecklistEvolution.openEditor(() => true)).toBe(true);
  expect(globalThis.HhrChecklistEvolution.insert(record)).toBe(true);
  expect(document.getElementById('rich-evo').textContent).toContain(record.code);
});

it('ignora Centro HHR abierto cuando busca el editor nativo de evolución', () => {
  document.body.innerHTML = `
    <div id="hhr-prescription-print-modal" role="dialog" aria-label="Centro HHR"><textarea></textarea></div>
    <section id="observationEntrySection"><textarea id="evo-area"></textarea></section>`;
  expect(globalThis.HhrChecklistEvolution.editor()).toBe(document.getElementById('evo-area'));
});

it('verifica el episodio, el profesional y el documento de nuevo antes de entregar respuestas a HHR', async () => {
  const url = 'https://fichamedico.rayensalud.cl/dashboard/encounter-list/91';
  const tabs = { connect: vi.fn(), get: vi.fn(async id => id === 1 ? { id, url } : { id, url: 'https://hhr-hospitalizados.app/' }) };
  const broker = globalThis.HhrClinicalChecklistBroker.create({ chrome: { storage: { local: { get: async () => ({ 'hhr-clinical-checklists-enabled': true }) } }, tabs },
    resolveSession: async () => ({ info: { practitionerId: 17 } }), getContext: async () => ({ patient: { run: 'TEST-X', name: 'Paciente ficticio' } }),
    encounterFromUrl: value => new URL(value).pathname.split('/').pop() });
  const sender = { frameId: 0, tab: { id: 1 }, url };
  const base = { encId: '91', actor: '17', document: 'TEST-X', hhrTabId: 2, request: { action: 'apply' } };
  for (const change of [{ actor: '42' }, { document: 'TEST-Y' }, { encId: '92' }]) {
    expect((await broker.handle({ ...base, ...change }, sender)).error).toBeTruthy();
  }
  const staleSender = { ...sender, url: url.replace('/91', '/80') };
  expect(await broker.handle({ ...base, request: { action: 'verify' } }, staleSender)).toMatchObject({ episode: '91', actor: '17', document: 'TEST-X' });
  expect(tabs.connect).not.toHaveBeenCalled();
});

it('reinyecta el relé si la pestaña HHR ya estaba abierta y prueba varias pestañas HHR', async () => {
  const fichaUrl = 'https://fichamedico.rayensalud.cl/dashboard/encounter-list/91';
  const injected = new Set();
  const makePort = tabId => {
    const disconnectHandlers = [];
    const messageHandlers = [];
    const port = {
      onDisconnect: { addListener: fn => disconnectHandlers.push(fn) },
      onMessage: { addListener: fn => messageHandlers.push(fn) },
      postMessage: req => {
        if (req.action === 'templates') {
          queueMicrotask(() => messageHandlers.forEach(fn => fn({ data: { uid: 'u1', authorName: 'Dra. Prueba', templates: [{ id: 't1', title: 'Pauta', version: 1, fields: [] }] } })));
        }
      },
      disconnect: vi.fn(),
    };
    queueMicrotask(() => {
      if (tabId === 2) {
        // First HHR tab is logged out (not_ready).
        messageHandlers.forEach(fn => fn({ unavailable: true, reason: 'not_ready' }));
      } else if (tabId === 3 && !injected.has(3)) {
        // Second HHR tab was already open before reload -> disconnects until reinjected.
        disconnectHandlers.forEach(fn => fn());
      } else if (tabId === 3) {
        messageHandlers.forEach(fn => fn({ ready: true }));
      }
    });
    return port;
  };
  const executeScript = vi.fn(async ({ target }) => {
    injected.add(target.tabId);
  });
  const tabs = {
    get: vi.fn(async id => ({ id, url: fichaUrl, incognito: false, windowId: 1 })),
    query: vi.fn(async () => [
      { id: 2, url: 'https://hhr-hospitalizados.app/', incognito: false, windowId: 1, lastAccessed: 200 },
      { id: 3, url: 'https://hhr-hospitalizados.app/', incognito: false, windowId: 1, lastAccessed: 100 },
    ]),
    connect: vi.fn(tabId => makePort(tabId)),
  };
  const broker = globalThis.HhrClinicalChecklistBroker.create({
    chrome: {
      storage: { local: { get: async () => ({ 'hhr-clinical-checklists-enabled': true }) } },
      tabs,
      scripting: { executeScript },
    },
    resolveSession: async () => ({ info: { practitionerId: 17 } }),
    getContext: async () => ({ patient: { run: 'TEST-X', name: 'Paciente ficticio' } }),
    encounterFromUrl: value => new URL(value).pathname.split('/').pop(),
  });
  const sender = { frameId: 0, tab: { id: 1, incognito: false, windowId: 1 }, url: fichaUrl };
  const result = await broker.handle({ encId: '91', request: { action: 'templates' } }, sender);
  expect(result.error).toBeUndefined();
  expect(result.hhrTabId).toBe(3);
  expect(result.templates).toHaveLength(1);
  expect(executeScript).toHaveBeenCalledWith({
    target: { tabId: 3, frameIds: [0] },
    files: ['hhr-origin-policy.js', 'clinical-checklist-hhr.js'],
  });
});

it('pide abrir HHR con sesión iniciada cuando no hay ninguna pestaña de HHR abierta', async () => {
  const fichaUrl = 'https://fichamedico.rayensalud.cl/dashboard/encounter-list/91';
  const tabs = {
    get: vi.fn(async id => ({ id, url: fichaUrl, incognito: false, windowId: 1 })),
    query: vi.fn(async () => []),
    create: vi.fn(),
    connect: vi.fn(),
  };
  const broker = globalThis.HhrClinicalChecklistBroker.create({
    chrome: { storage: { local: { get: async () => ({ 'hhr-clinical-checklists-enabled': true }) } }, tabs },
    resolveSession: async () => ({ info: { practitionerId: 17 } }),
    getContext: async () => ({ patient: { run: 'TEST-X', name: 'Paciente ficticio' } }),
    encounterFromUrl: value => new URL(value).pathname.split('/').pop(),
  });
  const sender = { frameId: 0, tab: { id: 1, incognito: false, windowId: 1 }, url: fichaUrl };
  const result = await broker.handle({ encId: '91', request: { action: 'templates' } }, sender);
  expect(result.error).toMatch(/Abre HHR Hospitalizados/);
  expect(tabs.create).not.toHaveBeenCalled();
});
