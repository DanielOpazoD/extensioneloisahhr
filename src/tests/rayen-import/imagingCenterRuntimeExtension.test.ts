// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import '../../../extension/centro/hhr-lab-request-patient.js';
import '../../../extension/listas/hhr-favorite-links.js';
import '../../../extension/centro/hhr-imaging-request-view.js';
import '../../../extension/centro/hhr-imaging-center.js';

type Runtime = {
  renderImagingCenter: (root: HTMLElement, encId: string, flow?: 'request' | 'reports') => void;
};

type RuntimeOwner = {
  create: (dependencies: Record<string, unknown>) => Runtime;
};

const runtimeOwner = () =>
  (globalThis as unknown as { HhrImagingCenterRuntime: RuntimeOwner }).HhrImagingCenterRuntime;

const runtimeMessages = {
  IMAGING_FORM_PRINT_REQUEST: 'RAYEN_IMAGING_FORM_PRINT_REQUEST',
  LOCAL_IMAGING_FORM_PRINT_REQUEST: 'RAYEN_LOCAL_IMAGING_FORM_PRINT_REQUEST',
};

const requestForms = {
  buildPatientView: (patient: {name?: string}) => ({ name: patient.name || '' }),
  IMAGING_DOCUMENTS: {
    solicitud: {
      id: 'solicitud',
      title: 'Solicitud',
      image: 'forms/solicitud_imagenologia.png',
      aspectRatio: '1 / 1.4',
      overlays: (patient: { name: string }, physician: string) => [
        { text: patient.name, left: '10%', top: '12%', bold: true },
        { text: physician, left: '10%', top: '18%' },
      ],
    },
    encuesta: {
      id: 'encuesta',
      title: 'Encuesta',
      image: 'forms/encuesta_imagenologia.png',
      aspectRatio: '1 / 1.4',
      overlays: () => [],
    },
    consentimiento: {
      id: 'consentimiento',
      title: 'Consentimiento',
      image: 'forms/consentimiento.png',
      aspectRatio: '1 / 1.4',
      overlays: () => [],
    },
  },
};

const makeRoot = () => {
  const root = document.createElement('div');
  root.dataset.activeModule = 'imaging';
  root.innerHTML = '<main class="hhr-center-main"></main>';
  document.body.appendChild(root);
  return root;
};

const makeDependencies = (
  sendMessage: (message: Record<string, unknown>) => Promise<unknown>,
  fetchPatientHeaderView: () => Promise<unknown> = vi.fn(async () => ({
    patient: { name: 'Ana Riroroko' },
    view: { name: 'Ana Riroroko' },
  }))
) => ({
  requestForms,
  runtimeMessages,
  sendMessage,
  setLiveRegion: (element: HTMLElement, text: string, state = '') => {
    element.textContent = text;
    element.dataset.state = state;
  },
  fetchPatientHeaderView,
});

describe('Centro HHR imaging runtime', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('fails closed and is loaded before its content-script consumer', () => {
    expect(() => runtimeOwner().create({})).toThrow(/Centro de Imágenes HHR/);
    expect(Object.isFrozen(runtimeOwner())).toBe(true);

    const manifest = JSON.parse(readFileSync(path.resolve('extension/manifest.json'), 'utf8')) as {
      content_scripts?: Array<{ js?: string[] }>;
    };
    const scripts =
      manifest.content_scripts?.find(entry => entry.js?.includes('contenido/content-prescription-print.js'))
        ?.js || [];
    const contentSource = readFileSync(
      path.resolve('extension/contenido/content-prescription-print.js'),
      'utf8'
    );
    const ownerSource = readFileSync(path.resolve('extension/centro/hhr-imaging-center.js'), 'utf8');

    expect(scripts.indexOf('centro/hhr-imaging-center.js')).toBeGreaterThan(-1);
    expect(scripts.indexOf('centro/hhr-imaging-center.js')).toBeLessThan(
      scripts.indexOf('contenido/content-prescription-print.js')
    );
    expect(contentSource).toContain('const imagingCenterRuntime = imagingCenterOwner');
    expect(contentSource).toContain('if (!imagingCenterRuntime) {');
    expect(contentSource).toContain('imagingCenterRuntime.renderImagingCenter(root, targetEncId, selectedFlow)');
    expect(contentSource).not.toContain('const renderImagingCenter =');
    expect(contentSource.split('\n').length).toBeLessThanOrEqual(2_250);
    expect(ownerSource.split('\n').length).toBeLessThanOrEqual(350);
  });

  it.each(['', '141121'])('opens only the official radiology portal from reports (episode %s)', encId => {
    const send = vi.fn(async () => ({}));
    const header = vi.fn(async () => ({}));
    const root = makeRoot();
    runtimeOwner().create(makeDependencies(send, header)).renderImagingCenter(root, encId, 'reports');
    const link = root.querySelector<HTMLAnchorElement>('.hhr-imaging-reports a')!;
    expect(link.textContent).toContain('Abrir MMRAD');
    expect(link.href).toBe('https://ris.mmrad.cl/web/guest');
    expect(link.target).toBe('_blank');
    expect(link.relList.contains('noreferrer')).toBe(true);
    expect(link.relList.contains('noopener')).toBe(true);
    expect(header).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(root.querySelector('.hhr-imaging-print')).toBeNull();
  });

  it('preserves patient overlays, pointer and keyboard marks, text focus and print payloads', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('chrome', {
      runtime: { getURL: (value: string) => `chrome-extension://test/${value}` },
    });
    const messages: Array<Record<string, unknown>> = [];
    const sendMessage = vi.fn(async (message: Record<string, unknown>) => {
      messages.push(message);
      return { ok: true };
    });
    const root = makeRoot();

    runtimeOwner().create(makeDependencies(sendMessage)).renderImagingCenter(root, '141121');
    await Promise.resolve();
    await Promise.resolve();

    const canvas = root.querySelector<HTMLElement>('.hhr-imaging-canvas') as HTMLElement;
    const physician = root.querySelector<HTMLInputElement>(
      '.hhr-imaging-physician'
    ) as HTMLInputElement;
    const print = root.querySelector<HTMLButtonElement>('.hhr-imaging-print') as HTMLButtonElement;
    expect(print.disabled).toBe(false);
    expect(root.querySelector('.hhr-imaging-overlay')?.textContent).toBe('Ana Riroroko');
    expect(root.querySelector<HTMLImageElement>('.hhr-imaging-image')?.src).toContain(
      'forms/solicitud_imagenologia.png'
    );

    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 200,
      bottom: 100,
      width: 200,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    canvas.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: 50,
        clientY: 25,
      })
    );
    expect(root.querySelector<HTMLElement>('.hhr-imaging-mark')?.style.left).toBe('25%');
    expect(root.querySelector<HTMLElement>('.hhr-imaging-mark')?.style.top).toBe('25%');

    canvas.focus();
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(root.querySelectorAll('.hhr-imaging-mark')).toHaveLength(2);

    root.querySelector<HTMLButtonElement>('[data-tool="text"]')?.click();
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const editor = root.querySelector<HTMLInputElement>(
      '.hhr-imaging-text-editor'
    ) as HTMLInputElement;
    const canvasFocus = vi.spyOn(canvas, 'focus');
    editor.value = 'perfil derecho';
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    vi.runAllTimers();
    expect(canvasFocus).toHaveBeenCalledWith({ preventScroll: true });
    expect(Array.from(root.querySelectorAll('.hhr-imaging-mark')).at(-1)?.textContent).toBe(
      'PERFIL DERECHO'
    );

    physician.value = 'Dr. Riroroko';
    physician.dispatchEvent(new Event('input', { bubbles: true }));
    print.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(messages).toEqual([
      {
        type: runtimeMessages.IMAGING_FORM_PRINT_REQUEST,
        encId: '141121',
        doc: 'solicitud',
        physician: 'Dr. Riroroko',
        marks: [
          { x: 25, y: 25 },
          { x: 51, y: 50 },
          { x: 51, y: 50, text: 'perfil derecho' },
        ],
      },
    ]);
    expect(print.textContent).toBe('Imprimir');
    expect(root.querySelector('.hhr-imaging-feedback')?.textContent).toContain('Se abrió el PDF');
  });

  it.each(['', '141121'])('keeps a blank order independent of the clinical header (episode %s)', async encId => {
    let resolveHeader: ((value: unknown) => void) | undefined;
    const header = vi.fn(() => new Promise(resolve => { resolveHeader = resolve; }));
    const send = vi.fn(async () => ({ok:true}));
    const root = makeRoot();
    runtimeOwner().create(makeDependencies(send, header)).renderImagingCenter(root, encId);
    root.querySelector<HTMLInputElement>('input[value="blank"]')!.click();
    resolveHeader?.({ patient: { name: 'Nombre de la ficha' }, view: { name: 'Nombre de la ficha' } });
    await Promise.resolve();
    expect(header).toHaveBeenCalledTimes(encId ? 1 : 0);
    expect(root.querySelector('.hhr-imaging-overlays')?.textContent).not.toContain('Nombre de la ficha');
    root.querySelector<HTMLButtonElement>('.hhr-imaging-print')!.click();
    expect(send).toHaveBeenCalledWith({
      type: runtimeMessages.LOCAL_IMAGING_FORM_PRINT_REQUEST, source:'blank', patient:{},
      doc:'solicitud', marks:[], physician:'',
    });
  });

  it.each([
    ['current', 'Ana Riroroko'], ['manual', 'Nombre de prueba'], ['blank', 'Sin identificación'],
  ])('folds %s data only after an annotation and reopens the same fields', async (source, label) => {
    const root = makeRoot();
    runtimeOwner().create(makeDependencies(vi.fn())).renderImagingCenter(root, '141121');
    await Promise.resolve();
    const canvas = root.querySelector<HTMLElement>('.hhr-imaging-canvas')!;
    const fields = root.querySelector<HTMLElement>('.hhr-labreq-patient')!;
    const name = root.querySelector<HTMLInputElement>('[data-manual="name"]')!;
    if (source !== 'current') root.querySelector<HTMLInputElement>(`input[value="${source}"]`)!.click();
    if (source === 'manual') {
      name.value = label;
      root.querySelector<HTMLInputElement>('[data-manual="run"]')!.value = 'PAS-TEST-2';
      name.dispatchEvent(new Event('input', { bubbles: true }));
    }
    root.querySelector<HTMLButtonElement>('[data-sheet-fit="page"]')!.click();
    expect(root.querySelector('.hhr-imaging-stage')?.getAttribute('data-fit')).toBe('page');
    canvas.focus();
    root.querySelector<HTMLButtonElement>('[data-tool="text"]')!.click();
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    root.querySelector('.hhr-imaging-text-editor')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fields.hidden).toBe(false);
    expect(root.querySelector('.hhr-imaging-mark')).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-tool="cross"]')!.click();
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(fields.hidden).toBe(true);
    expect(root.querySelector('.hhr-imaging-patient-name')?.textContent).toBe(label);
    expect(root.querySelector('.hhr-imaging-patient-id')?.textContent).toBe(source === 'manual' ? 'PAS-TEST-2' : '');
    root.querySelector<HTMLButtonElement>('[data-sheet-fit="width"]')!.click();
    expect(root.querySelectorAll('.hhr-imaging-mark')).toHaveLength(1);
    root.querySelector<HTMLButtonElement>('.hhr-imaging-edit')!.click();
    expect(fields.hidden).toBe(false);
    expect(fields.contains(document.activeElement)).toBe(true);
    if (source === 'manual') expect(name.value).toBe(label);
    expect(root.querySelector<HTMLInputElement>('input[name="hhr-labreq-patient-source"]:checked')?.value).toBe(source);
  });

  it('shows a custom passport only once when the name is empty', () => {
    const root = makeRoot();
    runtimeOwner().create(makeDependencies(vi.fn())).renderImagingCenter(root, '');
    const id = root.querySelector<HTMLInputElement>('[data-manual="run"]')!;
    id.value = 'PAS-TEST-2';
    id.dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector('.hhr-imaging-canvas')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(root.querySelector('.hhr-imaging-patient-name')?.textContent).toBe(id.value);
    expect(root.querySelector<HTMLElement>('.hhr-imaging-patient-id')?.hidden).toBe(true);
  });

  it('ignores a late patient response after the imaging root is replaced', async () => {
    let resolvePatient: ((value: unknown) => void) | undefined;
    const fetchPatientHeaderView = vi.fn(
      () =>
        new Promise(resolve => {
          resolvePatient = resolve;
        })
    );
    const root = makeRoot();
    runtimeOwner()
      .create(
        makeDependencies(
          vi.fn(async () => ({ ok: true })),
          fetchPatientHeaderView
        )
      )
      .renderImagingCenter(root, '141121');

    root.dataset.activeModule = 'lab';
    resolvePatient?.({ patient: { name: 'Ana' }, view: { name: 'Ana' } });
    await Promise.resolve();
    await Promise.resolve();

    expect(root.querySelector<HTMLButtonElement>('.hhr-imaging-print')?.disabled).toBe(true);
    expect(root.querySelector('.hhr-imaging-overlay')).toBeNull();
  });

  it('scrolls only the sheet to keep keyboard annotations in view', async () => {
    const root = makeRoot();
    runtimeOwner().create(makeDependencies(vi.fn())).renderImagingCenter(root, '141121');
    await Promise.resolve();
    const canvas = root.querySelector<HTMLElement>('.hhr-imaging-canvas')!;
    const stage = root.querySelector<HTMLElement>('.hhr-imaging-stage')!;
    const pane = root.querySelector<HTMLElement>('.hhr-center-content')!;
    const rect = (top: number, height: number) => ({ left: 0, right: 300, width: 300, top, bottom: top + height, height, x: 0, y: top, toJSON: () => ({}) });
    vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue(rect(100, 300));
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect(450, 18));
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(stage.scrollTop).toBe(68);
    expect(pane.scrollTop).toBe(0);
    expect(root.scrollTop).toBe(0);
  });
});
