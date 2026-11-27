// Visual aliases for native labels. Preserve the DOM text used by Eloísa, assistive tech and print.
(() => {
  'use strict';
  const stampPattern = /^Última actualización:\s*(\d{2}[-/]\d{2}[-/]\d{4})(?:,\s*|\s+)(\d{1,2}:\d{2})(?::\d{2})?\s*(?:,|[-–·])\s*(.+)$/i;
  const role = /^(?:médic[oa](?:\s+(?:cirujan[oa]|tratante|especialista))?|enfermer[oa]|paramédic[oa]|kinesiólog[oa]|matr[oó]n(?:a)?|nutricionista|terapeuta ocupacional|fonoaudiólog[oa]|psicólog[oa]|técnic[oa] de enfermería|tens|dra?\.)(?:\([oa]\))?\s+/i;

  const shortName = raw => globalThis.HhrFichaProfessionalName?.short(raw) ?? String(raw).trim().replace(/\s+/g, ' ');
  // The name keeps the spaces Eloísa wrote: they say which of its fields are empty.
  function readStamp(text) {
    const parts = stampPattern.exec(text.replace(/^\s+/, '').replace(/[^\S ]\s*$/, ''));
    if (!parts) return null;
    return { date:parts[1], time:parts[2].padStart(5, '0'), author:shortName(parts[3].replace(role, '')) };
  }
  // The byline of a card: its day, its hour and who signed it.
  function stamp(text) {
    const read = readStamp(text);
    return read && read.date + ' · ' + read.time + ' · ' + read.author;
  }
  // «Enfermera(o) Ana  Rojas Soto» reads «Enfermera(o) Ana Rojas». Nothing when it is already that short.
  function shortAuthor(text) {
    const raw = text.replace(/^\s+/, '').replace(/[^\S ]\s*$/, ''), title = role.exec(raw)?.[0] || '';
    const name = raw.slice(title.length);
    if (!name.trim() || /[\d:,;·]/.test(name)) return null;
    const brief = (title.trim() + ' ' + shortName(name)).trim();
    return brief === raw.trim().replace(/\s+/g, ' ') ? null : brief;
  }

  // Hidden inside the summary. A menu or a window of Eloísa hides the whole page from a screen reader
  // while it is open: that is not a reason to give the summary behind it another shape.
  const outsideSummary = 'dialog,[role=dialog],#hhr-prescription-print-modal,main [aria-hidden=true],[hidden]';
  const entrySections = [
    { id:'shiftChangeEntrySection', field:'Observación de entrega', placeholder:'Escribir entrega…', action:'Agregar a entrega', suffix:'a entrega', open:'Agregar observación' },
    { id:'alertEntrySection', field:'Nueva alerta', placeholder:'Escribir alerta…', action:'Agregar alerta', suffix:'alerta', open:'Agregar alerta' },
  ];

  function matchesNativeNames(element, name, source, required = false) {
    const labelledBy = source(element, 'aria-labelledby')?.trim();
    const labels = [...Array.from(element.labels || [], label => label.textContent),
      source(element, 'aria-label'), element.title].filter(text => text?.trim());
    if (labelledBy) {
      for (const id of labelledBy.split(/\s+/)) {
        const label = element.ownerDocument.getElementById(id);
        if (!label) return false;
        labels.push(label.textContent);
      }
    }
    return (!required || labels.length > 0) && labels.every(text => name.test(text.trim()));
  }

  const pendingEntry = '[aria-busy=true],[aria-invalid=true],[aria-errormessage],[role=alert],[role=status],[role=progressbar],[aria-live],.Mui-error,.MuiAlert-root,.MuiSkeleton-root,.MuiCircularProgress-root,.MuiLinearProgress-root,.MuiLoadingButton-loading,.MuiButton-loading';
  // Collapse only the native pair. Extra text, feedback, links or controls
  // inside either branch make this row unsuitable for a disclosure.
  function isolatedEntry(row, field, action, entry) {
    const form = field.form;
    const nativeRow = form ? form.contains(row) && row.matches('form,div') :
      row.matches('div.MuiStack-root,div.MuiBox-root,div.MuiCardActions-root');
    if (!nativeRow || row.matches('[role],[aria-label],[tabindex],[contenteditable]') ||
        row.children.length !== 2 || !row.firstElementChild.contains(field) ||
        !row.lastElementChild.contains(action) || field.matches(':disabled,[readonly],[aria-disabled=true],[aria-describedby]') ||
        row.closest('main [inert],[hidden],main [aria-hidden=true],[aria-busy=true]')) return false;
    for (const control of form?.elements || []) {
      if (row.contains(control) || control.matches('[data-hhr-entry-open]')) continue;
      if (entry.id === 'alertEntrySection' && control.matches('input[type=checkbox]') &&
          /^(?:no reanimación|gestión de visitas)$/i.test(control.closest('label')?.textContent.trim())) continue;
      return false;
    }
    for (const el of row.querySelectorAll('*')) {
      if (el === field || el === action) continue;
      if (el.matches('div,span') && (el.contains(field) || el.contains(action)) &&
          !el.matches('[tabindex],[role],[aria-label],[aria-labelledby],[title],[contenteditable],[onclick]')) continue;
      if (el.matches('.MuiTouchRipple-root:empty') && el.parentElement === action) continue;
      if (el.matches('textarea[aria-hidden=true][readonly][tabindex="-1"]') && el.parentElement === field.parentElement) continue;
      if (el.matches('label') && el.control === field) continue;
      if (el.closest('fieldset.MuiOutlinedInput-notchedOutline[aria-hidden=true]') && el.matches('fieldset,legend,span')) continue;
      return false;
    }
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (action.contains(node) || field.contains(node) || !node.textContent.trim()) continue;
      if (node.parentElement.closest('fieldset.MuiOutlinedInput-notchedOutline[aria-hidden=true],label') &&
          /^(?:observaci[oó]n(?:es)?\s*[:*]?|\u200b)$/i.test(node.textContent.trim())) continue;
      return false;
    }
    return true;
  }

  // The last time the person scrolled, pressed or typed anywhere on the page.
  let lastInput = -1;
  for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    globalThis.addEventListener?.(type, () => { lastInput = performance.now(); }, {capture:true, passive:true});
  }
  // Where the summary scrolls: the page, or a container of the page with a scroll of its own.
  function pageScroller(element) {
    for (let parent = element.closest('main'); parent && parent !== document.body; parent = parent.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) return parent;
    }
    return document.scrollingElement;
  }

  function createEntry(row, field, action, entry, arriving) {
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.setAttribute('data-hhr-entry-open', '');
    opener.textContent = entry.open;
    const generatedId = 'hhr-' + entry.id + '-editor';
    let createdId = false;
    // Focus opens the editor only when it came through the editor: the opener, a field the person
    // could already see, or typing. Eloísa focuses the empty alert field by itself when the summary
    // of a patient opens (measured 26-11-2026); that focus would hold the editor open and take the
    // next keys. A focus that was already there when the editor came back, after a narrow window
    // or a change of view, is the person's.
    let wanted = !arriving && row.contains(document.activeElement);
    const born = performance.now();
    const update = () => {
      const inside = row.contains(document.activeElement);
      if (!inside) wanted = false;
      const folded = action.disabled && field.value === '' && !wanted;
      row.toggleAttribute('data-hhr-entry-folded', folded);
      if (folded && inside) {
        document.activeElement.blur();
        // The page followed that focus, far down Eloísa's own layout, and would stay there once the
        // summary is laid out. Nobody has scrolled, pressed or typed yet: the summary opens at its top.
        if (lastInput < born) {
          const scroller = pageScroller(row);
          if (scroller?.scrollTop) scroller.scrollTop = 0;
        }
      }
      const expanded = String(!folded);
      if (opener.getAttribute('aria-expanded') !== expanded) opener.setAttribute('aria-expanded', expanded);
      // Rayen may restore a draft into the editor while its opener has keyboard focus.
      if (!folded && opener === document.activeElement) field.focus({preventScroll:true});
    };
    const afterBlur = () => queueMicrotask(() => { if (opener.isConnected) update(); });
    const enter = () => {
      if (!row.hasAttribute('data-hhr-entry-folded')) wanted = true;
      update();
    };
    // Eloísa sets a value without an input event: an input event is someone typing.
    const typed = () => {
      if (row.contains(document.activeElement)) wanted = true;
      update();
    };
    function open(event) {
      event.preventDefault();
      event.stopPropagation();
      wanted = true;
      row.removeAttribute('data-hhr-entry-folded');
      field.focus();
      update();
    }
    opener.addEventListener('click', open);
    row.addEventListener('focusin', enter);
    row.addEventListener('focusout', afterBlur);
    row.addEventListener('input', typed);
    function refresh() {
      if (!row.id && !document.getElementById(generatedId)) {
        row.id = generatedId;
        createdId = true;
      }
      if (row.id && opener.getAttribute('aria-controls') !== row.id) opener.setAttribute('aria-controls', row.id);
      if (opener.nextElementSibling !== row) row.before(opener);
      update();
    }
    function clear(restoreFocus) {
      opener.removeEventListener('click', open);
      row.removeEventListener('focusin', enter);
      row.removeEventListener('focusout', afterBlur);
      row.removeEventListener('input', typed);
      row.removeAttribute('data-hhr-entry-folded');
      if (createdId && row.id === generatedId) row.removeAttribute('id');
      if (restoreFocus && opener === document.activeElement && field.isConnected) field.focus();
      opener.remove();
    }
    return { field, action, refresh, clear };
  }

  function entryFields(main, mark, source, editors) {
    for (const entry of entrySections) {
      const section = main.querySelector('#' + entry.id);
      if (!section) continue;
      const fields = [...section.querySelectorAll('textarea,input:not([type]),input[type=text]')]
        .filter(el => !el.closest(outsideSummary));
      const actions = [...section.querySelectorAll('button')].filter(el =>
        !el.closest(outsideSummary) && /^agregar$/i.test(el.textContent.trim()));
      if (fields.length !== 1 || actions.length !== 1 || fields[0].form !== actions[0].form) continue;
      const field = fields[0], action = actions[0];
      const observationLabel = /^observaci[oó]n(?:es)?\s*[:*]?$/i;
      const placeholder = source(field, 'placeholder');
      if (!matchesNativeNames(field, observationLabel, source) ||
          !matchesNativeNames(action, /^agregar$/i, source) ||
          (placeholder?.trim() && !observationLabel.test(placeholder.trim()))) continue;
      const identified = placeholder?.trim() || matchesNativeNames(field, observationLabel, source, true);
      if (placeholder?.trim()) mark(field, 'placeholder', entry.placeholder);
      for (const [element,name] of [[field, entry.field], [action, entry.action]]) {
        mark(element, 'aria-label', name);
        // An existing IDREF takes precedence over aria-label in the accessibility tree.
        if (source(element, 'aria-labelledby')) mark(element, 'aria-labelledby', null);
      }
      mark(action, 'data-hhr-entry-suffix', entry.suffix);

      let row = field.parentElement;
      while (row !== section && !row.contains(action)) row = row.parentElement;
      if (row === section || row.children.length !== 2) continue;
      // The handoff heading already names its field.
      if (entry.id === 'alertEntrySection' || !section.querySelector('.MuiCardHeader-title,h2,h3,h4')) {
        mark(row, 'data-hhr-entry-prompt', entry.field);
      }
      if (editors && identified && !section.closest(pendingEntry) && !section.querySelector(pendingEntry) && isolatedEntry(row, field, action, entry)) {
        // A native label can identify an outlined field without a placeholder.
        // :placeholder-shown then tracks silent value updates as well as typing.
        if (!placeholder?.trim()) mark(field, 'placeholder', entry.placeholder);
        mark(field, 'data-hhr-entry-field', '');
        editors.set(row, {field, action, entry});
      }
    }
  }

  function create() {
    // The forms already seen in this patient's summary: only their first appearance can carry Eloísa's own focus.
    let previous = new Map(), editors = new Map(), episode, watchedMain, arrived = new Set();
    const observer = new MutationObserver(() => refresh(watchedMain, episode));
    const refresh = (main, encounter) => {
      observer.disconnect();
      const desktop = main && globalThis.matchMedia?.('(min-width:1100px)').matches;
      const nextEditors = new Map();
      const next = new Map();
      const source = (element, name) => {
        const current = element.getAttribute(name);
        const prior = previous.get(element)?.get(name);
        return prior && prior.value === current ? prior.original : current;
      };
      const label = (element, name, value) => {
        if (!next.has(element)) next.set(element, new Map());
        next.get(element).set(name, {original:source(element, name), value});
        if (element.getAttribute(name) === value) return;
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
      };
      if (main) {
        entryFields(main, label, source, desktop ? nextEditors : null);
        for (const control of main.querySelectorAll('label:has(input[type="checkbox"])')) {
          if (control.closest('dialog,[role=dialog],#hhr-prescription-print-modal')) continue;
          const name = control.textContent.trim();
          if (/^mostrar suspendidos$/i.test(name)) label(control, 'data-hhr-reading-toggle', 'suspended');
          else if (control.closest('#alertEntrySection') && /^(?:no reanimación|gestión de visitas)$/i.test(name)) {
            label(control, 'data-hhr-reading-toggle', 'alert');
            if (/^no reanimación$/i.test(name) && control.querySelectorAll('input[type="checkbox"]').length === 1) {
              label(control, 'data-hhr-resuscitation-toggle', '');
            }
          }
        }
        const candidates = main.querySelectorAll('.MuiCardHeader-subheader,.MuiGrid-item > p.MuiTypography-body2');
        for (const el of candidates) {
          if (el.closest('dialog,[role=dialog],#hhr-prescription-print-modal') ||
              el.querySelector('a,button,input,[tabindex]') || (!el.matches('.MuiCardHeader-subheader') && el.closest('.MuiCard-root'))) continue;
          const read = readStamp(el.textContent);
          // The diagnosis says who confirmed it and on which day: the owner asked for it without the hour.
          if (read) label(el, 'data-hhr-update-label', el.closest('#diagnosisEntrySection') ? read.date + ' · ' + read.author :
            read.date + ' · ' + read.time + ' · ' + read.author);
        }
        // Who wrote an alert and who asked for a prescription read as a first name and a first surname.
        const authors = [...main.querySelectorAll('#alertEntrySection .MuiCardContent-root > .MuiBox-root > .MuiStack-root > .MuiStack-root:first-child > p.MuiTypography-body2:first-child')];
        for (const cell of main.querySelectorAll('td[data-hhr-reading="order-requester"]')) {
          let leaf = cell;
          while (leaf.children.length === 1 && ![...leaf.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) leaf = leaf.firstElementChild;
          if (!leaf.children.length) authors.push(leaf);
        }
        for (const el of authors) {
          if (el.closest('dialog,[role=dialog],#hhr-prescription-print-modal') || el.children.length) continue;
          const brief = shortAuthor(el.textContent);
          if (brief) label(el, 'data-hhr-author', brief);
        }
        // Balance Hídrico without records says so in two words. Its filter stays for another period.
        const idle = main.querySelector('#inputOutputHydricBalanceEntrySection > .MuiCard-root > .MuiCardContent-root > p.MuiTypography-root:last-child');
        if (idle && !idle.children.length && /^no se presentan registros de balance h[ií]drico\b/i.test(idle.textContent.trim())) label(idle, 'data-hhr-balance', 'empty');
        // Say a byline once. The daily row repeats the note's own, and the three
        // prescription cards often carry the byline of the card just above.
        // «Above» means painted above: a copy hidden by its own styles is not a card the reader can see.
        const shown = el => Boolean(el) && !el.closest('[hidden],main [aria-hidden=true],dialog,[role=dialog]') &&
          (typeof el.checkVisibility === 'function' ? el.checkVisibility({visibilityProperty:true}) : el.getClientRects().length > 0);
        const daily = [...candidates].find(el => !el.matches('.MuiCardHeader-subheader') && next.get(el)?.has('data-hhr-update-label') &&
          el.parentElement.querySelector('form input'));
        const note = main.querySelector('#evolution > .MuiCardHeader-root .MuiCardHeader-subheader');
        const labelOf = el => next.get(el)?.get('data-hhr-update-label')?.value;
        if (daily && shown(note) && labelOf(daily) && labelOf(daily) === labelOf(note)) label(daily, 'data-hhr-update-repeat', 'note');
        let above = null;
        for (const section of main.querySelectorAll('#medicationEntrySection,#freeIndicationEntrySection,#procedureOrderEntrySection')) {
          if (!shown(section)) continue;
          const bylines = section.querySelectorAll('.MuiCardHeader-subheader');
          const byline = bylines.length === 1 && labelOf(bylines[0]) && shown(bylines[0]) ? bylines[0] : null;
          // Compare the native text, including seconds and role, as for Reposo and Régimen.
          const text = byline?.textContent.trim().replace(/\s+/g, ' ');
          if (byline && text === above) {
            label(byline, 'data-hhr-update-repeat', 'above');
            if (!source(byline, 'title')) label(byline, 'title', labelOf(byline));
          }
          above = text || null;
        }
        for (const button of main.querySelectorAll('.MuiCardContent-root button')) {
          if (button.closest('dialog,[role=dialog],#hhr-prescription-print-modal')) continue;
          const text = button.textContent.trim().toLowerCase();
          if (text === 'leer más' || text === 'leer menos') {
            label(button, 'data-hhr-note-disclosure', text === 'leer más' ? 'more' : 'less');
          }
        }
      }
      for (const [el, attrs] of previous) {
        for (const [name, {original,value}] of attrs) {
          if (next.get(el)?.has(name) || el.getAttribute(name) !== value) continue;
          if (original === null) el.removeAttribute(name);
          else el.setAttribute(name, original);
        }
      }
      previous = next;
      for (const [row, editor] of editors) {
        const nextEditor = nextEditors.get(row);
        if (episode === encounter && editor.field === nextEditor?.field && editor.action === nextEditor.action) continue;
        editor.clear(!main || episode === encounter);
        editors.delete(row);
      }
      if (episode !== encounter) arrived = new Set();
      for (const [row, {field, action, entry}] of nextEditors) {
        if (!editors.has(row)) {
          editors.set(row, createEntry(row, field, action, entry, !arrived.has(entry.id)));
          arrived.add(entry.id);
        }
        editors.get(row).refresh();
      }
      episode = encounter;
      watchedMain = desktop ? main : null;
      // Rayen can add feedback or mark an existing control invalid without replacing it.
      if (desktop) for (const {id} of entrySections) {
        const section = main.querySelector('#' + id);
        if (section) observer.observe(section, {subtree:true, childList:true, attributes:true, characterData:true});
      }
    };
    return { refresh, clear:() => refresh(null) };
  }
  globalThis.HhrFichaReadingLabels = Object.freeze({ create, stamp });
})();
