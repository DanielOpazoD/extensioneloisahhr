import { afterEach, describe, expect, it } from 'vitest';

import '../../../extension/fichamedico-isolation-normalization.js';
import '../../../extension/fichamedico-treating-physician-dom.js';
import '../../../extension/fichamedico-treating-physician-sources.js';
import '../../../extension/fichamedico-treating-physician-normalization.js';
import '../../../extension/fichamedico-diagnosis-coding.js';
import '../../../extension/fichamedico-normalization.js';
import '../../../extension/fichamedico-capture-cache.js';
import '../../../extension/fichamedico-census-runtime.js';

const treatingPhysicianNormalization = (
  globalThis as typeof globalThis & {
    HhrFichaMedicoTreatingPhysicianNormalization: {
      assignedFromDocument: (root: Document) => Array<{
        practitionerId: string;
        displayName: string;
      }>;
      assignedByEncounterFromDocument: (
        root: Document
      ) => Record<string, { practitionerId: string; displayName: string } | null>;
      captureFromDocument: (options: Record<string, unknown>) => Promise<unknown>;
      merge: (...sources: unknown[]) => Array<{
        practitionerId: string;
        displayName: string;
      }>;
      normalize: (rows: unknown) => Array<{
        practitionerId: string;
        displayName: string;
      }>;
    };
  }
).HhrFichaMedicoTreatingPhysicianNormalization;

const normalization = (
  globalThis as typeof globalThis & {
    HhrFichaMedicoNormalization: {
      normalizeEncounter: (
        item: unknown,
        header: unknown,
        principalDiagnosis: unknown,
        discharged?: boolean,
        physicianById?: Record<string, unknown>,
        physicianByEncounterId?: Record<string, unknown>,
        documentTypesByEncounterId?: Record<string, unknown>
      ) => Record<string, unknown>;
      documentTypesByEncounterFromDocument: (
        root: unknown
      ) => Record<string, { documentType: 'Pasaporte'; identifier: string }>;
      resolveDocumentType: (
        item: unknown,
        header: unknown,
        run: unknown,
        documentTypesByEncounterId?: Record<string, unknown>
      ) => 'RUT' | 'Pasaporte' | undefined;
      normalizeSessionExpiry: (session: unknown, payload?: unknown) => number | null;
      normalizeSessionRole: (session: unknown) => string;
      selectPrincipalDiagnosis: (
        rows: unknown[],
        header?: Record<string, unknown>,
        listItem?: Record<string, unknown>
      ) => { name: string; code: string; classificationId: number | null; source: string };
      indexDiagnosisCatalog: (rows: unknown) => Map<number, string>;
      validClinicalDate: (value: unknown) => string | undefined;
      requiresIsolationDetails: (value: unknown) => boolean;
    };
  }
).HhrFichaMedicoNormalization;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Ficha Medico identity and session normalization', () => {
  it.each([
    [{ role: '  Médico   cirujano  ' }, 'Médico cirujano'],
    [{ role: '', healthCarePractitionerRoleName: ' Enfermera(o) ' }, 'Enfermera(o)'],
    [{ profileName: 'Enfermería' }, 'Enfermería'],
    [null, ''],
  ])('normalizes role fixture %#', (session, expected) => {
    expect(normalization.normalizeSessionRole(session)).toBe(expected);
  });

  it.each([
    [{ expiresAt: 1_800_000_000 }, undefined, 1_800_000_000_000],
    [{ expires: 1_800_000_000_123 }, undefined, 1_800_000_000_123],
    [{ expirationDateTime: '2027-01-15T12:30:00.000Z' }, undefined, 1_800_016_200_000],
    // Campo real de Eloísa (sesión de 24 h con zona horaria de la isla).
    [{ expirationDate: '2026-09-03T08:28:10.3065687-06:00' }, undefined, 1_788_445_690_306],
    [{}, { expires: 'not-a-date' }, null],
    [null, null, null],
  ])('normalizes expiration fixture %#', (session, payload, expected) => {
    expect(normalization.normalizeSessionExpiry(session, payload)).toBe(expected);
  });
});

describe('Ficha Medico census normalization', () => {
  it('normalizes the facility physician catalog and resolves the encounter assignment by id', () => {
    const physicians = treatingPhysicianNormalization.normalize([
      { id: 7947, firstGivenName: 'Angelica', firstFamilyName: 'Vargas' },
      { id: 7947, firstGivenName: 'Duplicada', firstFamilyName: 'No usar' },
      { id: null, firstGivenName: 'Sin', firstFamilyName: 'Id' },
    ]);
    const physicianById = Object.fromEntries(
      physicians.map(physician => [physician.practitionerId, physician])
    );

    expect(physicians).toEqual([{ practitionerId: '7947', displayName: 'Angelica Vargas' }]);
    expect(
      normalization.normalizeEncounter(
        { id: 141336, healthCarePractitionerAssignedId: 7947 },
        {},
        {},
        false,
        physicianById
      )
    ).toMatchObject({
      treatingPhysicianId: '7947',
      treatingPhysicianName: 'Angelica Vargas',
    });
  });

  it('accepts wrapped or nested physician catalogs from compatible Ficha Medico versions', () => {
    expect(
      treatingPhysicianNormalization.normalize({
        data: [
          {
            id: 512,
            healthCarePractitioner: {
              id: 7947,
              fullName: '  Angelica   Vargas ',
            },
          },
        ],
      })
    ).toEqual([{ practitionerId: '7947', displayName: 'Angelica Vargas' }]);
  });

  it('recovers assigned physician identities from the rendered census rows', () => {
    document.body.innerHTML = `
      <table>
        <thead><tr><th>Servicio</th><th>Paciente</th><th>Médico tratante</th></tr></thead>
        <tbody><tr>
          <td><div role="combobox">Medicina</div><input value="404" /></td>
          <td><a href="/dashboard/encounter-list/141336">Paciente</a></td>
          <td><div role="combobox"> Angelica   Vargas </div><input value="7947" /></td>
        </tr><tr>
          <td><div role="combobox">Cirugía</div><input value="405" /></td>
          <td><a href="/dashboard/encounter-list/141337">Paciente</a></td>
          <td><div role="combobox">Sin asignación</div><input value="0" /></td>
        </tr></tbody>
      </table>
    `;

    expect(treatingPhysicianNormalization.assignedFromDocument(document)).toEqual([
      { practitionerId: '7947', displayName: 'Angelica Vargas' },
    ]);
    expect(treatingPhysicianNormalization.assignedByEncounterFromDocument(document)).toEqual({
      '141336': { practitionerId: '7947', displayName: 'Angelica Vargas' },
      '141337': null,
    });
  });

  it('reads the live physician input value when React did not render a value attribute', () => {
    document.body.innerHTML = `
      <table>
        <thead><tr><th>Paciente</th><th>Médico tratante</th></tr></thead>
        <tbody><tr>
          <td><a href="/dashboard/encounter-list/141336">Paciente</a></td>
          <td><div role="combobox">Angelica Vargas</div><input /></td>
        </tr></tbody>
      </table>
    `;
    const input = document.querySelector('tbody input') as HTMLInputElement;
    input.value = '7947';

    expect(input.hasAttribute('value')).toBe(false);
    expect(treatingPhysicianNormalization.assignedByEncounterFromDocument(document)).toEqual({
      '141336': { practitionerId: '7947', displayName: 'Angelica Vargas' },
    });
  });

  it('resolves a physician from the rendered encounter row when the list response omits it', () => {
    expect(
      normalization.normalizeEncounter(
        { id: 141336 },
        {},
        {},
        false,
        {},
        {
          '141336': { practitionerId: '7947', displayName: 'Angelica Vargas' },
        }
      )
    ).toMatchObject({
      treatingPhysicianId: '7947',
      treatingPhysicianName: 'Angelica Vargas',
    });
  });

  it('prefers the visible encounter assignment over a stale list assignment', () => {
    expect(
      normalization.normalizeEncounter(
        { id: 141336, healthCarePractitionerAssignedId: 8001 },
        {},
        {},
        false,
        { '8001': { practitionerId: '8001', displayName: 'Nombre anterior' } },
        {
          '141336': { practitionerId: '7947', displayName: 'Angelica Vargas' },
        }
      )
    ).toMatchObject({
      treatingPhysicianId: '7947',
      treatingPhysicianName: 'Angelica Vargas',
    });
  });

  it('preserves an explicit visible unassignment instead of reviving a stale list value', () => {
    expect(
      normalization.normalizeEncounter(
        { id: 141336, healthCarePractitionerAssignedId: 8001 },
        {},
        {},
        false,
        { '8001': { practitionerId: '8001', displayName: 'Nombre anterior' } },
        { '141336': null }
      )
    ).toMatchObject({
      treatingPhysicianId: undefined,
      treatingPhysicianName: undefined,
    });
  });

  it('ignores an incomplete rendered assignment instead of clearing a valid list value', () => {
    document.body.innerHTML = `
      <table>
        <thead><tr><th>Paciente</th><th>Médico tratante</th></tr></thead>
        <tbody><tr>
          <td><a href="/dashboard/encounter-list/141336">Paciente</a></td>
          <td><div role="combobox"></div><input value="7947" /></td>
        </tr></tbody>
      </table>
    `;

    const rendered = treatingPhysicianNormalization.assignedByEncounterFromDocument(document);
    expect(rendered).toEqual({});
    expect(
      normalization.normalizeEncounter(
        { id: 141336, healthCarePractitionerAssignedId: 7947 },
        {},
        {},
        false,
        { '7947': { practitionerId: '7947', displayName: 'Angelica Vargas' } },
        rendered
      )
    ).toMatchObject({
      treatingPhysicianId: '7947',
      treatingPhysicianName: 'Angelica Vargas',
    });
  });

  it('exposes malformed rendered assignments as a rejected capture promise', async () => {
    const malformedRoot = {
      querySelectorAll: () => {
        throw new Error('malformed physician assignment table');
      },
    } as unknown as Document;

    await expect(
      treatingPhysicianNormalization.captureFromDocument({
        apiGet: async () => [],
        apiOrigin: 'https://fichamedico.example',
        facilityId: '1',
        auth: {},
        root: malformedRoot,
      })
    ).rejects.toThrow('malformed physician assignment table');
  });

  it('keeps current assigned-row evidence ahead of a stale facility catalog name', () => {
    expect(
      treatingPhysicianNormalization.merge(
        [{ practitionerId: '7947', displayName: 'Angelica Vargas' }],
        [
          { id: 7947, displayName: 'Nombre anterior' },
          { id: 7942, displayName: 'Otra médica' },
        ]
      )
    ).toEqual([
      { practitionerId: '7947', displayName: 'Angelica Vargas' },
      { practitionerId: '7942', displayName: 'Otra médica' },
    ]);
  });

  it('requests separate detail only for active isolation signals', () => {
    expect(normalization.requiresIsolationDetails({ isIsolated: true })).toBe(true);
    expect(normalization.requiresIsolationDetails({ isIsolated: false })).toBe(false);
    expect(
      normalization.requiresIsolationDetails({
        isIsolated: true,
        isolationEntries: [{ isoTypeName: 'Gotas', endIsolationDatetime: '2026-07-24' }],
      })
    ).toBe(false);
  });

  it.each([
    ['0001-01-01T00:00:00.000Z', undefined],
    ['2026-07-18T14:30:00.000Z', '2026-07-18T14:30:00.000Z'],
    ['not-a-date', undefined],
    [null, undefined],
  ])('normalizes clinical date fixture %#', (value, expected) => {
    expect(normalization.validClinicalDate(value)).toBe(expected);
  });

  it('preserves the Ficha Medico encounter snapshot shape', () => {
    expect(
      normalization.normalizeEncounter(
        {
          id: 141336,
          patient: { identifier: '12.345.678-5', patientName: 'Ana   María' },
          hospitalDepartmentShortName: 'MED',
          roomShortName: 'Sala 1',
          bedShortName: 'Cama 2',
          hasNurseDischarge: true,
          isIsolated: true,
          isoTypeName: 'Gotas',
          microName: 'Virus Influenza B',
        },
        {
          firstGivenName: 'Ana',
          firstFamilyName: 'Pérez',
          encEndPeriod: '0001-01-01T00:00:00.000Z',
        },
        { name: 'Neumonía', code: 'J18.9' },
        false
      )
    ).toMatchObject({
      encounterId: '141336',
      run: '12.345.678-5',
      firstGivenName: 'Ana',
      firstFamilyName: 'Pérez',
      service: 'MED',
      room: 'Sala 1',
      bed: 'Cama 2',
      diagnosis: 'Neumonía',
      diagnosisCode: 'J18.9',
      diagnosisDescription: 'Neumonía',
      hasNurseDischarge: true,
      isIsolated: true,
      isolationType: 'Gotas',
      isolationMicroorganism: 'Virus Influenza B',
      dischargeDatetime: undefined,
    });
  });

  it('does not reactivate an explicitly inactive or historically ended isolation', () => {
    const explicitlyInactive = normalization.normalizeEncounter(
      { id: 1, isIsolated: false, isoTypeName: 'Gotas' },
      {},
      {},
      false
    );
    const historicalOnly = normalization.normalizeEncounter(
      {
        id: 2,
        isIsolated: true,
        isolations: [
          {
            isoTypeName: 'Contacto',
            endIsolationDatetime: '2026-07-24T18:00:00.000Z',
          },
        ],
      },
      {},
      {},
      false
    );

    expect(explicitlyInactive).toMatchObject({ isIsolated: false });
    expect(explicitlyInactive).not.toHaveProperty('isolationType');
    expect(historicalOnly).toMatchObject({ isIsolated: false });
    expect(historicalOnly).not.toHaveProperty('isolationType');
  });

  it.each([
    [undefined, undefined, undefined],
    [{ id: null, patient: null }, null, null],
    [{ id: 44 }, { encEndPeriod: 'invalid' }, { name: 'Sin código' }],
  ])('fails closed for incomplete encounter fixture %#', (item, header, diagnosis) => {
    expect(() => normalization.normalizeEncounter(item, header, diagnosis)).not.toThrow();
    expect(normalization.normalizeEncounter(item, header, diagnosis)).toMatchObject({
      encounterId: item && item.id != null ? String(item.id) : '',
      run: '',
      diagnosis: diagnosis?.name || '',
      diagnosisCode: undefined,
      diagnosisDescription: undefined,
      dischargeDatetime: undefined,
      hasMedicalDischarge: false,
      hasNurseDischarge: false,
    });
  });
});

describe('Ficha Medico diagnosis normalization', () => {
  it('selects the first active principal diagnosis and its CIE-10 code', () => {
    expect(
      normalization.selectPrincipalDiagnosis(
        [
          {
            diagnosisName: 'Diagnóstico archivado',
            internalCode: 'A00.0',
            isPrincipal: true,
            archived: true,
          },
          {
            diagnosisName: 'Neumonía bacteriana',
            internalCode: 'J15.9',
            diagnosisClassifyId: 4405,
            isPrincipal: 'S',
            archived: 'N',
            deleted: 0,
          },
          {
            diagnosisName: 'Diagnóstico secundario',
            internalCode: 'R50.9',
            isPrincipal: false,
          },
        ],
        { principalDiagName: 'Fallback' }
      )
    ).toEqual({
      name: 'Neumonía bacteriana',
      code: 'J15.9',
      classificationId: 4405,
      source: 'principal-entry',
    });
  });

  it('falls back to the principal header diagnosis when entries are unavailable', () => {
    expect(
      normalization.selectPrincipalDiagnosis([], { principalDiagName: 'Diagnóstico principal' })
    ).toEqual({
      name: 'Diagnóstico principal',
      code: '',
      classificationId: null,
      source: 'principal-header',
    });
  });
});

describe('Ficha Medico passport documentType propagation', () => {
  it.each([
    [{ preferredIdentifierTypeName: 'Pasaporte' }, '551234567'],
    [{ prefferedPeridentName: 'Pasaporte extranjero' }, '123456785'],
    [{ preferredIdentifierType: { name: 'Pasaporte' } }, '551234567'],
    [{ documentType: 'Pasaporte' }, '00000005-K'],
  ])('propagates explicit API passport evidence %# without altering numeric documents', (headerExtra, code) => {
    const encounter = normalization.normalizeEncounter(
      { id: 501, bedShortName: 'R1' },
      {
        preferredIdentifierCode: code,
        firstGivenName: 'Persona',
        firstFamilyName: 'Extranjera',
        ...headerExtra,
      },
      { name: 'Observación clínica' },
      false
    );

    expect(encounter).toMatchObject({
      encounterId: '501',
      run: code,
      documentType: 'Pasaporte',
    });
  });

  it('propagates verified Eloísa PrefferedPeridentEnum foreign IDs (3, 9, 10, 11) as Pasaporte', () => {
    for (const peridentId of [3, 9, 10, 11]) {
      const encounter = normalization.normalizeEncounter(
        { id: 501 + peridentId },
        {
          preferredIdentifierCode: '887766554',
          preferredPeridentId: peridentId,
          patPrefferedPeridentName: 'Número de Identificación',
        },
        {},
        false
      );
      expect(encounter).toMatchObject({
        run: '887766554',
        documentType: 'Pasaporte',
      });
    }
  });

  it('never guesses documentType from maternal RUN, unknown numeric ids, or generic identification labels', () => {
    for (const header of [
      { preferredIdentifierCode: '123456785', patientIdentifierTypeId: 4 },
      { preferredIdentifierCode: '551234567', prefferedPeridentId: 8 },
      { preferredIdentifierCode: '551234567', prefferedPeridentId: 99 },
      { preferredIdentifierCode: '551234567', preferredIdentifierTypeName: 'RUN Materno/progenitor(a)' },
      { preferredIdentifierCode: '551234567', preferredIdentifierTypeName: 'Número de Identificación' },
      { preferredIdentifierCode: '551234567', preferredIdentifierTypeName: 'Número Folio Comprobante de Parto' },
    ]) {
      const encounter = normalization.normalizeEncounter({ id: 502 }, header, {}, false);
      expect(encounter).not.toHaveProperty('documentType');
    }

    const ownRun = normalization.normalizeEncounter(
      { id: 503 },
      { preferredIdentifierCode: '12.345.678-5', prefferedPeridentId: 2 },
      {},
      false
    );
    expect(ownRun).toMatchObject({ documentType: 'RUT' });

    const letterDocWithType2 = normalization.normalizeEncounter(
      { id: 504 },
      { preferredIdentifierCode: 'P123456785', prefferedPeridentId: 2 },
      {},
      false
    );
    expect(letterDocWithType2).not.toHaveProperty('documentType');
  });

  it('extracts verified Pasaporte labels from medical and nursing worklists and ignores diagnosis text or mismatches', () => {
    document.body.innerHTML = `
      <table>
        <thead><tr><th>Ubicación</th><th>Paciente</th><th>Diagnóstico</th></tr></thead>
        <tbody>
          <tr>
            <td>R1</td>
            <td>
              <a href="/dashboard/encounter-list/601">Paciente Uno</a>
              <span data-hhr-patient-identifier="">Pasaporte : 551234567</span>
            </td>
            <td>Observación</td>
          </tr>
          <tr>
            <td>R2</td>
            <td>
              <a href="/dashboard/encounter-list-nurse/602">Paciente Dos</a>
              <span>Pasaporte: 123456785</span>
            </td>
            <td>Control</td>
          </tr>
          <tr>
            <td>R3</td>
            <td>
              <a href="/dashboard/encounter-list/603">Paciente Tres</a>
              <button data-hhr-copy-run="11111111-1">11111111-1</button>
            </td>
            <td><span>Pasaporte: 111111111</span></td>
          </tr>
        </tbody>
      </table>
    `;

    const domMap = normalization.documentTypesByEncounterFromDocument(document);
    expect(domMap).toEqual({
      '601': { documentType: 'Pasaporte', identifier: '551234567' },
      '602': { documentType: 'Pasaporte', identifier: '123456785' },
    });

    expect(
      normalization.normalizeEncounter(
        { id: 601 },
        { preferredIdentifierCode: '551234567' },
        {},
        false,
        {},
        {},
        domMap
      )
    ).toMatchObject({ run: '551234567', documentType: 'Pasaporte' });

    // Mismatched identifier between DOM row and fresh API header must fail closed.
    expect(
      normalization.normalizeEncounter(
        { id: 601 },
        { preferredIdentifierCode: '999888777' },
        {},
        false,
        {},
        {},
        domMap
      )
    ).not.toHaveProperty('documentType');

    // Explicit API RUN type wins over stale DOM label.
    expect(
      normalization.normalizeEncounter(
        { id: 602 },
        { preferredIdentifierCode: '123456785', preferredIdentifierTypeName: 'RUN' },
        {},
        false,
        {},
        {},
        domMap
      )
    ).toMatchObject({ documentType: 'RUT' });
  });

  it('reads a verified Pasaporte label from an open patient chart AppBar header', () => {
    document.body.innerHTML = `
      <header class="MuiAppBar-root" id="menu-app-bar-element">
        <div><span>Persona Extranjera</span><span>Pasaporte: 551234567</span></div>
      </header>
    `;
    const chartDoc = {
      querySelectorAll: (selector: string) => document.querySelectorAll(selector),
      querySelector: (selector: string) => document.querySelector(selector),
      location: { pathname: '/dashboard/encounter-list/701' },
    };

    expect(normalization.documentTypesByEncounterFromDocument(chartDoc)).toEqual({
      '701': { documentType: 'Pasaporte', identifier: '551234567' },
    });
  });

  it('propagates verified DOM passport typing during a full Ficha Medico census capture', async () => {
    document.body.innerHTML = `
      <table>
        <thead><tr><th>Ubicación</th><th>Paciente</th><th>Diagnóstico</th></tr></thead>
        <tbody>
          <tr>
            <td>R1</td>
            <td>
              <a href="/dashboard/encounter-list/801">Turista Sintética</a>
              <span data-hhr-patient-identifier="">Pasaporte: 551234567</span>
            </td>
            <td>Diagnóstico inicial</td>
          </tr>
          <tr>
            <td>R2</td>
            <td>
              <a href="/dashboard/encounter-list/802">Residente Sintético</a>
              <span>RUN: 11.111.111-1</span>
            </td>
            <td>Diagnóstico dos</td>
          </tr>
        </tbody>
      </table>
    `;

    const censusRuntime = (
      globalThis as typeof globalThis & {
        HhrFichaMedicoCensusRuntime: {
          read: (options: Record<string, unknown>) => Promise<{
            encounters: Array<Record<string, unknown>>;
          }>;
        };
      }
    ).HhrFichaMedicoCensusRuntime;

    const snapshot = await censusRuntime.read({
      getVerifiedClinicalContext: async () => ({
        base: new URL('https://fichamedicoback.rayensalud.cl/encounter/list/filter'),
        apiOrigin: 'https://fichamedicoback.rayensalud.cl',
        listSource: 'medical',
        identity: { facilityId: '1342', practitionerId: '7936', practitionerRoleId: '2' },
      }),
      apiGet: async (url: string) => {
        if (url.includes('filterType=3')) {
          return [
            { id: 801, bedShortName: 'R1', hospitalDepartmentShortName: 'MED' },
            { id: 802, bedShortName: 'R2', hospitalDepartmentShortName: 'MED' },
          ];
        }
        if (url.includes('/patientHeaderData/801/')) {
          return {
            patID: 1801,
            preferredIdentifierCode: '551234567',
            firstGivenName: 'Turista',
            firstFamilyName: 'Sintética',
          };
        }
        if (url.includes('/patientHeaderData/802/')) {
          return {
            patID: 1802,
            preferredIdentifierCode: '11.111.111-1',
            firstGivenName: 'Residente',
            firstFamilyName: 'Sintético',
          };
        }
        return [];
      },
      getAuth: () => 'HSP synthetic-token',
      readClinicalCached: async (_key: string, load: () => Promise<unknown>) => load(),
      normalization,
      headerUrl: (base: URL, encId: number) => `${base.origin}/api/encounter/patientHeaderData/${encId}/false`,
      diagnosisUrl: (base: URL, encId: number, practitionerId: string) =>
        `${base.origin}/api/encounter/entrySummary/diagnosisEntry/${encId}/0/2/${practitionerId}`,
      isolationUrl: (base: URL, encId: number) =>
        `${base.origin}/api/encounter/${encId}/isolationEncounter/0/getAll`,
      diagnosisCatalogCacheTtlMs: 60_000,
      physicianNormalization: {
        captureFromDocument: async () => ({
          physicians: [],
          physicianById: {},
          physicianByEncounterId: {},
        }),
      },
      diagnosisCodingRuntime: (
        globalThis as typeof globalThis & { HhrFichaMedicoDiagnosisCoding: unknown }
      ).HhrFichaMedicoDiagnosisCoding,
      documentRoot: document,
    });

    expect(snapshot.encounters[0]).toMatchObject({
      encounterId: '801',
      run: '551234567',
      documentType: 'Pasaporte',
    });
    expect(snapshot.encounters[1]).toMatchObject({
      encounterId: '802',
      run: '11.111.111-1',
    });
    expect(snapshot.encounters[1]).not.toHaveProperty('documentType');
  });
});
