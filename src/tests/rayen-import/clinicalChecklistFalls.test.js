import { describe, expect, it } from 'vitest';
import '../../../extension/clinico/clinical-assessment-clock.js';
import '../../../extension/clinico/clinical-checklist-falls.js';
import '../../../extension/ficha/hhr-ficha-evolution-reader.js';

const { templates: [adult, pediatric], eligibility, evaluate, buildEvolutionText, parse } = globalThis.HhrChecklistFalls;
const { readable } = globalThis.HhrFichaEvolutionReader;
const fecha = '2026-11-27';
const hora = '16:30';
const adultBase = { edad: 'sin-puntos', factores: ['ninguno'], farmacos: ['ninguno'], fecha, hora };
const pedsBase = { edad: 'escolar', caidas: 'no', antecedentes: ['ninguno'], conciencia: 'no', fecha, hora };
const allPositive = section => section.options.filter(option => option.points).map(option => option.value);
const allHistory = allPositive(pediatric.groups[2]);

describe('pautas de caídas de HHR', () => {
  it('reproduce todos los pesos impresos en el PDF adulto y su máximo sin edades simultáneas', () => {
    const [age, factors, medication] = adult.groups.map(section => Object.fromEntries(
      section.options.map(option => [option.value, option.points])
    ));
    expect(age).toEqual({ 'menor-5': 3, 'mayor-75': 3, 'sin-puntos': 0 });
    expect(factors).toEqual({
      'caidas-previas': 1, locomotor: 2, neurologicas: 3, psiquicos: 3, conciencia: 1, eliminacion: 1,
      agitacion: 3, audicion: 1, cardiovascular: 3, visual: 1, ninguno: 0,
    });
    expect(medication).toEqual({ diureticos: 1, hipotensores: 1, snc: 2, otros: 1, anestesia: 2, vasoactivas: 1, ninguno: 0 });
    expect(evaluate(adult, {
      ...adultBase, edad: 'mayor-75', factores: allPositive(adult.groups[1]), farmacos: allPositive(adult.groups[2]),
    })).toMatchObject({ points: 30, maximum: 30, risk: 'alto' });
  });

  it('reproduce edades, sí/no y antecedentes acumulables del PDF pediátrico', () => {
    expect(pediatric.groups.map(section => section.options.map(option => option.points))).toEqual([
      [2, 3, 1], [1, 0], [1, 1, 1, 1, 1, 0], [1, 0],
    ]);
    expect(allHistory).toEqual(['hiperactividad', 'neuromusculares', 'convulsivo', 'cerebral', 'otros']);
    expect(evaluate(pediatric, {
      ...pedsBase, edad: 'lactante-mayor-preescolar', caidas: 'si', antecedentes: allHistory, conciencia: 'si',
    })).toMatchObject({ points: 10, maximum: 10, risk: 'alto' });
  });

  it.each([
    [adult, adultBase, 0, 'Bajo', '2026-12-04'],
    [adult, { ...adultBase, edad: 'mayor-75' }, 3, 'Bajo', '2026-12-04'],
    [adult, { ...adultBase, edad: 'mayor-75', factores: ['caidas-previas'] }, 4, 'Medio', '2026-11-30'],
    [adult, { ...adultBase, edad: 'mayor-75', factores: ['neurologicas', 'conciencia'] }, 7, 'Medio', '2026-11-30'],
    [adult, { ...adultBase, edad: 'mayor-75', factores: ['neurologicas', 'conciencia'], farmacos: ['diureticos'] }, 8, 'Alto', '2026-11-28'],
    [pediatric, { ...pedsBase, edad: 'lactante-mayor-preescolar' }, 3, 'Bajo', '2026-12-04'],
    [pediatric, { ...pedsBase, edad: 'lactante-mayor-preescolar', caidas: 'si' }, 4, 'Medio', '2026-11-30'],
    [pediatric, { ...pedsBase, edad: 'lactante-mayor-preescolar', antecedentes: allHistory.slice(0,4) }, 7, 'Medio', '2026-11-30'],
    [pediatric, { ...pedsBase, edad: 'lactante-mayor-preescolar', antecedentes: allHistory }, 8, 'Alto', '2026-11-28'],
  ].map(([template, answers, points, risk, next]) => ({ title: template.title, template, answers, points, risk, next })))
  ('$title conserva los cortes y la próxima valoración con $points puntos', ({ template, answers, points, risk, next }) => {
    const text = buildEvolutionText(template, answers);
    expect(text.split('\n').slice(0,3)).toEqual(['#EscalaCaidas', template.title, fecha + ' ' + hora]);
    expect(parse(text)).toMatchObject({ points, risk, nextDate: next });
  });

  it('verifica los límites institucionales y los 75 años en la fecha de valoración', () => {
    const identity = patientBirthDate => ({ patientBirthDate });
    expect(eligibility(pediatric, identity('2026-11-27'), fecha)).toEqual({ adultAge: null });
    expect(eligibility(pediatric, identity('2011-11-27'), '2026-11-26').reason).toBeUndefined();
    expect(eligibility(pediatric, identity('2011-11-27'), fecha).reason).toMatch(/adultos/);
    expect(eligibility(adult, identity('2011-11-27'), '2026-11-26').reason).toMatch(/pediátrica/);
    expect(eligibility(adult, identity('2011-11-27'), fecha)).toEqual({ adultAge: 'sin-puntos' });
    expect(eligibility(adult, identity('1951-11-27T00:00:00'), fecha)).toEqual({ adultAge: 'sin-puntos' });
    expect(eligibility(adult, identity('1950-11-27'), fecha)).toEqual({ adultAge: 'mayor-75' });
    expect(eligibility(adult, {}, fecha).reason).toMatch(/edad/);
    const today = globalThis.HhrClinicalAssessmentClock.hospitalDateTimeNow().date;
    expect(eligibility(pediatric, { patientAge: '9 meses' }, today).reason).toBeUndefined();
    expect(eligibility(adult, { patientAge: '76 a' }, today)).toEqual({ adultAge: 'mayor-75' });
  });

  it('exige una elección válida en cada sección y rechaza sumar ausencia con antecedentes', () => {
    expect(evaluate(adult, { ...adultBase, factores: [] }).missing).toBe('Factores de riesgo');
    expect(evaluate(pediatric, { ...pedsBase, antecedentes: ['ninguno', 'hiperactividad'] }).risk).toBeNull();
    expect(evaluate(pediatric, { ...pedsBase, antecedentes: ['otros', 'otros'] }).risk).toBeNull();
    expect(evaluate(pediatric, { ...pedsBase, antecedentes: ['desconocido'] }).risk).toBeNull();
    expect(buildEvolutionText(adult, { ...adultBase, hora: '24:00' })).toBe('');
    expect(buildEvolutionText(pediatric, { ...pedsBase, fecha: '2026-02-30' })).toBe('');
  });

  it('reconstruye las notas completas y deja en Evoluciones las mixtas, incompletas o inconsistentes', () => {
    const text = buildEvolutionText(adult, adultBase);
    const rich = buildEvolutionText(pediatric, { ...pedsBase, observaciones: 'Control simulado.\nObservación de prueba.' })
      .split('\n').map(line => '<p>' + line + '</p>').join('\n');
    expect(parse(readable(rich))).toMatchObject({ scale: 'Caídas pediátricas', points: 1, maximum: 10 });
    expect(parse(text, { archived: true }).nextDate).toBeNull();
    expect(parse(text, { crossedOut: true }).nextDate).toBeNull();
    for (const invalid of [
      '#EscalaCaidas', '#EscalaCaidas\nCaídas en adultos',
      'Narrativa clínica\n' + text, text + '\nPárrafo nuevo sin relación.',
      text.replace('Puntaje: 0 / 30', 'Puntaje: 8 / 30'),
      text.replace('Bajo (bajo)', 'Alto (alto)'),
      text.replace('Ningún factor de esta lista (0)', 'Alteración de conciencia (2)'),
      text.replace('Ningún tratamiento de esta lista (0)', 'Hipotensores (1) · Hipotensores (1)'),
    ]) expect(parse(invalid)).toBeNull();
  });

  it('da la misma fecha de reevaluación para distintas horas del mismo día', () => {
    for (const time of ['00:15', '22:30']) {
      const text = buildEvolutionText(adult, {
        ...adultBase, edad: 'mayor-75', factores: ['neurologicas', 'conciencia'], farmacos: ['diureticos'],
        fecha: '2026-09-04', hora: time,
      });
      expect(parse(text).nextDate).toBe('2026-09-05');
    }
  });
});
