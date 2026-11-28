// How many hours a page of Plan de tratamiento asks for (hhr-plan-page-size-main.js reads it from the page).
// «Automática» fits the window: each hour is 5 rem and the indication keeps about 27 rem, from 7 to 14 hours.
// The owner may fix it between 7 and 14 in Ajustes (27-11-2026). The choice is stored in this profile.
(() => {
  'use strict';
  const key = 'hhr-plan-hours-v1';
  const choices = Object.freeze(['auto', 7, 8, 9, 10, 11, 12, 13, 14]);
  const normalize = value => choices.includes(value) ? value : 'auto';
  /** The hours that fit a window of `width` CSS pixels. */
  const fit = width => Math.max(7, Math.min(14, Math.floor((Number(width) - 440) / 80) || 7));
  const hoursFor = (choice, width) => choice === 'auto' ? fit(width) : choice;

  let choice = 'auto';
  const apply = () => {
    const root = globalThis.document?.documentElement;
    if (!root) return;
    const hours = String(hoursFor(choice, globalThis.innerWidth));
    if (root.dataset.hhrPlanHours !== hours) root.dataset.hhrPlanHours = hours;
  };

  const storage = globalThis.chrome?.storage;
  if (storage?.local && /^\/dashboard\//.test(globalThis.location?.pathname || '')) {
    storage.local.get(key).then(stored => { choice = normalize(stored[key]); apply(); }).catch(apply);
    storage.onChanged?.addListener((changes, area) => {
      if (area === 'local' && Object.hasOwn(changes, key)) { choice = normalize(changes[key].newValue); apply(); }
    });
    globalThis.addEventListener?.('resize', () => { if (choice === 'auto') apply(); });
    apply();
  }

  globalThis.HhrPlanHours = Object.freeze({
    key, choices, fit, hoursFor,
    load: () => storage.local.get(key).then(stored => normalize(stored[key])),
    save: value => storage.local.set({ [key]: normalize(value) }),
  });
})();
