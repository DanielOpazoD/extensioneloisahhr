// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../../extension/hhr-center-shell-runtime.js';
import '../../../extension/hhr-lab-request-patient.js';

type Runtime = {
  openCenterModule: (module: string | undefined, encId: string, trigger?: HTMLElement) => void;
  prepareCenterModalRoot: (options: {
    existingRoot?: HTMLElement | null;
    activeModule: string;
    encId: string;
    focusReturnTarget?: HTMLElement | null;
  }) => HTMLElement | null;
  setupCenterPatientContext: (
    root: HTMLElement,
    module: string,
    initialEncId: string,
    renderModule: (encId: string) => void
  ) => void;
};

type RuntimeOwner = {
  create: (dependencies: Record<string, unknown>) => Runtime;
};

const owner = () =>
  (globalThis as unknown as { HhrCenterShellRuntime: RuntimeOwner }).HhrCenterShellRuntime;

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(next => {
    resolve = next;
  });
  return { promise, resolve };
};

const createRuntime = (overrides: Record<string, unknown> = {}) => {
  const openOperationsCenter = vi.fn(
    (module: string, encId: string, _trigger?: HTMLElement, existingRoot?: HTMLElement) => {
      const root = runtime.prepareCenterModalRoot({
        existingRoot,
        activeModule: module,
        encId,
        focusReturnTarget: null,
      });
      if (root) root.querySelector('.hhr-center-main')!.textContent = module;
    }
  );
  const runtime = owner().create({
    modalId: 'hhr-prescription-print-modal',
    closeModal: vi.fn(() => true),
    ensureStyles: vi.fn(),
    getClinicalGuard: vi.fn(() => ({})),
    runClinicalTransition: (_root: HTMLElement, action: () => void) => {
      action();
      return true;
    },
    trapModalFocus: vi.fn(),
    currentRouteEncounterId: vi.fn(() => '141121'),
    normalizedText: (value: unknown) =>
      String(value || '')
        .trim()
        .toLowerCase(),
    sendMessage: vi.fn(async () => ({})),
    runtimeMessages: {
      PATIENT_HEADER_REQUEST: 'PATIENT_HEADER_REQUEST',
      CENSUS_LIST_REQUEST: 'CENSUS_LIST_REQUEST',
    },
    openPrescriptionCenter: vi.fn(),
    openHospitalizedDocuments: vi.fn(),
    openOperationsCenter,
    ...overrides,
  });
  return { runtime, openOperationsCenter };
};

describe('Centro HHR shared shell runtime', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each(['lab', 'imaging', 'connection'])(
    'keeps the same modal root and focuses the active nav item when opening %s',
    module => {
      const { runtime } = createRuntime();
      const root = runtime.prepareCenterModalRoot({
        activeModule: 'home',
        encId: '141121',
        focusReturnTarget: null,
      })!;

      root.querySelector<HTMLButtonElement>(`[data-module="${module}"]`)!.click();

      expect(document.getElementById('hhr-prescription-print-modal')).toBe(root);
      expect(root.dataset.encounterId).toBe('141121');
      expect(root.dataset.activeModule).toBe(module);
      expect(root.querySelector('.hhr-center-main')?.textContent).toBe(module);
      expect(document.activeElement).toBe(
        root.querySelector(`[data-module="${module}"][aria-current="page"]`)
      );
    }
  );

  it('restores focus after dismissing the unique root', () => {
    vi.useFakeTimers();
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const { runtime } = createRuntime();
    const root = runtime.prepareCenterModalRoot({
      activeModule: 'home',
      encId: '141121',
      focusReturnTarget: trigger,
    })!;

    root.querySelector<HTMLButtonElement>('.hhr-rx-close')!.click();
    vi.runAllTimers();

    expect(root.isConnected).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  const renderOrders = (root: HTMLElement, encId: string) => {
    const patient = (globalThis as unknown as {
      HhrLabRequestPatient: { sectionHtml: (id: string) => string };
    }).HhrLabRequestPatient;
    root.querySelector('main')!.innerHTML = patient.sectionHtml(encId);
  };

  it.each(['lab', 'imaging'])('opens the census from %s without a chart and commits only an explicit choice', async module => {
    const census = deferred<Record<string, unknown>>();
    const sendMessage = vi.fn(() => census.promise);
    const { runtime } = createRuntime({ sendMessage, currentRouteEncounterId: () => '' });
    const root = runtime.prepareCenterModalRoot({ activeModule: module, encId: '' })!;
    const renderModule = vi.fn((id: string) => renderOrders(root, id));
    renderOrders(root, '');
    runtime.setupCenterPatientContext(root, module, '', renderModule);
    const button = root.querySelector<HTMLButtonElement>('.hhr-census-trigger')!;
    const source = () => root.querySelector<HTMLInputElement>('input[type=radio]:checked')!.value;
    expect(root.querySelector('.hhr-center-patientbar')).toBeNull();
    expect(sendMessage).not.toHaveBeenCalled();
    button.click();
    expect(source()).toBe('manual');
    expect(document.activeElement).toBe(root.querySelector('input[type=search]'));
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.isConnected).toBe(true);
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    census.resolve({ patients: [
      { encounterId: '101', name: 'Paciente Prueba', run: 'DOC-A', bed: 'C1' },
      { encounterId: '102', name: 'Paciente Prueba', run: 'PAS-B', bed: 'C2' },
      { encounterId: '', name: 'Sin episodio', run: 'PAS-B', bed: 'C3' },
    ] });
    await Promise.resolve();
    expect(root.querySelector('[role=listbox]')).toBeNull();
    button.click();
    const search = root.querySelector<HTMLInputElement>('input[type=search]')!;
    await vi.waitFor(() => expect(root.querySelectorAll('[role=option]')).toHaveLength(2));
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(document.activeElement).toBe(root.querySelector('[role=option]'));
    expect(renderModule).not.toHaveBeenCalled();
    search.focus();
    search.value = 'pasb';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(root.querySelectorAll('[role=option]')).toHaveLength(1);
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(renderModule).toHaveBeenCalledWith('102', undefined);
    expect(root.dataset.selectedEncounterId).toBe('102');
    expect(source()).toBe('current');
    expect(document.activeElement).toBe(root.querySelector('.hhr-census-trigger'));
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({ type: 'CENSUS_LIST_REQUEST', currentEncId: '' });
  });

  it('can reselect the open chart after a census error and retries on the next open', async () => {
    const sendMessage = vi.fn()
      .mockResolvedValueOnce({ error: 'Censo no disponible' })
      .mockResolvedValueOnce({ patients: [{ encounterId: '141121', name: 'Paciente de prueba' }] });
    const { runtime } = createRuntime({ sendMessage });
    const root = runtime.prepareCenterModalRoot({ activeModule: 'lab', encId: '141121' })!;
    renderOrders(root, '141121');
    const renderModule = vi.fn();
    runtime.setupCenterPatientContext(root, 'lab', '141121', renderModule);
    const button = root.querySelector<HTMLButtonElement>('.hhr-census-trigger')!;
    const blank = root.querySelector<HTMLInputElement>('input[value=blank]')!;
    blank.click();
    button.click();
    await vi.waitFor(() => expect(root.querySelector('[role=status]')?.textContent).toBe('Censo no disponible'));
    expect(blank.checked).toBe(true);
    root.querySelector<HTMLButtonElement>('.hhr-census-current')!.click();
    expect(root.querySelector<HTMLInputElement>('input[value=current]')!.checked).toBe(true);
    expect(renderModule).not.toHaveBeenCalled();
    button.click();
    await vi.waitFor(() => expect(root.querySelector('[role=option]')?.textContent).toContain('Paciente de prueba'));
    expect(root.querySelector<HTMLElement>('.hhr-census-current')!.hidden).toBe(true);
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it('loads before the orchestrator and stays within its explicit line budget', () => {
    const manifest = JSON.parse(readFileSync(path.resolve('extension/manifest.json'), 'utf8')) as {
      content_scripts?: Array<{ js?: string[] }>;
    };
    const scripts =
      (manifest.content_scripts || []).find(entry =>
        entry.js?.includes('content-prescription-print.js')
      )?.js || [];
    const source = readFileSync(path.resolve('extension/hhr-center-shell-runtime.js'), 'utf8');

    expect(scripts.indexOf('hhr-center-shell-runtime.js')).toBeLessThan(
      scripts.indexOf('content-prescription-print.js')
    );
    expect(source.split('\n').length).toBeLessThanOrEqual(400);
    expect(Object.isFrozen(owner())).toBe(true);
    expect(Object.isFrozen(createRuntime().runtime)).toBe(true);
  });
});
