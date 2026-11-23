// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../../extension/hhr-center-preferences.js';
import '../../../extension/hhr-center-panel-runtime.js';
import '../../../extension/hhr-center-shell-runtime.js';
import '../../../extension/hhr-center-patient-context.js';
import '../../../extension/hhr-request-forms.js';
import '../../../extension/hhr-lab-request-patient.js';
import '../../../extension/hhr-lab-center.js';
import '../../../extension/hhr-lab-selection-runtime.js';
import '../../../extension/hhr-document-preview-runtime.js';

const preferencesOwner = globalThis.HhrCenterPreferences;
const setupPreferences = () => {
  const stored = {};
  const storage = { get: vi.fn(async () => structuredClone(stored)),
    set: vi.fn(async value => Object.assign(stored, structuredClone(value))),
    remove: vi.fn(async key => { delete stored[key]; }) };
  const preferences = preferencesOwner.create(storage);
  vi.stubGlobal('HhrCenterPreferences', preferences);
  return { preferences, storage, stored };
};
const rootWithShell = () => {
  const root = document.createElement('div');
  root.id = 'hhr-prescription-print-modal';
  root.dataset.encounterId = '1';
  root.innerHTML = `<section class="hhr-center-dialog">
    <button class="hhr-rx-close">Cerrar</button><header class="hhr-center-header"><strong>Centro HHR</strong></header>
    <div class="hhr-center-patientbar"><span class="hhr-patientbar-tag">Paciente</span><strong class="hhr-patientbar-name">Paciente de prueba</strong><span class="hhr-patientbar-meta"></span><span class="hhr-patientbar-route" hidden></span></div>
    <main class="hhr-center-main"><input aria-label="Solicitud" value="Trabajo en curso"></main></section>`;
  document.body.append(root);
  return root;
};

afterEach(() => {
  document.querySelectorAll('#hhr-prescription-print-modal').forEach(root => {
    root.__hhrDocumentPreview?.dispose(); root.__hhrPanel?.dispose();
  });
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('Centro HHR workspace', () => {
  it('preserves the form while minimizing, resizing and restoring, then releases page space', async () => {
    const { preferences } = setupPreferences();
    await preferences.save({ mode: 'docked' });
    vi.stubGlobal('innerWidth', 1280);
    const root = rootWithShell();
    const form = root.querySelector('input');
    globalThis.HhrCenterPanelRuntime.attach(root);
    await vi.waitFor(() => expect(root.dataset.panelMode).toBe('docked'));
    expect(document.documentElement.dataset.hhrCenterDocked).toBeTruthy();
    const separator = root.querySelector('[role="separator"]');
    const initial = Number(separator.getAttribute('aria-valuenow'));
    separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(Number(separator.getAttribute('aria-valuenow'))).toBe(initial + 20);
    vi.stubGlobal('innerWidth', 600); window.dispatchEvent(new Event('resize'));
    vi.stubGlobal('innerWidth', 1280); window.dispatchEvent(new Event('resize'));
    expect(Number(separator.getAttribute('aria-valuenow'))).toBe(initial + 20);
    root.querySelector('[data-panel="minimize"]').click();
    expect(root.dataset.minimized).toBe('true');
    expect(document.documentElement.dataset.hhrCenterDocked).toBeUndefined();
    root.querySelector('.hhr-center-restore').click();
    expect(root.querySelector('input')).toBe(form);
    expect(form.value).toBe('Trabajo en curso');
    root.remove();
    await vi.waitFor(() => expect(document.documentElement.dataset.hhrCenterDocked).toBeUndefined());
  });

  it('opens centrally after the previous docked default and remembers a new manual choice', async () => {
    const { storage, stored } = setupPreferences();
    stored['hhr-center-presentation-v1-mode'] = 'docked';
    stored['hhr-center-presentation-v1-density'] = 'compact';
    const preferences = preferencesOwner.create(storage);
    vi.stubGlobal('HhrCenterPreferences', preferences);
    vi.stubGlobal('innerWidth', 1280);
    const root = rootWithShell();
    globalThis.HhrCenterPanelRuntime.attach(root);
    await preferences.load();
    expect(root.dataset.panelMode).toBe('floating');
    expect(root.querySelector('.hhr-center-dialog').getAttribute('aria-modal')).toBe('true');
    expect(preferences.get().density).toBe('compact');
    expect(document.documentElement.dataset.hhrCenterDocked).toBeUndefined();
    await preferences.save({ mode: 'docked' });
    expect(root.dataset.panelMode).toBe('docked');
    expect((await preferencesOwner.create(storage).load()).mode).toBe('docked');
  });

  it('saves presentation keys and exam groups, while discarding unrelated values', async () => {
    const { preferences, stored } = setupPreferences();
    await preferences.load();
    expect(await preferences.save({ density: 'compact', width: 640, printFormat: 'compact',
      patient: { name: 'Paciente de prueba' }, unsupportedSetting: 'discard-me' })).toBe(true);
    await preferences.saveGroup({ name: 'Grupo de prueba', keys: ['hemato|HEMOGRAMA'] });
    const saved = preferences.get();
    expect(Object.keys(saved).sort()).toEqual(['density', 'labGroups', 'mode', 'printFormat', 'width']);
    expect(JSON.stringify(stored)).not.toContain('Paciente de prueba');
    expect(JSON.stringify(stored)).not.toContain('discard-me');
    const next = preferencesOwner.create({ get: async () => stored, set: async () => {} });
    expect(await next.load()).toMatchObject({ density: 'compact', width: 640, printFormat: 'compact', labGroups: saved.labGroups });
  });

  it('can save a group after an initial storage read failure is retried', async () => {
    const stored = {};
    const storage = { get: vi.fn().mockRejectedValueOnce(new Error('Storage unavailable')).mockImplementation(async () => stored),
      set: vi.fn(async value => Object.assign(stored, value)) };
    const preferences = preferencesOwner.create(storage);
    await preferences.load();
    expect(await preferences.saveGroup({ name: 'Reintento', keys: ['hematologia|HEMOGRAMA'] })).toBe(true);
    expect((await preferences.reloadGroups()).map(group => group.name)).toEqual(['Reintento']);
  });

  it('does not let a late storage read overwrite a new user preference', async () => {
    let resolve;
    const pending = new Promise(next => { resolve = next; });
    const set = vi.fn(async () => {});
    const preferences = preferencesOwner.create({ get: () => pending, set });
    const loading = preferences.load();
    const saving = preferences.save({ width: 680 });
    resolve({ 'hhr-center-presentation-v1-width': 400, 'hhr-center-presentation-v1-density': 'compact' });
    await loading; await saving;
    expect(preferences.get()).toMatchObject({ width: 680, density: 'compact' });
    expect(set.mock.calls[0][0]['hhr-center-presentation-v1-width']).toBe(680);
  });

  it('keeps selected exams through filtering and adds a group without losing existing selections', async () => {
    const { preferences } = setupPreferences();
    await preferences.load();
    await preferences.saveGroup({ name: 'Personal', keys: ['inmuno|PROTEINA C REACTIVA'] });
    const main = document.createElement('main');
    main.innerHTML = `<div class="hhr-labreq-grid">
      <section><label class="hhr-labreq-exam"><input type="checkbox" data-key="bio|CREATININA" checked>CREATININA</label></section>
      <section><label class="hhr-labreq-exam"><input type="checkbox" data-key="inmuno|PROTEINA C REACTIVA">PROTEINA C REACTIVA</label></section></div>`;
    document.body.append(main);
    const changed = vi.fn();
    globalThis.HhrLabSelectionRuntime.attach(main, changed);
    const search = main.querySelector('input[type="search"]');
    search.value = 'pcr'; search.dispatchEvent(new Event('input'));
    expect(main.querySelector('[data-key="bio|CREATININA"]').checked).toBe(true);
    expect(main.querySelectorAll('.hhr-labreq-selected button')).toHaveLength(1);
    main.querySelector('select').value = preferences.groupId('Personal');
    main.querySelector('select').dispatchEvent(new Event('change'));
    main.querySelector('[data-group="apply"]').click();
    await vi.waitFor(() => expect(main.querySelectorAll('.hhr-labreq-exam input:checked')).toHaveLength(2));
    main.querySelector('[data-group="apply"]').click();
    expect(main.querySelectorAll('.hhr-labreq-exam input:checked')).toHaveLength(2);
    main.querySelector('[aria-label="Quitar CREATININA"]').click();
    expect(main.querySelector('[data-key="bio|CREATININA"]').checked).toBe(false);
  });

  it('discards a pending group action when its laboratory form is replaced', async () => {
    const { preferences } = setupPreferences();
    await preferences.saveGroup({ name: 'Personal', keys: ['bio|CREATININA'] });
    let finish;
    const pending = new Promise(resolve => { finish = resolve; });
    vi.stubGlobal('HhrCenterPreferences', { ...preferences, reloadGroups: () => pending });
    const root = rootWithShell(), main = root.querySelector('main');
    main.innerHTML = '<div class="hhr-labreq-grid"><section><label class="hhr-labreq-exam"><input type="checkbox" data-key="bio|CREATININA">CREATININA</label></section></div>';
    const changed = vi.fn(() => { root.querySelector('.hhr-patientbar-name').textContent = 'Paciente A'; });
    globalThis.HhrLabSelectionRuntime.attach(main, changed);
    main.querySelector('select').value = preferences.groupId('Personal');
    main.querySelector('[data-group="apply"]').click();
    main.replaceChildren(); root.querySelector('.hhr-patientbar-name').textContent = 'Paciente B';
    finish(); await pending; await Promise.resolve();
    expect(changed).not.toHaveBeenCalled();
    expect(root.querySelector('.hhr-patientbar-name').textContent).toBe('Paciente B');
  });

  it('preserves groups across other-tab settings and concurrent independent group saves', async () => {
    const { storage } = setupPreferences();
    const a = preferencesOwner.create(storage), b = preferencesOwner.create(storage);
    await Promise.all([a.load(), b.load()]);
    await a.saveGroup({ name: 'Primero', keys: ['hematologia|HEMOGRAMA'] });
    await b.save({ width: 640 });
    expect(await b.reloadGroups()).toHaveLength(1);
    await Promise.all([
      a.saveGroup({ name: 'Segundo', keys: ['bioquimica|CREATININA'] }),
      b.saveGroup({ name: 'Tercero', keys: ['inmunologia|PROTEINA C REACTIVA'] }),
    ]);
    expect(await a.reloadGroups()).toHaveLength(3);
    await b.removeGroup('Tercero');
    expect((await a.reloadGroups()).map(group => group.name)).toEqual(['Primero', 'Segundo']);
  });

  it('keeps every acknowledged group visible when two tabs save near the group limit', async () => {
    const { storage, stored } = setupPreferences();
    const a = preferencesOwner.create(storage), b = preferencesOwner.create(storage);
    for (let index = 0; index < 19; index += 1) {
      stored[a.groupId('Grupo ' + index)] = { name: 'Grupo ' + index, keys: ['hemato|HEMOGRAMA'] };
    }
    await Promise.all([a.load(), b.load()]);
    expect(await Promise.all([
      a.saveGroup({ name: 'Nuevo A', keys: ['bio|CREATININA'] }),
      b.saveGroup({ name: 'Nuevo B', keys: ['inmuno|PROTEINA C REACTIVA'] }),
    ])).toEqual([true, true]);
    const reloaded = await preferencesOwner.create(storage).load();
    expect(reloaded.labGroups).toHaveLength(21);
    expect(reloaded.labGroups.map(group => group.name)).toEqual(expect.arrayContaining(['Nuevo A', 'Nuevo B']));
    expect(await a.saveGroup({ name: 'Otro', keys: ['bio|CREATININA'] })).toBe(false);
    expect(await b.removeGroup('Nuevo A')).toBe(true);
    expect((await a.reloadGroups()).map(group => group.name)).toContain('Nuevo B');
  });

  it('does not trap Tab while a narrow floating panel is minimized', () => {
    setupPreferences();
    vi.stubGlobal('innerWidth', 600);
    const trap = vi.fn();
    const noop = () => {};
    const shell = globalThis.HhrCenterShellRuntime.create({
      modalId: 'hhr-prescription-print-modal', closeModal: () => true, ensureStyles: noop,
      getClinicalGuard: () => ({}), trapModalFocus: trap, currentRouteEncounterId: () => '1',
      runClinicalTransition: (_root, action) => action(), normalizedText: String,
      sendMessage: async () => ({}), runtimeMessages: {}, openPrescriptionCenter: noop,
      openHospitalizedDocuments: noop, openOperationsCenter: noop,
    });
    const root = shell.prepareCenterModalRoot({ activeModule: 'home', encId: '1' });
    expect(root.dataset.panelMode).toBe('floating');
    root.querySelector('[data-panel="minimize"]').click();
    root.querySelector('.hhr-center-restore').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(trap).not.toHaveBeenCalled();
    root.querySelector('.hhr-center-restore').click();
    root.querySelector('[data-panel="minimize"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(trap).toHaveBeenCalledTimes(1);
  });

  it('keeps the current patient when an earlier laboratory header resolves late', async () => {
    setupPreferences();
    const root = rootWithShell();
    root.dataset.activeModule = 'lab';
    let resolveFirst, resolveSecond;
    const first = new Promise(resolve => { resolveFirst = resolve; });
    const second = new Promise(resolve => { resolveSecond = resolve; });
    const runtime = globalThis.HhrLabCenterRuntime.create({
      requestForms: globalThis.HhrRequestForms, labRequestPatient: globalThis.HhrLabRequestPatient,
      runtimeMessages: {}, runClinicalTransition: (_root, action) => action(), normalizedText: String,
      sendMessage: async () => ({}), setLiveRegion: (node, text) => { node.textContent = text; },
      fetchPatientHeaderView: id => id === '1' ? first : second,
    });
    root.dataset.selectedEncounterId = '1'; runtime.renderLabRequestView(root, '1');
    root.dataset.selectedEncounterId = '2'; runtime.renderLabRequestView(root, '2');
    resolveSecond({ patient: { name: 'Paciente B' }, view: {} });
    await vi.waitFor(() => expect(root.querySelector('.hhr-patientbar-name').textContent).toBe('Paciente B'));
    resolveFirst({ patient: { name: 'Paciente A' }, view: {} });
    await first; await Promise.resolve();
    expect(root.querySelector('.hhr-patientbar-name').textContent).toBe('Paciente B');
    expect(root.dataset.hhrContextEncounter).toBe('2');
    expect(root.querySelector('.hhr-center-patientbar').textContent).not.toContain('Episodio 2');
  });

  it('keeps a current route mismatch visible after laboratory form edits', () => {
    setupPreferences();
    let routeId = '1';
    vi.stubGlobal('HhrPrescriptionPrint', { resolveEncounterId: () => routeId });
    const root = rootWithShell(); root.dataset.activeModule = 'lab'; root.dataset.selectedEncounterId = '1';
    const runtime = globalThis.HhrLabCenterRuntime.create({
      requestForms: globalThis.HhrRequestForms, labRequestPatient: globalThis.HhrLabRequestPatient,
      runtimeMessages: {}, runClinicalTransition: (_root, action) => action(), normalizedText: String,
      sendMessage: async () => ({}), setLiveRegion: (node, text) => { node.textContent = text; },
      fetchPatientHeaderView: async () => ({ patient: { name: 'Paciente de prueba' }, view: {} }),
    });
    runtime.renderLabRequestView(root, '1');
    routeId = '2'; globalThis.HhrCenterPatientContext.refreshRoute(root, routeId);
    expect(root.querySelector('.hhr-patientbar-route').hidden).toBe(false);
    const other = root.querySelector('.hhr-labreq-otros');
    other.value = 'Examen de prueba'; other.dispatchEvent(new Event('input', { bubbles: true }));
    expect(root.querySelector('.hhr-patientbar-route').hidden).toBe(false);
  });

  it('does not allow pagination to cancel initial PDF rendering', async () => {
    const root = rootWithShell();
    let finish, reject;
    const initialRender = new Promise((resolve, fail) => { finish = resolve; reject = fail; });
    const cancel = vi.fn(() => { const error = new Error('cancelled'); error.name = 'RenderingCancelledException'; reject(error); });
    const render = vi.fn(() => ({ promise: initialRender, cancel }));
    const pdf = { numPages: 2, getPage: vi.fn(async () => ({ getViewport: () => ({ width: 100, height: 100 }), render })) };
    const library = { getDocument: () => ({ promise: Promise.resolve(pdf), destroy: async () => {} }) };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({}));
    globalThis.HhrDocumentPreviewRuntime.open({ root, title: 'Documento de prueba',
      load: async () => ({ jobId: 'synthetic-render-job', pdfBase64: 'JVBERg==' }),
      loadPdfLibrary: async () => library, sendMessage: async () => ({ ok: true }), runtimeMessages: {} });
    await vi.waitFor(() => expect(render).toHaveBeenCalledTimes(1));
    expect(root.querySelector('.hhr-preview-page-controls').hidden).toBe(true);
    root.querySelector('[data-page="1"]').click();
    expect(cancel).not.toHaveBeenCalled();
    finish();
    await vi.waitFor(() => expect(root.querySelector('[data-preview="print"]').disabled).toBe(false));
    expect(root.querySelector('.hhr-preview-page-controls').hidden).toBe(false);
    expect(root.querySelector('[data-preview="print"]').textContent).toBe('Imprimir');
  });

  it.each([{ ok: true }, { error: 'Old print failed' }])('ignores a previous format print completion: %j', async completion => {
    const root = rootWithShell();
    let finishPrint;
    const printing = new Promise(resolve => { finishPrint = resolve; });
    const sendMessage = vi.fn(request => request.operation === 'print' && request.jobId === 'standard'
      ? printing : Promise.resolve({ ok: true }));
    const library = { getDocument: () => ({ promise: Promise.resolve({ numPages: 1,
      getPage: async () => ({ getViewport: () => ({ width: 100, height: 100 }),
        render: () => ({ promise: Promise.resolve(), cancel: () => {} }) }) }), destroy: async () => {} }) };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({}));
    globalThis.HhrDocumentPreviewRuntime.open({ root, title: 'Documento de prueba', formats: true,
      load: async format => ({ jobId: format, pdfBase64: 'JVBERg==' }),
      loadPdfLibrary: async () => library, sendMessage, runtimeMessages: { DOCUMENT_PREVIEW_REQUEST: 'preview' } });
    const button = root.querySelector('[data-preview="print"]');
    await vi.waitFor(() => expect(button.disabled).toBe(false));
    button.click();
    root.querySelector('[data-format="compact"]').click();
    await vi.waitFor(() => expect(button.disabled).toBe(false));
    const ready = root.querySelector('.hhr-preview-status').textContent;
    finishPrint(completion); await printing; await Promise.resolve();
    expect(root.querySelector('.hhr-preview-status').textContent).toBe(ready);
    expect(button.textContent).toBe('Imprimir');
    button.click();
    await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledWith({ type: 'preview', jobId: 'compact', operation: 'print' }));
  });

  it('shows a route mismatch only for a bound episode, not manual or census documents', () => {
    const root = rootWithShell();
    const context = globalThis.HhrCenterPatientContext;
    context.set(root, { encId: '1', patient: { name: 'Paciente de prueba' } });
    context.refreshRoute(root, '2');
    expect(root.querySelector('.hhr-patientbar-route').hidden).toBe(false);
    context.set(root, { patient: { name: 'Paciente nuevo' } }); context.refreshRoute(root, '2');
    expect(root.querySelector('.hhr-patientbar-route').hidden).toBe(true);
    context.set(root, { encId: '1', bulk: true }); context.refreshRoute(root, '2');
    expect(root.querySelector('.hhr-patientbar-route').hidden).toBe(true);
  });

  it.each(['PREVIEW_TOO_LARGE', 'PREVIEW_STORAGE_UNAVAILABLE'])('preserves direct printing for %s and reports skipped patients', async errorCode => {
    const root = rootWithShell();
    const printDirect = vi.fn(async () => ({ ok: true, skipped: [{}] }));
    globalThis.HhrDocumentPreviewRuntime.open({ root, title: 'Lote de prueba',
      load: async () => ({ error: 'Vista previa no disponible.', errorCode }),
      printDirect, format: 'compact', sendMessage: vi.fn(), runtimeMessages: {} });
    const button = root.querySelector('[data-preview="print"]');
    await vi.waitFor(() => expect(button.textContent).toBe('Imprimir sin vista previa'));
    button.click();
    await vi.waitFor(() => expect(printDirect).toHaveBeenCalledWith('compact'));
    expect(root.querySelector('.hhr-preview-status').textContent).toContain('1 paciente no se pudo incluir');
  });

  it('discards and releases a PDF response arriving after the preview was closed', async () => {
    const root = rootWithShell();
    let resolve;
    const load = () => new Promise(next => { resolve = next; });
    const sendMessage = vi.fn(async () => ({ ok: true }));
    globalThis.HhrDocumentPreviewRuntime.open({ root, title: 'Prueba', load, sendMessage,
      runtimeMessages: { DOCUMENT_PREVIEW_REQUEST: 'preview' } });
    root.querySelector('[data-preview="back"]').click();
    resolve({ jobId: 'synthetic-job', pdfBase64: 'not-used' });
    await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledWith({ type: 'preview', operation: 'release', jobId: 'synthetic-job' }));
    expect(root.querySelector('.hhr-document-preview')).toBeNull();
    expect(root.querySelector('input').inert).not.toBe(true);
  });
});
