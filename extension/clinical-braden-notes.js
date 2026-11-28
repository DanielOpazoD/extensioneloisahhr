// Read the dedicated Braden notes as scores; leave unrecognized or mixed notes readable in Evoluciones.
(() => {
  'use strict';
  const { parseValuationStamp, nextValuationDate } = globalThis.HhrClinicalAssessmentClock;
  const detailsLabel = 'Observaciones de piel e intervenciones:';

  function parse(text, note = {}) {
    const braden = globalThis.HhrChecklistBraden;
    if (!braden || typeof text !== 'string' || !text.startsWith(braden.EVOLUTION_HEADING)) return null;
    const [heading, scale, dated, subtotal, ...body] = text.split(/\r?\n/)
      .map(line => line.trim().replace(/[\t\u00a0 ]+/g, ' ')).filter(Boolean);
    if (heading !== braden.EVOLUTION_HEADING) return null;
    const template = globalThis.HhrBradenTemplates?.find(item => item.title === scale);
    const valuation = parseValuationStamp(dated);
    if (!template || !valuation || !subtotal?.startsWith('Subpuntajes: ')) return null;

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

    const voided = note.crossedOut || note.archived;
    return {
      scale, valuation, points: score.points, maximum: score.maximum, risk: score.riskLabel,
      nextDate: voided ? null : nextValuationDate(valuation.date, braden.REASSESS_BY_RISK[score.risk].days),
    };
  }

  globalThis.HhrClinicalBradenNotes = Object.freeze({ parse });
})();
