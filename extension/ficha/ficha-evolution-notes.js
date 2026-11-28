/**
 * Evolutions of the episode a ficha tab has open, read from Eloísa's history for the reader on the
 * Evolución card. Read only: nothing is stored, and only the fields the reader shows leave the worker.
 *
 * The history JSON writes the time of an evolution as a mainland wall clock without offset (TIME-02,
 * measured 2026-11-02). It is converted to Rapa Nui with Intl, never by adding or removing hours.
 */
(function (root) {
  'use strict';

  const MAINLAND = 'America/Santiago';
  const RAPA_NUI = 'Pacific/Easter';
  /** The windows a reader may ask for, in days. Anything else reads the first. */
  const WINDOWS = Object.freeze([14, 60, 365]);
  const NAIVE_WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

  const text = value => (value == null ? '' : String(value).replace(/\r\n?/g, '\n').trim());
  const list = value => (Array.isArray(value) ? value : []);
  const flag = value => value === true || value === 1 || /^(?:true|1)$/i.test(text(value));
  const pad = value => String(value).padStart(2, '0');

  const formatters = new Map();
  const zoneParts = (zone, instant) => {
    if (!formatters.has(zone)) {
      formatters.set(zone, new Intl.DateTimeFormat('en-US', {
        timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }));
    }
    const parts = {};
    formatters.get(zone).formatToParts(instant).forEach(part => { parts[part.type] = Number(part.value); });
    return parts;
  };
  const zoneOffsetMs = (zone, instant) => {
    const p = zoneParts(zone, instant);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(instant / 1000) * 1000;
  };
  /** The instant of a wall clock written in `zone`. */
  const zonedInstant = (zone, y, m, d, h, mi, s) => {
    const wall = Date.UTC(y, m - 1, d, h, mi, s);
    const first = wall - zoneOffsetMs(zone, wall);
    return wall - zoneOffsetMs(zone, first);
  };
  /** A time of the history JSON as an instant: mainland when it has no offset, its own offset otherwise. */
  const instantOf = value => {
    const raw = text(value);
    const naive = NAIVE_WALL_CLOCK.exec(raw);
    if (naive) {
      const [, y, m, d, h, mi, s] = naive.map(Number);
      return zonedInstant(MAINLAND, y, m, d, h, mi, s || 0);
    }
    const instant = raw ? Date.parse(raw) : NaN;
    return Number.isFinite(instant) ? instant : null;
  };
  /** The day and the hour the hospital reads for an instant. */
  const hospitalClock = instant => {
    const p = zoneParts(RAPA_NUI, instant);
    return { day: `${pad(p.day)}-${pad(p.month)}-${p.year}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
  };
  // A professional reads as a first name and a first surname, as in the cards of the ficha.
  const authorOf = item => (text(item.HCP_FGN) && text(item.HCP_FFN) ? text(item.HCP_FGN) + ' ' + text(item.HCP_FFN) :
    ['HCP_FGN', 'HCP_NGN', 'HCP_FFN', 'HCP_SFN'].map(key => text(item[key])).filter(Boolean).join(' ')) ||
    text(item.HCP_LEGAL) || text(item.HCP_NAME);

  /** The evolutions of a history report, the latest first. A note read twice is listed once. */
  const project = rawHistory => {
    const notes = [];
    const seen = new Set();
    for (const event of list(rawHistory)) {
      for (const item of list(event && event.evolutionResume)) {
        const note = item ? text(item.OBE_NOTES) : '';
        if (!note) continue;
        const id = text(item.id);
        const instant = instantOf(item.OBE_PUBLISH_DATETIME || event.publishDatetime);
        const key = id || `${instant}|${note}`;
        if (seen.has(key)) continue;
        seen.add(key);
        notes.push({
          id, instant, ...(instant === null ? { day: '', time: '' } : hospitalClock(instant)),
          role: text(item.HCPR_NAME), author: authorOf(item), note,
          amended: flag(item.OBE_AMENDED), crossedOut: flag(item.IS_CROSSED_OUT), archived: flag(item.ARCHIVED),
        });
      }
    }
    // A note without a readable time closes the list: it is never placed by guesswork.
    return notes.sort((a, b) => (b.instant ?? -Infinity) - (a.instant ?? -Infinity));
  };

  const create = ({ authorize, resolveSession, readJson, encounterOf, timeoutMs = 15_000 } = {}) => {
    if (![authorize, resolveSession, readJson, encounterOf].every(dependency => typeof dependency === 'function')) {
      throw new Error('No se pudo inicializar la lectura de evoluciones.');
    }
    const handle = async (message, sender) => {
      const encId = text(message && message.encId);
      if (!/^[1-9]\d{0,15}$/.test(encId)) return { error: 'El episodio clínico no es válido.' };
      // Only the tab that has this episode open reads its notes. The address is the tab's own, which the
      // browser keeps: Eloísa goes from the list to a ficha without loading a page, and the address of the
      // script that asks stays the one of the list (read on the page 26-11-2026: every reader opened that
      // way was refused).
      const open = sender && encounterOf((sender.tab && sender.tab.url) || sender.url);
      if (!sender || sender.frameId !== 0 || open !== encId ||
          !(await authorize(sender, encId))) {
        return { error: 'Las evoluciones no fueron autorizadas para el episodio de esta pestaña.', errorCode: 'episode_not_authorized' };
      }
      const days = WINDOWS.includes(message.lookbackDays) ? message.lookbackDays : WINDOWS[0];
      const session = await resolveSession({ sender });
      if (session.error) return { error: session.error, errorCode: 'session_required' };
      try {
        const result = await readJson({
          info: session.info,
          path: `/api/encounter/${encodeURIComponent(encId)}/getPatientEncounterHistoryReportServer/false/0/0/-${days}`,
          timeoutMs, timeoutMessage: 'Tiempo de espera agotado consultando Ficha Médico.',
        });
        const older = WINDOWS[WINDOWS.indexOf(days) + 1] || null;
        if (result.status === 204) return { ok: true, encId, days, older, notes: [] };
        if (!Array.isArray(result.data)) return { error: 'El historial clínico no es verificable.' };
        return { ok: true, encId, days, older, notes: project(result.data) };
      } catch (error) {
        // A failed read is not «no evolutions»: the reader says it failed.
        return { error: error && error.kind === 'http' ? 'El servidor de Ficha Médico respondió HTTP ' + error.status + '.' :
          'No se pudieron leer las evoluciones de Ficha Médico.' };
      }
    };
    return Object.freeze({ handle });
  };

  const api = Object.freeze({ create, project, windows: WINDOWS });
  root.HhrFichaEvolutionNotes = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : self);
