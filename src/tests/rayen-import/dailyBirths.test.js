import { expect, it, vi } from 'vitest';
import '../../../extension/hhr-daily-births.js';

it('uses Rapa Nui dates and shares one anonymous public read per day', async () => {
  const births = [{ year:1901, pages:[{ titles:{ normalized:'Figura sintética' }, description:'Descripción pública' }] }];
  const fetch = vi.fn(async () => Response.json({births}));
  const date = new Date('2026-11-22T02:30:00Z');
  const first = globalThis.HhrDailyBirths.read(date, fetch);
  const second = globalThis.HhrDailyBirths.read(date, fetch);
  expect(await first).toEqual({
    label:'21 de noviembre', source:'https://es.wikipedia.org/wiki/21_de_noviembre#Nacimientos',
    people:[{name:'Figura sintética', year:1901, description:'Descripción pública'}],
  });
  expect(await second).toBe(await first);
  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    'https://es.wikipedia.org/api/rest_v1/feed/onthisday/births/11/21',
    expect.objectContaining({ credentials:'omit', referrerPolicy:'no-referrer', redirect:'error' }),
  );
});

it('can retry an unavailable public feed without navigating away', async () => {
  const fetch = vi.fn()
    .mockImplementationOnce(() => { throw new Error('unavailable'); })
    .mockResolvedValueOnce(Response.json({births:[]}));
  const date = new Date('2026-11-22T12:00:00Z');
  expect(await globalThis.HhrDailyBirths.read(date, fetch)).toMatchObject({unavailable:true, people:[]});
  expect(await globalThis.HhrDailyBirths.read(date, fetch)).toMatchObject({label:'22 de noviembre', people:[]});
  expect(fetch).toHaveBeenCalledTimes(2);
});
