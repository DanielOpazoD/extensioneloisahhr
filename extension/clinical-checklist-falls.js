// Factors and weights: the two HHR falls forms. Age and reassessment: HHR GCL 2.2 v2.0, p. 5.
(() => {
  'use strict';
  const { hospitalDateTimeNow, calendarDay, birthDayOf, completedYears, parseValuationStamp, nextValuationDate } =
    globalThis.HhrClinicalAssessmentClock;
  const EVOLUTION_HEADING = '#EscalaCaidas';
  const ADULT = 'hhr-caidas-adulto';
  const PEDIATRIC = 'hhr-caidas-pediatrico';
  const OBSERVATIONS = 'Observaciones y medidas preventivas aplicadas:';
  const CADENCE = {
    alto: { days: 1, label: 'Cada día' },
    medio: { days: 3, label: 'Cada 3 días' },
    bajo: { days: 7, label: 'Cada 7 días' },
  };
  const RISK = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo' };
  const group = (id, label, options, multiple = false) => ({
    id, label, multiple, options: options.map(([value, description, points]) => ({ value, description, points })),
  });
  const yesNo = [['si', 'Sí', 1], ['no', 'No', 0]];
  const templates = [
    { id: ADULT, title: 'Caídas en adultos', groups: [
      group('edad', 'Edad', [
        ['menor-5', 'Menor de 5 años', 3],
        ['mayor-75', 'Mayor de 75 años', 3],
        ['sin-puntos', 'Sin puntaje por edad', 0],
      ]),
      group('factores', 'Factores de riesgo', [
        ['caidas-previas', 'Historia de caídas anteriores', 1],
        ['locomotor', 'Alteración del aparato locomotor', 2],
        ['neurologicas', 'Alteraciones neurológicas', 3],
        ['psiquicos', 'Trastornos psíquicos o mentales', 3],
        ['conciencia', 'Alteración de conciencia', 1],
        ['eliminacion', 'Alteración de la eliminación', 1],
        ['agitacion', 'Agitación psicomotora', 3],
        ['audicion', 'Alteración de la audición o equilibrio', 1],
        ['cardiovascular', 'Alteración del ritmo cardiovascular', 3],
        ['visual', 'Deterioro visual', 1],
        ['ninguno', 'Ningún factor de esta lista', 0],
      ], true),
      group('farmacos', 'Tratamiento farmacológico', [
        ['diureticos', 'Diuréticos', 1],
        ['hipotensores', 'Hipotensores', 1],
        ['snc', 'Depresión del SNC', 2],
        ['otros', 'Otros', 1],
        ['anestesia', 'Anestesia general reciente (12 h postanestesia)', 2],
        ['vasoactivas', 'Drogas vasoactivas', 1],
        ['ninguno', 'Ningún tratamiento de esta lista', 0],
      ], true),
    ] },
    { id: PEDIATRIC, title: 'Caídas pediátricas', groups: [
      group('edad', 'Edad', [
        ['recien-nacido-lactante-menor', 'Recién nacido o lactante menor', 2],
        ['lactante-mayor-preescolar', 'Lactante mayor o preescolar', 3],
        ['escolar', 'Escolar', 1],
      ]),
      group('caidas', 'Antecedentes de caídas previas', yesNo),
      group('antecedentes', 'Antecedentes', [
        ['hiperactividad', 'Hiperactividad', 1],
        ['neuromusculares', 'Problemas neuromusculares', 1],
        ['convulsivo', 'Síndrome convulsivo', 1],
        ['cerebral', 'Daño orgánico cerebral', 1],
        ['otros', 'Otros', 1],
        ['ninguno', 'Sin antecedentes', 0],
      ], true),
      group('conciencia', 'Compromiso de conciencia', yesNo),
    ] },
  ];
  const templateFor = id => templates.find(template => template.id === id);

  function eligibility(template, identity, date) {
    const assessment = calendarDay(date);
    if (!assessment) return { reason: 'Ingresa una fecha de valoración válida.' };
    const birth = birthDayOf(identity?.patientBirthDate);
    if (birth && birth > assessment) return { reason: 'La fecha de valoración es anterior al nacimiento.' };
    let years = birth ? completedYears(birth, assessment) : null;
    if (years === null && date === hospitalDateTimeNow().date) {
      const label = String(identity?.patientAge || '').trim();
      const yearLabel = /^(\d{1,3})(?:\s*años?\b|\s*a\b|$)/i.exec(label);
      if (yearLabel) years = Number(yearLabel[1]);
      else if (/^(?:\d{1,2}\s+(?:mes(?:es)?|d[ií]as?|semanas?)\b|rn\b)/i.test(label)) years = 0;
    }
    if (years === null) return { reason: 'Eloísa debe confirmar la edad en la fecha de valoración.' };
    if ((years >= 15) !== (template.id === ADULT)) {
      return { reason: 'Para esta fecha corresponde la pauta ' + (years >= 15 ? 'de adultos.' : 'pediátrica.') };
    }
    // The adult PDF lists under-5 as a factor. GCL 2.2 assigns every under-15 assessment to pediatrics.
    const adultAge = template.id === ADULT ? (years > 75 ? 'mayor-75' : 'sin-puntos') : null;
    return { adultAge };
  }

  const riskFor = points => points >= 8 ? 'alto' : points >= 4 ? 'medio' : 'bajo';

  function evaluate(template, answers) {
    const groups = [];
    let missing = '';
    let maximum = 0;
    for (const section of template.groups) {
      const values = section.multiple ? answers[section.id] : [answers[section.id]];
      const options = Array.isArray(values) ? section.options.filter(option => values.includes(option.value)) : [];
      const valid = options.length > 0 && options.length === values.length &&
        (options.length === 1 || options.every(option => option.points > 0));
      if (valid) groups.push({ label: section.label, options });
      else if (!missing) missing = section.label;
      const weights = section.options.map(option => option.points);
      maximum += section.multiple ? weights.reduce((sum, points) => sum + points, 0) : Math.max(...weights);
    }
    const points = groups.reduce((sum, { options }) => sum + options.reduce((total, option) => total + option.points, 0), 0);
    const risk = missing ? null : riskFor(points);
    return { missing, groups, points, maximum, risk, riskLabel: RISK[risk], cadence: CADENCE[risk] };
  }

  const optionText = option => option.description + ' (' + option.points + ')';
  const scoreText = score => [
    ...score.groups.map(({ label, options }) => label + ': ' + options.map(optionText).join(' · ')),
    `Puntaje: ${score.points} / ${score.maximum}`,
    `Riesgo de caídas según escala: ${score.riskLabel} (${score.risk})`,
  ];
  const reassessmentText = score => `Reevaluar: ${score.cadence.label} (o antes si cambia la condición clínica).`;

  function buildEvolutionText(template, answers) {
    const stamp = answers.fecha + ' ' + answers.hora;
    const score = evaluate(template, answers);
    if (!score.risk || !parseValuationStamp(stamp)) return '';
    const observations = String(answers.observaciones || '').trim();
    return [EVOLUTION_HEADING, template.title, stamp, ...scoreText(score), reassessmentText(score),
      ...(observations ? [OBSERVATIONS + ' ' + observations] : [])].join('\n');
  }

  function parse(text, note = {}) {
    if (typeof text !== 'string' || !text.startsWith(EVOLUTION_HEADING)) return null;
    const [heading, scale, dated, ...body] = text.split(/\r?\n/)
      .map(line => line.trim().replace(/[\t\u00a0 ]+/g, ' ')).filter(Boolean);
    const template = templates.find(item => item.title === scale);
    const valuation = parseValuationStamp(dated);
    if (heading !== EVOLUTION_HEADING || !template || !valuation) return null;

    const answers = {};
    for (const [index, section] of template.groups.entries()) {
      const prefix = section.label + ': ';
      if (!body[index]?.startsWith(prefix)) return null;
      const choices = body[index].slice(prefix.length).split(' · ')
        .map(value => section.options.find(option => optionText(option) === value)?.value);
      if (choices.some(value => !value) || (!section.multiple && choices.length !== 1)) return null;
      answers[section.id] = section.multiple ? choices : choices[0];
    }
    const score = evaluate(template, answers);
    if (!score.risk) return null;
    const expected = [...scoreText(score), reassessmentText(score)];
    if (expected.some((line, index) => line !== body[index])) return null;
    if (body.length > expected.length && !body[expected.length].startsWith(OBSERVATIONS + ' ')) return null;
    return {
      scale, valuation, points: score.points, maximum: score.maximum, risk: score.riskLabel,
      nextDate: note.crossedOut || note.archived ? null : nextValuationDate(valuation.date, score.cadence.days),
    };
  }

  globalThis.HhrChecklistFalls = Object.freeze({ EVOLUTION_HEADING, templates, templateFor, eligibility, evaluate, buildEvolutionText, parse });
})();
