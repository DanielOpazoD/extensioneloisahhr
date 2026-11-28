import { expect, it, vi } from 'vitest';
import '../../../extension/listas/hhr-nursing-novelty.js';

const { classify, createReader } = globalThis.HhrNursingNovelty;
const stamp = '2026-11-20T09:10:00-05:00';
const author = 'Profesional de Prueba';
const evolution = { publishDatetime: '2026-11-20T14:10:00Z',
  evolutionResume: [{ HCPR_NAME: 'Médico', HCP_LEGAL: author, OBE_NOTES: '<p>Texto sintético &nbsp; para la vista breve.</p>' }] };
const indication = { publishDatetime: stamp,
  patientFreeIndicationResume: [{ HCP_ROLE: 'Médica cirujana', HCP_NAME: author }] };

it('classifies the exact medical publication independently of order and offset syntax', () => {
  expect(classify([{ ...indication, publishDatetime: '2026-11-20T15:00:00Z' }, evolution], stamp)).toBe('evolution');
  expect(classify([indication], stamp)).toBe('indication');
  expect(classify([{ ...indication, patientFreeIndicationResume: [{ HCP_ROLE: 'Enfermera' }] }], stamp)).toBeUndefined();
  expect(classify([indication, evolution], stamp)).toBeUndefined();
  expect(classify([{ ...indication, evolutionResume: evolution.evolutionResume }], stamp)).toBeUndefined();
  expect(classify([{ ...evolution, publishDatetime: '2026-11-20T14:10:00.002Z' }], stamp)).toBeUndefined();
});

it('requires the same professional for matching wall times and never guesses a time zone', () => {
  const wall = '2026-11-20T09:10:00';
  const event = { ...indication, publishDatetime: wall + '.000' };
  expect(classify([event], wall, ' PROFESIONAL  de Prueba ')).toBe('indication');
  expect(classify([event], wall, '')).toBeUndefined();
  expect(classify([event], wall, 'Otra persona')).toBeUndefined();
  expect(classify([event], stamp, author)).toBeUndefined();
});

it('bounds history reads and ignores a superseded response for the same episode', async () => {
  const first = Promise.withResolvers();
  const second = Promise.withResolvers();
  const nextStamp = '2026-11-20T14:12:00Z';
  const readHistory = vi.fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
    .mockResolvedValue([{ ...evolution, publishDatetime: nextStamp }]);
  const read = createReader(readHistory);
  const active = () => true;
  const old = read('1', stamp, author, active);
  expect(read('1', stamp, author, active)).toBe(old);
  const other = read('2', stamp, author, active);
  await Promise.resolve();
  expect(readHistory.mock.calls).toEqual([['1'], ['2']]);
  const newer = read('1', nextStamp, author, active);
  await Promise.resolve();
  expect(readHistory).toHaveBeenCalledTimes(2);
  first.resolve([indication]);
  second.resolve([]);
  expect(await old).toBeUndefined();
  expect(await other).toBeUndefined();
  expect(await newer).toEqual({
    kind: 'evolution', minute: '2026-11-20T09:12', author, excerpt: 'Texto sintético para la vista breve.',
  });
  expect(readHistory.mock.calls).toEqual([['1'], ['2'], ['1']]);
});
