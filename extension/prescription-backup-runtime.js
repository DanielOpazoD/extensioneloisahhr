/** Explicit, read-only prescription backup independent of Eloísa's PDF report server. */
(function (root) {
  'use strict';
  const clean = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  const id = value => /^\d+$/.test(String(value || '')) ? String(value) : '';
  const statusFields = ['suspended', 'archived', 'finalized', 'deleted'];
  const unavailable = () => ({ error: 'No se pudo verificar la totalidad de los fármacos activos. No se generó un respaldo parcial.' });

  const activeEntries = (entries, encId) => {
    if (!Array.isArray(entries) || entries.some(entry => !entry ||
      !id(entry.id) || String(entry.encounterId) !== encId ||
      statusFields.some(field => typeof entry[field] !== 'boolean'))) return null;
    const active = entries.filter(entry => !statusFields.some(field => entry[field]));
    if (new Set(active.map(entry => id(entry.id))).size !== active.length) return null;
    return active;
  };
  const medicationContent = entry => ({
    id: id(entry.id),
    medication: clean(entry.virtualMedicalProductName),
    posology: clean(entry.posology),
    route: clean(entry.administrationRoute),
    note: clean(entry.administrationNote),
    external: entry.is_external === true,
    authorId: id(entry.authorHealthCarePractitionerId),
    author: clean(entry.authorHealthCarePractitionerName),
    timestamp: String(entry.stringTimestamp || entry.timestamp || ''),
    insulinSchema: entry.insulinSchema ?? null,
  });
  const fingerprint = entries => JSON.stringify(entries.map(medicationContent)
    .sort((a, b) => a.id.localeCompare(b.id)));

  const create = ({ resolveSession, sessionKey, authorize, fetchCurrentMedicationEntries,
    fetchPrescriptionEvents, getClinicalReportContext, prescriptionPrint, prescriptionPdf,
    pdfPrint, openPdfPrintDialog, now = () => Date.now() }) => {
    const handle = async ({ encId: rawEncId, printFormat, sender }) => {
      const encId = id(rawEncId);
      if (!encId || !await authorize(sender, encId)) {
        return { error: 'El episodio no está autorizado para generar un respaldo.' };
      }
      const session = await resolveSession({ sender });
      if (session.error) return session;
      const binding = await sessionKey(session.info, sender);
      const [current, history, context] = await Promise.all([
        fetchCurrentMedicationEntries(encId, session.info),
        fetchPrescriptionEvents(encId, session.info),
        getClinicalReportContext(encId, session.info, null, sender),
      ]);
      if (current.error || history.error || context.error) {
        return { error: 'No se pudo leer la ficha para el respaldo. Vuelve a intentarlo.' };
      }
      const active = activeEntries(current.entries, encId);
      if (!active) return unavailable();
      if (!active.length) return { error: 'No hay fármacos activos para el respaldo.' };
      if (active.some(entry => entry.insulinSchema != null && entry.insulinSchema !== '' &&
        !(Array.isArray(entry.insulinSchema) && entry.insulinSchema.length === 0))) {
        return { error: 'El respaldo no puede reproducir los esquemas de insulina adjuntos. Revisa la ficha y usa la receta oficial.' };
      }
      if (!context.patientId || !clean(context.patient?.name)) return unavailable();
      const byId = new Map(active.map(entry => [id(entry.id), medicationContent(entry)]));
      const events = prescriptionPrint.applyCurrentMedicationMetadata(history.events, active);
      const groups = prescriptionPrint.deriveProfessionalPrescriptionGroups(events)
        .map(group => ({ ...group, medications: group.medications.filter(item => byId.has(item.id)) }))
        .filter(group => group.medications.length);
      const covered = new Set();
      for (const group of groups) {
        if (!group.prescriberVerified || !group.professionalRun ||
          new Set(group.medications.map(item => Date.parse(item.dateTime))).size !== 1) return unavailable();
        for (const medication of group.medications) {
          const live = byId.get(medication.id);
          // The active table owns dose/content; history supplies the verified author and date.
          if (covered.has(medication.id) || !live.medication || !live.posology || !live.route ||
            !live.authorId || medication.professionalId !== live.authorId ||
            !Number.isFinite(Date.parse(medication.dateTime))) return unavailable();
          covered.add(medication.id);
          Object.assign(medication, live);
          if (live.external) medication.note = 'Medicamento externo. ' + live.note;
        }
      }
      if (covered.size !== active.length) return unavailable();
      const generatedAt = new Date(now()).toISOString();
      const buffers = groups.map(group => prescriptionPdf.generateProfessionalPrescriptionPdf({
        patient: context.patient,
        professional: group.professional,
        professionalRun: group.professionalRun,
        medications: group.medications,
        dateSource: 'indication',
        validationDateTime: group.medications[0].dateTime,
        emissionDateTime: prescriptionPrint.formatDateTimeLabel(generatedAt),
        printFormat: printFormat === 'compact' ? 'compact' : 'standard',
        isBackup: true,
      }));
      const buffer = await pdfPrint.mergePdfBuffers(buffers);
      const latestSession = await resolveSession({ sender });
      if (latestSession.error || await sessionKey(latestSession.info, sender) !== binding ||
        !await authorize(sender, encId)) {
        return { error: 'La sesión cambió. Abre nuevamente Recetas para generar el respaldo.' };
      }
      const latest = await fetchCurrentMedicationEntries(encId, latestSession.info);
      const latestActive = latest.error ? null : activeEntries(latest.entries, encId);
      if (!latestActive || fingerprint(active) !== fingerprint(latestActive)) {
        return { error: 'El tratamiento cambió durante la preparación. Vuelve a generar el respaldo.' };
      }
      const finalSession = await resolveSession({ sender });
      if (finalSession.error || await sessionKey(finalSession.info, sender) !== binding ||
        !await authorize(sender, encId)) {
        return { error: 'La sesión cambió. Abre nuevamente Recetas para generar el respaldo.' };
      }
      const opened = await openPdfPrintDialog({ buffer, filename: 'Receta_respaldo_HHR_' + encId + '.pdf' });
      return opened.error ? opened : { ...opened, backup: true, medicationCount: active.length };
    };
    return Object.freeze({ handle });
  };
  root.HhrPrescriptionBackupRuntime = Object.freeze({ create });
})(typeof self !== 'undefined' ? self : globalThis);
