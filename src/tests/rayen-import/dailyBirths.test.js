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
    people:[{name:'Figura sintética', year:1901, description:'Descripción pública', url:'https://es.wikipedia.org/wiki/Figura_sint%C3%A9tica'}], unavailable:false,
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

it('ranks all birthdays in batches by recent biography visits and links each article', async () => {
  const entries = Array.from({ length:251 }, (_, index) => ({
    year:1900 + index,
    pages:[{ pageid:index + 1, titles:{ normalized:'Figura histórica ' + (index + 1) } }],
  }));
  const fetch = vi.fn(async input => {
    const url = new URL(input);
    if (url.hostname === 'www.efemerides.cl') return calendar(23);
    if (url.pathname === '/w/api.php') {
      return Response.json({query:{pages: url.searchParams.get('pageids').split('|').map(Number).map(pageid => ({
        pageid, pageviews:{'2026-11-20':pageid + 10, '2026-11-21':pageid + 10},
      }))}});
    }
    return Response.json({births:entries});
  });
  const result = await globalThis.HhrDailyBirths.read(new Date('2026-11-23T12:00:00Z'), fetch);
  expect(result.people.map(person => person.name)).toEqual(
    [251, 250, 249, 248, 247, 246, 245, 244].map(number => 'Figura histórica ' + number));
  expect(result.people[0].url).toBe('https://es.wikipedia.org/wiki/Figura_hist%C3%B3rica_251');
  const requests = fetch.mock.calls.map(([input]) => new URL(input)).filter(url => url.pathname === '/w/api.php');
  expect(requests.map(url => url.searchParams.get('pageids').split('|').length)).toEqual([50, 50, 50, 50, 50, 1]);
  expect(requests.every(url => url.searchParams.get('pvipdays') === '30')).toBe(true);
});
