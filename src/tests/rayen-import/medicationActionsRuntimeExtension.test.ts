// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../../extension/hhr-medication-actions-runtime.js';

type MedicationActionsRuntime = {
  findPharmaHeading: () => Element | null;
  downloadIndications: (encId: string, button: HTMLButtonElement) => Promise<void>;
  hasVisibleNursingRole: () => boolean;
  findToolbarAnchor: (heading: Element) => Element;
};

type MedicationActionsOwner = {
  create: (dependencies: Record<string, unknown>) => MedicationActionsRuntime;
};

const owner = () =>
  (globalThis as typeof globalThis & { HhrMedicationActionsRuntime: MedicationActionsOwner })
    .HhrMedicationActionsRuntime;

const normalizedText = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const makeRuntime = (
  options: {
    currentEncounter?: string;
    sendMessage?: (message: Record<string, unknown>) => Promise<Record<string, unknown>>;
  } = {}
) => {
  const feedback = vi.fn();
  const runtime = owner().create({
    documentRef: document,
    normalizedText,
    currentRouteEncounterId: () => options.currentEncounter || '141',
    createFeedbackModal: feedback,
    sendMessage: options.sendMessage || vi.fn(async () => ({})),
    runtimeMessages: {
      INDICATIONS_PRINT_REQUEST: 'RAYEN_INDICATIONS_PRINT_REQUEST',
      HOSPITALIZED_REGIMEN_OPTIONS_REQUEST: 'RAYEN_HOSPITALIZED_REGIMEN_OPTIONS_REQUEST',
      HOSPITALIZED_REGIMEN_PRINT_REQUEST: 'RAYEN_HOSPITALIZED_REGIMEN_PRINT_REQUEST',
    },
  });
  return { runtime, feedback };
};

describe('HHR medication actions runtime', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('owns medication behavior, fails closed and loads before its consumer', () => {
    const runtimeSource = readFileSync(
      path.resolve('extension/hhr-medication-actions-runtime.js'),
      'utf8'
    );
    const contentSource = readFileSync(
      path.resolve('extension/content-prescription-print.js'),
      'utf8'
    );
    const manifest = JSON.parse(readFileSync(path.resolve('extension/manifest.json'), 'utf8')) as {
      content_scripts: Array<{ matches?: string[]; js?: string[] }>;
    };
    const scripts = manifest.content_scripts
      .filter(entry => entry.matches?.includes('https://fichamedico.rayensalud.cl/*'))
      .flatMap(entry => entry.js || []);

    expect(Object.isFrozen(owner())).toBe(true);
    expect(() => owner().create({})).toThrow(
      'No se pudo inicializar el runtime de acciones de medicación HHR.'
    );
    expect(scripts.indexOf('hhr-medication-actions-runtime.js')).toBeGreaterThanOrEqual(0);
    expect(scripts.indexOf('hhr-medication-actions-runtime.js')).toBeLessThan(
      scripts.indexOf('content-prescription-print.js')
    );
    expect(contentSource).toContain(
      'const medicationActionsOwner = globalThis.HhrMedicationActionsRuntime'
    );
    expect(contentSource).toContain('!medicationActionsOwner ||');
    expect(contentSource).toContain('medicationActionsOwner.create({');
    [
      'const findPharmaHeading =',
      'const downloadIndications =',
      'const hasVisibleNursingRole =',
      'const findToolbarAnchor =',
    ].forEach(definition => {
      expect(runtimeSource).toContain(definition);
      expect(contentSource).not.toContain(definition);
    });
  });

  it('detects the nursing medication view and preserves indications route safety', async () => {
    document.body.innerHTML = `
      <span>Enfermera(o)</span>
      <section class="MuiPaper-root">
        <h2><span>Fármacos</span></h2>
        <label><input type="checkbox"> Mostrar Suspendidos</label>
      </section>
    `;
    let finishRequest: ((result: Record<string, unknown>) => void) | undefined;
    const sendMessage = vi.fn(
      () =>
        new Promise<Record<string, unknown>>(resolve => {
          finishRequest = resolve;
        })
    );
    const { runtime, feedback } = makeRuntime({ sendMessage });
    const heading = runtime.findPharmaHeading();
    const button = document.createElement('button');

    expect(heading?.tagName).toBe('SPAN');
    expect(runtime.hasVisibleNursingRole()).toBe(true);
    expect(runtime.findToolbarAnchor(heading as Element).tagName).toBe('LABEL');
    const pending = runtime.downloadIndications('141', button);
    expect(button.disabled).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'RAYEN_INDICATIONS_PRINT_REQUEST',
      encId: '141',
    });
    finishRequest?.({ ok: true });
    await pending;
    expect(button.disabled).toBe(false);
    expect(feedback).toHaveBeenLastCalledWith({
      title: 'Indicaciones',
      message: 'PDF de indicaciones descargado. Ábrelo desde Descargas para imprimir.',
    });

    const stale = makeRuntime({ currentEncounter: '999', sendMessage });
    await stale.runtime.downloadIndications('141', button);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(stale.feedback).toHaveBeenCalledWith(
      expect.objectContaining({ error: true, title: 'Indicaciones' })
    );
  });

  it('does not expose the retired regimen and Braden tool', () => {
    expect(makeRuntime().runtime).not.toHaveProperty('createRegimenQuickDialog');
  });
});
