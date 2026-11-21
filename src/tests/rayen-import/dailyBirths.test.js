import { expect, it, vi } from 'vitest';
import '../../../extension/hhr-daily-births.js';

const births = [{ year:1901, pages:[{ titles:{ normalized:'Figura sintética' }, description:'Descripción pública' }] }];
const birthFeed = () => Response.json({births});
const calendar = (day, year = 2026) => new Response(
  '<title>Efemérides de Chile - Noviembre ' + year + '</title><table>' +
  '<tr><td class="t2">19 Noviembre</td><td><details><summary>Otra fecha</summary></details></td></tr>' +
  '<tr><td class="t2">' + day + ' Noviembre</td><td><details><summary>Prueba &amp; <b>cultura</b></summary>' +
  '<p>Descripción fuera del extracto.</p></details></td></tr></table>',
);

it('uses the Rapa Nui date and shares both anonymous reads among callers', async () => {
  const fetch = vi.fn(async url => url.includes('wikipedia.org') ? birthFeed() : calendar(21));
  const date = new Date('2026-11-22T02:30:00Z');
  const first = globalThis.HhrDailyBirths.read(date, fetch);
  const second = globalThis.HhrDailyBirths.read(date, fetch);
  expect(await first).toEqual({
    label:'21 de noviembre', source:'https://es.wikipedia.org/wiki/21_de_noviembre#Nacimientos',
    people:[{name:'Figura sintética', year:1901, description:'Descripción pública'}], unavailable:false,
    events:['Prueba & cultura'], eventsUnavailable:false, eventsSource:'https://www.efemerides.cl/index.php?mesConsulta=11',
  });
  expect(await second).toEqual(await first);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch).toHaveBeenCalledWith('https://es.wikipedia.org/api/rest_v1/feed/onthisday/births/11/21',
    expect.objectContaining({ credentials:'omit', referrerPolicy:'no-referrer', redirect:'error' }));
  expect(fetch).toHaveBeenCalledWith('https://www.efemerides.cl/index.php?mesConsulta=11',
    expect.objectContaining({ credentials:'omit', referrerPolicy:'no-referrer', redirect:'error' }));
});

it('keeps births when the calendar is for another year and retries only that source', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(birthFeed())
    .mockResolvedValueOnce(calendar(22, 2027))
    .mockResolvedValueOnce(calendar(23));
  const date = new Date('2026-11-22T12:00:00Z');
  expect(await globalThis.HhrDailyBirths.read(date, fetch)).toMatchObject({
    people:[expect.objectContaining({name:'Figura sintética'})], eventsUnavailable:true, events:[],
  });
  expect(await globalThis.HhrDailyBirths.read(date, fetch)).toMatchObject({
    label:'22 de noviembre', events:[], eventsUnavailable:false,
  });
  expect(fetch).toHaveBeenCalledTimes(3);
});
