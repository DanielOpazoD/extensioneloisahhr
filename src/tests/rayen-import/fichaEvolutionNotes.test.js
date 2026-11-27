import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

Function(readFileSync('extension/ficha-evolution-notes.js', 'utf8'))();
const { create, project, windows } = globalThis.HhrFichaEvolutionNotes;

const history = [
  { publishDatetime: '2026-11-26T11:12:00', evolutionResume: [
    { id: 5, OBE_NOTES: 'Nota médica ficticia', OBE_PUBLISH_DATETIME: '2026-11-26T11:12:35', HCPR_NAME: 'Médico', HCP_FGN: 'Tomás', HCP_FFN: 'Ejemplo' },
  ] },
  { publishDatetime: '2026-07-01T10:00:00', evolutionResume: [
    { id: 6, OBE_NOTES: 'Nota de invierno', OBE_PUBLISH_DATETIME: '2026-07-01T10:00:00', HCPR_NAME: 'Enfermera(o)', HCP_LEGAL: 'Elena Ejemplo', OBE_AMENDED: true },
    { id: 5, OBE_NOTES: 'Nota médica ficticia', OBE_PUBLISH_DATETIME: '2026-11-26T11:12:35' },
  ] },
  { evolutionResume: [
    { id: 7, OBE_NOTES: 'Con desfase', OBE_PUBLISH_DATETIME: '2026-11-26T15:00:00Z', HCPR_NAME: 'Kinesiólogo(a)', IS_CROSSED_OUT: 1 },
    { id: 8, OBE_NOTES: '   ' },
    { id: 9, OBE_NOTES: 'Sin hora legible', OBE_PUBLISH_DATETIME: 'ayer' },
  ] },
  null,
  { patientFreeIndicationResume: [{ INDICATION: 'No es una evolución' }] },
];

describe('lectura de evoluciones para la tarjeta Evolución', () => {
  it('convierte la hora continental a la de Rapa Nui con Intl, en verano y en invierno, y ordena de la más reciente a la más antigua', () => {
    expect(project(history).map(note => [note.id, note.day, note.time, note.role, note.author])).toEqual([
      ['7', '26-11-2026', '10:00', 'Kinesiólogo(a)', ''],
      ['5', '26-11-2026', '09:12', 'Médico', 'Tomás Ejemplo'],
      ['6', '01-07-2026', '08:00', 'Enfermera(o)', 'Elena Ejemplo'],
      ['9', '', '', '', ''],
    ]);
  });

  it('lista una vez la nota repetida, omite la vacía y conserva las marcas de enmienda y tachado', () => {
    const notes = project(history);
    expect(notes.filter(note => note.id === '5')).toHaveLength(1);
    expect(notes.some(note => note.id === '8')).toBe(false);
    expect(notes.find(note => note.id === '6')).toMatchObject({ amended: true, crossedOut: false, archived: false });
    expect(notes.find(note => note.id === '7')).toMatchObject({ crossedOut: true });
    expect(Object.keys(notes[0]).sort()).toEqual(['amended', 'archived', 'author', 'crossedOut', 'day', 'id', 'instant', 'note', 'role', 'time']);
    expect(project(null)).toEqual([]);
  });

  const sender = episode => ({ frameId: 0, url: 'https://fichamedico.rayensalud.cl/dashboard/encounter-list/' + episode });
  const encounterOf = url => /\/(\d+)$/.exec(String(url))?.[1] || '';
  const reader = (overrides = {}) => {
    const dependencies = {
      authorize: vi.fn(async () => true), resolveSession: vi.fn(async () => ({ info: { token: 'ficticio' } })),
      readJson: vi.fn(async () => ({ status: 200, data: history })), encounterOf, ...overrides,
    };
    return { ...dependencies, handle: create(dependencies).handle };
  };

  it('lee solo el episodio que la pestaña tiene abierto, en su marco principal y con su autorización', async () => {
    const denied = { error: 'Las evoluciones no fueron autorizadas para el episodio de esta pestaña.', errorCode: 'episode_not_authorized' };
    const open = reader();
    expect(await open.handle({ encId: '77' }, sender('78'))).toEqual(denied);
    expect(await open.handle({ encId: '77' }, { ...sender('77'), frameId: 3 })).toEqual(denied);
    expect(await open.handle({ encId: '77' }, undefined)).toEqual(denied);
    // Eloísa opens a ficha from its list without loading a page: the address of the script that asks stays
    // the list's, and the tab's own address, which the browser keeps, says which episode is open.
    const list = 'https://fichamedico.rayensalud.cl/dashboard/encounter-list';
    expect((await reader().handle({ encId: '77' }, { frameId: 0, url: list, tab: { id: 5, url: list + '/77' } })).ok).toBe(true);
    expect(await open.handle({ encId: '77' }, { ...sender('77'), tab: { id: 5, url: list + '/78' } })).toEqual(denied);
    expect(await reader({ authorize: async () => false }).handle({ encId: '77' }, sender('77'))).toEqual(denied);
    expect(await open.handle({ encId: 'abc' }, sender('77'))).toEqual({ error: 'El episodio clínico no es válido.' });
    expect(open.resolveSession).not.toHaveBeenCalled();
    expect(open.readJson).not.toHaveBeenCalled();
  });

  it('pide la ventana permitida, sin escribir nada, y devuelve solo lo que el lector muestra', async () => {
    const open = reader();
    const answer = await open.handle({ encId: '77', lookbackDays: 60 }, sender('77'));
    expect(answer).toMatchObject({ ok: true, encId: '77', days: 60, older: 365 });
    expect(answer.notes).toHaveLength(4);
    expect(JSON.stringify(answer)).not.toContain('ficticio');
    expect(open.readJson).toHaveBeenCalledWith(expect.objectContaining({
      path: '/api/encounter/77/getPatientEncounterHistoryReportServer/false/0/0/-60', info: { token: 'ficticio' },
    }));
    await open.handle({ encId: '77', lookbackDays: 4000 }, sender('77'));
    expect(open.readJson.mock.calls[1][0].path).toMatch(/-14$/);
    expect((await open.handle({ encId: '77', lookbackDays: 365 }, sender('77'))).older).toBeNull();
    expect(windows).toEqual([14, 60, 365]);
  });

  it('una lectura fallida dice que falló: no es «sin evoluciones»', async () => {
    expect(await reader({ resolveSession: async () => ({ error: 'Sin sesión de Ficha Médico.' }) }).handle({ encId: '77' }, sender('77')))
      .toEqual({ error: 'Sin sesión de Ficha Médico.', errorCode: 'session_required' });
    expect(await reader({ readJson: async () => { throw Object.assign(new Error('x'), { kind: 'http', status: 500 }); } }).handle({ encId: '77' }, sender('77')))
      .toEqual({ error: 'El servidor de Ficha Médico respondió HTTP 500.' });
    expect(await reader({ readJson: async () => { throw new Error('token secreto'); } }).handle({ encId: '77' }, sender('77')))
      .toEqual({ error: 'No se pudieron leer las evoluciones de Ficha Médico.' });
    expect(await reader({ readJson: async () => ({ status: 200, data: { no: 'lista' } }) }).handle({ encId: '77' }, sender('77')))
      .toEqual({ error: 'El historial clínico no es verificable.' });
    expect(await reader({ readJson: async () => ({ status: 204 }) }).handle({ encId: '77' }, sender('77')))
      .toEqual({ ok: true, encId: '77', days: 14, older: 60, notes: [] });
  });
});
