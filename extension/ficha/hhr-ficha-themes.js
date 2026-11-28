// A Chrome profile stores just the preset ID. CSS and the existing reader own the layout.
(() => {
  'use strict';
  const key = 'hhr-ficha-theme-v1';
  const choices = new Map([
    ['off', 'Desactivado · Eloísa original'],
    ['compact', 'Modo 1 · Compacto'],
    ['balanced', 'Modo 2 · Equilibrado'],
    ['reading', 'Modo 3 · Lectura'],
  ]);
  const normalize = value => choices.has(value) ? value : 'compact';

  function observe(listener) {
    let revision = 0;
    let active = true;
    const changed = (changes, area) => {
      if (area === 'local' && Object.hasOwn(changes, key)) {
        revision++;
        listener(normalize(changes[key].newValue));
      }
    };
    const storage = chrome.storage;
    storage.onChanged.addListener(changed);
    const initial = revision;
    storage.local.get(key).then(result => {
      if (active && revision === initial) listener(normalize(result[key]));
    }).catch(() => { if (active && revision === initial) listener('off'); });
    return () => { active = false; storage.onChanged.removeListener(changed); };
  }
  // A reload opens in the saved view: this file also runs before Eloísa draws anything, and names the
  // view on the page so that its first card is already drawn in it. The route is the one of a ficha;
  // the presentation, which starts later, keeps or removes the name from then on.
  const ficha = /^\/dashboard\/encounter-list(?:-nurse)?\/\d+(?:\/.*)?$/;
  const page = globalThis.document;
  if (page?.readyState === 'loading' && ficha.test(globalThis.location?.pathname || '')) {
    chrome.storage.local.get(key).then(result => {
      const theme = normalize(result[key]), root = page.documentElement;
      if (theme !== 'off' && !root.hasAttribute('data-hhr-ficha-theme') && ficha.test(location.pathname)) {
        root.setAttribute('data-hhr-ficha-theme', theme);
      }
    }).catch(() => {});
  }
  globalThis.HhrFichaThemes = Object.freeze({
    choices: () => [...choices], observe,
    save: value => chrome.storage.local.set({ [key]: normalize(value) }),
  });
})();
