/** Compact the two busy Eloísa worklists without replacing their native rows or controls. */
(() => {
  'use strict';
  const marked = 'data-hhr-compact-worklist';
  const styleId = 'hhr-native-worklist-styles';
  const lists = {
    '/dashboard/encounter-list': /^(pacientes )?sin medico$/,
    '/dashboard/encounter-list-nurse': /^(pacientes )?con novedad$/,
  };
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase().replace(/\s*\(\d+\)$|\s+\d+$/, '').replace(/\s+/g, ' ');
  const isVisible = element => element.getClientRects().length && !element.closest('[hidden],[aria-hidden="true"]') &&
    getComputedStyle(element).visibility === 'visible';
  const columns = new Set(['ubicacion', 'cama', 'asignacion', 'medico tratante', 'acciones']);
  const css = `
    /* A tab that was open during an extension update can retain the old injected button. */
    [data-hhr-patient-code-action="1"] { display:none !important; }
    table[${marked}] > :is(thead,tbody) > tr > :is(th,td) {
      padding-inline:clamp(7px, 1vw, 12px) !important;
    }
    table[${marked}] > thead > tr > th { padding-block:7px !important; }
    table[${marked}] > tbody > tr > :is(th,td) { padding-block:4px !important; }
    table[${marked}] > tbody > tr > :is(th,td) .MuiTypography-root { line-height:1.25 !important; }
    table[${marked}] > tbody > tr > :is(th,td) .MuiStack-root { row-gap:2px !important; }
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
        .find(tab => label.test(normalize(tab.textContent)) && isVisible(tab));
      if (!selected) return null;
      const panel = document.getElementById(selected.getAttribute('aria-controls') || '');
      const scope = panel || document.querySelector('main') || document.body;
      const tables = [...scope.querySelectorAll('table')].filter(candidate => {
        if (!candidate.tBodies.length || !isVisible(candidate)) return false;
        const headers = [...(candidate.tHead?.querySelectorAll('th') || [])].map(th => normalize(th.textContent));
        return headers.includes('paciente') && headers.some(header => columns.has(header));
      });
      return tables.length === 1 ? tables[0] : null;
    };
    const refresh = pathname => {
      const next = findTable(pathname);
      if (table === next) return;
      table?.removeAttribute(marked);
      table = next;
      table?.setAttribute(marked, '');
    };
    return Object.freeze({
      refresh,
      dispose() {
        table?.removeAttribute(marked);
        style.remove();
      },
    });
  };
  globalThis.HhrNativeWorklistPresentation = Object.freeze({ create });
})();
