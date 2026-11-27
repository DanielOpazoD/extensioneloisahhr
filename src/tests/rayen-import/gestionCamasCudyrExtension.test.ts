// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import '../../../extension/cudyr-capture-support.js';
import '../../../extension/gestion-camas-active-beds.js';
import '../../../extension/gestion-camas-clinical-cribs.js';
import '../../../extension/cudyr-placement-support.js';
import '../../../extension/gestion-camas-cudyr.js';

const cudyr = (
  globalThis as typeof globalThis & {
    HhrGestionCamasCudyr: {
      buildSnapshot: (input: Record<string, unknown>) => Array<Record<string, unknown>>;
      mergeEncounterSnapshots: (
        official: Array<Record<string, unknown>>,
        fallback: Array<Record<string, unknown>>
      ) => Array<Record<string, unknown>>;
    };
    HhrGestionCamasActiveBeds: {
      createRecentBedsSlot: (options?: { ttlMs?: number; now?: () => number }) => {
        store: (record: Record<string, unknown>, payload: unknown[]) => void;
        consume: (record: Record<string, unknown>) => unknown[] | null;
        clear: () => void;
      };
    };
  }
).HhrGestionCamasCudyr;

const activeBeds = (
  globalThis as typeof globalThis & {
    HhrGestionCamasActiveBeds: {
      createRecentBedsSlot: (options?: { ttlMs?: number; now?: () => number }) => {
        store: (record: Record<string, unknown>, payload: unknown[]) => void;
        consume: (record: Record<string, unknown>) => unknown[] | null;
        clear: () => void;
      };
    };
  }
).HhrGestionCamasActiveBeds;

const clinicalScoreRuntimeSource = readFileSync(
  new URL('../../../extension/clinical-score-runtime.js', import.meta.url),
  'utf8'
);

const loadClinicalScoreRuntime = () => {
  const context = vm.createContext({ URL, Date, Set, Map, Promise, encodeURIComponent });
  vm.runInContext(
    readFileSync(new URL('../../../extension/cudyr-capture-support.js', import.meta.url), 'utf8'),
    context
  );
  vm.runInContext(clinicalScoreRuntimeSource, context, { filename: 'clinical-score-runtime.js' });
  return (
    context as unknown as {
      HhrClinicalScoreRuntime: {
        create: (dependencies: Record<string, unknown>) => {
          handleCudyrCategoriesRequest: (
            request?: Record<string, unknown>
          ) => Promise<Record<string, unknown>>;
        };
      };
    }
  ).HhrClinicalScoreRuntime;
};

const createRuntimeDependencies = (overrides: Record<string, unknown> = {}) => ({
  chrome: { storage: { session: { get: async () => ({}), set: async () => undefined } } },
  crypto: { randomUUID: () => '12345678-1234-1234-1234-123456789012' },
  fetchWithTimeout: async () => ({ ok: true, status: 200, json: async () => [] }),
  getFichaFetchInfo: async () => ({ error: 'Ficha Médico no disponible.' }),
  resolveGestionCamasSession: async () => ({ error: 'Gestión de Camas no disponible.' }),
  classifyGestionCamasRejection: async () => '',
  nursingWorklists: ['noveltyNurseList', 'uneventfulNurseList', 'incomeNurseList'],
  resolveSessionHandoffKind: () => 'nursing',
  fetchFichaClaims: async () => ({ claims: [] }),
  hasFichaClaim: () => false,
  fetchActiveHospitalizedPatients: async () => ({ patients: [] }),
  mapWithConcurrency: async () => [],
  fetchScaleHistoryEvents: async () => ({ events: [] }),
  fetchEvaluationForms: async () => ({ forms: [] }),
  serializeClinicalWriteProtection: async () => ({}),
  verifyEncounterStillHospitalized: async () => ({ encounter: {} }),
  prescriptionPrint: { deriveScaleHistory: () => [] },
  gestionCamasCudyr: cudyr,
  now: () => 123_456,
  ...overrides,
});

describe('Gestión de Camas CUDYR normalizer', () => {
  const sourceVersion = {
    id: 91,
    formId: 1,
    value: 'C2',
    creationDate: '2026-10-06T03:00:00-05:00',
    healthCarePractitionerId: 7,
    healthCarePractitionerRoleId: 2,
    timeStamp: 'opaque-v1',
    formRegistrationDetailList: Array.from({ length: 14 }, (_, i) => ({
      fieldFormId: i + 1,
      value: 1,
    })),
  };
  const bedWith = (entries: unknown[]) => ({
    bedEncounterMapping: {
      encounterMapping: { encounter: { id: 901, formRegistrationSummaryList: entries } },
    },
  });
  it('keeps conflicting versions and tombstones across duplicate bed mappings out of the live projection', () => {
    const rows = cudyr.buildSnapshot({
      includeObservations: true,
      practitioners: [{ id: 7, fullName: 'Autor sintético' }],
      definitions: [],
      beds: [
        bedWith([sourceVersion]),
        bedWith([{ ...sourceVersion, isDeleted: true, timeStamp: 'opaque-v2' }]),
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].observations).toHaveLength(2);
    expect(rows[0].history).toEqual([]);
    expect(rows[0].crdValue).toBe('');
  });
  it('deduplicates identical versions but does not order different opaque tokens', () => {
    const build = (entries: unknown[]) =>
      cudyr.buildSnapshot({
        includeObservations: true,
        practitioners: [],
        definitions: [],
        beds: [bedWith(entries)],
      })[0];
    expect(build([sourceVersion, sourceVersion]).history).toHaveLength(1);
    expect(
      build([sourceVersion, { ...sourceVersion, value: 'D3', timeStamp: 'opaque-v0' }]).history
    ).toEqual([]);
  });
  it.each(['timeStamp', 'healthCarePractitionerRoleId'])(
    'marks missing %s as incomplete provenance',
    field => {
      const rows = cudyr.buildSnapshot({
        includeObservations: true,
        practitioners: [{ id: 7, fullName: 'Autor sintético' }],
        definitions: [],
        beds: [bedWith([{ ...sourceVersion, [field]: '' }])],
      });
      expect(rows[0].metadataComplete).toBe(false);
      expect(rows[0].observations).toHaveLength(1);
    }
  );

  it('captures source identity and tombstones without promoting deleted evaluations to current CUDYR', () => {
    const rows = cudyr.buildSnapshot({
      includeObservations: true,
      beds: [
        {
          bedEncounterMapping: {
            encounterMapping: {
              encounter: {
                id: 901,
                formRegistrationSummaryList: [
                  {
                    id: 21,
                    formId: 1,
                    value: 'C2',
                    isDeleted: true,
                    creationDate: '2026-10-06T03:53:00-05:00',
                    timeStamp: 'opaque-version',
                    healthCarePractitionerId: 44,
                    healthCarePractitionerRoleId: 2,
                    formRegistrationDetailList: Array.from({ length: 14 }, (_, index) => ({
                      fieldFormId: index + 1,
                      value: 1,
                    })),
                  },
                ],
              },
            },
          },
        },
      ],
      practitioners: [{ id: 44, fullName: 'Profesional sintético' }],
      definitions: [],
    });
    expect(rows).toMatchObject([
      {
        encId: '901',
        crdValue: '',
        history: [],
        metadataComplete: true,
        observations: [
          {
            id: '21',
            authorId: '44',
            authorRoleId: '2',
            sourceVersion: 'opaque-version',
            isDeleted: true,
            author: 'Profesional sintético',
            recordedAt: '2026-10-06T03:53:00-05:00',
          },
        ],
      },
    ]);
  });

  it('preserves official bed history when optional author and definition metadata fail', async () => {
    const beds = [{ bedEncounterMapping: { encounterMapping: { encounter: { id: 901 } } } }];
    const runtime = loadClinicalScoreRuntime().create(
      createRuntimeDependencies({
        getFichaFetchInfo: async () => ({ error: 'Ficha Médico no disponible.' }),
        resolveGestionCamasSession: async () => ({
          record: {
            apiBase: 'https://hospbackend.rayensalud.cl/api',
            facId: '1342',
            token: 'fixture',
          },
        }),
        fetchWithTimeout: async (url: string) => {
          if (url.endsWith('/beds')) {
            return { ok: true, status: 200, json: async () => beds };
          }
          if (url.includes('/healthCarePractitioners')) {
            return { ok: false, status: 503, json: async () => [] };
          }
          throw new Error('Definitions unavailable');
        },
        gestionCamasCudyr: {
          buildSnapshot: (input: Record<string, unknown>) => [input],
          mergeEncounterSnapshots: cudyr.mergeEncounterSnapshots,
        },
      })
    );
    const result = await runtime.handleCudyrCategoriesRequest();

    expect(result).toMatchObject({
      source: 'gestion_camas',
      historyAvailable: true,
      items: [{ beds, practitioners: [], definitions: [] }],
    });
    expect(String(result.warning)).toContain('autores CUDYR');
    expect(String(result.warning)).toContain('definiciones CUDYR');
  });

  it('keeps official metadata warnings when Ficha Médico is unavailable', async () => {
    const runtime = loadClinicalScoreRuntime().create(
      createRuntimeDependencies({
        getFichaFetchInfo: async () => ({ error: 'Ficha Médico no disponible.' }),
        resolveGestionCamasSession: async () => ({
          record: {
            apiBase: 'https://hospbackend.rayensalud.cl/api',
            facId: '1342',
            token: 'fixture',
          },
        }),
        fetchWithTimeout: async (url: string) =>
          url.endsWith('/beds')
            ? { ok: true, status: 200, json: async () => [] }
            : { ok: false, status: 503, json: async () => [] },
      })
    );
    const result = await runtime.handleCudyrCategoriesRequest();

    expect(result).toMatchObject({ ok: true, source: 'gestion_camas', historyAvailable: true });
    expect(String(result.warning)).toContain('autores CUDYR');
    expect(String(result.warning)).toContain('Ficha Médico no disponible.');
  });

  it('builds attributable, newest-first history from an occupied bed encounter', () => {
    const items = cudyr.buildSnapshot({
      beds: [
        {
          bedEncounterMapping: {
            encounterMapping: {
              encounter: {
                id: 901,
                formRegistrationSummaryList: [
                  {
                    id: 10,
                    formId: 1,
                    value: 'D3',
                    creationDate: '2026-07-10T23:12:04.74+00:00',
                    healthCarePractitionerId: 44,
                    healthCarePractitionerRoleId: 2,
                    formRegistrationDetailList: [
                      { fieldFormId: 1, value: 3 },
                      { fieldFormId: 7, value: 2 },
                    ],
                  },
                  {
                    id: 11,
                    formId: 1,
                    value: 'C2',
                    creationDate: '2026-07-15T06:54:00.00+00:00',
                    healthCarePractitionerId: 45,
                    healthCarePractitionerRoleId: 2,
                    formRegistrationDetailList: [
                      { fieldFormId: 1, value: 4 },
                      { fieldFormId: 7, value: 7 },
                    ],
                  },
                ],
              },
            },
          },
        },
      ],
      practitioners: [
        { id: 44, fullName: 'Camila Leiva' },
        { id: 45, fullName: 'Constanza Guajardo' },
      ],
      definitions: [
        { formId: 1, formFieldId: 1, formFieldLabel: 'Cambio de ropa', typeId: 1 },
        { formId: 1, formFieldId: 7, formFieldLabel: 'Signos vitales', typeId: 2 },
      ],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      encId: '901',
      crdValue: 'C2',
      author: 'Constanza Guajardo',
      authorRole: 'Enfermería',
      source: 'gestion_camas',
    });
    expect(items[0].history).toMatchObject([
      { category: 'C2', dependencyScore: null, riskScore: null },
      { category: 'D3', dependencyScore: null, riskScore: null },
    ]);
  });

  it('publishes numeric totals only when all 14 CUDYR variables are present', () => {
    const details = Array.from({ length: 14 }, (_, index) => ({
      fieldFormId: index + 1,
      value: index < 6 ? 2 : 3,
    }));
    const items = cudyr.buildSnapshot({
      beds: [
        {
          bedEncounterMapping: {
            encounterMapping: {
              encounter: {
                id: 903,
                formRegistrationSummaryList: [
                  {
                    id: 30,
                    formId: 1,
                    value: 'B2',
                    creationDate: '2026-07-15T06:54:00.00+00:00',
                    formRegistrationDetailList: details,
                  },
                ],
              },
            },
          },
        },
      ],
      practitioners: [],
      definitions: [],
    });

    expect(items[0].history).toMatchObject([
      { category: 'B2', dependencyScore: 12, riskScore: 24 },
    ]);
  });

  it('does not count null or blank CUDYR answers as zero-valued variables', () => {
    const details = Array.from({ length: 14 }, (_, index) => ({
      fieldFormId: index + 1,
      value: index === 2 ? null : index === 9 ? '   ' : 2,
    }));
    const items = cudyr.buildSnapshot({
      beds: [
        {
          bedEncounterMapping: {
            encounterMapping: {
              encounter: {
                id: 904,
                formRegistrationSummaryList: [
                  {
                    id: 31,
                    formId: 1,
                    value: 'B2',
                    creationDate: '2026-07-15T07:00:00.00+00:00',
                    formRegistrationDetailList: details,
                  },
                ],
              },
            },
          },
        },
      ],
      practitioners: [],
      definitions: [],
    });

    expect(items[0].history).toMatchObject([{ dependencyScore: null, riskScore: null }]);
  });

  it('retains more than 20 daily CUDYR records for historical census reconstruction', () => {
    const history = Array.from({ length: 25 }, (_, index) => ({
      id: 100 + index,
      formId: 1,
      value: 'D3',
      creationDate: new Date(Date.UTC(2026, 5, index + 1)).toISOString(),
      formRegistrationDetailList: [],
    }));
    const items = cudyr.buildSnapshot({
      beds: [
        {
          bedEncounterMapping: {
            encounterMapping: {
              encounter: {
                id: 905,
                formRegistrationSummaryList: history,
              },
            },
          },
        },
      ],
      practitioners: [],
      definitions: [],
    });

    expect(items[0].history).toHaveLength(25);
  });

  it('keeps Gestión de Camas authoritative and fills only missing encounters from Ficha Médico', () => {
    expect(
      cudyr.mergeEncounterSnapshots(
        [
          { encId: '901', crdValue: 'C2', source: 'gestion_camas' },
          { encId: '902', crdValue: 'D3', source: 'gestion_camas' },
        ],
        [
          { encId: '901', crdValue: 'A1', source: 'ficha_medico' },
          { encId: '903', crdValue: 'B2', source: 'ficha_medico' },
        ]
      )
    ).toEqual([
      { encId: '901', crdValue: 'C2', source: 'gestion_camas' },
      { encId: '902', crdValue: 'D3', source: 'gestion_camas' },
      { encId: '903', crdValue: 'B2', source: 'ficha_medico' },
    ]);
  });

  it('ignores S/C, deleted records and beds without an active encounter', () => {
    expect(
      cudyr.buildSnapshot({
        beds: [
          {},
          {
            bedEncounterMapping: {
              encounterMapping: {
                encounter: {
                  id: 902,
                  formRegistrationSummaryList: [
                    { id: 20, formId: 1, value: 'S/C', creationDate: '2026-07-15T06:00:00Z' },
                    {
                      id: 21,
                      formId: 1,
                      value: 'D3',
                      deleted: true,
                      creationDate: '2026-07-15T07:00:00Z',
                    },
                  ],
                },
              },
            },
          },
        ],
        practitioners: [],
        definitions: [],
      })
    ).toEqual([]);
  });

  it('orders same-second CUDYR records deterministically by descending numeric id and warns on unknown formId', () => {
    const warnings: string[] = [];
    const build = (entries: unknown[]) =>
      cudyr.buildSnapshot({
        includeObservations: true,
        practitioners: [{ id: 7, fullName: 'Enfermería sintética' }],
        definitions: [],
        warnings,
        beds: [bedWith(entries)],
      })[0];

    const first = {
      ...sourceVersion,
      id: 1002,
      value: 'C1',
      creationDate: '2026-10-06T03:00:00-05:00',
    };
    const second = {
      ...sourceVersion,
      id: 1010,
      value: 'B2',
      creationDate: '2026-10-06T03:00:00-05:00',
    };
    const unknownForm = {
      ...sourceVersion,
      id: 1011,
      formId: 3,
      value: 'A1',
      creationDate: '2026-10-06T03:05:00-05:00',
    };

    const forward = build([first, second, unknownForm]);
    const reversed = build([second, first]);

    expect(forward.crdValue).toBe('B2');
    expect(reversed.crdValue).toBe('B2');
    expect((forward.history as Array<{ id: string }>).map(entry => entry.id)).toEqual([
      '1010',
      '1002',
    ]);
    expect((reversed.history as Array<{ id: string }>).map(entry => entry.id)).toEqual([
      '1010',
      '1002',
    ]);
    expect(warnings).toEqual([
      'Gestión de Camas informó registros CUDYR con formId no reconocido (3).',
    ]);
  });

  it('maps midwife practitioner role 8 to Matrona and marks unrecognized CUDYR form warnings as partial metadata', async () => {
    const midwifeEntry = {
      ...sourceVersion,
      id: 1020,
      value: 'D3',
      healthCarePractitionerId: 55,
      healthCarePractitionerRoleId: 8,
    };
    const unknownFormEntry = {
      ...sourceVersion,
      id: 1021,
      formId: 3,
      value: 'A1',
    };
    const rows = cudyr.buildSnapshot({
      includeObservations: true,
      practitioners: [{ id: 55, fullName: 'Matrona Sintética' }],
      definitions: [],
      beds: [bedWith([midwifeEntry])],
    });
    expect(rows[0]).toMatchObject({
      encId: '901',
      crdValue: 'D3',
      author: 'Matrona Sintética',
      authorRole: 'Matrona',
      metadataComplete: true,
    });

    const runtime = loadClinicalScoreRuntime().create(
      createRuntimeDependencies({
        resolveGestionCamasSession: async () => ({
          record: {
            apiBase: 'https://hospbackend.rayensalud.cl/api',
            facId: '1342',
            token: 'token-1',
          },
        }),
        fetchWithTimeout: async (url: string) => {
          if (url.endsWith('/beds')) {
            return { ok: true, status: 200, json: async () => [bedWith([midwifeEntry, unknownFormEntry])] };
          }
          if (url.includes('/healthCarePractitioners')) {
            return { ok: true, status: 200, json: async () => [{ id: 55, fullName: 'Matrona Sintética' }] };
          }
          return { ok: true, status: 200, json: async () => [] };
        },
      })
    );
    const result = await runtime.handleCudyrCategoriesRequest();
    expect(result).toMatchObject({
      ok: true,
      source: 'gestion_camas',
      metadataStatus: 'partial',
    });
    expect(String(result.warning)).toContain('formId no reconocido (3)');
    expect((result.items as Array<Record<string, unknown>>)[0]).toMatchObject({
      author: 'Matrona Sintética',
      authorRole: 'Matrona',
    });
  });

  it('caches definitions and practitioners per facility, falls back on transient failure, and refreshes for an unseen practitioner', async () => {
    let clock = 10_000;
    let practitionersStatus = 200;
    let practitionersPayload = [{ id: 7, fullName: 'Autor inicial' }];
    let currentBeds = [bedWith([sourceVersion])];
    const requestedUrls: string[] = [];

    const runtime = loadClinicalScoreRuntime().create(
      createRuntimeDependencies({
        now: () => clock,
        resolveGestionCamasSession: async () => ({
          record: {
            apiBase: 'https://hospbackend.rayensalud.cl/api',
            facId: '1342',
            token: 'token-1',
          },
        }),
        fetchWithTimeout: async (url: string) => {
          requestedUrls.push(url);
          if (url.endsWith('/beds')) {
            return { ok: true, status: 200, json: async () => currentBeds };
          }
          if (url.includes('/healthCarePractitioners')) {
            return {
              ok: practitionersStatus === 200,
              status: practitionersStatus,
              json: async () => practitionersPayload,
            };
          }
          if (url.includes('/formCategorizationOfRisk')) {
            return {
              ok: true,
              status: 200,
              json: async () => [
                { formId: 1, formFieldId: 1, formFieldLabel: 'Cambio de ropa', typeId: 1 },
              ],
            };
          }
          return { ok: true, status: 200, json: async () => [] };
        },
      })
    );

    const first = await runtime.handleCudyrCategoriesRequest();
    expect(first).toMatchObject({ ok: true, metadataStatus: 'complete' });
    expect((first.items as Array<Record<string, unknown>>)[0].author).toBe('Autor inicial');
    expect(requestedUrls.filter(url => url.includes('/healthCarePractitioners'))).toHaveLength(1);
    expect(requestedUrls.filter(url => url.includes('/formCategorizationOfRisk'))).toHaveLength(1);

    // Within TTL (2 min): metadata comes from cache without extra HTTP calls.
    clock += 2 * 60 * 1000;
    const second = await runtime.handleCudyrCategoriesRequest();
    expect(second).toMatchObject({ ok: true, metadataStatus: 'complete' });
    expect(requestedUrls.filter(url => url.includes('/healthCarePractitioners'))).toHaveLength(1);
    expect(requestedUrls.filter(url => url.includes('/formCategorizationOfRisk'))).toHaveLength(1);

    // New practitioner ID appears within practitioners TTL: triggers one fresh catalog refresh.
    currentBeds = [bedWith([{ ...sourceVersion, id: 92, healthCarePractitionerId: 88 }])];
    practitionersPayload = [
      { id: 7, fullName: 'Autor inicial' },
      { id: 88, fullName: 'Enfermería nueva' },
    ];
    const third = await runtime.handleCudyrCategoriesRequest();
    expect((third.items as Array<Record<string, unknown>>)[0].author).toBe('Enfermería nueva');
    expect(requestedUrls.filter(url => url.includes('/healthCarePractitioners'))).toHaveLength(2);

    // After practitioners TTL expires (6 min), transient 503 falls back silently to cached catalog.
    clock += 6 * 60 * 1000;
    practitionersStatus = 503;
    const fourth = await runtime.handleCudyrCategoriesRequest();
    expect(fourth).toMatchObject({ ok: true, metadataStatus: 'complete' });
    expect((fourth.items as Array<Record<string, unknown>>)[0].author).toBe('Enfermería nueva');
    expect(String(fourth.warning || '')).not.toContain('autores CUDYR');
  });

  it('waits before retrying a transient official error, renews an expired 401 session once, and verifies session on success', async () => {
    const waits: number[] = [];
    let sessionCall = 0;
    let bedsCall = 0;
    const markGestionCamasSessionVerified = vi.fn(async () => true);

    const runtime = loadClinicalScoreRuntime().create(
      createRuntimeDependencies({
        wait: async (ms: number) => {
          waits.push(ms);
        },
        retryDelayMs: () => 650,
        markGestionCamasSessionVerified,
        resolveGestionCamasSession: async () => {
          sessionCall += 1;
          return {
            record: {
              apiBase: 'https://hospbackend.rayensalud.cl/api',
              facId: '1342',
              token: sessionCall === 1 ? 'expired-token' : 'fresh-token',
            },
          };
        },
        classifyGestionCamasRejection: async (response: { status: number }) =>
          response.status === 401 ? 'expired' : '',
        fetchWithTimeout: async (url: string, options: { headers?: { Authorization?: string } }) => {
          if (url.endsWith('/beds')) {
            bedsCall += 1;
            if (options?.headers?.Authorization === 'expired-token') {
              return { ok: false, status: 401, json: async () => [] };
            }
            if (bedsCall === 2) {
              return { ok: false, status: 503, json: async () => [] };
            }
            return { ok: true, status: 200, json: async () => [bedWith([sourceVersion])] };
          }
          return { ok: true, status: 200, json: async () => [] };
        },
      })
    );

    const result = await runtime.handleCudyrCategoriesRequest();
    expect(result).toMatchObject({ ok: true, source: 'gestion_camas', historyAvailable: true });
    expect(waits).toEqual([650]);
    expect(markGestionCamasSessionVerified).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'fresh-token' })
    );

    // Rejects payload if session verification fails mid-flight.
    const changedRuntime = loadClinicalScoreRuntime().create(
      createRuntimeDependencies({
        markGestionCamasSessionVerified: vi.fn(async () => false),
        resolveGestionCamasSession: async () => ({
          record: {
            apiBase: 'https://hospbackend.rayensalud.cl/api',
            facId: '1342',
            token: 'token-ok',
          },
        }),
        fetchWithTimeout: async () => ({ ok: true, status: 200, json: async () => [] }),
      })
    );
    const changed = await changedRuntime.handleCudyrCategoriesRequest();
    expect(String(changed.error)).toContain('cambió durante la consulta');
  });

  it('skips Ficha Médico fallback when Gestión de Camas covers all expected encounters and falls back only when one is missing', async () => {
    const fichaUrls: string[] = [];
    const fichaInfo = {
      apiOrigin: 'https://fichamedicoback.rayensalud.cl',
      facId: '1342',
      token: 'ficha-token',
    };
    const runtime = loadClinicalScoreRuntime().create(
      createRuntimeDependencies({
        getFichaFetchInfo: async () => ({ info: fichaInfo }),
        resolveGestionCamasSession: async () => ({
          record: {
            apiBase: 'https://hospbackend.rayensalud.cl/api',
            facId: '1342',
            token: 'gc-token',
          },
        }),
        fetchWithTimeout: async (url: string) => {
          if (url.startsWith(fichaInfo.apiOrigin)) {
            fichaUrls.push(url);
            return {
              ok: true,
              status: 200,
              json: async () => [{ id: 999, crdValue: 'A1', crdDateTime: '2026-10-06T04:00:00Z' }],
            };
          }
          if (url.endsWith('/beds')) {
            return { ok: true, status: 200, json: async () => [bedWith([sourceVersion])] };
          }
          return { ok: true, status: 200, json: async () => [] };
        },
      })
    );

    const complete = await runtime.handleCudyrCategoriesRequest({ expectedEncounterIds: ['901'] });
    expect(complete).toMatchObject({ ok: true, source: 'gestion_camas' });
    expect(fichaUrls).toHaveLength(0);

    const missing = await runtime.handleCudyrCategoriesRequest({
      expectedEncounterIds: ['901', '999'],
    });
    expect(missing).toMatchObject({ ok: true, source: 'gestion_camas+ficha_medico' });
    expect(fichaUrls).toHaveLength(3);
    expect((missing.items as Array<{ encId: string }>).map(item => item.encId)).toEqual([
      '901',
      '999',
    ]);
  });

  it('shares a single-use recent /beds handoff slot strictly for the same verified session within TTL', async () => {
    let clock = 50_000;
    const slot = activeBeds.createRecentBedsSlot({ ttlMs: 10_000, now: () => clock });
    const sessionRecord = {
      apiBase: 'https://hospbackend.rayensalud.cl/api',
      facId: '1342',
      token: 'token-1',
      sourceTabId: 4,
      connectionAttemptId: 'attempt-1',
      verificationEpoch: 2,
    };

    slot.store(sessionRecord, [bedWith([sourceVersion])]);
    expect(slot.consume({ ...sessionRecord, token: 'other-token' })).toBeNull();
    expect(slot.consume({ ...sessionRecord, verificationEpoch: 3 })).toBeNull();

    const bedsFetches: string[] = [];
    const markGestionCamasSessionVerified = vi.fn(async () => true);
    const runtime = loadClinicalScoreRuntime().create(
      createRuntimeDependencies({
        now: () => clock,
        markGestionCamasSessionVerified,
        consumeRecentBeds: (record: Record<string, unknown>) => slot.consume(record),
        resolveGestionCamasSession: async () => ({ record: sessionRecord }),
        fetchWithTimeout: async (url: string) => {
          if (url.endsWith('/beds')) bedsFetches.push(url);
          return {
            ok: true,
            status: 200,
            json: async () => (url.endsWith('/beds') ? [bedWith([sourceVersion])] : []),
          };
        },
      })
    );

    // First call consumes the handoff slot (0 HTTP /beds reads) and still verifies the session.
    const first = await runtime.handleCudyrCategoriesRequest();
    expect(first).toMatchObject({ ok: true, source: 'gestion_camas' });
    expect(bedsFetches).toHaveLength(0);
    expect(markGestionCamasSessionVerified).toHaveBeenCalledTimes(1);

    // Second call must read /beds fresh because the handoff slot is single-use.
    const second = await runtime.handleCudyrCategoriesRequest();
    expect(second).toMatchObject({ ok: true, source: 'gestion_camas' });
    expect(bedsFetches).toHaveLength(1);

    // Expired or cleared slot is never reused.
    slot.store(sessionRecord, [bedWith([sourceVersion])]);
    clock += 10_001;
    expect(slot.consume(sessionRecord)).toBeNull();

    slot.store(sessionRecord, [bedWith([sourceVersion])]);
    slot.clear();
    expect(slot.consume(sessionRecord)).toBeNull();
  });
});
