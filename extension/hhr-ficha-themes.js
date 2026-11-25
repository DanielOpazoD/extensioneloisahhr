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
  globalThis.HhrFichaThemes = Object.freeze({
    choices: () => [...choices], observe,
    save: value => chrome.storage.local.set({ [key]: normalize(value) }),
  });
})();
