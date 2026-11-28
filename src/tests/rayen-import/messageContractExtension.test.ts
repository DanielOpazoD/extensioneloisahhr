// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import '../../../extension/contratos/message-contract.js';

interface ValidationResult {
  ok: boolean;
  known: boolean;
  type?: string;
  response?: { code?: string; error?: string };
}

interface MessageContract {
  types: Record<string, string>;
  responses: {
    success: (data?: object) => Record<string, unknown>;
    error: (message: string, code?: string, data?: object) => Record<string, unknown>;
    uncertain: (message: string, data?: object) => Record<string, unknown>;
    sessionRequired: (message: string, data?: object) => Record<string, unknown>;
  };
  validateRuntimeMessage: (message: unknown) => ValidationResult;
  createRuntimeRouter: (
    routes: Record<
      string,
      {
        handle: (message: Record<string, unknown>, sender: unknown) => unknown;
        fallback: string;
      }
    >
  ) => (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => unknown;
}

const contract = (globalThis as typeof globalThis & { HhrRayenMessageContract: MessageContract })
  .HhrRayenMessageContract;

describe('shared Rayen runtime-message contract', () => {
  it('registers every service-worker request type once', () => {
    const values = Object.values(contract.types);

    expect(values).toHaveLength(81);
    expect(contract.validateRuntimeMessage({ type: contract.types.CLINICAL_CHECKLIST, encId: '42', request: { action: 'templates' } }).ok).toBe(true);
    expect(contract.validateRuntimeMessage({ type: contract.types.WORKLIST_RETURN_CONTEXT, action: 'return', entryKeys: [] }).ok).toBe(true);
    expect(contract.validateRuntimeMessage({ type: contract.types.WORKLIST_RETURN_CONTEXT }).ok).toBe(false);
    expect(contract.types.RAPA_NUI_WEATHER).toBe('RAYEN_RAPA_NUI_WEATHER');
    expect(contract.types.DAILY_BIRTHS).toBe('RAYEN_DAILY_BIRTHS');
    expect(contract.validateRuntimeMessage({ type: contract.types.DAILY_BIRTHS }).ok).toBe(true);
    expect(contract.types.EXTENSION_RELEASE_STATUS).toBe('RAYEN_EXTENSION_RELEASE_STATUS');
    expect(contract.validateRuntimeMessage({ type: contract.types.EXTENSION_RELEASE_STATUS }).ok).toBe(true);
    expect(new Set(values).size).toBe(values.length);
    expect(values.every(value => /^RAYEN_[A-Z0-9_]+$/.test(value))).toBe(true);
  });

  it('requires the document kind and episode for a worklist print', () => {
    const type = contract.types.WORKLIST_DOCUMENT_PRINT_REQUEST;
    expect(contract.validateRuntimeMessage({ type, encId: '140', documentKind: 'prescription' }).ok).toBe(true);
    expect(contract.validateRuntimeMessage({ type, documentKind: 'indications' }).ok).toBe(false);
    expect(contract.validateRuntimeMessage({ type, encId: '140' }).ok).toBe(false);
  });

  it('accepts valid payloads and rejects malformed known messages', () => {
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.SYNC_BUNDLE_REQUEST,
        requestId: 'sync-1',
        dateStart: '2026-07-24',
        dateEnd: '2026-07-25',
      })
    ).toMatchObject({ ok: true, known: true });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.PATIENT_DOCUMENT_MANAGER_REQUEST,
        encId: '141121',
        operation: 'list',
      })
    ).toMatchObject({ ok: true, known: true });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.PATIENT_DOCUMENT_MANAGER_REQUEST,
        encId: '',
        operation: 'open-document',
      })
    ).toMatchObject({ ok: false, known: true });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.SYNC_BUNDLE_REQUEST,
        requestId: 'sync-1',
        dateStart: '2026-07-24',
      })
    ).toMatchObject({ ok: false, known: true });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.HANDOFF_SAVE_REQUEST,
        batchId: 'batch-1',
        encId: '141121',
        observation: 'Paciente estable.',
      })
    ).toMatchObject({ ok: true, known: true, type: contract.types.HANDOFF_SAVE_REQUEST });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.HANDOFF_OPTIONS_REQUEST,
        currentEncId: '',
      })
    ).toMatchObject({ ok: true, known: true });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.MANUAL_PATIENT_CODE_REQUEST,
        encId: '141121',
      })
    ).toMatchObject({ ok: true, known: true });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.MANUAL_PATIENT_CODE_REQUEST,
        encId: '',
      })
    ).toMatchObject({ ok: false, known: true });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.LAB_SEARCH_REQUEST,
        rutBody: '29219852',
      })
    ).toMatchObject({ ok: true, known: true });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.LAB_SEARCH_REQUEST,
        rutBody: '29.219.852-3',
      })
    ).toMatchObject({ ok: false, known: true });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.LAB_SEARCH_REQUEST,
        rutBody: '1234',
      })
    ).toMatchObject({ ok: false, known: true });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.STATISTICAL_DISCHARGE_REPORT_REQUEST,
        encId: '141704',
      })
    ).toMatchObject({ ok: true, known: true });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.STATISTICAL_DISCHARGE_REPORT_REQUEST,
        encId: '',
      })
    ).toMatchObject({ ok: false, known: true });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.PATIENT_FLOW_REPORT_REQUEST,
        encId: '142040',
      })
    ).toMatchObject({ ok: true, known: true });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.HISTORY_SCALES_REQUEST,
        encId: '142040',
        censusDate: '2026-07-28',
        lookbackDays: 7,
      })
    ).toMatchObject({ ok: true, known: true });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.HISTORY_SCALES_REQUEST,
        encId: '142040',
        lookbackDays: '7',
      })
    ).toMatchObject({
      ok: false,
      known: true,
      response: { code: 'INVALID_MESSAGE', error: expect.stringContaining('lookbackDays') },
    });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.DEVICE_REPORT_REQUEST,
        encId: '142040',
        fecha: '2026-07-28',
        acceptEntries: true,
      })
    ).toMatchObject({ ok: true, known: true });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.DEVICE_REPORT_REQUEST,
        encId: '142040',
        acceptEntries: 'yes',
      })
    ).toMatchObject({
      ok: false,
      known: true,
      response: { code: 'INVALID_MESSAGE', error: expect.stringContaining('acceptEntries') },
    });

    expect(
      contract.validateRuntimeMessage({
        type: contract.types.EGRESO_LOOKUP_REQUEST,
        reqId: 'egreso-1',
        runs: [],
      })
    ).toMatchObject({ ok: true, known: true });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.EGRESO_LOOKUP_REQUEST,
        reqId: 'egreso-invalid-runs',
        runs: '17752753-2',
      })
    ).toMatchObject({
      ok: false,
      known: true,
      response: { code: 'INVALID_MESSAGE', error: expect.stringContaining('runs') },
    });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.EGRESO_LOOKUP_REQUEST,
        runs: [],
      })
    ).toMatchObject({
      ok: false,
      known: true,
      response: { code: 'INVALID_MESSAGE', error: expect.stringContaining('reqId') },
    });
    expect(
      contract.validateRuntimeMessage({
        type: contract.types.NURSING_MEDICAL_EPICRISIS_PRINT_REQUEST,
        encId: '141121',
        patientRun: '17.752.753-1',
        censusDate: '2026-07-19',
        delivery: 'download',
        operation: 'list',
        documentType: 'history',
      })
    ).toMatchObject({ ok: true, known: true });
  });

  it('leaves unknown messages untouched for other extension listeners', () => {
    const sendResponse = vi.fn();
    const router = contract.createRuntimeRouter({});

    expect(router({ type: 'ANOTHER_EXTENSION_MESSAGE' }, {}, sendResponse)).toBeUndefined();
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it('preserves asynchronous sendResponse semantics and maps operation failures', async () => {
    const sender = { tab: { id: 12 } };
    const handler = vi.fn(async message => ({ opened: message.encId }));
    const sendResponse = vi.fn();
    const router = contract.createRuntimeRouter({
      [contract.types.OPEN_ENCOUNTER_REQUEST]: {
        handle: handler,
        fallback: 'No se pudo abrir el episodio.',
      },
    });

    expect(
      router({ type: contract.types.OPEN_ENCOUNTER_REQUEST, encId: '141121' }, sender, sendResponse)
    ).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ opened: '141121' }));
    expect(handler).toHaveBeenCalledWith(
      { type: contract.types.OPEN_ENCOUNTER_REQUEST, encId: '141121' },
      sender
    );

    const falsyResponse = vi.fn();
    const falsyRouter = contract.createRuntimeRouter({
      [contract.types.EXTENSION_HEALTH_REQUEST]: {
        handle: () => false,
        fallback: 'No se pudo verificar la extensión.',
      },
    });
    expect(falsyRouter({ type: contract.types.EXTENSION_HEALTH_REQUEST }, {}, falsyResponse)).toBe(
      true
    );
    await vi.waitFor(() => expect(falsyResponse).toHaveBeenCalledWith(false));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failedResponse = vi.fn();
    const failedRouter = contract.createRuntimeRouter({
      [contract.types.EXTENSION_HEALTH_REQUEST]: {
        handle: () => Promise.reject(new Error('detalle interno sintético')),
        fallback: 'No se pudo verificar la extensión.',
      },
    });
    expect(
      failedRouter({ type: contract.types.EXTENSION_HEALTH_REQUEST }, {}, failedResponse)
    ).toBe(true);
    await vi.waitFor(() =>
      expect(failedResponse).toHaveBeenCalledWith({
        code: 'OPERATION_FAILED', error: 'No se pudo verificar la extensión.',
      })
    );
    expect(errorSpy).toHaveBeenCalledExactlyOnceWith(
      '[HHR] Falló una operación asíncrona de la extensión.', 'No se pudo verificar la extensión.'
    );
    errorSpy.mockRestore();
  });

  it('validates table connection, batch loading and batch save preparation', () => {
    const type = contract.types.NURSING_HANDOFF_TABLE;
    for (const action of ['status', 'connect']) {
      expect(contract.validateRuntimeMessage({ type, action }).ok).toBe(true);
    }
    expect(contract.validateRuntimeMessage({ type, action:'open-rows', episodes:['123'] }).ok).toBe(true);
    expect(contract.validateRuntimeMessage({ type, action:'prepare-save', ids:['editor-sintético'] }).ok).toBe(true);
    for (const action of [undefined, 'read', 'save', 'open-rows', 'prepare-save']) {
      expect(contract.validateRuntimeMessage({ type, action }).ok).toBe(false);
    }
  });

  it('validates the editor action and its fields without changing the authorized sender', async () => {
    const type = contract.types.NURSING_HANDOFF_EDITOR;
    const id = 'id-sintético';
    const sender = { tab: { id: 12 }, frameId: 7, documentId:'editor-sintético' };
    const fields = { date:'2026-11-21', shift:'night', version:'a'.repeat(64) };
    for (const message of [
      { action:'read' }, { action:'read', ...fields, since:fields.version },
      { action:'draft', ...fields }, { action:'save', ...fields, text:'' },
      { action:'hosted-result' }, { action:'close' },
    ]) expect(contract.validateRuntimeMessage({ type, id, ...message }).ok).toBe(true);
    for (const message of [
      { action:'otra-acción' }, { action:'connect-inline' }, { action:'draft' }, { action:'save', ...fields },
      { action:'hosted-result', expiresAt:'mañana' },
    ]) expect(contract.validateRuntimeMessage({ type, id, ...message })).toMatchObject({
      ok:false, known:true, response:{ code:'INVALID_MESSAGE' },
    });
    const handle = vi.fn(() => ({ code:'SOURCE_SESSION_CHANGED', error:'Cambió la sesión.' }));
    const router = contract.createRuntimeRouter({ [type]:{ handle, fallback:'No se pudo continuar.' } });
    const message = { type, id, action:'read' };
    await expect(new Promise(resolve => router(message, sender, resolve))).resolves.toEqual({
      code:'SOURCE_SESSION_CHANGED', error:'Cambió la sesión.',
    });
    expect(handle).toHaveBeenCalledExactlyOnceWith(message, sender);
  });

  it('does not invoke a handler when a known payload is invalid', async () => {
    const handler = vi.fn();
    const sendResponse = vi.fn();
    const router = contract.createRuntimeRouter({
      [contract.types.SYSLAB_LOGIN_REQUEST]: {
        handle: handler,
        fallback: 'No se pudo iniciar sesión.',
      },
    });

    expect(
      router(
        { type: contract.types.SYSLAB_LOGIN_REQUEST, username: 'usuario', password: null },
        {},
        sendResponse
      )
    ).toBe(true);
    await vi.waitFor(() =>
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INVALID_MESSAGE',
          error: expect.stringContaining('password'),
        })
      )
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it('provides common response shapes without exposing payload details', () => {
    expect(contract.responses.success({ connected: true })).toEqual({
      connected: true,
      ok: true,
    });
    expect(contract.responses.error(' Falló la operación. ', 'FAILED')).toEqual({
      code: 'FAILED',
      error: 'Falló la operación.',
    });
    expect(contract.responses.uncertain('Sin confirmación')).toEqual({
      state: 'uncertain',
      uncertain: true,
      error: 'Sin confirmación',
    });
    expect(contract.responses.sessionRequired('Inicia sesión')).toEqual({
      state: 'requires-session',
      requiresLogin: true,
      error: 'Inicia sesión',
    });
  });

  it('loads the contract before every runtime caller and the service-worker router', () => {
    const manifest = JSON.parse(readFileSync(path.resolve('extension/manifest.json'), 'utf8')) as {
      content_scripts?: Array<{ js?: string[]; matches?: string[] }>;
    };
    const background = readFileSync(path.resolve('extension/background.js'), 'utf8');
    const syslabLogin = readFileSync(path.resolve('extension/syslab-login.html'), 'utf8');
    const runtimeCallers = new Set([
      'contenido/content-fichamedico.js',
      'contenido/content-gestioncamas.js',
      'contenido/content-hhr.js',
      'contenido/content-hhr-patient-flow.js',
      'contenido/content-hhr-epicrisis.js',
      'contenido/content-hhr-patient-documents.js',
      'contenido/content-hhr-statistical-discharge.js',
      'contenido/content-hhr-statistical-evidence.js',
      'contenido/content-hhr-syslab.js',
      'contenido/content-exam-request-print.js',
      'contenido/content-prescription-print.js',
    ]);

    for (const entry of manifest.content_scripts || []) {
      const scripts = entry.js || [];
      if (!scripts.some(script => runtimeCallers.has(script))) continue;
      expect(scripts[0]).toBe('contratos/message-contract.js');
    }
    expect(background.indexOf("'contratos/message-contract.js'")).toBeLessThan(
      background.indexOf("'clinico/encounter-navigation.js'")
    );
    expect(background).toContain(
      'chrome.runtime.onMessage.addListener(messageContract.createRuntimeRouter(runtimeMessageRoutes))'
    );
    expect(background).not.toMatch(/msg\.type\s*===\s*['"]RAYEN_/);
    const patientFlowEntry = manifest.content_scripts?.find(entry =>
      entry.js?.includes('contenido/content-hhr-patient-flow.js')
    );
    expect(patientFlowEntry?.matches).toEqual([
      ...['localhost', '127.0.0.1'].flatMap(host =>
        Array.from({ length: 21 }, (_, index) => `http://${host}:${3000 + index}/*`)
      ),
      'https://hhr-hospitalizados.app/*',
      'https://testinghhr.netlify.app/*',
      'https://hhr-entorno-prueba.netlify.app/*',
      'https://*.netlify.app/*',
    ]);
    expect(background).toContain('const readAuthorizedSnapshot = sender =>');
    expect(background).toContain('patientFlowRuntime.authorizeSnapshotResponse(');
    const dischargeReportFetcher = readFileSync(
      path.resolve('extension/gestion-camas/gestion-camas-statistical-report-fetcher.js'),
      'utf8'
    );
    expect(dischargeReportFetcher).toContain('Informe_Estadistico_Egreso_Hospitalario_CARTA.pdf');
    expect(dischargeReportFetcher).toContain("reportUrl.searchParams.set('ENC_ID', encounterId)");
    expect(dischargeReportFetcher).toContain('await markSessionVerified(record)');
    expect(syslabLogin.indexOf('contratos/message-contract.js')).toBeLessThan(
      syslabLogin.indexOf('syslab/syslab-login.js')
    );
  });
});
