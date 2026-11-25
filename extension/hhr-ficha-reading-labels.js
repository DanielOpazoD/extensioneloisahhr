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
    { id:'shiftChangeEntrySection', field:'Observación de entrega', placeholder:'Escribir entrega…', action:'Agregar a entrega', suffix:'a entrega' },
    { id:'alertEntrySection', field:'Nueva alerta', placeholder:'Escribir alerta…', action:'Agregar alerta', suffix:'alerta' },
  ];

  function matchesNativeNames(element, name, source) {
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
    return labels.every(text => name.test(text.trim()));
  }

  function entryFields(main, mark, source) {
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
      if (placeholder?.trim()) mark(field, 'placeholder', entry.placeholder);
      for (const [element,name] of [[field, entry.field], [action, entry.action]]) {
        mark(element, 'aria-label', name);
        // An existing IDREF takes precedence over aria-label in the accessibility tree.
        if (source(element, 'aria-labelledby')) mark(element, 'aria-labelledby', null);
      }
      mark(action, 'data-hhr-entry-suffix', entry.suffix);

      // The native handoff heading is already directly above its field.
      if (entry.id !== 'alertEntrySection' && section.querySelector('.MuiCardHeader-title,h2,h3,h4')) continue;
      let row = field.parentElement;
      while (row !== section && !row.contains(action)) row = row.parentElement;
      // Change layout only for an isolated field + button row; leave surrounding
      // switches, notices and unfamiliar native layouts in their original flow.
      if (row !== section && row.children.length === 2) {
        mark(row, 'data-hhr-entry-prompt', entry.field);
      }
    }
  }

  function create() {
    let previous = new Map();
    const refresh = main => {
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
        entryFields(main, label, source);
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
    };
    return { refresh, clear:() => refresh(null) };
  }
  globalThis.HhrFichaReadingLabels = Object.freeze({ create, stamp });
})();
