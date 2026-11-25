// Visual aliases for native labels. Preserve the DOM text used by Eloísa, assistive tech and print.
(() => {
  'use strict';
  const stampPattern = /^Última actualización:\s*(\d{2}[-/]\d{2}[-/]\d{4})(?:,\s*|\s+)(\d{1,2}:\d{2})(?::\d{2})?\s*(?:,|[-–·])\s*(.+)$/i;
  const role = /^(?:médic[oa](?:\s+(?:cirujan[oa]|tratante|especialista))?|enfermer[oa]|paramédic[oa]|kinesiólog[oa]|matr[oó]n(?:a)?|nutricionista|terapeuta ocupacional|fonoaudiólog[oa]|psicólog[oa]|técnic[oa] de enfermería|tens|dra?\.)(?:\([oa]\))?\s+/i;

  function stamp(text) {
    const parts = stampPattern.exec(text.trim());
    if (!parts) return null;
    const author = parts[3].replace(role, '').trim();
    return parts[1] + ' · ' + parts[2].padStart(5, '0') + ' · ' + author;
  }

  const outsideSummary = 'dialog,[role=dialog],#hhr-prescription-print-modal,[aria-hidden=true],[hidden]';
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
        row.closest('[inert],[hidden],[aria-hidden=true],[aria-busy=true]')) return false;
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

  function createEntry(row, field, action, entry) {
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.setAttribute('data-hhr-entry-open', '');
    opener.textContent = entry.open;
    const generatedId = 'hhr-' + entry.id + '-editor';
    let createdId = false;
    const update = () => {
      const folded = action.disabled && field.value === '' && !row.contains(document.activeElement);
      row.toggleAttribute('data-hhr-entry-folded', folded);
      const expanded = String(!folded);
      if (opener.getAttribute('aria-expanded') !== expanded) opener.setAttribute('aria-expanded', expanded);
      // Rayen may restore a draft into the editor while its opener has keyboard focus.
      if (!folded && opener === document.activeElement) field.focus({preventScroll:true});
    };
    const afterBlur = () => queueMicrotask(() => { if (opener.isConnected) update(); });
    function open(event) {
      event.preventDefault();
      event.stopPropagation();
      row.removeAttribute('data-hhr-entry-folded');
      field.focus();
      update();
    }
    opener.addEventListener('click', open);
    row.addEventListener('focusin', update);
    row.addEventListener('focusout', afterBlur);
    row.addEventListener('input', update);
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
      row.removeEventListener('focusin', update);
      row.removeEventListener('focusout', afterBlur);
      row.removeEventListener('input', update);
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
    let previous = new Map(), editors = new Map(), episode, watchedMain;
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
          const compact = stamp(el.textContent);
          if (compact) label(el, 'data-hhr-update-label', compact);
        }
        // Say a byline once. The daily row repeats the note's own, and the three
        // prescription cards often carry the byline of the card just above.
        // «Above» means painted above: a copy hidden by its own styles is not a card the reader can see.
        const shown = el => Boolean(el) && !el.closest('[data-hhr-ficha-folded],[hidden],[aria-hidden=true],dialog,[role=dialog]') &&
          (typeof el.checkVisibility === 'function' ? el.checkVisibility({visibilityProperty:true}) : el.getClientRects().length > 0);
        const daily = [...candidates].find(el => !el.matches('.MuiCardHeader-subheader') && next.get(el)?.has('data-hhr-update-label') &&
          el.parentElement.querySelector('input[type="date"]'));
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
      for (const [row, {field, action, entry}] of nextEditors) {
        if (!editors.has(row)) editors.set(row, createEntry(row, field, action, entry));
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
