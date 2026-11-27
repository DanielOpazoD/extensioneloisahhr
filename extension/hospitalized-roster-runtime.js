/** The patients of the switcher on the ficha's green bar: who and where, nothing clinical. */
(function (root) {
  'use strict';
  const FICHA = /^https:\/\/fichamedico\.rayensalud\.cl\/dashboard\//;
  const unavailable = 'Lista de hospitalizados no disponible.';
  // One read of the active census, without a header per patient, answered only to the ficha's own page.
  const create = ({ getFetchInfo, fetchActiveEncounterRows, normalizeHospitalizedEncounter, activeHospitalizedEncounters }) =>
    async (_message, sender) => {
      if (sender?.frameId !== 0 || !FICHA.test(sender?.url || '')) return { error: unavailable };
      const infoResult = await getFetchInfo(sender);
      if (infoResult?.error) return infoResult;
      const rowResult = await fetchActiveEncounterRows(infoResult.info);
      if (rowResult?.error) return rowResult;
      const patients = activeHospitalizedEncounters({ encounters: (rowResult.rows || []).map(row => normalizeHospitalizedEncounter(row, null)) })
        .map(({ encounterId, name, service, room, bed }) => ({ encounterId, name, service, room, bed }));
      return { ok: true, patients };
    };
  root.HhrHospitalizedRosterRuntime = Object.freeze({ create });
})(typeof self !== 'undefined' ? self : globalThis);
