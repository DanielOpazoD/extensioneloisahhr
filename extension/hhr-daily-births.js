/** Public dates only. The worker fetches a compact, anonymous reading of the Spanish Wikifeeds feed. */
(() => {
  'use strict';
  const zone = 'Pacific/Easter';
  const numeric = new Intl.DateTimeFormat('en-CA', { timeZone: zone, month: '2-digit', day: '2-digit' });
  const display = new Intl.DateTimeFormat('es', { timeZone: zone, month: 'long', day: 'numeric' });
  let cached;

  async function read(now = new Date(), fetchImpl = fetch) {
    const part = (parts, type) => parts.find(item => item.type === type)?.value;
    const date = numeric.formatToParts(now);
    const day = part(date, 'day');
    const month = part(date, 'month');
    const key = month + '/' + day;
    if (cached?.key === key) return cached.result;
    const label = display.format(now);
    const article = Number(day) + '_de_' + part(display.formatToParts(now), 'month');
    const source = 'https://es.wikipedia.org/wiki/' + encodeURIComponent(article) + '#Nacimientos';
    const entry = { key, result: Promise.resolve().then(async () => {
      try {
        const response = await fetchImpl('https://es.wikipedia.org/api/rest_v1/feed/onthisday/births/' + key, {
          credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error',
          signal: AbortSignal.timeout(7000),
        });
        if (!response.ok) throw new Error('Wikifeeds unavailable');
        const { births } = await response.json();
        if (!Array.isArray(births)) throw new Error('Invalid births feed');
        const names = new Set();
        const people = [];
        for (const entry of births) {
          const page = entry?.pages?.[0];
          const name = typeof page?.titles?.normalized === 'string' && page.titles.normalized.trim();
          if (!name || !Number.isInteger(entry.year) || names.has(name)) continue;
          names.add(name);
          const description = typeof page.description === 'string' ? page.description.trim().slice(0, 130) : '';
          people.push({ name: name.slice(0, 120), year: entry.year, description });
          if (people.length === 5) break;
        }
        return { label, source, people };
      } catch {
        if (cached === entry) cached = undefined;
        return { label, source, unavailable: true, people: [] };
      }
    }) };
    cached = entry;
    return entry.result;
  }

  globalThis.HhrDailyBirths = Object.freeze({ read });
})();
