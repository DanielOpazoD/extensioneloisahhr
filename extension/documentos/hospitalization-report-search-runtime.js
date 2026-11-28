/** Query report episodes across RUN, maternal RUN, and foreign document identifiers. */
(function (root) {
  'use strict';
  const FOREIGN_IDENTIFIER_TYPES = [3, 9, 10, 11];
  const RUN_IDENTIFIER_TYPES = [2, 4];
  const buildUrl = ({ info, identifierCode, identifierType }) => {
    const url = new URL('/api/inpatientReport/getEncounterHistoryReport', info.apiOrigin);
    url.searchParams.set('prefferedPeridentId', String(identifierType));
    url.searchParams.set('prefferedIdentifierCode', identifierCode);
    url.searchParams.set('facilityId', String(info.facId));
    url.searchParams.set('dateFrom', '');
    url.searchParams.set('dateTo', '');
    return url.toString();
  };
  const fetchRows = async ({ info, identifierCode, fetchWithTimeout }, identifierType) => {
    try {
      const response = await fetchWithTimeout(
        buildUrl({ info, identifierCode, identifierType }),
        {
          headers: { Authorization: info.token, Accept: 'application/json' },
          credentials: 'omit',
          cache: 'no-store',
        }
      );
      if (response.status === 401 || response.status === 403)
        return { error: 'Eloísa no autorizó la búsqueda de informes para la sesión actual.' };
      if (!response.ok)
        return { error: 'Eloísa respondió HTTP ' + response.status + ' al buscar los informes.' };
      const payload = await response.json();
      return { rows: Array.isArray(payload) ? payload : [] };
    } catch (error) {
      return {
        error:
          'No se pudieron buscar los informes en Eloísa: ' +
          String((error && error.message) || error),
      };
    }
  };
  const collectAcrossTypes = async ({
    info,
    fetchWithTimeout,
    identifierCode,
    identifierTypes,
    requested,
    isEncounter,
    matchingRows,
    matchOptions,
  }) => {
    const byEncounter = new Map();
    for (const identifierType of identifierTypes) {
      const result = await fetchRows({ info, identifierCode, fetchWithTimeout }, identifierType);
      if (result.error) return result;
      result.rows.forEach(row => {
        const encounterId = String((row && row.encounterId) || '');
        if (isEncounter(encounterId) && !byEncounter.has(encounterId)) {
          byEncounter.set(encounterId, row);
        }
      });
      if (
        requested &&
        matchingRows(result.rows, identifierCode, matchOptions).some(
          row => String(row.encounterId) === requested
        )
      ) {
        return { rows: [...byEncounter.values()], matchedRequested: true };
      }
    }
    return { rows: [...byEncounter.values()], matchedRequested: false };
  };
  const resolveRows = async request => {
    const {
      info,
      patientRun,
      patientDocument,
      patientDocumentType,
      encId,
      isEncounter,
      matchingRows,
      normalizeRun,
      normalizeForeignDocument,
      isValidChileanRun,
      fetchWithTimeout,
    } = request;
    if (!info || !info.apiOrigin || !info.token || !/^\d+$/.test(String(info.facId || '')))
      return { error: 'La sesión no permite consultar informes de hospitalización.' };
    const requested = isEncounter(encId) ? String(encId) : '';
    const isPassport = patientDocumentType === 'Pasaporte';
    if (isPassport) {
      const foreignCode = normalizeForeignDocument
        ? normalizeForeignDocument(patientDocument || patientRun)
        : String(patientDocument || patientRun || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
      const foreignResult = await collectAcrossTypes({
        info,
        fetchWithTimeout,
        identifierCode: foreignCode,
        identifierTypes: FOREIGN_IDENTIFIER_TYPES,
        requested,
        isEncounter,
        matchingRows,
        matchOptions: { isPassport: true, patientDocumentType: 'Pasaporte' },
      });
      return foreignResult.error ? foreignResult : { rows: foreignResult.rows };
    }
    const runCode = normalizeRun(patientRun);
    const runResult = await collectAcrossTypes({
      info,
      fetchWithTimeout,
      identifierCode: runCode,
      identifierTypes: RUN_IDENTIFIER_TYPES,
      requested,
      isEncounter,
      matchingRows,
      matchOptions: { isPassport: false, patientDocumentType },
    });
    if (runResult.error) return runResult;
    const needsForeignFallback =
      patientDocumentType !== 'RUT' &&
      typeof isValidChileanRun === 'function' &&
      !isValidChileanRun(patientRun) &&
      (requested ? !runResult.matchedRequested : runResult.rows.length === 0);
    if (!needsForeignFallback) return { rows: runResult.rows };
    const foreignResult = await collectAcrossTypes({
      info,
      fetchWithTimeout,
      identifierCode: runCode,
      identifierTypes: FOREIGN_IDENTIFIER_TYPES,
      requested,
      isEncounter,
      matchingRows,
      matchOptions: { isPassport: false, patientDocumentType },
    });
    if (foreignResult.error) return foreignResult;
    const byEncounter = new Map();
    [...runResult.rows, ...foreignResult.rows].forEach(row => {
      const encounterId = String((row && row.encounterId) || '');
      if (isEncounter(encounterId) && !byEncounter.has(encounterId)) {
        byEncounter.set(encounterId, row);
      }
    });
    return { rows: [...byEncounter.values()] };
  };
  root.HhrHospitalizationReportSearchRuntime = { resolveRows };
})(typeof globalThis !== 'undefined' ? globalThis : self);
