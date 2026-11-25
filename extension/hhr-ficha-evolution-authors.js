// Filter the existing timeline in memory, scoped to the active encounter and tab.
(() => {
  'use strict';
  const filtered = 'data-hhr-evolution-filtered';
  const text = el => el?.textContent.trim().replace(/\s+/g, ' ') || '';
  const unknown = Symbol('unidentified author');
  const profession = /^(?:m[eé]dic[oa](?:\s+(?:cirujan[oa]|especialista|tratante))?|enfermer[oa](?:\([oa]\))?|kinesi[oó]log[oa]|param[eé]dic[oa]|nutricionista|matr[oó]n(?:a)?|t[eé]cnic[oa](?: de enfermer[ií]a)?|tens|terapeuta ocupacional|fonoaudi[oó]log[oa]|psic[oó]log[oa]|asistente social|trabajador(?:a)? social|qu[ií]mic[oa] farmac[eé]utic[oa])$/i;
  const isProfession = label => profession.test(label.replace(/\([oa]\)/gi, ''));
  const interactive = 'button,a[href],input,select,textarea,[role="button"],[tabindex],[contenteditable="true"]';
  // The compact toolbar lends the header's children to the card grid, leaving the header without a box.
  function rendered(el) {
    while (el?.parentElement && getComputedStyle(el).display === 'contents') el = el.parentElement;
    return el.getClientRects().length > 0;
  }
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
  function hasNoteToolbar(card) {
    // Only the read-only note, followed by its own row of icon buttons.
    // Leave unfamiliar structures and in-place editors in their native layout.
    if (!card?.matches('.MuiCard-root') || card.children.length !== 2 ||
        !card.firstElementChild.matches('.MuiCardHeader-root') ||
        !card.lastElementChild.matches('.MuiCardContent-root')) return false;
    const iconButton = el => el.matches('button') && text(el).length <= 1;
    const headButtons = card.firstElementChild.querySelectorAll('.MuiCardHeader-action button:not(.hhr-evo-entry)');
    if (![...headButtons].every(iconButton)) return false;
    const stack = card.lastElementChild.querySelector(':scope > div.MuiStack-root:only-child');
    if (stack?.children.length !== 2 ||
        !stack.firstElementChild.matches('div.MuiStack-root') ||
        !stack.firstElementChild.querySelector(':scope > .MuiBox-root > .MuiTypography-caption') ||
        stack.querySelector('form,input,textarea,[contenteditable],[role="textbox"]')) return false;
    const tools = stack.lastElementChild.querySelector(':scope > div.MuiStack-root:only-child');
    if (!stack.lastElementChild.matches('div.MuiStack-root') || !tools?.querySelector(':scope > button')) return false;
    return [...tools.children].every(el => el.matches('.hhr-checklist-launcher') || iconButton(el));
  }
  // Name the native icon buttons that can be identified. An unknown button keeps its own icon.
  const plain = value => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const noteNoun = /\b(?:evolucion(?:es)?|nota|observacion)\b/;
  // Whole icon names: EditOff, CreateNewFolder or PlaylistAddCheck are different actions.
  const editIcon = /^(?:EditNote|PostAdd|NoteAdd|Create|Edit|BorderColor|RateReview)(?:Outlined|Rounded|Sharp|TwoTone)?Icon$/;
  function toolAction(button, unnamedPair) {
    const name = plain(button.getAttribute('aria-label') || button.title);
    const icons = [...button.querySelectorAll('svg[data-testid]')].map(icon => icon.getAttribute('data-testid'));
    if (/\b(?:opciones|menu)\b/.test(name) || icons.some(id => /^MoreVert/i.test(id))) return 'more';
    if (/^enm(?:endamiento|ienda)s?\b/.test(name)) return 'amend';
    if (/^editar\b/.test(name) && noteNoun.test(name)) return 'edit';
    if (/^(?:nueva|nuevo|crear|redactar|agregar|anadir|escribir|ingresar|registrar)\b/.test(name) && noteNoun.test(name)) return 'write';
    if (name) return null;
    // Without a name, use the same evidence that opens the native editor for a guideline.
    if (icons.length ? icons.every(id => editIcon.test(id)) : unnamedPair?.[0] === button) return 'edit';
    return null;
  }
  const toolHints = {edit:'Editar evolución', write:'Escribir evolución', amend:'Enmiendas', more:'Más opciones'};
  function toolActions(card) {
    const actions = new Map();
    if (!card) return actions;
    const tools = [...card.querySelectorAll(':scope > .MuiCardContent-root > .MuiStack-root > :last-child > .MuiStack-root > button')];
    const header = [...card.querySelectorAll(':scope > .MuiCardHeader-root > .MuiCardHeader-action button:not(.hhr-evo-entry)')];
    const unnamed = tools.filter(el => !el.getAttribute('aria-label') && !el.title && !el.querySelector('svg[data-testid]') && el.querySelector('svg'));
    const pair = unnamed.length === 2 && tools.length === 2 ? unnamed : null;
    for (const button of [...header, ...tools]) {
      const action = toolAction(button, pair);
      if (action && (action !== 'more' || header.includes(button))) actions.set(button, action);
    }
    return actions;
  }
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
    let toolbarCard = null;
    let toolMarks = new Map();
    function releaseTool(button) {
      button.removeAttribute('data-hhr-evo-action');
      // Only remove the hint this reader added, and only while it is still intact.
      const hint = button.getAttribute('data-hhr-evo-hint');
      if (hint === null) return;
      if (button.title === hint) button.removeAttribute('title');
      button.removeAttribute('data-hhr-evo-hint');
    }
    function markToolbar(card) {
      const next = hasNoteToolbar(card) ? card : null;
      const actions = toolActions(next);
      for (const button of toolMarks.keys()) if (!actions.has(button)) releaseTool(button);
      for (const [button, action] of actions) {
        if (button.getAttribute('data-hhr-evo-action') !== action) button.setAttribute('data-hhr-evo-action', action);
        // A narrow card shows the icon alone. An icon without any native name gets one on hover;
        // a named button may already show Eloísa's own tooltip.
        if (!button.hasAttribute('aria-label') && !button.hasAttribute('title')) {
          button.title = toolHints[action];
          button.setAttribute('data-hhr-evo-hint', toolHints[action]);
        }
      }
      toolMarks = actions;
      if (next === toolbarCard) return;
      toolbarCard?.removeAttribute('data-hhr-evo-toolbar');
      next?.setAttribute('data-hhr-evo-toolbar', '');
      toolbarCard = next;
    }
    function unfilter() {
      for (const el of previous.keys()) el.removeAttribute(filtered);
      previous.clear();
      selected = '';
      bar.remove();
      group.replaceChildren();
      authorButtons.clear();
    }
    function clear() {
      markToolbar(null);
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
      const summary = inHistory ? null : document.getElementById('evolution');
      markToolbar(summary);
      if (wasHistory && !inHistory) {
        viewing = false;
        focusOnOpen = false;
      }
      wasHistory = inHistory;
      const timeline = document.querySelector('[data-hhr-history-timeline]');
      if (!viewing || !inHistory) {
        if (bar.isConnected || previous.size) unfilter();
        const host = inHistory ? timeline : summary?.querySelector('.MuiCardHeader-action') ||
          summary?.querySelector('.MuiCardHeader-content');
        if (host && historyTab && !historyTab.matches(':disabled,[aria-disabled="true"]') && rendered(host)) {
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
      const choices = timeline ? ['', ...names] : [];
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
      if (focusOnOpen && group.firstElementChild) {
        group.firstElementChild.focus({ preventScroll: true });
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
