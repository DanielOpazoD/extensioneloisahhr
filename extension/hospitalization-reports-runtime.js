/** Discover hospitalization episodes and build official Eloisa report navigation. */
(function (root) {
  'use strict';
  const RUN_IDENTIFIER_TYPES = [2, 4];
  const FOREIGN_IDENTIFIER_TYPES = [3, 9, 10, 11];
  const KNOWN_IDENTIFIER_TYPES = [2, 3, 4, 9, 10, 11];
  const normalizeRun = value => String(value || '').toUpperCase().replace(/[^0-9K]/g, '');
  const normalizeForeignDocument = value =>
    String(value || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const hasNonRutLetter = value => {
    const cleaned = normalizeForeignDocument(value);
    return /[A-Z]/.test(cleaned) && !/^\d+K$/.test(cleaned);
  };
  const isValidChileanRun = value => {
    const cleaned = normalizeRun(value);
    if (hasNonRutLetter(value) || !/^[0-9]{6,8}[0-9K]$/.test(cleaned)) return false;
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
  const normalizeDate = value => {
    const match = String(value || '').trim().match(/^(\d{4}-\d{2}-\d{2})(?:T|$)/);
    return match ? match[1] : '';
  };
  const isEncounter = value => /^\d+$/.test(String(value || ''));
  const isValidRun = value => !hasNonRutLetter(value) && /^[0-9]{6,8}[0-9K]$/.test(normalizeRun(value));
  const isValidForeignDocument = value => {
    const cleaned = normalizeForeignDocument(value);
    return /^[A-Z0-9]{4,24}$/.test(cleaned) && /\d/.test(cleaned);
  };
  const matchingRows = (rows, patientRun, options) => {
    const isPassport = Boolean(options && options.isPassport);
    const patientDocumentType = options && options.patientDocumentType;
    const normalize = isPassport ? normalizeForeignDocument : normalizeRun;
    const expected = normalize(patientRun);
    if (!expected) return [];
    const rowIdentifiers = row => [row && row.patientIdentifier, row && row.preferredIdentifierCode,
      row && row.identifier, row && row.patient && row.patient.identifier,
      row && row.patient && row.patient.preferredIdentifierCode].map(normalize);
    return rows.filter(row => {
      if (!isEncounter(row && row.encounterId)) return false;
      const typeId = Number(row && row.patientIdentifierTypeId);
      // ID-01: a passport lookup never accepts Chilean RUN/maternal RUN rows, and an explicit
      // RUT lookup never accepts foreign document rows.
      if (isPassport && RUN_IDENTIFIER_TYPES.includes(typeId)) return false;
      if (!isPassport && patientDocumentType === 'RUT' && FOREIGN_IDENTIFIER_TYPES.includes(typeId)) return false;
      return rowIdentifiers(row).includes(expected);
    });
  };
  const sortRowsNewestFirst = (rows, field = 'startPeriod') => [...rows].sort((left, right) =>
    normalizeDate(right && (right[field] || right.endPeriod))
      .localeCompare(normalizeDate(left && (left[field] || left.endPeriod)))
  );
  const toEpisode = row => ({
    encId: String(row.encounterId),
    startDate: normalizeDate(row.startPeriod),
    endDate: normalizeDate(row.endPeriod),
    active: !normalizeDate(row.endPeriod),
    ...(typeof row.patientName === 'string' && row.patientName.trim()
      ? { patientName: row.patientName.trim() } : {}),
    ...(KNOWN_IDENTIFIER_TYPES.includes(Number(row.patientIdentifierTypeId))
      ? { identifierType: Number(row.patientIdentifierTypeId) } : {}),
  });
  const listEpisodes = ({ rows, patientRun, patientDocument, patientDocumentType }) => {
    const isPassport = patientDocumentType === 'Pasaporte';
    const lookupCode = isPassport ? (patientDocument || patientRun) : patientRun;
    return {
      ok: true,
      episodes: sortRowsNewestFirst(
        matchingRows(rows, lookupCode, { isPassport, patientDocumentType })
      ).map(toEpisode),
    };
  };

  const selectEncounter = ({ rows, patientRun, patientDocument, patientDocumentType, encId, censusDate }) => {
    const isPassport = patientDocumentType === 'Pasaporte';
    const lookupCode = isPassport ? (patientDocument || patientRun) : patientRun;
    const candidates = matchingRows(rows, lookupCode, { isPassport, patientDocumentType });
    const requested = isEncounter(encId) ? String(encId) : '';
    const idLabel = isPassport ? 'este documento' : 'este RUN';
    if (requested) {
      const selected = candidates.find(row => String(row.encounterId) === requested);
      return selected ? { encId: requested, row: selected } : {
        error: `El episodio seleccionado no aparece entre los informes de ${idLabel}. ` +
          'Actualiza el censo y vuelve a intentarlo.',
      };
    }
    const cutoff = normalizeDate(censusDate);
    const eligible = cutoff ? candidates.filter(row => {
      const endDate = normalizeDate(row && row.endPeriod);
      return endDate && endDate <= cutoff;
    }) : candidates;
    const selected = sortRowsNewestFirst(eligible, 'endPeriod')[0];
    if (selected) return { encId: String(selected.encounterId), row: selected };
    return { error: cutoff
      ? 'No se encontró un informe del paciente hasta la fecha de este censo.'
      : `No se encontraron hospitalizaciones para ${idLabel}.` };
  };

  const resolveRows = request => root.HhrHospitalizationReportSearchRuntime.resolveRows({
    ...request,
    normalizeRun,
    normalizeForeignDocument,
    isValidChileanRun,
    isEncounter,
    matchingRows,
  });

  const buildHistoryReportUrl = ({ encId, startPeriod, endPeriod, now }) => {
    const encounterId = isEncounter(encId) ? String(encId) : '';
    const startDate = String(startPeriod || '').trim();
    if (!encounterId || !startDate) return '';
    const params = JSON.stringify({
      enc_id: encounterId,
      start_date: startDate,
      end_date: String(endPeriod || '').trim() || String(now || '').trim(),
    });
    const url = new URL('https://fichamedico.rayensalud.cl/dashboard/reports');
    url.searchParams.set('isReportServer', 'true');
    url.searchParams.set('report', 'GetHospitalizedEncounterHistory');
    url.searchParams.set('params', params);
    return url.toString();
  };

  const openHistoryReport = async ({ chrome, now, resolved }) => {
    const chromeApi = chrome || root.chrome;
    if (!chromeApi || !chromeApi.tabs || typeof chromeApi.tabs.create !== 'function')
      return { error: 'No se pudo acceder al navegador para abrir la ficha clínica completa.' };
    const currentTime = typeof now === 'function' ? now() : Date.now();
    const url = buildHistoryReportUrl({
      encId: resolved.encId,
      startPeriod: resolved.row && resolved.row.startPeriod, endPeriod: resolved.row && resolved.row.endPeriod,
      now: new Date(currentTime).toISOString(),
    });
    if (!url) return { error: 'El episodio no contiene fechas válidas para abrir la ficha completa.' };
    try {
      const tab = await chromeApi.tabs.create({ url, active: true });
      if (tab && tab.windowId != null) {
        try { await chromeApi.windows.update(tab.windowId, { focused: true }); } catch (_error) {}
      }
      return { ok: true, opened: true, encId: resolved.encId };
    } catch (error) {
      return { error: 'No se pudo abrir la ficha clínica completa: ' +
        String((error && error.message) || error) };
    }
  };

  root.HhrHospitalizationReportsRuntime = {
    buildHistoryReportUrl, isValidChileanRun, isValidForeignDocument, isValidRun,
    listEpisodes, normalizeForeignDocument, normalizeRun,
    openHistoryReport, resolveRows, selectEncounter,
  };
})(typeof globalThis !== 'undefined' ? globalThis : self);
