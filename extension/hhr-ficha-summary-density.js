/** Present existing summary sections. A section without records stays in view: the round groups it under «Sin datos». */
(() => {
  'use strict';
  const protectedContent = 'button,a,input,select,textarea,[tabindex],[contenteditable],[role],[aria-label],[aria-labelledby],[aria-busy="true"],[title],svg,img,canvas,iframe,video,details,.MuiAlert-root,.MuiSkeleton-root,.MuiCircularProgress-root,.MuiLinearProgress-root';
  const normalize = text => text.replace(/\s+/g, ' ').trim();

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

  function singleBriefAlert(section) {
    if (!section || section.querySelector('input,textarea,select,table,br,[aria-busy="true"],[role=progressbar],.MuiSkeleton-root')) return false;
    const entries = section.querySelectorAll('.MuiAlert-root,[role=alert],li,.MuiChip-root');
    if (!entries.length) return shortReading(section);
    const entry = entries[0];
    if (![...entries].every(el => el === entry || entry.contains(el)) ||
        entry.querySelectorAll('li,.MuiChip-root').length > 1) return false;
    const heading = section.querySelector('h2,h3,h4,h5,h6,.MuiCardHeader-title');
    const message = normalize(entry.textContent);
    return !!message && message.length <= 88 &&
      normalize(section.textContent).replace(heading ? normalize(heading.textContent) : '', '').trim() === message;
  }

  function create(sectionIds) {
    let episode;
    let grids = new Set();
    let activeSections = new Set();

    let pair, countTitle, alert;

    const vitals = globalThis.HhrFichaVitalStrip.create();
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
      const nextAlert = document.getElementById('alertEntrySection');
      if (alert !== nextAlert) alert?.removeAttribute('data-hhr-brief-alert');
      alert = sections.has(nextAlert) ? nextAlert : null;
      alert?.toggleAttribute('data-hhr-brief-alert', singleBriefAlert(alert));
      vitals.refresh([...sections].find(el => el.id === 'vitalSignsEntry'));
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

    function clear() {
      vitals.clear();
      alert?.removeAttribute('data-hhr-brief-alert'); alert = null;
      pair?.removeAttribute('data-hhr-ficha-reading-pair');
      pair = null;
      updateCount(null);
      for (const grid of grids) grid.removeAttribute('data-hhr-ficha-summary-grid');
      grids.clear();
      for (const el of activeSections) el.removeAttribute('data-hhr-ficha-summary-card');
      activeSections.clear();
      episode = null;
    }
    function refresh(encounter, row, isSummary = Boolean(row)) {
      if (episode !== encounter || !isSummary) clear();
      if (!isSummary) return;
      episode = encounter;
      updateGrids();
    }
    return { refresh, clear };
  }
  globalThis.HhrFichaSummaryDensity = Object.freeze({ create });
})();
