// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

const extensionSource = (file: string) => readFileSync(path.resolve('extension', file), 'utf8');
const runtimeSource = extensionSource('clinical-report-runtime.js');
const hospitalizationReportSearchSource = extensionSource(
  'hospitalization-report-search-runtime.js'
);
const hospitalizationReportsSource = extensionSource('hospitalization-reports-runtime.js');
const epicrisisDownloadSource = extensionSource('epicrisis-download-runtime.js');
type RuntimeDependencies = Record<string, unknown>;

const loadFactory = () => {
  const context = vm.createContext({
    URL,
    ArrayBuffer,
    Uint8Array,
    TextDecoder,
    encodeURIComponent,
  });
  vm.runInContext(hospitalizationReportSearchSource, context, {
    filename: 'hospitalization-report-search-runtime.js',
  });
  vm.runInContext(hospitalizationReportsSource, context, {
    filename: 'hospitalization-reports-runtime.js',
  });
  vm.runInContext(extensionSource('epicrisis-pdf-download.js'), context, {
    filename: 'epicrisis-pdf-download.js',
  });
  vm.runInContext(epicrisisDownloadSource, context, { filename: 'epicrisis-download-runtime.js' });
  vm.runInContext(runtimeSource, context, { filename: 'clinical-report-runtime.js' });
  return (
    context as unknown as {
      HhrClinicalReportRuntime: { create: (dependencies: RuntimeDependencies) => RuntimeApi };
    }
  ).HhrClinicalReportRuntime;
};

type RuntimeApi = {
  printWorklistDocument: (request: {
    encId: string;
    expectedPatientId?: string;
    documentKind: string;
    sender: unknown;
  }) => Promise<{ error?: string }>;
  fetchOfficialPdf: (request: {
    url: string;
    token: string;
    label: string;
  }) => Promise<{ buffer?: ArrayBuffer; fatal?: boolean; status?: number; error?: string }>;
  openPdfPrintDialog: (request: {
    buffer: ArrayBuffer;
    filename: string;
    preview?: boolean;
    sender?: unknown;
  }) => Promise<{ ok?: boolean; printTabId?: number; error?: string }>;
  handleNursingMedicalEpicrisisPrintRequest: (request: {
    encId?: string;
    patientRun: string;
    admissionDate?: string;
    censusDate?: string;
    delivery?: string;
    operation?: string;
    documentType?: string;
    sender?: unknown;
  }) => Promise<{
    ok?: boolean;
    downloadId?: number;
    encId?: string;
    episodes?: Array<{ encId: string; startDate: string; endDate: string; active: boolean }>;
    opened?: boolean;
    error?: string;
  }>;
};

const createDependencies = (overrides: RuntimeDependencies = {}) => ({
  chrome: {
    downloads: { download: vi.fn(async () => 71) },
    storage: { session: { set: vi.fn(async () => undefined) } },
    tabs: { create: vi.fn(async () => ({ id: 81 })) },
    runtime: { getURL: vi.fn((value: string) => `chrome-extension://hhr/${value}`) },
  },
  crypto: { randomUUID: vi.fn(() => 'report-job-id') },
  TextDecoder,
  fetchWithTimeout: vi.fn(),
  getClinicalReportContext: vi.fn(),
  getFichaFetchInfo: vi.fn(),
  mapWithConcurrency: vi.fn(),
  bufferToBase64: vi.fn(() => 'UERG'),
  base64ToArrayBuffer: vi.fn(),
  extensionRuntime: { ensurePdf: vi.fn() },
  pdfPrint: { preparePdfForBrowserPrint: vi.fn(async (buffer: ArrayBuffer) => buffer) },
  prescriptionPrint: {
    buildPrescriptionReportUrl: vi.fn(),
    buildIndicationsReportUrl: vi.fn(),
    buildRegimenReportUrl: vi.fn(),
    buildClinicalReportUrl: vi.fn(),
    buildPrescriptionFilename: vi.fn(),
    extractOfficialPrescriptionContent: vi.fn(),
  },
  prescriptionPdf: { generateProfessionalPrescriptionPdf: vi.fn() },
  epicrisisPdf: {},
  pdfLib: {},
  now: vi.fn(() => 123_456),
  ...overrides,
});

describe('clinical report runtime direct episodes and history', () => {
  const worklist = 'https://fichamedico.rayensalud.cl/dashboard/encounter-list';
  const sender = { tab: { id: 10, url: worklist }, frameId: 0, url: worklist };

  it('requires a top-level worklist sender before reading a session', async () => {
    const dependencies = createDependencies();
    const runtime = loadFactory().create(dependencies);
    for (const other of [{ ...sender, frameId: 1 }, { ...sender, url: worklist + '/140' },
      { ...sender, tab: { id: 10, url: 'https://unrelated.test/' } }]) {
      const result = await runtime.printWorklistDocument({
        encId: '140', documentKind: 'indications', sender: other,
      });
      expect(result.error).toBeTruthy();
    }
    expect(dependencies.getFichaFetchInfo).not.toHaveBeenCalled();
  });

  it('stops before reading the episode when the source session lacks chart access', async () => {
    const info = { facId: '2' };
    const dependencies = createDependencies({
      getFichaFetchInfo: vi.fn(async () => ({ info })),
      checkWorklistChartAccess: vi.fn(async () => ({ error: 'Acceso denegado' })),
    });
    const result = await loadFactory().create(dependencies).printWorklistDocument({
      encId: '140', documentKind: 'prescription', sender,
    });
    expect(result.error).toBe('Acceso denegado');
    expect(dependencies.getFichaFetchInfo).toHaveBeenCalledWith(sender);
    expect(dependencies.getClinicalReportContext).not.toHaveBeenCalled();
    expect(dependencies.chrome.tabs.create).not.toHaveBeenCalled();
  });

  it('stops before requesting the PDF when a discharge row and episode identify different patients', async () => {
    const info = { facId: '2' };
    const dependencies = createDependencies({
      getFichaFetchInfo: vi.fn(async () => ({ info })),
      checkWorklistChartAccess: vi.fn(async () => ({ ok: true })),
      getClinicalReportContext: vi.fn(async () => ({ info, patientId: '300' })),
    });
    const result = await loadFactory().create(dependencies).printWorklistDocument({
      encId: '140', expectedPatientId: '301', documentKind: 'indications', sender,
    });
    expect(result.error).toMatch(/no coincide/);
    expect(dependencies.getClinicalReportContext).toHaveBeenCalledWith('140', info);
    expect(dependencies.fetchWithTimeout).not.toHaveBeenCalled();
    expect(dependencies.chrome.tabs.create).not.toHaveBeenCalled();
  });

  it('returns prepared preview bytes without opening a print tab or adding a print action', async () => {
    const sender = { tab: { id: 10 }, url: 'https://fichamedico.rayensalud.cl/dashboard/encounter-list-nurse/1' };
    const buffer = new Uint8Array([37, 80, 68, 70]).buffer;
    const prepared = { ok: true, jobId: 'synthetic-job', pdfBase64: 'JVBERg==' };
    const prepareDocumentPreview = vi.fn(async () => prepared);
    const dependencies = createDependencies({ prepareDocumentPreview });
    const runtime = loadFactory().create(dependencies);
    expect(await runtime.openPdfPrintDialog({ buffer, filename: 'synthetic.pdf', preview: true, sender })).toEqual(prepared);
    expect(prepareDocumentPreview).toHaveBeenCalledWith({ buffer, filename: 'synthetic.pdf', sender });
    expect(dependencies.chrome.tabs.create).not.toHaveBeenCalled();
    expect(dependencies.pdfPrint.preparePdfForBrowserPrint).not.toHaveBeenCalled();
  });

  it.each([
    ['list', 'epicrisis'],
    ['download', 'epicrisis'],
    ['download', 'nursing-epicrisis'],
  ])(
    'verifies the ongoing episode omitted by the RUN index before %s',
    async (operation, documentType) => {
      const getClinicalReportContext = vi.fn(async () => ({
        patient: { run: '12345678-5' },
        patientId: '300',
        info: { facId: '2', practitionerId: '400' },
      }));
      const fetchWithTimeout = vi.fn(async (url: string) =>
        url.includes('/api/report/')
          ? new Response(new TextEncoder().encode('%PDF-current'), {
              headers: { 'content-type': 'application/pdf' },
            })
          : new Response(
              JSON.stringify([
                {
                  encounterId: 100,
                  patientIdentifier: '12345678-5',
                  startPeriod: '2025-01-01',
                  endPeriod: '2025-01-03',
                },
              ])
            )
      );
      const runtime = loadFactory().create(
        createDependencies({
          getClinicalReportContext,
          fetchWithTimeout,
          getFichaFetchInfo: vi.fn(async () => ({
            info: {
              apiOrigin: 'https://fichamedicoback.rayensalud.cl',
              token: 'testing',
              facId: '2',
            },
          })),
        })
      );
      const result = await runtime.handleNursingMedicalEpicrisisPrintRequest({
        encId: '200',
        patientRun: '12.345.678-5',
        admissionDate: '2026-10-01',
        delivery: 'download',
        operation,
        documentType,
      });
      expect(getClinicalReportContext).toHaveBeenCalledWith(
        '200',
        expect.any(Object),
        null,
        undefined
      );
      if (operation === 'list') {
        expect(result).toEqual({
          ok: true,
          episodes: [
            { encId: '200', startDate: '2026-10-01', endDate: '' },
            { encId: '100', startDate: '2025-01-01', endDate: '2025-01-03', active: false },
          ],
        });
      } else {
        expect(result).toMatchObject({ ok: true, encId: '200' });
        const url = new URL(fetchWithTimeout.mock.calls.at(-1)![0]);
        expect(url.searchParams.get('enc_id')).toBe('200');
        expect(url.pathname).toBe(
          documentType === 'epicrisis'
            ? '/api/report/Reporte_Epicrisis.pdf'
            : '/api/report/Alta_Enfermeria_Blank_A4.pdf'
        );
        if (documentType === 'nursing-epicrisis') {
          expect(Object.fromEntries(url.searchParams)).toEqual({
            enc_id: '200',
            pat_id: '300',
            fac_id: '2',
            hcp_id: '400',
          });
          expect(getClinicalReportContext).toHaveBeenCalledTimes(1);
        }
      }
    }
  );

  it.each([{ patient: { run: '87654321-0' } }, { error: 'Sesión vencida' }, { patient: {} }])(
    'does not download an omitted episode without a verified patient identity: %j',
    async context => {
      const fetchWithTimeout = vi.fn(async () => new Response('[]'));
      const runtime = loadFactory().create(
        createDependencies({
          fetchWithTimeout,
          getClinicalReportContext: vi.fn(async () => context),
          getFichaFetchInfo: vi.fn(async () => ({
            info: {
              apiOrigin: 'https://fichamedicoback.rayensalud.cl',
              token: 'testing',
              facId: '2',
            },
          })),
        })
      );
      const result = await runtime.handleNursingMedicalEpicrisisPrintRequest({
        encId: '200',
        patientRun: '12345678-5',
        delivery: 'download',
      });
      expect(result.error).toBeTruthy();
      expect(
        fetchWithTimeout.mock.calls.every(
          ([url]: unknown[]) => !String(url).includes('/api/report/')
        )
      ).toBe(true);
    }
  );

  it('lists the synced episode for a newborn without RUN and does not perform a RUN search', async () => {
    const fetchWithTimeout = vi.fn();
    const runtime = loadFactory().create(
      createDependencies({
        fetchWithTimeout,
        getFichaFetchInfo: vi.fn(async () => ({
          info: {
            apiOrigin: 'https://fichamedicoback.rayensalud.cl',
            token: 'testing',
            facId: '2',
          },
        })),
      })
    );

    await expect(
      runtime.handleNursingMedicalEpicrisisPrintRequest({
        encId: '141814',
        patientRun: '',
        admissionDate: '2026-07-20',
        delivery: 'download',
        operation: 'list',
      })
    ).resolves.toEqual({
      ok: true,
      episodes: [{ encId: '141814', startDate: '2026-07-20', endDate: '' }],
    });
    expect(fetchWithTimeout).not.toHaveBeenCalled();
  });

  it('lists and downloads the exact newborn episode even when a legacy row has no admission date', async () => {
    const fetchWithTimeout = vi.fn(
      async () =>
        new Response(new TextEncoder().encode('%PDF-epicrisis'), {
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        })
    );
    const runtime = loadFactory().create(
      createDependencies({
        fetchWithTimeout,
        getFichaFetchInfo: vi.fn(async () => ({
          info: {
            apiOrigin: 'https://fichamedicoback.rayensalud.cl',
            token: 'testing',
            facId: '2',
          },
        })),
      })
    );

    await expect(
      runtime.handleNursingMedicalEpicrisisPrintRequest({
        encId: '141814',
        patientRun: '',
        delivery: 'download',
        operation: 'list',
      })
    ).resolves.toEqual({
      ok: true,
      episodes: [{ encId: '141814', startDate: '', endDate: '' }],
    });

    await expect(
      runtime.handleNursingMedicalEpicrisisPrintRequest({
        encId: '141814',
        patientRun: '',
        delivery: 'download',
        operation: 'download',
        documentType: 'epicrisis',
      })
    ).resolves.toMatchObject({ ok: true, encId: '141814' });
  });

  it('downloads the exact newborn episode without requiring a RUN', async () => {
    const fetchWithTimeout = vi.fn(
      async (_url: string) =>
        new Response(new TextEncoder().encode('%PDF-epicrisis'), {
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        })
    );
    const runtime = loadFactory().create(
      createDependencies({
        fetchWithTimeout,
        getFichaFetchInfo: vi.fn(async () => ({
          info: {
            apiOrigin: 'https://fichamedicoback.rayensalud.cl',
            token: 'testing',
            facId: '2',
          },
        })),
      })
    );

    await expect(
      runtime.handleNursingMedicalEpicrisisPrintRequest({
        encId: '141814',
        patientRun: '',
        admissionDate: '2026-07-20',
        delivery: 'download',
        operation: 'download',
        documentType: 'epicrisis',
      })
    ).resolves.toMatchObject({ ok: true, encId: '141814' });
    const reportUrl = new URL(fetchWithTimeout.mock.calls[0][0]);
    expect(reportUrl.pathname).toBe('/api/report/Reporte_Epicrisis.pdf');
    expect(reportUrl.searchParams.get('enc_id')).toBe('141814');
  });

  it('opens the complete history for a newborn episode without requiring a RUN', async () => {
    const createTab = vi.fn(async (_options: { url: string }) => ({ id: 81 }));
    const fetchWithTimeout = vi.fn();
    const runtime = loadFactory().create(
      createDependencies({
        fetchWithTimeout,
        chrome: {
          downloads: { download: vi.fn(async () => 71) },
          storage: { session: { set: vi.fn(async () => undefined) } },
          tabs: { create: createTab },
          runtime: { getURL: (value: string) => `chrome-extension://hhr/${value}` },
        },
        getFichaFetchInfo: vi.fn(async () => ({
          info: {
            apiOrigin: 'https://fichamedicoback.rayensalud.cl',
            token: 'testing',
            facId: '2',
          },
        })),
      })
    );

    await expect(
      runtime.handleNursingMedicalEpicrisisPrintRequest({
        encId: '141814',
        patientRun: '',
        admissionDate: '2026-07-20',
        delivery: 'download',
        operation: 'download',
        documentType: 'history',
      })
    ).resolves.toMatchObject({ ok: true, opened: true, encId: '141814' });
    const openedUrl = new URL(createTab.mock.calls[0][0].url);
    expect(openedUrl.searchParams.get('report')).toBe('GetHospitalizedEncounterHistory');
    expect(JSON.parse(openedUrl.searchParams.get('params') || '{}')).toMatchObject({
      enc_id: '141814',
      start_date: '2026-07-20',
    });
    expect(fetchWithTimeout).not.toHaveBeenCalled();
  });

  it('opens the active history directly even when the RUN report list omits the episode', async () => {
    const createTab = vi.fn(async (_options: { url: string }) => ({ id: 82 }));
    const fetchWithTimeout = vi.fn();
    const runtime = loadFactory().create(
      createDependencies({
        fetchWithTimeout,
        chrome: {
          downloads: { download: vi.fn(async () => 72) },
          storage: { session: { set: vi.fn(async () => undefined) } },
          tabs: { create: createTab },
          runtime: { getURL: (value: string) => `chrome-extension://hhr/${value}` },
        },
        getFichaFetchInfo: vi.fn(async () => ({
          info: {
            apiOrigin: 'https://fichamedicoback.rayensalud.cl',
            token: 'testing',
            facId: '2',
          },
        })),
      })
    );

    await expect(
      runtime.handleNursingMedicalEpicrisisPrintRequest({
        encId: '141815',
        patientRun: '17.752.753-1',
        admissionDate: '2026-07-21',
        delivery: 'download',
        operation: 'download',
        documentType: 'history',
      })
    ).resolves.toMatchObject({ ok: true, opened: true, encId: '141815' });
    const openedUrl = new URL(createTab.mock.calls[0][0].url);
    expect(openedUrl.searchParams.get('report')).toBe('GetHospitalizedEncounterHistory');
    expect(JSON.parse(openedUrl.searchParams.get('params') || '{}')).toMatchObject({
      enc_id: '141815',
      start_date: '2026-07-21',
    });
    expect(fetchWithTimeout).not.toHaveBeenCalled();
  });

  it('opens the official complete-history report for the selected episode', async () => {
    const createTab = vi.fn(async (_options: { url: string }) => ({ id: 81, windowId: 7 }));
    const focusWindow = vi.fn(async () => undefined);
    const fetchWithTimeout = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              encounterId: 141336,
              patientIdentifier: '17.752.753-1',
              startPeriod: '2026-07-18T08:00:00-04:00',
              endPeriod: '2026-07-19T10:00:00-04:00',
            },
          ]),
          { status: 200 }
        )
    );
    const runtime = loadFactory().create(
      createDependencies({
        fetchWithTimeout,
        chrome: {
          downloads: { download: vi.fn(async () => 71) },
          storage: { session: { set: vi.fn(async () => undefined) } },
          tabs: { create: createTab },
          windows: { update: focusWindow },
          runtime: { getURL: (value: string) => `chrome-extension://hhr/${value}` },
        },
        getFichaFetchInfo: vi.fn(async () => ({
          info: {
            apiOrigin: 'https://fichamedicoback.rayensalud.cl',
            token: 'testing',
            facId: '2',
          },
        })),
      })
    );

    await expect(
      runtime.handleNursingMedicalEpicrisisPrintRequest({
        encId: '141336',
        patientRun: '17.752.753-1',
        delivery: 'download',
        operation: 'download',
        documentType: 'history',
      })
    ).resolves.toMatchObject({ ok: true, opened: true, encId: '141336' });
    const openedUrl = new URL(createTab.mock.calls[0][0].url);
    expect(openedUrl.searchParams.get('report')).toBe('GetHospitalizedEncounterHistory');
    expect(JSON.parse(openedUrl.searchParams.get('params') || '{}')).toEqual({
      enc_id: '141336',
      start_date: '2026-07-18T08:00:00-04:00',
      end_date: '2026-07-19T10:00:00-04:00',
    });
    expect(focusWindow).toHaveBeenCalledWith(7, { focused: true });
    expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
  });

  it('fails safely when complete-history browser dependencies are unavailable', async () => {
    const context = vm.createContext({ URL, Date });
    vm.runInContext(hospitalizationReportsSource, context, {
      filename: 'hospitalization-reports-runtime.js',
    });
    const reports = (
      context as unknown as {
        HhrHospitalizationReportsRuntime: {
          openHistoryReport: (request: Record<string, unknown>) => Promise<{ error?: string }>;
        };
      }
    ).HhrHospitalizationReportsRuntime;

    await expect(
      reports.openHistoryReport({
        resolved: {
          encId: '141336',
          row: { startPeriod: '2026-07-18T08:00:00-04:00', endPeriod: null },
        },
      })
    ).resolves.toEqual({
      error: 'No se pudo acceder al navegador para abrir la ficha clínica completa.',
    });
  });
});
