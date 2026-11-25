/** Present existing summary sections. Only explicit, read-only empty states may be folded. */
(() => {
  'use strict';
  const optional = new Set(['diagnosisTestEntrySection', 'procedureEntrySection',
    'procedureOrderEntrySection', 'referralRequestEntrySection', 'operationTheaterRequestEntrySection']);
  const emptyMessage = /^(?:sin (?:registros|datos|procedimientos|solicitudes)|no hay (?:registros|datos|procedimientos|solicitudes)|no (?:se encontraron|existen) registros)(?: disponibles| para mostrar)?\.?$/i;
  const protectedContent = 'button,a,input,select,textarea,[tabindex],[contenteditable],[role],[aria-label],[aria-labelledby],[aria-busy="true"],[title],svg,img,canvas,iframe,video,table,details,.MuiAlert-root,.MuiSkeleton-root,.MuiCircularProgress-root,.MuiLinearProgress-root';
  const normalize = text => text.replace(/\s+/g, ' ').trim();

  function explicitlyEmpty(section) {
    if (section.closest('[aria-busy="true"],[role="alert"],[role="dialog"]')) return false;
    if (section.matches(protectedContent) || section.querySelector(protectedContent)) return false;
    const heading = section.querySelector('h1,h2,h3,h4,h5,h6,.MuiCardHeader-title');
    const title = normalize(heading?.textContent || '');
    const text = normalize(section.textContent);
    return Boolean(title && text.startsWith(title) && emptyMessage.test(text.slice(title.length).trim()));
  }

  function create(sectionIds) {
    let episode, expanded = false;
    let previous = new Set();
    let grids = new Set();
    let activeSections = new Set();

    function updateGrids() {
      const sections = new Set(sectionIds.map(id => document.getElementById(id)).filter(el => el?.closest('main')));
      for (const el of activeSections) if (!sections.has(el)) el.removeAttribute('data-hhr-ficha-summary-card');
      for (const el of sections) if (!activeSections.has(el)) el.setAttribute('data-hhr-ficha-summary-card', '');
      activeSections = sections;
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
      const count = previous.size;
      const label = (expanded ? 'Ocultar vacías' : 'Ver vacías') + ' (' + count + ')';
      if (toggle.textContent !== label) toggle.textContent = label;
      toggle.setAttribute('aria-expanded', String(expanded));
    }
    toggle.addEventListener('click', () => { expanded = !expanded; display(); });
    function clear() {
      for (const el of previous) el.removeAttribute('data-hhr-ficha-folded');
      previous.clear();
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
