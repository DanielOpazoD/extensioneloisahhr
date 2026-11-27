/** Pure selection policy for Gestión de Camas discharge lookups. */
(function (root, factory) {
  'use strict';
  root.HhrGestionCamasEgresoLookup = factory(root.HhrClinicalDayRuntime);
})(typeof self !== 'undefined' ? self : globalThis, function (clinicalDayRuntime) {
  'use strict';
  const METADATA_FIELDS = Object.freeze([
    'id', 'encounterId', 'endPeriod', 'dateDischarge', 'isDead',
    'hasMedicalDischarge', 'hasNurseDischarge', 'hasNursingDischarge',
    'hasAdministrativeDischarge', 'dischargeDestination', 'dischargeDestinationName',
    'destinationSystemName', 'dischargeReasonName', 'dischargeTypeName',
    'bedDestination', 'destinationBed',
  ]);
  const RUN_IDENTIFIER_TYPES = Object.freeze([2, 4]);
  // Verified against Eloísa PrefferedPeridentEnum: 3=OTRO_NUMERO_IDENTIFICADOR,
  // 9=NUMERO_PASAPORTE, 10=NUMERO_DOCUMENTO_IDENTIFICADOR_PAIS_ORIGEN, 11=NUMERO_IDENTIFICADOR_FONASA.
  const FOREIGN_IDENTIFIER_TYPES = Object.freeze([3, 9, 10, 11]);
  const normalizeForeignDocument = value =>
    String(value || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const hasNonRutLetter = value => {
    const cleaned = normalizeForeignDocument(value);
    return /[A-Z]/.test(cleaned) && !/^\d+K$/.test(cleaned);
  };
  const isValidChileanRun = value => {
    const cleaned = String(value || '').toUpperCase().replace(/[^0-9K]/g, '');
    if (hasNonRutLetter(value) || !/^\d{6,8}[0-9K]$/.test(cleaned)) return false;
    const body = cleaned.slice(0, -1);
    const verifier = cleaned.slice(-1);
    let sum = 0;
    let factor = 2;
    for (let i = body.length - 1; i >= 0; i -= 1) {
      sum += Number(body[i]) * factor;
      factor = factor === 7 ? 2 : factor + 1;
    }
    const rest = 11 - (sum % 11);
    const expected = rest === 11 ? '0' : rest === 10 ? 'K' : String(rest);
    return verifier === expected;
  };
  const normalizeTargets = (runs, targets) => {
    const source = Array.isArray(targets) && targets.length ? targets : runs;
    return (Array.isArray(source) ? source : [])
      .map(value => {
        const target = value && typeof value === 'object' ? value : { run: value };
        const isPassport = target.documentType === 'Pasaporte' || hasNonRutLetter(target.run);
        const run = isPassport
          ? normalizeForeignDocument(target.run)
          : String(target.run || '').toUpperCase().replace(/[^0-9K]/g, '');
        return {
          run,
          encounterId: String(target.encounterId || '').trim(),
          ...(target.dischargeDay ? { dischargeDay: String(target.dischargeDay).trim() } : {}),
          ...(target.documentType === 'Pasaporte' ? { documentType: 'Pasaporte' } : {}),
        };
      })
      .filter(target => target.run);
  };
  /**
   * Selects Eloísa PrefferedPeridentEnum IDs for a discharge lookup target.
   * ID-01: explicit passports or lettered documents NEVER query Chilean RUN/maternal RUN (2, 4).
   * Purely numeric values that fail Chilean Mod-11 without explicit documentType (e.g. bulk report
   * cells for foreign IDs) query foreign types first and retain [2, 4] fallback for mistyped RUNs.
   */
  const identifierTypesForTarget = target => {
    const safeTarget = target && typeof target === 'object' ? target : { run: target };
    if (safeTarget.documentType === 'Pasaporte' || hasNonRutLetter(safeTarget.run)) {
      return FOREIGN_IDENTIFIER_TYPES;
    }
    if (!isValidChileanRun(safeTarget.run)) {
      return [...FOREIGN_IDENTIFIER_TYPES, ...RUN_IDENTIFIER_TYPES];
    }
    return RUN_IDENTIFIER_TYPES;
  };
  const dischargeDayOf = value => {
    const raw = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(raw))
      return Number.isNaN(Date.parse(raw)) ? '' : clinicalDayRuntime?.clinicalDayAt(new Date(raw)) || '';
    const iso = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
    if (iso) return iso[1];
    const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(raw);
    return dmy
      ? `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`
      : '';
  };
  const encounterIdOf = (item, fallback) => item
    ? String(item.id ?? item.encounterId ?? '').trim()
    : fallback;
  const selectEncounter = (payload, encounterId, dischargeDay) => {
    const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];
    if (!encounterId) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dischargeDay || '')) return null;
      const matches = rows.filter(row =>
        dischargeDayOf(row && (row.dateDischarge ?? row.endPeriod)) === dischargeDay
      );
      return matches.length === 1 ? matches[0] : null;
    }
    return (
      rows.find(
        row => String((row && (row.id ?? row.encounterId)) || '') === encounterId
      ) || null
    );
  };
  const pickMetadata = value => {
    const result = {};
    if (!value || typeof value !== 'object') return result;
    for (const key of METADATA_FIELDS) {
      const field = value[key];
      if (field !== undefined && field !== null &&
          typeof field !== 'object' && typeof field !== 'function') result[key] = field;
    }
    return result;
  };
  return Object.freeze({
    FOREIGN_IDENTIFIER_TYPES,
    RUN_IDENTIFIER_TYPES,
    encounterIdOf,
    hasNonRutLetter,
    identifierTypesForTarget,
    isValidChileanRun,
    normalizeForeignDocument,
    normalizeTargets,
    pickMetadata,
    selectEncounter,
  });
});
