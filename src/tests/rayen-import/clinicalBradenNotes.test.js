import { describe, expect, it } from 'vitest';
import '../../../extension/clinico/clinical-assessment-clock.js';
import '../../../extension/clinico/clinical-checklist-braden-templates.js';
import '../../../extension/clinico/clinical-checklist-braden.js';
import '../../../extension/clinico/clinical-braden-notes.js';
import '../../../extension/ficha/hhr-ficha-evolution-reader.js';

const { parse } = globalThis.HhrClinicalBradenNotes;
const { buildDraftEvolutionText } = globalThis.HhrChecklistBraden;
const { readable } = globalThis.HhrFichaEvolutionReader;

function note(index, points, fecha, hora, piel = '') {
  const template = globalThis.HhrBradenTemplates[index];
  const dimensions = template.fields.filter(field => field.type === 'choice');
  const answers = { fecha, hora, piel };
  let remaining = points - dimensions.length;
  for (const field of dimensions) {
    const option = Math.min(field.options.length - 1, remaining);
    answers[field.id] = field.options[option].label;
    remaining -= option;
  }
  return buildDraftEvolutionText(template, answers);
}

describe('Scores de las evoluciones Braden', () => {
  it.each([
    [0, 'Braden adulto', 12, 23, 'Alto', '2026-11-28'],
    [0, 'Braden adulto', 15, 23, 'Moderado', '2026-11-30'],
    [0, 'Braden adulto', 16, 23, 'Bajo', '2026-12-04'],
    [1, 'Braden Q', 16, 28, 'Alto', '2026-11-28'],
    [1, 'Braden Q', 21, 28, 'Moderado', '2026-11-30'],
    [1, 'Braden Q', 22, 28, 'Bajo', '2026-12-04'],
  ])('lee %s %s y usa la fecha de valoración para %s puntos', (index, scale, points, maximum, risk, nextDay) => {
    const text = note(index, points, '2026-11-27', '16:00');
    expect(parse(text, { day: '30-11-2026', time: '12:00' })).toEqual({
      scale, points, maximum, risk, valuation: { date: '2026-11-27', time: '16:00' },
      nextDate: nextDay,
    });
  });

  it('lee la nota formateada por el editor y conserva los caracteres clínicos', () => {
    const original = note(1, 7, '2026-11-27', '16:00', 'Control de prueba\nPAM <65 durante la simulación.');
    const formatted = original.split('\n').map(line => '<p>' + line.replaceAll('<', '&lt;') + '</p>').join('\r\n');
    expect(parse(readable(formatted))).toMatchObject({ scale: 'Braden Q', points: 7, risk: 'Alto' });
  });

  it('deja en Evoluciones encabezados no exactos, notas mixtas y valoraciones inconsistentes', () => {
    const valid = note(0, 6, '2026-11-27', '16:00');
    for (const invalid of [
      'Evolución clínica\n' + valid,
      valid.replace('#EscalaBraden', '#EscalaBraden v1'),
      valid.replace('2026-11-27', '2026-02-30'),
      valid.replace('16:00', '24:00'),
      valid.replace('F 1', 'F 4'),
      valid.replace('· F 1', ''),
      valid.replace('Puntaje: 6 / 23', 'Puntaje: 7 / 23'),
      valid.replace('Alto (alto)', 'Moderado (moderado)'),
      valid + '\nEvolución narrativa de la simulación.',
      valid.split('\n').slice(0, 5).join('\n'),
    ]) expect(parse(invalid)).toBeNull();
  });

  it('reconstruye las notas tachadas y archivadas sin agendar otra valoración', () => {
    const text = note(1, 22, '2026-11-27', '16:00');
    expect(parse(text, { crossedOut: true })).toMatchObject({ risk: 'Bajo', nextDate: null });
    expect(parse(text, { archived: true })).toMatchObject({ risk: 'Bajo', nextDate: null });
  });

  it('calcula el día de la próxima valoración incluso durante un cambio de hora en Rapa Nui', () => {
    for (const time of ['00:15', '20:30', '23:45']) {
      expect(parse(note(0, 6, '2026-09-05', time)).nextDate).toBe('2026-09-06');
    }
    expect(parse(note(0, 14, '2026-04-04', '00:15')).nextDate).toBe('2026-04-07');
    expect(parse(note(1, 7, '2026-04-04', '21:30')).nextDate).toBe('2026-04-05');
    expect(parse(note(1, 22, '2026-08-29', '22:30')).nextDate).toBe('2026-09-05');
  });
});
