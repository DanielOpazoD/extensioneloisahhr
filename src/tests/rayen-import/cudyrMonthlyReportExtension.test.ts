// @vitest-environment node
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
const context = vm.createContext({ Uint8Array, Date });
vm.runInContext(
  readFileSync(
    new URL('../../../extension/gestion-camas-monthly-cudyr-runtime.js', import.meta.url),
    'utf8'
  ),
  context
);
const make = () => {
  const deps = {
    resolveSession: vi.fn().mockResolvedValue({
      record: { facId: 1342, apiBase: 'https://example.test/api' },
    }),
    fetchWithTimeout: vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () =>
        Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]).buffer,
    }),
    markSessionVerified: vi.fn().mockResolvedValue(true),
    bufferToBase64: (buffer: ArrayBuffer) => Buffer.from(buffer).toString('base64'),
  };
  return { deps, api: context.HhrGestionCamasMonthlyCudyrRuntime.create(deps) };
};
describe('monthly report read-only transport', () => {
  it('requests the exact historical census date without changing session or patient records', async () => {
    const { deps, api } = make();
    expect(await api.request({ month: '2026-08', censusDate: '2026-08-01' })).toMatchObject({
      ok: true,
      censusDate: '2026-08-01',
    });
    expect(deps.fetchWithTimeout.mock.calls[0][0]).toBe(
      'https://example.test/api/report/Censo_Diario_de_Pacientes.xls?DATE=2026-08-01&FAC_ID=1342'
    );
    expect(await api.request({ month: '2026-08', censusDate: '2026-09-01' })).toHaveProperty(
      'error'
    );
  });
  it('uses the official report parameters and returns only the workbook and capture metadata', async () => {
    const { deps, api } = make();
    const result = await api.request({ month: '2026-08' });
    expect(deps.fetchWithTimeout.mock.calls[0][0]).toBe(
      'https://example.test/api/report/Categorizacion_Riesgo_Dependencia.xls?start_Date=2026-08-01&FAC_ID=1342'
    );
    expect(result).toMatchObject({ ok: true, month: '2026-08' });
    expect(result).not.toHaveProperty('token');
  });
  it('rejects another facility before downloading any patient report', async () => {
    const { deps, api } = make();
    deps.resolveSession.mockResolvedValue({
      record: { facId: 42, apiBase: 'https://example.test/api' },
    });
    expect(await api.request({ month: '2026-08', censusDate: '2026-08-01' })).toHaveProperty(
      'error'
    );
    expect(deps.fetchWithTimeout).not.toHaveBeenCalled();
  });
  it('rejects invalid input before requesting a session', async () => {
    const { deps, api } = make();
    expect(await api.request({ month: '../2026' })).toHaveProperty('error');
    expect(deps.resolveSession).not.toHaveBeenCalled();
  });
  it('does not treat HTML, oversized bodies or failed HTTP responses as empty reports', async () => {
    for (const response of [
      { ok: false, status: 401 },
      { ok: true, arrayBuffer: async () => new TextEncoder().encode('<html>login</html>').buffer },
      { ok: true, arrayBuffer: async () => new Uint8Array(262145).buffer },
    ]) {
      const { deps, api } = make();
      deps.fetchWithTimeout.mockResolvedValue(response as never);
      expect(await api.request({ month: '2026-08' })).toHaveProperty('error');
    }
  });
  it('discards a report if the authenticated session changed during the read', async () => {
    const { deps, api } = make();
    deps.markSessionVerified.mockResolvedValue(false);
    expect(await api.request({ month: '2026-08' })).toHaveProperty('error');
  });

  it.each(['http-503', 'http-429', 'network'])(
    'retries a single transient %s failure after backoff and succeeds on recovery',
    async failureMode => {
      const waits: number[] = [];
      let attempt = 0;
      const deps = {
        resolveSession: vi.fn().mockResolvedValue({
          record: { facId: 1342, apiBase: 'https://example.test/api', token: 'fixture' },
        }),
        fetchWithTimeout: vi.fn(async () => {
          attempt += 1;
          if (attempt === 1) {
            if (failureMode === 'network') throw new TypeError('Failed to fetch');
            return { ok: false, status: failureMode === 'http-429' ? 429 : 503 };
          }
          return {
            ok: true,
            status: 200,
            arrayBuffer: async () =>
              Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]).buffer,
          };
        }),
        markSessionVerified: vi.fn().mockResolvedValue(true),
        bufferToBase64: (buffer: ArrayBuffer) => Buffer.from(buffer).toString('base64'),
        wait: async (ms: number) => {
          waits.push(ms);
        },
        retryDelayMs: () => 550,
      };
      const api = context.HhrGestionCamasMonthlyCudyrRuntime.create(deps);

      const result = await api.request({ month: '2026-08' });
      expect(result).toMatchObject({ ok: true, month: '2026-08' });
      expect(deps.fetchWithTimeout).toHaveBeenCalledTimes(2);
      expect(waits).toEqual([550]);
    }
  );

  it('does not retry HTTP 401/403 and limits persistent HTTP 503 to two attempts', async () => {
    for (const status of [401, 403]) {
      const waits: number[] = [];
      const deps = {
        resolveSession: vi.fn().mockResolvedValue({
          record: { facId: 1342, apiBase: 'https://example.test/api', token: 'fixture' },
        }),
        fetchWithTimeout: vi.fn().mockResolvedValue({ ok: false, status }),
        markSessionVerified: vi.fn().mockResolvedValue(true),
        bufferToBase64: (buffer: ArrayBuffer) => Buffer.from(buffer).toString('base64'),
        wait: async (ms: number) => {
          waits.push(ms);
        },
        retryDelayMs: () => 550,
      };
      const api = context.HhrGestionCamasMonthlyCudyrRuntime.create(deps);
      expect(await api.request({ month: '2026-08' })).toHaveProperty('error');
      expect(deps.fetchWithTimeout).toHaveBeenCalledTimes(1);
      expect(waits).toEqual([]);
    }

    const persistentDeps = {
      resolveSession: vi.fn().mockResolvedValue({
        record: { facId: 1342, apiBase: 'https://example.test/api', token: 'fixture' },
      }),
      fetchWithTimeout: vi.fn().mockResolvedValue({ ok: false, status: 503 }),
      markSessionVerified: vi.fn().mockResolvedValue(true),
      bufferToBase64: (buffer: ArrayBuffer) => Buffer.from(buffer).toString('base64'),
      wait: vi.fn().mockResolvedValue(undefined),
      retryDelayMs: () => 550,
    };
    const persistentApi = context.HhrGestionCamasMonthlyCudyrRuntime.create(persistentDeps);
    expect(await persistentApi.request({ month: '2026-08' })).toEqual({
      error: 'No se pudo consultar el informe (HTTP 503).',
    });
    expect(persistentDeps.fetchWithTimeout).toHaveBeenCalledTimes(2);
  });
});
