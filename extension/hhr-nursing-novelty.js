/** Classify an exact publication using the native Eloísa history. */
(() => {
  'use strict';

  const medical = /^m[eé]dic[oa](?:\s+(?:cirujan[oa]|especialista|tratante))?$/i;
  const indications = ['patientPharmaIndicationResume', 'patientFreeIndicationResume', 'nutritionOrderResume', 'restResume'];
  const nameKey = name => typeof name === 'string'
    ? name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase() : '';

  function publicationKey(value) {
    if (typeof value !== 'string') return '';
    const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,7}))?(Z|[+-]\d{2}:\d{2})?$/i.exec(value);
    if (!match) return '';
    const fraction = (match[2] || '').padEnd(7, '0');
    if (!match[3]) return 'wall:' + match[1] + '.' + fraction;
    const instant = Date.parse(value);
    return Number.isFinite(instant) ? 'instant:' + instant + ':' + fraction.slice(3) : '';
  }

  function classify(events, publication, publisher) {
    const key = publicationKey(publication);
    if (!key || !Array.isArray(events)) return undefined;
    const matches = events.filter(event => publicationKey(event?.publishDatetime) === key);
    if (matches.length !== 1) return undefined;
    const event = matches[0];
    const hasEntries = resume => Array.isArray(event[resume]) && event[resume].length > 0;
    const author = nameKey(publisher);
    // Offsetless timestamps cannot identify the same instant on their own.
    const physicianEntered = resume => hasEntries(resume) && event[resume].every(entry =>
      medical.test(String(entry?.HCPR_NAME || entry?.HCP_ROLE || '').trim()) &&
      (!key.startsWith('wall:') || (author && nameKey(entry?.HCP_LEGAL || entry?.HCP_NAME) === author)));
    const orders = indications.filter(hasEntries);
    if (hasEntries('evolutionResume')) return !orders.length && physicianEntered('evolutionResume') ? 'evolution' : undefined;
    return orders.length && orders.every(physicianEntered) ? 'indication' : undefined;
  }

  function createReader(readHistory) {
    const cache = new Map();
    const lanes = [Promise.resolve(), Promise.resolve()];
    let lane = 0;
    return (episode, publication, publisher, isCurrent) => {
      if (!/^[1-9]\d{0,15}$/.test(episode) || !publicationKey(publication)) return Promise.resolve();
      const previous = cache.get(episode);
      if (previous?.publication === publication && previous.publisher === publisher && previous.isCurrent()) return previous.result;
      const entry = { publication, publisher, isCurrent, result: lanes[lane].then(async () => {
        if (cache.get(episode) !== entry || !isCurrent()) return undefined;
        try {
          const data = await readHistory(episode);
          return cache.get(episode) === entry && isCurrent() ? classify(data, publication, publisher) : undefined;
        } catch (_error) {
          return undefined;
        }
      }) };
      cache.set(episode, entry);
      lanes[lane] = entry.result;
      lane = (lane + 1) % lanes.length;
      return entry.result;
    };
  }

  globalThis.HhrNursingNovelty = Object.freeze({ classify, createReader });
})();
