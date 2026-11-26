/**
 * Pure Ficha Medico normalization helpers shared by the MAIN-world reader and unit tests.
 * This file never performs network or storage operations.
 */
(function (root, factory) {
  const api = factory();
  root.HhrFichaMedicoNormalization = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : self, function () {
  'use strict';
  const text = value => (value == null ? '' : String(value).trim());
  const record = value => value && typeof value === 'object' ? value : {};
  const isolationNormalization = globalThis.HhrFichaMedicoIsolationNormalization;
  const treatingPhysicianFields = (item, physicianById, physicianByEncounterId) => globalThis.HhrFichaMedicoTreatingPhysicianNormalization?.toEncounterFields(item, physicianById, physicianByEncounterId) || {};
  const normalizeSessionRole = session => {
    const safeSession = record(session);
    const candidates = [
      safeSession.role,
      safeSession.roleName,
      safeSession.profileName,
      safeSession.practitionerRoleName,
      safeSession.healthCarePractitionerRoleName,
      safeSession.healthCareRoleName,
    ];
    return text(candidates.find(value => typeof value === 'string' && value.trim()))
      .replace(/\s+/g, ' ');
  };

  const normalizeSessionExpiry = (session, payload) => {
    const safeSession = record(session);
    const safePayload = record(payload);
    const value = (
      safeSession.expiresAt ||
      safeSession.expires ||
      safeSession.expirationDate || safeSession.expirationDateTime || // expirationDate: campo real de Eloísa (02-09)
      safeSession.expiration ||
      safePayload.expiresAt ||
      safePayload.expires
    );
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value <= 0) return null;
      return value > 10_000_000_000 ? Math.round(value) : Math.round(value * 1000);
    }
    const parsed = Date.parse(text(value));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const validClinicalDate = value => {
    const candidate = text(value);
    if (!candidate || Number(candidate.slice(0, 4)) <= 1) return undefined;
    return Number.isFinite(Date.parse(candidate)) ? candidate : undefined;
  };

  const diagnosisCoding = globalThis.HhrFichaMedicoDiagnosisCoding;
  const DOCUMENT_TYPE_LABEL_KEYS = [
    'preferredIdentifierTypeName',
    'prefferedIdentifierTypeName',
    'preferredIdentifierName',
    'prefferedIdentifierName',
    'identifierTypeName',
    'patientIdentifierTypeName',
    'peridentName',
    'preferredPeridentName',
    'prefferedPeridentName',
    'documentType',
    'tipoIdentificador',
    'tipoDocumento',
  ];
  const DOCUMENT_TYPE_OBJECT_KEYS = [
    'preferredIdentifierType',
    'prefferedIdentifierType',
    'identifierType',
    'patientIdentifierType',
    'perident',
  ];
  const DOCUMENT_TYPE_ID_KEYS = [
    'patientIdentifierTypeId',
    'prefferedPeridentId',
    'preferredPeridentId',
    'peridentId',
  ];
  const ENCOUNTER_HREF_RE = /\/dashboard\/encounter-list(?:-nurse)?\/([1-9]\d*)(?:[/?#]|$)/;
  const CHART_PATH_RE = /^\/dashboard\/encounter-list(?:-nurse)?\/([1-9]\d*)(?:\/|$)/;
  const PASSPORT_LINE_RE = /^\s*(?:pasaporte|passport)\s*:\s*(\S.*?)\s*$/i;
  const canonicalIdentifier = value => text(value).replace(/[.\-\s]/g, '').toUpperCase();
  const hasNonRutLetter = value => {
    const id = canonicalIdentifier(value);
    return /[A-ZÁÉÍÓÚÜÑ]/i.test(id) && !/^\d+K$/.test(id);
  };
  const foldedLabel = value =>
    text(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  const classifyDocumentTypeLabel = value => {
    const label = foldedLabel(value);
    if (!label) return undefined;
    if (/^(?:pasaporte|passport)\b/.test(label)) return 'Pasaporte';
    if (/^(?:run|rut)$/.test(label)) return 'RUT';
    return undefined;
  };
  const labelFromSource = source => {
    const obj = record(source);
    for (const key of DOCUMENT_TYPE_LABEL_KEYS) {
      if (typeof obj[key] === 'string' && obj[key].trim()) {
        return classifyDocumentTypeLabel(obj[key]);
      }
    }
    for (const key of DOCUMENT_TYPE_OBJECT_KEYS) {
      const candidate = obj[key];
      const raw =
        typeof candidate === 'string'
          ? candidate
          : candidate && typeof candidate === 'object'
            ? candidate.name || candidate.description || candidate.label
            : '';
      if (typeof raw === 'string' && raw.trim()) {
        return classifyDocumentTypeLabel(raw);
      }
    }
    return undefined;
  };
  const resolveDocumentTypeFromApi = (item, header, run) => {
    const safeItem = record(item);
    const patient = record(safeItem.patient);
    const safeHeader = record(header);
    const sources = [safeHeader, patient, safeItem];
    for (const source of sources) {
      const explicit = labelFromSource(source);
      if (explicit === 'Pasaporte') return 'Pasaporte';
      if (explicit === 'RUT') return hasNonRutLetter(run) ? undefined : 'RUT';
    }
    // Only type 2 (own RUN) is verified across Eloísa endpoints; never guess passport IDs.
    for (const source of sources) {
      for (const key of DOCUMENT_TYPE_ID_KEYS) {
        const raw = source[key];
        if (raw === '' || raw == null || typeof raw === 'boolean') continue;
        if (Number(raw) === 2) return hasNonRutLetter(run) ? undefined : 'RUT';
      }
    }
    return undefined;
  };
  const passportFromContainer = container => {
    if (!container || typeof container.querySelectorAll !== 'function') return undefined;
    const candidates = [
      ...container.querySelectorAll('[data-hhr-patient-identifier]'),
      ...[...container.querySelectorAll('*')].filter(el => !el.children || el.children.length === 0),
    ];
    if (!container.children || container.children.length === 0) candidates.push(container);
    const matched = new Map();
    for (const element of candidates) {
      const line = text(element && element.textContent).replace(/\s+/g, ' ');
      const found = PASSPORT_LINE_RE.exec(line);
      if (!found) continue;
      const identifier = found[1].trim();
      const canonical = canonicalIdentifier(identifier);
      if (canonical && !matched.has(canonical)) matched.set(canonical, identifier);
    }
    if (matched.size !== 1) return undefined;
    const [identifier] = matched.values();
    return { documentType: 'Pasaporte', identifier };
  };
  const patientColumnIndex = table => {
    const headers = typeof table.querySelectorAll === 'function' ? [...table.querySelectorAll('th')] : [];
    const match = headers.find(th => foldedLabel(th && th.textContent) === 'paciente');
    return match && Number.isInteger(match.cellIndex) ? match.cellIndex : -1;
  };
  const encounterIdFromWorklistRow = row => {
    const attrNode = typeof row.querySelector === 'function' ? row.querySelector('[data-hhr-worklist-episode]') : null;
    const attrId = text(attrNode && attrNode.getAttribute && attrNode.getAttribute('data-hhr-worklist-episode'));
    if (/^[1-9]\d*$/.test(attrId)) return attrId;
    const link = typeof row.querySelector === 'function' ? row.querySelector('a[href*="/dashboard/encounter-list"]') : null;
    const href = text(link && link.getAttribute && link.getAttribute('href'));
    const match = ENCOUNTER_HREF_RE.exec(href);
    return match ? match[1] : '';
  };
  const patientCellForRow = (row, columnIndex) => {
    if (columnIndex >= 0 && row.cells && row.cells[columnIndex]) return row.cells[columnIndex];
    const link = typeof row.querySelector === 'function' ? row.querySelector('a[href*="/dashboard/encounter-list"]') : null;
    if (link && typeof link.closest === 'function') {
      const cell = link.closest('td,th');
      if (cell) return cell;
    }
    return row.cells && row.cells.length > 1 ? row.cells[1] : null;
  };
  const documentTypesByEncounterFromDocument = root => {
    if (!root || typeof root.querySelectorAll !== 'function') return {};
    const evidence = new Map();
    const recordEntry = (encounterId, entry) => {
      if (!encounterId || !entry) return;
      const nextCanonical = canonicalIdentifier(entry.identifier);
      if (!nextCanonical) return;
      if (evidence.has(encounterId)) {
        const previous = evidence.get(encounterId);
        if (previous === null || canonicalIdentifier(previous.identifier) !== nextCanonical) {
          evidence.set(encounterId, null);
        }
        return;
      }
      evidence.set(encounterId, entry);
    };
    for (const table of root.querySelectorAll('table')) {
      const colIndex = patientColumnIndex(table);
      const rows = typeof table.querySelectorAll === 'function' ? table.querySelectorAll('tr') : [];
      for (const row of rows) {
        const encounterId = encounterIdFromWorklistRow(row);
        if (!encounterId) continue;
        recordEntry(encounterId, passportFromContainer(patientCellForRow(row, colIndex)));
      }
    }
    const pathname = text(
      (root.location && root.location.pathname) ||
        (root.defaultView && root.defaultView.location && root.defaultView.location.pathname)
    );
    const chartMatch = CHART_PATH_RE.exec(pathname);
    if (chartMatch && typeof root.querySelector === 'function') {
      const appBar =
        root.querySelector('header.MuiAppBar-root#menu-app-bar-element') ||
        root.querySelector('header.MuiAppBar-root');
      recordEntry(chartMatch[1], passportFromContainer(appBar));
    }
    const result = {};
    for (const [encounterId, entry] of evidence.entries()) {
      if (entry) result[encounterId] = entry;
    }
    return result;
  };
  const resolveDocumentType = (item, header, run, documentTypesByEncounterId) => {
    const apiType = resolveDocumentTypeFromApi(item, header, run);
    if (apiType) return apiType;
    const encounterId = item && item.id != null ? String(item.id) : '';
    const rendered = encounterId ? record(documentTypesByEncounterId)[encounterId] : undefined;
    if (!rendered || rendered.documentType !== 'Pasaporte') return undefined;
    const expected = canonicalIdentifier(run);
    if (!expected || canonicalIdentifier(rendered.identifier) !== expected) return undefined;
    return 'Pasaporte';
  };

  const normalizeEncounter = (
    item,
    header,
    principalDiagnosis,
    discharged,
    physicianById,
    physicianByEncounterId,
    documentTypesByEncounterId
  ) => {
    const safeItem = record(item);
    const patient = record(safeItem.patient);
    const safeHeader = record(header);
    const diagnosis = record(principalDiagnosis);
    const fullName = text(safeItem.patientName || patient.patientName).replace(/\s+/g, ' ');
    const run = safeHeader.preferredIdentifierCode || patient.identifier || safeItem.patientIdentifier || '';
    const documentType = resolveDocumentType(safeItem, safeHeader, run, documentTypesByEncounterId);
    return {
      encounterId: safeItem.id == null ? '' : String(safeItem.id),
      run,
      ...(documentType ? { documentType } : {}),
      firstGivenName: safeHeader.firstGivenName || fullName || '',
      nextGivenNames: safeHeader.nextGivenNames || '',
      firstFamilyName: safeHeader.firstFamilyName || '',
      secondFamilyName: safeHeader.secondFamilyName || '',
      birthDate: safeHeader.birthDate || patient.birthDate || safeItem.birthDate || '',
      administrativeSexId: safeHeader.adseId || safeItem.patientAdministrativeSexId || '',
      administrativeSex: safeHeader.adseName || '',
      gender: safeHeader.gendName || patient.genero || '',
      service: safeItem.hospitalDepartmentShortName || safeItem.hospitalDepartmentName || safeItem.serviceName || '',
      room: safeItem.roomShortName || safeItem.roomName || '',
      bed: safeItem.bedShortName || safeItem.bedName || '',
      hospitalDepartmentId: safeItem.hospitalDepartmentId || safeHeader.hospitalDepartmentId || '',
      nurseStationId: safeItem.nurseStationId || '',
      patientId: safeHeader.patID || safeItem.patientId || patient.id || '',
      admissionDatetime: safeHeader.encStartPeriod || safeItem.startDatetime || '',
      diagnosis: text(diagnosis.name),
      diagnosisCode: text(diagnosis.code) || undefined,
      diagnosisDescription: text(diagnosis.code) ? text(diagnosis.name) : undefined,
      hasMedicalDischarge: Boolean(discharged || safeItem.hasMedicalDischarge || safeItem.medicalDischarge),
      hasNurseDischarge: Boolean(safeItem.hasNurseDischarge),
      dischargeDatetime: validClinicalDate(safeHeader.encEndPeriod) ||
        validClinicalDate(safeItem.medicalDischargeDateTime),
      isDead: Boolean(safeItem.isDead),
      ...isolationNormalization.toEncounterFields(safeItem),
      isGes: Boolean(safeItem.isGes), ...treatingPhysicianFields(safeItem, physicianById, physicianByEncounterId),
    };
  };

  return {
    requiresIsolationDetails: isolationNormalization.requiresIsolationDetails,
    documentTypesByEncounterFromDocument,
    normalizeEncounter,
    normalizeSessionExpiry,
    normalizeSessionRole,
    resolveDocumentType,
    selectPrincipalDiagnosis: diagnosisCoding.selectPrincipalDiagnosis,
    indexDiagnosisCatalog: diagnosisCoding.indexDiagnosisCatalog,
    validClinicalDate,
  };
});
