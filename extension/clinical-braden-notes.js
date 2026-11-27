// Read the dedicated Braden notes as scores; leave unrecognized or mixed notes readable in Evoluciones.
(() => {
  'use strict';
  const HOUR_MS = 3_600_000;
  const DAY_MS = 24 * HOUR_MS;
  const STAMP = /^(\d{4}-\d{2}-\d{2}) ((?:[01]\d|2[0-3]):[0-5]\d)(?: · [^\n]+)?$/;
  const detailsLabel = 'Observaciones de piel e intervenciones:';
  const wallTime = ({ date, time }) => Date.parse(date + 'T' + time + ':00Z');

  // Rapa Nui switches offset. Count hours from a verified instant, and keep a 7-day cadence in calendar days.
  function localInstants(stamp, hospitalClock) {
    const wall = wallTime(stamp);
    const candidates = new Set();
    for (const probe of [wall - DAY_MS, wall + DAY_MS]) {
      const offset = wallTime(hospitalClock(new Date(probe))) - probe;
      const instant = wall - offset;
      if (wallTime(hospitalClock(new Date(instant))) === wall) candidates.add(instant);
    }
    return [...candidates];
  }

  function nextValuation(stamp, cadence, hospitalClock) {
    if (cadence.days) {
      const date = new Date(wallTime(stamp) + cadence.days * DAY_MS).toISOString().slice(0, 10);
      const next = { date, time: stamp.time };
      return localInstants(next, hospitalClock).length ? next : { date, time: '' };
    }
    const instants = localInstants(stamp, hospitalClock);
    return instants.length === 1 ? hospitalClock(new Date(instants[0] + cadence.hours * HOUR_MS)) : null;
  }

  function parse(text, note = {}) {
    const braden = globalThis.HhrChecklistBraden;
    if (!braden || typeof text !== 'string' || !text.startsWith(braden.EVOLUTION_HEADING)) return null;
    const [heading, scale, dated, subtotal, ...body] = text.split(/\r?\n/)
      .map(line => line.trim().replace(/[\t\u00a0 ]+/g, ' ')).filter(Boolean);
    if (heading !== braden.EVOLUTION_HEADING) return null;
    const template = globalThis.HhrBradenTemplates?.find(item => item.title === scale);
    const stamp = STAMP.exec(dated || '');
    if (!template || !stamp || !braden.calendarDay(stamp[1]) || !subtotal?.startsWith('Subpuntajes: ')) return null;

    const dimensions = template.fields.filter(field => field.type === 'choice');
    const entries = subtotal.slice('Subpuntajes: '.length).split(/\s*·\s*/);
    if (entries.length !== dimensions.length) return null;
    const answers = {};
    for (const [index, field] of dimensions.entries()) {
      const [, code, points] = /^([A-Z]{1,2}) ([1-4])$/.exec(entries[index]) || [];
      const option = field.options.find(item => item.points === Number(points));
      if (code !== field.shortCode || !option || body[index] !== field.label + ': ' + option.label) return null;
      answers[field.id] = option.label;
    }
    const score = braden.evaluateDraft(template, answers);
    const [total, risk, ...extra] = body.slice(dimensions.length);
    if (!score.complete || total !== `Puntaje: ${score.points} / ${score.maximum}` ||
        risk !== `Riesgo de LPP según escala: ${score.riskLabel} (${score.risk})`) return null;

    let tail = extra;
    if (tail[0]?.startsWith('Reevaluar: ')) tail = tail.slice(1);
    if (tail[0] === 'Cuidados planeados según riesgo:') {
      const afterCare = tail.findIndex((line, index) => index > 0 && !line.startsWith('• '));
      tail = afterCare < 0 ? [] : tail.slice(afterCare);
    }
    if (tail.length && !tail[0].startsWith(detailsLabel)) return null;

    const valuation = { date: stamp[1], time: stamp[2] };
    const voided = note.crossedOut || note.archived;
    return {
      scale, valuation, points: score.points, maximum: score.maximum, risk: score.riskLabel,
      next: voided ? null : nextValuation(valuation, braden.REASSESS_BY_RISK[score.risk], braden.hospitalDateTimeNow),
    };
  }

  globalThis.HhrClinicalBradenNotes = Object.freeze({ parse });
})();
