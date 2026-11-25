// Filter the existing timeline in memory, scoped to the active encounter and tab.
(() => {
  'use strict';
  const filtered = 'data-hhr-evolution-filtered';
  const text = el => el?.textContent.trim().replace(/\s+/g, ' ') || '';
  const unknown = Symbol('unidentified author');
  const profession = /^(?:m[eé]dic[oa](?:\s+(?:cirujan[oa]|especialista|tratante))?|enfermer[oa](?:\([oa]\))?|kinesi[oó]log[oa]|param[eé]dic[oa]|nutricionista|matr[oó]n(?:a)?|t[eé]cnic[oa](?: de enfermer[ií]a)?|tens|terapeuta ocupacional|fonoaudi[oó]log[oa]|psic[oó]log[oa]|asistente social|trabajador(?:a)? social|qu[ií]mic[oa] farmac[eé]utic[oa])$/i;
  const isProfession = label => profession.test(label.replace(/\([oa]\)/gi, ''));
  const interactive = 'button,a[href],input,select,textarea,[role="button"],[tabindex],[contenteditable="true"]';
  function author(header) {
    const title = header.querySelector('.MuiCardHeader-title');
    const sub = header.querySelector('.MuiCardHeader-subheader');
    for (const [role, byline] of [[title, sub], [sub, title]]) {
      const name = text(byline);
      if (name && !isProfession(name) && isProfession(text(role))) {
        const hideRole = !role.matches(interactive) && !role.querySelector(interactive);
        return { name, role: hideRole ? role : null };
      }
    }
    return { name: unknown, role: null };
  }
  const button = (label, className) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = className;
    el.textContent = label;
    return el;
  };
  function readCards(timeline) {
    const cards = new Map();
    for (const card of timeline?.querySelectorAll(':scope > .MuiBox-root > .MuiCard-root') || []) {
      const header = card.querySelector(':scope > .MuiCardHeader-root');
      const category = card.querySelector(':scope > .MuiCardContent-root > p.MuiTypography-root:first-child');
      if (!header || !category || category.children.length) continue;
      const kind = text(category);
      if (!kind) continue;
      const note = /^evoluci[oó]n(?: de enfermer[ií]a| m[eé]dica)?$/i.test(kind);
      cards.set(card, note ? { note, ...author(header) } : { note });
    }
    return cards;
  }
  function create() {
    const entry = button('Ver evoluciones', 'hhr-evo-entry');
    const bar = document.createElement('div');
    bar.className = 'hhr-evo-filters';
    const group = document.createElement('div');
    group.className = 'hhr-evo-authors';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Evoluciones por profesional');
    const message = document.createElement('span');
    message.setAttribute('role', 'status');
    const back = button('Historial completo', 'hhr-evo-back');
    bar.append(group, message, back);
    let episode = null;
    let historyTab = null;
    let viewing = false;
    let wasHistory = false;
    let focusOnOpen = false;
    let selected = '';
    let previous = new Map();
    let authorButtons = new Map();
    function unfilter() {
      for (const el of previous.keys()) el.removeAttribute(filtered);
      previous.clear();
      selected = '';
      bar.remove();
      group.replaceChildren();
      authorButtons.clear();
    }
    function clear() {
      entry.remove();
      unfilter();
      historyTab = null;
      episode = null;
      viewing = false;
      wasHistory = false;
      focusOnOpen = false;
    }
    function refresh(encounter) {
      if (encounter !== episode || !encounter) clear();
      if (!encounter) return;
      episode = encounter;
      historyTab = [...document.querySelectorAll('[role="tablist"] [role="tab"]')].find(el =>
        text(el) === 'Historial' && el.getClientRects().length);
      const inHistory = historyTab?.getAttribute('aria-selected') === 'true';
      if (wasHistory && !inHistory) {
        viewing = false;
        focusOnOpen = false;
      }
      wasHistory = inHistory;
      const timeline = document.querySelector('[data-hhr-history-timeline]');
      if (!viewing || !inHistory) {
        if (bar.isConnected || previous.size) unfilter();
        const host = inHistory ? timeline : document.querySelector('#evolution .MuiCardHeader-action') ||
          document.querySelector('#evolution .MuiCardHeader-content');
        if (host && historyTab && !historyTab.matches(':disabled,[aria-disabled="true"]') && host.getClientRects().length) {
          if (entry.parentElement !== host) host.prepend(entry);
        } else entry.remove();
        return;
      }
      entry.remove();
      const host = timeline || document.querySelector('main');
      if (!host) return;
      if (bar.parentElement !== host) host.prepend(bar);
      const cards = readCards(timeline);
      const notes = [...cards.values()].filter(card => card.note);
      const names = [...new Set(notes.map(note => note.name).filter(name => name !== unknown))].sort((a, b) => a.localeCompare(b, 'es'));
      if (notes.some(note => note.name === unknown)) names.push(unknown);
      if (!names.includes(selected)) selected = '';
      const next = new Map();
      for (const [card, info] of cards) {
        if (!info.note || (selected && info.name !== selected)) next.set(card, 'card');
        else if (info.role) next.set(info.role, 'role');
      }
      for (const day of timeline?.querySelectorAll(':scope > .MuiBox-root') || []) {
        const [divider, ...records] = day.children;
        const chip = divider?.querySelector(':scope > .MuiChip-root:only-child > .MuiChip-label');
        if (!chip || !/^(?:hoy|ayer|\d{2}[-/]\d{2}[-/]\d{4})$/i.test(text(chip))) continue;
        if (records.length && records.every(el => next.get(el) === 'card') &&
            !divider.matches(interactive) && !divider.querySelector(interactive)) next.set(divider, 'date');
      }
      for (const el of previous.keys()) if (!next.has(el)) el.removeAttribute(filtered);
      for (const [el, kind] of next) if (previous.get(el) !== kind) el.setAttribute(filtered, kind);
      previous = next;
      const choices = ['', ...names];
      if (choices.length !== authorButtons.size || choices.some(name => !authorButtons.has(name))) {
        const buttons = new Map();
        for (const name of choices) {
          const label = name === unknown ? 'Autor sin identificar' : name || 'Todos';
          buttons.set(name, authorButtons.get(name) || button(label, 'hhr-evo-author'));
        }
        const focused = document.activeElement;
        group.replaceChildren(...buttons.values());
        if (group.contains(focused)) focused.focus({ preventScroll: true });
        authorButtons = buttons;
      }
      for (const [name, item] of authorButtons) {
        const pressed = String(name === selected);
        if (item.getAttribute('aria-pressed') !== pressed) item.setAttribute('aria-pressed', pressed);
      }
      if (focusOnOpen) {
        group.firstElementChild?.focus({ preventScroll: true });
        focusOnOpen = false;
      }
      const status = !timeline ? 'Aún no hay registros de historial disponibles.' :
        !notes.length ? 'Sin evoluciones entre los registros cargados.' : '';
      if (message.textContent !== status) message.textContent = status;
    }
    entry.addEventListener('click', () => {
      viewing = true;
      focusOnOpen = true;
      if (historyTab?.getAttribute('aria-selected') !== 'true') historyTab?.click();
      refresh(episode);
    });
    back.addEventListener('click', () => {
      viewing = false;
      refresh(episode);
      entry.focus({ preventScroll: true });
    });
    group.addEventListener('click', event => {
      for (const [name, item] of authorButtons) if (item === event.target) {
        selected = name;
        refresh(episode);
        break;
      }
    });
    return { refresh, clear };
  }
  globalThis.HhrFichaEvolutionAuthors = Object.freeze({ create });
})();
