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
  // Eloísa names its icon buttons on the svg («Enmendar», «Ver enmendados»). A caption is always
  // that native word: an action without a native name keeps its icon and gets no caption.
  const plain = value => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  // A tooltip this reader wrote repeats a name. It is not one.
  const ownHint = button => button.hasAttribute('data-hhr-evo-hint') && button.title === button.getAttribute('data-hhr-evo-hint');
  const nativeName = button => (button.getAttribute('aria-label') || (ownHint(button) ? '' : button.title) ||
    button.querySelector('svg[aria-label]')?.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
  // The kind only chooses the icon of the family. The list goes before its verb.
  const toolKinds = [
    ['amended', /^(?:ver )?(?:enmendad[oa]s|enmendamientos|enmiendas)\b/],
    ['amend', /^enmendar\b/],
    ['edit', /^editar\b/],
    ['write', /^(?:nueva|nuevo|crear|redactar|agregar|anadir|escribir|ingresar|registrar)\b/],
  ];
  function toolAction(button, inHeader) {
    const name = nativeName(button);
    const icon = button.querySelector('svg[data-testid]')?.getAttribute('data-testid') || '';
    if (inHeader) {
      return /^MoreVert/.test(icon) || /\b(?:opciones|menu)\b/.test(plain(name)) ? {kind:'more', caption:'', name:name || 'Más opciones'} : null;
    }
    const kind = toolKinds.find(([, pattern]) => pattern.test(plain(name)))?.[0];
    if (!kind) return null;
    const words = name.replace(/^ver\s+/i, '').replace(/\s+(?:de\s+(?:la\s+)?)?(?:evoluci[oó]n|nota)$/i, '');
    const caption = words.charAt(0).toUpperCase() + words.slice(1);
    return {kind, caption:caption.length <= 14 ? caption : '', name};
  }
  function toolActions(card) {
    const actions = new Map();
    if (!card) return actions;
    const tools = card.querySelectorAll(':scope > .MuiCardContent-root > .MuiStack-root > :last-child > .MuiStack-root > button');
    const header = card.querySelectorAll(':scope > .MuiCardHeader-root > .MuiCardHeader-action button:not(.hhr-evo-entry)');
    for (const [buttons, inHeader] of [[header, true], [tools, false]]) {
      for (const button of buttons) {
        const action = toolAction(button, inHeader);
        if (action) actions.set(button, action);
      }
    }
    return actions;
  }
  function readCards(timeline) {
    const cards = new Map();
    for (const card of timeline?.querySelectorAll(':scope > .MuiBox-root > .MuiCard-root') || []) {
      const header = card.querySelector(':scope > .MuiCardHeader-root');
      // Eloísa writes the category as the first paragraph of the content, or of its only stack.
      const category = card.querySelector(':scope > .MuiCardContent-root > p.MuiTypography-root:first-child, ' +
        ':scope > .MuiCardContent-root > div.MuiStack-root:only-child > p.MuiTypography-root:first-child');
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
      button.removeAttribute('data-hhr-evo-caption');
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
      for (const [button, {kind, caption, name}] of actions) {
        if (button.getAttribute('data-hhr-evo-action') !== kind) button.setAttribute('data-hhr-evo-action', kind);
        if (caption) { if (button.getAttribute('data-hhr-evo-caption') !== caption) button.setAttribute('data-hhr-evo-caption', caption); }
        else button.removeAttribute('data-hhr-evo-caption');
        // The native name lives on the icon, where a pointer shows nothing. Offer it on the button.
        // A button Eloísa already names for a screen reader is not described twice.
        if (!button.hasAttribute('aria-label') && (!button.hasAttribute('title') || ownHint(button) && button.title !== name)) {
          button.title = name;
          button.setAttribute('data-hhr-evo-hint', name);
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
      // A day opens with a dated box and runs through the boxes that follow it. Its date
      // leaves the view only when every event up to the next date is filtered out.
      let open = null;
      const closeDay = () => {
        if (open && open.records.length && open.records.every(el => next.get(el) === 'card') &&
            !open.divider.matches(interactive) && !open.divider.querySelector(interactive)) next.set(open.divider, 'date');
      };
      for (const box of timeline?.querySelectorAll(':scope > .MuiBox-root') || []) {
        const divider = box.firstElementChild;
        const chip = divider?.querySelector(':scope > .MuiChip-root:only-child > .MuiChip-label');
        if (chip && /^(?:hoy|ayer|\d{2}[-/]\d{2}[-/]\d{4})$/i.test(text(chip))) {
          closeDay();
          open = { divider, records: [...box.children].slice(1) };
        } else if (open) open.records.push(...box.children);
      }
      closeDay();
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
