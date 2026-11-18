/** Compact the busy Eloísa worklists without replacing their native rows or controls. */
(() => {
  'use strict';
  const marked = 'data-hhr-compact-worklist';
  const complete = 'data-hhr-complete-worklist';
  const styleId = 'hhr-native-worklist-styles';
  const lists = {
    '/dashboard/encounter-list': /^(pacientes )?sin medico$/,
    '/dashboard/encounter-list-nurse': /^(pacientes )?(con|sin) novedad$/,
  };
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase().replace(/\s*\(\d+\)$|\s+\d+$/, '').replace(/\s+/g, ' ');
  // Opening the CUDYR dialog marks the painted background aria-hidden.
  // Use layout visibility for density and exclude the dialog's own contents.
  const isWorklistSurface = element => element.getClientRects().length &&
    !element.closest('[hidden],dialog,[role="dialog"],[role="alertdialog"]') &&
    getComputedStyle(element).visibility === 'visible';
  const columns = new Set(['ubicacion', 'cama', 'asignacion', 'medico tratante', 'acciones']);
  const css = `
    .MuiTableContainer-root:has(> table[${marked}]) { max-height:none !important; }
    table[${complete}] > tfoot:has(.MuiPagination-root) { display:none !important; }
    /* A tab that was open during an extension update can retain the old injected button. */
    [data-hhr-patient-code-action="1"] { display:none !important; }
    table[${marked}] > :is(thead,tbody) > tr > :is(th,td) {
      padding-inline:clamp(7px, 1vw, 12px) !important;
    }
    table[${marked}] > thead > tr > th { line-height:1.15 !important; padding-block:4px !important; }
    table[${marked}] > tbody > tr > :is(th,td) { line-height:1.15 !important; padding-block:2px !important; }
    table[${marked}] > tbody > tr > :is(th,td) .MuiTypography-root { line-height:1.15 !important; }
    table[${marked}] > tbody > tr > :is(th,td) .MuiStack-root { row-gap:0 !important; }
    table[${marked}] > tbody > tr > :is(th,td) .MuiStack-root > :not(style) ~ :not(style) {
      margin-block-start:0 !important;
    }
  `;
  const create = () => {
    let table = null;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.getElementById(styleId)?.remove();
    document.head.append(style);

    const findTable = pathname => {
      const label = lists[pathname.replace(/\/$/, '')];
      if (!label) return null;
      const selected = [...document.querySelectorAll('[role="tablist"] [role="tab"][aria-selected="true"]')]
        .find(tab => label.test(normalize(tab.textContent)) && isWorklistSurface(tab));
      if (!selected) return null;
      const panel = document.getElementById(selected.getAttribute('aria-controls') || '');
      const scope = panel || document.querySelector('main') || document.body;
      const tables = [...scope.querySelectorAll('table')].filter(candidate => {
        if (!candidate.tBodies.length || !isWorklistSurface(candidate)) return false;
        const headers = [...(candidate.tHead?.querySelectorAll('th') || [])].map(th => normalize(th.textContent));
        return headers.includes('paciente') && headers.some(header => columns.has(header));
      });
      return tables.length === 1 ? tables[0] : null;
    };
    // The native footer counts pages independently of the row renderer.
    // Hide it only when this table contains exactly its advertised result set.
    const hasAllRows = table => {
      const container = table.closest('.MuiTableContainer-root');
      const heading = container?.parentElement?.previousElementSibling;
      const match = heading?.textContent.trim().match(/^Resultados de b[uú]squeda (?:no asignados|con novedad|sin novedad)\s*\((\d+)\)$/i);
      return Boolean(match && Number(match[1]) === table.tBodies[0].rows.length);
    };
    const clear = () => {
      table?.removeAttribute(marked);
      table?.removeAttribute(complete);
    };
    const refresh = pathname => {
      const next = findTable(pathname);
      if (table !== next) {
        clear();
        table = next;
        table?.setAttribute(marked, '');
      }
      if (table) table.toggleAttribute(complete, hasAllRows(table));
    };
    return Object.freeze({
      refresh,
      dispose() {
        clear();
        style.remove();
      },
    });
  };
  globalThis.HhrNativeWorklistPresentation = Object.freeze({ create });
})();
