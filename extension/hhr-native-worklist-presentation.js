/** Compact the busy Eloísa worklists without replacing their native rows or controls. */
(() => {
  'use strict';
  const marked = 'data-hhr-compact-worklist';
  const complete = 'data-hhr-complete-worklist';
  const styleId = 'hhr-native-worklist-styles';
  // Match the native result heading that belongs to the table. Tabs, menus and
  // drawers can be hidden or remounted independently of the underlying list.
  const headings = {
    '/dashboard/encounter-list': /^Resultados de b[uú]squeda no asignados\s*\((\d+)\)$/i,
    '/dashboard/encounter-list-nurse': /^Resultados de b[uú]squeda (?:con|sin) novedad\s*\((\d+)\)$/i,
  };
  const overlay = 'dialog,[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"],.MuiDrawer-root,.MuiPopover-root';
  const tableSelector = '.MuiTableContainer-root > table';
  const markedSelector = `table[${marked}],table[${complete}]`;
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
    let onWorklist = false;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.getElementById(styleId)?.remove();
    document.head.append(style);

    const clear = () => {
      for (const table of document.querySelectorAll(markedSelector)) {
        table.removeAttribute(marked);
        table.removeAttribute(complete);
      }
    };
    const refresh = pathname => {
      const heading = headings[pathname.replace(/\/$/, '')];
      if (!heading) {
        if (onWorklist) clear();
        onWorklist = false;
        return;
      }
      onWorklist = true;
      if (!style.isConnected) document.head?.append(style);
      for (const table of document.querySelectorAll(`${tableSelector},${markedSelector}`)) {
        const container = table.parentElement;
        const title = container.parentElement?.previousElementSibling;
        const result = container.matches('.MuiTableContainer-root') && table.tBodies.length &&
          !table.closest(overlay) && title?.textContent.trim().match(heading);
        table.toggleAttribute(marked, Boolean(result));
        table.toggleAttribute(complete, Boolean(result && Number(result[1]) === table.tBodies[0].rows.length));
      }
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
