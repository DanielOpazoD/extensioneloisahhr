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

  function create() {
    let previous = new Set();
    const refresh = main => {
      const next = new Set();
      const label = (element, name, value) => {
        if (element.getAttribute(name) !== value) element.setAttribute(name, value);
        next.add(element);
      };
      if (main) {
        for (const control of main.querySelectorAll('label:has(input[type="checkbox"])')) {
          if (control.closest('dialog,[role=dialog],#hhr-prescription-print-modal')) continue;
          const name = control.textContent.trim();
          if (/^mostrar suspendidos$/i.test(name)) label(control, 'data-hhr-reading-toggle', 'suspended');
          else if (control.closest('#alertEntrySection') && /^(?:no reanimación|gestión de visitas)$/i.test(name)) {
            label(control, 'data-hhr-reading-toggle', 'alert');
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
      for (const el of previous) if (!next.has(el)) {
        el.removeAttribute('data-hhr-update-label');
        el.removeAttribute('data-hhr-note-disclosure');
        el.removeAttribute('data-hhr-reading-toggle');
      }
      previous = next;
    };
    return { refresh, clear:() => refresh(null) };
  }
  globalThis.HhrFichaReadingLabels = Object.freeze({ create, stamp });
})();
