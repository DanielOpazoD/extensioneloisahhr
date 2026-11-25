import { describe, expect, it } from 'vitest';

import '../../../extension/fichamedico-diagnosis-coding.js';

type Diagnosis = { code: string; classificationId: number | null; name: string };
type Encounter = { diagnosis?: string; diagnosisCode?: string; diagnosisDescription?: string };

const coding = (
  globalThis as typeof globalThis & {
    HhrFichaMedicoDiagnosisCoding: {
      selectPrincipalDiagnosis: (
        rows: unknown[],
        header?: Record<string, unknown>,
        item?: Record<string, unknown>
      ) => { name: string; classificationId: number | null };
      indexDiagnosisCatalog: (rows: unknown) => Map<number, string>;
      serializeDiagnosisCatalog: (
        codes: Map<number, string>,
        origin: string,
        now: number,
        ttlMs: number
      ) => Record<string, unknown> | null;
      parsePersistedDiagnosisCatalog: (
        raw: unknown,
        expectedOrigin: string,
        now: number,
        ttlMs: number
      ) => { codes: Map<number, string>; savedAt: number; expiresAt: number } | null;
      createEnricher: (
        reader: () => Promise<Map<number, string> | { codes: Map<number, string>; fromPersisted?: boolean }>,
        refresh?: () => Promise<Map<number, string>>
      ) => {
        queue: (index: number, diagnosis: Diagnosis) => void;
        apply: (encounters: Encounter[]) => Promise<void>;
      };
    };
  }
).HhrFichaMedicoDiagnosisCoding;

describe('Ficha Médico diagnosis coding', () => {
  it('selects the latest active event regardless of principal flag or response order', () => {
    const rows = [
      { id: 1, encounterEventId: 100, isPrincipal: true, diagnosisName: 'Inicial' },
      {
        id: 2,
        encounterEventId: 120,
        isPrincipal: false,
        diagnosisName: 'Vigente',
        internalCode: 'J18.9',
      },
      { id: 3, encounterEventId: 140, diagnosisName: 'Archivado', archived: true },
      { id: 4, encounterEventId: 160, diagnosisName: 'Borrado', deleted: true },
    ];
    for (const ordered of [rows, [...rows].reverse()]) {
      expect(coding.selectPrincipalDiagnosis(ordered)).toMatchObject({
        name: 'Vigente',
        code: 'J18.9',
      });
    }
  });

  it('preserves a coded principal diagnosis when enriching uncoded admissions', async () => {
    let reads = 0;
    const enricher = coding.createEnricher(async () => {
      reads += 1;
      return new Map([
        [4405, 'J15'],
        [77, 'R50'],
      ]);
    });
    const encounters: Encounter[] = [
      { diagnosis: 'Neumonía bacteriana' },
      { diagnosis: 'Principal', diagnosisCode: 'F23' },
    ];
    enricher.queue(0, { name: 'Neumonía bacteriana', classificationId: 4405, code: '' });
    enricher.queue(1, { name: 'Principal', classificationId: 77, code: 'F23' });
    await enricher.apply(encounters);
    expect(encounters).toEqual([
      {
        diagnosis: 'Neumonía bacteriana',
        diagnosisCode: 'J15',
        diagnosisDescription: 'Neumonía bacteriana',
      },
      { diagnosis: 'Principal', diagnosisCode: 'F23' },
    ]);
    expect(reads).toBe(1);
  });

  it('continues an uncoded snapshot if the catalog fails and retries on the next capture', async () => {
    let reads = 0;
    const reader = async () => {
      reads += 1;
      if (reads === 1) throw new Error('Catálogo temporalmente indisponible');
      return new Map([[4405, 'J15']]);
    };
    const diagnosis = { name: 'Neumonía bacteriana', classificationId: 4405, code: '' };
    const first = coding.createEnricher(reader);
    const initial: Encounter[] = [{ diagnosis: diagnosis.name }];
    first.queue(0, diagnosis);
    await first.apply(initial);
    expect(initial[0].diagnosisCode).toBeUndefined();

    const next = coding.createEnricher(reader);
    const recovered: Encounter[] = [{ diagnosis: diagnosis.name }];
    next.queue(0, diagnosis);
    await next.apply(recovered);
    expect(recovered[0].diagnosisCode).toBe('J15');
    expect(reads).toBe(2);
  });
  it('uses the matching Rayen classification id for a principal or admission-only diagnosis', () => {
    expect(
      coding.selectPrincipalDiagnosis([], {
        principalDiagId: 12,
        principalDiagName: 'Principal',
        haoDiagId: 99,
        haoDiagName: 'Ingreso',
      })
    ).toMatchObject({ name: 'Principal', classificationId: 12, source: 'principal-header' });
    expect(
      coding.selectPrincipalDiagnosis([], {
        principalDiagId: null,
        haoDiagId: 4405,
        haoDiagName: 'Neumonía bacteriana',
      })
    ).toMatchObject({ name: 'Neumonía bacteriana', classificationId: 4405, source: 'admission' });
    expect(
      coding.selectPrincipalDiagnosis(
        [],
        {
          haoDiagName: 'Neumonía bacteriana',
        },
        {
          diagnosisId: 4405,
          diagnosisName: 'Neumonía bacteriana (Ingreso) (solicitud hospitalización)',
        }
      )
    ).toMatchObject({ name: 'Neumonía bacteriana', classificationId: 4405, source: 'admission' });
    expect(
      coding.selectPrincipalDiagnosis(
        [],
        {
          principalDiagName: 'Diagnóstico principal',
          haoDiagName: 'Neumonía bacteriana',
        },
        { diagnosisId: 4405, diagnosisName: 'Neumonía bacteriana' }
      )
    ).toMatchObject({
      name: 'Diagnóstico principal',
      classificationId: null,
      source: 'principal-header',
    });
    expect(
      coding.selectPrincipalDiagnosis(
        [],
        {
          haoDiagName: 'Neumonía bacteriana',
        },
        { diagnosisId: 6535, diagnosisName: 'Balanitis' }
      )
    ).toMatchObject({ name: 'Neumonía bacteriana', classificationId: null, source: 'admission' });
    expect(
      coding.selectPrincipalDiagnosis(
        [],
        {},
        {
          diagnosisId: 6535,
          diagnosisName: 'Balanitis',
        }
      )
    ).toMatchObject({ name: 'Balanitis', classificationId: 6535, source: 'admission' });
    expect(
      coding.selectPrincipalDiagnosis(
        [
          {
            isPrincipal: true,
            diagnosisClassifyId: 8,
            diagnosisName: 'Sin código',
          },
        ],
        { principalDiagId: 12, principalDiagName: 'Otro' }
      )
    ).toMatchObject({ name: 'Sin código', classificationId: 8, source: 'principal-entry' });
  });

  it('indexes only official CIE-10 codes by exact Rayen classification id', () => {
    const catalog = coding.indexDiagnosisCatalog([
      { id: 4405, name: 'Neumonía bacteriana', internalCode: 'J15' },
      { id: 6535, name: 'Balanitis', internalCode: 'N51.2' },
      { id: 4125, name: 'Insuficiencia cardíaca', internalCode: 'inválido', standarCode: 'I50.0' },
      { id: 999, name: 'Texto libre', internalCode: 'SIN CÓDIGO' },
    ]);
    expect([...catalog.entries()]).toEqual([
      [4405, 'J15'],
      [6535, 'N51.2'],
      [4125, 'I50.0'],
    ]);
    expect(() => coding.indexDiagnosisCatalog({ errorCode: 500 })).toThrow();
  });

  it('serializes and strictly validates persisted diagnosis catalog entries (fail-closed)', () => {
    const origin = 'https://fichamedicoback.rayensalud.cl';
    const now = 1_764_000_000_000;
    const ttlMs = 12 * 60 * 60 * 1000;
    const serialized = coding.serializeDiagnosisCatalog(
      new Map([
        [4405, 'J15'],
        [6535, 'N51.2'],
      ]),
      origin,
      now,
      ttlMs
    );
    expect(serialized).toEqual({
      version: 1,
      origin,
      savedAt: now,
      expiresAt: now + ttlMs,
      entries: [
        [4405, 'J15'],
        [6535, 'N51.2'],
      ],
    });

    const parsed = coding.parsePersistedDiagnosisCatalog(serialized, origin, now + 1000, ttlMs);
    expect([...(parsed?.codes.entries() || [])]).toEqual([
      [4405, 'J15'],
      [6535, 'N51.2'],
    ]);

    // Rejects wrong origin, expired TTL, oversized TTL, wrong version, empty or malformed entries.
    expect(coding.parsePersistedDiagnosisCatalog(serialized, 'https://other.rayensalud.cl', now + 1000, ttlMs)).toBeNull();
    expect(coding.parsePersistedDiagnosisCatalog(serialized, origin, now + ttlMs, ttlMs)).toBeNull();
    expect(coding.parsePersistedDiagnosisCatalog({ ...serialized, expiresAt: now + ttlMs * 3 }, origin, now + 1000, ttlMs)).toBeNull();
    expect(coding.parsePersistedDiagnosisCatalog({ ...serialized, version: 2 }, origin, now + 1000, ttlMs)).toBeNull();
    expect(coding.parsePersistedDiagnosisCatalog({ ...serialized, entries: [] }, origin, now + 1000, ttlMs)).toBeNull();
    expect(coding.parsePersistedDiagnosisCatalog({ ...serialized, entries: [[4405, 'INVALIDO']] }, origin, now + 1000, ttlMs)).toBeNull();
    expect(coding.parsePersistedDiagnosisCatalog({ ...serialized, entries: [[-1, 'J15']] }, origin, now + 1000, ttlMs)).toBeNull();
  });

  it('refreshes once from network only when a persisted catalog misses a queued classification id', async () => {
    let refreshes = 0;
    const persisted = new Map([[4405, 'J15']]);
    const refreshed = new Map([
      [4405, 'J15'],
      [7001, 'K35.8'],
    ]);

    // Warm persisted hit: zero refreshes.
    const warm = coding.createEnricher(
      async () => ({ codes: persisted, fromPersisted: true }),
      async () => {
        refreshes += 1;
        return refreshed;
      }
    );
    const warmEncounters: Encounter[] = [{ diagnosis: 'Neumonía' }];
    warm.queue(0, { name: 'Neumonía', classificationId: 4405, code: '' });
    await warm.apply(warmEncounters);
    expect(warmEncounters[0].diagnosisCode).toBe('J15');
    expect(refreshes).toBe(0);

    // Persisted miss on new ID 7001: triggers one network refresh and resolves K35.8.
    const miss = coding.createEnricher(
      async () => ({ codes: persisted, fromPersisted: true }),
      async () => {
        refreshes += 1;
        return refreshed;
      }
    );
    const missEncounters: Encounter[] = [{ diagnosis: 'Apendicitis' }];
    miss.queue(0, { name: 'Apendicitis', classificationId: 7001, code: '' });
    await miss.apply(missEncounters);
    expect(missEncounters[0].diagnosisCode).toBe('K35.8');
    expect(refreshes).toBe(1);

    // Fresh network catalog missing an uncoded ID 999: does NOT refresh again.
    const fresh = coding.createEnricher(
      async () => ({ codes: refreshed, fromPersisted: false }),
      async () => {
        refreshes += 1;
        return refreshed;
      }
    );
    const uncodedEncounters: Encounter[] = [{ diagnosis: 'Texto libre' }];
    fresh.queue(0, { name: 'Texto libre', classificationId: 999, code: '' });
    await fresh.apply(uncodedEncounters);
    expect(uncodedEncounters[0].diagnosisCode).toBeUndefined();
    expect(refreshes).toBe(1);
  });
});
