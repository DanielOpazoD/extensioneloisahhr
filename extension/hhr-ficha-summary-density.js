/** Present existing summary sections. Only explicit, read-only empty states may be folded. */
(() => {
  'use strict';
  const optional = new Set(['diagnosisTestEntrySection', 'procedureEntrySection',
    'procedureOrderEntrySection', 'referralRequestEntrySection', 'invasiveDeviceEntry', 'operationTheaterRequestEntrySection']);
  const emptyMessage = /^(?:sin|no hay|no existen|no se encontraron|no se han registrado) (?:registros|datos|procedimientos|solicitudes(?: de interconsulta)?|dispositivos invasivos|[óo]rdenes de atenci[óo]n|interconsultas)(?: disponibles| para mostrar| registrad[oa]s)?\.?$/i;
  const protectedContent = 'button,a,input,select,textarea,[tabindex],[contenteditable],[role],[aria-label],[aria-labelledby],[aria-busy="true"],[title],svg,img,canvas,iframe,video,details,.MuiAlert-root,.MuiSkeleton-root,.MuiCircularProgress-root,.MuiLinearProgress-root';
  const normalize = text => text.replace(/\s+/g, ' ').trim();

  function explicitlyEmpty(section) {
    if (section.closest('[aria-busy="true"],[role="alert"],[role="dialog"]')) return false;
    if (section.matches(protectedContent) || section.querySelector(protectedContent)) return false;
    const heading = section.querySelector('h1,h2,h3,h4,h5,h6,.MuiCardHeader-title');
    const title = normalize(heading?.textContent || '');
    const table = section.querySelector('table');
    if (table) {
      // Headers can remain in an empty native table. Require its only body cell to say so.
      const body = table.tBodies[0];
      const cell = body?.rows[0]?.cells[0];
      if (section.querySelectorAll('table').length !== 1 || table.tBodies.length !== 1 ||
          body.rows.length !== 1 || body.rows[0].cells.length !== 1 || !cell || !emptyMessage.test(normalize(cell.textContent)) ||
          table.caption || table.tFoot || !title) return false;
      const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.textContent.trim() && !heading.contains(node) && !cell.contains(node) && !table.tHead?.contains(node)) return false;
      }
      return true;
    }
    const text = normalize(section.textContent);
    return Boolean(title && text.startsWith(title) && emptyMessage.test(text.slice(title.length).trim()));
  }

  // Only lay out a heading beside a single read-only value. Rich or unfamiliar content keeps its native flow.
  function shortReading(section) {
    if (section.id === 'observationEntrySection' || section.querySelector(protectedContent + ',table,li,br,hr')) return false;
    const surface = section.querySelector(':scope > .MuiCard-root:only-child') || section;
    const heading = surface.querySelector(':scope > :is(h2,h3,h4),:scope > .MuiCardHeader-root');
    if (!heading || heading.querySelector('.MuiCardHeader-subheader')) return false;
    const content = normalize(surface.textContent);
    if (content.length > 110) return false;
    const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT);
    let values = 0;
    while (walker.nextNode()) {
      if (!heading.contains(walker.currentNode) && walker.currentNode.textContent.trim()) values++;
    }
    return values === 1;
  }

  // The badge describes visible records in a single native table, never a clinical total.
  function medicationTotal(section) {
    const title = section.querySelector('.MuiCardHeader-title,h2,h3,h4');
    if (!title || !/^fármacos$/i.test(normalize(title.textContent))) return null;
    const tables = section.querySelectorAll('table');
    if (tables.length !== 1 || section.querySelector('[aria-busy="true"],.MuiSkeleton-root,.MuiPagination-root,.MuiTablePagination-root,[role="progressbar"]')) return null;
    const bodies = tables[0].tBodies;
    if (bodies.length !== 1 || tables[0].tFoot) return null;
    const rows = [...bodies[0].rows];
    return rows.length && rows.every(row => row.cells.length > 1 && !row.hidden && row.getClientRects().length)
      ? { title, count:rows.length } : null;
  }

  // A split native row can wrap each section in one or more layout elements.
  function readingPair() {
    const alert = document.getElementById('alertEntrySection');
    const evolution = document.getElementById('observationEntrySection');
    if (!alert || !evolution || !alert.closest('main')?.contains(evolution)) return null;
    let left = alert;
    while (left.parentElement && !left.parentElement.contains(evolution)) left = left.parentElement;
    const parent = left.parentElement;
    if (!parent || parent.matches('main,body,html') || parent.children.length !== 2 ||
        parent.firstElementChild !== left || !parent.lastElementChild.contains(evolution) ||
        parent.querySelector('[role="tablist"],[data-hhr-ficha-sections]')) return null;
    return parent;
  }

  function create(sectionIds) {
    let episode, expanded = false;
    let previous = new Set();
    let navItems = new Set();
    let grids = new Set();
    let activeSections = new Set();

    let pair, countTitle;
    function updateCount(section) {
      const total = section && medicationTotal(section);
      if (countTitle && countTitle !== total?.title) countTitle.removeAttribute('data-hhr-visible-medications');
      countTitle = total?.title;
      if (countTitle && countTitle.dataset.hhrVisibleMedications !== String(total.count)) {
        countTitle.dataset.hhrVisibleMedications = String(total.count);
      }
    }

    function updateGrids() {
      const sections = new Set(sectionIds.map(id => document.getElementById(id)).filter(el => el?.closest('main')));
      for (const el of activeSections) if (!sections.has(el)) el.removeAttribute('data-hhr-ficha-summary-card');
      for (const el of sections) {
        const size = el.id === 'observationEntrySection' || el.querySelector('table') ? 'wide' :
          shortReading(el) ? 'brief' : 'regular';
        if (el.getAttribute('data-hhr-ficha-summary-card') !== size) el.setAttribute('data-hhr-ficha-summary-card', size);
      }
      const meds = document.getElementById('medicationEntrySection');
      updateCount(sections.has(meds) ? meds : null);
      activeSections = sections;
      const nextPair = readingPair();
      if (pair !== nextPair) {
        pair?.removeAttribute('data-hhr-ficha-reading-pair');
        nextPair?.setAttribute('data-hhr-ficha-reading-pair', '');
        pair = nextPair;
      }
      const items = new Set([...sections].map(el =>
        el.parentElement.matches('.MuiGrid-item') && el.parentElement.children.length === 1 ? el.parentElement : el
      ));
      const next = new Set();
      for (const item of items) {
        const parent = item.parentElement;
        if (parent.children.length > 1 && [...parent.children].every(child => items.has(child))) next.add(parent);
      }
      for (const grid of grids) if (!next.has(grid)) grid.removeAttribute('data-hhr-ficha-summary-grid');
      for (const grid of next) grid.toggleAttribute('data-hhr-ficha-summary-grid', true);
      grids = next;
    }

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'hhr-ficha-empty-toggle';
    function display() {
      for (const el of previous) el.toggleAttribute('data-hhr-ficha-folded', !expanded);
      for (const item of navItems) item.toggleAttribute('data-hhr-ficha-folded', !expanded);
      const count = previous.size;
      const label = (expanded ? 'Ocultar vacías' : 'Ver vacías') + ' (' + count + ')';
      if (toggle.textContent !== label) toggle.textContent = label;
      toggle.setAttribute('aria-expanded', String(expanded));
    }
    toggle.addEventListener('click', () => { expanded = !expanded; display(); });
    function clear() {
      for (const el of previous) el.removeAttribute('data-hhr-ficha-folded');
      previous.clear();
      for (const item of navItems) item.removeAttribute('data-hhr-ficha-folded');
      navItems.clear();
      pair?.removeAttribute('data-hhr-ficha-reading-pair');
      pair = null;
      updateCount(null);
      for (const grid of grids) grid.removeAttribute('data-hhr-ficha-summary-grid');
      grids.clear();
      for (const el of activeSections) el.removeAttribute('data-hhr-ficha-summary-card');
      activeSections.clear();
      toggle.remove();
      expanded = false;
      episode = null;
    }
    function refresh(encounter, row) {
      if (episode !== encounter || !row) clear();
      if (!row) return;
      episode = encounter;
      updateGrids();
      const next = new Set();
      for (const section of activeSections) {
        if (optional.has(section.id) && explicitlyEmpty(section) && !section.contains(document.activeElement)) next.add(section);
      }
      for (const el of previous) if (!next.has(el)) el.removeAttribute('data-hhr-ficha-folded');
      const nextNav = new Set();
      for (const link of row.querySelectorAll('[data-hhr-ficha-link]')) {
        if (!next.has(document.getElementById(link.dataset.hhrFichaLink))) continue;
        const item = link.closest('.MuiGrid-item');
        nextNav.add(item?.parentElement === row && item.querySelectorAll('[data-hhr-ficha-link],button,a,input,select').length === 1 ? item : link);
      }
      for (const item of navItems) if (!nextNav.has(item)) item.removeAttribute('data-hhr-ficha-folded');
      navItems = nextNav;
      previous = next;
      if (!next.size) { toggle.remove(); return; }
      toggle.setAttribute('aria-controls', [...next].map(el => el.id).join(' '));
      display();
      if (toggle.parentElement !== row) row.append(toggle);
    }
    function reveal(target) {
      if (previous.has(target) && !expanded) { expanded = true; display(); }
    }
    return { refresh, clear, reveal };
  }
  globalThis.HhrFichaSummaryDensity = Object.freeze({ create });
})();
