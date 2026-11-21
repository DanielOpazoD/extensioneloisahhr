/** Public dates only. Both sources receive an anonymous request from the extension worker. */
(() => {
  'use strict';
  const zone = 'Pacific/Easter';
  const numeric = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const display = new Intl.DateTimeFormat('es', { timeZone: zone, month: 'long', day: 'numeric' });
  let cached;

  async function retrieve(fetchImpl, url) {
    const response = await fetchImpl(url, {
      credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error',
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) throw new Error('No se pudo consultar la fuente pública.');
    return response;
  }

  async function birthsFor(fetchImpl, month, day) {
    const response = await retrieve(fetchImpl, 'https://es.wikipedia.org/api/rest_v1/feed/onthisday/births/' + month + '/' + day);
    const { births } = await response.json();
    if (!Array.isArray(births)) throw new Error('No se reconoció la lista de nacimientos.');
    const names = new Set();
    const people = [];
    for (const birth of births) {
      const page = birth?.pages?.[0];
      const name = typeof page?.titles?.normalized === 'string' && page.titles.normalized.trim();
      if (!name || !Number.isInteger(birth.year) || names.has(name)) continue;
      names.add(name);
      const description = typeof page.description === 'string' ? page.description.trim().slice(0, 130) : '';
      people.push({ name: name.slice(0, 120), year: birth.year, description });
      if (people.length === 5) break;
    }
    return people;
  }

  const entityText = Object.freeze({ amp:'&', nbsp:' ', quot:'"', apos:"'", lt:'<', gt:'>' });
  function plainText(html) {
    return html.replace(/<[^>]*>/g, '').replace(/&(#x[0-9a-f]+|#\d+|amp|nbsp|quot|apos|lt|gt);/gi, (entity, key) => {
      if (!key.startsWith('#')) return entityText[key.toLowerCase()];
      const hex = key[1].toLowerCase() === 'x';
      const code = Number.parseInt(key.slice(hex ? 2 : 1), hex ? 16 : 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }).replace(/\s+/g, ' ').trim();
  }

  async function eventsFor(fetchImpl, url, { day, monthName, year }) {
    const html = await (await retrieve(fetchImpl, url)).text();
    const title = html.match(/<title>Efemérides de Chile\s*-\s*([^<]+)<\/title>/i)?.[1];
    if (title?.trim().toLowerCase() !== monthName + ' ' + year) {
      throw new Error('No se reconoció el mes del calendario.');
    }
    const events = new Set();
    let recognizedDates = false;
    // The source exposes a calendar in HTML. Read the dated summary as text only.
    for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const date = row[1].match(/<td\s+class=["']t2["']\s*>([\s\S]*?)<\/td>/i)?.[1];
      const parts = date && /^(\d{1,2}) (.+)$/.exec(plainText(date).toLowerCase());
      if (!parts || parts[2] !== monthName) continue;
      recognizedDates = true;
      if (Number(parts[1]) !== Number(day)) continue;
      const summary = row[1].match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1];
      const text = summary && plainText(summary);
      if (text) events.add(text.slice(0, 160));
      if (events.size === 5) break;
    }
    if (!recognizedDates) throw new Error('No se reconocieron las fechas del calendario.');
    return [...events];
  }

  async function read(now = new Date(), fetchImpl = fetch) {
    const { year, month, day } = Object.fromEntries(numeric.formatToParts(now).map(({ type, value }) => [type, value]));
    const monthName = display.formatToParts(now).find(item => item.type === 'month').value;
    const key = year + '/' + month + '/' + day;
    if (cached?.key !== key) cached = { key };
    const entry = cached;
    const source = 'https://es.wikipedia.org/wiki/' + encodeURIComponent(Number(day) + '_de_' + monthName) + '#Nacimientos';
    const eventsSource = 'https://www.efemerides.cl/index.php?mesConsulta=' + Number(month);
    entry.births ??= birthsFor(fetchImpl, month, day).catch(() => { delete entry.births; return null; });
    entry.events ??= eventsFor(fetchImpl, eventsSource, { day, monthName, year }).catch(() => { delete entry.events; return null; });
    const [people, events] = await Promise.all([entry.births, entry.events]);
    return {
      label: display.format(now), source, people: people || [], unavailable: people === null,
      eventsSource, events: events || [], eventsUnavailable: events === null,
    };
  }

  globalThis.HhrDailyBirths = Object.freeze({ read });
})();
