/** The patients of the switcher on the ficha's green bar: who and where, nothing clinical. */
(function (root) {
  'use strict';
  const FICHA = /^https:\/\/fichamedico\.rayensalud\.cl\/dashboard\//;
  const unavailable = 'Lista de hospitalizados no disponible.';
  // One read of the active census, without a header per patient, answered only to the ficha's own page.
  // The session is the ficha's clinical one, the same the census list uses. The page's relay may not have
  // confirmed its generation yet while the ficha is still drawing: one more try, a moment later.
  const create = ({ resolveSession, wait = ms => new Promise(done => setTimeout(done, ms)), fetchActiveEncounterRows, normalizeHospitalizedEncounter, activeHospitalizedEncounters }) =>
    async (_message, sender) => {
      if (sender?.frameId !== 0 || !FICHA.test(sender?.url || '')) return { error: unavailable };
      let infoResult = await resolveSession({ sender });
      if (infoResult?.error) { await wait(600); infoResult = await resolveSession({ sender }); }
      if (infoResult?.error) return infoResult;
      const rowResult = await fetchActiveEncounterRows(infoResult.info);
      if (rowResult?.error) return rowResult;
      const patients = activeHospitalizedEncounters({ encounters: (rowResult.rows || []).map(row => normalizeHospitalizedEncounter(row, null)) })
        .map(({ encounterId, name, service, room, bed }) => ({ encounterId, name, service, room, bed }));
      return { ok: true, patients };
    };
  root.HhrHospitalizedRosterRuntime = Object.freeze({ create });
})(typeof self !== 'undefined' ? self : globalThis);
