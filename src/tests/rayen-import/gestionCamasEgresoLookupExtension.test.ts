import { describe, expect, it, vi } from 'vitest';

import '../../../extension/clinico/clinical-day-runtime.js';
import '../../../extension/gestion-camas/gestion-camas-egreso-lookup.js';
import '../../../extension/gestion-camas/gestion-camas-egreso-query-runtime.js';

const lookup = (
  globalThis as typeof globalThis & {
    HhrGestionCamasEgresoLookup: {
      normalizeTargets: (
        runs: unknown[],
        targets?: unknown[]
      ) => Array<{
        run: string;
        encounterId: string;
        dischargeDay?: string;
        documentType?: 'Pasaporte';
      }>;
      identifierTypesForTarget: (target: unknown) => readonly number[];
      pickMetadata: (payload: unknown) => Record<string, unknown>;
      selectEncounter: (
        payload: unknown,
        encounterId: string,
        dischargeDay?: string
      ) => Record<string, unknown> | null;
    };
    HhrGestionCamasEgresoQueryRuntime: {
      create: (deps: Record<string, unknown>) => {
        request: (
          runs: unknown[],
          targets: unknown[],
          sender?: unknown
        ) => Promise<{ results?: Array<Record<string, unknown>>; error?: string }>;
      };
    };
  }
).HhrGestionCamasEgresoLookup;

const queryRuntimeFactory = (
  globalThis as typeof globalThis & {
    HhrGestionCamasEgresoQueryRuntime: {
      create: (deps: Record<string, unknown>) => {
        request: (
          runs: unknown[],
          targets: unknown[],
          sender?: unknown
        ) => Promise<{ results?: Array<Record<string, unknown>>; error?: string }>;
      };
    };
  }
).HhrGestionCamasEgresoQueryRuntime;

describe('Gestión de Camas exact-episode discharge lookup', () => {
  it('normalizes RUNs while retaining the requested hospitalization id', () => {
    expect(lookup.normalizeTargets([], [{ run: '22.025.389-9', encounterId: '141704' }])).toEqual([
      { run: '220253899', encounterId: '141704' },
    ]);
  });

  it('selects encounter 141704 instead of the first hospitalization for the same RUN', () => {
    expect(
      lookup.selectEncounter(
        [
          { id: 120001, endPeriod: '2025-01-02T10:00:00-03:00' },
          { id: 141704, endPeriod: '2026-07-19T17:10:00-04:00' },
        ],
        '141704'
      )
    ).toMatchObject({ id: 141704 });
  });

  it('fails closed when Gestión de Camas returns only another episode', () => {
    expect(lookup.selectEncounter([{ id: 120001 }], '141704')).toBeNull();
  });

  it('resolves one report-only episode by its discharge day instead of taking the first row', () => {
    const payload = [
      { id: 120001, endPeriod: '2025-01-02T10:00:00-03:00' },
      { id: 143322, dateDischarge: '2026-08-13T22:29:00-04:00' },
    ];

    expect(lookup.selectEncounter(payload, '', '2026-08-13')).toMatchObject({ id: 143322 });
    expect(lookup.selectEncounter(payload, '', '2026-08-14')).toBeNull();
  });

  it('fails closed when two episodes for the RUN share the requested discharge day', () => {
    expect(
      lookup.selectEncounter(
        [
          { id: 143322, endPeriod: '2026-08-13T20:29:00-06:00' },
          { id: 143323, endPeriod: '2026-08-13T23:00:00-06:00' },
        ],
        '',
        '2026-08-13'
      )
    ).toBeNull();
  });

  it('converts offset-bearing timestamps to the Rapa Nui discharge day', () => {
    expect(
      lookup.selectEncounter(
        [{ id: 143322, dateDischarge: '2026-08-14T01:00:00-04:00' }],
        '',
        '2026-08-13'
      )
    ).toMatchObject({ id: 143322 });
  });

  it('forwards only approved discharge metadata and excludes patient identifiers', () => {
    expect(
      lookup.pickMetadata({
        id: 141704,
        hasAdministrativeDischarge: true,
        dischargeDestinationName: 'Domicilio',
        patientName: 'Dato clínico no permitido',
        rut: '22.025.389-9',
      })
    ).toEqual({
      id: 141704,
      hasAdministrativeDischarge: true,
      dischargeDestinationName: 'Domicilio',
    });
  });

  it('matches an overnight discharge to the preceding nursing census day', () => {
    const payload = [{ id: 143322, endPeriod: '2026-10-10T01:42:01.370-05:00' }];
    expect(lookup.selectEncounter(payload, '', '2026-10-09')).toMatchObject({ id: 143322 });
    expect(lookup.selectEncounter(payload, '', '2026-10-10')).toBeNull();
  });

  it('respects the weekend night boundary and rejects ambiguous episodes', () => {
    const early = { id: 143322, endPeriod: '2026-10-10T08:59:00-05:00' };
    const later = { id: 143323, endPeriod: '2026-10-10T09:00:00-05:00' };
    expect(lookup.selectEncounter([early, later], '', '2026-10-09')).toEqual(early);
    expect(lookup.selectEncounter([early, later], '', '2026-10-10')).toEqual(later);
    expect(lookup.selectEncounter([early, { ...early, id: 143324 }], '', '2026-10-09')).toBeNull();
  });

  it('preserves foreign document text and isolates passport lookups to PrefferedPeridentEnum [3, 9, 10, 11] (ID-01)', async () => {
    expect(
      lookup.normalizeTargets(
        [],
        [
          { run: 'P-12345678', encounterId: '9101', documentType: 'Pasaporte' },
          { run: '887766554', encounterId: '9102', documentType: 'Pasaporte' },
        ]
      )
    ).toEqual([
      { run: 'P12345678', encounterId: '9101', documentType: 'Pasaporte' },
      { run: '887766554', encounterId: '9102', documentType: 'Pasaporte' },
    ]);

    expect([...lookup.identifierTypesForTarget({ run: '123456785', documentType: 'Pasaporte' })]).toEqual([
      3, 9, 10, 11,
    ]);
    expect([...lookup.identifierTypesForTarget({ run: 'P12345678' })]).toEqual([3, 9, 10, 11]);
    expect([...lookup.identifierTypesForTarget({ run: '887766554' })]).toEqual([3, 9, 10, 11, 2, 4]);
    expect([...lookup.identifierTypesForTarget({ run: '220253899' })]).toEqual([2, 4]);

    const queriedUrls: string[] = [];
    const authorize = vi.fn();
    const runtime = queryRuntimeFactory.create({
      resolveSession: async () => ({
        record: { apiBase: 'https://hospbackend.rayensalud.cl/api', facId: '1342', token: 'tok' },
      }),
      classifyRejection: async () => '',
      markSessionVerified: async () => true,
      authorizeVerifiedEncounter: () => authorize,
      fetchWithTimeout: async (url: string) => {
        queriedUrls.push(url);
        const typeId = new URL(url).searchParams.get('prefferedPeridentId');
        const payload =
          typeId === '3'
            ? [{ id: 910700, endPeriod: '2026-10-27T13:10:00-05:00', hasAdministrativeDischarge: true }]
            : [];
        return { ok: true, status: 200, json: async () => payload };
      },
    });

    const response = await runtime.request(
      [],
      [{ run: '887766554', encounterId: '910700', documentType: 'Pasaporte' }]
    );
    expect(queriedUrls).toEqual([
      'https://hospbackend.rayensalud.cl/api/facility/1342/encounter?facId=0&prefferedIdentifierCode=887766554&prefferedPeridentId=3',
    ]);
    expect(authorize).toHaveBeenCalledWith('910700');
    expect(response.results).toEqual([
      {
        run: '887766554',
        encounterId: '910700',
        egreso: {
          id: 910700,
          endPeriod: '2026-10-27T13:10:00-05:00',
          hasAdministrativeDischarge: true,
        },
      },
    ]);
  });
});
